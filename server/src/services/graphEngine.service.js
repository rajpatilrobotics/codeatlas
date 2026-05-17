// ============================================
// CODEATLAS - Graph Engine Service
// ============================================

const { DirectedGraph } = require('graphology');
const prisma = require('../config/prisma');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

/**
 * Build graph from database relationships
 */
async function buildRepositoryGraph(repoId) {
  try {
    logger.info(`Building graph for repository ${repoId}`);
    
    const graph = new DirectedGraph();
    
    // Fetch all files
    const files = await prisma.file.findMany({
      where: { repositoryId: repoId },
      select: {
        id: true,
        relativePath: true,
        language: true,
        linesOfCode: true
      }
    });
    
    // Add file nodes
    for (const file of files) {
      graph.addNode(file.id, {
        type: 'FILE',
        path: file.relativePath,
        language: file.language,
        linesOfCode: file.linesOfCode
      });
    }
    
    // Fetch all entities
    const entities = await prisma.entity.findMany({
      where: { repositoryId: repoId },
      select: {
        id: true,
        type: true,
        name: true,
        fileId: true,
        startLine: true,
        endLine: true,
        metadata: true
      }
    });
    
    // Add entity nodes
    for (const entity of entities) {
      graph.addNode(entity.id, {
        type: entity.type,
        name: entity.name,
        fileId: entity.fileId,
        startLine: entity.startLine,
        endLine: entity.endLine,
        metadata: entity.metadata
      });
      
      // Add edge from file to entity
      if (graph.hasNode(entity.fileId)) {
        graph.addEdge(entity.fileId, entity.id, {
          type: 'CONTAINS'
        });
      }
    }
    
    // Fetch all relationships
    const relationships = await prisma.relationship.findMany({
      where: { repositoryId: repoId },
      select: {
        type: true,
        sourceFileId: true,
        targetFileId: true,
        sourceEntityId: true,
        targetEntityId: true,
        metadata: true
      }
    });
    
    // Add relationship edges
    for (const rel of relationships) {
      const sourceId = rel.sourceFileId || rel.sourceEntityId;
      const targetId = rel.targetFileId || rel.targetEntityId;
      
      if (sourceId && targetId && graph.hasNode(sourceId) && graph.hasNode(targetId)) {
        // Avoid duplicate edges
        if (!graph.hasEdge(sourceId, targetId)) {
          graph.addEdge(sourceId, targetId, {
            type: rel.type,
            metadata: rel.metadata
          });
        }
      }
    }
    
    logger.info(`Graph built: ${graph.order} nodes, ${graph.size} edges`);
    
    return graph;
  } catch (error) {
    logger.error('Error building graph:', error);
    throw error;
  }
}

/**
 * Breadth-First Search (BFS) traversal
 */
function bfsTraversal(graph, startNodeId, maxDepth = 10) {
  if (!graph.hasNode(startNodeId)) {
    return { nodes: [], edges: [] };
  }
  
  const visited = new Set();
  const queue = [{ nodeId: startNodeId, depth: 0 }];
  const nodes = [];
  const edges = [];
  
  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift();
    
    if (visited.has(nodeId) || depth > maxDepth) continue;
    
    visited.add(nodeId);
    nodes.push({
      id: nodeId,
      depth,
      ...graph.getNodeAttributes(nodeId)
    });
    
    // Get outgoing edges
    const neighbors = graph.outNeighbors(nodeId);
    
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        queue.push({ nodeId: neighborId, depth: depth + 1 });
        
        edges.push({
          source: nodeId,
          target: neighborId,
          ...graph.getEdgeAttributes(nodeId, neighborId)
        });
      }
    }
  }
  
  return { nodes, edges };
}

/**
 * Depth-First Search (DFS) traversal
 */
function dfsTraversal(graph, startNodeId, maxDepth = 10) {
  if (!graph.hasNode(startNodeId)) {
    return { nodes: [], edges: [] };
  }
  
  const visited = new Set();
  const nodes = [];
  const edges = [];
  
  function dfs(nodeId, depth) {
    if (visited.has(nodeId) || depth > maxDepth) return;
    
    visited.add(nodeId);
    nodes.push({
      id: nodeId,
      depth,
      ...graph.getNodeAttributes(nodeId)
    });
    
    const neighbors = graph.outNeighbors(nodeId);
    
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        edges.push({
          source: nodeId,
          target: neighborId,
          ...graph.getEdgeAttributes(nodeId, neighborId)
        });
        
        dfs(neighborId, depth + 1);
      }
    }
  }
  
  dfs(startNodeId, 0);
  
  return { nodes, edges };
}

/**
 * Reverse traversal for blast radius analysis
 */
function reverseTraversal(graph, targetNodeId, maxDepth = 10) {
  if (!graph.hasNode(targetNodeId)) {
    return { nodes: [], edges: [] };
  }
  
  const visited = new Set();
  const queue = [{ nodeId: targetNodeId, depth: 0 }];
  const nodes = [];
  const edges = [];
  
  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift();
    
    if (visited.has(nodeId) || depth > maxDepth) continue;
    
    visited.add(nodeId);
    nodes.push({
      id: nodeId,
      depth,
      ...graph.getNodeAttributes(nodeId)
    });
    
    // Get incoming edges (reverse direction)
    const incomingNeighbors = graph.inNeighbors(nodeId);
    
    for (const neighborId of incomingNeighbors) {
      if (!visited.has(neighborId)) {
        queue.push({ nodeId: neighborId, depth: depth + 1 });
        
        edges.push({
          source: neighborId,
          target: nodeId,
          ...graph.getEdgeAttributes(neighborId, nodeId)
        });
      }
    }
  }
  
  return { nodes, edges };
}

/**
 * Calculate blast radius for a file or entity
 */
async function calculateBlastRadius(repoId, nodeId) {
  try {
    logger.info(`Calculating blast radius for node ${nodeId} in repo ${repoId}`);
    
    const graph = await buildRepositoryGraph(repoId);
    
    if (!graph.hasNode(nodeId)) {
      throw new Error(`Node ${nodeId} not found in graph`);
    }
    
    // Get all nodes affected by changes to this node
    const affected = reverseTraversal(graph, nodeId, 5);
    
    // Calculate risk levels based on depth
    const nodesWithRisk = affected.nodes.map(node => ({
      ...node,
      riskLevel: calculateRiskLevel(node.depth, node.type)
    }));
    
    // Group by risk level
    const riskGroups = {
      critical: nodesWithRisk.filter(n => n.riskLevel === 'CRITICAL'),
      high: nodesWithRisk.filter(n => n.riskLevel === 'HIGH'),
      medium: nodesWithRisk.filter(n => n.riskLevel === 'MEDIUM'),
      low: nodesWithRisk.filter(n => n.riskLevel === 'LOW')
    };
    
    return {
      targetNode: graph.getNodeAttributes(nodeId),
      affectedNodes: nodesWithRisk,
      edges: affected.edges,
      riskGroups,
      totalAffected: nodesWithRisk.length,
      summary: {
        critical: riskGroups.critical.length,
        high: riskGroups.high.length,
        medium: riskGroups.medium.length,
        low: riskGroups.low.length
      }
    };
  } catch (error) {
    logger.error('Error calculating blast radius:', error);
    throw error;
  }
}

/**
 * Calculate risk level based on depth and node type
 */
function calculateRiskLevel(depth, nodeType) {
  if (depth === 0) return 'CRITICAL';
  if (depth === 1) return 'HIGH';
  if (depth === 2) return 'MEDIUM';
  return 'LOW';
}

/**
 * Find shortest path between two nodes
 */
function findShortestPath(graph, sourceId, targetId) {
  if (!graph.hasNode(sourceId) || !graph.hasNode(targetId)) {
    return null;
  }
  
  const visited = new Set();
  const queue = [{ nodeId: sourceId, path: [sourceId] }];
  
  while (queue.length > 0) {
    const { nodeId, path } = queue.shift();
    
    if (nodeId === targetId) {
      return path;
    }
    
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    
    const neighbors = graph.outNeighbors(nodeId);
    
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        queue.push({
          nodeId: neighborId,
          path: [...path, neighborId]
        });
      }
    }
  }
  
  return null;
}

/**
 * Get architecture overview
 */
async function getArchitectureOverview(repoId) {
  try {
    logger.info(`Getting architecture overview for repo ${repoId}`);
    
    const graph = await buildRepositoryGraph(repoId);
    
    // Identify key architectural components
    const components = {
      entryPoints: [],
      services: [],
      utilities: [],
      components: [],
      routes: []
    };
    
    graph.forEachNode((nodeId, attributes) => {
      if (attributes.type === 'FILE') {
        const path = attributes.path.toLowerCase();
        
        if (path.includes('index') || path.includes('main') || path.includes('app')) {
          components.entryPoints.push({ id: nodeId, ...attributes });
        } else if (path.includes('service')) {
          components.services.push({ id: nodeId, ...attributes });
        } else if (path.includes('util') || path.includes('helper')) {
          components.utilities.push({ id: nodeId, ...attributes });
        } else if (path.includes('component')) {
          components.components.push({ id: nodeId, ...attributes });
        } else if (path.includes('route') || path.includes('api')) {
          components.routes.push({ id: nodeId, ...attributes });
        }
      }
    });
    
    // Calculate metrics
    const metrics = {
      totalNodes: graph.order,
      totalEdges: graph.size,
      avgDegree: graph.size / graph.order,
      maxInDegree: 0,
      maxOutDegree: 0
    };
    
    graph.forEachNode((nodeId) => {
      const inDegree = graph.inDegree(nodeId);
      const outDegree = graph.outDegree(nodeId);
      
      if (inDegree > metrics.maxInDegree) metrics.maxInDegree = inDegree;
      if (outDegree > metrics.maxOutDegree) metrics.maxOutDegree = outDegree;
    });
    
    return {
      components,
      metrics,
      graphData: {
        nodes: graph.order,
        edges: graph.size
      }
    };
  } catch (error) {
    logger.error('Error getting architecture overview:', error);
    throw error;
  }
}

/**
 * Get dependency tree for a file
 */
async function getDependencyTree(repoId, fileId) {
  try {
    logger.info(`Getting dependency tree for file ${fileId} in repo ${repoId}`);
    
    const graph = await buildRepositoryGraph(repoId);
    
    if (!graph.hasNode(fileId)) {
      throw new Error(`File ${fileId} not found in graph`);
    }
    
    const dependencies = bfsTraversal(graph, fileId, 5);
    
    return {
      rootFile: graph.getNodeAttributes(fileId),
      dependencies: dependencies.nodes,
      edges: dependencies.edges,
      totalDependencies: dependencies.nodes.length - 1
    };
  } catch (error) {
    logger.error('Error getting dependency tree:', error);
    throw error;
  }
}

/**
 * Identify circular dependencies
 */
async function findCircularDependencies(repoId) {
  try {
    logger.info(`Finding circular dependencies for repo ${repoId}`);
    
    const graph = await buildRepositoryGraph(repoId);
    const cycles = [];
    const visited = new Set();
    const recursionStack = new Set();
    
    function detectCycle(nodeId, path = []) {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        const cycle = path.slice(cycleStart);
        cycles.push(cycle);
        return true;
      }
      
      if (visited.has(nodeId)) return false;
      
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);
      
      const neighbors = graph.outNeighbors(nodeId);
      
      for (const neighborId of neighbors) {
        detectCycle(neighborId, [...path]);
      }
      
      recursionStack.delete(nodeId);
      return false;
    }
    
    // Check all nodes
    graph.forEachNode((nodeId) => {
      if (!visited.has(nodeId)) {
        detectCycle(nodeId);
      }
    });
    
    return {
      hasCycles: cycles.length > 0,
      cycles: cycles.map(cycle => ({
        nodes: cycle.map(id => graph.getNodeAttributes(id)),
        length: cycle.length
      })),
      totalCycles: cycles.length
    };
  } catch (error) {
    logger.error('Error finding circular dependencies:', error);
    throw error;
  }
}

/**
 * Export graph to React Flow format
 */
function exportToReactFlow(graphData) {
  const { nodes, edges } = graphData;
  
  const reactFlowNodes = nodes.map((node, index) => ({
    id: node.id,
    type: node.type.toLowerCase(),
    data: {
      label: node.name || node.path || node.id,
      ...node
    },
    position: {
      x: (index % 10) * 200,
      y: Math.floor(index / 10) * 150
    }
  }));
  
  const reactFlowEdges = edges.map((edge, index) => ({
    id: `edge-${index}`,
    source: edge.source,
    target: edge.target,
    type: edge.type,
    animated: edge.type === 'CALLS',
    label: edge.type
  }));
  
  return {
    nodes: reactFlowNodes,
    edges: reactFlowEdges
  };
}

module.exports = {
  buildRepositoryGraph,
  bfsTraversal,
  dfsTraversal,
  reverseTraversal,
  calculateBlastRadius,
  findShortestPath,
  getArchitectureOverview,
  getDependencyTree,
  findCircularDependencies,
  exportToReactFlow
};

// Made with Bob
