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
    const graph = new Map();

    // Initialize all nodes
    const allNodes = new Set();
    relationships.forEach(rel => {
      allNodes.add(rel.source);
      allNodes.add(rel.target);
    });

    allNodes.forEach(node => {
      if (!graph.has(node)) {
        graph.set(node, []);
      }
    });

    // Add edges
    relationships.forEach(rel => {
      if (rel.type === 'DEPENDS_ON' || rel.type === 'IMPORTS' || rel.type === 'USES') {
        graph.get(rel.source).push(rel.target);
      }
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
    const {
      calculateMetrics = true,
      findCycles = true,
      detectCommunities = false
    } = options;

    // Build graph
    const graph = this.buildGraph(relationships);

    // Basic metrics
    const metrics = calculateMetrics ? this.calculateGraphMetrics(graph, entities) : {};

    // Find cycles
    const cycles = findCycles ? findStronglyConnectedComponents(graph) : [];
    const hasCycles = cycles.some(c => c.length > 1);

    // Topological sort (if no cycles)
    const topologicalOrder = !hasCycles ? topologicalSort(graph) : null;

    return {
      graph,
      metrics,
      cycles: cycles.filter(c => c.length > 1),
      hasCycles,
      topologicalOrder,
      statistics: {
        nodeCount: graph.size,
        edgeCount: relationships.length,
        cycleCount: cycles.filter(c => c.length > 1).length
      }
    };
  }

  /**
   * Calculate graph metrics
   * @param {Map} graph - Dependency graph
   * @param {Object} entities - Extracted entities
   * @returns {Object} Graph metrics
   */
  calculateGraphMetrics(graph, entities) {
    const metrics = {
      nodeCount: graph.size,
      edgeCount: 0,
      avgDegree: 0,
      maxDegree: 0,
      minDegree: Infinity,
      density: 0,
      degreeDistribution: {}
    };

    // Calculate degrees
    const degrees = [];
    graph.forEach((neighbors, node) => {
      const degree = neighbors.length;
      degrees.push(degree);
      metrics.edgeCount += degree;
      metrics.maxDegree = Math.max(metrics.maxDegree, degree);
      metrics.minDegree = Math.min(metrics.minDegree, degree);

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

    return metrics;
  }

  /**
   * Generate architecture layers
   * @param {Map} graph - Dependency graph
   * @param {Object} entities - Extracted entities
   * @returns {Object} Architecture layers
   */
  generateArchitectureLayers(graph, entities) {
    const layers = {
      presentation: [],
      business: [],
      data: [],
      utility: [],
      external: []
    };

    // Classify entities by patterns
    entities.files?.forEach(file => {
      const path = file.path.toLowerCase();

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
    const {
      type = 'dependency', // 'dependency', 'architecture', 'blast-radius'
      entityId = null,
      maxNodes = 100,
      layout = 'hierarchical'
    } = options;

    if (type === 'blast-radius' && entityId) {
      const graph = this.buildGraph(relationships);
      return generateBlastRadiusVisualization(graph, entityId, new Map(
        Object.values(entities).flat().map(e => [e.id, e])
      ));
    }

    if (type === 'architecture') {
      return this.generateArchitectureVisualization(entities, relationships);
    }

    // Default: dependency graph
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

    const nodes = [];
    const edges = [];

    // Add file nodes
    const files = (entities.files || []).slice(0, maxNodes);
    files.forEach((file, index) => {
      nodes.push({
        id: file.id,
        type: 'file',
        data: {
          label: file.path.split('/').pop(),
          path: file.path,
          language: file.language
        },
        position: this.calculatePosition(index, files.length, layout)
      });
    });

    // Add edges from relationships
    const nodeIds = new Set(nodes.map(n => n.id));
    relationships.forEach(rel => {
      if (nodeIds.has(rel.source) && nodeIds.has(rel.target)) {
        edges.push({
          id: rel.id,
          source: rel.source,
          target: rel.target,
          type: rel.type,
          label: rel.type
        });
      }
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
    const graph = this.buildGraph(relationships);
    const layers = this.generateArchitectureLayers(graph, entities);

    const nodes = [];
    const edges = [];

    // Add nodes by layer
    const layerY = { presentation: 100, business: 300, data: 500, utility: 700, external: 900 };
    
    Object.entries(layers).forEach(([layerName, entityIds]) => {
      entityIds.forEach((entityId, index) => {
        const entity = entities.files?.find(f => f.id === entityId);
        if (entity) {
          nodes.push({
            id: entityId,
            type: 'layer',
            data: {
              label: entity.path.split('/').pop(),
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

    // Add edges
    const nodeIds = new Set(nodes.map(n => n.id));
    relationships.forEach(rel => {
      if (nodeIds.has(rel.source) && nodeIds.has(rel.target)) {
        edges.push({
          id: rel.id,
          source: rel.source,
          target: rel.target,
          type: 'dependency'
        });
      }
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
