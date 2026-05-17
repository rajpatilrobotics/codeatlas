/**
 * Graph Traversal Algorithms
 * BFS, DFS, and specialized traversal for dependency analysis
 */

/**
 * Breadth-First Search (BFS) traversal
 * @param {Map} graph - Adjacency list representation
 * @param {string} startNode - Starting node ID
 * @param {Object} options - Traversal options
 * @returns {Array} Traversal result
 */
function bfs(graph, startNode, options = {}) {
  const {
    maxDepth = Infinity,
    visitCallback = null,
    stopCondition = null
  } = options;

  const visited = new Set();
  const queue = [{ node: startNode, depth: 0, path: [startNode] }];
  const result = [];

  while (queue.length > 0) {
    const { node, depth, path } = queue.shift();

    // Skip if already visited
    if (visited.has(node)) continue;

    // Mark as visited
    visited.add(node);

    // Add to result
    const nodeData = {
      node,
      depth,
      path: [...path]
    };
    result.push(nodeData);

    // Call visit callback if provided
    if (visitCallback) {
      visitCallback(nodeData);
    }

    // Check stop condition
    if (stopCondition && stopCondition(nodeData)) {
      break;
    }

    // Check max depth
    if (depth >= maxDepth) continue;

    // Add neighbors to queue
    const neighbors = graph.get(node) || [];
    neighbors.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        queue.push({
          node: neighbor,
          depth: depth + 1,
          path: [...path, neighbor]
        });
      }
    });
  }

  return result;
}

/**
 * Depth-First Search (DFS) traversal
 * @param {Map} graph - Adjacency list representation
 * @param {string} startNode - Starting node ID
 * @param {Object} options - Traversal options
 * @returns {Array} Traversal result
 */
function dfs(graph, startNode, options = {}) {
  const {
    maxDepth = Infinity,
    visitCallback = null,
    stopCondition = null
  } = options;

  const visited = new Set();
  const result = [];

  function traverse(node, depth = 0, path = []) {
    // Skip if already visited
    if (visited.has(node)) return;

    // Mark as visited
    visited.add(node);

    // Add to result
    const nodeData = {
      node,
      depth,
      path: [...path, node]
    };
    result.push(nodeData);

    // Call visit callback if provided
    if (visitCallback) {
      visitCallback(nodeData);
    }

    // Check stop condition
    if (stopCondition && stopCondition(nodeData)) {
      return;
    }

    // Check max depth
    if (depth >= maxDepth) return;

    // Visit neighbors
    const neighbors = graph.get(node) || [];
    neighbors.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        traverse(neighbor, depth + 1, [...path, node]);
      }
    });
  }

  traverse(startNode);
  return result;
}

/**
 * Reverse traversal (for blast radius)
 * Finds all nodes that depend on the target node
 * @param {Map} graph - Adjacency list representation
 * @param {string} targetNode - Target node ID
 * @param {Object} options - Traversal options
 * @returns {Array} Nodes that depend on target
 */
function reverseTraversal(graph, targetNode, options = {}) {
  const {
    maxDepth = Infinity,
    includeIndirect = true
  } = options;

  // Build reverse graph
  const reverseGraph = new Map();
  graph.forEach((neighbors, node) => {
    neighbors.forEach(neighbor => {
      if (!reverseGraph.has(neighbor)) {
        reverseGraph.set(neighbor, []);
      }
      reverseGraph.get(neighbor).push(node);
    });
  });

  // Perform BFS on reverse graph
  if (includeIndirect) {
    return bfs(reverseGraph, targetNode, { maxDepth });
  } else {
    // Only direct dependents
    const directDependents = reverseGraph.get(targetNode) || [];
    return directDependents.map(node => ({
      node,
      depth: 1,
      path: [targetNode, node]
    }));
  }
}

/**
 * Find all paths between two nodes
 * @param {Map} graph - Adjacency list representation
 * @param {string} startNode - Start node ID
 * @param {string} endNode - End node ID
 * @param {Object} options - Options
 * @returns {Array} All paths
 */
function findAllPaths(graph, startNode, endNode, options = {}) {
  const {
    maxDepth = 10,
    maxPaths = 100
  } = options;

  const paths = [];
  const visited = new Set();

  function explore(node, path = []) {
    // Check limits
    if (paths.length >= maxPaths) return;
    if (path.length > maxDepth) return;

    // Add current node to path
    const currentPath = [...path, node];

    // Found target
    if (node === endNode) {
      paths.push(currentPath);
      return;
    }

    // Mark as visited in current path
    visited.add(node);

    // Explore neighbors
    const neighbors = graph.get(node) || [];
    neighbors.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        explore(neighbor, currentPath);
      }
    });

    // Unmark for other paths
    visited.delete(node);
  }

  explore(startNode);
  return paths;
}

/**
 * Find shortest path between two nodes
 * @param {Map} graph - Adjacency list representation
 * @param {string} startNode - Start node ID
 * @param {string} endNode - End node ID
 * @returns {Array|null} Shortest path or null
 */
function findShortestPath(graph, startNode, endNode) {
  const visited = new Set();
  const queue = [{ node: startNode, path: [startNode] }];

  while (queue.length > 0) {
    const { node, path } = queue.shift();

    // Found target
    if (node === endNode) {
      return path;
    }

    // Skip if visited
    if (visited.has(node)) continue;
    visited.add(node);

    // Add neighbors
    const neighbors = graph.get(node) || [];
    neighbors.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        queue.push({
          node: neighbor,
          path: [...path, neighbor]
        });
      }
    });
  }

  return null; // No path found
}

/**
 * Calculate node distances from start node
 * @param {Map} graph - Adjacency list representation
 * @param {string} startNode - Start node ID
 * @returns {Map} Node distances
 */
function calculateDistances(graph, startNode) {
  const distances = new Map();
  distances.set(startNode, 0);

  const queue = [startNode];
  const visited = new Set([startNode]);

  while (queue.length > 0) {
    const node = queue.shift();
    const currentDistance = distances.get(node);

    const neighbors = graph.get(node) || [];
    neighbors.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        distances.set(neighbor, currentDistance + 1);
        queue.push(neighbor);
      }
    });
  }

  return distances;
}

/**
 * Find strongly connected components (Tarjan's algorithm)
 * @param {Map} graph - Adjacency list representation
 * @returns {Array} Strongly connected components
 */
function findStronglyConnectedComponents(graph) {
  const index = new Map();
  const lowLink = new Map();
  const onStack = new Set();
  const stack = [];
  const components = [];
  let currentIndex = 0;

  function strongConnect(node) {
    index.set(node, currentIndex);
    lowLink.set(node, currentIndex);
    currentIndex++;
    stack.push(node);
    onStack.add(node);

    const neighbors = graph.get(node) || [];
    neighbors.forEach(neighbor => {
      if (!index.has(neighbor)) {
        strongConnect(neighbor);
        lowLink.set(node, Math.min(lowLink.get(node), lowLink.get(neighbor)));
      } else if (onStack.has(neighbor)) {
        lowLink.set(node, Math.min(lowLink.get(node), index.get(neighbor)));
      }
    });

    if (lowLink.get(node) === index.get(node)) {
      const component = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        component.push(w);
      } while (w !== node);
      components.push(component);
    }
  }

  graph.forEach((_, node) => {
    if (!index.has(node)) {
      strongConnect(node);
    }
  });

  return components;
}

/**
 * Topological sort
 * @param {Map} graph - Adjacency list representation
 * @returns {Array|null} Sorted nodes or null if cycle exists
 */
function topologicalSort(graph) {
  const inDegree = new Map();
  const result = [];

  // Calculate in-degrees
  graph.forEach((_, node) => {
    if (!inDegree.has(node)) {
      inDegree.set(node, 0);
    }
  });

  graph.forEach(neighbors => {
    neighbors.forEach(neighbor => {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1);
    });
  });

  // Find nodes with no incoming edges
  const queue = [];
  inDegree.forEach((degree, node) => {
    if (degree === 0) {
      queue.push(node);
    }
  });

  // Process nodes
  while (queue.length > 0) {
    const node = queue.shift();
    result.push(node);

    const neighbors = graph.get(node) || [];
    neighbors.forEach(neighbor => {
      const newDegree = inDegree.get(neighbor) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    });
  }

  // Check if all nodes were processed (no cycles)
  if (result.length !== inDegree.size) {
    return null; // Cycle detected
  }

  return result;
}

module.exports = {
  bfs,
  dfs,
  reverseTraversal,
  findAllPaths,
  findShortestPath,
  calculateDistances,
  findStronglyConnectedComponents,
  topologicalSort
};

// Made with Bob
