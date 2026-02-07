export interface PRFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed' | 'changed' | 'copied' | 'unchanged';
  additions: number;
  deletions: number;
  patch?: string; // The diff
  code?: string; // Extracted code from patch (for analysis)
}

export interface PRData {
  files: PRFile[];
  prNumber: number;
  repo: string;
  title: string;
}

const ANALYZABLE_EXTENSIONS = [
  'js',
  'jsx',
  'ts',
  'tsx',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'cpp',
  'c',
  'php',
  'css',
  'html',
  'sql',
];

export async function fetchGitHubPR(url: string): Promise<PRData> {
  // 1. Parse URL
  // Expected: https://github.com/owner/repo/pull/123
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);

  if (!match) {
    throw new Error('Invalid PR URL. Format: github.com/owner/repo/pull/123');
  }

  const [, owner, repo, prNumber] = match;
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.warn('GITHUB_TOKEN not found. API limits will be restricted.');
  }

  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  try {
    // 2. Fetch PR Details (for title)
    const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, { headers });
    if (!prRes.ok) throw new Error(`Failed to fetch PR details: ${prRes.statusText}`);
    const prJson = await prRes.json();

    // 3. Fetch Files
    // Note: Page size is 30 by default, increasing to 100. For huge PRs, might need pagination (skipping for prototype).
    const filesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`, {
      headers,
    });

    if (!filesRes.ok) throw new Error(`Failed to fetch PR files: ${filesRes.statusText}`);

    const rawFiles = await filesRes.json();

    // 4. Process Files
    const files: PRFile[] = rawFiles
      .filter((f: any) => f.status !== 'removed') // Ignore deleted files
      .filter((f: any) => {
        const ext = f.filename.split('.').pop()?.toLowerCase();
        return ext && ANALYZABLE_EXTENSIONS.includes(ext);
      })
      .map((f: any) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch,
        // Simple extraction of added lines for context (in a real app, we might fetch the full raw file content)
        code: extractAddedLines(f.patch),
      }))
      .filter((f: PRFile) => f.code && f.code.length > 0); // Only keep files with analyzable code

    return {
      files,
      prNumber: parseInt(prNumber),
      repo: `${owner}/${repo}`,
      title: prJson.title,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to analyze GitHub PR');
  }
}

function extractAddedLines(patch?: string): string {
  if (!patch) return '';
  return patch
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.substring(1)) // Remove '+' prefix
    .join('\n');
}
