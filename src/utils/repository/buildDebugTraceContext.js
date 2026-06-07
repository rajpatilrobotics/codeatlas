const ERROR_TYPE_PATTERN = /\b([A-Z][A-Za-z0-9_$]*(?:Error|Exception)|TypeError|ReferenceError|SyntaxError|RangeError|ImportError|ModuleNotFoundError|AttributeError|KeyError|ValueError|RuntimeError|HTTPError)\b/;
const SOURCE_EXTENSIONS = [
  'jsx',
  'tsx',
  'js',
  'ts',
  'py',
  'java',
  'go',
  'rb',
  'php',
  'css',
  'scss',
  'json',
  'yaml',
  'yml',
  'html',
  'md',
];

const FILE_REFERENCE_PATTERN = new RegExp(
  `((?:webpack:\\/\\/\\/|file:\\/\\/|https?:\\/\\/[^\\s)'"]+\\/)?(?:[A-Za-z]:)?(?:\\.{1,2}\\/|\\/)?(?:[\\w@.-]+\\/)*[\\w@.-]+\\.(?:${SOURCE_EXTENSIONS.join('|')}))(?:[:#](\\d+))?(?:[:#](\\d+))?`,
  'gi'
);

const API_ROUTE_PATTERN = /\b(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+((?:\/api\/|\/)[A-Za-z0-9_./:-]+)/gi;
const LOOSE_API_ROUTE_PATTERN = /(?:^|[\s(["'])((?:\/api\/)[A-Za-z0-9_./:-]+)/gi;
const URL_PATTERN = /https?:\/\/[^\s)'"<>]+/gi;
const HTTP_STATUS_PATTERN = /\b(?:status|http|response|request|failed|error|returned|received)\D{0,24}([1-5]\d{2})\b/gi;
const TRACE_MAX_DEPTH = 2;
const TRACE_MAX_RELATED_FILES = 25;
const TRACE_COLLECTION_LIMIT = TRACE_MAX_RELATED_FILES * 4;

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

function getFilename(path) {
  return String(path || '').split('/').pop() || '';
}

function getDirectory(path) {
  const parts = String(path || '').split('/').filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
}

function getTopLevelModule(path) {
  const parts = String(path || '').split('/').filter(Boolean);
  return parts.length > 1 ? parts[0] : 'root';
}

function normalizeReferencePath(value) {
  let path = String(value || '').trim();
  if (!path) return '';

  path = path.replace(/^webpack:\/\/\//, '');

  try {
    if (/^https?:\/\//i.test(path) || /^file:\/\//i.test(path)) {
      const parsed = new URL(path);
      path = parsed.pathname || path;
    }
  } catch {
    // Keep the original path if URL parsing fails.
  }

  path = path
    .replace(/[?#].*$/, '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^\.\//, '');

  const nodeModuleIndex = path.indexOf('node_modules/');
  if (nodeModuleIndex >= 0) {
    path = path.slice(nodeModuleIndex);
  }

  const staticIndex = path.indexOf('static/');
  const srcIndex = path.indexOf('src/');
  const apiIndex = path.indexOf('api/');
  const likelyRepoIndex = [srcIndex, apiIndex, staticIndex]
    .filter(index => index >= 0)
    .sort((a, b) => a - b)[0];
  if (likelyRepoIndex > 0) {
    path = path.slice(likelyRepoIndex);
  }

  return path;
}

function normalizeRepositoryFiles(repoData) {
  const primary = safeArray(repoData?.fileTree).map(getPath).filter(Boolean);
  if (primary.length > 0) return unique(primary);
  return unique(safeArray(repoData?.fileStructure).map(getPath).filter(Boolean));
}

function buildFileMatcher(repoFiles) {
  const exact = new Map();
  const lower = new Map();
  const basename = new Map();

  repoFiles.forEach(path => {
    exact.set(path, path);
    lower.set(path.toLowerCase(), path);
    const name = getFilename(path).toLowerCase();
    if (!basename.has(name)) basename.set(name, []);
    basename.get(name).push(path);
  });

  return function matchReference(rawPath) {
    const normalized = normalizeReferencePath(rawPath);
    if (!normalized) return null;

    if (exact.has(normalized)) {
      return { path: exact.get(normalized), matchType: 'exact', confidence: 'high', normalized };
    }

    const lowerPath = normalized.toLowerCase();
    if (lower.has(lowerPath)) {
      return { path: lower.get(lowerPath), matchType: 'normalized', confidence: 'high', normalized };
    }

    const suffixMatches = repoFiles.filter(path => (
      path.toLowerCase().endsWith(`/${lowerPath}`) ||
      path.toLowerCase().endsWith(lowerPath)
    ));
    if (suffixMatches.length === 1) {
      return { path: suffixMatches[0], matchType: 'suffix', confidence: 'medium', normalized };
    }
    if (suffixMatches.length > 1) {
      return {
        path: suffixMatches[0],
        matchType: 'suffix-ambiguous',
        confidence: 'low',
        normalized,
        alternatives: suffixMatches.slice(1, 5),
      };
    }

    const basenameMatches = basename.get(getFilename(normalized).toLowerCase()) || [];
    if (basenameMatches.length === 1) {
      return { path: basenameMatches[0], matchType: 'basename', confidence: 'medium', normalized };
    }
    if (basenameMatches.length > 1) {
      return {
        path: basenameMatches[0],
        matchType: 'basename-ambiguous',
        confidence: 'low',
        normalized,
        alternatives: basenameMatches.slice(1, 5),
      };
    }

    return null;
  };
}

function parseErrorSummary(input) {
  const lines = String(input || '').split('\n').map(line => line.trim()).filter(Boolean);
  const firstMeaningfulLine = lines.find(line => !/^\s*(at\s+|File\s+["'])/.test(line)) || '';
  const typeMatch = firstMeaningfulLine.match(ERROR_TYPE_PATTERN) || String(input || '').match(ERROR_TYPE_PATTERN);
  const errorType = typeMatch?.[1] || '';
  let message = firstMeaningfulLine;

  if (errorType && firstMeaningfulLine.includes(errorType)) {
    message = firstMeaningfulLine
      .replace(new RegExp(`^.*?${errorType}\\s*:?\\s*`), '')
      .trim();
  }

  return {
    type: errorType || 'Unknown error',
    message: message || firstMeaningfulLine || 'No error message detected.',
    rawFirstLine: firstMeaningfulLine,
  };
}

function parseFunctionName(line) {
  const jsParenMatch = line.match(/\bat\s+(.+?)\s+\(/);
  if (jsParenMatch) return jsParenMatch[1].trim();

  const jsDirectMatch = line.match(/\bat\s+([^\s]+)/);
  if (jsDirectMatch && !/\.[A-Za-z0-9]+(?::\d+)?/.test(jsDirectMatch[1])) {
    return jsDirectMatch[1].trim();
  }

  const safariMatch = line.match(/^([^@\s]+)@/);
  if (safariMatch) return safariMatch[1].trim();

  const pythonMatch = line.match(/,\s+in\s+([A-Za-z_][\w.]*)/);
  if (pythonMatch) return pythonMatch[1].trim();

  return '';
}

function parseStackFrames(input) {
  const frames = [];
  const seen = new Set();
  const lines = String(input || '').split('\n');

  lines.forEach((line, lineIndex) => {
    const pythonMatch = line.match(/File\s+["']([^"']+)["'],\s+line\s+(\d+)(?:,\s+in\s+([A-Za-z_][\w.]*))?/);
    if (pythonMatch) {
      const frame = {
        raw: line.trim(),
        fileReference: pythonMatch[1],
        functionName: pythonMatch[3] || '',
        line: Number(pythonMatch[2]),
        column: null,
        sourceLine: lineIndex + 1,
      };
      const key = `${frame.fileReference}:${frame.line}:${frame.functionName}:${lineIndex}`;
      seen.add(key);
      frames.push(frame);
      return;
    }

    FILE_REFERENCE_PATTERN.lastIndex = 0;
    let match;
    while ((match = FILE_REFERENCE_PATTERN.exec(line)) !== null) {
      const frame = {
        raw: line.trim(),
        fileReference: match[1],
        functionName: parseFunctionName(line),
        line: match[2] ? Number(match[2]) : null,
        column: match[3] ? Number(match[3]) : null,
        sourceLine: lineIndex + 1,
      };
      const key = `${frame.fileReference}:${frame.line || ''}:${frame.column || ''}:${frame.functionName}:${lineIndex}`;
      if (!seen.has(key)) {
        seen.add(key);
        frames.push(frame);
      }
    }
  });

  return frames;
}

function extractApiRoutes(input) {
  const routes = [];
  const seen = new Set();
  let match;

  API_ROUTE_PATTERN.lastIndex = 0;
  while ((match = API_ROUTE_PATTERN.exec(input)) !== null) {
    const route = {
      method: match[1].toUpperCase(),
      path: match[2],
      raw: match[0],
    };
    const key = `${route.method}:${route.path}`;
    if (!seen.has(key)) {
      seen.add(key);
      routes.push(route);
    }
  }

  LOOSE_API_ROUTE_PATTERN.lastIndex = 0;
  while ((match = LOOSE_API_ROUTE_PATTERN.exec(input)) !== null) {
    const route = {
      method: '',
      path: match[1],
      raw: match[1],
    };
    const key = `:${route.path}`;
    if (!seen.has(key)) {
      seen.add(key);
      routes.push(route);
    }
  }

  return routes.slice(0, 8);
}

function extractUrls(input) {
  const urls = [];
  URL_PATTERN.lastIndex = 0;
  let match;
  while ((match = URL_PATTERN.exec(input)) !== null) {
    urls.push(match[0]);
  }
  return unique(urls).slice(0, 8);
}

function extractHttpStatuses(input) {
  const statuses = [];
  HTTP_STATUS_PATTERN.lastIndex = 0;
  let match;
  while ((match = HTTP_STATUS_PATTERN.exec(input)) !== null) {
    statuses.push(match[1]);
  }
  return unique(statuses).slice(0, 6);
}

function getCodeAnalysisFileMap(codeAnalysis) {
  return new Map(
    safeArray(codeAnalysis?.files)
      .map(file => [getPath(file), file])
      .filter(([path]) => Boolean(path))
  );
}

function definitionMatchesFunction(fileMeta, functionName) {
  if (!functionName) return false;
  const search = functionName.split('.').pop()?.toLowerCase();
  if (!search) return false;
  const defs = [
    ...safeArray(fileMeta?.definitions?.functions),
    ...safeArray(fileMeta?.definitions?.classes),
    ...safeArray(fileMeta?.definitions?.exports),
  ];
  return defs.some(item => String(item?.name || '').toLowerCase() === search);
}

function buildMatchedFiles(frames, repoFiles, codeAnalysis) {
  const matchReference = buildFileMatcher(repoFiles);
  const codeFiles = getCodeAnalysisFileMap(codeAnalysis);
  const matchedByPath = new Map();
  const unmatchedReferences = [];

  frames.forEach((frame, index) => {
    const match = matchReference(frame.fileReference);
    if (!match) {
      unmatchedReferences.push({
        reference: frame.fileReference,
        normalized: normalizeReferencePath(frame.fileReference),
        line: frame.line,
        functionName: frame.functionName,
        reason: 'No repository file matched this stack reference.',
      });
      return;
    }

    const existing = matchedByPath.get(match.path) || {
      path: match.path,
      filename: getFilename(match.path),
      directory: getDirectory(match.path),
      module: getTopLevelModule(match.path),
      matchType: match.matchType,
      confidence: match.confidence,
      score: 0,
      references: [],
      reasons: [],
      alternatives: [],
      hasCodeAnalysis: codeFiles.has(match.path),
      hasFunctionMatch: false,
      functionMatches: [],
    };

    const codeMeta = codeFiles.get(match.path);
    const functionMatched = definitionMatchesFunction(codeMeta, frame.functionName);
    const score = (
      (match.confidence === 'high' ? 36 : match.confidence === 'medium' ? 24 : 12) +
      (frame.line ? 16 : 0) +
      (index === 0 ? 18 : Math.max(2, 12 - index * 2)) +
      (functionMatched ? 14 : 0) +
      (codeMeta ? 8 : 0)
    );

    existing.score += score;
    existing.references.push({
      raw: frame.raw,
      line: frame.line,
      column: frame.column,
      functionName: frame.functionName,
      stackPosition: index + 1,
    });
    existing.hasFunctionMatch = existing.hasFunctionMatch || functionMatched;
    if (functionMatched && frame.functionName) {
      existing.functionMatches = unique([...(existing.functionMatches || []), frame.functionName]).slice(0, 5);
    }
    existing.reasons.push(
      `${match.matchType.replace(/-/g, ' ')} match for "${frame.fileReference}"`,
      frame.line ? `Stack trace points to line ${frame.line}` : '',
      frame.functionName ? `Stack frame mentions ${frame.functionName}` : '',
      functionMatched ? 'Function name appears in code analysis metadata' : '',
      codeMeta ? 'File is present in code analysis metadata' : ''
    );
    existing.alternatives = unique([...(existing.alternatives || []), ...(match.alternatives || [])]).slice(0, 5);
    matchedByPath.set(match.path, existing);
  });

  const matchedFiles = Array.from(matchedByPath.values())
    .map(file => ({
      ...file,
      score: Math.min(100, Math.round(file.score)),
      confidence: file.score >= 70 ? 'high' : file.score >= 38 ? 'medium' : file.confidence,
      reasons: unique(file.reasons).slice(0, 5),
    }))
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  return { matchedFiles, unmatchedReferences };
}

function buildRelatedRepoFiles(matchedFiles, repoFiles) {
  const related = new Map();

  matchedFiles.slice(0, 4).forEach(file => {
    const directory = getDirectory(file.path);
    const module = getTopLevelModule(file.path);

    repoFiles.forEach(path => {
      if (path === file.path || related.has(path)) return;
      const sameDirectory = directory !== 'root' && getDirectory(path) === directory;
      const sameModule = module !== 'root' && getTopLevelModule(path) === module;
      if (!sameDirectory && !sameModule) return;
      related.set(path, {
        path,
        filename: getFilename(path),
        directory: getDirectory(path),
        reason: sameDirectory
          ? `Same directory as ${file.filename}`
          : `Same top-level module as ${file.filename}`,
      });
    });
  });

  return Array.from(related.values()).slice(0, 10);
}

function getGraphPath(value) {
  if (!value) return '';
  if (typeof value === 'object') {
    return getPath(value.path || String(value.id || '').replace(/^file:/, ''));
  }
  return normalizeReferencePath(String(value).replace(/^file:/, ''));
}

function addUniqueMapEdge(map, source, target) {
  if (!source || !target || source === target) return;
  if (!map.has(source)) map.set(source, []);
  const list = map.get(source);
  if (!list.includes(target)) list.push(target);
}

function buildDependencyIndexes(dependencyGraph) {
  const graphFiles = new Set();
  const importsByPath = new Map();
  const dependentsByPath = new Map();
  const edgeMeta = new Map();

  safeArray(dependencyGraph?.nodes).forEach(node => {
    const path = getGraphPath(node);
    if (path) graphFiles.add(path);
  });

  Object.entries(dependencyGraph?.importsMap || {}).forEach(([sourceFile, targets]) => {
    const source = getGraphPath(sourceFile);
    if (!source) return;
    graphFiles.add(source);
    safeArray(targets).forEach(targetFile => {
      const target = getGraphPath(targetFile);
      if (!target) return;
      graphFiles.add(target);
      addUniqueMapEdge(importsByPath, source, target);
      addUniqueMapEdge(dependentsByPath, target, source);
      edgeMeta.set(`${source}->${target}`, { relationship: 'imports' });
    });
  });

  Object.entries(dependencyGraph?.dependentsMap || {}).forEach(([targetFile, dependents]) => {
    const target = getGraphPath(targetFile);
    if (!target) return;
    graphFiles.add(target);
    safeArray(dependents).forEach(sourceFile => {
      const source = getGraphPath(sourceFile);
      if (!source) return;
      graphFiles.add(source);
      addUniqueMapEdge(importsByPath, source, target);
      addUniqueMapEdge(dependentsByPath, target, source);
      edgeMeta.set(`${source}->${target}`, { relationship: 'imports' });
    });
  });

  safeArray(dependencyGraph?.edges).forEach(edge => {
    const source = getGraphPath(edge?.source);
    const target = getGraphPath(edge?.target);
    if (!source || !target) return;
    graphFiles.add(source);
    graphFiles.add(target);
    addUniqueMapEdge(importsByPath, source, target);
    addUniqueMapEdge(dependentsByPath, target, source);
    edgeMeta.set(`${source}->${target}`, {
      relationship: edge?.relationship || 'imports',
      importType: edge?.importType || '',
      strength: edge?.strength || edge?.weight || null,
    });
  });

  return { graphFiles, importsByPath, dependentsByPath, edgeMeta };
}

function createDependencyTraceFallback(reason, dependencyGraph = null) {
  return {
    available: false,
    reason,
    seedFiles: [],
    relatedFiles: [],
    tracePaths: [],
    coverage: {
      graphFiles: safeArray(dependencyGraph?.nodes).length,
      graphEdges: safeArray(dependencyGraph?.edges).length,
      graphBackedSeeds: 0,
      maxDepth: TRACE_MAX_DEPTH,
      maxRelatedFiles: TRACE_MAX_RELATED_FILES,
    },
    isLimited: false,
  };
}

function buildTraceFileRecord(path, overrides = {}) {
  return {
    path,
    filename: getFilename(path),
    directory: getDirectory(path),
    module: getTopLevelModule(path),
    reason: overrides.reason || '',
    reasons: unique(overrides.reasons || [overrides.reason]),
    direction: overrides.direction || 'related',
    relationship: overrides.relationship || '',
    depth: overrides.depth ?? null,
    sourcePath: overrides.sourcePath || '',
    confidence: overrides.confidence || 'medium',
    graphBacked: Boolean(overrides.graphBacked),
  };
}

function sortTraceFiles(files) {
  return [...files].sort((a, b) => (
    (a.depth ?? 99) - (b.depth ?? 99) ||
    a.path.localeCompare(b.path)
  ));
}

function selectBalancedTraceFiles(files) {
  const selected = [];
  const selectedPaths = new Set();
  const take = (items, count) => {
    sortTraceFiles(items).slice(0, count).forEach(item => {
      if (selected.length >= TRACE_MAX_RELATED_FILES || selectedPaths.has(item.path)) return;
      selected.push(item);
      selectedPaths.add(item.path);
    });
  };

  take(files.filter(file => file.direction === 'upstream'), 10);
  take(files.filter(file => file.direction === 'downstream'), 10);
  take(files.filter(file => file.direction === 'same-module'), 5);
  take(files.filter(file => !selectedPaths.has(file.path)), TRACE_MAX_RELATED_FILES);

  return selected;
}

function buildDependencyTraceContext(matchedFiles, repoFiles, dependencyGraph) {
  if (!dependencyGraph || typeof dependencyGraph !== 'object') {
    return createDependencyTraceFallback('Dependency graph unavailable.', dependencyGraph);
  }

  const indexes = buildDependencyIndexes(dependencyGraph);
  const hasGraph = indexes.graphFiles.size > 0 || indexes.importsByPath.size > 0 || indexes.dependentsByPath.size > 0;
  if (!hasGraph) {
    return createDependencyTraceFallback('Dependency graph unavailable.', dependencyGraph);
  }

  const seedPaths = unique(safeArray(matchedFiles).map(file => file.path));
  const seedSet = new Set(seedPaths);
  const seedFiles = seedPaths.map(path => buildTraceFileRecord(path, {
    reason: 'mentioned in stack',
    direction: 'mentioned',
    relationship: 'stack frame',
    depth: 0,
    confidence: indexes.graphFiles.has(path) ? 'high' : 'medium',
    graphBacked: indexes.graphFiles.has(path),
  }));

  const related = new Map();
  const tracePaths = [];
  let isLimited = false;

  const addRelated = (path, details) => {
    if (!path || seedSet.has(path)) return;
    const existing = related.get(path);
    const existingDepth = existing?.depth;
    const newDepth = details.depth;
    const isMoreDirect = typeof newDepth === 'number' &&
      (typeof existingDepth !== 'number' || newDepth < existingDepth);
    const reasons = isMoreDirect
      ? unique([details.reason, ...(existing?.reasons || [])])
      : unique([...(existing?.reasons || []), details.reason]);
    const mergedDepth = existing?.depth !== null && existing?.depth !== undefined
      ? (details.depth !== null && details.depth !== undefined ? Math.min(existing.depth, details.depth) : existing.depth)
      : details.depth;
    const isDirectGraphNeighbor = typeof details.depth === 'number' && details.depth <= 1;
    const confidence = existing?.confidence === 'high' || isDirectGraphNeighbor
      ? 'high'
      : existing?.confidence || details.confidence || 'medium';
    const record = buildTraceFileRecord(path, {
      ...details,
      reasons,
      reason: reasons.join(' · '),
      direction: existing?.direction || details.direction,
      relationship: existing?.relationship || details.relationship,
      depth: mergedDepth,
      confidence,
      graphBacked: existing?.graphBacked || indexes.graphFiles.has(path),
    });
    related.set(path, record);
  };

  const addTracePath = (from, to, direction, depth, reason) => {
    if (!from || !to || tracePaths.length >= TRACE_MAX_RELATED_FILES * 2) return;
    const meta = indexes.edgeMeta.get(`${from}->${to}`) || indexes.edgeMeta.get(`${to}->${from}`) || {};
    tracePaths.push({
      from,
      to,
      direction,
      depth,
      reason,
      relationship: meta.importType || meta.relationship || 'imports',
      strength: meta.strength || null,
    });
  };

  const traverse = (seedPath, direction) => {
    const isUpstream = direction === 'upstream';
    const getNeighbors = path => (
      isUpstream
        ? safeArray(indexes.importsByPath.get(path))
        : safeArray(indexes.dependentsByPath.get(path))
    );
    const visited = new Set([seedPath]);
    const queue = [{ path: seedPath, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || current.depth >= TRACE_MAX_DEPTH) continue;

      const neighbors = getNeighbors(current.path);
      for (const neighborPath of neighbors) {
        if (!neighborPath || neighborPath === current.path) continue;
        const nextDepth = current.depth + 1;
        const directReason = isUpstream ? 'imported by mentioned file' : 'imports mentioned file';
        const transitiveReason = isUpstream ? 'probable upstream' : 'probable downstream';
        const reason = nextDepth === 1 ? directReason : transitiveReason;
        const relationship = isUpstream
          ? (nextDepth === 1 ? 'mentioned file imports this file' : 'transitive dependency')
          : (nextDepth === 1 ? 'this file imports a mentioned file' : 'transitive dependent');

        addTracePath(current.path, neighborPath, direction, nextDepth, reason);

        if (!seedSet.has(neighborPath)) {
          if (related.size >= TRACE_COLLECTION_LIMIT && !related.has(neighborPath)) {
            isLimited = true;
            continue;
          }
          addRelated(neighborPath, {
            reason,
            direction,
            relationship,
            depth: nextDepth,
            sourcePath: seedPath,
            confidence: nextDepth === 1 ? 'high' : 'medium',
          });
        }

        if (!visited.has(neighborPath) && nextDepth < TRACE_MAX_DEPTH) {
          visited.add(neighborPath);
          queue.push({ path: neighborPath, depth: nextDepth });
        }
      }
    }
  };

  seedPaths.forEach(seedPath => {
    traverse(seedPath, 'upstream');
    traverse(seedPath, 'downstream');
  });

  const fallbackRelated = buildRelatedRepoFiles(matchedFiles, repoFiles);
  fallbackRelated.forEach(file => {
    if (related.size >= TRACE_COLLECTION_LIMIT && !related.has(file.path)) {
      isLimited = true;
      return;
    }
    addRelated(file.path, {
      reason: 'same module',
      direction: 'same-module',
      relationship: file.reason,
      depth: null,
      sourcePath: '',
      confidence: 'low',
    });
  });

  return {
    available: true,
    reason: seedFiles.length > 0
      ? 'Dependency graph context was built from matched stack files.'
      : 'Match stack frames to repository files to build dependency context.',
    seedFiles,
    relatedFiles: selectBalancedTraceFiles(Array.from(related.values())),
    tracePaths,
    coverage: {
      graphFiles: indexes.graphFiles.size || safeArray(dependencyGraph?.nodes).length,
      graphEdges: safeArray(dependencyGraph?.edges).length,
      graphBackedSeeds: seedFiles.filter(file => file.graphBacked).length,
      maxDepth: TRACE_MAX_DEPTH,
      maxRelatedFiles: TRACE_MAX_RELATED_FILES,
    },
    isLimited: isLimited || related.size > TRACE_MAX_RELATED_FILES,
  };
}

function getScriptEntries(repoData) {
  return Object.entries(repoData?.packageJson?.scripts || {})
    .map(([name, command]) => ({ name, command }));
}

function buildValidationChecklist(repoData, errorSummary, matchedFiles) {
  const scripts = getScriptEntries(repoData);
  const priority = ['test', 'lint', 'build', 'typecheck', 'check'];
  const orderedScripts = [...scripts].sort((a, b) => {
    const aIndex = priority.findIndex(item => a.name.toLowerCase().includes(item));
    const bIndex = priority.findIndex(item => b.name.toLowerCase().includes(item));
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex) || a.name.localeCompare(b.name);
  });

  const checklist = orderedScripts.slice(0, 4).map(script => ({
    type: 'script',
    label: `Run npm script: ${script.name}`,
    command: `npm run ${script.name}`,
    detail: script.command,
  }));

  if (matchedFiles.length > 0) {
    checklist.push({
      type: 'inspect',
      label: 'Inspect matched stack frame locations',
      command: '',
      detail: matchedFiles.slice(0, 3).map(file => file.path).join(', '),
    });
  }

  if (/typeerror|referenceerror|undefined|null/i.test(`${errorSummary.type} ${errorSummary.message}`)) {
    checklist.push({
      type: 'manual',
      label: 'Check nullable data and default values',
      command: '',
      detail: 'Confirm the failing value exists before map/property access and add a safe guard only where behavior requires it.',
    });
  }

  if (checklist.length === 0) {
    checklist.push({
      type: 'manual',
      label: 'Identify repository-specific validation command',
      command: '',
      detail: 'No package.json scripts were available in the repository analysis payload.',
    });
  }

  return checklist.slice(0, 6);
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function addEvidence(evidence, label, detail, weight) {
  if (!label || !detail) return 0;
  evidence.push({ label, detail, weight });
  return weight || 0;
}

function getPrimaryReference(file) {
  return safeArray(file?.references)
    .filter(Boolean)
    .sort((a, b) => (a.stackPosition || 99) - (b.stackPosition || 99))[0] || null;
}

function getMatchWeight(matchType) {
  const value = String(matchType || '').toLowerCase();
  if (value === 'exact' || value === 'normalized') return 25;
  if (value === 'suffix') return 14;
  if (value === 'basename') return 10;
  if (value.includes('ambiguous')) return -8;
  return 0;
}

function getFileSignals(path) {
  const value = String(path || '').toLowerCase();
  const filename = getFilename(value);
  return {
    api: /(^|\/)(api|routes?|controllers?|handlers?|endpoints?)(\/|$)|api_|_api|route/.test(value),
    auth: /auth|oauth|login|logout|session|token|jwt|permission|middleware/.test(value),
    database: /database|db|sql|sqlite|postgres|mysql|model|schema|storage|cache|persist/.test(value),
    config: /config|settings|\.env|env\.|environment|secrets?|credential|\.ya?ml$|\.toml$|\.ini$|\.json$/.test(value),
    env: /(^|\/)\.env|env\.|environment|secrets?|credential/.test(value),
    packageFile: /package\.json|package-lock\.json|pnpm-lock|yarn\.lock|requirements\.txt|pyproject\.toml|poetry\.lock|pom\.xml|build\.gradle|go\.mod/.test(filename),
    build: /webpack|vite|babel|tsconfig|dockerfile|docker-compose|makefile|ci|workflow|build|gradle|pom\.xml/.test(value),
    frontend: /jsx|tsx|react|component|frontend|ui|view|page|static|client/.test(value),
    security: /security|secret|credential|csrf|jwt|token|auth|oauth|permission/.test(value),
    route: /route|router|navigation|endpoint|url/.test(value),
    test: /(^|\/)(tests?|spec|__tests__)(\/|$)|\.test\.|\.spec\./.test(value),
  };
}

function getErrorText(errorSummary) {
  return `${errorSummary?.type || ''} ${errorSummary?.message || ''} ${errorSummary?.rawFirstLine || ''}`.toLowerCase();
}

function inferHypothesis(errorSummary, file, signals) {
  const text = getErrorText(errorSummary);
  const matched = regex => regex.test(text);

  if (matched(/undefined|null|none|nullreference|nonetype|cannot read|cannot access|property .* undefined|map.*undefined|attributeerror|keyerror/)) {
    return {
      type: 'null-undefined-access',
      label: 'Null/undefined access',
      confidence: 'high',
      rationale: 'Error text points to a missing value or unsafe property access.',
    };
  }

  if (matched(/not configured|environment|env\b|api key|token not configured|missing.*config|credential|secret|configuration/)) {
    return {
      type: 'config-env',
      label: 'Config or environment issue',
      confidence: signals.config || signals.env || signals.api || signals.security ? 'high' : 'medium',
      rationale: 'Error text points to missing runtime configuration, credentials, or environment setup.',
    };
  }

  if (matched(/module not found|cannot find module|no module named|importerror|export .* not found|missing export|module resolution/)) {
    return {
      type: 'import-export',
      label: 'Missing import/export or module resolution',
      confidence: signals.packageFile || signals.build ? 'high' : 'medium',
      rationale: 'Error text points to import, export, or local module resolution failure.',
    };
  }

  if (matched(/database|sqlite|sql|db\b|connection failed|connection refused|persist|migration|schema|storage/)) {
    return {
      type: 'database-persistence',
      label: 'Database or persistence issue',
      confidence: signals.database ? 'high' : 'medium',
      rationale: 'Error text or file path points to database access, connection, schema, or persistence behavior.',
    };
  }

  if (matched(/401|403|unauthorized|forbidden|auth|oauth|session|login|permission|jwt|invalid token|token payload/)) {
    return {
      type: 'auth-session',
      label: 'Authentication or session issue',
      confidence: signals.auth || signals.security ? 'high' : 'medium',
      rationale: 'Error text points to authentication, authorization, token, or session handling.',
    };
  }

  if (matched(/404|not found|route|router|navigation|redirect|endpoint|url/)) {
    return {
      type: 'routing-navigation',
      label: 'Routing or navigation issue',
      confidence: signals.route || signals.api ? 'high' : 'medium',
      rationale: 'Error text points to route registration, navigation, or endpoint lookup.',
    };
  }

  if (matched(/500|502|503|504|fetch|network|request|response|timeout|http|api|json|payload|body|schema|validation|invalid.*response/)) {
    return {
      type: matched(/json|payload|body|schema|validation|invalid.*response/) ? 'response-validation' : 'async-api-network',
      label: matched(/json|payload|body|schema|validation|invalid.*response/)
        ? 'Missing API response validation'
        : 'Async, network, or API failure',
      confidence: signals.api ? 'high' : 'medium',
      rationale: 'Error text points to request handling, response shape, status handling, or async failure.',
    };
  }

  if (matched(/syntaxerror|compile|build failed|dependency|package|version|lockfile|webpack|vite|babel|typescript|typecheck/)) {
    return {
      type: 'build-package',
      label: 'Build, package, or module setup issue',
      confidence: signals.packageFile || signals.build ? 'high' : 'medium',
      rationale: 'Error text points to build tooling, dependency versions, or package setup.',
    };
  }

  if (signals.database) {
    return {
      type: 'database-persistence',
      label: 'Database or persistence issue',
      confidence: 'low',
      rationale: 'The matched file is in a database-related path, but the error text is not specific.',
    };
  }

  if (signals.auth || signals.security) {
    return {
      type: 'auth-session',
      label: 'Authentication or session issue',
      confidence: 'low',
      rationale: 'The matched file is auth/security-related, but the error text is not specific.',
    };
  }

  return {
    type: 'general-stack-frame',
    label: 'General stack-frame failure',
    confidence: 'low',
    rationale: `The parser matched ${file?.path || 'a repository file'}, but the error text does not identify a specific failure family.`,
  };
}

function buildTraceRoleMap(dependencyTrace) {
  const roleMap = new Map();

  safeArray(dependencyTrace?.seedFiles).forEach(file => {
    if (file?.path) roleMap.set(file.path, file);
  });
  safeArray(dependencyTrace?.relatedFiles).forEach(file => {
    if (file?.path && !roleMap.has(file.path)) roleMap.set(file.path, file);
  });

  return roleMap;
}

function getDependencyRoleWeight(traceRole) {
  if (!traceRole) return 0;
  if (traceRole.direction === 'mentioned') return 18;
  if (traceRole.direction === 'same-module') return 2;
  if (traceRole.depth === 1) return 10;
  if (traceRole.depth === 2) return 4;
  return 0;
}

function addContextualSignalEvidence(evidence, hypothesis, signals, file, errorText) {
  let score = 0;
  const add = (label, detail, weight) => {
    score += addEvidence(evidence, label, detail, weight);
  };

  if (file.module && file.module !== 'root') {
    add('Repository layer', `File is in the ${file.module}/ area`, 4);
  }

  if (hypothesis.type === 'database-persistence' && signals.database) {
    add('File type signal', 'Path is database, model, schema, storage, or persistence related', 14);
  }
  if (hypothesis.type === 'auth-session' && (signals.auth || signals.security)) {
    add('File type signal', 'Path is authentication, token, session, or security related', 14);
  }
  if ((hypothesis.type === 'async-api-network' || hypothesis.type === 'response-validation') && signals.api) {
    add('File type signal', 'Path is API, route, handler, or endpoint related', 12);
  }
  if (hypothesis.type === 'routing-navigation' && (signals.route || signals.api)) {
    add('File type signal', 'Path is route, router, navigation, or endpoint related', 12);
  }
  if (hypothesis.type === 'config-env' && (signals.config || signals.env)) {
    add('Config signal', 'Path is configuration, environment, credential, or settings related', 14);
  }
  if (hypothesis.type === 'config-env' && signals.api) {
    add('API boundary signal', 'Runtime configuration issue is surfaced from an API/server path', 6);
  }
  if ((hypothesis.type === 'import-export' || hypothesis.type === 'build-package') && (signals.packageFile || signals.build)) {
    add('Build/package signal', 'Path is package, dependency, build, or workflow related', 14);
  }
  if (/security|secret|credential|token|auth|permission|csrf|jwt/.test(errorText) && signals.security) {
    add('Risky module signal', 'Error text and path both reference security-sensitive behavior', 12);
  }
  if (hypothesis.type === 'null-undefined-access' && (signals.frontend || signals.api)) {
    add('Access boundary signal', 'Path is a UI/API boundary where missing response data often surfaces', 6);
  }

  return score;
}

function selectValidationScripts(repoData, hypothesisType) {
  const scripts = getScriptEntries(repoData);
  const priorityByType = {
    'null-undefined-access': ['test', 'typecheck', 'lint', 'build', 'check'],
    'response-validation': ['test', 'build', 'lint', 'typecheck', 'check'],
    'config-env': ['build', 'test', 'lint', 'check'],
    'async-api-network': ['test', 'build', 'lint', 'check'],
    'auth-session': ['test', 'lint', 'build', 'check'],
    'database-persistence': ['test', 'build', 'lint', 'check'],
    'routing-navigation': ['test', 'build', 'lint', 'check'],
    'import-export': ['build', 'test', 'typecheck', 'lint', 'check'],
    'build-package': ['build', 'test', 'lint', 'check'],
  };
  const priority = priorityByType[hypothesisType] || ['test', 'lint', 'build', 'typecheck', 'check'];

  return [...scripts]
    .sort((a, b) => {
      const aIndex = priority.findIndex(item => a.name.toLowerCase().includes(item));
      const bIndex = priority.findIndex(item => b.name.toLowerCase().includes(item));
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex) || a.name.localeCompare(b.name);
    })
    .slice(0, 2);
}

function buildCandidateValidationChecks(repoData, hypothesis, file) {
  const checks = selectValidationScripts(repoData, hypothesis.type).map(script => ({
    label: `Run npm script: ${script.name}`,
    command: `npm run ${script.name}`,
    detail: script.command,
  }));

  const manualByType = {
    'null-undefined-access': 'Reproduce the stack path and verify the value is present before property/map access.',
    'response-validation': 'Exercise the failing API response shape and verify empty/error payload handling.',
    'config-env': 'Verify the required local/server environment value is present without printing secret contents.',
    'async-api-network': 'Replay the failing request and confirm status, timeout, and response parsing behavior.',
    'auth-session': 'Test the failing auth/session path with valid, missing, and expired credentials.',
    'database-persistence': 'Run the failing database path and confirm connection, schema, and persistence assumptions.',
    'routing-navigation': 'Open the route or endpoint directly and confirm the registered handler is reached.',
    'import-export': 'Import the module from the closest entrypoint and confirm the symbol resolves.',
    'build-package': 'Run the build or install path that exercises the dependency/config file.',
  };

  checks.push({
    label: 'Reproduce original error',
    command: '',
    detail: manualByType[hypothesis.type] || `Re-run the failing flow after inspecting ${file.path}.`,
  });

  return checks.slice(0, 4);
}

function buildInspectionSteps(file, hypothesis, traceRole) {
  const reference = getPrimaryReference(file);
  const steps = [
    reference?.line
      ? `Open ${file.path} at line ${reference.line}${reference.column ? `:${reference.column}` : ''}.`
      : `Open ${file.path} and inspect the matched repository location.`,
  ];

  if (reference?.functionName) {
    steps.push(`Inspect ${reference.functionName} and its immediate inputs/return value.`);
  }

  const typeSteps = {
    'null-undefined-access': 'Trace the value used at the failing access and confirm where it can become missing.',
    'response-validation': 'Inspect request/response parsing and add validation at the boundary that receives external data.',
    'config-env': 'Follow the config lookup path and confirm required variables are loaded before the handler runs.',
    'async-api-network': 'Trace the async request path, status handling, timeout behavior, and error propagation.',
    'auth-session': 'Check token/session parsing, middleware ordering, and unauthorized/expired-token branches.',
    'database-persistence': 'Check connection setup, query inputs, schema assumptions, and error handling around persistence.',
    'routing-navigation': 'Verify the route is registered and that callers use the same method/path signature.',
    'import-export': 'Compare the imported symbol/name with the module export and local file resolution.',
    'build-package': 'Check package/build config, dependency version, and generated/runtime path assumptions.',
  };

  if (typeSteps[hypothesis.type]) steps.push(typeSteps[hypothesis.type]);
  if (traceRole?.sourcePath && traceRole.sourcePath !== file.path) {
    steps.push(`Compare this file with dependency seed ${traceRole.sourcePath}.`);
  }

  return unique(steps).slice(0, 4);
}

function buildSafeFixHints(hypothesis) {
  const hintsByType = {
    'null-undefined-access': [
      'Add a narrow guard or default value at the data boundary, not a broad catch-all.',
      'Preserve existing behavior for valid values and add a focused regression test.',
    ],
    'response-validation': [
      'Validate response shape before consuming nested fields or arrays.',
      'Return a clear error/empty state for malformed payloads instead of throwing downstream.',
    ],
    'config-env': [
      'Fail early with a clear missing-config message while keeping secret values hidden.',
      'Keep local env setup out of commits and document only variable names.',
    ],
    'async-api-network': [
      'Handle non-2xx responses, timeouts, and parse errors at the request boundary.',
      'Keep retry/fallback behavior bounded so failures remain visible.',
    ],
    'auth-session': [
      'Handle missing, invalid, and expired credentials explicitly.',
      'Avoid widening auth bypass logic while fixing the failing path.',
    ],
    'database-persistence': [
      'Validate connection/config before queries and keep database errors actionable.',
      'Add a focused test around the query or connection path that failed.',
    ],
    'routing-navigation': [
      'Align caller method/path with the registered route and preserve existing route aliases.',
      'Add a smoke check for the endpoint or navigation path.',
    ],
    'import-export': [
      'Fix the import/export name or local module path closest to the failing frame.',
      'Avoid broad path alias changes unless the failure proves the alias is wrong.',
    ],
    'build-package': [
      'Update only the package/build config involved in the failure.',
      'Run build after the fix to catch dependency or bundler regressions.',
    ],
  };

  return hintsByType[hypothesis.type] || [
    'Make the smallest local fix around the matched frame.',
    'Re-run the failing flow before broad refactors.',
  ];
}

function buildMissingContext(file, hypothesis, traceRole) {
  const reference = getPrimaryReference(file);
  const missing = [];

  if (!reference?.line) missing.push('No line number was available for this candidate.');
  if (!reference?.functionName) missing.push('No function name was extracted for this stack frame.');
  if (reference?.functionName && !file.hasFunctionMatch) {
    missing.push('Code analysis did not confirm the stack function/class name.');
  }
  if (!file.hasCodeAnalysis) missing.push('Code analysis metadata was unavailable for this file.');
  if (!traceRole) missing.push('Dependency graph role was unavailable for this candidate.');
  if (hypothesis.type === 'general-stack-frame') {
    missing.push('Error text did not match a specific deterministic failure family.');
  }

  return unique(missing).slice(0, 4);
}

function buildDirectDependencyCandidates(dependencyTrace, matchedFiles, codeAnalysis) {
  const matchedPaths = new Set(safeArray(matchedFiles).map(file => file.path));
  const codeFiles = getCodeAnalysisFileMap(codeAnalysis);

  return safeArray(dependencyTrace?.relatedFiles)
    .filter(file => (
      file?.path &&
      !matchedPaths.has(file.path) &&
      file.graphBacked &&
      file.depth === 1 &&
      file.confidence === 'high' &&
      (file.direction === 'upstream' || file.direction === 'downstream')
    ))
    .slice(0, 5)
    .map(file => ({
      path: file.path,
      filename: file.filename || getFilename(file.path),
      directory: file.directory || getDirectory(file.path),
      module: file.module || getTopLevelModule(file.path),
      matchType: 'dependency-neighbor',
      confidence: file.confidence,
      score: 0,
      references: [],
      reasons: safeArray(file.reasons).length > 0 ? file.reasons : [file.reason || file.relationship],
      alternatives: [],
      hasCodeAnalysis: codeFiles.has(file.path),
      hasFunctionMatch: false,
      functionMatches: [],
      dependencyOnly: true,
    }));
}

function scoreRootCauseCandidate(file, index, context) {
  const { errorSummary, repoData } = context;
  const errorText = getErrorText(errorSummary);
  const signals = getFileSignals(file.path);
  const hypothesis = inferHypothesis(errorSummary, file, signals);
  const traceRole = context.traceRoleMap.get(file.path);
  const evidence = [];
  let score = 0;

  const matchWeight = getMatchWeight(file.matchType);
  if (matchWeight !== 0) {
    score += addEvidence(
      evidence,
      'Path match',
      `${String(file.matchType).replace(/-/g, ' ')} repository match`,
      matchWeight
    );
  }

  const reference = getPrimaryReference(file);
  if (reference) {
    const stackWeight = Math.max(4, 24 - ((reference.stackPosition || 1) - 1) * 4);
    score += addEvidence(evidence, 'Stack order', `Frame ${reference.stackPosition || 1} in the pasted trace`, stackWeight);
    if (reference.line) score += addEvidence(evidence, 'Line number', `Stack trace points to line ${reference.line}`, 12);
    if (reference.column) score += addEvidence(evidence, 'Column number', `Stack trace points to column ${reference.column}`, 4);
  }

  if (file.hasFunctionMatch) {
    score += addEvidence(
      evidence,
      'Code analysis match',
      `${safeArray(file.functionMatches)[0] || 'Stack function'} appears in code analysis metadata`,
      16
    );
  }

  if (file.hasCodeAnalysis) {
    score += addEvidence(evidence, 'Code analysis file', 'File is present in analyzed code metadata', 6);
  }

  const roleWeight = getDependencyRoleWeight(traceRole);
  if (roleWeight) {
    score += addEvidence(
      evidence,
      'Dependency role',
      traceRole.direction === 'mentioned'
        ? 'File is mentioned directly in the stack trace'
        : `${traceRole.direction || 'related'} dependency context${traceRole.depth ? ` at depth ${traceRole.depth}` : ''}`,
      roleWeight
    );
  }

  score += addEvidence(evidence, 'Error pattern', hypothesis.rationale, hypothesis.type === 'general-stack-frame' ? 0 : 8);
  score += addContextualSignalEvidence(evidence, hypothesis, signals, file, errorText);

  if (file.dependencyOnly) {
    score = Math.min(score, 62);
  }

  const finalScore = clampScore(score - index * 3);
  const confidence = finalScore >= 75 ? 'high' : finalScore >= 45 ? 'medium' : 'low';
  const hypothesisWithConfidence = {
    ...hypothesis,
    confidence: hypothesis.confidence === 'high' && confidence !== 'low'
      ? 'high'
      : confidence,
  };

  return {
    path: file.path,
    confidence,
    score: finalScore,
    title: index === 0 ? 'Inspect first' : (file.dependencyOnly ? 'Dependency candidate' : 'Related candidate'),
    candidateType: file.dependencyOnly ? 'dependency' : 'stack',
    reason: unique([
      hypothesis.label,
      evidence[0]?.detail,
      evidence[1]?.detail,
      evidence[2]?.detail,
    ]).join(' · '),
    hypothesis: hypothesisWithConfidence,
    evidence: evidence
      .filter(item => item.weight !== 0)
      .sort((a, b) => Math.abs(b.weight || 0) - Math.abs(a.weight || 0))
      .slice(0, 6),
    inspectionSteps: buildInspectionSteps(file, hypothesisWithConfidence, traceRole),
    safeFixHints: buildSafeFixHints(hypothesisWithConfidence).slice(0, 3),
    validationChecks: buildCandidateValidationChecks(repoData, hypothesisWithConfidence, file),
    missingContext: buildMissingContext(file, hypothesisWithConfidence, traceRole),
  };
}

function buildRootCauseCandidates(matchedFiles, errorSummary, dependencyTrace, repoData, codeAnalysis, input) {
  if (matchedFiles.length === 0) return [];

  const dependencyCandidates = buildDirectDependencyCandidates(dependencyTrace, matchedFiles, codeAnalysis);
  const candidatePool = [...matchedFiles, ...dependencyCandidates].slice(0, 10);
  const traceRoleMap = buildTraceRoleMap(dependencyTrace);

  return candidatePool
    .map((file, index) => scoreRootCauseCandidate(file, index, {
      errorSummary,
      input,
      dependencyTrace,
      repoData,
      traceRoleMap,
    }))
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, 5)
    .map((candidate, index) => ({
      ...candidate,
      title: index === 0
        ? 'Inspect first'
        : (candidate.candidateType === 'dependency' ? 'Dependency candidate' : 'Related candidate'),
    }));
}

function getOverallConfidence(matchedFiles, frames, input) {
  if (!String(input || '').trim()) return 'none';
  if (matchedFiles.some(file => file.confidence === 'high')) return 'high';
  if (matchedFiles.length > 0 || frames.length > 0) return 'medium';
  return 'low';
}

export function buildDebugTraceContext({
  errorText = '',
  repoData = null,
  codeAnalysis = null,
} = {}) {
  const input = String(errorText || '');
  const repoFiles = normalizeRepositoryFiles(repoData);
  const warnings = [];

  if (!input.trim()) {
    warnings.push('Paste an error message, stack trace, API failure, or bug description to begin.');
  }
  if (repoFiles.length === 0) {
    warnings.push('Repository file data is unavailable, so file matching cannot run.');
  }

  const errorSummary = parseErrorSummary(input);
  const parsedFrames = parseStackFrames(input);
  const apiRoutes = extractApiRoutes(input);
  const urls = extractUrls(input);
  const httpStatuses = extractHttpStatuses(input);
  const { matchedFiles, unmatchedReferences } = buildMatchedFiles(parsedFrames, repoFiles, codeAnalysis);
  const fallbackRelatedRepoFiles = buildRelatedRepoFiles(matchedFiles, repoFiles);
  const dependencyTrace = buildDependencyTraceContext(matchedFiles, repoFiles, repoData?.dependencyGraph);
  const relatedRepoFiles = dependencyTrace.available && dependencyTrace.relatedFiles.length > 0
    ? dependencyTrace.relatedFiles
    : fallbackRelatedRepoFiles;
  const rootCauseCandidates = buildRootCauseCandidates(
    matchedFiles,
    errorSummary,
    dependencyTrace,
    repoData,
    codeAnalysis,
    input
  );
  const validationChecklist = buildValidationChecklist(repoData, errorSummary, matchedFiles);
  const confidence = getOverallConfidence(matchedFiles, parsedFrames, input);

  if (input.trim() && parsedFrames.length === 0 && apiRoutes.length === 0) {
    warnings.push('No stack frames or API routes were detected. Results are based on the plain error text only.');
  }
  if (parsedFrames.length > 0 && matchedFiles.length === 0) {
    warnings.push('Stack frames were detected, but none matched repository files.');
  }

  return {
    hasInput: Boolean(input.trim()),
    errorSummary,
    parsedFrames,
    apiRoutes,
    urls,
    httpStatuses,
    matchedFiles,
    unmatchedReferences,
    relatedRepoFiles,
    dependencyTrace,
    rootCauseCandidates,
    inspectionOrder: matchedFiles.slice(0, 6).map((file, index) => ({
      step: index + 1,
      path: file.path,
      reason: file.reasons[0] || 'Matched from stack trace context.',
      line: file.references[0]?.line || null,
      functionName: file.references[0]?.functionName || '',
    })),
    validationChecklist,
    confidence,
    warnings: unique(warnings),
    coverage: {
      repositoryFiles: repoFiles.length,
      codeAnalysisFiles: safeArray(codeAnalysis?.files).length || codeAnalysis?.summary?.analyzedFiles || 0,
      parsedFrames: parsedFrames.length,
      matchedFiles: matchedFiles.length,
      unmatchedReferences: unmatchedReferences.length,
    },
  };
}

export default buildDebugTraceContext;
