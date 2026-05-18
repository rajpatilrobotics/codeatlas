/**
 * Database Service
 *
 * Main database service providing high-level operations for:
 * - Repositories
 * - Files
 * - Entities
 * - Relationships
 * - Chat sessions
 * - Analysis jobs
 */

import prismaService from './prisma.js';
import logger from '../../utils/logger.js';

class DatabaseService {
  constructor() {
    this.prisma = prismaService.getClient();
  }

  // ==================== Repository Operations ====================

  /**
   * Create repository
   * @param {Object} data - Repository data
   * @returns {Promise<Object>} - Created repository
   */
  async createRepository(data) {
    logger.info('[DatabaseService] Creating/updating repository', {
      name: data.name,
      owner: data.owner,
      url: data.url
    });

    try {
      const repository = await this.prisma.repository.upsert({
        where: { url: data.url },
        update: {
          status: 'pending',
          progress: 0,
        },
        create: {
          name: data.name,
          owner: data.owner,
          url: data.url,
          description: data.description,
          language: data.language,
          stars: data.stars || 0,
          forks: data.forks || 0,
          status: 'pending',
          progress: 0,
        },
      });

      logger.info('[DatabaseService] Repository created/updated successfully', {
        id: repository.id,
        name: repository.name
      });

      return repository;
    } catch (error) {
      logger.error('[DatabaseService] Failed to create/update repository', {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * Get repository by ID
   * @param {string} id - Repository ID
   * @returns {Promise<Object|null>} - Repository
   */
  async getRepository(id) {
    return this.prisma.repository.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            files: true,
            entities: true,
            relationships: true,
          },
        },
      },
    });
  }

  /**
   * Get repository by URL
   * @param {string} url - Repository URL
   * @returns {Promise<Object|null>} - Repository
   */
  async getRepositoryByUrl(url) {
    return this.prisma.repository.findUnique({
      where: { url },
    });
  }

  /**
   * Update repository
   * @param {string} id - Repository ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} - Updated repository
   */
  async updateRepository(id, data) {
    return this.prisma.repository.update({
      where: { id },
      data,
    });
  }

  /**
   * Update repository status
   * @param {string} id - Repository ID
   * @param {string} status - Status
   * @param {number} progress - Progress (0-100)
   * @returns {Promise<Object>} - Updated repository
   */
  async updateRepositoryStatus(id, status, progress = null) {
    logger.info('[DatabaseService] Updating repository status', {
      id,
      status,
      progress
    });

    const data = { status };
    if (progress !== null) {
      data.progress = progress;
    }
    if (status === 'completed') {
      data.analyzedAt = new Date();
    }

    try {
      const result = await this.updateRepository(id, data);
      logger.info('[DatabaseService] Repository status updated successfully', {
        id,
        status,
        progress
      });
      return result;
    } catch (error) {
      logger.error('[DatabaseService] Failed to update repository status', {
        error: error.message,
        id,
        status
      });
      throw error;
    }
  }

  /**
   * Delete repository
   * @param {string} id - Repository ID
   * @returns {Promise<Object>} - Deleted repository
   */
  async deleteRepository(id) {
    return this.prisma.repository.delete({
      where: { id },
    });
  }

  /**
   * List repositories
   * @param {Object} options - Query options
   * @returns {Promise<Object[]>} - Repositories
   */
  async listRepositories(options = {}) {
    const { skip = 0, take = 20, orderBy = { createdAt: 'desc' } } = options;

    return this.prisma.repository.findMany({
      skip,
      take,
      orderBy,
      include: {
        _count: {
          select: {
            files: true,
            entities: true,
          },
        },
      },
    });
  }

  // ==================== File Operations ====================

  /**
   * Create file
   * @param {Object} data - File data
   * @returns {Promise<Object>} - Created file
   */
  async createFile(data) {
    return this.prisma.file.create({
      data,
    });
  }

  /**
   * Batch create files
   * @param {Object[]} files - Files data
   * @returns {Promise<number>} - Count of created files
   */
  async createFiles(files) {
    logger.info('[DatabaseService] Batch creating files', {
      count: files.length
    });

    try {
      console.log('Creating files, sample:', JSON.stringify(files[0], null, 2));
      const result = await this.prisma.file.createMany({
        data: files,
        skipDuplicates: true,
      });

      logger.info('[DatabaseService] Files created successfully', {
        requested: files.length,
        created: result.count,
        skipped: files.length - result.count
      });

      return result.count;
    } catch (error) {
      console.error('createFiles FULL ERROR:', error.message);
      console.error('First file data:', JSON.stringify(files[0], null, 2));
      logger.error('[DatabaseService] Failed to create files', {
        error: error.message,
        count: files.length
      });
      throw error;
    }
  }

  /**
   * Get file by ID
   * @param {string} id - File ID
   * @returns {Promise<Object|null>} - File
   */
  async getFile(id) {
    return this.prisma.file.findUnique({
      where: { id },
      include: {
        entities: true,
      },
    });
  }

  /**
   * Get files by repository
   * @param {string} repositoryId - Repository ID
   * @returns {Promise<Object[]>} - Files
   */
  async getFilesByRepository(repositoryId) {
    return this.prisma.file.findMany({
      where: { repositoryId },
      orderBy: { path: 'asc' },
    });
  }

  // ==================== Entity Operations ====================

  /**
   * Create entity
   * @param {Object} data - Entity data
   * @returns {Promise<Object>} - Created entity
   */
  async createEntity(data) {
    return this.prisma.entity.create({
      data,
    });
  }

  /**
   * Batch create entities
   * @param {Object[]} entities - Entities data
   * @returns {Promise<number>} - Count of created entities
   */
  async createEntities(entities) {
    logger.info('[DatabaseService] Batch creating entities', {
      count: entities.length
    });

    // Log entity type breakdown
    const typeBreakdown = entities.reduce((acc, entity) => {
      acc[entity.type] = (acc[entity.type] || 0) + 1;
      return acc;
    }, {});

    logger.debug('[DatabaseService] Entity type breakdown', typeBreakdown);

    try {
      const result = await this.prisma.entity.createMany({
        data: entities,
        skipDuplicates: true,
      });

      logger.info('[DatabaseService] Entities created successfully', {
        requested: entities.length,
        created: result.count,
        skipped: entities.length - result.count,
        typeBreakdown
      });

      return result.count;
    } catch (error) {
      logger.error('[DatabaseService] Failed to create entities', {
        error: error.message,
        count: entities.length,
        sample: entities.slice(0, 3).map(e => ({ id: e.id, type: e.type, name: e.name }))
      });
      throw error;
    }
  }

  /**
   * Get entity by ID
   * @param {string} id - Entity ID
   * @returns {Promise<Object|null>} - Entity
   */
  async getEntity(id) {
    return this.prisma.entity.findUnique({
      where: { id },
      include: {
        file: true,
        outgoingRelationships: true,
        incomingRelationships: true,
      },
    });
  }

  /**
   * Get entities by repository
   * @param {string} repositoryId - Repository ID
   * @param {Object} filters - Filters
   * @returns {Promise<Object[]>} - Entities
   */
  async getEntitiesByRepository(repositoryId, filters = {}) {
    const where = { repositoryId };

    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.fileId) {
      where.fileId = filters.fileId;
    }

    return this.prisma.entity.findMany({
      where,
      include: {
        file: {
          select: {
            path: true,
          },
        },
      },
    });
  }

  /**
   * Search entities by name
   * @param {string} repositoryId - Repository ID
   * @param {string} query - Search query
   * @returns {Promise<Object[]>} - Entities
   */
  async searchEntities(repositoryId, query) {
    return this.prisma.entity.findMany({
      where: {
        repositoryId,
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      take: 20,
    });
  }

  // ==================== Relationship Operations ====================

  /**
   * Create relationship
   * @param {Object} data - Relationship data
   * @returns {Promise<Object>} - Created relationship
   */
  async createRelationship(data) {
    return this.prisma.relationship.create({
      data,
    });
  }

  /**
   * Batch create relationships
   * @param {Object[]} relationships - Relationships data
   * @returns {Promise<number>} - Count of created relationships
   */
  async createRelationships(relationships) {
    logger.info('[DatabaseService] Batch creating relationships', {
      count: relationships.length
    });

    // Log relationship type breakdown
    const typeBreakdown = relationships.reduce((acc, rel) => {
      acc[rel.type] = (acc[rel.type] || 0) + 1;
      return acc;
    }, {});

    logger.debug('[DatabaseService] Relationship type breakdown', typeBreakdown);

    try {
      // Split into smaller batches to avoid PostgreSQL limits
      const BATCH_SIZE = 1000;
      let totalCreated = 0;
      
      if (relationships.length <= BATCH_SIZE) {
        // Small batch - process in one go
        const result = await this.prisma.relationship.createMany({
          data: relationships,
          skipDuplicates: true,
        });
        totalCreated = result.count;
      } else {
        // Large batch - split into chunks
        logger.info(`[DatabaseService] Splitting ${relationships.length} relationships into batches of ${BATCH_SIZE}`);
        
        for (let i = 0; i < relationships.length; i += BATCH_SIZE) {
          const batch = relationships.slice(i, i + BATCH_SIZE);
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(relationships.length / BATCH_SIZE);
          
          logger.info(`[DatabaseService] Processing relationship batch ${batchNum}/${totalBatches} (${batch.length} items)`);
          
          const result = await this.prisma.relationship.createMany({
            data: batch,
            skipDuplicates: true,
          });
          
          totalCreated += result.count;
          logger.info(`[DatabaseService] Batch ${batchNum}/${totalBatches} complete: ${result.count} created`);
        }
      }

      logger.info('[DatabaseService] Relationships created successfully', {
        requested: relationships.length,
        created: totalCreated,
        skipped: relationships.length - totalCreated,
        typeBreakdown
      });

      return totalCreated;
    } catch (error) {
      logger.error('[DatabaseService] Failed to create relationships', {
        error: error.message,
        stack: error.stack,
        count: relationships.length,
        sample: relationships.slice(0, 3).map(r => ({ id: r.id, type: r.type, source: r.sourceId, target: r.targetId }))
      });
      throw error;
    }
  }

  /**
   * Get relationships by repository
   * @param {string} repositoryId - Repository ID
   * @param {Object} filters - Filters
   * @returns {Promise<Object[]>} - Relationships
   */
  async getRelationshipsByRepository(repositoryId, filters = {}) {
    const where = { repositoryId };

    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.sourceId) {
      where.sourceId = filters.sourceId;
    }
    if (filters.targetId) {
      where.targetId = filters.targetId;
    }

    return this.prisma.relationship.findMany({
      where,
      include: {
        source: {
          select: {
            name: true,
            type: true,
          },
        },
        target: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    });
  }

  // ==================== Chat Operations ====================

  /**
   * Create chat session
   * @param {Object} data - Session data
   * @returns {Promise<Object>} - Created session
   */
  async createChatSession(data) {
    return this.prisma.chatSession.create({
      data,
    });
  }

  /**
   * Get chat session
   * @param {string} id - Session ID
   * @returns {Promise<Object|null>} - Session
   */
  async getChatSession(id) {
    return this.prisma.chatSession.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Update chat session
   * @param {string} id - Session ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} - Updated session
   */
  async updateChatSession(id, data) {
    return this.prisma.chatSession.update({
      where: { id },
      data: {
        ...data,
        lastActivity: new Date(),
      },
    });
  }

  /**
   * Create chat message
   * @param {Object} data - Message data
   * @returns {Promise<Object>} - Created message
   */
  async createChatMessage(data) {
    return this.prisma.chatMessage.create({
      data,
    });
  }

  /**
   * Get chat messages
   * @param {string} sessionId - Session ID
   * @param {number} limit - Max messages
   * @returns {Promise<Object[]>} - Messages
   */
  async getChatMessages(sessionId, limit = 20) {
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ==================== Analysis Job Operations ====================

  /**
   * Create analysis job
   * @param {Object} data - Job data
   * @returns {Promise<Object>} - Created job
   */
  async createAnalysisJob(data) {
    return this.prisma.analysisJob.create({
      data,
    });
  }

  /**
   * Update analysis job
   * @param {string} id - Job ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} - Updated job
   */
  async updateAnalysisJob(id, data) {
    return this.prisma.analysisJob.update({
      where: { id },
      data,
    });
  }

  /**
   * Get analysis job
   * @param {string} id - Job ID
   * @returns {Promise<Object|null>} - Job
   */
  async getAnalysisJob(id) {
    return this.prisma.analysisJob.findUnique({
      where: { id },
    });
  }

  // ==================== Statistics ====================

  /**
   * Get repository statistics
   * @param {string} repositoryId - Repository ID
   * @returns {Promise<Object>} - Statistics
   */
  async getRepositoryStats(repositoryId) {
    const [fileCount, entityCount, relationshipCount] = await Promise.all([
      this.prisma.file.count({ where: { repositoryId } }),
      this.prisma.entity.count({ where: { repositoryId } }),
      this.prisma.relationship.count({ where: { repositoryId } }),
    ]);

    return {
      fileCount,
      entityCount,
      relationshipCount,
    };
  }

  // ==================== Utility ====================

  /**
   * Health check
   * @returns {Promise<boolean>} - Health status
   */
  async healthCheck() {
    return prismaService.healthCheck();
  }

  /**
   * Connect to database
   * @returns {Promise<void>}
   */
  async connect() {
    return prismaService.connect();
  }

  /**
   * Disconnect from database
   * @returns {Promise<void>}
   */
  async disconnect() {
    return prismaService.disconnect();
  }
}

export default DatabaseService;

// Made with Bob
