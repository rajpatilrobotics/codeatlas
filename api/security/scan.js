const fetch = require('node-fetch');

const GITHUB_API_BASE = 'https://api.github.com';
const MAX_SECURITY_FILES = 120;
const FILE_SIZE_LIMIT = 220 * 1024;
const SECURITY_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.rb', '.php', '.go', '.rs', '.java', '.kt', '.kts',
  '.cs', '.c', '.cc', '.cpp', '.h', '.hpp',
  '.json', '.yml', '.yaml', '.toml', '.ini', '.env', '.example',
  '.dockerfile', '.md'
]);

const IGNORE_SEGMENTS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '__pycache__',
  'vendor',
  '.venv',
  'venv',
  'site-packages'
];

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function getHeaders(token) {
  const headers = { Accept: 'application/vnd.github.v3+json' };
  if (token) headers.Authorization = `token ${token}`;
  return headers;
}

function parseGitHubUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const normalized = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
  const patterns = [
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)/,
    /^github\.com\/([^/]+)\/([^/]+)/,
    /^([^/]+)\/([^/]+)$/
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) return { owner: match[1], repo: match[2] };
  }
  return null;
}

function getExtension(filePath) {
  const path = String(filePath || '').toLowerCase();
  if (path.endsWith('dockerfile')) return '.dockerfile';
  if (path.includes('.env')) return '.env';
  const match = path.match(/\.[^.\/]+$/);
  return match ? match[0] : '';
}

function shouldSkip(filePath, size = 0) {
  const lower = String(filePath || '').toLowerCase();
  return (
    Number(size || 0) > FILE_SIZE_LIMIT ||
    IGNORE_SEGMENTS.some(segment => lower.includes(`/${segment}/`) || lower.startsWith(`${segment}/`)) ||
    lower.includes('.min.') ||
    lower.endsWith('.map') ||
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.pdf') ||
    lower.endsWith('.zip')
  );
}

function scoreSecurityCandidate(filePath) {
  const lower = String(filePath || '').toLowerCase();
  let score = 1;

  if (/(\b|\/)(auth|oauth|session|token|security|permission|jwt|secret|credential)/.test(lower)) score += 45;
  if (/(\b|\/)(api|routes?|controllers?|handlers?|middleware|server)\//.test(lower)) score += 35;
  if (/(\b|\/)(database|db|models?|schemas?|migrations?)\//.test(lower)) score += 25;
  if (/(\b|\/)(config|settings|env|docker|compose|workflow|ci)\//.test(lower)) score += 22;
  if (/(\.env|package\.json|package-lock\.json|dockerfile|docker-compose|\.github\/workflows)/.test(lower)) score += 28;
  if (/(\b|\/)(index|main|app|server|manage|cli)\.(js|jsx|ts|tsx|py|go|rb|php)$/.test(lower)) score += 18;
  if (/(test|spec|fixture|mock|example|readme|docs?)/.test(lower)) score -= 6;

  return score;
}

function selectSecurityFiles(treeEntries, fileTree = []) {
  const fromEntries = Array.isArray(treeEntries) && treeEntries.length > 0
    ? treeEntries.map(entry => ({ path: entry.path, size: Number(entry.size || 0) }))
    : fileTree.map(path => ({ path, size: 0 }));

  return fromEntries
    .filter(entry => entry.path)
    .filter(entry => SECURITY_EXTENSIONS.has(getExtension(entry.path)))
    .filter(entry => !shouldSkip(entry.path, entry.size))
    .map(entry => ({ ...entry, score: scoreSecurityCandidate(entry.path) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.path.length - b.path.length;
    })
    .slice(0, MAX_SECURITY_FILES);
}

async function fetchFile(owner, repo, branch, filePath, headers) {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, '/')}${branch ? `?ref=${encodeURIComponent(branch)}` : ''}`,
    { headers }
  );

  if (!response.ok) {
    return { path: filePath, error: `GitHub returned ${response.status}` };
  }

  const data = await response.json();
  if (!data.content || data.encoding !== 'base64') {
    return { path: filePath, error: 'No text content available' };
  }

  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return {
    path: filePath,
    content,
    size: data.size || Buffer.byteLength(content),
    sha: data.sha
  };
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { repoData } = req.body || {};
    const repoUrl = repoData?.repoInfo?.url || repoData?.repoUrl || repoData?.url;
    const parsed = parseGitHubUrl(repoUrl);
    const token = process.env.GITHUB_TOKEN;

    if (!parsed) {
      return res.status(200).json({
        success: true,
        available: false,
        reason: 'Repository URL unavailable for bounded security file fetch.',
        files: []
      });
    }

    if (!token) {
      return res.status(200).json({
        success: true,
        available: false,
        reason: 'GitHub token unavailable on server. Falling back to already analyzed files.',
        files: []
      });
    }

    const { owner, repo } = parsed;
    const branch = repoData?.repoInfo?.defaultBranch || '';
    const headers = getHeaders(token);
    const treePaths = Array.isArray(repoData?.fileTree) && repoData.fileTree.length > 0
      ? repoData.fileTree
      : repoData?.fileStructure || [];
    const candidates = selectSecurityFiles([], treePaths);
    const existingPaths = new Set((repoData?.importantFiles || []).map(file => file?.path).filter(Boolean));
    const paths = candidates
      .map(candidate => candidate.path)
      .filter(path => !existingPaths.has(path))
      .slice(0, MAX_SECURITY_FILES);

    const files = [];
    const batchSize = 8;
    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(path => fetchFile(owner, repo, branch, path, headers)));
      files.push(...results.filter(file => file.content && !file.error));
    }

    return res.status(200).json({
      success: true,
      available: true,
      reason: '',
      files,
      coverage: {
        candidateCount: candidates.length,
        fetchedCount: files.length,
        maxFiles: MAX_SECURITY_FILES,
        fileSizeLimit: FILE_SIZE_LIMIT
      }
    });
  } catch (error) {
    console.error('Security file scan API error:', error);
    return res.status(200).json({
      success: true,
      available: false,
      reason: error.message || 'Security file scan unavailable.',
      files: []
    });
  }
};
