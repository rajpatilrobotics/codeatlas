/**
 * Chat Routes
 */

import express from 'express';
import * as chatController from '../controllers/chat.controller.js';

const router = express.Router();

// Create chat session
router.post('/session', chatController.createChatSession);

// Send message
router.post('/message', chatController.sendMessage);

// Send message with streaming
router.post('/message/stream', chatController.sendMessageStream);

// Get chat history
router.get('/history/:sessionId', chatController.getChatHistory);

// Get session info
router.get('/session/:sessionId', chatController.getChatSession);

// Quick ask
router.post('/quick-ask', chatController.quickAsk);

// Get suggested questions
router.get('/suggestions/:sessionId', chatController.getSuggestedQuestions);

// Clear chat history
router.delete('/history/:sessionId', chatController.clearChatHistory);

export default router;

// Made with Bob
