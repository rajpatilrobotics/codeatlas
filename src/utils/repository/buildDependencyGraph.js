/**
 * Build Dependency Graph
 * Generates file-to-file dependency graphs from real import/export statements
 * 
 * This module provides the core engine for dependency graph generation.
 * It extracts imports, resolves paths, and builds bidirectional dependency maps.
 * 
 * @module buildDependencyGraph
 */

// Directories to prioritize during file filtering
const PRIORITY_DIRS = ['src', 'app', 'components', 'services', 'api', 'hooks', 'lib', 'utils', 'pages', 'static'];

// Directories to ignore during file filtering
const IGNORE_DIRS = ['node_modules', 'dist', 'build', '.next', 'coverage', '.git', 'vendor', '__pycache__'];

/**
 * Default configuration options for dependency graph generation
 */
const DEFAULT_OPTIONS = {
  maxFiles: 150,
  priorityDirs: PRIORITY_DIRS,
  ignoreDirs: IGNORE_DIRS,
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.py'],
  aliasMap: {
    '@': 'src',
    '~': 'src'
  },
  hubThreshold: 5
};

function normalizeExtensions(extensions = DEFAULT_OPTIONS.extensions) {
  return Array.from(new Set(
    extensions
      .map(ext => String(ext || '').trim().toLowerCase())
      .filter(Boolean)
      .map(ext => ext.startsWith('.') ? ext : `.${ext}`)
  ));
}

function getFileExtension(filePath) {
  const match = String(filePath || '').toLowerCase().match(/\.[^.\/]+$/);
  return match ? match[0] : '';
}

function getFileLanguage(filePath) {
  const ext = getFileExtension(filePath);
  if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) return ext.slice(1);
  if (ext === '.py') return 'python';
  return ext.replace('.', '') || 'unknown';
}

function isIgnoredPath(filePath, ignoreDirs = IGNORE_DIRS) {
  const pathLower = String(filePath || '').toLowerCase();
  return ignoreDirs.some(dir => (
    pathLower.includes(`/${dir.toLowerCase()}/`) ||
    pathLower.startsWith(`${dir.toLowerCase()}/`)
  ));
}

/**
 * Filter files to only include relevant ones for dependency analysis
 * 
 * @param {Array} files - Array of file objects with path and content
 * @param {Object} options - Filtering options
 * @returns {Array} Filtered and scored file list
 */
function filterRelevantFiles(files, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const supportedExtensions = normalizeExtensions(opts.extensions);
  
  if (!Array.isArray(files)) {
    return [];
  }

  // Filter by extension and ignored directories
  const filtered = files.filter(file => {
    const path = file.path || file;
    
    // Check extension
    if (!supportedExtensions.includes(getFileExtension(path))) {
      return false;
    }
    
    // Check ignored directories
    if (isIgnoredPath(path, opts.ignoreDirs)) {
      return false;
    }
    
    return true;
  });

  // Score files based on priority directories
  const scored = filtered.map(file => {
    const path = file.path || file;
    let score = 1;
    
    // Boost score for priority directories
    const pathLower = path.toLowerCase();
    opts.priorityDirs.forEach(dir => {
      if (pathLower.includes(`/${dir}/`) || pathLower.startsWith(`${dir}/`)) {
        score += 10;
      }
    });
    
    // Boost score for entry points
    if (/(\b|\/)(index|main|app|server|manage|cli)\.(js|jsx|ts|tsx|py)$/i.test(path)) {
      score += 20;
    }

    if (/(\b|\/)(__init__|models|routes|views|urls|settings)\.py$/i.test(path)) {
      score += 8;
    }
    
    return {
      ...file,
      path: typeof file === 'string' ? file : file.path,
      language: getFileLanguage(path),
      score
    };
  });

  // Sort by score and limit to maxFiles
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, opts.maxFiles);
}

/**
 * Extract all import statements from file content
 * 
 * @param {string} content - File content
 * @param {string} filePath - Path of the file
 * @returns {Array} Array of import objects with source and type
 */
function extractAllImports(content, filePath) {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const imports = [];
  const language = getFileLanguage(filePath);

  if (language === 'python') {
    const importRegex = /^\s*import\s+([A-Za-z_][\w.]*\s*(?:as\s+\w+)?(?:\s*,\s*[A-Za-z_][\w.]*\s*(?:as\s+\w+)?)*)/gm;
    const fromImportRegex = /^\s*from\s+(\.*[A-Za-z_][\w.]*|\.+)\s+import\s+([A-Za-z_*][\w*]*(?:\s+as\s+\w+)?(?:\s*,\s*[A-Za-z_*][\w*]*(?:\s+as\s+\w+)?)*)/gm;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      match[1].split(',').forEach(rawModule => {
        const moduleName = rawModule.trim().split(/\s+as\s+/i)[0];
        if (moduleName) {
          imports.push({
            source: moduleName,
            type: 'python-import',
            statement: match[0],
            language: 'python',
            importedNames: []
          });
        }
      });
    }

    while ((match = fromImportRegex.exec(content)) !== null) {
      const importedNames = match[2]
        .split(',')
        .map(name => name.trim().split(/\s+as\s+/i)[0])
        .filter(Boolean);

      imports.push({
        source: match[1],
        type: 'python-from',
        statement: match[0],
        language: 'python',
        importedNames
      });
    }

    return imports;
  }
  
  // ES6 imports: import X from 'Y'
  const es6ImportRegex = /import\s+(?:(?:\{[^}]*\})|(?:\*\s+as\s+\w+)|(?:\w+(?:\s*,\s*\{[^}]*\})?))\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = es6ImportRegex.exec(content)) !== null) {
    imports.push({
      source: match[1],
      type: 'es6',
      statement: match[0]
    });
  }

  // Side-effect imports: import 'Y'
  const sideEffectImportRegex = /import\s+['"]([^'"]+)['"]/g;

  while ((match = sideEffectImportRegex.exec(content)) !== null) {
    imports.push({
      source: match[1],
      type: 'side-effect',
      statement: match[0]
    });
  }

  // CommonJS requires: require('Y')
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
  
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push({
      source: match[1],
      type: 'commonjs',
      statement: match[0]
    });
  }

  // Dynamic imports: import('Y')
  const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;
  
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    imports.push({
      source: match[1],
      type: 'dynamic',
      statement: match[0]
    });
  }

  return imports;
}

/**
 * Resolve import path to actual file path
 * 
 * @param {string} importPath - Import path from source code
 * @param {string} sourceFilePath - Path of the file containing the import
 * @param {Set} filePathSet - Set of all available file paths
 * @param {Object} options - Resolution options including aliasMap
 * @returns {string|null} Resolved file path or null if not found
 */
function buildRelativePath(sourceFilePath, importPath) {
  const sourceParts = sourceFilePath.split('/');
  sourceParts.pop(); // Remove filename

  const importParts = importPath.split('/');
  const resolvedParts = [...sourceParts];

  for (const part of importParts) {
    if (part === '.') {
      continue;
    } else if (part === '..') {
      resolvedParts.pop();
    } else if (part) {
      resolvedParts.push(part);
    }
  }

  return resolvedParts.join('/');
}

function findFirstExistingCandidate(candidates, filePathSet) {
  for (const candidate of candidates.filter(Boolean)) {
    if (filePathSet.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function findPythonModuleBySuffix(modulePath, filePathSet) {
  const suffixCandidates = [
    `${modulePath}.py`,
    `${modulePath}/__init__.py`
  ];

  for (const suffix of suffixCandidates) {
    const matches = Array.from(filePathSet)
      .filter(filePath => filePath === suffix || filePath.endsWith(`/${suffix}`))
      .sort((a, b) => a.length - b.length);

    if (matches.length > 0) {
      return matches[0];
    }
  }

  return null;
}

function resolvePythonImport(importEntry, sourceFilePath, filePathSet) {
  const rawImportPath = String(importEntry?.source || '').trim();
  if (!rawImportPath) {
    return null;
  }

  const sourceDirParts = sourceFilePath.split('/');
  sourceDirParts.pop();
  const importedNames = Array.isArray(importEntry.importedNames)
    ? importEntry.importedNames.filter(name => name && name !== '*')
    : [];
  let modulePath = rawImportPath;
  let baseParts = [];

  if (rawImportPath.startsWith('.')) {
    const leadingDots = rawImportPath.match(/^\.+/)?.[0]?.length || 0;
    const moduleRemainder = rawImportPath.slice(leadingDots).replace(/\./g, '/');
    baseParts = [...sourceDirParts];

    for (let i = 1; i < leadingDots; i += 1) {
      baseParts.pop();
    }

    if (moduleRemainder) {
      baseParts.push(...moduleRemainder.split('/').filter(Boolean));
    }

    modulePath = baseParts.join('/');
  } else {
    modulePath = rawImportPath.replace(/\./g, '/');
  }

  const candidates = [
    `${modulePath}.py`,
    `${modulePath}/__init__.py`
  ];

  importedNames.forEach(name => {
    const namePath = name.replace(/\./g, '/');
    candidates.push(`${modulePath}/${namePath}.py`);
    candidates.push(`${modulePath}/${namePath}/__init__.py`);

    if (rawImportPath.startsWith('.') && modulePath) {
      candidates.push(`${modulePath}/${namePath}.py`);
    }
  });

  if (rawImportPath === '.' || /^\.+$/.test(rawImportPath)) {
    importedNames.forEach(name => {
      const namePath = name.replace(/\./g, '/');
      const base = baseParts.join('/');
      candidates.push(`${base}/${namePath}.py`);
      candidates.push(`${base}/${namePath}/__init__.py`);
    });
  }

  const directMatch = findFirstExistingCandidate(candidates, filePathSet);
  if (directMatch) {
    return directMatch;
  }

  if (!rawImportPath.startsWith('.')) {
    const suffixMatch = findPythonModuleBySuffix(modulePath, filePathSet);
    if (suffixMatch) {
      return suffixMatch;
    }

    for (const name of importedNames) {
      const suffix = `${modulePath}/${name.replace(/\./g, '/')}`;
      const importedMatch = findPythonModuleBySuffix(suffix, filePathSet);
      if (importedMatch) {
        return importedMatch;
      }
    }
  }

  return null;
}

function resolveImportPath(importPath, sourceFilePath, filePathSet, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const importEntry = typeof importPath === 'object'
    ? importPath
    : { source: importPath };
  let normalizedImportPath = String(importEntry.source || '').trim();
  
  if (!normalizedImportPath || !sourceFilePath) {
    return null;
  }

  if (getFileLanguage(sourceFilePath) === 'python' || String(importEntry.type || '').startsWith('python')) {
    return resolvePythonImport(importEntry, sourceFilePath, filePathSet);
  }

  // Skip npm packages (don't start with . or /)
  if (!normalizedImportPath.startsWith('.') && !normalizedImportPath.startsWith('/')) {
    // Check for path aliases
    const aliasKeys = Object.keys(opts.aliasMap);
    let resolved = null;
    
    for (const alias of aliasKeys) {
      if (normalizedImportPath.startsWith(alias + '/') || normalizedImportPath === alias) {
        const aliasPath = opts.aliasMap[alias];
        const remainder = normalizedImportPath.slice(alias.length + 1);
        resolved = `${aliasPath}/${remainder}`;
        break;
      }
    }
    
    if (!resolved) {
      return null; // External package
    }
    
    normalizedImportPath = resolved;
  }

  // Handle relative imports
  if (normalizedImportPath.startsWith('.')) {
    normalizedImportPath = buildRelativePath(sourceFilePath, normalizedImportPath);
  }

  // Try different file extensions
  const supportedExtensions = normalizeExtensions(opts.extensions)
    .filter(ext => ext !== '.py');
  const indexCandidates = supportedExtensions.flatMap(ext => [
    `${normalizedImportPath}${ext}`,
    `${normalizedImportPath}/index${ext}`
  ]);
  const candidates = [
    normalizedImportPath,
    ...indexCandidates
  ];

  return findFirstExistingCandidate(candidates, filePathSet);
}

/**
 * Build file dependency maps (imports and dependents)
 * 
 * @param {Array} files - Array of file objects
 * @param {Object} options - Build options
 * @returns {Object} Object with importsMap and dependentsMap
 */
function buildFileDependencyMap(files, options = {}) {
  const importsMap = {};
  const dependentsMap = {};
  const edgeMetadata = {};
  const filePathSet = new Set(files.map(f => f.path));

  files.forEach(file => {
    const filePath = file.path;
    const content = file.content || '';
    
    // Initialize maps
    if (!importsMap[filePath]) {
      importsMap[filePath] = [];
    }
    
    // Extract imports
    const imports = extractAllImports(content, filePath);
    
    // Resolve each import
    imports.forEach(imp => {
      const resolvedPath = resolveImportPath(imp, filePath, filePathSet, options);
      
      if (resolvedPath && resolvedPath !== filePath) {
        const edgeKey = `${filePath}->${resolvedPath}`;

        // Add to imports map
        if (!importsMap[filePath].includes(resolvedPath)) {
          importsMap[filePath].push(resolvedPath);
        }

        if (!edgeMetadata[edgeKey]) {
          edgeMetadata[edgeKey] = {
            source: filePath,
            target: resolvedPath,
            importTypes: [],
            statements: []
          };
        }

        if (!edgeMetadata[edgeKey].importTypes.includes(imp.type)) {
          edgeMetadata[edgeKey].importTypes.push(imp.type);
        }

        if (imp.statement && !edgeMetadata[edgeKey].statements.includes(imp.statement)) {
          edgeMetadata[edgeKey].statements.push(imp.statement);
        }
        
        // Add to dependents map (reverse)
        if (!dependentsMap[resolvedPath]) {
          dependentsMap[resolvedPath] = [];
        }
        if (!dependentsMap[resolvedPath].includes(filePath)) {
          dependentsMap[resolvedPath].push(filePath);
        }
      }
    });
  });

  return { importsMap, dependentsMap, edgeMetadata };
}

/**
 * Calculate dependency strength between two files
 * 
 * @param {string} sourceFile - Source file path
 * @param {string} targetFile - Target file path
 * @param {Object} importsMap - Map of file imports
 * @returns {number} Strength score (1-10)
 */
function calculateDependencyStrength(sourceFile, targetFile, importsMap, edgeMetadata = {}) {
  const edgeKey = `${sourceFile}->${targetFile}`;
  const metadata = edgeMetadata[edgeKey];
  if (metadata?.statements?.length) {
    return Math.min(10, Math.max(1, metadata.statements.length));
  }

  const imports = importsMap[sourceFile] || [];
  const count = imports.filter(imp => imp === targetFile).length;
  
  // Normalize to 1-10 scale
  return Math.min(10, Math.max(1, count));
}

/**
 * Build adjacency list for graph algorithms
 * 
 * @param {Object} importsMap - Map of file imports
 * @param {Object} dependentsMap - Map of file dependents
 * @returns {Object} Adjacency list with in/out degrees
 */
function buildAdjacencyList(importsMap, dependentsMap) {
  const adjacencyList = {};
  const allFiles = new Set([
    ...Object.keys(importsMap),
    ...Object.keys(dependentsMap)
  ]);

  allFiles.forEach(file => {
    const outgoing = importsMap[file] || [];
    const incoming = dependentsMap[file] || [];
    
    adjacencyList[file] = {
      outgoing,
      incoming,
      outDegree: outgoing.length,
      inDegree: incoming.length
    };
  });

  return adjacencyList;
}

/**
 * Classify file layer based on path
 * 
 * @param {string} path - File path
 * @returns {string} Layer classification
 */
function classifyFileLayer(path) {
  const lower = path.toLowerCase();
  
  if (/(\b|\/)(index|main|app|server|manage|cli)\.(js|jsx|ts|tsx|py)$/i.test(path)) return 'entry';
  if (lower.includes('/components/') || lower.includes('/pages/') || /\.(jsx|tsx)$/i.test(path)) return 'ui';
  if (lower.includes('/api/') || lower.includes('/routes/') || lower.includes('/controllers/')) return 'api';
  if (lower.includes('/services/') || lower.includes('/lib/')) return 'service';
  if (lower.includes('/utils/') || lower.includes('/helpers/') || lower.includes('/hooks/')) return 'utility';
  if (lower.includes('/models/') || lower.includes('/schema') || lower.includes('/database') || /(^|\/)models\.py$/i.test(path)) return 'data';
  if (/(^|\/)(views|urls|forms|serializers|admin)\.py$/i.test(path)) return 'api';
  if (/(^|\/)(__init__)\.py$/i.test(path)) return 'package';
  
  return 'file';
}

/**
 * Main function to build complete dependency graph
 * 
 * @param {Array} files - Array of file objects with path and content
 * @param {Object} options - Configuration options
 * @returns {Object} Complete dependency graph structure
 */
export function buildDependencyGraph(files, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const supportedExtensions = normalizeExtensions(opts.extensions);
  
  console.log('[DEBUG] buildDependencyGraph: Starting with', files?.length || 0, 'input files');
  
  // Filter relevant files
  const relevantFiles = filterRelevantFiles(files, opts);
  
  console.log('[DEBUG] buildDependencyGraph: Filtered to', relevantFiles.length, 'relevant files');
  console.log('[DEBUG] buildDependencyGraph: Sample files:', relevantFiles.slice(0, 3).map(f => f.path));
  
  if (relevantFiles.length === 0) {
    console.log('[DEBUG] buildDependencyGraph: No relevant files found, returning empty graph');
    return {
      nodes: [],
      edges: [],
      importsMap: {},
      dependentsMap: {},
      edgeMetadata: {},
      adjacencyList: {},
      metrics: {
        totalFiles: 0,
        totalEdges: 0,
        avgDependencies: 0,
        hubNodes: 0,
        isolatedNodes: 0
      },
      analysis: {
        hubs: [],
        dangerZones: [],
        communities: [],
        circularPaths: [],
        criticalPaths: []
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        fileCount: 0,
        inputFileCount: Array.isArray(files) ? files.length : 0,
        analysisLevel: 'basic',
        supportedExtensions
      }
    };
  }

  // Build dependency maps
  const { importsMap, dependentsMap, edgeMetadata } = buildFileDependencyMap(relevantFiles, opts);
  
  // Build adjacency list
  const adjacencyList = buildAdjacencyList(importsMap, dependentsMap);
  
  // Build nodes
  const nodes = relevantFiles.map(file => {
    const filePath = file.path;
    const adj = adjacencyList[filePath] || { inDegree: 0, outDegree: 0 };
    
    return {
      id: `file:${filePath}`,
      path: filePath,
      name: filePath.split('/').pop(),
      type: 'file',
      layer: classifyFileLayer(filePath),
      language: file.language || getFileLanguage(filePath),
      importCount: adj.outDegree,
      dependentCount: adj.inDegree,
      isHub: adj.inDegree >= opts.hubThreshold,
      importance: adj.inDegree * 10 + adj.outDegree * 2,
      // Future-ready fields (null for now)
      centrality: null,
      community: null,
      blastRadius: null,
      changeFrequency: null,
      riskScore: null
    };
  });
  
  // Build edges
  const edges = [];
  const edgeSet = new Set();
  
  Object.entries(importsMap).forEach(([sourceFile, targets]) => {
    targets.forEach(targetFile => {
      const edgeId = `${sourceFile}->${targetFile}`;
      if (!edgeSet.has(edgeId)) {
        const metadata = edgeMetadata[edgeId] || {};
        const strength = calculateDependencyStrength(sourceFile, targetFile, importsMap, edgeMetadata);
        
        edges.push({
          id: `edge:${edgeId}`,
          source: `file:${sourceFile}`,
          target: `file:${targetFile}`,
          strength,
          importType: metadata.importTypes?.[0] || 'unknown',
          importTypes: metadata.importTypes || [],
          statements: (metadata.statements || []).slice(0, 3),
          relationship: 'imports',
          weight: strength,
          bidirectional: false
        });
        
        edgeSet.add(edgeId);
      }
    });
  });
  
  // Calculate metrics
  const hubNodes = nodes.filter(n => n.isHub).length;
  const isolatedNodes = nodes.filter(n => n.importCount === 0 && n.dependentCount === 0).length;
  const totalDeps = nodes.reduce((sum, n) => sum + n.importCount, 0);
  const avgDependencies = nodes.length > 0 ? totalDeps / nodes.length : 0;
  
  const result = {
    nodes,
    edges,
    importsMap,
    dependentsMap,
    edgeMetadata,
    adjacencyList,
    metrics: {
      totalFiles: nodes.length,
      totalEdges: edges.length,
      avgDependencies: parseFloat(avgDependencies.toFixed(2)),
      hubNodes,
      isolatedNodes,
      // Future metrics (null for now)
      maxBlastRadius: null,
      avgCentrality: null,
      circularDependencies: null,
      communityCount: null
    },
    analysis: {
      hubs: [],
      dangerZones: [],
      communities: [],
      circularPaths: [],
      criticalPaths: []
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      fileCount: nodes.length,
      inputFileCount: Array.isArray(files) ? files.length : 0,
      supportedExtensions,
      analysisLevel: 'basic',
      fileHashes: null,
      lastModified: null
    }
  };
  
  console.log('[DEBUG] buildDependencyGraph: Returning graph with', result.nodes.length, 'nodes and', result.edges.length, 'edges');
  console.log('[DEBUG] buildDependencyGraph: Sample node:', result.nodes[0]);
  console.log('[DEBUG] buildDependencyGraph: Sample edge:', result.edges[0]);
  
  return result;
}

export default {
  buildDependencyGraph,
  filterRelevantFiles,
  extractAllImports,
  resolveImportPath,
  buildFileDependencyMap,
  calculateDependencyStrength,
  buildAdjacencyList
};

// Made with Bob
