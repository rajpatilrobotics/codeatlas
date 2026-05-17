// ============================================
// CODEATLAS - Repository Routes
// ============================================

const express = require('express');
const router = express.Router();
const repoController = require('../controllers/repo.controller');

/**
 * @route   POST /api/repo/analyze
 * @desc    Start repository analysis
 * @access  Public
 */
router.post('/analyze', repoController.analyzeRepository);

/**
 * @route   GET /api/repo/status/:jobId
 * @desc    Get analysis job status
 * @access  Public
 */
router.get('/status/:jobId', repoController.getJobStatus);

/**
 * @route   GET /api/repo/summary/:repoId
 * @desc    Get repository summary
 * @access  Public
 */
router.get('/summary/:repoId', repoController.getRepositorySummary);

/**
 * @route   GET /api/repo/list
 * @desc    List all analyzed repositories
 * @access  Public
 */
router.get('/list', repoController.listRepositories);

/**
 * @route   GET /api/repo/:repoId
 * @desc    Get repository details
 * @access  Public
 */
router.get('/:repoId', repoController.getRepository);

/**
 * @route   DELETE /api/repo/:repoId
 * @desc    Delete repository
 * @access  Public
 */
router.delete('/:repoId', repoController.deleteRepository);

module.exports = router;

// Made with Bob
