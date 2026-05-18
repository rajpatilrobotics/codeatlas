import { Worker } from 'bullmq';
import Redis from 'ioredis';
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
logger.info('✅ WORKER MODULE: DatabaseService imported');

const db = new DatabaseService();
logger.info('✅ WORKER MODULE: All imports complete, creating worker...');

/**
 * Repository Analysis Worker
 * Master orchestration worker that coordinates the entire analysis pipeline
 */

const redisConnection = process.env.UPSTASH_REDIS_URL
  ? new Redis(process.env.UPSTASH_REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: {
        rejectUnauthorized: false
      }
    })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });

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

      // Stage 9: Complete (100%)
      try {
        await job.updateProgress(100);
        await job.log('Repository analysis complete!');
      } catch (progressError) {
        console.error('⚠️ Progress update failed (non-critical):', progressError.message);
      }
      
      // Save data to database
      logger.info('🔍 DEBUG: Checking if repositoryId exists', { repositoryId });
      
      if (repositoryId) {
        logger.info('🔍 DEBUG: repositoryId exists, checking result data');
        logger.info('🔍 DEBUG: result.files', { count: result.files?.length || 0 });
        logger.info('🔍 DEBUG: result.entities', { count: result.entities?.length || 0 });
        logger.info('🔍 DEBUG: result.relationships', { count: result.relationships?.length || 0 });
        
        logger.info('=== CHECKPOINT 5: Database Persistence Starting ===', {
          repositoryId,
          dataToSave: {
            files: result.files?.length || 0,
            entities: result.entities?.length || 0,
            relationships: result.relationships?.length || 0
          }
        });

        try {
          // Transform and save files to database
          console.log('🔍 DEBUG: About to check files condition...');
          if (result.files && result.files.length > 0) {
            console.log('🔍 DEBUG: Files condition TRUE, transforming files...');
            logger.info('Transforming and saving files to database', { count: result.files.length });
            
            const filesForDb = result.files.map(file => {
              const contentHash = crypto
                .createHash('md5')
                .update(file.content || file.path)
                .digest('hex');
              
              return {
                id: `${repositoryId}_${file.path}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
                repositoryId,
                path: file.path,
                language: file.language || 'unknown',
                size: file.size || 0,
                lineCount: file.lines || 0,
                contentHash,
                createdAt: new Date(),
                updatedAt: new Date()
              };
            });
            
            console.log('🔍 DEBUG: Calling db.createFiles with', filesForDb.length, 'files');
            console.log('🔍 DEBUG: Sample file:', filesForDb[0]);
            await db.createFiles(filesForDb);
            console.log('✅ DEBUG: Files saved successfully!');
            logger.info('Files saved successfully', { count: filesForDb.length });
          } else {
            console.log('❌ DEBUG: Files condition FALSE - no files to save');
          }

          // Transform and save entities to database
          console.log('🔍 DEBUG: About to check entities condition...');
          if (result.entities && result.entities.length > 0) {
            console.log('🔍 DEBUG: Entities condition TRUE, transforming entities...');
            logger.info('Transforming and saving entities to database', { count: result.entities.length });
            
            const entitiesForDb = result.entities.map(entity => ({
              id: entity.id || `${repositoryId}_${entity.name}_${entity.entityType}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
              repositoryId,
              fileId: entity.fileId ? `${repositoryId}_${entity.fileId}`.replace(/[^a-zA-Z0-9_-]/g, '_') : null,
              name: entity.name,
              type: entity.entityType || entity.type, // Use entityType field, fallback to type
              startLine: entity.startLine || 0,
              endLine: entity.endLine || 0,
              complexity: entity.complexity || 0,
              // metadata field removed - not in Prisma schema
              createdAt: new Date(),
              updatedAt: new Date()
            }));
            
            console.log('🔍 DEBUG: Calling db.createEntities with', entitiesForDb.length, 'entities');
            console.log('🔍 DEBUG: Sample entity:', entitiesForDb[0]);
            await db.createEntities(entitiesForDb);
            console.log('✅ DEBUG: Entities saved successfully!');
            logger.info('Entities saved successfully', { count: entitiesForDb.length });
          } else {
            console.log('❌ DEBUG: Entities condition FALSE - no entities to save');
          }
  
          // Transform and save relationships to database
          console.log('🔍 DEBUG: About to check relationships condition...');
          if (result.relationships && result.relationships.length > 0 && entitiesForDb && entitiesForDb.length > 0) {
            console.log('🔍 DEBUG: Relationships condition TRUE, resolving entity IDs...');
            logger.info('Resolving and saving relationships to database', { count: result.relationships.length });
            
            // Build entity ID mapping for relationship resolution
            const entityIdMap = new Map();
            const pathToEntityIdMap = new Map();
            
            entitiesForDb.forEach(entity => {
              // Map by entity ID
              entityIdMap.set(entity.id, entity);
              
              // Map file entities by extracting path from their ID
              // File IDs are like: "file:source_index_ts" → path is "source/index.ts"
              if (entity.type === 'file' && entity.id.startsWith('file:')) {
                // Extract path from ID: "file:source_index_ts" → "source/index.ts"
                const pathPart = entity.id.replace('file:', '');
                const fullPath = pathPart.replace(/_/g, '/').replace(/\//g, '/');
                
                // Try multiple path variations
                const variations = [
                  fullPath,
                  fullPath.replace(/\.ts$/, ''),
                  fullPath.replace(/\.tsx$/, ''),
                  fullPath.replace(/\.js$/, ''),
                  fullPath.replace(/\.jsx$/, ''),
                  entity.name, // Just filename
                  entity.name.replace(/\.(ts|tsx|js|jsx)$/, '')
                ];
                
                variations.forEach(v => {
                  if (v && !pathToEntityIdMap.has(v)) {
                    pathToEntityIdMap.set(v, entity.id);
                  }
                });
              }
            });
            
            console.log(`🔍 DEBUG: Built entity maps - ${entityIdMap.size} entities, ${pathToEntityIdMap.size} path mappings`);
            console.log(`🔍 DEBUG: Sample path mappings:`, Array.from(pathToEntityIdMap.entries()).slice(0, 5));
            
            // Helper function to resolve import path to file entity ID
            const resolveImportPath = (importPath, sourceFilePath) => {
              if (!importPath || !sourceFilePath) return null;
              
              // If it's already an entity ID, return it
              if (importPath.startsWith('file:')) {
                return importPath;
              }
              
              // Remove file extension variations
              const cleanPath = importPath.replace(/\.(ts|tsx|js|jsx)$/, '');
              
              // Try direct path match first
              if (pathToEntityIdMap.has(cleanPath)) {
                return pathToEntityIdMap.get(cleanPath);
              }
              
              // Handle relative imports (./file or ../file)
              if (importPath.startsWith('./') || importPath.startsWith('../')) {
                const sourceDir = sourceFilePath.split('/').slice(0, -1).join('/');
                const parts = importPath.split('/');
                const dirParts = sourceDir ? sourceDir.split('/') : [];
                
                for (const part of parts) {
                  if (part === '..') {
                    dirParts.pop();
                  } else if (part !== '.') {
                    dirParts.push(part);
                  }
                }
                
                const resolvedPath = dirParts.join('/');
                
                // Try with various extensions
                for (const ext of ['', '.ts', '.tsx', '.js', '.jsx']) {
                  const pathWithExt = resolvedPath + ext;
                  if (pathToEntityIdMap.has(pathWithExt)) {
                    return pathToEntityIdMap.get(pathWithExt);
                  }
                }
              }
              
              // Try just the filename as fallback
              const filename = importPath.split('/').pop().replace(/\.(ts|tsx|js|jsx)$/, '');
              if (pathToEntityIdMap.has(filename)) {
                return pathToEntityIdMap.get(filename);
              }
              
              return null;
            };
            
            // Resolve relationships to entity IDs
            const relationshipsForDb = [];
            let skippedCount = 0;
            let resolvedCount = 0;
            
            result.relationships.forEach((rel, index) => {
              const sourceId = rel.sourceId || rel.source;
              let targetId = rel.targetId || rel.target;
              const originalTargetId = targetId;
              
              // Debug first 3 relationships
              if (index < 3) {
                console.log(`\n🔍 DEBUG Relationship #${index}:`);
                console.log(`  Type: ${rel.type}`);
                console.log(`  Source: "${sourceId}"`);
                console.log(`  Target: "${targetId}"`);
                console.log(`  FilePath: "${rel.metadata?.filePath}"`);
              }
              
              // Try to resolve target if it's an import path
              if (targetId && !targetId.startsWith('file:') && rel.metadata?.filePath) {
                const resolved = resolveImportPath(targetId, rel.metadata.filePath);
                if (index < 3) {
                  console.log(`  Resolved: "${resolved || 'NULL'}"`);
                }
                if (resolved) {
                  targetId = resolved;
                  resolvedCount++;
                }
              }
              
              // Check if both IDs are valid entity IDs
              const sourceExists = entityIdMap.has(sourceId);
              const targetExists = entityIdMap.has(targetId);
              
              if (index < 3) {
                console.log(`  Source exists: ${sourceExists}`);
                console.log(`  Target exists: ${targetExists}`);
                console.log(`  Will save: ${sourceExists && targetExists ? 'YES ✅' : 'NO ❌'}`);
              }
              
              if (sourceExists && targetExists) {
                relationshipsForDb.push({
                  id: rel.id || `${repositoryId}_rel_${index}`,
                  repositoryId,
                  sourceId,
                  targetId,
                  type: rel.type,
                  metadata: rel.metadata || {},
                  createdAt: new Date()
                });
              } else {
                skippedCount++;
                if (skippedCount <= 10) {
                  console.log(`⚠️  Skip #${skippedCount}: source="${sourceId}" (${sourceExists ? 'OK' : 'MISS'}) -> target="${originalTargetId}" → "${targetId}" (${targetExists ? 'OK' : 'MISS'})`);
                }
              }
            });
            
            console.log(`🔍 DEBUG: Resolved ${resolvedCount} import paths to entity IDs`);
            
            console.log(`🔍 DEBUG: Resolved ${relationshipsForDb.length} relationships, skipped ${skippedCount} unresolved`);
            
            if (relationshipsForDb.length > 0) {
              console.log('🔍 DEBUG: Calling db.createRelationships with', relationshipsForDb.length, 'relationships');
              console.log('🔍 DEBUG: Sample relationship:', relationshipsForDb[0]);
              await db.createRelationships(relationshipsForDb);
              console.log('✅ DEBUG: Relationships saved successfully!');
              logger.info('Relationships saved successfully', {
                saved: relationshipsForDb.length,
                skipped: skippedCount,
                total: result.relationships.length
              });
            } else {
              console.log('⚠️  No valid relationships to save after resolution');
              logger.warn('No valid relationships after entity ID resolution', {
                total: result.relationships.length,
                skipped: skippedCount
              });
            }
          } else {
            console.log('❌ DEBUG: Relationships condition FALSE - no relationships or entities to save');
          }

          // Update repository with final results
          console.log('🔍 DEBUG: Updating repository record...');
          await db.updateRepository(repositoryId, {
            status: 'completed',
            progress: 100,
            fileCount: result.files?.length || 0,
            lineCount: result.statistics.files.totalLines || 0,
            entityCount: result.entities?.length || 0,
            analyzedAt: new Date()
          });
          console.log('✅ DEBUG: Repository record updated!');

          logger.info('=== CHECKPOINT 6: Database Persistence Complete ===', {
            repositoryId,
            savedSuccessfully: true,
            filesSaved: result.files?.length || 0,
            entitiesSaved: result.entities?.length || 0,
            relationshipsSaved: result.relationships?.length || 0
          });
        } catch (dbError) {
          console.log('❌ DEBUG: Database persistence ERROR:', dbError.message);
          console.log('❌ DEBUG: Error stack:', dbError.stack);
          logger.error('Database persistence failed', {
            error: dbError.message,
            stack: dbError.stack,
            repositoryId
          });
          
          // Update repository status to failed
          await db.updateRepository(repositoryId, {
            status: 'failed',
            progress: 100,
            analyzedAt: new Date()
          });
          
          throw dbError;
        }
      } else {
        console.log('❌ DEBUG: No repositoryId - skipping database persistence');
      }

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
