/**
 * Repository Controller
 *
 * Handles repository analysis requests and status tracking.
 */

import DatabaseService from '../services/database/index.js';
import { repoAnalysisQueue } from '../queues/index.js';
import logger from '../utils/logger.js';

const db = new DatabaseService();

/**
 * Analyze repository
 * POST /api/repo/analyze
 */
export async function analyzeRepository(req, res) {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'Repository URL is required',
      });
    }

    // Check if repository already exists
    let repository = await db.getRepositoryByUrl(url);

    if (repository) {
      // If already analyzing, return existing job
      if (repository.status === 'analyzing') {
        return res.json({
          repositoryId: repository.id,
          status: repository.status,
          progress: repository.progress,
          message: 'Repository is already being analyzed',
        });
      }

      // If completed but has zero data, force re-analyze
      if (repository.status === 'completed' && repository.fileCount === 0) {
        logger.info('[RepoController] Force re-analyzing repository with zero data', {
          repositoryId: repository.id,
          url: repository.url
        });
        await db.clearRepositoryAnalysisData(repository.id);
        await db.updateRepositoryStatus(repository.id, 'pending', 0);
      }
      // If completed with data, return existing data
      else if (repository.status === 'completed') {
        return res.json({
          repositoryId: repository.id,
          status: repository.status,
          progress: 100,
          message: 'Repository already analyzed',
        });
      }

      // If failed or pending, reset and re-analyze
      if (repository.status === 'failed' || repository.status === 'pending') {
        await db.clearRepositoryAnalysisData(repository.id);
        await db.updateRepositoryStatus(repository.id, 'pending', 0);
      }
    } else {
      // Create new repository
      const urlParts = url.replace('https://github.com/', '').split('/');
      const owner = urlParts[0];
      const name = urlParts[1]?.replace('.git', '');

      repository = await db.createRepository({
        name,
        owner,
        url,
        status: 'pending',
      });
    }

    // Add job to queue with correct data format for worker
    const job = await repoAnalysisQueue.add('analyze-repo', {
      repoUrl: url,
      options: {
        repositoryId: repository.id,
        token: process.env.GITHUB_TOKEN
      }
    });

    // Update status to analyzing
    await db.updateRepositoryStatus(repository.id, 'analyzing', 0);

    res.json({
      repositoryId: repository.id,
      jobId: job.id,
      status: 'analyzing',
      progress: 0,
      message: 'Repository analysis started',
    });
  } catch (error) {
    console.error('Analyze repository error:', error);
    res.status(500).json({
      error: 'Failed to start repository analysis',
      message: error.message,
    });
  }
}

/**
 * Get repository status
 * GET /api/repo/status/:repositoryId
 */
export async function getRepositoryStatus(req, res) {
  try {
    const { repositoryId } = req.params;

    logger.info('[RepoController] Getting repository status', { repositoryId });

    const repository = await db.getRepository(repositoryId);

    if (!repository) {
      logger.warn('[RepoController] Repository not found', { repositoryId });
      return res.status(404).json({
        error: 'Repository not found',
      });
    }

    logger.info('[RepoController] Repository status retrieved', {
      repositoryId: repository.id,
      name: repository.name,
      status: repository.status,
      progress: repository.progress,
      fileCount: repository._count?.files || 0,
      entityCount: repository._count?.entities || 0,
      relationshipCount: repository._count?.relationships || 0
    });

    res.json({
      repositoryId: repository.id,
      name: repository.name,
      owner: repository.owner,
      url: repository.url,
      status: repository.status,
      progress: repository.progress,
      fileCount: repository._count?.files || 0,
      entityCount: repository._count?.entities || 0,
      relationshipCount: repository._count?.relationships || 0,
      analyzedAt: repository.analyzedAt,
    });
  } catch (error) {
    logger.error('[RepoController] Get repository status error', {
      error: error.message,
      stack: error.stack,
      repositoryId: req.params.repositoryId
    });
    res.status(500).json({
      error: 'Failed to get repository status',
      message: error.message,
    });
  }
}

/**
 * Get repository summary
 * GET /api/repo/summary/:repositoryId
 */
export async function getRepositorySummary(req, res) {
  try {
    const { repositoryId } = req.params;

    logger.info('[RepoController] Getting repository summary', { repositoryId });

    const repository = await db.getRepository(repositoryId);

    if (!repository) {
      logger.warn('[RepoController] Repository not found', { repositoryId });
      return res.status(404).json({
        error: 'Repository not found',
      });
    }

    logger.info('[RepoController] Repository found', {
      repositoryId: repository.id,
      name: repository.name,
      status: repository.status,
      countsFromRepo: {
        files: repository._count?.files || 0,
        entities: repository._count?.entities || 0,
        relationships: repository._count?.relationships || 0
      }
    });

    const repoStats = await db.getRepositoryStats(repositoryId);

    logger.info('[RepoController] Repository stats retrieved', {
      repositoryId,
      statsFromQuery: {
        fileCount: repoStats.fileCount,
        entityCount: repoStats.entityCount,
        relationshipCount: repoStats.relationshipCount
      }
    });

    // Check for empty data
    if (repoStats.entityCount === 0) {
      logger.warn('[RepoController] No entities found for repository', { repositoryId });
    }
    if (repoStats.relationshipCount === 0) {
      logger.warn('[RepoController] No relationships found for repository', { repositoryId });
    }

    const statistics = {
      files: repoStats.fileCount || 0,
      entities: repoStats.entityCount || 0,
      relationships: repoStats.relationshipCount || 0,
    };

    const stats = {
      totalFiles: statistics.files,
      totalEntities: statistics.entities,
      totalRelationships: statistics.relationships,
      totalDependencies: statistics.relationships,
    };

    const response = {
      repository: {
        id: repository.id,
        name: repository.name,
        owner: repository.owner,
        url: repository.url,
        description: repository.description,
        language: repository.language,
        status: repository.status,
        analyzedAt: repository.analyzedAt,
      },
      statistics,
      stats,
    };

    logger.info('[RepoController] Sending summary response', {
      repositoryId,
      responseStats: response.statistics
    });

    res.json(response);
  } catch (error) {
    logger.error('[RepoController] Get repository summary error', {
      error: error.message,
      stack: error.stack,
      repositoryId: req.params.repositoryId
    });
    res.status(500).json({
      error: 'Failed to get repository summary',
      message: error.message,
    });
  }
}

/**
 * List repositories
 * GET /api/repo/list
 */
export async function listRepositories(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    logger.info('[RepoController] Listing repositories', { page, limit, skip });

    const repositories = await db.listRepositories({
      skip,
      take: parseInt(limit),
    });

    logger.info('[RepoController] Repositories retrieved', {
      count: repositories.length,
      page: parseInt(page),
      limit: parseInt(limit),
      sampleRepos: repositories.slice(0, 3).map(r => ({
        id: r.id,
        name: r.name,
        status: r.status,
        entityCount: r._count?.entities || 0
      }))
    });

    res.json({
      repositories,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    logger.error('[RepoController] List repositories error', {
      error: error.message,
      stack: error.stack,
      page: req.query.page,
      limit: req.query.limit
    });
    res.status(500).json({
      error: 'Failed to list repositories',
      message: error.message,
    });
  }
}

/**
 * Delete repository
 * DELETE /api/repo/:repositoryId
 */
export async function deleteRepository(req, res) {
  try {
    const { repositoryId } = req.params;

    await db.deleteRepository(repositoryId);

    res.json({
      message: 'Repository deleted successfully',
    });
  } catch (error) {
    console.error('Delete repository error:', error);
    res.status(500).json({
      error: 'Failed to delete repository',
      message: error.message,
    });
  }
}

// Made with Bob
