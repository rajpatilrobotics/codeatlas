// ============================================
// CODEATLAS - Semantic Retrieval Service
// ============================================

const embeddingsService = require('./embeddings.service');
const graphEngine = require('./graphEngine.service');
const prisma = require('../config/prisma');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

/**
 * Hybrid retrieval combining vector search and graph traversal
 */
async function hybridRetrieval(repoId, query, options = {}) {
  try {
    const {
      limit = 10,
      includeGraph = true,
      includeEntities = true,
      contextWindow = 5
    } = options;
    
    logger.info(`Performing hybrid retrieval for query: ${query.substring(0, 50)}...`);
    
    // Step 1: Vector search
    const vectorResults = await embeddingsService.searchEmbeddings(
      repoId,
      query,
      limit * 2 // Get more results for reranking
    );
    
    // Step 2: Extract relevant file IDs
    const relevantFiles = await getRelevantFiles(repoId, vectorResults);
    
    // Step 3: Graph-aware context expansion
    let graphContext = [];
    if (includeGraph && relevantFiles.length > 0) {
      graphContext = await expandGraphContext(repoId, relevantFiles, contextWindow);
    }
    
    // Step 4: Entity-aware context
    let entityContext = [];
    if (includeEntities) {
      entityContext = await getEntityContext(repoId, vectorResults);
    }
    
    // Step 5: Rank and merge results
    const rankedResults = rankResults(vectorResults, graphContext, entityContext);
    
    // Step 6: Build final context
    const finalContext = buildRetrievalContext(
      rankedResults.slice(0, limit),
      graphContext,
      entityContext
    );
    
    return {
      results: rankedResults.slice(0, limit),
      context: finalContext,
      metadata: {
        vectorResultsCount: vectorResults.length,
        graphNodesCount: graphContext.length,
        entitiesCount: entityContext.length
      }
    };
  } catch (error) {
    logger.error('Error in hybrid retrieval:', error);
    throw error;
  }
}

/**
 * Get relevant files from vector results
 */
async function getRelevantFiles(repoId, vectorResults) {
  try {
    const filePaths = [...new Set(vectorResults.map(r => r.filePath))];
    
    const files = await prisma.file.findMany({
      where: {
        repositoryId: repoId,
        relativePath: { in: filePaths }
      },
      select: {
        id: true,
        relativePath: true,
        language: true,
        linesOfCode: true
      }
    });
    
    return files;
  } catch (error) {
    logger.error('Error getting relevant files:', error);
    return [];
  }
}

/**
 * Expand context using graph traversal
 */
async function expandGraphContext(repoId, files, contextWindow) {
  try {
    logger.info(`Expanding graph context for ${files.length} files`);
    
    const graph = await graphEngine.buildRepositoryGraph(repoId);
    const expandedNodes = new Set();
    const expandedEdges = [];
    
    for (const file of files) {
      if (!graph.hasNode(file.id)) continue;
      
      // Get dependencies (outgoing)
      const dependencies = graphEngine.bfsTraversal(graph, file.id, contextWindow);
      dependencies.nodes.forEach(node => expandedNodes.add(JSON.stringify(node)));
      expandedEdges.push(...dependencies.edges);
      
      // Get dependents (incoming)
      const dependents = graphEngine.reverseTraversal(graph, file.id, contextWindow);
      dependents.nodes.forEach(node => expandedNodes.add(JSON.stringify(node)));
      expandedEdges.push(...dependents.edges);
    }
    
    const uniqueNodes = Array.from(expandedNodes).map(n => JSON.parse(n));
    
    return {
      nodes: uniqueNodes,
      edges: expandedEdges,
      totalNodes: uniqueNodes.length
    };
  } catch (error) {
    logger.error('Error expanding graph context:', error);
    return { nodes: [], edges: [], totalNodes: 0 };
  }
}

/**
 * Get entity context from vector results
 */
async function getEntityContext(repoId, vectorResults) {
  try {
    const entityIds = vectorResults
      .filter(r => r.entityName)
      .map(r => r.entityName);
    
    if (entityIds.length === 0) return [];
    
    const entities = await prisma.entity.findMany({
      where: {
        repositoryId: repoId,
        name: { in: entityIds }
      },
      include: {
        file: {
          select: {
            relativePath: true,
            language: true
          }
        }
      }
    });
    
    return entities;
  } catch (error) {
    logger.error('Error getting entity context:', error);
    return [];
  }
}

/**
 * Rank results using multiple signals
 */
function rankResults(vectorResults, graphContext, entityContext) {
  return vectorResults.map(result => {
    let score = result.score;
    
    // Boost score if in graph context
    const inGraph = graphContext.nodes?.some(
      node => node.path === result.filePath
    );
    if (inGraph) {
      score *= 1.2;
    }
    
    // Boost score if has entity match
    const hasEntity = entityContext.some(
      entity => entity.name === result.entityName
    );
    if (hasEntity) {
      score *= 1.3;
    }
    
    // Boost based on chunk type
    if (result.chunkType === 'ENTITY') {
      score *= 1.1;
    } else if (result.chunkType === 'FILE_OVERVIEW') {
      score *= 1.05;
    }
    
    return {
      ...result,
      finalScore: score
    };
  }).sort((a, b) => b.finalScore - a.finalScore);
}

/**
 * Build structured retrieval context
 */
function buildRetrievalContext(results, graphContext, entityContext) {
  const context = {
    relevantCode: [],
    dependencies: [],
    entities: [],
    summary: ''
  };
  
  // Add relevant code chunks
  context.relevantCode = results.map(r => ({
    filePath: r.filePath,
    content: r.content,
    score: r.finalScore,
    chunkType: r.chunkType,
    lines: r.startLine && r.endLine ? `${r.startLine}-${r.endLine}` : null
  }));
  
  // Add dependency information
  if (graphContext.nodes && graphContext.nodes.length > 0) {
    context.dependencies = graphContext.nodes
      .filter(n => n.type === 'FILE')
      .map(n => ({
        path: n.path,
        language: n.language,
        linesOfCode: n.linesOfCode
      }));
  }
  
  // Add entity information
  context.entities = entityContext.map(e => ({
    name: e.name,
    type: e.type,
    filePath: e.file.relativePath,
    lines: `${e.startLine}-${e.endLine}`
  }));
  
  // Generate summary
  context.summary = generateContextSummary(results, graphContext, entityContext);
  
  return context;
}

/**
 * Generate context summary
 */
function generateContextSummary(results, graphContext, entityContext) {
  const fileCount = new Set(results.map(r => r.filePath)).size;
  const entityCount = entityContext.length;
  const dependencyCount = graphContext.nodes?.length || 0;
  
  return `Found ${results.length} relevant code chunks across ${fileCount} files, ` +
         `${entityCount} entities, and ${dependencyCount} related dependencies.`;
}

/**
 * Retrieve architecture context
 */
async function retrieveArchitectureContext(repoId) {
  try {
    logger.info(`Retrieving architecture context for repo ${repoId}`);
    
    const overview = await graphEngine.getArchitectureOverview(repoId);
    
    const repo = await prisma.repository.findUnique({
      where: { id: repoId },
      select: {
        name: true,
        description: true,
        primaryLanguage: true,
        metrics: true
      }
    });
    
    return {
      repository: repo,
      architecture: overview,
      summary: `Repository: ${repo.name}
Primary Language: ${repo.primaryLanguage}
Total Files: ${overview.metrics.totalNodes}
Total Dependencies: ${overview.metrics.totalEdges}

Key Components:
- Entry Points: ${overview.components.entryPoints.length}
- Services: ${overview.components.services.length}
- Components: ${overview.components.components.length}
- Routes: ${overview.components.routes.length}
- Utilities: ${overview.components.utilities.length}`
    };
  } catch (error) {
    logger.error('Error retrieving architecture context:', error);
    throw error;
  }
}

/**
 * Retrieve file context with dependencies
 */
async function retrieveFileContext(repoId, filePath) {
  try {
    logger.info(`Retrieving file context for ${filePath}`);
    
    const file = await prisma.file.findFirst({
      where: {
        repositoryId: repoId,
        relativePath: filePath
      },
      include: {
        entities: true
      }
    });
    
    if (!file) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Get dependency tree
    const dependencyTree = await graphEngine.getDependencyTree(repoId, file.id);
    
    // Get embeddings for file
    const embeddings = await prisma.embedding.findMany({
      where: { fileId: file.id },
      select: {
        chunkContent: true,
        metadata: true
      }
    });
    
    return {
      file: {
        path: file.relativePath,
        language: file.language,
        linesOfCode: file.linesOfCode,
        content: file.content
      },
      entities: file.entities,
      dependencies: dependencyTree,
      chunks: embeddings
    };
  } catch (error) {
    logger.error('Error retrieving file context:', error);
    throw error;
  }
}

/**
 * Retrieve entity context with relationships
 */
async function retrieveEntityContext(repoId, entityName) {
  try {
    logger.info(`Retrieving entity context for ${entityName}`);
    
    const entity = await prisma.entity.findFirst({
      where: {
        repositoryId: repoId,
        name: entityName
      },
      include: {
        file: true,
        sourceRelationships: {
          include: {
            targetEntity: true
          }
        },
        targetRelationships: {
          include: {
            sourceEntity: true
          }
        }
      }
    });
    
    if (!entity) {
      throw new Error(`Entity not found: ${entityName}`);
    }
    
    return {
      entity: {
        name: entity.name,
        type: entity.type,
        filePath: entity.file.relativePath,
        lines: `${entity.startLine}-${entity.endLine}`,
        metadata: entity.metadata
      },
      calls: entity.sourceRelationships
        .filter(r => r.type === 'CALLS')
        .map(r => r.targetEntity.name),
      calledBy: entity.targetRelationships
        .filter(r => r.type === 'CALLS')
        .map(r => r.sourceEntity.name)
    };
  } catch (error) {
    logger.error('Error retrieving entity context:', error);
    throw error;
  }
}

/**
 * Smart context retrieval based on query intent
 */
async function smartRetrieval(repoId, query, intent = 'general') {
  try {
    logger.info(`Smart retrieval with intent: ${intent}`);
    
    let context;
    
    switch (intent) {
      case 'architecture':
        context = await retrieveArchitectureContext(repoId);
        break;
        
      case 'file':
        // Extract file path from query
        const filePathMatch = query.match(/[\w\/\-\.]+\.(js|ts|jsx|tsx|py|java)/);
        if (filePathMatch) {
          context = await retrieveFileContext(repoId, filePathMatch[0]);
        } else {
          context = await hybridRetrieval(repoId, query);
        }
        break;
        
      case 'function':
      case 'class':
        // Extract entity name from query
        const entityMatch = query.match(/\b([A-Z][a-zA-Z0-9_]*)\b/);
        if (entityMatch) {
          context = await retrieveEntityContext(repoId, entityMatch[1]);
        } else {
          context = await hybridRetrieval(repoId, query);
        }
        break;
        
      default:
        context = await hybridRetrieval(repoId, query);
    }
    
    return context;
  } catch (error) {
    logger.error('Error in smart retrieval:', error);
    throw error;
  }
}

/**
 * Detect query intent
 */
function detectQueryIntent(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('architecture') || lowerQuery.includes('structure')) {
    return 'architecture';
  }
  
  if (lowerQuery.includes('file') || lowerQuery.includes('module')) {
    return 'file';
  }
  
  if (lowerQuery.includes('function') || lowerQuery.includes('method')) {
    return 'function';
  }
  
  if (lowerQuery.includes('class') || lowerQuery.includes('component')) {
    return 'class';
  }
  
  return 'general';
}

module.exports = {
  hybridRetrieval,
  retrieveArchitectureContext,
  retrieveFileContext,
  retrieveEntityContext,
  smartRetrieval,
  detectQueryIntent,
  expandGraphContext,
  rankResults
};

// Made with Bob
