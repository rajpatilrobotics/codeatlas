import { Worker } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import crypto from 'crypto';
import logger from '../utils/logger.js';

logger.info('🔧 WORKER MODULE: Starting imports...');

import ingestionService from '../services/ingestion/index.js';
logger.info('✅ WORKER MODULE: ingestionService imported');

import parserService from '../services/parser/index.js';
logger.info('✅ WORKER MODULE: parserService imported');

import extractionService from '../services/extraction/index.js';
logger.info('✅ WORKER MODULE: extractionService imported');

import graphService from '../services/graph/index.js';
logger.info('✅ WORKER MODULE: graphService imported');

import DatabaseService from '../services/database/index.js';
import { buildFileIdForRepository } from '../services/extraction/pathResolver.js';
logger.info('✅ WORKER MODULE: DatabaseService imported');

const db = new DatabaseService();
logger.info('✅ WORKER MODULE: All imports complete, creating worker...');

/**
 * Repository Analysis Worker
 * Master orchestration worker that coordinates the entire analysis pipeline
 */

const redisConnection = createRedisConnection();

const worker = new Worker(
  'repo-analysis',
  async (job) => {
    logger.info(`🚀 WORKER: Job ${job.id} received`);
    logger.info(`🚀 WORKER: Job data:`, JSON.stringify(job.data));
    
    const { repoUrl, options = {} } = job.data;
    const { repositoryId } = options;

    try {
      logger.info(`Starting smart repository analysis for: ${repoUrl}`);
      logger.info(`Repository ID: ${repositoryId}`);

      // Stage 1: Clone started (10%)
      await job.updateProgress(10);
      await job.log('Stage 1: Starting shallow clone...');
      if (repositoryId) {
        await db.updateRepositoryStatus(repositoryId, 'analyzing', 10);
      }

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

      // DEBUG: Log ingestion result details
      console.log('🔍 DEBUG: Ingestion result:', {
        success: ingestionResult.success,
        filesCount: ingestionResult.files?.length || 0,
        hasFiles: !!ingestionResult.files,
        filesIsArray: Array.isArray(ingestionResult.files),
        sampleFile: ingestionResult.files?.[0],
        statistics: ingestionResult.statistics
      });

      // Stage 2: Clone complete (25%)
      await job.updateProgress(25);
      await job.log(`Clone complete. Found ${ingestionResult.files.length} files`);
      if (repositoryId) {
        await db.updateRepositoryStatus(repositoryId, 'analyzing', 25);
      }

      // Stage 3: Smart filtering complete (40%)
      await job.updateProgress(40);
      await job.log('Smart filtering complete. Processing priority files...');
      if (repositoryId) {
        await db.updateRepositoryStatus(repositoryId, 'analyzing', 40);
      }

      // Stage 4: AST parsing with batch processing (60%)
      await job.log('Stage 4: Parsing code in batches...');
      
      const BATCH_SIZE = 20;
      const allParseResults = [];
      
      for (let i = 0; i < ingestionResult.files.length; i += BATCH_SIZE) {
        const batch = ingestionResult.files.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(ingestionResult.files.length / BATCH_SIZE);
        
        await job.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} files)`);
        
        const batchResult = await parserService.parseFiles(
          batch,
          (progress) => {
            job.log(`Parsing: ${progress.message}`);
          }
        );
        
        allParseResults.push(...batchResult.results);
        
        // Update progress within parsing stage (40% to 60%)
        const parsingProgress = 40 + Math.floor((i / ingestionResult.files.length) * 20);
        await job.updateProgress(parsingProgress);
        if (repositoryId) {
          await db.updateRepositoryStatus(repositoryId, 'analyzing', parsingProgress);
        }
      }

      const parseResult = {
        results: allParseResults,
        statistics: {
          totalFiles: allParseResults.length,
          successful: allParseResults.filter(r => r.success).length,
          failed: allParseResults.filter(r => !r.success).length
        }
      };

      // CHECKPOINT 1: After file parsing
      logger.info('=== CHECKPOINT 1: File Parsing Complete ===', {
        totalFiles: parseResult.statistics.totalFiles,
        successful: parseResult.statistics.successful,
        failed: parseResult.statistics.failed,
        sampleParsedFiles: parseResult.results.slice(0, 3).map(r => ({
          filePath: r.filePath,
          success: r.success,
          hasAST: !!r.ast,
          astNodeCount: r.ast?.program?.body?.length || 0,
          error: r.error
        }))
      });

      // Log detailed parsing failures if any
      if (parseResult.statistics.failed > 0) {
        const failedFiles = parseResult.results.filter(r => !r.success);
        logger.warn('Parsing failures detected', {
          failedCount: failedFiles.length,
          sampleFailures: failedFiles.slice(0, 5).map(r => ({
            filePath: r.filePath,
            error: r.error
          }))
        });
      }

      await job.updateProgress(60);
      await job.log(`AST parsing complete. Parsed ${parseResult.results.length} files`);
      if (repositoryId) {
        await db.updateRepositoryStatus(repositoryId, 'analyzing', 60);
      }

      // Stage 5: Entity & Relationship Extraction
      await job.log('Stage 5: Extracting entities and relationships...');

      const extractionResult = await extractionService.extract(
        parseResult.results,
        (progress) => {
          job.log(`Extraction: ${progress.message}`);
        }
      );

      // CHECKPOINT 2: After entity extraction
      logger.info('=== CHECKPOINT 2: Entity Extraction Complete ===', {
        entities: {
          totalFiles: extractionResult.statistics.entities.totalFiles,
          functions: extractionResult.statistics.entities.functions,
          classes: extractionResult.statistics.entities.classes,
          imports: extractionResult.statistics.entities.imports,
          exports: extractionResult.statistics.entities.exports,
          components: extractionResult.statistics.entities.components,
          total: extractionResult.entities?.length || 0
        },
        relationships: {
          total: extractionResult.relationships?.length || 0,
          imports: extractionResult.statistics.relationships?.imports || 0,
          calls: extractionResult.statistics.relationships?.calls || 0,
          inheritance: extractionResult.statistics.relationships?.inheritance || 0
        },
        sampleEntities: extractionResult.entities?.slice(0, 3).map(e => ({
          id: e.id,
          name: e.name,
          type: e.type,
          filePath: e.filePath
        })) || [],
        sampleRelationships: extractionResult.relationships?.slice(0, 3).map(r => ({
          from: r.from,
          to: r.to,
          type: r.type
        })) || []
      });

      // Log warning if no entities or relationships extracted
      if (!extractionResult.entities || extractionResult.entities.length === 0) {
        logger.warn('WARNING: No entities extracted from parsed files', {
          parsedFilesCount: parseResult.results.length,
          successfulParses: parseResult.statistics.successful
        });
      }

      if (!extractionResult.relationships || extractionResult.relationships.length === 0) {
        logger.warn('WARNING: No relationships extracted from parsed files', {
          entitiesCount: extractionResult.entities?.length || 0
        });
      }

      // Stage 6: Embeddings generated (80%)
      await job.updateProgress(80);
      await job.log(`Extracted ${extractionResult.statistics.entities.totalFiles} entities`);
      if (repositoryId) {
        await db.updateRepositoryStatus(repositoryId, 'analyzing', 80);
      }

      // Stage 7: Graph Generation
      await job.log('Stage 7: Generating dependency graph...');

      const graphResult = await graphService.analyzeGraph(
        extractionResult.entities,
        extractionResult.relationships,
        {
          calculateMetrics: true,
          findCycles: true
        }
      );

      // CHECKPOINT 3: After graph generation
      logger.info('=== CHECKPOINT 3: Graph Generation Complete ===', {
        graph: {
          nodeCount: graphResult.graph?.nodes?.length || 0,
          edgeCount: graphResult.graph?.edges?.length || 0,
          hasCycles: graphResult.hasCycles,
          cycleCount: graphResult.cycles?.length || 0
        },
        metrics: {
          complexity: graphResult.metrics?.complexity,
          coupling: graphResult.metrics?.coupling,
          cohesion: graphResult.metrics?.cohesion
        },
        statistics: graphResult.statistics,
        sampleNodes: graphResult.graph?.nodes?.slice(0, 3).map(n => ({
          id: n.id,
          label: n.label,
          type: n.type
        })) || [],
        sampleEdges: graphResult.graph?.edges?.slice(0, 3).map(e => ({
          source: e.source,
          target: e.target,
          type: e.type
        })) || []
      });

      // Log warning if graph is empty
      if (!graphResult.graph?.nodes || graphResult.graph.nodes.length === 0) {
        logger.warn('WARNING: Graph has no nodes', {
          entitiesProvided: extractionResult.entities?.length || 0,
          relationshipsProvided: extractionResult.relationships?.length || 0
        });
      }

      if (!graphResult.graph?.edges || graphResult.graph.edges.length === 0) {
        logger.warn('WARNING: Graph has no edges', {
          nodesCount: graphResult.graph?.nodes?.length || 0,
          relationshipsProvided: extractionResult.relationships?.length || 0
        });
      }

      await job.updateProgress(90);
      await job.log('Graph analysis complete');
      if (repositoryId) {
        await db.updateRepositoryStatus(repositoryId, 'analyzing', 90);
      }

      // Stage 8: Generate Visualizations
      await job.log('Stage 8: Generating visualizations...');

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

      // Prepare final result
      const result = {
        success: true,
        repository: ingestionResult.repository,
        files: ingestionResult.files, // Add files for database persistence
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

      logger.info('🔥 CRITICAL: Result object created, about to do database persistence', {
        hasFiles: !!result.files,
        filesLength: result.files?.length || 0,
        hasRepositoryId: !!repositoryId,
        repositoryId
      });

      // CHECKPOINT 4: Before database persistence
      logger.info('=== CHECKPOINT 4: Preparing Database Persistence ===', {
        dataToSave: {
          entities: result.entities?.length || 0,
          relationships: result.relationships?.length || 0,
          graphNodes: result.graph?.metrics?.nodeCount || 0,
          graphEdges: result.graph?.metrics?.edgeCount || 0,
          visualizations: Object.keys(result.visualizations || {})
        },
        statistics: result.statistics
      });

      // Save data to database before marking job complete
      let filesSaved = 0;
      let entitiesSaved = 0;
      let relationshipsSaved = 0;

      if (repositoryId) {
        logger.info('=== CHECKPOINT 5: Database Persistence Starting ===', {
          repositoryId,
          dataToSave: {
            files: result.files?.length || 0,
            entities: result.entities?.length || 0,
            relationships: result.relationships?.length || 0,
          },
        });

        try {
          await db.clearRepositoryAnalysisData(repositoryId);

          if (result.files?.length > 0) {
            const filesForDb = result.files.map((file) => ({
              id: buildFileIdForRepository(repositoryId, file.path),
              repositoryId,
              path: file.path,
              language: file.language || 'unknown',
              size: file.size || 0,
              lineCount: file.lines || file.lineCount || 0,
              contentHash: crypto
                .createHash('md5')
                .update(file.content || file.path)
                .digest('hex'),
            }));

            filesSaved = await db.createFiles(filesForDb);
            logger.info('Files saved successfully', { count: filesSaved });
          }

          let entitiesForDb = [];
          if (result.entities?.length > 0) {
            entitiesForDb = result.entities.map((entity) => {
              const loc = entity.loc;
              const isFileEntity = entity.entityType === 'file' || entity.type === 'file';

              return {
                id: entity.id,
                repositoryId,
                fileId: !isFileEntity && entity.filePath
                  ? buildFileIdForRepository(repositoryId, entity.filePath)
                  : null,
                name: entity.name || entity.path || 'unknown',
                type: entity.entityType || entity.type || 'unknown',
                startLine: loc?.start?.line ?? entity.startLine ?? 0,
                endLine: loc?.end?.line ?? entity.endLine ?? 0,
                complexity: entity.complexity || 0,
                params: Array.isArray(entity.params) ? entity.params : [],
                returnType: entity.returnType || null,
                async: Boolean(entity.async),
                static: Boolean(entity.static),
              };
            });

            entitiesSaved = await db.createEntities(entitiesForDb);
            logger.info('Entities saved successfully', { count: entitiesSaved });
          }

          if (result.relationships?.length > 0) {
            const persistedEntities = await db.getEntitiesByRepository(repositoryId);
            const entityIds = new Set(persistedEntities.map((e) => e.id));
            const relationshipsForDb = [];

            result.relationships.forEach((rel, index) => {
              const sourceId = rel.sourceId || rel.source;
              const targetId = rel.targetId || rel.target;

              if (!sourceId || !targetId || !entityIds.has(sourceId) || !entityIds.has(targetId)) {
                return;
              }

              relationshipsForDb.push({
                id: rel.id || `${repositoryId}_rel_${index}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
                repositoryId,
                sourceId,
                targetId,
                type: rel.type,
                metadata: rel.metadata || {},
              });
            });

            if (relationshipsForDb.length > 0) {
              try {
                relationshipsSaved = await db.createRelationships(relationshipsForDb);
                logger.info('Relationships saved successfully', {
                  saved: relationshipsSaved,
                  total: result.relationships.length,
                  skipped: result.relationships.length - relationshipsForDb.length,
                });
              } catch (relError) {
                logger.warn('Relationship batch save failed — continuing with files/entities', {
                  error: relError.message,
                  attempted: relationshipsForDb.length,
                });
              }
            }
          }

          const stats = await db.getRepositoryStats(repositoryId);

          await db.updateRepository(repositoryId, {
            status: 'completed',
            progress: 100,
            fileCount: stats.fileCount,
            lineCount: result.statistics?.files?.totalLines || 0,
            entityCount: stats.entityCount,
            analyzedAt: new Date(),
          });

          logger.info('=== CHECKPOINT 6: Database Persistence Complete ===', {
            repositoryId,
            filesSaved: stats.fileCount,
            entitiesSaved: stats.entityCount,
            relationshipsSaved: stats.relationshipCount,
          });
        } catch (dbError) {
          logger.error('Database persistence failed', {
            error: dbError.message,
            stack: dbError.stack,
            repositoryId,
          });

          await db.updateRepository(repositoryId, {
            status: 'failed',
            progress: 0,
          });

          throw dbError;
        }
      }

      // Stage 9: Complete (100%) — only after DB persistence succeeds
      await job.updateProgress(100);
      await job.log('Repository analysis complete!');

      // Final result summary
      logger.info('=== PIPELINE COMPLETE: Final Result Summary ===', {
        repoUrl,
        success: result.success,
        totalFiles: result.statistics.files.totalFiles,
        totalEntities: result.entities?.length || 0,
        totalRelationships: result.relationships?.length || 0,
        graphNodes: result.graph?.metrics?.nodeCount || 0,
        graphEdges: result.graph?.metrics?.edgeCount || 0,
        hasCycles: result.graph?.hasCycles,
        completedAt: result.completedAt
      });

      logger.info(`Completed repository analysis for: ${repoUrl}`);

      return result;
    } catch (error) {
      // Enhanced error logging with full context
      logger.error('=== PIPELINE FAILED: Error Details ===', {
        repoUrl,
        repositoryId,
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
        stage: error.stage || 'unknown',
        timestamp: new Date().toISOString()
      });

      // Log additional context if available
      if (error.cause) {
        logger.error('Error cause:', {
          cause: error.cause,
          causeStack: error.cause.stack
        });
      }

      logger.error(`Repository analysis failed for ${repoUrl}:`, error);
      
      // Update repository status to failed with error message
      if (repositoryId) {
        try {
          logger.info('Updating repository status to failed', {
            repositoryId,
            errorMessage: error.message
          });

          await db.updateRepository(repositoryId, {
            status: 'failed',
            progress: 0
            // Note: error field removed - doesn't exist in Repository model
            // Error details are logged above for debugging
          });
          await job.log(`Analysis failed: ${error.message}`);

          logger.info('Repository status updated to failed', {
            repositoryId
          });
        } catch (dbError) {
          logger.error('Failed to update repository status:', {
            repositoryId,
            dbError: dbError.message,
            dbErrorStack: dbError.stack
          });
        }
      }
      
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

export default worker;

// Made with Bob
