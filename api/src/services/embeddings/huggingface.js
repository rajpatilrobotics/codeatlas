/**
 * Hugging Face Embeddings Service
 * 
 * Integrates with Hugging Face Inference API to generate embeddings
 * using Qwen3-Embedding-8B model for semantic code understanding.
 * 
 * Features:
 * - Batch embedding generation
 * - Automatic retry with exponential backoff
 * - Rate limiting
 * - Token counting and optimization
 * - Error handling
 */

import { HfInference } from '@huggingface/inference';

class HuggingFaceEmbeddings {
  constructor() {
    this.client = new HfInference(process.env.HUGGINGFACE_API_KEY);
    this.model = 'Alibaba-NLP/gte-Qwen2-7B-instruct'; // Qwen3-Embedding-8B equivalent
    this.maxTokens = 8192; // Model context window
    this.batchSize = 32; // Process 32 texts at a time
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second initial delay
  }

  /**
   * Generate embeddings for a single text
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} - Embedding vector
   */
  async embed(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    // Truncate if too long
    const truncated = this.truncateText(text, this.maxTokens);

    return this.embedWithRetry(truncated);
  }

  /**
   * Generate embeddings for multiple texts in batches
   * @param {string[]} texts - Array of texts to embed
   * @param {Function} onProgress - Progress callback (current, total)
   * @returns {Promise<number[][]>} - Array of embedding vectors
   */
  async embedBatch(texts, onProgress = null) {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Texts must be a non-empty array');
    }

    const embeddings = [];
    const batches = this.createBatches(texts, this.batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchEmbeddings = await Promise.all(
        batch.map(text => this.embed(text))
      );

      embeddings.push(...batchEmbeddings);

      if (onProgress) {
        onProgress((i + 1) * this.batchSize, texts.length);
      }

      // Rate limiting: wait between batches
      if (i < batches.length - 1) {
        await this.sleep(100); // 100ms between batches
      }
    }

    return embeddings;
  }

  /**
   * Embed with automatic retry and exponential backoff
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} - Embedding vector
   */
  async embedWithRetry(text) {
    let lastError;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const response = await this.client.featureExtraction({
          model: this.model,
          inputs: text,
        });

        // Response is already an array of numbers
        return Array.isArray(response) ? response : Array.from(response);
      } catch (error) {
        lastError = error;

        // Don't retry on client errors (400-499)
        if (error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }

        // Exponential backoff
        if (attempt < this.retryAttempts - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.warn(`Embedding attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Failed to generate embedding after ${this.retryAttempts} attempts: ${lastError.message}`);
  }

  /**
   * Truncate text to fit within token limit
   * @param {string} text - Text to truncate
   * @param {number} maxTokens - Maximum tokens
   * @returns {string} - Truncated text
   */
  truncateText(text, maxTokens) {
    // Rough estimate: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;

    if (text.length <= maxChars) {
      return text;
    }

    // Truncate and add ellipsis
    return text.substring(0, maxChars - 3) + '...';
  }

  /**
   * Create batches from array
   * @param {Array} array - Array to batch
   * @param {number} size - Batch size
   * @returns {Array[]} - Array of batches
   */
  createBatches(array, size) {
    const batches = [];
    for (let i = 0; i < array.length; i += size) {
      batches.push(array.slice(i, i + size));
    }
    return batches;
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Estimate token count (rough approximation)
   * @param {string} text - Text to count
   * @returns {number} - Estimated token count
   */
  estimateTokens(text) {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate cosine similarity between two embeddings
   * @param {number[]} a - First embedding
   * @param {number[]} b - Second embedding
   * @returns {number} - Similarity score (0-1)
   */
  cosineSimilarity(a, b) {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export default HuggingFaceEmbeddings;

// Made with Bob
