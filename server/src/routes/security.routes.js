// ============================================
// CODEATLAS - Security Routes
// ============================================

const express = require('express');
const router = express.Router();
const securityController = require('../controllers/security.controller');

/**
 * @route   GET /api/security/scan/:repoId
 * @desc    Get security scan results
 * @access  Public
 */
router.get('/scan/:repoId', securityController.getSecurityScan);

/**
 * @route   GET /api/security/risks/:repoId
 * @desc    Get risk assessment
 * @access  Public
 */
router.get('/risks/:repoId', securityController.getRiskAssessment);

/**
 * @route   POST /api/security/analyze
 * @desc    Run security analysis
 * @access  Public
 */
router.post('/analyze', securityController.analyzeSecurityRouter);

module.exports = router;

// Made with Bob
