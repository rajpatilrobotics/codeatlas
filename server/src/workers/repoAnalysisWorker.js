// ============================================
// CODEATLAS - Repository Analysis Worker
// ============================================

const { Worker } = require('bullmq');
const { redisConnection } = require('../config/queue');
const prisma = require('../config/prisma');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

/**
 * Repository Analysis Worker
 * Orchestrates the entire repository analysis pipeline
 */
const repoAnalysisWorker = new Worker(
  'repo-analysis',
  async (job) => {
    const { repoId, githubUrl, branch } = job.data;
    
    logger.info(`Starting repository analysis for: ${githubUrl}`);
    
    try {
      // Update status to CLONING
      await prisma.repository.update({
        where: { id: repoId },
        data: { status: 'CLONING', progress: 10 }
      });
      await job.updateProgress(10);

      // TODO: Phase 5 - Clone repository
      logger.info(`Cloning repository: ${githubUrl}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Placeholder
      
      // Update status to PARSING
      await prisma.repository.update({
        where: { id: repoId },
        data: { status: 'PARSING', progress: 30 }
      });
      await job.updateProgress(30);

      // TODO: Phase 6 - Parse files with AST
      logger.info(`Parsing files for: ${repoId}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Placeholder

      // Update status to EXTRACTING
      await prisma.repository.update({
        where: { id: repoId },
        data: { status: 'EXTRACTING', progress: 50 }
      });
      await job.updateProgress(50);

      // TODO: Phase 7 - Extract entities and relationships
      logger.info(`Extracting entities for: ${repoId}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Placeholder

      // Update status to GENERATING_GRAPH
      await prisma.repository.update({
        where: { id: repoId },
        data: { status: 'GENERATING_GRAPH', progress: 70 }
      });
      await job.updateProgress(70);

      // TODO: Phase 8 - Generate graph
      logger.info(`Generating graph for: ${repoId}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Placeholder

      // Update status to EMBEDDING
      await prisma.repository.update({
        where: { id: repoId },
        data: { status: 'EMBEDDING', progress: 85 }
      });
      await job.updateProgress(85);

      // TODO: Phase 9 - Generate embeddings
      logger.info(`Generating embeddings for: ${repoId}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Placeholder

      // Update status to SUMMARIZING
      await prisma.repository.update({
        where: { id: repoId },
        data: { status: 'SUMMARIZING', progress: 95 }
      });
      await job.updateProgress(95);

      // TODO: Phase 11 - Generate AI summary
      logger.info(`Generating summary for: ${repoId}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Placeholder

      // Update status to COMPLETED
      await prisma.repository.update({
        where: { id: repoId },
        data: { 
          status: 'COMPLETED', 
          progress: 100,
          analyzedAt: new Date()
        }
      });
      await job.updateProgress(100);

      logger.info(`Repository analysis completed for: ${githubUrl}`);
      
      return {
        success: true,
        repoId,
        message: 'Repository analysis completed successfully'
      };
    } catch (error) {
      logger.error(`Repository analysis failed for ${githubUrl}:`, error);
      
      // Update status to FAILED
      await prisma.repository.update({
        where: { id: repoId },
        data: { 
          status: 'FAILED',
          errorMessage: error.message
        }
      });
      
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY) || 5,
    limiter: {
      max: 10,
      duration: 1000
    }
  }
);

// Event listeners
repoAnalysisWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

repoAnalysisWorker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err);
});

repoAnalysisWorker.on('error', (err) => {
  logger.error('Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing worker...');
  await repoAnalysisWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing worker...');
  await repoAnalysisWorker.close();
  process.exit(0);
});

logger.info('Repository Analysis Worker started');

module.exports = repoAnalysisWorker;

// Made with Bob
