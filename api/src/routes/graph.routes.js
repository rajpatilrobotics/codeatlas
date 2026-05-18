/**
 * Graph Routes
 */

import express from 'express';
import * as graphController from '../controllers/graph.controller.js';

const router = express.Router();

// Static path segments must be registered before `/:repositoryId`
router.get('/heatmap/:repositoryId', graphController.getGraphHeatmap);
router.get('/blast-radius/:repositoryId', graphController.getBlastRadius);
router.get('/architecture/:repositoryId', graphController.getArchitectureLayers);
router.get('/dependencies/:repositoryId/:entityId', graphController.getEntityDependencies);
router.get('/circular/:repositoryId', graphController.getCircularDependencies);

// Get repository graph (type query: dependency | architecture)
router.get('/:repositoryId', graphController.getRepositoryGraph);

export default router;

// Made with Bob
