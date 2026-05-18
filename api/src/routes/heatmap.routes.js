/**
 * Heatmap Routes
 * 
 * Routes for complexity heatmap endpoints.
 */

import express from 'express';
import { getComplexityHeatmap } from '../controllers/heatmap.controller.js';

const router = express.Router();

/**
 * GET /api/heatmap/complexity/:repositoryId
 * Get complexity heatmap for a repository
 */
router.get('/complexity/:repositoryId', getComplexityHeatmap);

export default router;

// Made with Bob
