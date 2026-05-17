/**
 * Repository Controller
 * 
 * Handles repository analysis requests and status tracking.
 */

import DatabaseService from '../services/database/index.js';
import { repoAnalysisQueue } from '../queues/index.js';

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

      // If completed, return existing data
      if (repository.status === 'completed') {
        return res.json({
          repositoryId: repository.id,
          status: repository.status,
          progress: 100,
          message: 'Repository already analyzed',
        });
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

    // Add job to queue
    const job = await repoAnalysisQueue.add('analyze-repo', {
      repositoryId: repository.id,
      url,
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

    const repository = await db.getRepository(repositoryId);

    if (!repository) {
      return res.status(404).json({
        error: 'Repository not found',
      });
    }

    res.json({
      repositoryId: repository.id,
      name: repository.name,
      owner: repository.owner,
      status: repository.status,
      progress: repository.progress,
      fileCount: repository.fileCount,
      entityCount: repository.entityCount,
      analyzedAt: repository.analyzedAt,
    });
  } catch (error) {
    console.error('Get repository status error:', error);
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

    const repository = await db.getRepository(repositoryId);

    if (!repository) {
      return res.status(404).json({
        error: 'Repository not found',
      });
    }

    const stats = await db.getRepositoryStats(repositoryId);

    res.json({
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
      statistics: {
        files: stats.fileCount,
        entities: stats.entityCount,
        relationships: stats.relationshipCount,
      },
    });
  } catch (error) {
    console.error('Get repository summary error:', error);
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

    const repositories = await db.listRepositories({
      skip,
      take: parseInt(limit),
    });

    res.json({
      repositories,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('List repositories error:', error);
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
