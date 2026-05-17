/**
 * Embeddings Service Orchestrator
 * 
 * Coordinates the entire embedding pipeline:
 * - Chunking code intelligently
 * - Generating embeddings with Hugging Face
 * - Indexing vectors in Qdrant
 * - Managing collections
 * 
 * This is the main entry point for all embedding operations.
 */

import HuggingFaceEmbeddings from './huggingface.js';
import QdrantService from './qdrant.js';
import CodeChunker from './chunker.js';

class EmbeddingsService {
  constructor() {
    this.embeddings = new HuggingFaceEmbeddings();
    this.vectorDB = new QdrantService();
    this.chunker = new CodeChunker();
  }

  /**
   * Initialize embeddings for a repository
   * @param {string} repoId - Repository ID
   * @param {Object[]} parseResults - Array of parse results
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} - Indexing statistics
   */
  async indexRepository(repoId, parseResults, onProgress = null) {
    console.log(`Starting embedding indexing for repository: ${repoId}`);

    try {
      // Step 1: Create Qdrant collection
      await this.vectorDB.createCollection(repoId);

      // Step 2: Chunk all parsed files
      const allChunks = [];
      for (const parseResult of parseResults) {
        const chunks = this.chunker.chunkEntities(
          parseResult.result,
          parseResult.filePath
        );
        allChunks.push(...chunks);
      }

      console.log(`Generated ${allChunks.length} chunks from ${parseResults.length} files`);

      if (allChunks.length === 0) {
        return {
          success: true,
          chunksGenerated: 0,
          vectorsIndexed: 0,
          message: 'No chunks generated',
        };
      }

      // Step 3: Generate embeddings
      const texts = allChunks.map(chunk => chunk.content);
      const vectors = await this.embeddings.embedBatch(texts, (current, total) => {
        if (onProgress) {
          const progress = Math.floor((current / total) * 50) + 25; // 25-75%
          onProgress(progress, `Generating embeddings: ${current}/${total}`);
        }
      });

      console.log(`Generated ${vectors.length} embeddings`);

      // Step 4: Prepare documents for indexing
      const documents = allChunks.map((chunk, index) => ({
        id: this.generateChunkId(repoId, index),
        vector: vectors[index],
        metadata: {
          ...chunk.metadata,
          repoId,
          content: chunk.content.substring(0, 500), // Store preview
          contentLength: chunk.content.length,
          indexedAt: new Date().toISOString(),
        },
      }));

      // Step 5: Index in Qdrant
      await this.vectorDB.indexBatch(repoId, documents, (current, total) => {
        if (onProgress) {
          const progress = Math.floor((current / total) * 25) + 75; // 75-100%
          onProgress(progress, `Indexing vectors: ${current}/${total}`);
        }
      });

      console.log(`Indexed ${documents.length} vectors in Qdrant`);

      // Step 6: Get collection stats
      const stats = await this.vectorDB.getCollectionStats(repoId);

      return {
        success: true,
        chunksGenerated: allChunks.length,
        vectorsIndexed: documents.length,
        collectionStats: stats,
      };
    } catch (error) {
      console.error('Embedding indexing failed:', error);
      throw error;
    }
  }

  /**
   * Search for similar code
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
      // Generate query embedding
      const queryVector = await this.embeddings.embed(query);

      // Search in Qdrant
      const results = await this.vectorDB.search(repoId, queryVector, {
        limit,
        filter: this.vectorDB.buildFilter(filters),
        scoreThreshold,
        withPayload: true,
      });

      return results.map(result => ({
        id: result.id,
        score: result.score,
        content: result.metadata.content,
        type: result.metadata.type,
        filePath: result.metadata.filePath,
        name: result.metadata.name || result.metadata.methodName,
        startLine: result.metadata.startLine,
        endLine: result.metadata.endLine,
      }));
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * Hybrid search with graph context
   * @param {string} repoId - Repository ID
   * @param {string} query - Search query
   * @param {Object} graphContext - Graph context for filtering
   * @param {Object} options - Search options
   * @returns {Promise<Object[]>} - Search results with graph context
   */
  async hybridSearch(repoId, query, graphContext = {}, options = {}) {
    const {
      limit = 10,
      scoreThreshold = 0.5,
    } = options;

    try {
      // Generate query embedding
      const queryVector = await this.embeddings.embed(query);

      // Build filters from graph context
      const filters = {};
      if (graphContext.filePatterns) {
        filters.filePath = graphContext.filePatterns;
      }
      if (graphContext.types) {
        filters.type = graphContext.types;
      }

      // Search with filters
      const results = await this.vectorDB.hybridSearch(
        repoId,
        queryVector,
        filters,
        { limit, scoreThreshold, withPayload: true }
      );

      return results.map(result => ({
        id: result.id,
        score: result.score,
        content: result.metadata.content,
        type: result.metadata.type,
        filePath: result.metadata.filePath,
        name: result.metadata.name || result.metadata.methodName,
        startLine: result.metadata.startLine,
        endLine: result.metadata.endLine,
        graphContext: graphContext,
      }));
    } catch (error) {
      console.error('Hybrid search failed:', error);
      throw error;
    }
  }

  /**
   * Get similar code to a specific entity
   * @param {string} repoId - Repository ID
   * @param {string} entityId - Entity ID
   * @param {number} limit - Result limit
   * @returns {Promise<Object[]>} - Similar entities
   */
  async findSimilar(repoId, entityId, limit = 5) {
    try {
      // Get entity vector from Qdrant
      const collectionName = this.vectorDB.getCollectionName(repoId);
      const point = await this.vectorDB.client.retrieve(collectionName, {
        ids: [entityId],
        with_vector: true,
      });

      if (!point || point.length === 0) {
        throw new Error(`Entity ${entityId} not found`);
      }

      const entityVector = point[0].vector;

      // Search for similar vectors
      const results = await this.vectorDB.search(repoId, entityVector, {
        limit: limit + 1, // +1 to exclude self
        withPayload: true,
      });

      // Filter out the entity itself
      return results
        .filter(result => result.id !== entityId)
        .slice(0, limit)
        .map(result => ({
          id: result.id,
          score: result.score,
          content: result.metadata.content,
          type: result.metadata.type,
          filePath: result.metadata.filePath,
          name: result.metadata.name || result.metadata.methodName,
        }));
    } catch (error) {
      console.error('Find similar failed:', error);
      throw error;
    }
  }

  /**
   * Delete repository embeddings
   * @param {string} repoId - Repository ID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteRepository(repoId) {
    try {
      await this.vectorDB.deleteCollection(repoId);
      console.log(`Deleted embeddings for repository: ${repoId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete repository embeddings:', error);
      throw error;
    }
  }

  /**
   * Get repository embedding statistics
   * @param {string} repoId - Repository ID
   * @returns {Promise<Object>} - Statistics
   */
  async getStats(repoId) {
    try {
      const stats = await this.vectorDB.getCollectionStats(repoId);
      return {
        repoId,
        vectorCount: stats.vectorCount,
        indexedVectorCount: stats.indexedVectorCount,
        status: stats.status,
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      throw error;
    }
  }

  /**
   * Generate unique chunk ID
   * @param {string} repoId - Repository ID
   * @param {number} index - Chunk index
   * @returns {string} - Chunk ID
   */
  generateChunkId(repoId, index) {
    return `${repoId}_chunk_${index}`;
  }

  /**
   * Batch re-index specific files
   * @param {string} repoId - Repository ID
   * @param {Object[]} parseResults - Parse results for updated files
   * @returns {Promise<Object>} - Re-indexing statistics
   */
  async reindexFiles(repoId, parseResults) {
    try {
      // Get existing collection
      const exists = await this.vectorDB.collectionExists(repoId);
      if (!exists) {
        throw new Error(`Collection for repository ${repoId} does not exist`);
      }

      // Chunk updated files
      const chunks = [];
      for (const parseResult of parseResults) {
        const fileChunks = this.chunker.chunkEntities(
          parseResult.result,
          parseResult.filePath
        );
        chunks.push(...fileChunks);
      }

      if (chunks.length === 0) {
        return {
          success: true,
          chunksReindexed: 0,
          message: 'No chunks to reindex',
        };
      }

      // Generate embeddings
      const texts = chunks.map(chunk => chunk.content);
      const vectors = await this.embeddings.embedBatch(texts);

      // Prepare documents
      const documents = chunks.map((chunk, index) => ({
        id: this.vectorDB.generateId(),
        vector: vectors[index],
        metadata: {
          ...chunk.metadata,
          repoId,
          content: chunk.content.substring(0, 500),
          contentLength: chunk.content.length,
          reindexedAt: new Date().toISOString(),
        },
      }));

      // Index in Qdrant
      await this.vectorDB.indexBatch(repoId, documents);

      return {
        success: true,
        chunksReindexed: documents.length,
        filesReindexed: parseResults.length,
      };
    } catch (error) {
      console.error('File re-indexing failed:', error);
      throw error;
    }
  }
}

export default EmbeddingsService;

// Made with Bob
