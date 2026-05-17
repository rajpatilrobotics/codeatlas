/**
 * DeepSeek-R1 Client Service
 * 
 * Integrates with DeepSeek-R1 API using LangChain.
 * Handles reasoning, streaming, and error handling.
 * 
 * DeepSeek-R1 is optimized for:
 * - Complex reasoning tasks
 * - Code understanding
 * - Technical analysis
 * - Multi-step problem solving
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';

class DeepSeekClient {
  constructor() {
    // DeepSeek-R1 uses OpenAI-compatible API
    this.client = new ChatOpenAI({
      modelName: 'deepseek-reasoner',
      temperature: 0.7,
      maxTokens: 4000,
      openAIApiKey: process.env.DEEPSEEK_API_KEY,
      configuration: {
        baseURL: 'https://api.deepseek.com/v1',
      },
    });

    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  /**
   * Generate response from DeepSeek-R1
   * @param {string} prompt - User prompt
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - AI response
   */
  async generate(prompt, options = {}) {
    const {
      systemPrompt = null,
      conversationHistory = [],
      temperature = 0.7,
      maxTokens = 4000,
      stream = false,
    } = options;

    try {
      // Build messages
      const messages = this.buildMessages(prompt, systemPrompt, conversationHistory);

      // Configure model
      const model = this.client.bind({
        temperature,
        max_tokens: maxTokens,
      });

      // Generate response
      if (stream) {
        return this.generateStream(model, messages);
      } else {
        return this.generateComplete(model, messages);
      }
    } catch (error) {
      console.error('DeepSeek generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate complete response
   * @param {Object} model - LangChain model
   * @param {Array} messages - Message array
   * @returns {Promise<Object>} - Response
   */
  async generateComplete(model, messages) {
    const startTime = Date.now();

    try {
      const response = await model.invoke(messages);

      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        content: response.content,
        reasoning: this.extractReasoning(response),
        metadata: {
          model: 'deepseek-reasoner',
          duration,
          tokensUsed: this.estimateTokens(response.content),
        },
      };
    } catch (error) {
      console.error('Complete generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate streaming response
   * @param {Object} model - LangChain model
   * @param {Array} messages - Message array
   * @returns {AsyncGenerator} - Streaming response
   */
  async *generateStream(model, messages) {
    try {
      const stream = await model.stream(messages);

      let fullContent = '';
      const startTime = Date.now();

      for await (const chunk of stream) {
        const content = chunk.content || '';
        fullContent += content;

        yield {
          type: 'chunk',
          content,
          fullContent,
        };
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      yield {
        type: 'complete',
        content: fullContent,
        reasoning: this.extractReasoning({ content: fullContent }),
        metadata: {
          model: 'deepseek-reasoner',
          duration,
          tokensUsed: this.estimateTokens(fullContent),
        },
      };
    } catch (error) {
      console.error('Stream generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate with automatic retry
   * @param {string} prompt - User prompt
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Response
   */
  async generateWithRetry(prompt, options = {}) {
    let lastError;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.generate(prompt, options);
      } catch (error) {
        lastError = error;

        // Don't retry on client errors
        if (error.status >= 400 && error.status < 500) {
          throw error;
        }

        // Exponential backoff
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.warn(`Generation attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Failed to generate after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Build message array for LangChain
   * @param {string} prompt - User prompt
   * @param {string} systemPrompt - System prompt
   * @param {Array} history - Conversation history
   * @returns {Array} - Message array
   */
  buildMessages(prompt, systemPrompt, history) {
    const messages = [];

    // Add system prompt
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }

    // Add conversation history
    if (history && history.length > 0) {
      history.forEach(exchange => {
        messages.push(new HumanMessage(exchange.query));
        if (exchange.response) {
          messages.push(new AIMessage(exchange.response));
        }
      });
    }

    // Add current prompt
    messages.push(new HumanMessage(prompt));

    return messages;
  }

  /**
   * Extract reasoning from response
   * DeepSeek-R1 includes reasoning in <think> tags
   * @param {Object} response - AI response
   * @returns {string|null} - Extracted reasoning
   */
  extractReasoning(response) {
    if (!response.content) {
      return null;
    }

    const thinkPattern = /<think>([\s\S]*?)<\/think>/;
    const match = response.content.match(thinkPattern);

    return match ? match[1].trim() : null;
  }

  /**
   * Remove reasoning tags from response
   * @param {string} content - Response content
   * @returns {string} - Clean content
   */
  cleanResponse(content) {
    // Remove <think> tags and their content
    return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  }

  /**
   * Estimate token count
   * @param {string} text - Text to count
   * @returns {number} - Estimated tokens
   */
  estimateTokens(text) {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate API key
   * @returns {boolean} - Is valid
   */
  validateApiKey() {
    return !!process.env.DEEPSEEK_API_KEY;
  }

  /**
   * Test connection to DeepSeek API
   * @returns {Promise<boolean>} - Connection status
   */
  async testConnection() {
    try {
      const response = await this.generate('Hello', {
        maxTokens: 10,
      });

      return !!response.content;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get model information
   * @returns {Object} - Model info
   */
  getModelInfo() {
    return {
      name: 'deepseek-reasoner',
      provider: 'DeepSeek',
      type: 'reasoning',
      contextWindow: 32000,
      maxOutputTokens: 4000,
      capabilities: [
        'code-understanding',
        'complex-reasoning',
        'technical-analysis',
        'multi-step-problem-solving',
      ],
    };
  }

  /**
   * Calculate cost estimate
   * @param {number} inputTokens - Input tokens
   * @param {number} outputTokens - Output tokens
   * @returns {number} - Cost in USD
   */
  calculateCost(inputTokens, outputTokens) {
    // DeepSeek-R1 pricing (example rates)
    const inputCostPer1M = 0.14; // $0.14 per 1M input tokens
    const outputCostPer1M = 0.28; // $0.28 per 1M output tokens

    const inputCost = (inputTokens / 1000000) * inputCostPer1M;
    const outputCost = (outputTokens / 1000000) * outputCostPer1M;

    return inputCost + outputCost;
  }
}

export default DeepSeekClient;

// Made with Bob
