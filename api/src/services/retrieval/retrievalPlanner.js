/**
 * Retrieval Planner Service
 * 
 * Plans and executes intelligent retrieval strategies based on query intent.
 * Combines semantic search with graph traversal for optimal context.
 * 
 * Strategies:
 * - Semantic-first: Pure vector search
 * - Graph-first: Traverse from known entities
 * - Hybrid: Combine both approaches
 * - Focused: Target specific code areas
 */

class RetrievalPlanner {
  constructor(embeddingsService, graphService) {
    this.embeddings = embeddingsService;
    this.graph = graphService;

    // Query intent patterns
    this.intentPatterns = {
      definition: /what is|define|explain|describe/i,
      usage: /how to use|usage|example|call/i,
      dependency: /depends on|requires|imports|uses/i,
      impact: /impact|affect|change|break/i,
      implementation: /implement|code|function|class/i,
      debug: /error|bug|issue|problem|fix/i,
    };

    // Retrieval strategies
    this.strategies = {
      SEMANTIC_FIRST: 'semantic_first',
      GRAPH_FIRST: 'graph_first',
      HYBRID: 'hybrid',
      FOCUSED: 'focused',
    };
  }

  /**
   * Plan retrieval strategy based on query
   * @param {string} query - User query
   * @param {Object} context - Additional context
   * @returns {Object} - Retrieval plan
   */
  planRetrieval(query, context = {}) {
    const intent = this.detectIntent(query);
    const entities = this.extractEntities(query);
    const strategy = this.selectStrategy(intent, entities, context);

    return {
      query,
      intent,
      entities,
      strategy,
      filters: this.buildFilters(intent, entities, context),
      limit: this.calculateLimit(strategy),
    };
  }

  /**
   * Detect query intent
   * @param {string} query - User query
   * @returns {string[]} - Detected intents
   */
  detectIntent(query) {
    const intents = [];

    for (const [intent, pattern] of Object.entries(this.intentPatterns)) {
      if (pattern.test(query)) {
        intents.push(intent);
      }
    }

    // Default to 'definition' if no intent detected
    if (intents.length === 0) {
      intents.push('definition');
    }

    return intents;
  }

  /**
   * Extract entity names from query
   * @param {string} query - User query
   * @returns {string[]} - Extracted entities
   */
  extractEntities(query) {
    const entities = [];

    // Extract camelCase/PascalCase identifiers
    const identifierPattern = /\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b|\b[a-z]+(?:[A-Z][a-z]+)+\b/g;
    const matches = query.match(identifierPattern);

    if (matches) {
      entities.push(...matches);
    }

    // Extract quoted strings
    const quotedPattern = /"([^"]+)"|'([^']+)'/g;
    let match;
    while ((match = quotedPattern.exec(query)) !== null) {
      entities.push(match[1] || match[2]);
    }

    return [...new Set(entities)]; // Remove duplicates
  }

  /**
   * Select optimal retrieval strategy
   * @param {string[]} intents - Detected intents
   * @param {string[]} entities - Extracted entities
   * @param {Object} context - Additional context
   * @returns {string} - Strategy name
   */
  selectStrategy(intents, entities, context) {
    // If we have a focus entity in context, use graph-first
    if (context.focusEntity) {
      return this.strategies.GRAPH_FIRST;
    }

    // If query mentions specific entities, use hybrid
    if (entities.length > 0) {
      return this.strategies.HYBRID;
    }

    // For dependency/impact queries, prefer graph-first
    if (intents.includes('dependency') || intents.includes('impact')) {
      return this.strategies.GRAPH_FIRST;
    }

    // For definition/usage queries, prefer semantic-first
    if (intents.includes('definition') || intents.includes('usage')) {
      return this.strategies.SEMANTIC_FIRST;
    }

    // Default to hybrid
    return this.strategies.HYBRID;
  }

  /**
   * Build filters based on intent and context
   * @param {string[]} intents - Detected intents
   * @param {string[]} entities - Extracted entities
   * @param {Object} context - Additional context
   * @returns {Object} - Filters
   */
  buildFilters(intents, entities, context) {
    const filters = {};

    // Filter by type based on intent
    if (intents.includes('definition')) {
      filters.type = ['function', 'class', 'method'];
    } else if (intents.includes('dependency')) {
      filters.type = ['imports', 'function', 'class'];
    } else if (intents.includes('implementation')) {
      filters.type = ['function', 'method', 'class'];
    }

    // Filter by file patterns if provided
    if (context.filePatterns) {
      filters.filePath = context.filePatterns;
    }

    // Filter by specific entities
    if (entities.length > 0) {
      filters.name = entities;
    }

    return filters;
  }

  /**
   * Calculate result limit based on strategy
   * @param {string} strategy - Strategy name
   * @returns {number} - Result limit
   */
  calculateLimit(strategy) {
    switch (strategy) {
      case this.strategies.SEMANTIC_FIRST:
        return 15;
      case this.strategies.GRAPH_FIRST:
        return 20;
      case this.strategies.HYBRID:
        return 25;
      case this.strategies.FOCUSED:
        return 10;
      default:
        return 15;
    }
  }

  /**
   * Execute retrieval plan
   * @param {string} repoId - Repository ID
   * @param {Object} plan - Retrieval plan
   * @param {Object} graphContext - Graph context
   * @returns {Promise<Object[]>} - Retrieved results
   */
  async executeRetrieval(repoId, plan, graphContext = {}) {
    switch (plan.strategy) {
      case this.strategies.SEMANTIC_FIRST:
        return this.semanticFirstRetrieval(repoId, plan);

      case this.strategies.GRAPH_FIRST:
        return this.graphFirstRetrieval(repoId, plan, graphContext);

      case this.strategies.HYBRID:
        return this.hybridRetrieval(repoId, plan, graphContext);

      case this.strategies.FOCUSED:
        return this.focusedRetrieval(repoId, plan, graphContext);

      default:
        return this.semanticFirstRetrieval(repoId, plan);
    }
  }

  /**
   * Semantic-first retrieval
   * @param {string} repoId - Repository ID
   * @param {Object} plan - Retrieval plan
   * @returns {Promise<Object[]>} - Results
   */
  async semanticFirstRetrieval(repoId, plan) {
    return this.embeddings.search(repoId, plan.query, {
      limit: plan.limit,
      filters: plan.filters,
      scoreThreshold: 0.5,
    });
  }

  /**
   * Graph-first retrieval
   * @param {string} repoId - Repository ID
   * @param {Object} plan - Retrieval plan
   * @param {Object} graphContext - Graph context
   * @returns {Promise<Object[]>} - Results
   */
  async graphFirstRetrieval(repoId, plan, graphContext) {
    const results = [];

    // Start from focus entity if available
    if (graphContext.focusEntity) {
      // Get neighbors from graph
      const neighbors = this.graph.getNeighbors(
        graphContext.graph,
        graphContext.focusEntity,
        2 // 2 hops
      );

      // Retrieve embeddings for neighbors
      for (const neighbor of neighbors.slice(0, plan.limit)) {
        try {
          const similar = await this.embeddings.findSimilar(
            repoId,
            neighbor.id,
            3
          );
          results.push(...similar);
        } catch (error) {
          console.warn(`Failed to retrieve neighbor ${neighbor.id}:`, error);
        }
      }
    }

    // Supplement with semantic search
    if (results.length < plan.limit) {
      const semanticResults = await this.semanticFirstRetrieval(repoId, plan);
      results.push(...semanticResults);
    }

    return results.slice(0, plan.limit);
  }

  /**
   * Hybrid retrieval (combine semantic + graph)
   * @param {string} repoId - Repository ID
   * @param {Object} plan - Retrieval plan
   * @param {Object} graphContext - Graph context
   * @returns {Promise<Object[]>} - Results
   */
  async hybridRetrieval(repoId, plan, graphContext) {
    // Get semantic results
    const semanticResults = await this.embeddings.hybridSearch(
      repoId,
      plan.query,
      graphContext,
      {
        limit: Math.floor(plan.limit * 0.7), // 70% semantic
        scoreThreshold: 0.5,
      }
    );

    // Get graph-based results
    let graphResults = [];
    if (graphContext.focusEntity) {
      graphResults = await this.graphFirstRetrieval(
        repoId,
        { ...plan, limit: Math.floor(plan.limit * 0.3) }, // 30% graph
        graphContext
      );
    }

    // Combine and deduplicate
    const combined = [...semanticResults, ...graphResults];
    const unique = this.deduplicateResults(combined);

    return unique.slice(0, plan.limit);
  }

  /**
   * Focused retrieval (specific code area)
   * @param {string} repoId - Repository ID
   * @param {Object} plan - Retrieval plan
   * @param {Object} graphContext - Graph context
   * @returns {Promise<Object[]>} - Results
   */
  async focusedRetrieval(repoId, plan, graphContext) {
    // Use hybrid search with strict filters
    return this.embeddings.hybridSearch(
      repoId,
      plan.query,
      graphContext,
      {
        limit: plan.limit,
        scoreThreshold: 0.6, // Higher threshold for focused search
      }
    );
  }

  /**
   * Deduplicate results by ID
   * @param {Object[]} results - Results to deduplicate
   * @returns {Object[]} - Deduplicated results
   */
  deduplicateResults(results) {
    const seen = new Set();
    const unique = [];

    for (const result of results) {
      if (!seen.has(result.id)) {
        seen.add(result.id);
        unique.push(result);
      }
    }

    return unique;
  }

  /**
   * Expand results with related entities
   * @param {string} repoId - Repository ID
   * @param {Object[]} results - Initial results
   * @param {Object} graphContext - Graph context
   * @param {number} expansionLimit - Max entities to add
   * @returns {Promise<Object[]>} - Expanded results
   */
  async expandResults(repoId, results, graphContext, expansionLimit = 5) {
    const expanded = [...results];

    for (const result of results.slice(0, 3)) { // Expand top 3 results
      try {
        const similar = await this.embeddings.findSimilar(
          repoId,
          result.id,
          2
        );

        expanded.push(...similar);

        if (expanded.length >= results.length + expansionLimit) {
          break;
        }
      } catch (error) {
        console.warn(`Failed to expand result ${result.id}:`, error);
      }
    }

    return this.deduplicateResults(expanded);
  }
}

export default RetrievalPlanner;

// Made with Bob
