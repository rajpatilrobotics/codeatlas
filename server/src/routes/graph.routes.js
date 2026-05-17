// ============================================
// CODEATLAS - Graph Routes
// ============================================

const express = require('express');
const router = express.Router();
const graphController = require('../controllers/graph.controller');

/**
 * @route   GET /api/graph/architecture/:repoId
 * @desc    Get architecture graph
 * @access  Public
 */
router.get('/architecture/:repoId', graphController.getArchitectureGraph);

/**
 * @route   GET /api/graph/dependencies/:repoId
 * @desc    Get dependency graph
 * @access  Public
 */
router.get('/dependencies/:repoId', graphController.getDependencyGraph);

/**
 * @route   GET /api/graph/blast-radius/:repoId
 * @desc    Get blast radius analysis
 * @access  Public
 */
router.get('/blast-radius/:repoId', graphController.getBlastRadius);

/**
 * @route   POST /api/graph/traverse
 * @desc    Custom graph traversal
 * @access  Public
 */
router.post('/traverse', graphController.traverseGraph);

module.exports = router;

// Made with Bob
