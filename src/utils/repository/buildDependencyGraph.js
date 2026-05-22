/**
 * Build Dependency Graph
 * Generates file-to-file dependency graphs from real import/export statements
 * 
 * This module provides the core engine for dependency graph generation.
 * It extracts imports, resolves paths, and builds bidirectional dependency maps.
 * 
 * @module buildDependencyGraph
 */

// Supported file extensions for dependency analysis
const SUPPORTED_EXTENSIONS = /\.(js|jsx|ts|tsx)$/i;

// Directories to prioritize during file filtering
const PRIORITY_DIRS = ['src', 'app', 'components', 'services', 'api', 'hooks', 'lib', 'utils', 'pages'];

// Directories to ignore during file filtering
const IGNORE_DIRS = ['node_modules', 'dist', 'build', '.next', 'coverage', '__tests__', '.git', 'public'];

/**
 * Default configuration options for dependency graph generation
 */
const DEFAULT_OPTIONS = {
  maxFiles: 150,
  priorityDirs: PRIORITY_DIRS,
  ignoreDirs: IGNORE_DIRS,
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  aliasMap: {
    '@': 'src',
    '~': 'src'
  },
  hubThreshold: 5
};

/**
 * Filter files to only include relevant ones for dependency analysis
 * 
 * @param {Array} files - Array of file objects with path and content
 * @param {Object} options - Filtering options
 * @returns {Array} Filtered and scored file list
 */
function filterRelevantFiles(files, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (!Array.isArray(files)) {
    return [];
  }

  // Filter by extension and ignored directories
  const filtered = files.filter(file => {
    const path = file.path || file;
    
    // Check extension
    if (!SUPPORTED_EXTENSIONS.test(path)) {
      return false;
    }
    
    // Check ignored directories
    const pathLower = path.toLowerCase();
    if (opts.ignoreDirs.some(dir => pathLower.includes(`/${dir}/`) || pathLower.startsWith(`${dir}/`))) {
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
    if (/(\b|\/)(index|main|app|server)\.(js|jsx|ts|tsx)$/i.test(path)) {
      score += 20;
    }
    
    return {
      ...file,
      path: typeof file === 'string' ? file : file.path,
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

  // CommonJS requires: require('Y')
  const requireRegex = /(?:const|let|var)\s+(?:\{[^}]*\}|\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g;
  
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
function resolveImportPath(importPath, sourceFilePath, filePathSet, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (!importPath || !sourceFilePath) {
    return null;
  }

  // Skip npm packages (don't start with . or /)
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    // Check for path aliases
    const aliasKeys = Object.keys(opts.aliasMap);
    let resolved = null;
    
    for (const alias of aliasKeys) {
      if (importPath.startsWith(alias + '/') || importPath === alias) {
        const aliasPath = opts.aliasMap[alias];
        const remainder = importPath.slice(alias.length + 1);
        resolved = `${aliasPath}/${remainder}`;
        break;
      }
    }
    
    if (!resolved) {
      return null; // External package
    }
    
    importPath = resolved;
  }

  // Handle relative imports
  if (importPath.startsWith('.')) {
    const sourceParts = sourceFilePath.split('/');
    sourceParts.pop(); // Remove filename
    
    const importParts = importPath.split('/');
    const resolvedParts = [...sourceParts];
    
    for (const part of importParts) {
      if (part === '.') {
        continue;
      } else if (part === '..') {
        resolvedParts.pop();
      } else {
        resolvedParts.push(part);
      }
    }
    
    importPath = resolvedParts.join('/');
  }

  // Try different file extensions
  const candidates = [
    importPath,
    `${importPath}.js`,
    `${importPath}.jsx`,
    `${importPath}.ts`,
    `${importPath}.tsx`,
    `${importPath}/index.js`,
    `${importPath}/index.jsx`,
    `${importPath}/index.ts`,
    `${importPath}/index.tsx`
  ];

  for (const candidate of candidates) {
    if (filePathSet.has(candidate)) {
      return candidate;
    }
  }

  return null;
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
      const resolvedPath = resolveImportPath(imp.source, filePath, filePathSet, options);
      
      if (resolvedPath && resolvedPath !== filePath) {
        // Add to imports map
        if (!importsMap[filePath].includes(resolvedPath)) {
          importsMap[filePath].push(resolvedPath);
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

  return { importsMap, dependentsMap };
}

/**
 * Calculate dependency strength between two files
 * 
 * @param {string} sourceFile - Source file path
 * @param {string} targetFile - Target file path
 * @param {Object} importsMap - Map of file imports
 * @returns {number} Strength score (1-10)
 */
function calculateDependencyStrength(sourceFile, targetFile, importsMap) {
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
  
  if (/(\b|\/)(index|main|app|server)\.(js|jsx|ts|tsx)$/i.test(path)) return 'entry';
  if (lower.includes('/components/') || lower.includes('/pages/') || /\.(jsx|tsx)$/i.test(path)) return 'ui';
  if (lower.includes('/api/') || lower.includes('/routes/') || lower.includes('/controllers/')) return 'api';
  if (lower.includes('/services/') || lower.includes('/lib/')) return 'service';
  if (lower.includes('/utils/') || lower.includes('/helpers/') || lower.includes('/hooks/')) return 'utility';
  if (lower.includes('/models/') || lower.includes('/schema') || lower.includes('/database')) return 'data';
  
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
  
  // Filter relevant files
  const relevantFiles = filterRelevantFiles(files, opts);
  
  if (relevantFiles.length === 0) {
    return {
      nodes: [],
      edges: [],
      importsMap: {},
      dependentsMap: {},
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
        analysisLevel: 'basic'
      }
    };
  }

  // Build dependency maps
  const { importsMap, dependentsMap } = buildFileDependencyMap(relevantFiles, opts);
  
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
        const strength = calculateDependencyStrength(sourceFile, targetFile, importsMap);
        
        edges.push({
          id: `edge:${edgeId}`,
          source: `file:${sourceFile}`,
          target: `file:${targetFile}`,
          strength,
          importType: 'es6', // Simplified for now
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
  
  return {
    nodes,
    edges,
    importsMap,
    dependentsMap,
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
      analysisLevel: 'basic',
      fileHashes: null,
      lastModified: null
    }
  };
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
