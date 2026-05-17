/**
 * Graph Controller
 * 
 * Handles graph visualization and analysis requests.
 */

import DatabaseService from '../services/database/index.js';
import graphService from '../services/graph/index.js';

const db = new DatabaseService();

/**
 * Get repository graph
 * GET /api/graph/:repositoryId
 */
export async function getRepositoryGraph(req, res) {
  try {
    const { repositoryId } = req.params;
    const { type = 'dependency' } = req.query;

    // Get repository
    const repository = await db.getRepository(repositoryId);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Get entities and relationships
    const entities = await db.getEntitiesByRepository(repositoryId);
    const relationships = await db.getRelationshipsByRepository(repositoryId);

    // Build graph
    const graph = graphService.buildGraph(entities, relationships);

    // Generate visualization based on type
    let visualization;
    if (type === 'architecture') {
      visualization = graphService.generateArchitectureVisualization(graph);
    } else {
      visualization = graphService.generateDependencyVisualization(graph);
    }

    res.json({
      repositoryId,
      type,
      graph: {
        nodes: visualization.nodes,
        edges: visualization.edges,
      },
      statistics: {
        nodeCount: visualization.nodes.length,
        edgeCount: visualization.edges.length,
      },
    });
  } catch (error) {
    console.error('Get repository graph error:', error);
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
    const graph = graphService.buildGraph(entities, relationships);

    // Calculate blast radius
    const blastRadius = graphService.calculateBlastRadius(graph, entityId);

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

    // Get entities
    const entities = await db.getEntitiesByRepository(repositoryId);
    const relationships = await db.getRelationshipsByRepository(repositoryId);

    // Build graph
    const graph = graphService.buildGraph(entities, relationships);

    // Detect architecture layers
    const layers = graphService.detectArchitectureLayers(graph);

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
    const graph = graphService.buildGraph(entities, relationships);

    // Get dependencies and dependents
    const dependencies = graphService.getDependencies(graph, entityId);
    const dependents = graphService.getDependents(graph, entityId);

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

    // Get repository
    const repository = await db.getRepository(repositoryId);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Get entities and relationships
    const entities = await db.getEntitiesByRepository(repositoryId);
    const relationships = await db.getRelationshipsByRepository(repositoryId);

    // Build graph
    const graph = graphService.buildGraph(entities, relationships);

    // Detect circular dependencies
    const cycles = graphService.detectCircularDependencies(graph);

    res.json({
      repositoryId,
      circularDependencies: cycles,
      count: cycles.length,
    });
  } catch (error) {
    console.error('Get circular dependencies error:', error);
    res.status(500).json({
      error: 'Failed to detect circular dependencies',
      message: error.message,
    });
  }
}

// Made with Bob
