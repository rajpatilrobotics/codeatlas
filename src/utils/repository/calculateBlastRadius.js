/**
 * Calculate Blast Radius
 * BFS traversal utility for finding affected files in dependency graph
 * 
 * This module provides safe graph traversal to determine which files
 * are affected when a specific file changes (blast radius analysis).
 * 
 * Inspired by concepts from code-review-graph (MIT licensed)
 * Adapted for JavaScript/React architecture
 * 
 * @module calculateBlastRadius
 */

/**
 * Default configuration for blast radius calculation
 */
const DEFAULT_OPTIONS = {
  maxDepth: 10,           // Maximum traversal depth to prevent infinite loops
  maxNodes: 500,          // Maximum nodes to traverse for performance
  includeSource: true,    // Include the source node in results
  direction: 'downstream' // 'downstream' (dependents) or 'upstream' (dependencies)
};

/**
 * Calculate blast radius from a selected file/node
 * Uses BFS (Breadth-First Search) to traverse the dependency graph
 * 
 * @param {string} sourceNodeId - ID of the selected node (e.g., 'file:src/App.jsx')
 * @param {Object} dependencyGraph - Complete dependency graph structure
 * @param {Object} options - Configuration options
 * @returns {Object} Blast radius result with affected nodes and edges
 */
export function calculateBlastRadius(sourceNodeId, dependencyGraph, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Graceful fallback: validate inputs
  if (!sourceNodeId || typeof sourceNodeId !== 'string') {
    console.warn('calculateBlastRadius: Invalid sourceNodeId');
    return createEmptyBlastRadius();
  }
  
  if (!dependencyGraph || typeof dependencyGraph !== 'object') {
    console.warn('calculateBlastRadius: Invalid dependencyGraph');
    return createEmptyBlastRadius();
  }
  
  // Extract required data structures
  const { nodes, edges, dependentsMap, importsMap, adjacencyList } = dependencyGraph;
  
  // Validate required structures
  if (!nodes || !Array.isArray(nodes)) {
    console.warn('calculateBlastRadius: Missing or invalid nodes array');
    return createEmptyBlastRadius();
  }
  
  if (!dependentsMap || typeof dependentsMap !== 'object') {
    console.warn('calculateBlastRadius: Missing or invalid dependentsMap');
    return createEmptyBlastRadius();
  }
  
  // Find source node
  const sourceNode = nodes.find(n => n.id === sourceNodeId);
  if (!sourceNode) {
    console.warn(`calculateBlastRadius: Source node not found: ${sourceNodeId}`);
    return createEmptyBlastRadius();
  }
  
  // Extract file path from node ID (format: 'file:path/to/file.js')
  const sourceFilePath = sourceNode.path || sourceNodeId.replace(/^file:/, '');
  
  // Perform BFS traversal
  try {
    const traversalResult = opts.direction === 'downstream'
      ? traverseDownstream(sourceFilePath, dependentsMap, adjacencyList, opts)
      : traverseUpstream(sourceFilePath, importsMap, adjacencyList, opts);
    
    // Map file paths back to node IDs
    const affectedNodeIds = new Set(
      traversalResult.affectedFiles.map(filePath => {
        const node = nodes.find(n => n.path === filePath);
        return node ? node.id : `file:${filePath}`;
      })
    );
    
    // Find affected edges
    const affectedEdges = edges ? edges.filter(edge => 
      affectedNodeIds.has(edge.source) || affectedNodeIds.has(edge.target)
    ) : [];
    
    return {
      affectedNodes: Array.from(affectedNodeIds),
      affectedEdges: affectedEdges.map(e => e.id),
      traversalDepth: traversalResult.maxDepth,
      traversalOrder: traversalResult.traversalOrder,
      stats: {
        totalAffected: affectedNodeIds.size,
        maxDepth: traversalResult.maxDepth,
        circularDependenciesDetected: traversalResult.circularDependencies.length,
        traversalLimited: traversalResult.limited
      },
      circularDependencies: traversalResult.circularDependencies,
      sourceNode: sourceNodeId,
      direction: opts.direction
    };
  } catch (error) {
    console.error('calculateBlastRadius: Traversal error:', error);
    return createEmptyBlastRadius();
  }
}

/**
 * Traverse downstream (find files that depend on the source file)
 * Uses BFS to find all dependents
 * 
 * @param {string} sourceFilePath - Path of the source file
 * @param {Object} dependentsMap - Map of file -> [files that import it]
 * @param {Object} adjacencyList - Adjacency list for efficient traversal
 * @param {Object} options - Traversal options
 * @returns {Object} Traversal result
 */
function traverseDownstream(sourceFilePath, dependentsMap, adjacencyList, options) {
  const visited = new Set();
  const affectedFiles = [];
  const traversalOrder = [];
  const circularDependencies = [];
  const queue = [{ file: sourceFilePath, depth: 0, path: [sourceFilePath] }];
  
  let maxDepth = 0;
  let limited = false;
  
  while (queue.length > 0 && affectedFiles.length < options.maxNodes) {
    const { file, depth, path } = queue.shift();
    
    // Check max depth limit
    if (depth > options.maxDepth) {
      limited = true;
      continue;
    }
    
    // Check if already visited (circular dependency protection)
    if (visited.has(file)) {
      // Detect circular dependency
      if (path.includes(file)) {
        circularDependencies.push([...path, file]);
      }
      continue;
    }
    
    visited.add(file);
    affectedFiles.push(file);
    traversalOrder.push({ file, depth });
    maxDepth = Math.max(maxDepth, depth);
    
    // Get dependents (files that import this file)
    const dependents = dependentsMap[file] || [];
    
    // Add dependents to queue
    dependents.forEach(dependent => {
      if (!visited.has(dependent)) {
        queue.push({
          file: dependent,
          depth: depth + 1,
          path: [...path, dependent]
        });
      }
    });
  }
  
  // Check if traversal was limited
  if (queue.length > 0) {
    limited = true;
  }
  
  return {
    affectedFiles,
    traversalOrder,
    maxDepth,
    circularDependencies,
    limited
  };
}

/**
 * Traverse upstream (find files that the source file depends on)
 * Uses BFS to find all dependencies
 * 
 * @param {string} sourceFilePath - Path of the source file
 * @param {Object} importsMap - Map of file -> [files it imports]
 * @param {Object} adjacencyList - Adjacency list for efficient traversal
 * @param {Object} options - Traversal options
 * @returns {Object} Traversal result
 */
function traverseUpstream(sourceFilePath, importsMap, adjacencyList, options) {
  const visited = new Set();
  const affectedFiles = [];
  const traversalOrder = [];
  const circularDependencies = [];
  const queue = [{ file: sourceFilePath, depth: 0, path: [sourceFilePath] }];
  
  let maxDepth = 0;
  let limited = false;
  
  while (queue.length > 0 && affectedFiles.length < options.maxNodes) {
    const { file, depth, path } = queue.shift();
    
    // Check max depth limit
    if (depth > options.maxDepth) {
      limited = true;
      continue;
    }
    
    // Check if already visited (circular dependency protection)
    if (visited.has(file)) {
      // Detect circular dependency
      if (path.includes(file)) {
        circularDependencies.push([...path, file]);
      }
      continue;
    }
    
    visited.add(file);
    affectedFiles.push(file);
    traversalOrder.push({ file, depth });
    maxDepth = Math.max(maxDepth, depth);
    
    // Get imports (files this file imports)
    const imports = importsMap[file] || [];
    
    // Add imports to queue
    imports.forEach(imported => {
      if (!visited.has(imported)) {
        queue.push({
          file: imported,
          depth: depth + 1,
          path: [...path, imported]
        });
      }
    });
  }
  
  // Check if traversal was limited
  if (queue.length > 0) {
    limited = true;
  }
  
  return {
    affectedFiles,
    traversalOrder,
    maxDepth,
    circularDependencies,
    limited
  };
}

/**
 * Create empty blast radius result (for fallback cases)
 * 
 * @returns {Object} Empty blast radius structure
 */
function createEmptyBlastRadius() {
  return {
    affectedNodes: [],
    affectedEdges: [],
    traversalDepth: 0,
    traversalOrder: [],
    stats: {
      totalAffected: 0,
      maxDepth: 0,
      circularDependenciesDetected: 0,
      traversalLimited: false
    },
    circularDependencies: [],
    sourceNode: null,
    direction: null
  };
}

/**
 * Calculate bidirectional blast radius (both upstream and downstream)
 * Useful for understanding full impact of a file change
 * 
 * @param {string} sourceNodeId - ID of the selected node
 * @param {Object} dependencyGraph - Complete dependency graph structure
 * @param {Object} options - Configuration options
 * @returns {Object} Combined blast radius result
 */
export function calculateBidirectionalBlastRadius(sourceNodeId, dependencyGraph, options = {}) {
  const downstream = calculateBlastRadius(sourceNodeId, dependencyGraph, {
    ...options,
    direction: 'downstream'
  });
  
  const upstream = calculateBlastRadius(sourceNodeId, dependencyGraph, {
    ...options,
    direction: 'upstream'
  });
  
  // Combine results
  const allAffectedNodes = new Set([
    ...downstream.affectedNodes,
    ...upstream.affectedNodes
  ]);
  
  const allAffectedEdges = new Set([
    ...downstream.affectedEdges,
    ...upstream.affectedEdges
  ]);
  
  return {
    affectedNodes: Array.from(allAffectedNodes),
    affectedEdges: Array.from(allAffectedEdges),
    downstream: downstream.stats,
    upstream: upstream.stats,
    stats: {
      totalAffected: allAffectedNodes.size,
      downstreamAffected: downstream.stats.totalAffected,
      upstreamAffected: upstream.stats.totalAffected,
      maxDepth: Math.max(downstream.traversalDepth, upstream.traversalDepth),
      circularDependenciesDetected: 
        downstream.stats.circularDependenciesDetected + 
        upstream.stats.circularDependenciesDetected
    },
    sourceNode: sourceNodeId
  };
}

/**
 * Validate dependency graph structure
 * Useful for debugging and ensuring graph integrity
 * 
 * @param {Object} dependencyGraph - Dependency graph to validate
 * @returns {Object} Validation result
 */
export function validateDependencyGraph(dependencyGraph) {
  const issues = [];
  
  if (!dependencyGraph) {
    issues.push('Dependency graph is null or undefined');
    return { valid: false, issues };
  }
  
  if (!dependencyGraph.nodes || !Array.isArray(dependencyGraph.nodes)) {
    issues.push('Missing or invalid nodes array');
  }
  
  if (!dependencyGraph.edges || !Array.isArray(dependencyGraph.edges)) {
    issues.push('Missing or invalid edges array');
  }
  
  if (!dependencyGraph.dependentsMap || typeof dependencyGraph.dependentsMap !== 'object') {
    issues.push('Missing or invalid dependentsMap');
  }
  
  if (!dependencyGraph.importsMap || typeof dependencyGraph.importsMap !== 'object') {
    issues.push('Missing or invalid importsMap');
  }
  
  if (!dependencyGraph.adjacencyList || typeof dependencyGraph.adjacencyList !== 'object') {
    issues.push('Missing or invalid adjacencyList');
  }
  
  return {
    valid: issues.length === 0,
    issues,
    nodeCount: dependencyGraph.nodes?.length || 0,
    edgeCount: dependencyGraph.edges?.length || 0
  };
}

export default {
  calculateBlastRadius,
  calculateBidirectionalBlastRadius,
  validateDependencyGraph
};

// Made with Bob
