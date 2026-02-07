export interface GitHubFile {
  code: string;
  language: string;
  filename: string;
}

export async function fetchGitHubFile(url: string): Promise<GitHubFile> {
  // 1. Parse URL
  // Expected: https://github.com/owner/repo/blob/branch/path/to/file.ext
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)/);

  if (!match) {
    throw new Error('Invalid GitHub URL. Must be a file URL (blob).');
  }

  const [, owner, repo, branch, filepath] = match;

  // 2. Fetch Raw Content
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filepath}`;

  try {
    const response = await fetch(rawUrl);

    if (!response.ok) {
      if (response.status === 404) throw new Error('File not found. Check the URL or repo visibility.');
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const code = await response.text();

    // 3. Size Check (approx 10k lines)
    if (code.split('\n').length > 10000) {
      throw new Error('File is too large (>10,000 lines). Please use a smaller file or snippet.');
    }

    return {
      code,
      language: getExtensionLanguage(filepath),
      filename: filepath,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch GitHub file');
  }
}

function getExtensionLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  const map: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    css: 'css',
    html: 'html',
    json: 'json',
    sql: 'sql',
    php: 'php',
  };

  return map[ext || ''] || 'plaintext';
}
