export interface Issue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue_type: 'security' | 'performance' | 'complexity' | 'logic' | 'style';
}

export interface ScoreResult {
  overall: number;
  grade: string;
  security: number;
  performance: number;
  maintainability: number;
  gradeColor: string;
}

export function calculateScore(issues: Issue[]): ScoreResult {
  let score = 100;
  let securityScore = 100;
  let performanceScore = 100;
  let maintainabilityScore = 100;

  // Deduction rules
  const deductions = {
    critical: 25,
    high: 15,
    medium: 5,
    low: 2,
  };

  issues.forEach((issue) => {
    const deduction = deductions[issue.severity] || 0;
    score -= deduction;

    // Category specific
    if (issue.issue_type === 'security') securityScore -= deduction * 1.5;
    if (issue.issue_type === 'performance') performanceScore -= deduction * 1.5;
    if (['complexity', 'style', 'logic'].includes(issue.issue_type)) maintainabilityScore -= deduction;
  });

  // Clamp scores between 0 and 100
  const clamp = (num: number) => Math.max(0, Math.min(100, Math.round(num)));

  const finalScore = clamp(score);

  return {
    overall: finalScore,
    grade: calculateGrade(finalScore),
    gradeColor: getGradeColor(finalScore),
    security: clamp(securityScore),
    performance: clamp(performanceScore),
    maintainability: clamp(maintainabilityScore),
  };
}

function calculateGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  if (score >= 40) return 'F';
  return '💀';
}

function getGradeColor(score: number): string {
  if (score >= 90) return 'text-green-500';
  if (score >= 80) return 'text-blue-500';
  if (score >= 70) return 'text-yellow-500';
  if (score >= 60) return 'text-orange-500';
  return 'text-red-600';
}
