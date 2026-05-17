/**
 * System Routes
 */

import express from 'express';
import * as systemController from '../controllers/system.controller.js';

const router = express.Router();

// Health check
router.get('/health', systemController.healthCheck);

// Get system statistics
router.get('/stats', systemController.getSystemStats);

// Get API info
router.get('/info', systemController.getApiInfo);

export default router;

// Made with Bob
