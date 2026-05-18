/**
 * Heatmap Controller
 * 
 * Handles complexity heatmap requests.
 */

import DatabaseService from '../services/database/index.js';
import logger from '../utils/logger.js';

const db = new DatabaseService();

/**
 * Get complexity heatmap
 * GET /api/heatmap/complexity/:repositoryId
 */
export async function getComplexityHeatmap(req, res) {
  try {
    const { repositoryId } = req.params;

    logger.info('[HeatmapController] Getting complexity heatmap', {
      repositoryId
    });

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

    const fileRows = files.map((f) => {
      const complexity =
        complexityByFile.get(f.id) ||
        Math.min(99, Math.max(1, Math.floor((f.lineCount || 0) / 20)));
      return {
        id: f.id,
        path: f.path,
        name: f.path,
        type: 'file',
        complexity,
        complexityScore: complexity,
        activity: Math.min(100, Math.floor((f.lineCount || 0) / 15)),
        changes: 0,
        lineCount: f.lineCount,
      };
    });

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

    const complexities = fileRows.map((f) => f.complexity).filter((n) => n > 0);
    const avgComplexity =
      complexities.length === 0
        ? 0
        : Math.round(complexities.reduce((a, b) => a + b, 0) / complexities.length);
    const maxComplexity = complexities.length === 0 ? 0 : Math.max(...complexities);

    res.json({
      repositoryId,
      files: fileRows,
      dependencies,
      metrics: {
        avgComplexity,
        maxComplexity,
        totalFiles: fileRows.length,
        totalEdges: dependencies.length,
      },
    });
  } catch (error) {
    logger.error('[HeatmapController] Failed to get complexity heatmap', {
      error: error.message,
      repositoryId: req.params.repositoryId
    });

    res.status(500).json({
      error: 'Failed to get complexity heatmap',
      message: error.message
    });
  }
}

/**
 * GET /api/heatmap/changes/:repositoryId
 * Placeholder structure compatible with dashboard heatmap views.
 */
export async function getChangeFrequencyHeatmap(req, res) {
  try {
    const { repositoryId } = req.params;

    logger.info('[HeatmapController] Getting change-frequency heatmap', {
      repositoryId
    });

    res.json({
      repositoryId,
      files: [],
      dependencies: [],
      metrics: {
        period: 'unknown',
        totalCommits: 0,
        totalFiles: 0
      }
    });
  } catch (error) {
    logger.error('[HeatmapController] Failed to get change heatmap', {
      error: error.message,
      repositoryId: req.params.repositoryId
    });

    res.status(500).json({
      error: 'Failed to get change heatmap',
      message: error.message
    });
  }
}

// Made with Bob
