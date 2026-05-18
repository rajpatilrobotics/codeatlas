/**
 * Planner / impact — aligned with `lib/api.js`.
 */

import logger from '../utils/logger.js';

/**
 * POST /api/planner/analyze
 * Body: { repoId, changes }
 */
export async function analyzePlan(req, res) {
  try {
    const { repoId, changes } = req.body || {};
    if (!repoId) {
      return res.status(400).json({ error: 'repoId is required' });
    }
    logger.info('[PlannerController] analyze', { repoId, hasChanges: !!changes });
    return res.json({
      repoId,
      affectedSystems: [],
      riskLevel: 'low',
      recommendations: [],
      changes: changes ?? null,
    });
  } catch (error) {
    logger.error('[PlannerController] analyzePlan', { error: error.message });
    return res.status(500).json({ error: 'Failed to analyze plan', message: error.message });
  }
}

/**
 * GET /api/planner/impact/:repoId?nodeId=
 */
export async function getImpactAnalysis(req, res) {
  try {
    const { repoId } = req.params;
    const { nodeId } = req.query;
    return res.json({
      repoId,
      nodeId: nodeId || null,
      impactScore: 0,
      affectedNodes: [],
      recommendations: [],
    });
  } catch (error) {
    logger.error('[PlannerController] getImpactAnalysis', { error: error.message });
    return res.status(500).json({ error: 'Failed to get impact analysis', message: error.message });
  }
}
