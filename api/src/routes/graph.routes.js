/**
 * Graph Routes
 */

import express from 'express';
import * as graphController from '../controllers/graph.controller.js';

const router = express.Router();

// Get repository graph
router.get('/:repositoryId', graphController.getRepositoryGraph);

// Get blast radius
router.get('/blast-radius/:repositoryId', graphController.getBlastRadius);

// Get architecture layers
router.get('/architecture/:repositoryId', graphController.getArchitectureLayers);

// Get entity dependencies
router.get('/dependencies/:repositoryId/:entityId', graphController.getEntityDependencies);

// Get circular dependencies
router.get('/circular/:repositoryId', graphController.getCircularDependencies);

export default router;

// Made with Bob
