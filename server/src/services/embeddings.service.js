// ============================================
// CODEATLAS - Vector Embeddings Service
// ============================================

const { HfInference } = require('@huggingface/inference');
const { QdrantClient } = require('@qdrant/js-client-rest');
const prisma = require('../config/prisma');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

// Initialize Hugging Face client
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Initialize Qdrant client
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

const COLLECTION_NAME = 'codeatlas_embeddings';
const EMBEDDING_MODEL = 'Alibaba-NLP/gte-Qwen2-7B-instruct'; // Using GTE-Qwen2 as alternative
const VECTOR_SIZE = 3584; // GTE-Qwen2-7B embedding size

/**
 * Initialize Qdrant collection
 */
async function initializeQdrantCollection() {
  try {
    logger.info('Initializing Qdrant collection');
    
    // Check if collection exists
    const collections = await qdrant.getCollections();
    const collectionExists = collections.collections.some(
      c => c.name === COLLECTION_NAME
    );
    
    if (!collectionExists) {
      // Create collection
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine'
        },
        optimizers_config: {
          default_segment_number: 2
        },
        replication_factor: 1
      });
      
      logger.info(`Created Qdrant collection: ${COLLECTION_NAME}`);
    } else {
      logger.info(`Qdrant collection already exists: ${COLLECTION_NAME}`);
    }
    
    return true;
  } catch (error) {
    logger.error('Error initializing Qdrant collection:', error);
    throw error;
  }
}

/**
 * Generate embedding for text using Hugging Face
 */
async function generateEmbedding(text) {
  try {
    // Truncate text if too long (model limit)
    const maxLength = 8000;
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) 
      : text;
    
    const embedding = await hf.featureExtraction({
      model: EMBEDDING_MODEL,
      inputs: truncatedText
    });
    
    // Handle different response formats
    let vector;
    if (Array.isArray(embedding)) {
      if (Array.isArray(embedding[0])) {
        // 2D array - take first row
        vector = embedding[0];
      } else {
        // 1D array
        vector = embedding;
      }
    } else {
      throw new Error('Unexpected embedding format');
    }
    
    return vector;
  } catch (error) {
    logger.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings in batch
 */
async function generateEmbeddingsBatch(texts, batchSize = 10) {
  try {
    logger.info(`Generating embeddings for ${texts.length} texts`);
    
    const embeddings = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      const batchEmbeddings = await Promise.all(
        batch.map(text => generateEmbedding(text))
      );
      
      embeddings.push(...batchEmbeddings);
      
      logger.info(`Generated ${embeddings.length}/${texts.length} embeddings`);
      
      // Rate limiting - wait between batches
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return embeddings;
  } catch (error) {
    logger.error('Error generating embeddings batch:', error);
    throw error;
  }
}

/**
 * Chunk code file for embedding
 */
function chunkCodeFile(fileContent, filePath, maxChunkSize = 1000) {
  const chunks = [];
  const lines = fileContent.split('\n');
  
  let currentChunk = [];
  let currentSize = 0;
  let startLine = 1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineSize = line.length;
    
    if (currentSize + lineSize > maxChunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        content: currentChunk.join('\n'),
        startLine,
        endLine: i,
        filePath
      });
      
      // Start new chunk
      currentChunk = [line];
      currentSize = lineSize;
      startLine = i + 1;
    } else {
      currentChunk.push(line);
      currentSize += lineSize;
    }
  }
  
  // Add last chunk
  if (currentChunk.length > 0) {
    chunks.push({
      content: currentChunk.join('\n'),
      startLine,
      endLine: lines.length,
      filePath
    });
  }
  
  return chunks;
}

/**
 * Create semantic chunks with context
 */
function createSemanticChunks(fileData, entities) {
  const chunks = [];
  
  // Chunk 1: File overview
  const fileOverview = `File: ${fileData.relativePath}
Language: ${fileData.language}
Lines of Code: ${fileData.linesOfCode}

${fileData.content.substring(0, 500)}`;
  
  chunks.push({
    type: 'FILE_OVERVIEW',
    content: fileOverview,
    filePath: fileData.relativePath,
    metadata: {
      language: fileData.language,
      linesOfCode: fileData.linesOfCode
    }
  });
  
  // Chunk 2: Entity-based chunks (functions, classes)
  for (const entity of entities) {
    if (entity.type === 'FUNCTION' || entity.type === 'CLASS' || entity.type === 'COMPONENT') {
      const lines = fileData.content.split('\n');
      const entityContent = lines
        .slice(entity.startLine - 1, entity.endLine)
        .join('\n');
      
      const contextChunk = `${entity.type}: ${entity.name}
File: ${fileData.relativePath}
Lines: ${entity.startLine}-${entity.endLine}

${entityContent}`;
      
      chunks.push({
        type: 'ENTITY',
        content: contextChunk,
        filePath: fileData.relativePath,
        entityId: entity.id,
        entityType: entity.type,
        entityName: entity.name,
        metadata: entity.metadata
      });
    }
  }
  
  // Chunk 3: Code blocks (if no entities or large file)
  if (entities.length === 0 || fileData.linesOfCode > 500) {
    const codeChunks = chunkCodeFile(fileData.content, fileData.relativePath);
    
    for (const chunk of codeChunks) {
      chunks.push({
        type: 'CODE_BLOCK',
        content: chunk.content,
        filePath: chunk.filePath,
        startLine: chunk.startLine,
        endLine: chunk.endLine
      });
    }
  }
  
  return chunks;
}

/**
 * Index file embeddings to Qdrant
 */
async function indexFileEmbeddings(repoId, fileData, entities) {
  try {
    logger.info(`Indexing embeddings for file: ${fileData.relativePath}`);
    
    // Create semantic chunks
    const chunks = createSemanticChunks(fileData, entities);
    
    // Generate embeddings for chunks
    const texts = chunks.map(c => c.content);
    const embeddings = await generateEmbeddingsBatch(texts);
    
    // Prepare points for Qdrant
    const points = chunks.map((chunk, index) => ({
      id: `${repoId}_${fileData.id}_${index}`,
      vector: embeddings[index],
      payload: {
        repositoryId: repoId,
        fileId: fileData.id,
        filePath: chunk.filePath,
        chunkType: chunk.type,
        content: chunk.content,
        entityId: chunk.entityId || null,
        entityType: chunk.entityType || null,
        entityName: chunk.entityName || null,
        startLine: chunk.startLine || null,
        endLine: chunk.endLine || null,
        metadata: chunk.metadata || {}
      }
    }));
    
    // Upload to Qdrant
    await qdrant.upsert(COLLECTION_NAME, {
      wait: true,
      points
    });
    
    // Save embedding records to PostgreSQL
    const embeddingRecords = points.map(point => ({
      repositoryId: repoId,
      fileId: fileData.id,
      entityId: point.payload.entityId,
      chunkContent: point.payload.content,
      vectorId: point.id,
      metadata: {
        chunkType: point.payload.chunkType,
        startLine: point.payload.startLine,
        endLine: point.payload.endLine
      }
    }));
    
    await prisma.embedding.createMany({
      data: embeddingRecords,
      skipDuplicates: true
    });
    
    logger.info(`Indexed ${points.length} embeddings for file ${fileData.relativePath}`);
    
    return {
      success: true,
      chunksIndexed: points.length
    };
  } catch (error) {
    logger.error(`Error indexing file embeddings:`, error);
    throw error;
  }
}

/**
 * Index repository embeddings
 */
async function indexRepositoryEmbeddings(repoId) {
  try {
    logger.info(`Starting embedding indexing for repository ${repoId}`);
    
    // Initialize collection if needed
    await initializeQdrantCollection();
    
    // Get all files for repository
    const files = await prisma.file.findMany({
      where: { repositoryId: repoId },
      select: {
        id: true,
        relativePath: true,
        content: true,
        language: true,
        linesOfCode: true
      }
    });
    
    // Get all entities for repository
    const entities = await prisma.entity.findMany({
      where: { repositoryId: repoId },
      select: {
        id: true,
        fileId: true,
        type: true,
        name: true,
        startLine: true,
        endLine: true,
        metadata: true
      }
    });
    
    // Group entities by file
    const entitiesByFile = entities.reduce((acc, entity) => {
      if (!acc[entity.fileId]) {
        acc[entity.fileId] = [];
      }
      acc[entity.fileId].push(entity);
      return acc;
    }, {});
    
    let totalChunks = 0;
    
    // Index each file
    for (const file of files) {
      const fileEntities = entitiesByFile[file.id] || [];
      const result = await indexFileEmbeddings(repoId, file, fileEntities);
      totalChunks += result.chunksIndexed;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    logger.info(`Completed embedding indexing: ${totalChunks} total chunks`);
    
    return {
      success: true,
      filesIndexed: files.length,
      totalChunks
    };
  } catch (error) {
    logger.error('Error indexing repository embeddings:', error);
    throw error;
  }
}

/**
 * Search embeddings in Qdrant
 */
async function searchEmbeddings(repoId, query, limit = 10) {
  try {
    logger.info(`Searching embeddings for query: ${query.substring(0, 50)}...`);
    
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);
    
    // Search in Qdrant
    const searchResults = await qdrant.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      filter: {
        must: [
          {
            key: 'repositoryId',
            match: { value: repoId }
          }
        ]
      },
      limit,
      with_payload: true
    });
    
    return searchResults.map(result => ({
      score: result.score,
      filePath: result.payload.filePath,
      content: result.payload.content,
      chunkType: result.payload.chunkType,
      entityName: result.payload.entityName,
      entityType: result.payload.entityType,
      startLine: result.payload.startLine,
      endLine: result.payload.endLine,
      metadata: result.payload.metadata
    }));
  } catch (error) {
    logger.error('Error searching embeddings:', error);
    throw error;
  }
}

/**
 * Delete repository embeddings
 */
async function deleteRepositoryEmbeddings(repoId) {
  try {
    logger.info(`Deleting embeddings for repository ${repoId}`);
    
    // Delete from Qdrant
    await qdrant.delete(COLLECTION_NAME, {
      filter: {
        must: [
          {
            key: 'repositoryId',
            match: { value: repoId }
          }
        ]
      }
    });
    
    // Delete from PostgreSQL
    await prisma.embedding.deleteMany({
      where: { repositoryId: repoId }
    });
    
    logger.info(`Deleted embeddings for repository ${repoId}`);
    
    return { success: true };
  } catch (error) {
    logger.error('Error deleting embeddings:', error);
    throw error;
  }
}

module.exports = {
  initializeQdrantCollection,
  generateEmbedding,
  generateEmbeddingsBatch,
  chunkCodeFile,
  createSemanticChunks,
  indexFileEmbeddings,
  indexRepositoryEmbeddings,
  searchEmbeddings,
  deleteRepositoryEmbeddings
};

// Made with Bob
