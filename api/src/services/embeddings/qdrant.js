/**
 * Qdrant Vector Database Service
 * 
 * Manages vector storage and retrieval using Qdrant Cloud.
 * Handles collections, indexing, and semantic search.
 * 
 * Features:
 * - Collection management
 * - Vector indexing with metadata
 * - Semantic search
 * - Hybrid search (vector + filters)
 * - Batch operations
 * - Collection statistics
 */

import { QdrantClient } from '@qdrant/js-client-rest';

class QdrantService {
  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });

    this.collectionPrefix = 'codeatlas_';
    this.vectorSize = 1024; // Qwen3-Embedding-8B dimension
    this.distance = 'Cosine'; // Cosine similarity
  }

  /**
   * Get collection name for a repository
   * @param {string} repoId - Repository ID
   * @returns {string} - Collection name
   */
  getCollectionName(repoId) {
    return `${this.collectionPrefix}${repoId}`;
  }

  /**
   * Create a collection for a repository
   * @param {string} repoId - Repository ID
   * @returns {Promise<boolean>} - Success status
   */
  async createCollection(repoId) {
    const collectionName = this.getCollectionName(repoId);

    try {
      // Check if collection exists
      const exists = await this.collectionExists(repoId);
      if (exists) {
        console.log(`Collection ${collectionName} already exists`);
        return true;
      }

      // Create collection
      await this.client.createCollection(collectionName, {
        vectors: {
          size: this.vectorSize,
          distance: this.distance,
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 2,
      });

      console.log(`Created collection: ${collectionName}`);
      return true;
    } catch (error) {
      console.error(`Failed to create collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Check if collection exists
   * @param {string} repoId - Repository ID
   * @returns {Promise<boolean>} - Exists status
   */
  async collectionExists(repoId) {
    const collectionName = this.getCollectionName(repoId);

    try {
      const collections = await this.client.getCollections();
      return collections.collections.some(c => c.name === collectionName);
    } catch (error) {
      console.error(`Failed to check collection existence:`, error);
      return false;
    }
  }

  /**
   * Delete a collection
   * @param {string} repoId - Repository ID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteCollection(repoId) {
    const collectionName = this.getCollectionName(repoId);

    try {
      await this.client.deleteCollection(collectionName);
      console.log(`Deleted collection: ${collectionName}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Index a single document
   * @param {string} repoId - Repository ID
   * @param {Object} document - Document to index
   * @returns {Promise<string>} - Point ID
   */
  async indexDocument(repoId, document) {
    const { id, vector, metadata } = document;

    if (!vector || !Array.isArray(vector)) {
      throw new Error('Document must have a vector array');
    }

    if (vector.length !== this.vectorSize) {
      throw new Error(`Vector size must be ${this.vectorSize}`);
    }

    const collectionName = this.getCollectionName(repoId);

    try {
      await this.client.upsert(collectionName, {
        wait: true,
        points: [
          {
            id: id || this.generateId(),
            vector,
            payload: metadata || {},
          },
        ],
      });

      return id;
    } catch (error) {
      console.error(`Failed to index document:`, error);
      throw error;
    }
  }

  /**
   * Index multiple documents in batch
   * @param {string} repoId - Repository ID
   * @param {Object[]} documents - Documents to index
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<string[]>} - Point IDs
   */
  async indexBatch(repoId, documents, onProgress = null) {
    if (!Array.isArray(documents) || documents.length === 0) {
      throw new Error('Documents must be a non-empty array');
    }

    const collectionName = this.getCollectionName(repoId);
    const batchSize = 100; // Qdrant recommended batch size
    const batches = this.createBatches(documents, batchSize);
    const ids = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const points = batch.map(doc => ({
        id: doc.id || this.generateId(),
        vector: doc.vector,
        payload: doc.metadata || {},
      }));

      try {
        await this.client.upsert(collectionName, {
          wait: true,
          points,
        });

        ids.push(...points.map(p => p.id));

        if (onProgress) {
          onProgress((i + 1) * batchSize, documents.length);
        }
      } catch (error) {
        console.error(`Failed to index batch ${i + 1}:`, error);
        throw error;
      }
    }

    return ids;
  }

  /**
   * Search for similar vectors
   * @param {string} repoId - Repository ID
   * @param {number[]} queryVector - Query vector
   * @param {Object} options - Search options
   * @returns {Promise<Object[]>} - Search results
   */
  async search(repoId, queryVector, options = {}) {
    const {
      limit = 10,
      filter = null,
      scoreThreshold = 0.0,
      withPayload = true,
      withVector = false,
    } = options;

    if (!queryVector || !Array.isArray(queryVector)) {
      throw new Error('Query vector must be an array');
    }

    if (queryVector.length !== this.vectorSize) {
      throw new Error(`Query vector size must be ${this.vectorSize}`);
    }

    const collectionName = this.getCollectionName(repoId);

    try {
      const results = await this.client.search(collectionName, {
        vector: queryVector,
        limit,
        filter,
        score_threshold: scoreThreshold,
        with_payload: withPayload,
        with_vector: withVector,
      });

      return results.map(result => ({
        id: result.id,
        score: result.score,
        metadata: result.payload,
        vector: result.vector,
      }));
    } catch (error) {
      console.error(`Search failed:`, error);
      throw error;
    }
  }

  /**
   * Hybrid search with filters
   * @param {string} repoId - Repository ID
   * @param {number[]} queryVector - Query vector
   * @param {Object} filters - Metadata filters
   * @param {Object} options - Search options
   * @returns {Promise<Object[]>} - Search results
   */
  async hybridSearch(repoId, queryVector, filters, options = {}) {
    const filter = this.buildFilter(filters);
    return this.search(repoId, queryVector, { ...options, filter });
  }

  /**
   * Build Qdrant filter from simple object
   * @param {Object} filters - Filter object
   * @returns {Object} - Qdrant filter
   */
  buildFilter(filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return null;
    }

    const must = [];

    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        // Array: use "should" (OR)
        must.push({
          key,
          match: { any: value },
        });
      } else {
        // Single value: exact match
        must.push({
          key,
          match: { value },
        });
      }
    }

    return { must };
  }

  /**
   * Get collection statistics
   * @param {string} repoId - Repository ID
   * @returns {Promise<Object>} - Collection stats
   */
  async getCollectionStats(repoId) {
    const collectionName = this.getCollectionName(repoId);

    try {
      const info = await this.client.getCollection(collectionName);
      return {
        vectorCount: info.points_count,
        indexedVectorCount: info.indexed_vectors_count,
        segmentCount: info.segments_count,
        status: info.status,
      };
    } catch (error) {
      console.error(`Failed to get collection stats:`, error);
      throw error;
    }
  }

  /**
   * Delete points by IDs
   * @param {string} repoId - Repository ID
   * @param {string[]} ids - Point IDs to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deletePoints(repoId, ids) {
    const collectionName = this.getCollectionName(repoId);

    try {
      await this.client.delete(collectionName, {
        wait: true,
        points: ids,
      });

      return true;
    } catch (error) {
      console.error(`Failed to delete points:`, error);
      throw error;
    }
  }

  /**
   * Generate unique ID
   * @returns {string} - UUID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
}

export default QdrantService;

// Made with Bob
