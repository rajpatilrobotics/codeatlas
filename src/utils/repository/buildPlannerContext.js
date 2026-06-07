import { calculateBlastRadius } from './blastRadiusAnalysis.js';

const MAX_MATCHED_FILES = 12;
const MAX_MODULES = 8;
const MAX_SERVICES = 8;
const MAX_ENTRY_POINTS = 6;
const MAX_DEPENDENCY_SIGNALS = 8;
const MAX_SUGGESTED_FILES = 8;
const MAX_BLAST_IMPACT_FILES = 5;
const MAX_BLAST_IMPACTED_FILES = 8;

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

function normalizeRepositoryFiles(repoData) {
  const primaryFiles = safeArray(repoData?.fileTree).map(getPath).filter(Boolean);
  if (primaryFiles.length > 0) return unique(primaryFiles);
  return unique(safeArray(repoData?.fileStructure).map(getPath).filter(Boolean));
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

function titleFromTask(taskText) {
  const trimmed = String(taskText || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'Untitled engineering change';
  return trimmed.length > 96 ? `${trimmed.slice(0, 93)}...` : trimmed;
}

function detectIntent(originalTokens, terms, matchedFiles, modules) {
  const termSet = new Set(terms);
  const layerSet = new Set(matchedFiles.map(file => file.layer).filter(Boolean));
  const moduleNames = modules.map(module => module.name).filter(Boolean);

  const checks = [
    {
      key: 'auth',
      label: 'Authentication or session change',
      terms: ['auth', 'authentication', 'login', 'oauth', 'session', 'token', 'jwt'],
      rationale: 'Task terms and matched files point at authentication, sessions, or token handling.',
    },
    {
      key: 'rate-limit',
      label: 'API protection or rate-limiting change',
      terms: ['rate', 'limit', 'limiter', 'throttle', 'quota', 'middleware'],
      rationale: 'Task terms point at request throttling, middleware, or API protection.',
    },
    {
      key: 'data',
      label: 'Data layer or persistence change',
      terms: ['database', 'db', 'sqlite', 'postgres', 'mysql', 'model', 'schema', 'migration', 'storage', 'pool'],
      rationale: 'Task terms and matched files point at persistence, models, storage, or migration work.',
    },
    {
      key: 'security',
      label: 'Security analysis or hardening change',
      terms: ['security', 'scanner', 'scan', 'vulnerability', 'secret', 'permission', 'audit'],
      rationale: 'Task terms point at security scanning, hardening, or sensitive-code review.',
    },
    {
      key: 'api',
      label: 'API or service change',
      terms: ['api', 'route', 'router', 'endpoint', 'service', 'handler', 'controller'],
      rationale: 'Task terms and matched files point at API/service behavior.',
    },
    {
      key: 'frontend',
      label: 'Frontend or UI change',
      terms: ['frontend', 'ui', 'client', 'component', 'page', 'react', 'next', 'static'],
      rationale: 'Task terms and matched files point at client-facing UI code.',
    },
    {
      key: 'testing',
      label: 'Testing or validation change',
      terms: ['test', 'testing', 'spec', 'pytest', 'jest', 'playwright', 'cypress'],
      rationale: 'Task terms and matched files point at test coverage or validation work.',
    },
    {
      key: 'devops',
      label: 'Build, deployment, or operations change',
      terms: ['docker', 'deploy', 'ci', 'workflow', 'github', 'actions', 'kubernetes', 'config'],
      rationale: 'Task terms and matched files point at deployment, CI, or runtime configuration.',
    },
  ];

  const selected = checks.find(check => (
    check.terms.some(term => termSet.has(term)) ||
    check.terms.some(term => layerSet.has(term)) ||
    moduleNames.some(name => check.terms.some(term => name.toLowerCase().includes(term)))
  ));

  if (selected) {
    return {
      ...selected,
      matchedTerms: selected.terms.filter(term => termSet.has(term) || layerSet.has(term)),
    };
  }

  return {
    key: originalTokens.length > 0 ? 'general' : 'none',
    label: originalTokens.length > 0 ? 'General codebase change' : 'No task entered',
    rationale: originalTokens.length > 0
      ? 'No specialized intent dominated, so the plan stays scoped to the highest-confidence repository matches.'
      : 'Enter a task before deterministic planning can begin.',
    matchedTerms: [],
  };
}

function getFileAction(file, intent) {
  const layer = String(file.layer || '').toLowerCase();
  if (isTestLikeFile(file)) return 'Update or add focused regression coverage';
  if (layer === 'auth') return 'Review and update authentication/session behavior';
  if (layer === 'data') return 'Review persistence, model, or migration impact';
  if (layer === 'api' || layer === 'service') return 'Update request/service handling';
  if (layer === 'frontend') return 'Update user-facing flow or client integration';
  if (layer === 'devops' || layer === 'config') return 'Update configuration or delivery wiring';
  if (intent?.key === 'security') return 'Review security-sensitive behavior';
  return 'Review and update if the change touches this path';
}

function buildSuggestedFiles(matchedFiles, intent) {
  return matchedFiles.slice(0, MAX_SUGGESTED_FILES).map(file => ({
    path: file.path,
    action: getFileAction(file, intent),
    confidence: file.confidence,
    score: file.score,
    layer: file.layer,
    language: file.language,
    why: unique([
      ...file.reasons,
      file.isGraphBacked ? 'Dependency graph can provide impact context for this file' : '',
    ]).slice(0, 4),
  }));
}

function isTestLikeFile(file) {
  const path = String(file?.path || '').toLowerCase();
  return file?.layer === 'testing' || /(^|\/)(tests?|specs?)(\/|$)|(^|[._-])(test|spec)[._-]/.test(path);
}

function summarizeAffectedSystems(modules, services, entryPoints, dependencySignals) {
  return {
    modules: modules.map(module => ({
      name: module.name,
      score: module.score,
      confidence: module.confidence,
      fileCount: module.fileCount,
      layers: module.layers || [],
      matchedFiles: module.matchedFiles,
      reason: module.reasons[0] || 'Matched through repository context',
    })),
    services: services.map(service => ({
      name: service.name,
      path: service.path,
      layer: service.layer,
      score: service.score,
      confidence: service.confidence,
      reason: service.reasons[0] || 'Matched as a service-like file',
    })),
    entryPoints: entryPoints.map(entry => ({
      path: entry.path,
      score: entry.score,
      confidence: entry.confidence,
      reason: entry.reasons[0] || 'Likely entry point from path or graph centrality',
    })),
    dependencies: dependencySignals.map(dep => ({
      name: dep.name,
      type: dep.type,
      category: dep.category || dep.type,
      score: dep.score,
      confidence: dep.confidence,
      reason: dep.reason || 'Matched dependency or technology signal',
    })),
  };
}

function fileListText(files, fallback = 'the matched files') {
  const paths = files.map(file => file.path).filter(Boolean);
  if (paths.length === 0) return fallback;
  if (paths.length === 1) return paths[0];
  return `${paths.slice(0, 3).join(', ')}${paths.length > 3 ? ` and ${paths.length - 3} more` : ''}`;
}

function buildRoadmap({ suggestedFiles, modules, entryPoints, packageScripts, intent }) {
  if (suggestedFiles.length === 0) return [];

  const primaryFiles = suggestedFiles.filter(file => !isTestLikeFile(file)).slice(0, 4);
  const testFiles = suggestedFiles.filter(isTestLikeFile).slice(0, 3);
  const primaryModuleNames = modules.slice(0, 3).map(module => module.name).join(', ');
  const scriptNames = packageScripts.slice(0, 3).map(script => `npm run ${script.name}`);

  return [
    {
      id: 'scope',
      title: 'Confirm scope against matched repository context',
      detail: `Treat this as a ${intent.label.toLowerCase()} and start with ${primaryModuleNames || 'the highest-confidence matched module'}.`,
      files: entryPoints.slice(0, 2).map(entry => entry.path),
    },
    {
      id: 'read',
      title: 'Read the existing implementation path',
      detail: `Inspect ${fileListText(primaryFiles)} before editing so the change follows existing patterns.`,
      files: primaryFiles.map(file => file.path),
    },
    {
      id: 'implement',
      title: 'Apply the smallest coherent code change',
      detail: `Make the behavior change in the highest-confidence files first, then update adjacent service or data paths only when the dependency context requires it.`,
      files: primaryFiles.slice(0, 5).map(file => file.path),
    },
    {
      id: 'tests',
      title: testFiles.length > 0 ? 'Update matched tests' : 'Add or identify focused regression coverage',
      detail: testFiles.length > 0
        ? `Use ${fileListText(testFiles)} as the first validation targets.`
        : 'No strong test-file match was found, so identify the nearest existing test area before merging.',
      files: testFiles.map(file => file.path),
    },
    {
      id: 'validate',
      title: 'Run available validation checks',
      detail: scriptNames.length > 0
        ? `Start with ${scriptNames.join(', ')}.`
        : 'No package.json scripts were available; use the repository documented test/build command or the matched test files.',
      files: [],
    },
  ];
}

function buildRisks({ confidence, suggestedFiles, modules, coverage, intent }) {
  const risks = [];
  const highCouplingFiles = suggestedFiles.filter(file => file.score >= 70).slice(0, 3);
  const sensitiveLayers = new Set(suggestedFiles.map(file => file.layer).filter(layer => (
    ['auth', 'data', 'security', 'config', 'devops'].includes(layer)
  )));

  if (confidence !== 'high') {
    risks.push({
      level: confidence === 'medium' ? 'medium' : 'high',
      title: 'Matcher confidence is limited',
      detail: 'The local matcher did not find a high-confidence target set, so confirm the target module before implementation.',
    });
  }

  if (sensitiveLayers.size > 0) {
    risks.push({
      level: 'high',
      title: 'Sensitive system area',
      detail: `The plan touches ${Array.from(sensitiveLayers).join(', ')} context, so review security, data, and rollback behavior carefully.`,
    });
  }

  if (highCouplingFiles.length > 0) {
    risks.push({
      level: 'medium',
      title: 'Potentially broad dependency impact',
      detail: `${fileListText(highCouplingFiles)} ranked highly and may affect adjacent modules.`,
    });
  }

  if ((coverage.graphFiles || 0) === 0) {
    risks.push({
      level: 'medium',
      title: 'No dependency graph evidence',
      detail: 'Planner could not use dependency graph coverage, so impact confidence is lower.',
    });
  }

  if (!suggestedFiles.some(isTestLikeFile)) {
    risks.push({
      level: 'medium',
      title: 'No matched test files',
      detail: 'The matcher did not find a strong existing test target, so validation planning needs manual confirmation.',
    });
  }

  if (modules.length > 4) {
    risks.push({
      level: 'medium',
      title: 'Multiple modules involved',
      detail: `Matched context spans ${modules.length} modules, so keep the first implementation pass narrow.`,
    });
  }

  if (risks.length === 0 && suggestedFiles.length > 0) {
    risks.push({
      level: 'low',
      title: 'Scoped local plan',
      detail: `The deterministic plan found a focused ${intent.label.toLowerCase()} target set with available repo context.`,
    });
  }

  return risks.slice(0, 6);
}

function buildValidationChecklist({ packageScripts, suggestedFiles, intent }) {
  const checklist = [];
  const testFiles = suggestedFiles.filter(isTestLikeFile);
  const scriptPriority = ['test', 'tests', 'lint', 'build', 'typecheck', 'check'];
  const orderedScripts = [...packageScripts].sort((a, b) => {
    const aIndex = scriptPriority.findIndex(name => a.name.toLowerCase().includes(name));
    const bIndex = scriptPriority.findIndex(name => b.name.toLowerCase().includes(name));
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex) || a.name.localeCompare(b.name);
  });

  orderedScripts.slice(0, 5).forEach(script => {
    checklist.push({
      type: 'script',
      command: `npm run ${script.name}`,
      label: `Run package script: ${script.name}`,
      detail: script.command,
      source: 'package.json',
    });
  });

  if (testFiles.length > 0) {
    checklist.push({
      type: 'tests',
      label: 'Run or update matched test files',
      detail: fileListText(testFiles),
      source: 'matched repository files',
    });
  }

  checklist.push({
    type: 'review',
    label: `Review ${intent.label.toLowerCase()} behavior manually`,
    detail: 'Confirm the changed flow against the original task before merging.',
    source: 'deterministic planner',
  });

  if (packageScripts.length === 0) {
    checklist.unshift({
      type: 'manual',
      label: 'Identify the repository-specific test command',
      detail: 'No package.json scripts were available in the analysis payload.',
      source: 'missing package scripts',
    });
  }

  return checklist.slice(0, 8);
}

function buildMissingContext({ hasTask, matchedFiles, packageScripts, coverage, warnings }) {
  const missing = [];

  if (!hasTask) {
    missing.push('A task, ticket, bug report, or feature request is required before planning.');
  }
  if (matchedFiles.length === 0 && hasTask) {
    missing.push('No strong file matches were found; add a module, file, API, or technology keyword.');
  }
  if ((coverage.graphFiles || 0) === 0) {
    missing.push('Dependency graph coverage is unavailable for this plan.');
  }
  if ((coverage.analyzedFiles || 0) === 0) {
    missing.push('Code-analysis metadata is unavailable, so definition matching is limited.');
  }
  if (packageScripts.length === 0) {
    missing.push('No package.json scripts were available for command-level validation.');
  }
  warnings
    .filter(warning => !warning.startsWith('Enter a task'))
    .forEach(warning => missing.push(warning));

  return unique(missing).slice(0, 6);
}

function getImpactTraversalDepth(result) {
  if (Number.isFinite(result?.graphEvidence?.maxDepth)) {
    return result.graphEvidence.maxDepth;
  }

  return Math.max(
    0,
    ...safeArray(result?.rankedImpactedFiles)
      .map(file => Number.isFinite(file?.distance) ? file.distance : 0)
  );
}

function getImpactFileList(result) {
  const rankedPaths = safeArray(result?.rankedImpactedFiles)
    .map(file => getPath(file?.path))
    .filter(Boolean);
  const fallbackPaths = safeArray(result?.impactedFiles)
    .map(getPath)
    .filter(Boolean);

  return unique(rankedPaths.length > 0 ? rankedPaths : fallbackPaths);
}

function getImpactWhy(result) {
  const evidence = result?.graphEvidence || {};
  const reason = safeArray(result?.impactReasons)
    .map(item => item?.description || item?.label)
    .find(Boolean);
  const rankedReason = safeArray(result?.rankedImpactedFiles)
    .map(item => item?.reason)
    .find(Boolean);

  if (result?.analysisMode === 'dependency-graph') {
    const directEdges = evidence.directEdges || 0;
    const transitiveFiles = evidence.transitiveFiles || 0;
    return `Dependency graph evidence found ${directEdges} direct edge${directEdges === 1 ? '' : 's'} and ${transitiveFiles} transitive file${transitiveFiles === 1 ? '' : 's'}.`;
  }

  return reason || rankedReason || result?.impactSummary || 'Existing blast-radius utility found local impact evidence for this matched file.';
}

function buildBlastImpact(suggestedFiles, repoData) {
  const repositoryFiles = normalizeRepositoryFiles(repoData);
  const dependencyGraph = repoData?.dependencyGraph;

  if (!dependencyGraph?.nodes?.length || repositoryFiles.length === 0) {
    return {
      available: false,
      reason: 'Dependency graph or repository files unavailable.',
      items: [],
    };
  }

  const candidates = suggestedFiles.slice(0, MAX_BLAST_IMPACT_FILES);
  const items = candidates.map(file => {
    const result = calculateBlastRadius(
      file.path,
      repositoryFiles,
      [],
      dependencyGraph,
      { direction: 'both' }
    );
    const impactedFiles = getImpactFileList(result);
    const affectedModules = unique(impactedFiles.map(getTopLevelModule));

    return {
      path: file.path,
      riskLevel: result?.severity || 'low',
      affectedFilesCount: safeArray(result?.impactedFiles).length,
      affectedModules,
      traversalDepth: getImpactTraversalDepth(result),
      impactSummary: result?.impactSummary || '',
      whyImpact: getImpactWhy(result),
      impactedFiles: impactedFiles.slice(0, MAX_BLAST_IMPACTED_FILES),
      impactedFilesOverflow: Math.max(impactedFiles.length - MAX_BLAST_IMPACTED_FILES, 0),
      analysisMode: result?.analysisMode || 'fallback',
      confidence: result?.confidence || 'low',
      isLimited: Boolean(result?.isLimited),
    };
  });

  return {
    available: true,
    reason: '',
    items,
  };
}

function buildImplementationPlan({
  taskText,
  originalTokens,
  terms,
  matchedFiles,
  modules,
  services,
  entryPoints,
  dependencySignals,
  packageScripts,
  coverage,
  warnings,
  confidence,
  score,
  repoData,
}) {
  const hasTask = originalTokens.length > 0;
  const intent = detectIntent(originalTokens, terms, matchedFiles, modules);
  const suggestedFiles = buildSuggestedFiles(matchedFiles, intent);
  const affectedSystems = summarizeAffectedSystems(modules, services, entryPoints, dependencySignals);
  const roadmap = hasTask
    ? buildRoadmap({ suggestedFiles, modules, entryPoints, packageScripts, intent })
    : [];
  const risks = hasTask
    ? buildRisks({ confidence, suggestedFiles, modules, coverage, intent })
    : [];
  const validationChecklist = hasTask
    ? buildValidationChecklist({ packageScripts, suggestedFiles, intent })
    : [];
  const missingContext = buildMissingContext({
    hasTask,
    matchedFiles,
    packageScripts,
    coverage,
    warnings,
  });
  const blastImpact = hasTask
    ? buildBlastImpact(suggestedFiles, repoData)
    : {
        available: false,
        reason: 'Enter a task to calculate impact.',
        items: [],
      };

  return {
    mode: 'local-deterministic',
    isGenerated: hasTask && suggestedFiles.length > 0,
    taskTitle: titleFromTask(taskText),
    intent,
    confidence,
    score,
    affectedSystems,
    suggestedFiles,
    roadmap,
    risks,
    validationChecklist,
    missingContext,
    blastImpact,
  };
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
  const confidence = getConfidence(highestScore);
  const packageScripts = getPackageScripts(repoData?.packageJson);
  const coverage = {
    repositoryFiles: records.length,
    graphFiles: safeArray(repoData?.dependencyGraph?.nodes).length,
    graphEdges: safeArray(repoData?.dependencyGraph?.edges).length,
    analyzedFiles: safeArray(codeAnalysis?.files).length || codeAnalysis?.summary?.analyzedFiles || 0,
    packageDependencies: getPackageEntries(repoData?.packageJson).length,
  };
  const warnings = buildWarnings({ repoData, codeAnalysis, records, matchedFiles, taskText });
  const plan = buildImplementationPlan({
    taskText,
    originalTokens,
    terms,
    matchedFiles,
    modules,
    services,
    entryPoints,
    dependencySignals,
    packageScripts,
    coverage,
    warnings,
    confidence,
    score: highestScore,
    repoData,
  });

  return {
    taskText,
    hasTask: originalTokens.length > 0,
    matchedTerms: terms,
    confidence,
    score: highestScore,
    matchedFiles,
    modules,
    services,
    entryPoints,
    dependencySignals,
    packageScripts,
    coverage,
    warnings,
    plan,
  };
}

export default buildPlannerContext;
