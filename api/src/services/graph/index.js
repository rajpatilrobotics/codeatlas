import {
  bfs,
  dfs,
  reverseTraversal,
  findAllPaths,
  findShortestPath,
  calculateDistances,
  findStronglyConnectedComponents,
  topologicalSort
} from './traversal.js';

import {
  calculateBlastRadius,
  calculateImpactScore,
  findCriticalPaths,
  analyzeMultipleChanges,
  generateBlastRadiusVisualization
} from './blastRadius.js';

import logger from '../../utils/logger.js';

/**
 * Main Graph Service
 * Orchestrates graph generation and analysis
 */
class GraphService {
  /**
   * Build dependency graph from relationships
   * @param {Array} relationships - Extracted relationships
   * @returns {Map} Adjacency list graph
   */
  buildGraph(relationships) {
    logger.info('[GraphService] Building graph from relationships', {
      relationshipCount: relationships?.length || 0,
      sampleRelationships: relationships?.slice(0, 3).map(r => ({
        source: r.source || r.sourceId,
        target: r.target || r.targetId,
        type: r.type
      })) || []
    });

    const graph = new Map();

    if (!relationships || relationships.length === 0) {
      logger.warn('[GraphService] No relationships provided to buildGraph');
      return graph;
    }

    // Initialize all nodes
    const allNodes = new Set();
    relationships.forEach(rel => {
      const source = rel.source || rel.sourceId;
      const target = rel.target || rel.targetId;
      
      if (source) allNodes.add(source);
      if (target) allNodes.add(target);
    });

    logger.debug('[GraphService] Unique nodes identified', {
      nodeCount: allNodes.size,
      sampleNodes: Array.from(allNodes).slice(0, 5)
    });

    allNodes.forEach(node => {
      if (!graph.has(node)) {
        graph.set(node, []);
      }
    });

    // Add edges
    let edgeCount = 0;
    const edgeTypeBreakdown = {};
    
    relationships.forEach(rel => {
      const source = rel.source || rel.sourceId;
      const target = rel.target || rel.targetId;
      
      if (rel.type === 'DEPENDS_ON' || rel.type === 'IMPORTS' || rel.type === 'USES') {
        if (source && target && graph.has(source)) {
          graph.get(source).push(target);
          edgeCount++;
          edgeTypeBreakdown[rel.type] = (edgeTypeBreakdown[rel.type] || 0) + 1;
        }
      }
    });

    logger.info('[GraphService] Graph built successfully', {
      nodeCount: graph.size,
      edgeCount,
      edgeTypeBreakdown,
      avgDegree: graph.size > 0 ? (edgeCount / graph.size).toFixed(2) : 0
    });

    return graph;
  }

  /**
   * Analyze repository graph
   * @param {Object} entities - Extracted entities
   * @param {Array} relationships - Extracted relationships
   * @param {Object} options - Analysis options
   * @returns {Object} Graph analysis
   */
  async analyzeGraph(entities, relationships, options = {}) {
    logger.info('[GraphService] Starting graph analysis', {
      entitiesType: Array.isArray(entities) ? 'array' : typeof entities,
      entitiesCount: Array.isArray(entities) ? entities.length : (entities?.files?.length || 0),
      relationshipsCount: relationships?.length || 0,
      options
    });

    const {
      calculateMetrics = true,
      findCycles = true,
      detectCommunities = false
    } = options;

    // Normalize entities to expected format
    // The extraction service now returns a flat array, but graph service expects { files: [] }
    let normalizedEntities = entities;
    if (Array.isArray(entities)) {
      logger.info('[GraphService] Converting flat entity array to structured format', {
        entityCount: entities.length
      });
      normalizedEntities = { files: entities };
    }

    // Build graph (adjacency list as Map)
    const adjacencyList = this.buildGraph(relationships);

    // Convert adjacency list to nodes/edges format for compatibility
    logger.debug('[GraphService] Converting adjacency list to nodes/edges format...');
    const graphData = this.convertToNodesEdges(adjacencyList, normalizedEntities, relationships);
    logger.info('[GraphService] Graph data structure created', {
      nodeCount: graphData.nodes.length,
      edgeCount: graphData.edges.length
    });

    // Basic metrics
    logger.debug('[GraphService] Calculating graph metrics...');
    const metrics = calculateMetrics ? this.calculateGraphMetrics(adjacencyList, normalizedEntities) : {};
    logger.info('[GraphService] Graph metrics calculated', metrics);

    // Find cycles
    logger.debug('[GraphService] Finding cycles...');
    const cycles = findCycles ? findStronglyConnectedComponents(adjacencyList) : [];
    const hasCycles = cycles.some(c => c.length > 1);
    const significantCycles = cycles.filter(c => c.length > 1);
    
    logger.info('[GraphService] Cycle detection complete', {
      totalComponents: cycles.length,
      cycleCount: significantCycles.length,
      hasCycles,
      largestCycle: significantCycles.length > 0 ? Math.max(...significantCycles.map(c => c.length)) : 0
    });

    // Topological sort (if no cycles)
    const topologicalOrder = !hasCycles ? topologicalSort(adjacencyList) : null;
    if (topologicalOrder) {
      logger.debug('[GraphService] Topological sort successful', {
        orderLength: topologicalOrder.length
      });
    }

    const result = {
      graph: graphData, // Now returns { nodes: [], edges: [] } instead of Map
      adjacencyList, // Keep the Map for internal use
      metrics,
      cycles: significantCycles,
      hasCycles,
      topologicalOrder,
      statistics: {
        nodeCount: graphData.nodes.length,
        edgeCount: graphData.edges.length,
        cycleCount: significantCycles.length
      }
    };

    logger.info('[GraphService] Graph analysis complete', {
      nodeCount: result.statistics.nodeCount,
      edgeCount: result.statistics.edgeCount,
      cycleCount: result.statistics.cycleCount,
      hasCycles: result.hasCycles,
      hasTopologicalOrder: !!topologicalOrder
    });

    return result;
  }

  /**
   * Convert adjacency list (Map) to nodes/edges format
   * @param {Map} adjacencyList - Graph as adjacency list
   * @param {Object} entities - Extracted entities
   * @param {Array} relationships - Extracted relationships
   * @returns {Object} Graph with nodes and edges arrays
   */
  convertToNodesEdges(adjacencyList, entities, relationships) {
    logger.debug('[GraphService] Converting adjacency list to nodes/edges', {
      adjacencyListSize: adjacencyList.size,
      relationshipsCount: relationships?.length || 0
    });

    const nodes = [];
    const edges = [];
    
    // Create entity lookup map
    const entityMap = new Map();
    const entityArray = entities?.files || [];
    entityArray.forEach(entity => {
      entityMap.set(entity.id, entity);
    });

    // Create nodes from adjacency list keys
    adjacencyList.forEach((neighbors, nodeId) => {
      const entity = entityMap.get(nodeId);
      nodes.push({
        id: nodeId,
        type: entity?.type || 'file',
        data: {
          label: entity?.name || entity?.path?.split('/').pop() || nodeId,
          path: entity?.path,
          language: entity?.language,
          ...entity
        }
      });
    });

    // Create edges from relationships
    const nodeIds = new Set(nodes.map(n => n.id));
    relationships?.forEach((rel, index) => {
      const source = rel.source || rel.sourceId;
      const target = rel.target || rel.targetId;
      
      if (nodeIds.has(source) && nodeIds.has(target)) {
        edges.push({
          id: rel.id || `edge-${index}`,
          source,
          target,
          type: rel.type,
          label: rel.type,
          weight: rel.weight || 1
        });
      }
    });

    logger.info('[GraphService] Conversion complete', {
      nodesCreated: nodes.length,
      edgesCreated: edges.length
    });

    return { nodes, edges };
  }

  /**
   * Calculate graph metrics
   * @param {Map} graph - Dependency graph
   * @param {Object} entities - Extracted entities
   * @returns {Object} Graph metrics
   */
  calculateGraphMetrics(graph, entities) {
    logger.debug('[GraphService] Calculating graph metrics', {
      graphSize: graph.size,
      entitiesProvided: !!entities
    });

    const metrics = {
      nodeCount: graph.size,
      edgeCount: 0,
      avgDegree: 0,
      maxDegree: 0,
      minDegree: graph.size > 0 ? Infinity : 0,
      density: 0,
      degreeDistribution: {}
    };

    if (graph.size === 0) {
      logger.warn('[GraphService] Empty graph, returning zero metrics');
      return metrics;
    }

    // Calculate degrees
    const degrees = [];
    let isolatedNodes = 0;
    
    graph.forEach((neighbors, node) => {
      const degree = neighbors.length;
      degrees.push(degree);
      metrics.edgeCount += degree;
      metrics.maxDegree = Math.max(metrics.maxDegree, degree);
      metrics.minDegree = Math.min(metrics.minDegree, degree);

      if (degree === 0) {
        isolatedNodes++;
      }

      // Degree distribution
      if (!metrics.degreeDistribution[degree]) {
        metrics.degreeDistribution[degree] = 0;
      }
      metrics.degreeDistribution[degree]++;
    });

    // Calculate averages
    metrics.avgDegree = degrees.length > 0 ?
      degrees.reduce((a, b) => a + b, 0) / degrees.length : 0;

    // Calculate density
    const n = graph.size;
    metrics.density = n > 1 ? metrics.edgeCount / (n * (n - 1)) : 0;

    // Additional metrics
    metrics.isolatedNodes = isolatedNodes;
    metrics.connectedNodes = graph.size - isolatedNodes;

    logger.info('[GraphService] Metrics calculation complete', {
      nodeCount: metrics.nodeCount,
      edgeCount: metrics.edgeCount,
      avgDegree: metrics.avgDegree.toFixed(2),
      maxDegree: metrics.maxDegree,
      minDegree: metrics.minDegree,
      density: metrics.density.toFixed(4),
      isolatedNodes: metrics.isolatedNodes,
      connectedNodes: metrics.connectedNodes
    });

    return metrics;
  }

  /**
   * Generate architecture layers
   * @param {Map} graph - Dependency graph
   * @param {Object} entities - Extracted entities
   * @returns {Object} Architecture layers
   */
  generateArchitectureLayers(graph, entities) {
    logger.debug('[GraphService] Generating architecture layers', {
      graphSize: graph.size,
      filesCount: entities.files?.length || 0
    });

    const layers = {
      presentation: [],
      business: [],
      data: [],
      utility: [],
      external: []
    };

    // Classify entities by patterns
    entities.files?.forEach(file => {
      const path = file.path?.toLowerCase() || '';

      if (path.includes('component') || path.includes('view') || path.includes('page')) {
        layers.presentation.push(file.id);
      } else if (path.includes('service') || path.includes('controller') || path.includes('api')) {
        layers.business.push(file.id);
      } else if (path.includes('model') || path.includes('schema') || path.includes('repository')) {
        layers.data.push(file.id);
      } else if (path.includes('util') || path.includes('helper') || path.includes('lib')) {
        layers.utility.push(file.id);
      } else if (path.includes('node_modules') || path.startsWith('external')) {
        layers.external.push(file.id);
      } else {
        // Default to business layer
        layers.business.push(file.id);
      }
    });

    logger.info('[GraphService] Architecture layers generated', {
      presentation: layers.presentation.length,
      business: layers.business.length,
      data: layers.data.length,
      utility: layers.utility.length,
      external: layers.external.length,
      total: Object.values(layers).reduce((sum, arr) => sum + arr.length, 0)
    });

    return layers;
  }

  /**
   * Get blast radius for entity
   * @param {Map} graph - Dependency graph
   * @param {string} entityId - Entity ID
   * @param {Object} options - Options
   * @returns {Object} Blast radius analysis
   */
  getBlastRadius(graph, entityId, options = {}) {
    return calculateBlastRadius(graph, entityId, options);
  }

  /**
   * Get impact score for entity
   * @param {Map} graph - Dependency graph
   * @param {string} entityId - Entity ID
   * @returns {number} Impact score
   */
  getImpactScore(graph, entityId) {
    return calculateImpactScore(graph, entityId);
  }

  /**
   * Find critical paths
   * @param {Map} graph - Dependency graph
   * @param {string} entityId - Entity ID
   * @param {number} topN - Number of paths
   * @returns {Array} Critical paths
   */
  getCriticalPaths(graph, entityId, topN = 5) {
    return findCriticalPaths(graph, entityId, topN);
  }

  /**
   * Traverse graph using BFS
   * @param {Map} graph - Dependency graph
   * @param {string} startNode - Start node
   * @param {Object} options - Traversal options
   * @returns {Array} Traversal result
   */
  traverseBFS(graph, startNode, options = {}) {
    return bfs(graph, startNode, options);
  }

  /**
   * Traverse graph using DFS
   * @param {Map} graph - Dependency graph
   * @param {string} startNode - Start node
   * @param {Object} options - Traversal options
   * @returns {Array} Traversal result
   */
  traverseDFS(graph, startNode, options = {}) {
    return dfs(graph, startNode, options);
  }

  /**
   * Find path between nodes
   * @param {Map} graph - Dependency graph
   * @param {string} startNode - Start node
   * @param {string} endNode - End node
   * @returns {Array|null} Path or null
   */
  findPath(graph, startNode, endNode) {
    return findShortestPath(graph, startNode, endNode);
  }

  /**
   * Generate graph visualization data
   * @param {Object} entities - Extracted entities
   * @param {Array} relationships - Extracted relationships
   * @param {Object} options - Visualization options
   * @returns {Object} Visualization data for React Flow
   */
  generateVisualization(entities, relationships, options = {}) {
    logger.info('[GraphService] Generating visualization', {
      type: options.type || 'dependency',
      entityId: options.entityId,
      maxNodes: options.maxNodes || 100,
      entitiesCount: Array.isArray(entities) ? entities.length : (entities?.files?.length || 0),
      relationshipsCount: relationships?.length || 0
    });

    const {
      type = 'dependency', // 'dependency', 'architecture', 'blast-radius'
      entityId = null,
      maxNodes = 100,
      layout = 'hierarchical'
    } = options;

    if (type === 'blast-radius' && entityId) {
      logger.debug('[GraphService] Generating blast radius visualization', { entityId });
      const graph = this.buildGraph(relationships);
      return generateBlastRadiusVisualization(graph, entityId, new Map(
        Object.values(entities).flat().map(e => [e.id, e])
      ));
    }

    if (type === 'architecture') {
      logger.debug('[GraphService] Generating architecture visualization');
      return this.generateArchitectureVisualization(entities, relationships);
    }

    // Default: dependency graph
    logger.debug('[GraphService] Generating dependency visualization');
    return this.generateDependencyVisualization(entities, relationships, {
      maxNodes,
      layout
    });
  }

  /**
   * Generate dependency graph visualization
   * @param {Object} entities - Extracted entities
   * @param {Array} relationships - Extracted relationships
   * @param {Object} options - Options
   * @returns {Object} Visualization data
   */
  generateDependencyVisualization(entities, relationships, options = {}) {
    const { maxNodes = 100, layout = 'hierarchical' } = options;

    logger.debug('[GraphService] Generating dependency visualization', {
      maxNodes,
      layout,
      entitiesType: typeof entities,
      hasFiles: !!(entities?.files)
    });

    const nodes = [];
    const edges = [];

    // Normalize entities - handle both flat array and structured object
    let files = [];
    if (Array.isArray(entities)) {
      files = entities.slice(0, maxNodes);
      logger.debug('[GraphService] Using flat entity array as files', { count: files.length });
    } else if (entities?.files) {
      files = entities.files.slice(0, maxNodes);
      logger.debug('[GraphService] Using entities.files array', { count: files.length });
    } else {
      logger.warn('[GraphService] No files found in entities', { entities });
    }

    // Add file nodes
    files.forEach((file, index) => {
      nodes.push({
        id: file.id,
        type: 'file',
        data: {
          label: file.path?.split('/').pop() || file.name || file.id,
          path: file.path,
          language: file.language
        },
        position: this.calculatePosition(index, files.length, layout)
      });
    });

    logger.debug('[GraphService] Created nodes from files', { nodeCount: nodes.length });

    // Add edges from relationships
    const nodeIds = new Set(nodes.map(n => n.id));
    let edgesAdded = 0;
    let edgesSkipped = 0;
    
    relationships?.forEach(rel => {
      const source = rel.source || rel.sourceId;
      const target = rel.target || rel.targetId;
      
      if (nodeIds.has(source) && nodeIds.has(target)) {
        edges.push({
          id: rel.id,
          source,
          target,
          type: rel.type,
          label: rel.type
        });
        edgesAdded++;
      } else {
        edgesSkipped++;
      }
    });

    logger.info('[GraphService] Dependency visualization generated', {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      edgesAdded,
      edgesSkipped,
      layout
    });

    return { nodes, edges };
  }

  /**
   * Generate architecture visualization
   * @param {Object} entities - Extracted entities
   * @param {Array} relationships - Extracted relationships
   * @returns {Object} Visualization data
   */
  generateArchitectureVisualization(entities, relationships) {
    logger.info('[GraphService] Generating architecture visualization', {
      entitiesCount: entities?.files?.length || 0,
      relationshipsCount: relationships?.length || 0
    });

    // Normalize entities if needed
    let normalizedEntities = entities;
    if (Array.isArray(entities)) {
      normalizedEntities = { files: entities };
    }

    const graph = this.buildGraph(relationships);
    const layers = this.generateArchitectureLayers(graph, normalizedEntities);

    const nodes = [];
    const edges = [];

    // Add nodes by layer
    const layerY = { presentation: 100, business: 300, data: 500, utility: 700, external: 900 };
    
    Object.entries(layers).forEach(([layerName, entityIds]) => {
      entityIds.forEach((entityId, index) => {
        const entity = normalizedEntities.files?.find(f => f.id === entityId);
        if (entity) {
          nodes.push({
            id: entityId,
            type: 'layer',
            data: {
              label: entity.path?.split('/').pop() || entity.name || entityId,
              layer: layerName,
              ...entity
            },
            position: {
              x: 100 + (index * 200) % 1000,
              y: layerY[layerName]
            }
          });
        }
      });
    });

    logger.debug('[GraphService] Architecture nodes created', {
      totalNodes: nodes.length,
      byLayer: Object.entries(layers).reduce((acc, [name, ids]) => {
        acc[name] = ids.length;
        return acc;
      }, {})
    });

    // Add edges
    const nodeIds = new Set(nodes.map(n => n.id));
    let edgesAdded = 0;
    
    relationships?.forEach(rel => {
      const source = rel.source || rel.sourceId;
      const target = rel.target || rel.targetId;
      
      if (nodeIds.has(source) && nodeIds.has(target)) {
        edges.push({
          id: rel.id,
          source,
          target,
          type: 'dependency'
        });
        edgesAdded++;
      }
    });

    logger.info('[GraphService] Architecture visualization complete', {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      edgesAdded
    });

    return { nodes, edges, layers };
  }

  /**
   * Calculate node position for layout
   * @param {number} index - Node index
   * @param {number} total - Total nodes
   * @param {string} layout - Layout type
   * @returns {Object} Position {x, y}
   */
  calculatePosition(index, total, layout) {
    if (layout === 'hierarchical') {
      const level = Math.floor(index / 5);
      const posInLevel = index % 5;
      return { x: posInLevel * 250, y: level * 150 };
    } else if (layout === 'circular') {
      const angle = (index / total) * 2 * Math.PI;
      const radius = 300;
      return {
        x: Math.cos(angle) * radius + 400,
        y: Math.sin(angle) * radius + 300
      };
    } else {
      // Grid layout
      const cols = Math.ceil(Math.sqrt(total));
      const row = Math.floor(index / cols);
      const col = index % cols;
      return { x: col * 200, y: row * 150 };
    }
  }
}

// Export singleton instance
const graphService = new GraphService();
export default graphService;

// Made with Bob
