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

function buildRootCauseCandidates(matchedFiles, errorSummary) {
  if (matchedFiles.length === 0) return [];

  return matchedFiles.slice(0, 5).map((file, index) => ({
    path: file.path,
    confidence: file.confidence,
    score: Math.max(0, Math.min(100, file.score - index * 4)),
    title: index === 0 ? 'Inspect first' : 'Related candidate',
    reason: unique([
      file.references[0]?.line ? `First relevant stack location is line ${file.references[0].line}` : '',
      file.reasons[0],
      /typeerror|undefined|null/i.test(`${errorSummary.type} ${errorSummary.message}`)
        ? 'Error text suggests a missing or unexpected value near this path'
        : '',
    ]).join(' · '),
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
  const rootCauseCandidates = buildRootCauseCandidates(matchedFiles, errorSummary);
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
