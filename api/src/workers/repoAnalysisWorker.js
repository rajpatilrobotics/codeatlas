const { Worker } = require('bullmq');
const Redis = require('ioredis');
const ingestionService = require('../services/ingestion');
const parserService = require('../services/parser');
const extractionService = require('../services/extraction');
const graphService = require('../services/graph');
const logger = require('../utils/logger');

/**
 * Repository Analysis Worker
 * Master orchestration worker that coordinates the entire analysis pipeline
 */

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

const worker = new Worker(
  'repo-analysis',
  async (job) => {
    const { repoUrl, options = {} } = job.data;

    try {
      logger.info(`Starting repository analysis for: ${repoUrl}`);

      // Stage 1: Repository Ingestion
      await job.updateProgress(10);
      await job.log('Stage 1: Ingesting repository...');

      const ingestionResult = await ingestionService.ingestRepository(repoUrl, {
        token: options.token,
        cleanup: false, // Keep files for further processing
        onProgress: (progress) => {
          job.log(`Ingestion: ${progress.message}`);
        }
      });

      if (!ingestionResult.success) {
        throw new Error('Repository ingestion failed');
      }

      await job.updateProgress(30);
      await job.log(`Ingested ${ingestionResult.files.length} files`);

      // Stage 2: AST Parsing
      await job.updateProgress(35);
      await job.log('Stage 2: Parsing code...');

      const parseResult = await parserService.parseFiles(
        ingestionResult.files,
        (progress) => {
          job.log(`Parsing: ${progress.message}`);
        }
      );

      await job.updateProgress(50);
      await job.log(`Parsed ${parseResult.results.length} files`);

      // Stage 3: Entity & Relationship Extraction
      await job.updateProgress(55);
      await job.log('Stage 3: Extracting entities and relationships...');

      const extractionResult = await extractionService.extract(
        parseResult.results,
        (progress) => {
          job.log(`Extraction: ${progress.message}`);
        }
      );

      await job.updateProgress(70);
      await job.log(`Extracted ${extractionResult.statistics.entities.totalFiles} entities`);

      // Stage 4: Graph Generation
      await job.updateProgress(75);
      await job.log('Stage 4: Generating dependency graph...');

      const graphResult = await graphService.analyzeGraph(
        extractionResult.entities,
        extractionResult.relationships,
        {
          calculateMetrics: true,
          findCycles: true
        }
      );

      await job.updateProgress(85);
      await job.log('Graph analysis complete');

      // Stage 5: Generate Visualizations
      await job.updateProgress(90);
      await job.log('Stage 5: Generating visualizations...');

      const visualizations = {
        dependency: graphService.generateVisualization(
          extractionResult.entities,
          extractionResult.relationships,
          { type: 'dependency', maxNodes: 100 }
        ),
        architecture: graphService.generateVisualization(
          extractionResult.entities,
          extractionResult.relationships,
          { type: 'architecture' }
        )
      };

      await job.updateProgress(95);

      // Prepare final result
      const result = {
        success: true,
        repository: ingestionResult.repository,
        statistics: {
          files: ingestionResult.statistics,
          parsing: parseResult.statistics,
          entities: extractionResult.statistics.entities,
          relationships: extractionResult.statistics.relationships,
          graph: graphResult.statistics
        },
        entities: extractionResult.entities,
        relationships: extractionResult.relationships,
        graph: {
          metrics: graphResult.metrics,
          cycles: graphResult.cycles,
          hasCycles: graphResult.hasCycles
        },
        visualizations,
        analysis: {
          circularDependencies: extractionResult.analysis.circularDependencies,
          architectureLayers: graphService.generateArchitectureLayers(
            graphResult.graph,
            extractionResult.entities
          )
        },
        completedAt: new Date().toISOString()
      };

      await job.updateProgress(100);
      await job.log('Repository analysis complete!');

      logger.info(`Completed repository analysis for: ${repoUrl}`);

      return result;
    } catch (error) {
      logger.error(`Repository analysis failed for ${repoUrl}:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Process 2 repositories at a time
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000 // Per minute
    }
  }
);

// Event listeners
worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err);
});

worker.on('progress', (job, progress) => {
  logger.info(`Job ${job.id} progress: ${progress}%`);
});

worker.on('error', (err) => {
  logger.error('Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing worker...');
  await worker.close();
  await redisConnection.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing worker...');
  await worker.close();
  await redisConnection.quit();
  process.exit(0);
});

module.exports = worker;

// Made with Bob
