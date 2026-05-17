// ============================================
// CODEATLAS - Chat Routes
// ============================================

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

/**
 * @route   POST /api/chat/query
 * @desc    Send chat query
 * @access  Public
 */
router.post('/query', chatController.sendQuery);

/**
 * @route   GET /api/chat/history/:repoId
 * @desc    Get chat history
 * @access  Public
 */
router.get('/history/:repoId', chatController.getChatHistory);

/**
 * @route   DELETE /api/chat/session/:sessionId
 * @desc    Delete chat session
 * @access  Public
 */
router.delete('/session/:sessionId', chatController.deleteSession);

/**
 * @route   POST /api/chat/session
 * @desc    Create new chat session
 * @access  Public
 */
router.post('/session', chatController.createSession);

module.exports = router;

// Made with Bob
