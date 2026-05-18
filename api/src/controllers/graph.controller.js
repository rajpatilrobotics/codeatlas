/**
 * Graph Controller
 *
 * Handles graph visualization and analysis requests.
 */

import DatabaseService from '../services/database/index.js';
import graphService from '../services/graph/index.js';
import logger from '../utils/logger.js';

const db = new DatabaseService();

/**
 * Get repository graph
 * GET /api/graph/:repositoryId
 */
export async function getRepositoryGraph(req, res) {
  try {
    const { repositoryId } = req.params;
    const { type = 'dependency' } = req.query;

    logger.info('[GraphController] Getting repository graph', { repositoryId, type });

    // Get repository
    const repository = await db.getRepository(repositoryId);
    if (!repository) {
      logger.warn('[GraphController] Repository not found', { repositoryId });
      return res.status(404).json({ error: 'Repository not found' });
    }

    logger.info('[GraphController] Repository found', {
      repositoryId,
      name: repository.name,
      status: repository.status,
      fileCount: repository._count?.files || 0,
      entityCount: repository._count?.entities || 0,
      relationshipCount: repository._count?.relationships || 0
    });

    // Get entities and relationships
    const entities = await db.getEntitiesByRepository(repositoryId);
    const relationships = await db.getRelationshipsByRepository(repositoryId);

    logger.info('[GraphController] Data retrieved from database', {
      repositoryId,
      entitiesCount: entities.length,
      relationshipsCount: relationships.length,
      sampleEntities: entities.slice(0, 3).map(e => ({ id: e.id, name: e.name, type: e.type })),
      sampleRelationships: relationships.slice(0, 3).map(r => ({ id: r.id, type: r.type, source: r.sourceId, target: r.targetId }))
    });

    // Check for empty data
    if (entities.length === 0) {
      logger.warn('[GraphController] No entities found for repository', { repositoryId });
    }
    if (relationships.length === 0) {
      logger.warn('[GraphController] No relationships found for repository', { repositoryId });
    }

    // Build graph
    const graph = graphService.buildGraph(relationships);

    logger.debug('[GraphController] Graph built', {
      repositoryId,
      graphNodeCount: graph.nodes?.size || 0,
      graphEdgeCount: graph.edges?.length || 0
    });

    // Generate visualization based on type
    let visualization;
    if (type === 'architecture') {
      visualization = graphService.generateArchitectureVisualization(entities, relationships);
    } else {
      visualization = graphService.generateDependencyVisualization(entities, relationships);
    }

    logger.info('[GraphController] Visualization generated', {
      repositoryId,
      type,
      nodeCount: visualization.nodes?.length || 0,
      edgeCount: visualization.edges?.length || 0,
      sampleNodes: visualization.nodes?.slice(0, 3).map(n => ({ id: n.id, label: n.label, type: n.type })) || []
    });

    const response = {
      repositoryId,
      type,
      graph: {
        nodes: visualization.nodes || [],
        edges: visualization.edges || [],
      },
      statistics: {
        nodeCount: visualization.nodes?.length || 0,
        edgeCount: visualization.edges?.length || 0,
      },
    };

    logger.info('[GraphController] Sending response', {
      repositoryId,
      responseNodeCount: response.graph.nodes.length,
      responseEdgeCount: response.graph.edges.length
    });

    res.json(response);
  } catch (error) {
    logger.error('[GraphController] Get repository graph error', {
      error: error.message,
      stack: error.stack,
      repositoryId: req.params.repositoryId
    });
    res.status(500).json({
      error: 'Failed to get repository graph',
      message: error.message,
    });
  }
}

/**
 * Get blast radius
 * GET /api/graph/blast-radius/:repositoryId
 */
export async function getBlastRadius(req, res) {
  try {
    const { repositoryId } = req.params;
    const { entityId } = req.query;

    if (!entityId) {
      return res.status(400).json({ error: 'Entity ID is required' });
    }

    // Get repository
    const repository = await db.getRepository(repositoryId);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Get entities and relationships
    const entities = await db.getEntitiesByRepository(repositoryId);
    const relationships = await db.getRelationshipsByRepository(repositoryId);

    // Build graph
    const graph = graphService.buildGraph(relationships);

    // Get blast radius (correct method name)
    const blastRadius = graphService.getBlastRadius(graph, entityId);

    res.json({
      repositoryId,
      entityId,
      blastRadius: {
        impactScore: blastRadius.impactScore,
        riskLevel: blastRadius.riskLevel,
        affectedEntities: blastRadius.affectedEntities,
        criticalPaths: blastRadius.criticalPaths,
        recommendations: blastRadius.recommendations,
      },
    });
  } catch (error) {
    console.error('Get blast radius error:', error);
    res.status(500).json({
      error: 'Failed to calculate blast radius',
      message: error.message,
    });
  }
}

/**
 * Get architecture layers
 * GET /api/graph/architecture/:repositoryId
 */
export async function getArchitectureLayers(req, res) {
  try {
    const { repositoryId } = req.params;

    // Get repository
    const repository = await db.getRepository(repositoryId);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Get entities and files
    const entities = await db.getEntitiesByRepository(repositoryId);
    const relationships = await db.getRelationshipsByRepository(repositoryId);
    const files = await db.getFilesByRepository(repositoryId);

    // Build graph
    const graph = graphService.buildGraph(relationships);

    // Generate architecture layers (correct method name)
    const layers = graphService.generateArchitectureLayers(graph, { files });

    res.json({
      repositoryId,
      layers,
    });
  } catch (error) {
    console.error('Get architecture layers error:', error);
    res.status(500).json({
      error: 'Failed to get architecture layers',
      message: error.message,
    });
  }
}

/**
 * Get entity dependencies
 * GET /api/graph/dependencies/:repositoryId/:entityId
 */
export async function getEntityDependencies(req, res) {
  try {
    const { repositoryId, entityId } = req.params;

    // Get entity
    const entity = await db.getEntity(entityId);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Get all entities and relationships
    const entities = await db.getEntitiesByRepository(repositoryId);
    const relationships = await db.getRelationshipsByRepository(repositoryId);

    // Build graph
    const graph = graphService.buildGraph(relationships);

    // Get dependencies (outgoing edges) and dependents (incoming edges)
    const dependencies = graph.get(entityId) || [];
    const dependents = [];
    for (const [node, edges] of graph.entries()) {
      if (edges.includes(entityId)) {
        dependents.push(node);
      }
    }

    res.json({
      repositoryId,
      entityId,
      entity: {
        name: entity.name,
        type: entity.type,
        file: entity.file.path,
      },
      dependencies,
      dependents,
    });
  } catch (error) {
    console.error('Get entity dependencies error:', error);
    res.status(500).json({
      error: 'Failed to get entity dependencies',
      message: error.message,
    });
  }
}

/**
 * Get circular dependencies
 * GET /api/graph/circular/:repositoryId
 */
export async function getCircularDependencies(req, res) {
  try {
    const { repositoryId } = req.params;

    logger.info('[GraphController] Getting circular dependencies', { repositoryId });

    // Get repository
    const repository = await db.getRepository(repositoryId);
    if (!repository) {
      logger.warn('[GraphController] Repository not found', { repositoryId });
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Get entities and relationships
    const entities = await db.getEntitiesByRepository(repositoryId);
    const relationships = await db.getRelationshipsByRepository(repositoryId);

    logger.info('[GraphController] Data retrieved for circular dependencies', {
      repositoryId,
      entitiesCount: entities.length,
      relationshipsCount: relationships.length
    });

    // Build graph
    const graph = graphService.buildGraph(relationships);

    // Detect circular dependencies using strongly connected components
    const cycles = graphService.analyzeGraph(entities, relationships, { findCycles: true }).cycles || [];

    logger.info('[GraphController] Circular dependencies detected', {
      repositoryId,
      cyclesCount: cycles?.length || 0,
      sampleCycles: cycles?.slice(0, 3).map(c => ({ length: c.length, entities: c.slice(0, 3) })) || []
    });

    res.json({
      repositoryId,
      circularDependencies: cycles || [],
      count: cycles?.length || 0,
    });
  } catch (error) {
    logger.error('[GraphController] Get circular dependencies error', {
      error: error.message,
      stack: error.stack,
      repositoryId: req.params.repositoryId
    });
    res.status(500).json({
      error: 'Failed to detect circular dependencies',
      message: error.message,
    });
  }
}

// Made with Bob
