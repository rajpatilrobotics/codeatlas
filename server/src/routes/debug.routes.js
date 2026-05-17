// ============================================
// CODEATLAS - Debug Routes
// ============================================

const express = require('express');
const router = express.Router();
const debugController = require('../controllers/debug.controller');

/**
 * @route   POST /api/debug/trace
 * @desc    Trace execution path
 * @access  Public
 */
router.post('/trace', debugController.traceExecution);

/**
 * @route   GET /api/debug/suggestions/:repoId
 * @desc    Get debug suggestions
 * @access  Public
 */
router.get('/suggestions/:repoId', debugController.getDebugSuggestions);

module.exports = router;

// Made with Bob
