const STOP_WORDS = new Set([
  'about',
  'after',
  'also',
  'and',
  'are',
  'can',
  'code',
  'does',
  'for',
  'from',
  'have',
  'how',
  'into',
  'issue',
  'let',
  'like',
  'look',
  'make',
  'need',
  'project',
  'repo',
  'repository',
  'should',
  'that',
  'the',
  'this',
  'what',
  'when',
  'where',
  'which',
  'with',
  'would',
  'your',
]);

const MODE_PATTERNS = [
  ['setup', /\b(setup|install|start|run|build|deploy|configure|env|environment|script|command)\b/i],
  ['security', /\b(security|vulnerab|auth|token|secret|permission|xss|sql injection|csrf|dependency|dependencies)\b/i],
  ['debug', /\b(debug|bug|error|fail|failing|failed|broken|issue|trace|crash|fix|not working)\b/i],
  ['architecture', /\b(architecture|structure|component|flow|data flow|dependency|design|module|service)\b/i],
  ['explain', /\b(explain|describe|what is|what does|how does|overview|summary|tell me)\b/i],
];

const MODE_QUERY_TERMS = {
  architecture: ['architecture', 'component', 'service', 'flow', 'dependency', 'graph', 'router'],
  debug: ['error', 'debug', 'exception', 'handler', 'validation', 'state'],
  explain: ['readme', 'summary', 'overview', 'app', 'index', 'main'],
  general: ['readme', 'package', 'app', 'index', 'main'],
  security: ['security', 'auth', 'token', 'secret', 'permission', 'scan', 'dependency'],
  setup: ['package', 'readme', 'env', 'config', 'start', 'build', 'vercel', 'deploy'],
};

const DEFAULT_SUGGESTIONS = [
  'What does this repository do?',
  'How do I run this project locally?',
  'Which files should I read first?',
  'Where are the main risks in this codebase?',
];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeString(value) {
  return typeof value === 'string' ? value : '';
}

function truncate(value, maxLength) {
  const text = safeString(value).trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

export function detectChatMode(message = '') {
  const text = safeString(message);
  const match = MODE_PATTERNS.find(([, pattern]) => pattern.test(text));
  return match ? match[0] : 'general';
}

export function extractChatKeywords(message = '', mode = 'general') {
  const rawTerms = safeString(message)
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^a-z0-9_./-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const keywords = rawTerms
    .map((term) => term.replace(/^\.|\.$/g, ''))
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));

  return [...new Set([...keywords, ...safeArray(MODE_QUERY_TERMS[mode])])].slice(0, 18);
}

function detectFilePurpose(path = '') {
  const lower = path.toLowerCase();
  if (lower.includes('package.json')) return 'Dependencies and scripts';
  if (lower.includes('readme')) return 'Project documentation';
  if (lower.includes('.env') || lower.includes('config')) return 'Configuration';
  if (lower.includes('api/') || lower.includes('/api') || lower.includes('route')) return 'API layer';
  if (lower.includes('auth')) return 'Authentication or authorization';
  if (lower.includes('security')) return 'Security analysis';
  if (lower.includes('service')) return 'Service layer';
  if (lower.includes('component') || /\.(jsx|tsx)$/.test(lower)) return 'UI component';
  if (lower.includes('test') || lower.includes('spec')) return 'Test coverage';
  if (lower.includes('index') || lower.includes('main') || lower.includes('app')) return 'Application entry point';
  return 'Repository file';
}

function definitionNames(definitions) {
  if (!definitions || typeof definitions !== 'object') return [];
  return Object.values(definitions)
    .flatMap((items) => safeArray(items))
    .map((item) => item?.name || item?.signature || item?.exported || '')
    .filter(Boolean);
}

function normalizeFiles(repoData, codeAnalysis) {
  const files = new Map();

  const addFile = (file, source, index) => {
    const path = file?.path;
    if (!path) return;

    const existing = files.get(path) || {};
    const content = safeString(file.content || existing.content);
    const definitions = file.definitions || existing.definitions || {};

    files.set(path, {
      ...existing,
      ...file,
      content,
      definitions,
      definitionNames: definitionNames(definitions),
      path,
      purpose: existing.purpose || detectFilePurpose(path),
      source: existing.source ? `${existing.source}, ${source}` : source,
      importantRank: Math.min(existing.importantRank ?? index, index),
    });
  };

  safeArray(repoData?.importantFiles).forEach((file, index) => addFile(file, 'importantFiles', index));
  safeArray(codeAnalysis?.files).forEach((file, index) => addFile(file, 'codeAnalysis', index + 5));

  return Array.from(files.values());
}

function scoreFile(file, keywords, mode) {
  const path = file.path.toLowerCase();
  const content = safeString(file.content).toLowerCase();
  const definitionText = safeArray(file.definitionNames).join(' ').toLowerCase();
  let score = Math.max(0, 22 - (file.importantRank || 0));

  keywords.forEach((keyword) => {
    const term = keyword.toLowerCase();
    if (path.includes(term)) score += 22;
    if (definitionText.includes(term)) score += 16;
    if (content.includes(term)) score += 8;
  });

  if (mode === 'setup' && /(package\.json|readme|\.env|config|vercel|docker)/i.test(file.path)) score += 35;
  if (mode === 'security' && /(security|auth|token|dependency|package\.json|middleware)/i.test(file.path)) score += 35;
  if (mode === 'architecture' && /(architecture|graph|component|service|router|app|index)/i.test(file.path)) score += 28;
  if (mode === 'debug' && /(debug|error|handler|service|api|test|spec)/i.test(file.path)) score += 24;
  if (mode === 'explain' && /(readme|package\.json|app|index|main)/i.test(file.path)) score += 24;

  return score;
}

function extractSnippets(content, keywords, maxSnippets = 2, contextLines = 4) {
  const text = safeString(content);
  if (!text) return [];

  const lines = text.split('\n');
  const snippets = [];
  const used = new Set();

  keywords.some((keyword) => {
    const term = keyword.toLowerCase();
    for (let index = 0; index < lines.length; index += 1) {
      if (snippets.length >= maxSnippets) return true;
      if (used.has(index) || !lines[index].toLowerCase().includes(term)) continue;

      const start = Math.max(0, index - contextLines);
      const end = Math.min(lines.length, index + contextLines + 1);
      for (let lineIndex = start; lineIndex < end; lineIndex += 1) {
        used.add(lineIndex);
      }

      snippets.push({
        lines: `${start + 1}-${end}`,
        text: truncate(lines.slice(start, end).join('\n'), 1600),
      });
    }
    return false;
  });

  if (snippets.length === 0 && text) {
    snippets.push({
      lines: '1',
      text: truncate(lines.slice(0, 10).join('\n'), 1200),
    });
  }

  return snippets;
}

function buildRepoSummary(repoData, files) {
  const techEntries = Object.entries(repoData?.techStack || {})
    .flatMap(([category, values]) => safeArray(values).map((value) => `${category}: ${value}`));

  return {
    name: repoData?.repoInfo?.name || 'Unknown repository',
    description: repoData?.repoInfo?.description || 'No description provided',
    language: repoData?.repoInfo?.language || 'Unknown',
    stars: repoData?.repoInfo?.stars || 0,
    defaultBranch: repoData?.repoInfo?.defaultBranch || repoData?.repoInfo?.branch || 'unknown',
    techStack: techEntries.slice(0, 18),
    summary: truncate(repoData?.aiSummary || repoData?.readme || '', 700),
    fileCount: safeArray(repoData?.fileTree).length || files.length,
    importantFileCount: safeArray(repoData?.importantFiles).length,
  };
}

export function buildRepositoryChatContext({
  repoData,
  codeAnalysis,
  message = '',
  history = [],
  maxMatches = 6,
} = {}) {
  const mode = detectChatMode(message);
  const keywords = extractChatKeywords(message, mode);
  const files = normalizeFiles(repoData, codeAnalysis);
  const scoredFiles = files
    .map((file) => ({
      file,
      score: scoreFile(file, keywords, mode),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxMatches);

  const matches = scoredFiles.map(({ file, score }) => ({
    path: file.path,
    purpose: file.purpose || detectFilePurpose(file.path),
    reason: `Matched ${mode} question context`,
    score,
    definitions: safeArray(file.definitionNames).slice(0, 8),
    snippets: extractSnippets(file.content, keywords),
  }));

  return {
    repo: buildRepoSummary(repoData, files),
    mode,
    keywords,
    matches,
    history: safeArray(history)
      .slice(-6)
      .map((entry) => ({
        role: entry?.role || entry?.sender || 'user',
        content: truncate(entry?.content || entry?.text || '', 500),
      }))
      .filter((entry) => entry.content),
    stats: {
      filesConsidered: files.length,
      matchesReturned: matches.length,
      hasCodeAnalysis: Boolean(codeAnalysis?.files?.length),
    },
    suggestedQuestions: DEFAULT_SUGGESTIONS,
  };
}

export default buildRepositoryChatContext;
