/**
 * Heatmap Controller
 * 
 * Handles complexity heatmap requests.
 */

import logger from '../utils/logger.js';

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

    // Return basic structure for now
    res.json({
      repositoryId,
      files: [],
      metrics: {
        avgComplexity: 0,
        maxComplexity: 0,
        totalFiles: 0
      }
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

// Made with Bob
