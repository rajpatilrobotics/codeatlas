/**
 * Heatmap Routes
 * 
 * Routes for complexity heatmap endpoints.
 */

import express from 'express';
import { getComplexityHeatmap, getChangeFrequencyHeatmap } from '../controllers/heatmap.controller.js';

const router = express.Router();

/**
 * GET /api/heatmap/complexity/:repositoryId
 * Get complexity heatmap for a repository
 */
router.get('/complexity/:repositoryId', getComplexityHeatmap);

/**
 * GET /api/heatmap/changes/:repositoryId
 * Change-frequency style heatmap (client: lib/api.js)
 */
router.get('/changes/:repositoryId', getChangeFrequencyHeatmap);

export default router;

// Made with Bob
