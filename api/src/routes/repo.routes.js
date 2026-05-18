/**
 * Repository Routes
 */

import express from 'express';
import * as repoController from '../controllers/repo.controller.js';

const router = express.Router();

// Analyze repository
router.post('/analyze', repoController.analyzeRepository);

// Get repository status
router.get('/status/:repositoryId', repoController.getRepositoryStatus);

// Get repository summary
router.get('/summary/:repositoryId', repoController.getRepositorySummary);

// List repositories
router.get('/list', repoController.listRepositories);

// Onboarding guide (client: lib/api.js)
router.get('/onboarding/:repositoryId', repoController.getRepositoryOnboarding);

// Delete repository
router.delete('/:repositoryId', repoController.deleteRepository);

export default router;

// Made with Bob
