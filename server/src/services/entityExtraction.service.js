// ============================================
// CODEATLAS - Entity & Relationship Extraction Service
// ============================================

const prisma = require('../config/prisma');
const astParser = require('./astParser.service');
const pino = require('pino');
const path = require('path');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

/**
 * Extract entities from parsed files
 */
async function extractEntitiesFromFiles(repoId, files) {
  try {
    logger.info(`Extracting entities from ${files.length} files for repo ${repoId}`);
    
    const allEntities = [];
    const allRelationships = [];
    
    for (const file of files) {
      const parseResult = await astParser.parseFile(file);
      
      if (!parseResult.success) {
        logger.warn(`Skipping file ${file.relativePath}: ${parseResult.reason}`);
        continue;
      }
      
      const { entities, complexity } = parseResult;
      
      // Process functions
      for (const func of entities.functions || []) {
        allEntities.push({
          repositoryId: repoId,
          fileId: file.id,
          type: 'FUNCTION',
          name: func.name,
          startLine: func.startLine,
          endLine: func.endLine,
          metadata: {
            isAsync: func.isAsync,
            isExported: func.isExported,
            parameters: func.parameters,
            complexity: complexity
          }
        });
      }
      
      // Process classes
      for (const cls of entities.classes || []) {
        allEntities.push({
          repositoryId: repoId,
          fileId: file.id,
          type: 'CLASS',
          name: cls.name,
          startLine: cls.startLine,
          endLine: cls.endLine,
          metadata: {
            isExported: cls.isExported,
            superClass: cls.superClass,
            methods: cls.methods
          }
        });
      }
      
      // Process components
      for (const comp of entities.components || []) {
        allEntities.push({
          repositoryId: repoId,
          fileId: file.id,
          type: 'COMPONENT',
          name: comp.name,
          startLine: comp.startLine,
          endLine: comp.endLine,
          metadata: {
            componentType: comp.componentType,
            isExported: comp.isExported
          }
        });
      }
      
      // Process imports for relationships
      for (const imp of entities.imports || []) {
        allRelationships.push({
          type: 'IMPORTS',
          sourceFile: file.relativePath,
          targetFile: imp.source,
          metadata: {
            importedNames: imp.importedNames,
            isRequire: imp.isRequire || false,
            line: imp.startLine
          }
        });
      }
      
      // Process exports
      for (const exp of entities.exports || []) {
        allRelationships.push({
          type: 'EXPOSES',
          sourceFile: file.relativePath,
          targetName: exp.name,
          metadata: {
            exportType: exp.type,
            line: exp.startLine
          }
        });
      }
    }
    
    logger.info(`Extracted ${allEntities.length} entities and ${allRelationships.length} relationships`);
    
    return {
      entities: allEntities,
      relationships: allRelationships
    };
  } catch (error) {
    logger.error('Error extracting entities:', error);
    throw error;
  }
}

/**
 * Save entities to database
 */
async function saveEntitiesToDatabase(entities) {
  try {
    logger.info(`Saving ${entities.length} entities to database`);
    
    const savedEntities = await prisma.entity.createMany({
      data: entities,
      skipDuplicates: true
    });
    
    logger.info(`Saved ${savedEntities.count} entities`);
    return savedEntities;
  } catch (error) {
    logger.error('Error saving entities:', error);
    throw error;
  }
}

/**
 * Build dependency relationships from imports
 */
async function buildDependencyRelationships(repoId, relationships) {
  try {
    logger.info(`Building dependency relationships for repo ${repoId}`);
    
    // Get all files for the repository
    const files = await prisma.file.findMany({
      where: { repositoryId: repoId },
      select: { id: true, relativePath: true }
    });
    
    const fileMap = new Map(files.map(f => [f.relativePath, f.id]));
    
    const dependencyRelationships = [];
    
    for (const rel of relationships) {
      if (rel.type !== 'IMPORTS') continue;
      
      const sourceFileId = fileMap.get(rel.sourceFile);
      if (!sourceFileId) continue;
      
      // Resolve import path
      const targetPath = resolveImportPath(rel.sourceFile, rel.targetFile);
      const targetFileId = fileMap.get(targetPath);
      
      if (targetFileId) {
        dependencyRelationships.push({
          repositoryId: repoId,
          sourceFileId,
          targetFileId,
          type: 'IMPORTS',
          metadata: rel.metadata
        });
      }
    }
    
    logger.info(`Built ${dependencyRelationships.length} dependency relationships`);
    return dependencyRelationships;
  } catch (error) {
    logger.error('Error building relationships:', error);
    throw error;
  }
}

/**
 * Resolve import path to actual file path
 */
function resolveImportPath(sourceFile, importPath) {
  // Handle relative imports
  if (importPath.startsWith('.')) {
    const sourceDir = path.dirname(sourceFile);
    let resolved = path.join(sourceDir, importPath);
    
    // Try common extensions
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.ts'];
    for (const ext of extensions) {
      const withExt = resolved + ext;
      // In real implementation, check if file exists
      // For now, return the first attempt
      return withExt;
    }
    
    return resolved;
  }
  
  // Handle node_modules imports (external dependencies)
  // These won't be in our file map, so they'll be filtered out
  return importPath;
}

/**
 * Extract function call relationships
 */
async function extractFunctionCalls(repoId, files) {
  try {
    logger.info(`Extracting function calls for repo ${repoId}`);
    
    const callRelationships = [];
    
    // Get all entities (functions) for the repository
    const entities = await prisma.entity.findMany({
      where: {
        repositoryId: repoId,
        type: 'FUNCTION'
      },
      select: { id: true, name: true, fileId: true }
    });
    
    const entityMap = new Map(entities.map(e => [e.name, e]));
    
    // Parse each file to find function calls
    for (const file of files) {
      const parseResult = await astParser.parseFile(file);
      
      if (!parseResult.success) continue;
      
      // Extract function calls from AST
      const ast = astParser.parseCode(file.content, file.language);
      if (!ast) continue;
      
      const traverse = require('@babel/traverse').default;
      
      traverse(ast, {
        CallExpression(path) {
          const callee = path.node.callee;
          let calledFunctionName = null;
          
          if (callee.type === 'Identifier') {
            calledFunctionName = callee.name;
          } else if (callee.type === 'MemberExpression' && callee.property) {
            calledFunctionName = callee.property.name;
          }
          
          if (calledFunctionName && entityMap.has(calledFunctionName)) {
            const targetEntity = entityMap.get(calledFunctionName);
            
            // Find source entity (function containing this call)
            const sourceEntity = entities.find(e => 
              e.fileId === file.id && 
              path.node.loc &&
              e.startLine <= path.node.loc.start.line &&
              e.endLine >= path.node.loc.end.line
            );
            
            if (sourceEntity && sourceEntity.id !== targetEntity.id) {
              callRelationships.push({
                repositoryId: repoId,
                sourceEntityId: sourceEntity.id,
                targetEntityId: targetEntity.id,
                type: 'CALLS',
                metadata: {
                  line: path.node.loc?.start.line || 0
                }
              });
            }
          }
        }
      });
    }
    
    logger.info(`Extracted ${callRelationships.length} function call relationships`);
    return callRelationships;
  } catch (error) {
    logger.error('Error extracting function calls:', error);
    return [];
  }
}

/**
 * Save relationships to database
 */
async function saveRelationshipsToDatabase(relationships) {
  try {
    logger.info(`Saving ${relationships.length} relationships to database`);
    
    const savedRelationships = await prisma.relationship.createMany({
      data: relationships,
      skipDuplicates: true
    });
    
    logger.info(`Saved ${savedRelationships.count} relationships`);
    return savedRelationships;
  } catch (error) {
    logger.error('Error saving relationships:', error);
    throw error;
  }
}

/**
 * Analyze repository structure
 */
async function analyzeRepositoryStructure(repoId) {
  try {
    logger.info(`Analyzing repository structure for repo ${repoId}`);
    
    // Count entities by type
    const entityCounts = await prisma.entity.groupBy({
      by: ['type'],
      where: { repositoryId: repoId },
      _count: true
    });
    
    // Count relationships by type
    const relationshipCounts = await prisma.relationship.groupBy({
      by: ['type'],
      where: { repositoryId: repoId },
      _count: true
    });
    
    // Calculate complexity metrics
    const entities = await prisma.entity.findMany({
      where: { repositoryId: repoId },
      select: { metadata: true }
    });
    
    let totalComplexity = 0;
    let complexityCount = 0;
    
    for (const entity of entities) {
      if (entity.metadata && entity.metadata.complexity) {
        totalComplexity += entity.metadata.complexity;
        complexityCount++;
      }
    }
    
    const avgComplexity = complexityCount > 0 ? totalComplexity / complexityCount : 0;
    
    return {
      entityCounts: entityCounts.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {}),
      relationshipCounts: relationshipCounts.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {}),
      averageComplexity: Math.round(avgComplexity * 100) / 100,
      totalEntities: entities.length
    };
  } catch (error) {
    logger.error('Error analyzing repository structure:', error);
    throw error;
  }
}

/**
 * Main extraction pipeline
 */
async function extractAndSaveEntities(repoId, files) {
  try {
    logger.info(`Starting entity extraction pipeline for repo ${repoId}`);
    
    // Step 1: Extract entities and relationships from AST
    const { entities, relationships } = await extractEntitiesFromFiles(repoId, files);
    
    // Step 2: Save entities to database
    await saveEntitiesToDatabase(entities);
    
    // Step 3: Build dependency relationships
    const dependencyRelationships = await buildDependencyRelationships(repoId, relationships);
    
    // Step 4: Extract function call relationships
    const callRelationships = await extractFunctionCalls(repoId, files);
    
    // Step 5: Save all relationships
    const allRelationships = [...dependencyRelationships, ...callRelationships];
    await saveRelationshipsToDatabase(allRelationships);
    
    // Step 6: Analyze structure
    const analysis = await analyzeRepositoryStructure(repoId);
    
    logger.info('Entity extraction pipeline completed successfully');
    
    return {
      success: true,
      entitiesExtracted: entities.length,
      relationshipsExtracted: allRelationships.length,
      analysis
    };
  } catch (error) {
    logger.error('Error in entity extraction pipeline:', error);
    throw error;
  }
}

module.exports = {
  extractEntitiesFromFiles,
  saveEntitiesToDatabase,
  buildDependencyRelationships,
  extractFunctionCalls,
  saveRelationshipsToDatabase,
  analyzeRepositoryStructure,
  extractAndSaveEntities
};

// Made with Bob
