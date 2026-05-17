// ============================================
// CODEATLAS - Heatmap Routes
// ============================================

const express = require('express');
const router = express.Router();
const heatmapController = require('../controllers/heatmap.controller');

/**
 * @route   GET /api/heatmap/complexity/:repoId
 * @desc    Get complexity heatmap
 * @access  Public
 */
router.get('/complexity/:repoId', heatmapController.getComplexityHeatmap);

/**
 * @route   GET /api/heatmap/changes/:repoId
 * @desc    Get change frequency heatmap
 * @access  Public
 */
router.get('/changes/:repoId', heatmapController.getChangeHeatmap);

module.exports = router;

// Made with Bob
