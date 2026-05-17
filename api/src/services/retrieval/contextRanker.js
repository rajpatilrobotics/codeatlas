/**
 * Context Ranking Service
 * 
 * Ranks and scores retrieval results based on multiple factors:
 * - Semantic similarity
 * - Graph proximity
 * - Code importance
 * - Recency
 * - Type relevance
 * 
 * Implements sophisticated ranking algorithms for optimal context selection.
 */

class ContextRanker {
  constructor() {
    // Ranking weights
    this.weights = {
      semanticScore: 0.4,      // 40% - Vector similarity
      graphProximity: 0.25,    // 25% - Graph distance
      codeImportance: 0.20,    // 20% - Entity importance
      typeRelevance: 0.10,     // 10% - Type matching
      recency: 0.05,           // 5% - Recent changes
    };

    // Type importance scores
    this.typeScores = {
      function: 1.0,
      class: 0.95,
      method: 0.9,
      variable: 0.7,
      imports: 0.5,
      exports: 0.6,
      file: 0.4,
    };
  }

  /**
   * Rank retrieval results with graph context
   * @param {Object[]} results - Retrieval results
   * @param {Object} graphContext - Graph context
   * @param {Object} options - Ranking options
   * @returns {Object[]} - Ranked results
   */
  rank(results, graphContext = {}, options = {}) {
    const {
      focusEntity = null,
      queryType = null,
      maxResults = 10,
    } = options;

    // Calculate scores for each result
    const scored = results.map(result => {
      const scores = {
        semantic: result.score || 0,
        graph: this.calculateGraphProximity(result, graphContext, focusEntity),
        importance: this.calculateImportance(result, graphContext),
        type: this.calculateTypeRelevance(result, queryType),
        recency: this.calculateRecency(result),
      };

      // Weighted total score
      const totalScore = 
        scores.semantic * this.weights.semanticScore +
        scores.graph * this.weights.graphProximity +
        scores.importance * this.weights.codeImportance +
        scores.type * this.weights.typeRelevance +
        scores.recency * this.weights.recency;

      return {
        ...result,
        scores,
        totalScore,
      };
    });

    // Sort by total score
    scored.sort((a, b) => b.totalScore - a.totalScore);

    // Return top results
    return scored.slice(0, maxResults);
  }

  /**
   * Calculate graph proximity score
   * @param {Object} result - Retrieval result
   * @param {Object} graphContext - Graph context
   * @param {string} focusEntity - Focus entity ID
   * @returns {number} - Proximity score (0-1)
   */
  calculateGraphProximity(result, graphContext, focusEntity) {
    if (!graphContext.graph || !focusEntity) {
      return 0.5; // Neutral score if no graph context
    }

    const resultEntityId = this.getEntityId(result);
    if (!resultEntityId) {
      return 0.5;
    }

    // Calculate shortest path distance
    const distance = this.getGraphDistance(
      graphContext.graph,
      focusEntity,
      resultEntityId
    );

    if (distance === null) {
      return 0.3; // Not connected
    }

    // Convert distance to score (closer = higher score)
    // Distance 0 = 1.0, Distance 1 = 0.9, Distance 2 = 0.7, etc.
    const score = Math.max(0, 1.0 - (distance * 0.15));
    return score;
  }

  /**
   * Calculate code importance score
   * @param {Object} result - Retrieval result
   * @param {Object} graphContext - Graph context
   * @returns {number} - Importance score (0-1)
   */
  calculateImportance(result, graphContext) {
    let score = 0.5; // Base score

    // Factor 1: Number of dependencies (incoming edges)
    if (graphContext.graph) {
      const entityId = this.getEntityId(result);
      const inDegree = this.getInDegree(graphContext.graph, entityId);
      
      // Normalize: 0 deps = 0.5, 5+ deps = 1.0
      score += Math.min(0.3, inDegree * 0.06);
    }

    // Factor 2: File location (src files more important than tests)
    if (result.filePath) {
      if (result.filePath.includes('/src/')) {
        score += 0.1;
      }
      if (result.filePath.includes('/test/') || result.filePath.includes('/__tests__/')) {
        score -= 0.1;
      }
      if (result.filePath.includes('/utils/') || result.filePath.includes('/helpers/')) {
        score += 0.05;
      }
    }

    // Factor 3: Code length (longer = more important, up to a point)
    if (result.contentLength) {
      const lengthScore = Math.min(0.1, result.contentLength / 5000);
      score += lengthScore;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate type relevance score
   * @param {Object} result - Retrieval result
   * @param {string} queryType - Query type hint
   * @returns {number} - Type relevance score (0-1)
   */
  calculateTypeRelevance(result, queryType) {
    const resultType = result.type || 'unknown';
    
    // Base score from type importance
    let score = this.typeScores[resultType] || 0.5;

    // Boost if type matches query type
    if (queryType && resultType === queryType) {
      score = Math.min(1.0, score + 0.2);
    }

    return score;
  }

  /**
   * Calculate recency score
   * @param {Object} result - Retrieval result
   * @returns {number} - Recency score (0-1)
   */
  calculateRecency(result) {
    if (!result.indexedAt && !result.reindexedAt) {
      return 0.5; // Neutral if no timestamp
    }

    const timestamp = result.reindexedAt || result.indexedAt;
    const date = new Date(timestamp);
    const now = new Date();
    const ageInDays = (now - date) / (1000 * 60 * 60 * 24);

    // Recent = higher score
    // 0 days = 1.0, 7 days = 0.8, 30 days = 0.5, 90+ days = 0.3
    if (ageInDays < 7) {
      return 1.0 - (ageInDays * 0.03);
    } else if (ageInDays < 30) {
      return 0.8 - ((ageInDays - 7) * 0.013);
    } else if (ageInDays < 90) {
      return 0.5 - ((ageInDays - 30) * 0.003);
    } else {
      return 0.3;
    }
  }

  /**
   * Get entity ID from result
   * @param {Object} result - Retrieval result
   * @returns {string|null} - Entity ID
   */
  getEntityId(result) {
    // Try to construct entity ID from metadata
    if (result.id) {
      return result.id;
    }

    if (result.filePath && result.name) {
      return `${result.filePath}:${result.name}`;
    }

    return null;
  }

  /**
   * Get graph distance between two entities
   * @param {Object} graph - Graph object
   * @param {string} sourceId - Source entity ID
   * @param {string} targetId - Target entity ID
   * @returns {number|null} - Distance or null if not connected
   */
  getGraphDistance(graph, sourceId, targetId) {
    if (!graph.nodes || !graph.edges) {
      return null;
    }

    // BFS to find shortest path
    const queue = [{ id: sourceId, distance: 0 }];
    const visited = new Set([sourceId]);

    while (queue.length > 0) {
      const { id, distance } = queue.shift();

      if (id === targetId) {
        return distance;
      }

      // Find neighbors
      const neighbors = graph.edges
        .filter(edge => edge.source === id)
        .map(edge => edge.target);

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ id: neighbor, distance: distance + 1 });
        }
      }
    }

    return null; // Not connected
  }

  /**
   * Get in-degree (number of incoming edges)
   * @param {Object} graph - Graph object
   * @param {string} entityId - Entity ID
   * @returns {number} - In-degree
   */
  getInDegree(graph, entityId) {
    if (!graph.edges || !entityId) {
      return 0;
    }

    return graph.edges.filter(edge => edge.target === entityId).length;
  }

  /**
   * Diversify results to avoid redundancy
   * @param {Object[]} rankedResults - Ranked results
   * @param {Object} options - Diversification options
   * @returns {Object[]} - Diversified results
   */
  diversify(rankedResults, options = {}) {
    const {
      maxPerFile = 3,
      maxPerType = 5,
    } = options;

    const diversified = [];
    const fileCount = {};
    const typeCount = {};

    for (const result of rankedResults) {
      const file = result.filePath || 'unknown';
      const type = result.type || 'unknown';

      // Check file limit
      if (fileCount[file] >= maxPerFile) {
        continue;
      }

      // Check type limit
      if (typeCount[type] >= maxPerType) {
        continue;
      }

      // Add result
      diversified.push(result);
      fileCount[file] = (fileCount[file] || 0) + 1;
      typeCount[type] = (typeCount[type] || 0) + 1;
    }

    return diversified;
  }

  /**
   * Group results by file for better context
   * @param {Object[]} results - Results to group
   * @returns {Object} - Grouped results
   */
  groupByFile(results) {
    const grouped = {};

    for (const result of results) {
      const file = result.filePath || 'unknown';
      
      if (!grouped[file]) {
        grouped[file] = [];
      }

      grouped[file].push(result);
    }

    return grouped;
  }

  /**
   * Calculate aggregate statistics for results
   * @param {Object[]} results - Results
   * @returns {Object} - Statistics
   */
  calculateStats(results) {
    if (results.length === 0) {
      return {
        count: 0,
        avgScore: 0,
        typeDistribution: {},
        fileDistribution: {},
      };
    }

    const typeDistribution = {};
    const fileDistribution = {};
    let totalScore = 0;

    for (const result of results) {
      totalScore += result.totalScore || 0;

      const type = result.type || 'unknown';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;

      const file = result.filePath || 'unknown';
      fileDistribution[file] = (fileDistribution[file] || 0) + 1;
    }

    return {
      count: results.length,
      avgScore: totalScore / results.length,
      typeDistribution,
      fileDistribution,
    };
  }
}

export default ContextRanker;

// Made with Bob
