import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { fetchGitHubFile } from '@/lib/github';
import { fetchGitHubPR } from '@/lib/github-pr';
import { calculateScore, ScoreResult } from '@/lib/scoring';
import { randomUUID } from 'crypto';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const maxDuration = 60;

function generateSessionId() {
  return randomUUID().split('-')[0] + randomUUID().split('-')[1]; // Short-ish ID
}

function assignBadge(score: number): string {
  if (score >= 90) return '🏆 Code Master';
  if (score >= 70) return '💪 Getting There';
  if (score >= 40) return '🔥 Needs Work';
  return '💀 Please Refactor';
}

export async function POST(req: Request) {
  if (!PERPLEXITY_API_KEY) {
    return NextResponse.json({ success: false, error: 'Misconfigured: Missing Perplexity API Key' }, { status: 500 });
  }

  try {
    const {
      input_type = 'code',
      code: rawCode,
      language: rawLanguage,
      github_url,
      roastLevel = 'medium',
    } = await req.json();

    let codeToAnalyze = rawCode;
    let detectedLanguage = rawLanguage || 'javascript';
    let filename = 'snippet.js';
    let prRepo = '';

    // 1. Resolve Input
    if (input_type === 'github_file') {
      const fileData = await fetchGitHubFile(github_url);
      codeToAnalyze = fileData.code;
      detectedLanguage = fileData.language;
      filename = fileData.filename;
    } else if (input_type === 'github_pr') {
      const prData = await fetchGitHubPR(github_url);
      codeToAnalyze = prData.files.map((f) => `// File: ${f.filename}\n${f.code}`).join('\n\n');
      detectedLanguage = 'multi-file';
      filename = `PR #${prData.prNumber}: ${prData.title}`;
      prRepo = prData.repo;
    }

    if (!codeToAnalyze) {
      return NextResponse.json({ success: false, error: 'No code to analyze found.' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const session_id = generateSessionId();

    // 2. Create Review Record (Status: 'analyzing')
    const { data: review, error: dbError } = await supabase
      .from('code_reviews')
      .insert({
        session_id,
        code_snippet: codeToAnalyze,
        repo_url: prRepo,
        github_url: github_url, // For linking back
        language: detectedLanguage,
        roast_level: roastLevel,
        status: 'analyzing',
      })
      .select()
      .single();

    if (dbError) throw new Error(dbError.message);

    // 3. Analyze with Perplexity
    // Tailored prompts...
    let systemRole = 'You are Code Critic, a brutal but helpful AI code reviewer.';
    if (input_type === 'github_pr') systemRole += ' You are reviewing a Pull Request.';

    const prompt = `
    You are evaluating code with a "${roastLevel}" personality.
    Input Type: ${input_type}
    File/Context: ${filename}
    
    Roast Level: ${roastLevel} (gentle/medium/savage).
    
    CODE TO ANALYZE:
    \`\`\`${detectedLanguage}
    ${codeToAnalyze.slice(0, 15000)} 
    \`\`\`

    TASK:
    Identify 3-7 issues. Return valid JSON array.
    
    JSON Format:
    [
      {
        "issue_type": "security" | "performance" | "complexity" | "style" | "logic",
        "severity": "critical" | "high" | "medium" | "low",
        "title": "Short title",
        "roast": "Funny critique",
        "explanation": "Technical reasoning",
        "code_snippet": "Bad code",
        "suggested_fix": "Fix",
        "widget_type": "SecurityBomb" | "SpaghettiMeter" | "PerformanceTurtle" | "GenericRoast",
        "widget_config": {},
        "impact_score": 0...25
      }
    ]
    `;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: 'You are a JSON generator. Return ONLY valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
      }),
    });

    if (!response.ok) throw new Error(`AI Request Failed: ${response.statusText}`);

    const aiData = await response.json();
    let content = aiData.choices[0]?.message?.content || '[]';
    content = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    let issues = [];
    try {
      issues = JSON.parse(content);
    } catch (e) {
      console.error('JSON Parse Error', content);
      issues = [
        {
          title: 'AI Parse Error',
          severity: 'low',
          roast: 'I tried to judge you, but I choked on the JSON.',
          explanation: 'The AI response was not valid JSON.',
          issue_type: 'logic',
          widget_type: 'GenericRoast',
          impact_score: 5,
        },
      ];
    }

    // 4. Calculate Score
    // We use our local scoring.ts logic to get the overall and categories
    // Note: The AI returns 'impact_score', which we can use or fallback to defaults
    // Let's use `calculateScore` from lib/scoring.ts but UPDATE it to use 'impact_score' if present?
    // Actually, `scoring.ts` uses severity. Let's keep `scoring.ts` as the source of truth for now,
    // or map 'impact_score' if the AI provides it well.
    // The prompt asks for `impact_score`.

    // Quick Fix: Use local calc for reliability
    const scoreResult = calculateScore(issues);
    const badge = assignBadge(scoreResult.overall);

    // 5. Update DB
    if (issues.length > 0) {
      const issuesToInsert = issues.map((issue: any) => ({
        review_id: review.id,
        impact_score: issue.impact_score || 0, // Store AI's impact score if available
        ...issue,
      }));
      await supabase.from('code_issues').insert(issuesToInsert);
    }

    await supabase
      .from('code_reviews')
      .update({
        status: 'complete',
        overall_score: scoreResult.overall,
        security_score: scoreResult.security,
        performance_score: scoreResult.performance,
        maintainability_score: scoreResult.maintainability,
        badge: badge,
      })
      .eq('id', review.id);

    return NextResponse.json({
      success: true,
      session_id,
      status: 'complete',
    });
  } catch (error: any) {
    console.error('Roast API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
