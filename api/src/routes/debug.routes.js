/**
 * Debug routes
 */

import express from 'express';
import * as debugController from '../controllers/debug.controller.js';

const router = express.Router();

router.post('/analyze', debugController.analyzeError);
router.get('/suggestions/:repoId', debugController.getDebugSuggestions);

export default router;
