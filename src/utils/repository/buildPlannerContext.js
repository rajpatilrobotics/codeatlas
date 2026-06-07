const MAX_MATCHED_FILES = 12;
const MAX_MODULES = 8;
const MAX_SERVICES = 8;
const MAX_ENTRY_POINTS = 6;
const MAX_DEPENDENCY_SIGNALS = 8;

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'for',
  'from',
  'in',
  'into',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
  'add',
  'build',
  'change',
  'create',
  'enable',
  'fix',
  'implement',
  'improve',
  'issue',
  'problem',
  'request',
  'support',
  'update',
]);

const TERM_EXPANSIONS = {
  api: ['api', 'route', 'routes', 'router', 'endpoint', 'endpoints', 'controller', 'service'],
  auth: ['auth', 'authentication', 'authorization', 'authorize', 'login', 'logout', 'session', 'token', 'jwt', 'oauth', 'passport'],
  authentication: ['auth', 'authentication', 'authorization', 'login', 'session', 'token', 'jwt', 'oauth'],
  database: ['database', 'db', 'sqlite', 'postgres', 'postgresql', 'mysql', 'mongo', 'mongodb', 'model', 'models', 'schema', 'storage', 'pool'],
  db: ['database', 'db', 'sqlite', 'postgres', 'postgresql', 'mysql', 'mongo', 'mongodb', 'model', 'schema', 'storage', 'pool'],
  frontend: ['frontend', 'front', 'ui', 'client', 'web', 'page', 'pages', 'component', 'components', 'react', 'next', 'static'],
  login: ['login', 'auth', 'authentication', 'session', 'token', 'oauth', 'user'],
  migrate: ['migrate', 'migration', 'migrations', 'schema', 'config', 'service', 'api'],
  oauth: ['oauth', 'auth', 'authentication', 'login', 'session', 'token'],
  rate: ['rate', 'limit', 'limiter', 'throttle', 'quota', 'middleware'],
  refactor: ['refactor', 'cleanup', 'service', 'module', 'core'],
  scanner: ['scanner', 'scan', 'security', 'vulnerability', 'audit'],
  security: ['security', 'secure', 'scanner', 'scan', 'vulnerability', 'secret', 'token', 'auth', 'permission'],
  service: ['service', 'services', 'api', 'route', 'worker', 'handler'],
  test: ['test', 'tests', 'spec', 'pytest', 'jest', 'playwright', 'cypress'],
  testing: ['test', 'tests', 'spec', 'pytest', 'jest', 'playwright', 'cypress'],
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getPath(entry) {
  if (typeof entry === 'string') return entry.trim();
  if (typeof entry?.path === 'string') return entry.path.trim();
  return '';
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getConfidence(score) {
  if (score >= 72) return 'high';
  if (score >= 42) return 'medium';
  if (score >= 20) return 'low';
  return 'none';
}

function tokenize(text) {
  return unique(
    String(text || '')
      .toLowerCase()
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(/[^a-z0-9@._-]+/)
      .map(token => token.replace(/^[-_.]+|[-_.]+$/g, ''))
      .filter(token => token.length > 1 && !STOP_WORDS.has(token))
  );
}

function expandTerms(tokens) {
  const expanded = new Set(tokens);
  tokens.forEach(token => {
    const normalized = token.replace(/[^a-z0-9]/g, '');
    safeArray(TERM_EXPANSIONS[token]).forEach(item => expanded.add(item));
    safeArray(TERM_EXPANSIONS[normalized]).forEach(item => expanded.add(item));
  });
  return Array.from(expanded);
}

function pathParts(path) {
  return String(path || '')
    .split('/')
    .flatMap(part => part.split(/[._-]+/))
    .map(part => part.toLowerCase())
    .filter(Boolean);
}

function getFilename(path) {
  return String(path || '').split('/').pop() || path;
}

function getDirectory(path) {
  const parts = String(path || '').split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
}

function getTopLevelModule(path) {
  const parts = String(path || '').split('/').filter(Boolean);
  return parts.length > 1 ? parts[0] : 'root';
}

function normalizeGraphNodeId(path) {
  return `file:${path}`;
}

function buildGraphNodeMap(dependencyGraph) {
  const nodes = new Map();
  safeArray(dependencyGraph?.nodes).forEach(node => {
    const path = getPath(node?.path || String(node?.id || '').replace(/^file:/, ''));
    if (!path) return;
    nodes.set(path, node);
    nodes.set(normalizeGraphNodeId(path), node);
  });
  return nodes;
}

function buildGraphDegreeMap(dependencyGraph) {
  const degrees = new Map();
  const add = (nodeId, key) => {
    if (!nodeId) return;
    const path = String(nodeId).replace(/^file:/, '');
    const current = degrees.get(path) || { imports: 0, dependents: 0 };
    current[key] += 1;
    degrees.set(path, current);
  };

  safeArray(dependencyGraph?.edges).forEach(edge => {
    add(edge?.source, 'imports');
    add(edge?.target, 'dependents');
  });

  return degrees;
}

function flattenDefinitions(definitions) {
  if (!definitions || typeof definitions !== 'object') return [];
  return Object.values(definitions)
    .flatMap(value => safeArray(value))
    .map(item => {
      if (typeof item === 'string') return item;
      return item?.name || item?.id || item?.label || '';
    })
    .filter(Boolean);
}

function flattenPatterns(patterns) {
  if (!patterns || typeof patterns !== 'object') return [];
  return Object.values(patterns)
    .flatMap(value => safeArray(value))
    .map(item => String(item || ''))
    .filter(Boolean);
}

function getSecurityIssuePaths(codeAnalysis) {
  const paths = new Set();
  const security = codeAnalysis?.security || {};

  Object.values(security).forEach(items => {
    safeArray(items).forEach(issue => {
      const path = getPath(issue?.file || issue?.path);
      if (path) paths.add(path);
    });
  });

  return paths;
}

function buildFileRecords(repoData, codeAnalysis) {
  const records = new Map();
  const codeFiles = new Map(safeArray(codeAnalysis?.files).map(file => [getPath(file), file]));
  const importantFiles = new Map(safeArray(repoData?.importantFiles).map(file => [getPath(file), file]));
  const graphNodes = buildGraphNodeMap(repoData?.dependencyGraph);
  const graphDegrees = buildGraphDegreeMap(repoData?.dependencyGraph);
  const securityIssuePaths = getSecurityIssuePaths(codeAnalysis);

  const allPaths = unique([
    ...safeArray(repoData?.fileTree).map(getPath),
    ...safeArray(repoData?.fileStructure).map(getPath),
    ...safeArray(repoData?.importantFiles).map(getPath),
    ...safeArray(codeAnalysis?.files).map(getPath),
    ...safeArray(repoData?.dependencyGraph?.nodes).map(node => getPath(node?.path || String(node?.id || '').replace(/^file:/, ''))),
  ]);

  allPaths.forEach(path => {
    const codeFile = codeFiles.get(path) || {};
    const importantFile = importantFiles.get(path) || {};
    const graphNode = graphNodes.get(path) || {};
    const degree = graphDegrees.get(path) || {
      imports: graphNode.importCount || 0,
      dependents: graphNode.dependentCount || 0,
    };

    records.set(path, {
      path,
      filename: getFilename(path),
      directory: getDirectory(path),
      module: getTopLevelModule(path),
      language: graphNode.language || codeFile.language || importantFile.language || getLanguageFromPath(path),
      layer: graphNode.layer || inferLayer(path),
      isImportant: importantFiles.has(path),
      isGraphBacked: Boolean(graphNode.id || graphNode.path),
      hasSecurityIssue: securityIssuePaths.has(path),
      definitions: flattenDefinitions(codeFile.definitions || importantFile.definitions),
      patterns: flattenPatterns(codeFile.patterns || importantFile.patterns),
      imports: degree.imports || graphNode.importCount || 0,
      dependents: degree.dependents || graphNode.dependentCount || 0,
      size: codeFile.size || importantFile.size || 0,
      lines: codeFile.lines || importantFile.lines || 0,
    });
  });

  return Array.from(records.values());
}

function getLanguageFromPath(path) {
  const ext = String(path || '').split('.').pop()?.toLowerCase();
  const languageByExt = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    go: 'go',
    rb: 'ruby',
    php: 'php',
    yml: 'yaml',
    yaml: 'yaml',
    json: 'json',
    md: 'markdown',
    css: 'css',
    html: 'html',
  };
  return languageByExt[ext] || '';
}

function inferLayer(path) {
  const text = String(path || '').toLowerCase();
  if (/(^|\/)(api|routes?|controllers?|endpoints?)(\/|\.|_|-)/.test(text)) return 'api';
  if (/auth|login|session|token|oauth|permission/.test(text)) return 'auth';
  if (/database|db|models?|schema|migration|storage|sqlite|postgres|mysql/.test(text)) return 'data';
  if (/components?|pages?|views?|frontend|client|static|ui/.test(text)) return 'frontend';
  if (/services?|workers?|handlers?/.test(text)) return 'service';
  if (/tests?|spec|pytest|playwright|cypress/.test(text)) return 'testing';
  if (/docker|deploy|ci|workflow|github\/workflows|k8s|helm/.test(text)) return 'devops';
  if (/security|scan|secret|vulnerab/.test(text)) return 'security';
  if (/config|settings|env|package\.json|requirements|pyproject/.test(text)) return 'config';
  return 'file';
}

function getRecordSearchText(record) {
  return [
    record.path,
    record.filename,
    record.directory,
    record.module,
    record.layer,
    record.language,
    ...record.definitions,
    ...record.patterns,
  ].join(' ').toLowerCase();
}

function scoreFile(record, terms, originalTokens) {
  const filename = record.filename.toLowerCase();
  const directory = record.directory.toLowerCase();
  const parts = new Set(pathParts(record.path));
  const definitions = record.definitions.map(item => item.toLowerCase());
  const patterns = record.patterns.map(item => item.toLowerCase());
  const reasons = [];
  let score = 0;

  terms.forEach(term => {
    if (!term) return;
    const normalized = term.toLowerCase();

    if (parts.has(normalized)) {
      score += originalTokens.includes(normalized) ? 24 : 15;
      reasons.push(`Path segment matches "${normalized}"`);
      return;
    }

    if (filename.includes(normalized)) {
      score += originalTokens.includes(normalized) ? 20 : 12;
      reasons.push(`Filename contains "${normalized}"`);
      return;
    }

    if (directory.includes(normalized)) {
      score += originalTokens.includes(normalized) ? 14 : 8;
      reasons.push(`Directory contains "${normalized}"`);
      return;
    }

    if (definitions.some(item => item.includes(normalized))) {
      score += 12;
      reasons.push(`Code definition references "${normalized}"`);
      return;
    }

    if (patterns.some(item => item.includes(normalized))) {
      score += 10;
      reasons.push(`Code pattern references "${normalized}"`);
    }
  });

  if (record.layer && terms.includes(record.layer)) {
    score += 10;
    reasons.push(`Layer is "${record.layer}"`);
  }

  if (record.isImportant && score > 0) {
    score += 6;
    reasons.push('Repository analysis marked this as an important file');
  }

  if (record.isGraphBacked && score > 0) {
    score += 5;
    reasons.push('File is present in the dependency graph');
  }

  if (record.hasSecurityIssue && terms.some(term => /security|auth|token|secret|scanner|scan/.test(term))) {
    score += 10;
    reasons.push('Static analysis found security context for this file');
  }

  const coupling = Math.min(10, Math.ceil((record.imports + record.dependents) / 8));
  if (coupling > 0 && score > 0) {
    score += coupling;
    reasons.push(`Dependency graph shows ${record.imports} imports and ${record.dependents} dependents`);
  }

  const searchText = getRecordSearchText(record);
  if (score === 0 && originalTokens.some(token => searchText.includes(token))) {
    score += 12;
    reasons.push('Repository metadata contains task terms');
  }

  return {
    score: clampScore(score),
    reasons: unique(reasons).slice(0, 4),
  };
}

function buildMatchedFiles(records, terms, originalTokens) {
  return records
    .map(record => {
      const { score, reasons } = scoreFile(record, terms, originalTokens);
      return {
        path: record.path,
        score,
        confidence: getConfidence(score),
        reasons,
        module: record.module,
        layer: record.layer,
        language: record.language,
        isGraphBacked: record.isGraphBacked,
        imports: record.imports,
        dependents: record.dependents,
      };
    })
    .filter(item => item.score >= 20)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, MAX_MATCHED_FILES);
}

function buildModules(matchedFiles, records) {
  const moduleCounts = records.reduce((acc, record) => {
    acc.set(record.module, (acc.get(record.module) || 0) + 1);
    return acc;
  }, new Map());
  const grouped = new Map();

  matchedFiles.forEach(file => {
    const key = file.module || 'root';
    const current = grouped.get(key) || {
      name: key,
      score: 0,
      confidence: 'none',
      fileCount: moduleCounts.get(key) || 0,
      matchedFiles: [],
      reasons: [],
      layers: new Set(),
    };

    current.score = Math.max(current.score, file.score);
    current.matchedFiles.push(file.path);
    current.layers.add(file.layer);
    file.reasons.slice(0, 2).forEach(reason => current.reasons.push(reason));
    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .map(module => ({
      ...module,
      confidence: getConfidence(module.score),
      layers: Array.from(module.layers).filter(Boolean).slice(0, 3),
      reasons: unique([
        `${module.matchedFiles.length} matched file${module.matchedFiles.length === 1 ? '' : 's'} in ${module.name}`,
        ...module.reasons,
      ]).slice(0, 3),
      matchedFiles: module.matchedFiles.slice(0, 5),
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, MAX_MODULES);
}

function isServiceLike(record) {
  const text = `${record.path} ${record.layer}`.toLowerCase();
  return /api|route|router|endpoint|controller|service|handler|worker|middleware|auth|database|db|model|scanner|security/.test(text);
}

function buildServices(matchedFiles, recordsByPath) {
  return matchedFiles
    .map(file => {
      const record = recordsByPath.get(file.path);
      if (!record || !isServiceLike(record)) return null;
      return {
        name: record.filename,
        path: record.path,
        layer: record.layer,
        score: file.score,
        confidence: file.confidence,
        reasons: file.reasons.slice(0, 3),
      };
    })
    .filter(Boolean)
    .slice(0, MAX_SERVICES);
}

function isEntryPoint(record) {
  const text = record.path.toLowerCase();
  return (
    /(^|\/)(app|main|index|server|cli|bootstrap|entry|manage)\.(js|jsx|ts|tsx|py|java|go)$/.test(text) ||
    /(^|\/)(api|routes?|pages?)\/.*\.(js|jsx|ts|tsx|py)$/.test(text) ||
    record.dependents >= 12
  );
}

function buildEntryPoints(matchedFiles, records, terms, originalTokens) {
  const matchedPathSet = new Set(matchedFiles.map(file => file.path));

  return records
    .filter(isEntryPoint)
    .map(record => {
      const matched = matchedFiles.find(file => file.path === record.path);
      const scored = matched || {
        path: record.path,
        ...scoreFile(record, terms, originalTokens),
      };
      const proximityBonus = matchedPathSet.has(record.path) ? 15 : 0;
      const graphBonus = Math.min(12, Math.ceil(record.dependents / 6));
      const score = clampScore((scored.score || 0) + proximityBonus + graphBonus);
      return {
        path: record.path,
        score,
        confidence: getConfidence(score),
        layer: record.layer,
        reasons: unique([
          isEntryPoint(record) ? 'Looks like a repository entry point' : '',
          ...(scored.reasons || []),
          record.dependents ? `${record.dependents} files depend on or reference this node` : '',
        ]).slice(0, 3),
      };
    })
    .filter(item => item.score >= 20)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, MAX_ENTRY_POINTS);
}

function getPackageEntries(packageJson) {
  if (!packageJson || typeof packageJson !== 'object') return [];

  return [
    ['runtime', packageJson.dependencies],
    ['development', packageJson.devDependencies],
    ['peer', packageJson.peerDependencies],
    ['optional', packageJson.optionalDependencies],
  ].flatMap(([type, deps]) => (
    Object.entries(deps || {}).map(([name, version]) => ({ name, version, type }))
  ));
}

function getPackageScripts(packageJson) {
  if (!packageJson?.scripts || typeof packageJson.scripts !== 'object') return [];
  return Object.entries(packageJson.scripts).map(([name, command]) => ({ name, command }));
}

function buildDependencySignals(repoData, terms, originalTokens) {
  const packageEntries = getPackageEntries(repoData?.packageJson);
  const techEntries = Object.entries(repoData?.techStack || {})
    .flatMap(([category, items]) => safeArray(items).map(name => ({ name, category, type: 'detected-tech' })));

  return [...packageEntries, ...techEntries]
    .map(item => {
      const text = `${item.name} ${item.category || ''} ${item.type || ''}`.toLowerCase();
      const score = terms.reduce((total, term) => (
        text.includes(term) ? total + (originalTokens.includes(term) ? 32 : 18) : total
      ), 0);

      return {
        ...item,
        score: clampScore(score),
        confidence: getConfidence(score),
        reason: score > 0 ? `Dependency or tech signal matches task terms` : '',
      };
    })
    .filter(item => item.score >= 20)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, MAX_DEPENDENCY_SIGNALS);
}

function buildWarnings({ repoData, codeAnalysis, records, matchedFiles, taskText }) {
  const warnings = [];
  if (!String(taskText || '').trim()) {
    warnings.push('Enter a task to match repository context.');
  }
  if (records.length === 0) {
    warnings.push('No repository file list is available for local matching.');
  }
  if (!repoData?.dependencyGraph?.nodes?.length) {
    warnings.push('Dependency graph data is unavailable, so graph-backed confidence is limited.');
  }
  if (!codeAnalysis?.files?.length) {
    warnings.push('Code analysis file metadata is unavailable, so definition and pattern matching is limited.');
  }
  if (String(taskText || '').trim() && matchedFiles.length === 0) {
    warnings.push('No strong real-file matches found. Try adding a module, feature, or file keyword.');
  }
  return warnings;
}

export function buildPlannerContext({ taskText = '', repoData = null, codeAnalysis = null } = {}) {
  const originalTokens = tokenize(taskText);
  const terms = expandTerms(originalTokens);
  const records = buildFileRecords(repoData, codeAnalysis);
  const recordsByPath = new Map(records.map(record => [record.path, record]));
  const matchedFiles = originalTokens.length > 0
    ? buildMatchedFiles(records, terms, originalTokens)
    : [];
  const modules = buildModules(matchedFiles, records);
  const services = buildServices(matchedFiles, recordsByPath);
  const entryPoints = originalTokens.length > 0
    ? buildEntryPoints(matchedFiles, records, terms, originalTokens)
    : [];
  const dependencySignals = originalTokens.length > 0
    ? buildDependencySignals(repoData, terms, originalTokens)
    : [];
  const highestScore = Math.max(
    0,
    ...matchedFiles.map(file => file.score),
    ...modules.map(module => module.score),
    ...dependencySignals.map(dep => dep.score)
  );

  return {
    taskText,
    hasTask: originalTokens.length > 0,
    matchedTerms: terms,
    confidence: getConfidence(highestScore),
    score: highestScore,
    matchedFiles,
    modules,
    services,
    entryPoints,
    dependencySignals,
    packageScripts: getPackageScripts(repoData?.packageJson),
    coverage: {
      repositoryFiles: records.length,
      graphFiles: safeArray(repoData?.dependencyGraph?.nodes).length,
      graphEdges: safeArray(repoData?.dependencyGraph?.edges).length,
      analyzedFiles: safeArray(codeAnalysis?.files).length || codeAnalysis?.summary?.analyzedFiles || 0,
      packageDependencies: getPackageEntries(repoData?.packageJson).length,
    },
    warnings: buildWarnings({ repoData, codeAnalysis, records, matchedFiles, taskText }),
  };
}

export default buildPlannerContext;
