/**
 * AI Orchestration Service
 * 
 * Main orchestrator for graph-aware RAG (Retrieval-Augmented Generation).
 * Combines retrieval, graph context, and DeepSeek-R1 reasoning.
 * 
 * Pipeline:
 * 1. Retrieve relevant code context
 * 2. Build graph context
 * 3. Construct structured prompt
 * 4. Generate AI response
 * 5. Post-process and format
 */

import RetrievalService from '../retrieval/index.js';
import GraphService from '../graph/index.js';
import DeepSeekClient from './deepseek.js';
import PromptBuilder from './promptBuilder.js';

class AIService {
  constructor() {
    this.retrieval = new RetrievalService();
    this.graph = new GraphService();
    this.deepseek = new DeepSeekClient();
    this.promptBuilder = new PromptBuilder();
  }

  /**
   * Generate AI response with full RAG pipeline
   * @param {string} repoId - Repository ID
   * @param {string} query - User query
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - AI response with metadata
   */
  async generateResponse(repoId, query, options = {}) {
    const {
      conversationHistory = [],
      focusEntity = null,
      taskType = 'general',
      includeReasoning = true,
      stream = false,
    } = options;

    try {
      console.log(`Generating AI response for query: "${query}"`);

      // Step 1: Retrieve relevant code context
      const retrievalResult = await this.retrieval.retrieve(repoId, query, {
        focusEntity,
        maxResults: 10,
        diversify: true,
      });

      console.log(`Retrieved ${retrievalResult.results.length} code snippets`);

      // Step 2: Build graph context
      const graphContext = focusEntity
        ? await this.retrieval.buildGraphContext(repoId, focusEntity)
        : {};

      console.log('Built graph context');

      // Step 3: Get repository metadata
      const repoContext = await this.getRepoContext(repoId);

      // Step 4: Build structured prompt
      const prompt = this.promptBuilder.buildPrompt({
        query,
        repoContext,
        graphContext,
        retrievedContext: retrievalResult.results,
        conversationHistory,
        taskType,
      });

      console.log(`Built prompt (${this.promptBuilder.estimateTokens(prompt)} tokens)`);

      // Step 5: Generate AI response
      const aiResponse = await this.deepseek.generateWithRetry(prompt, {
        conversationHistory,
        temperature: 0.7,
        maxTokens: 4000,
        stream,
      });

      console.log('Generated AI response');

      // Step 6: Post-process response
      const processedResponse = this.postProcessResponse(aiResponse, {
        includeReasoning,
      });

      // Step 7: Build final response
      return {
        query,
        response: processedResponse.content,
        reasoning: processedResponse.reasoning,
        context: {
          retrievedSnippets: retrievalResult.results.length,
          retrievalPlan: retrievalResult.plan,
          graphContext: graphContext.focusEntity ? {
            focusEntity: graphContext.focusEntity,
            neighbors: graphContext.neighbors?.length || 0,
            dependencies: graphContext.dependencies?.length || 0,
          } : null,
        },
        metadata: {
          model: aiResponse.metadata.model,
          duration: aiResponse.metadata.duration,
          tokensUsed: aiResponse.metadata.tokensUsed,
          taskType,
        },
      };
    } catch (error) {
      console.error('AI response generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate streaming response
   * @param {string} repoId - Repository ID
   * @param {string} query - User query
   * @param {Object} options - Generation options
   * @returns {AsyncGenerator} - Streaming response
   */
  async *generateStreamingResponse(repoId, query, options = {}) {
    const {
      conversationHistory = [],
      focusEntity = null,
      taskType = 'general',
    } = options;

    try {
      // Step 1: Retrieve context (same as non-streaming)
      const retrievalResult = await this.retrieval.retrieve(repoId, query, {
        focusEntity,
        maxResults: 10,
        diversify: true,
      });

      // Yield retrieval progress
      yield {
        type: 'retrieval',
        data: {
          snippetsRetrieved: retrievalResult.results.length,
          plan: retrievalResult.plan,
        },
      };

      // Step 2: Build contexts
      const graphContext = focusEntity
        ? await this.retrieval.buildGraphContext(repoId, focusEntity)
        : {};

      const repoContext = await this.getRepoContext(repoId);

      // Step 3: Build prompt
      const prompt = this.promptBuilder.buildPrompt({
        query,
        repoContext,
        graphContext,
        retrievedContext: retrievalResult.results,
        conversationHistory,
        taskType,
      });

      // Yield prompt ready
      yield {
        type: 'prompt_ready',
        data: {
          tokens: this.promptBuilder.estimateTokens(prompt),
        },
      };

      // Step 4: Stream AI response
      const stream = await this.deepseek.generateStream(
        this.deepseek.client,
        this.deepseek.buildMessages(prompt, null, conversationHistory)
      );

      for await (const chunk of stream) {
        yield {
          type: 'ai_chunk',
          data: chunk,
        };
      }
    } catch (error) {
      yield {
        type: 'error',
        data: {
          message: error.message,
        },
      };
    }
  }

  /**
   * Explain specific code entity
   * @param {string} repoId - Repository ID
   * @param {string} entityId - Entity ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} - Explanation
   */
  async explainEntity(repoId, entityId, options = {}) {
    const { includeUsage = true, includeImpact = true } = options;

    try {
      // Build focused query
      const query = `Explain this code entity in detail: ${entityId}`;

      // Generate response with entity focus
      return this.generateResponse(repoId, query, {
        focusEntity: entityId,
        taskType: 'definition',
        ...options,
      });
    } catch (error) {
      console.error('Entity explanation failed:', error);
      throw error;
    }
  }

  /**
   * Analyze code dependencies
   * @param {string} repoId - Repository ID
   * @param {string} entityId - Entity ID
   * @returns {Promise<Object>} - Dependency analysis
   */
  async analyzeDependencies(repoId, entityId) {
    try {
      const query = `Analyze the dependencies and impact of: ${entityId}`;

      return this.generateResponse(repoId, query, {
        focusEntity: entityId,
        taskType: 'dependency',
      });
    } catch (error) {
      console.error('Dependency analysis failed:', error);
      throw error;
    }
  }

  /**
   * Debug assistance
   * @param {string} repoId - Repository ID
   * @param {string} issue - Issue description
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - Debug suggestions
   */
  async debugAssist(repoId, issue, context = {}) {
    try {
      const query = `Help debug this issue: ${issue}`;

      return this.generateResponse(repoId, query, {
        focusEntity: context.entityId,
        taskType: 'debug',
      });
    } catch (error) {
      console.error('Debug assistance failed:', error);
      throw error;
    }
  }

  /**
   * Architecture explanation
   * @param {string} repoId - Repository ID
   * @param {string} aspect - Architecture aspect to explain
   * @returns {Promise<Object>} - Architecture explanation
   */
  async explainArchitecture(repoId, aspect = 'overall') {
    try {
      const query = aspect === 'overall'
        ? 'Explain the overall architecture of this codebase'
        : `Explain the ${aspect} architecture`;

      return this.generateResponse(repoId, query, {
        taskType: 'architecture',
        maxResults: 15,
      });
    } catch (error) {
      console.error('Architecture explanation failed:', error);
      throw error;
    }
  }

  /**
   * Onboarding guide generation
   * @param {string} repoId - Repository ID
   * @param {string} focus - Focus area
   * @returns {Promise<Object>} - Onboarding guide
   */
  async generateOnboarding(repoId, focus = 'general') {
    try {
      const query = focus === 'general'
        ? 'Generate an onboarding guide for this codebase'
        : `Generate an onboarding guide focused on ${focus}`;

      return this.generateResponse(repoId, query, {
        taskType: 'onboarding',
        maxResults: 20,
      });
    } catch (error) {
      console.error('Onboarding generation failed:', error);
      throw error;
    }
  }

  /**
   * Get repository context
   * @param {string} repoId - Repository ID
   * @returns {Promise<Object>} - Repository context
   */
  async getRepoContext(repoId) {
    try {
      // TODO: Fetch from database
      // For now, return basic context
      return {
        name: repoId,
        language: 'JavaScript/TypeScript',
        architecture: 'Modular',
      };
    } catch (error) {
      console.error('Failed to get repo context:', error);
      return {};
    }
  }

  /**
   * Post-process AI response
   * @param {Object} aiResponse - Raw AI response
   * @param {Object} options - Processing options
   * @returns {Object} - Processed response
   */
  postProcessResponse(aiResponse, options = {}) {
    const { includeReasoning = true } = options;

    let content = aiResponse.content;
    let reasoning = aiResponse.reasoning;

    // Clean response (remove reasoning tags if not needed)
    if (!includeReasoning && reasoning) {
      content = this.deepseek.cleanResponse(content);
    }

    return {
      content,
      reasoning: includeReasoning ? reasoning : null,
    };
  }

  /**
   * Validate AI service health
   * @returns {Promise<Object>} - Health status
   */
  async healthCheck() {
    try {
      const deepseekStatus = await this.deepseek.testConnection();

      return {
        status: deepseekStatus ? 'healthy' : 'degraded',
        services: {
          deepseek: deepseekStatus,
          retrieval: true,
          graph: true,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get AI service capabilities
   * @returns {Object} - Capabilities
   */
  getCapabilities() {
    return {
      models: [this.deepseek.getModelInfo()],
      features: [
        'code-explanation',
        'dependency-analysis',
        'debug-assistance',
        'architecture-explanation',
        'onboarding-generation',
        'graph-aware-rag',
        'streaming-responses',
      ],
      retrieval: {
        strategies: ['semantic', 'graph', 'hybrid'],
        maxSnippets: 10,
      },
    };
  }
}

export default AIService;

// Made with Bob
