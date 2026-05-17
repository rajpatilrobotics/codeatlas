// ============================================
// CODEATLAS - System Routes
// ============================================

const express = require('express');
const router = express.Router();
const systemController = require('../controllers/system.controller');

/**
 * @route   GET /api/system/health
 * @desc    System health check
 * @access  Public
 */
router.get('/health', systemController.healthCheck);

/**
 * @route   GET /api/system/metrics
 * @desc    System metrics
 * @access  Public
 */
router.get('/metrics', systemController.getMetrics);

/**
 * @route   GET /api/system/status
 * @desc    System status
 * @access  Public
 */
router.get('/status', systemController.getStatus);

module.exports = router;

// Made with Bob
