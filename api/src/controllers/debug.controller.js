/**
 * Debug navigator — aligned with `lib/api.js`.
 */

import logger from '../utils/logger.js';

/**
 * POST /api/debug/analyze
 * Body: { repoId, errorMessage, stackTrace }
 */
export async function analyzeError(req, res) {
  try {
    const { repoId, errorMessage, stackTrace } = req.body || {};
    if (!repoId) {
      return res.status(400).json({ error: 'repoId is required' });
    }
    logger.info('[DebugController] analyzeError', { repoId, hasMessage: !!errorMessage });
    return res.json({
      repoId,
      summary: errorMessage || 'No error message provided',
      stackTrace: stackTrace || null,
      suggestions: [],
      relatedFiles: [],
    });
  } catch (error) {
    logger.error('[DebugController] analyzeError', { error: error.message });
    return res.status(500).json({ error: 'Failed to analyze error', message: error.message });
  }
}

/**
 * GET /api/debug/suggestions/:repoId?fileId=
 */
export async function getDebugSuggestions(req, res) {
  try {
    const { repoId } = req.params;
    const { fileId } = req.query;
    return res.json({
      repoId,
      fileId: fileId || null,
      suggestions: [],
      relatedEntities: [],
    });
  } catch (error) {
    logger.error('[DebugController] getDebugSuggestions', { error: error.message });
    return res.status(500).json({ error: 'Failed to get debug suggestions', message: error.message });
  }
}
