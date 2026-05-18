/**
 * Planner routes
 */

import express from 'express';
import * as plannerController from '../controllers/planner.controller.js';

const router = express.Router();

router.post('/analyze', plannerController.analyzePlan);
router.get('/impact/:repoId', plannerController.getImpactAnalysis);

export default router;
