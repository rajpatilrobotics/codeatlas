// ============================================
// CODEATLAS - Planner Routes
// ============================================

const express = require('express');
const router = express.Router();
const plannerController = require('../controllers/planner.controller');

/**
 * @route   POST /api/planner/analyze
 * @desc    Analyze impact of changes
 * @access  Public
 */
router.post('/analyze', plannerController.analyzeImpact);

/**
 * @route   GET /api/planner/affected/:repoId
 * @desc    Get affected systems
 * @access  Public
 */
router.get('/affected/:repoId', plannerController.getAffectedSystems);

module.exports = router;

// Made with Bob
