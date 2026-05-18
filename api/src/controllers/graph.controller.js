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

    const files = await db.getFilesByRepository(repositoryId);
    const entities = await db.getEntitiesByRepository(repositoryId);
    const relationships = await db.getRelationshipsByRepository(repositoryId);

    logger.info('[GraphController] Data retrieved from database', {
      repositoryId,
      filesCount: files.length,
      entitiesCount: entities.length,
      relationshipsCount: relationships.length,
    });

    let visualization;
    if (type === 'architecture') {
      visualization = graphService.generateArchitectureVisualization({ files }, relationships);
    } else {
      visualization = graphService.buildFileGraph(files, entities, relationships, {
        maxNodes: 150,
        maxEdges: 500,
      });
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

    const entities = await db.getEntitiesByRepository(repositoryId);
    const relationships = await db.getRelationshipsByRepository(repositoryId);

    const graph = graphService.buildGraph(relationships);
    const entityMap = new Map(
      entities.map((e) => [e.id, { name: e.name, type: e.type, fileId: e.fileId }])
    );

    const blastRadius = graphService.getBlastRadius(graph, entityId);
    const impactScore = graphService.getImpactScore(graph, entityId);
    const visualization = graphService.generateBlastRadiusVisualization(
      graph,
      entityId,
      entityMap
    );

    const riskLevel =
      impactScore >= 70 ? 'critical' : impactScore >= 45 ? 'high' : impactScore >= 20 ? 'medium' : 'low';

    res.json({
      repositoryId,
      entityId,
      impactScore,
      impactedNodes: visualization.nodes,
      relationships: visualization.edges,
      blastRadius: {
        impactScore,
        riskLevel,
        totalAffected: blastRadius.totalAffected,
        affectedEntities: blastRadius.affectedNodes,
        riskLevels: blastRadius.riskLevels,
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

    const files = await db.getFilesByRepository(repositoryId);
    const entities = await db.getEntitiesByRepository(repositoryId);
    const relationships = await db.getRelationshipsByRepository(repositoryId);

    const visualization = graphService.generateArchitectureVisualization(
      { files },
      relationships
    );
    const fileGraph = graphService.buildFileGraph(files, entities, relationships, {
      maxNodes: 150,
      maxEdges: 500,
    });

    const enrichedLayers = {};
    for (const [layerName, fileIds] of Object.entries(visualization.layers || {})) {
      enrichedLayers[layerName] = (fileIds || []).map((id) => {
        const f = files.find((x) => x.id === id);
        return {
          id,
          name: f?.path?.split('/').pop() || id,
          path: f?.path,
          type: 'file',
          layer: layerName,
        };
      });
    }

    res.json({
      repositoryId,
      layers: enrichedLayers,
      graph: {
        nodes: fileGraph.nodes.length ? fileGraph.nodes : visualization.nodes,
        edges: fileGraph.edges,
      },
      statistics: {
        totalComponents: files.length,
        presentation: enrichedLayers.presentation?.length || 0,
        business: enrichedLayers.business?.length || 0,
        data: enrichedLayers.data?.length || 0,
        utility: enrichedLayers.utility?.length || 0,
        external: enrichedLayers.external?.length || 0,
        connections: fileGraph.edges.length,
      },
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
 * List entities for graph UIs (blast radius picker, etc.)
 * GET /api/graph/entities/:repositoryId
 */
export async function listGraphEntities(req, res) {
  try {
    const { repositoryId } = req.params;
    const { type, limit = 200 } = req.query;

    const repository = await db.getRepository(repositoryId);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    let entities = await db.getEntitiesByRepository(repositoryId);
    if (type) {
      entities = entities.filter((e) => e.type === type);
    }

    const preferTypes = new Set(['function', 'class', 'method', 'component']);
    entities.sort((a, b) => {
      const ap = preferTypes.has(a.type) ? 0 : 1;
      const bp = preferTypes.has(b.type) ? 0 : 1;
      return ap - bp || (a.name || '').localeCompare(b.name || '');
    });

    res.json({
      repositoryId,
      entities: entities.slice(0, parseInt(limit, 10)).map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        fileId: e.fileId,
      })),
    });
  } catch (error) {
    logger.error('[GraphController] List graph entities error', { error: error.message });
    res.status(500).json({
      error: 'Failed to list entities',
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

/**
 * Heatmap-style file graph for React Flow (`lib/api.js` → GET /api/graph/heatmap/:repositoryId).
 */
export async function getGraphHeatmap(req, res) {
  try {
    const { repositoryId } = req.params;

    const repository = await db.getRepository(repositoryId);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const files = await db.getFilesByRepository(repositoryId);
    const entities = await db.getEntitiesByRepository(repositoryId);
    const relationships = await db.getRelationshipsByRepository(repositoryId);

    const complexityByFile = new Map();
    for (const e of entities) {
      if (!e.fileId) continue;
      const c = e.complexity ?? 0;
      complexityByFile.set(e.fileId, Math.max(complexityByFile.get(e.fileId) || 0, c));
    }

    const fileRows = files.map((f) => ({
      id: f.id,
      path: f.path,
      name: f.path,
      type: 'file',
      complexity: complexityByFile.get(f.id) || Math.min(99, Math.max(1, Math.floor((f.lineCount || 0) / 20))),
      activity: Math.min(100, Math.floor((f.lineCount || 0) / 15)),
      changes: 0,
      lineCount: f.lineCount,
    }));

    const entityToFile = new Map();
    for (const e of entities) {
      if (e.fileId) entityToFile.set(e.id, e.fileId);
    }

    const edgeKey = new Set();
    const dependencies = [];
    for (const r of relationships) {
      const from = entityToFile.get(r.sourceId);
      const to = entityToFile.get(r.targetId);
      if (!from || !to || from === to) continue;
      const key = `${from}->${to}`;
      if (edgeKey.has(key)) continue;
      edgeKey.add(key);
      dependencies.push({
        id: r.id,
        source: from,
        target: to,
        from,
        to,
        label: r.type || 'depends on',
      });
    }

    return res.json({
      repositoryId,
      files: fileRows,
      dependencies,
      metrics: {
        totalFiles: fileRows.length,
        totalEdges: dependencies.length,
      },
    });
  } catch (error) {
    logger.error('[GraphController] getGraphHeatmap error', {
      error: error.message,
      repositoryId: req.params.repositoryId,
    });
    return res.status(500).json({
      error: 'Failed to get heatmap graph',
      message: error.message,
    });
  }
}

// Made with Bob
