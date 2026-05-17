/**
 * Semantic Retrieval Service
 * 
 * Main orchestrator for intelligent code retrieval.
 * Combines embeddings, graph context, and ranking for optimal results.
 * 
 * Features:
 * - Intent-based retrieval planning
 * - Graph-aware context ranking
 * - Multiple retrieval strategies
 * - Result diversification
 * - Context expansion
 */

import EmbeddingsService from '../embeddings/index.js';
import graphService from '../graph/index.js';
import ContextRanker from './contextRanker.js';
import RetrievalPlanner from './retrievalPlanner.js';

class RetrievalService {
  constructor() {
    this.embeddings = new EmbeddingsService();
    this.graph = graphService;
    this.ranker = new ContextRanker();
    this.planner = new RetrievalPlanner(this.embeddings, this.graph);
  }

  /**
   * Intelligent retrieval with automatic planning
   * @param {string} repoId - Repository ID
   * @param {string} query - User query
   * @param {Object} options - Retrieval options
   * @returns {Promise<Object>} - Retrieval results with metadata
   */
  async retrieve(repoId, query, options = {}) {
    const {
      graphContext = {},
      focusEntity = null,
      maxResults = 10,
      includeStats = true,
      diversify = true,
      expand = false,
    } = options;

    try {
      console.log(`Starting retrieval for query: "${query}"`);

      // Step 1: Plan retrieval strategy
      const plan = this.planner.planRetrieval(query, {
        ...graphContext,
        focusEntity,
      });

      console.log(`Retrieval plan:`, {
        strategy: plan.strategy,
        intent: plan.intent,
        entities: plan.entities,
      });

      // Step 2: Execute retrieval
      const rawResults = await this.planner.executeRetrieval(
        repoId,
        plan,
        graphContext
      );

      console.log(`Retrieved ${rawResults.length} raw results`);

      // Step 3: Rank results with graph context
      const rankedResults = this.ranker.rank(rawResults, graphContext, {
        focusEntity,
        queryType: plan.intent[0],
        maxResults: maxResults * 2, // Get more for diversification
      });

      console.log(`Ranked ${rankedResults.length} results`);

      // Step 4: Diversify results (optional)
      let finalResults = rankedResults;
      if (diversify) {
        finalResults = this.ranker.diversify(rankedResults, {
          maxPerFile: 3,
          maxPerType: 5,
        });
        console.log(`Diversified to ${finalResults.length} results`);
      }

      // Step 5: Expand results (optional)
      if (expand && finalResults.length < maxResults) {
        finalResults = await this.planner.expandResults(
          repoId,
          finalResults,
          graphContext,
          maxResults - finalResults.length
        );
        console.log(`Expanded to ${finalResults.length} results`);
      }

      // Step 6: Limit to max results
      finalResults = finalResults.slice(0, maxResults);

      // Step 7: Calculate statistics
      const stats = includeStats
        ? this.ranker.calculateStats(finalResults)
        : null;

      return {
        query,
        plan: {
          strategy: plan.strategy,
          intent: plan.intent,
          entities: plan.entities,
        },
        results: finalResults.map(r => this.formatResult(r)),
        stats,
        metadata: {
          totalRetrieved: rawResults.length,
          totalRanked: rankedResults.length,
          totalReturned: finalResults.length,
        },
      };
    } catch (error) {
      console.error('Retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Simple semantic search (no planning)
   * @param {string} repoId - Repository ID
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object[]>} - Search results
   */
  async search(repoId, query, options = {}) {
    const {
      limit = 10,
      filters = {},
      scoreThreshold = 0.5,
    } = options;

    try {
      const results = await this.embeddings.search(repoId, query, {
        limit,
        filters,
        scoreThreshold,
      });

      return results.map(r => this.formatResult(r));
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * Find similar code to a specific entity
   * @param {string} repoId - Repository ID
   * @param {string} entityId - Entity ID
   * @param {Object} options - Options
   * @returns {Promise<Object[]>} - Similar entities
   */
  async findSimilar(repoId, entityId, options = {}) {
    const { limit = 5, includeGraph = true } = options;

    try {
      const results = await this.embeddings.findSimilar(repoId, entityId, limit);

      // Optionally enrich with graph context
      if (includeGraph) {
        // TODO: Add graph context to results
      }

      return results.map(r => this.formatResult(r));
    } catch (error) {
      console.error('Find similar failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve context for a specific code location
   * @param {string} repoId - Repository ID
   * @param {Object} location - Code location
   * @param {Object} options - Options
   * @returns {Promise<Object>} - Context results
   */
  async getContext(repoId, location, options = {}) {
    const {
      radius = 2, // Graph hops
      maxResults = 15,
    } = options;

    try {
      const { filePath, line, entityId } = location;

      // Build graph context
      const graphContext = {};
      if (entityId) {
        // Get graph neighbors
        const graph = await this.graph.getGraph(repoId);
        const neighbors = this.graph.getNeighbors(graph, entityId, radius);
        graphContext.neighbors = neighbors;
      }

      // Retrieve related code
      const query = `code at ${filePath}:${line}`;
      const results = await this.retrieve(repoId, query, {
        graphContext,
        focusEntity: entityId,
        maxResults,
        diversify: true,
      });

      return results;
    } catch (error) {
      console.error('Get context failed:', error);
      throw error;
    }
  }

  /**
   * Multi-query retrieval (batch)
   * @param {string} repoId - Repository ID
   * @param {string[]} queries - Multiple queries
   * @param {Object} options - Options
   * @returns {Promise<Object[]>} - Results for each query
   */
  async retrieveBatch(repoId, queries, options = {}) {
    const results = [];

    for (const query of queries) {
      try {
        const result = await this.retrieve(repoId, query, options);
        results.push(result);
      } catch (error) {
        console.error(`Batch retrieval failed for query "${query}":`, error);
        results.push({
          query,
          error: error.message,
          results: [],
        });
      }
    }

    return results;
  }

  /**
   * Get retrieval statistics for a repository
   * @param {string} repoId - Repository ID
   * @returns {Promise<Object>} - Statistics
   */
  async getStats(repoId) {
    try {
      const embeddingStats = await this.embeddings.getStats(repoId);
      const graphStats = await this.graph.getStats(repoId);

      return {
        embeddings: embeddingStats,
        graph: graphStats,
        retrievalCapabilities: {
          semanticSearch: true,
          graphTraversal: true,
          hybridRetrieval: true,
          contextRanking: true,
        },
      };
    } catch (error) {
      console.error('Get stats failed:', error);
      throw error;
    }
  }

  /**
   * Format result for API response
   * @param {Object} result - Raw result
   * @returns {Object} - Formatted result
   */
  formatResult(result) {
    return {
      id: result.id,
      type: result.type,
      name: result.name,
      filePath: result.filePath,
      startLine: result.startLine,
      endLine: result.endLine,
      content: result.content,
      score: result.score || result.totalScore,
      scores: result.scores,
      metadata: {
        contentLength: result.contentLength,
        indexedAt: result.indexedAt,
        reindexedAt: result.reindexedAt,
      },
    };
  }

  /**
   * Build retrieval context from graph
   * @param {string} repoId - Repository ID
   * @param {string} entityId - Focus entity ID
   * @param {number} radius - Graph radius
   * @returns {Promise<Object>} - Graph context
   */
  async buildGraphContext(repoId, entityId, radius = 2) {
    try {
      const graph = await this.graph.getGraph(repoId);
      
      if (!graph || !entityId) {
        return {};
      }

      const neighbors = this.graph.getNeighbors(graph, entityId, radius);
      const dependencies = this.graph.getDependencies(graph, entityId);
      const dependents = this.graph.getDependents(graph, entityId);

      return {
        graph,
        focusEntity: entityId,
        neighbors,
        dependencies,
        dependents,
      };
    } catch (error) {
      console.error('Build graph context failed:', error);
      return {};
    }
  }

  /**
   * Retrieve with automatic context building
   * @param {string} repoId - Repository ID
   * @param {string} query - User query
   * @param {string} entityId - Focus entity (optional)
   * @param {Object} options - Options
   * @returns {Promise<Object>} - Retrieval results
   */
  async retrieveWithContext(repoId, query, entityId = null, options = {}) {
    try {
      // Build graph context if entity provided
      const graphContext = entityId
        ? await this.buildGraphContext(repoId, entityId)
        : {};

      // Retrieve with context
      return this.retrieve(repoId, query, {
        ...options,
        graphContext,
        focusEntity: entityId,
      });
    } catch (error) {
      console.error('Retrieve with context failed:', error);
      throw error;
    }
  }

  /**
   * Clear retrieval cache (if implemented)
   * @param {string} repoId - Repository ID
   * @returns {Promise<boolean>} - Success status
   */
  async clearCache(repoId) {
    // TODO: Implement caching layer
    console.log(`Cache clearing not implemented for ${repoId}`);
    return true;
  }
}

export default RetrievalService;

// Made with Bob
