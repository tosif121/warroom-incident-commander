import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const maxDuration = 60; // Allow 60 seconds for AI analysis

export async function POST(req: Request) {
  if (!PERPLEXITY_API_KEY) {
    return NextResponse.json({ success: false, error: 'Misconfigured: Missing Perplexity API Key' }, { status: 500 });
  }

  try {
    const { code, language, roastLevel = 'medium' } = await req.json();

    if (!code) {
      return NextResponse.json({ success: false, error: 'Code is required' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 1. Create Review Record
    const { data: review, error: dbError } = await supabase
      .from('code_reviews')
      .insert({
        code_snippet: code,
        language,
        roast_level: roastLevel,
        status: 'analyzing',
      })
      .select()
      .single();

    if (dbError) throw new Error(dbError.message);

    // 2. Analyzye with Perplexity
    const prompt = `
    You are "Code Critic", a senior developer who is brutally honest, witty, and slightly mean (but helpful).
    Your goal is to review the following ${language} code and "roast" it.
    
    Roast Level: ${roastLevel}
    - gentle: Constructive feedback with light humor.
    - medium: Witty roasts that sting a bit. Sarcastic.
    - savage: Full Gordon Ramsay mode. Brutal.
    
    Code to Review:
    \`\`\`${language}
    ${code}
    \`\`\`
    
    Analyze for:
    1. Security vulnerabilities (CRITICAL) - Look for injection, hardcoded keys, etc.
    2. Performance issues (HIGH) - N+1 queries, loops, memory leaks.
    3. Code smells (MEDIUM) - Spaghetti code, bad naming, huge functions.
    4. Logic errors (HIGH).

    OUTPUT FORMAT:
    Return ONLY valid JSON array with this structure. Do not wrap in markdown code blocks.
    [
      {
        "issue_type": "security" | "performance" | "style" | "logic",
        "severity": "critical" | "high" | "medium" | "low",
        "title": "Short catchy title",
        "roast": "The funny critique based on roast level",
        "explanation": "The serious technical explanation",
        "code_snippet": "The specific bad line or block",
        "suggested_fix": "How to fix it",
        "widget_type": "SecurityBomb" | "SpaghettiMeter" | "PerformanceTurtle" | "GenericRoast",
        "widget_config": { ...any specific props for the widget... }
      }
    ]
    
    For "widget_config":
    - SecurityBomb: { "explosionSize": "big" | "small" }
    - SpaghettiMeter: { "complexity": 0-100 }
    - PerformanceTurtle: { "speed": "slow" | "crawl" }
    - GenericRoast: { "emoji": "🤡" }
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
          { role: 'system', content: 'You are a JSON generator. Always return valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5, // Balance creativity (roasts) with structure
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Perplexity Error:', err);
      throw new Error(`AI Analysis failed: ${response.statusText}`);
    }

    const aiData = await response.json();
    let content = aiData.choices[0]?.message?.content || '[]';

    // Clean up markdown if present
    content = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    let issues = [];
    try {
      issues = JSON.parse(content);
    } catch (e) {
      console.error('JSON Parse Error:', content);
      // Fallback for demo if AI fails to return JSON
      issues = [
        {
          issue_type: 'style',
          severity: 'medium',
          title: 'AI Parse Failure',
          roast: 'My brain hurts trying to read your code. Or maybe I just broke.',
          explanation: 'The AI returned invalid JSON. Try again.',
          widget_type: 'GenericRoast',
          widget_config: { emoji: '🤖' },
        },
      ];
    }

    // 3. Save Issues to DB
    if (issues.length > 0) {
      const issuesToInsert = issues.map((issue: any) => ({
        review_id: review.id,
        ...issue,
      }));

      await supabase.from('code_issues').insert(issuesToInsert);
    }

    // 4. Update Review Status
    await supabase.from('code_reviews').update({ status: 'complete' }).eq('id', review.id);

    return NextResponse.json({ success: true, reviewId: review.id, issues });
  } catch (error: any) {
    console.error('Roast API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
