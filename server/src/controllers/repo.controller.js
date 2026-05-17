// ============================================
// CODEATLAS - Repository Controller
// ============================================

const prisma = require('../config/prisma');
const { z } = require('zod');
const { addRepoAnalysisJob, getJobStatus } = require('../config/queue');

// Validation schemas
const analyzeRepoSchema = z.object({
  githubUrl: z.string().url(),
  branch: z.string().optional().default('main')
});

/**
 * Start repository analysis
 */
exports.analyzeRepository = async (req, res, next) => {
  try {
    const { githubUrl, branch } = analyzeRepoSchema.parse(req.body);

    // Create repository record
    const repository = await prisma.repository.create({
      data: {
        githubUrl,
        name: githubUrl.split('/').pop().replace('.git', ''),
        owner: githubUrl.split('/').slice(-2, -1)[0],
        branch,
        status: 'PENDING'
      }
    });

    // Add to BullMQ queue for processing
    await addRepoAnalysisJob({
      repoId: repository.id,
      githubUrl,
      branch
    });

    res.status(202).json({
      message: 'Repository analysis started',
      jobId: repository.id,
      repository: {
        id: repository.id,
        name: repository.name,
        status: repository.status
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get job status
 */
exports.getJobStatus = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const repository = await prisma.repository.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        name: true,
        status: true,
        progress: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!repository) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      jobId: repository.id,
      status: repository.status,
      progress: repository.progress,
      error: repository.errorMessage,
      createdAt: repository.createdAt,
      updatedAt: repository.updatedAt
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get repository summary
 */
exports.getRepositorySummary = async (req, res, next) => {
  try {
    const { repoId } = req.params;

    const repository = await prisma.repository.findUnique({
      where: { id: repoId },
      include: {
        metrics: true,
        _count: {
          select: {
            files: true,
            entities: true,
            relationships: true
          }
        }
      }
    });

    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    res.json({
      id: repository.id,
      name: repository.name,
      owner: repository.owner,
      description: repository.description,
      language: repository.language,
      stars: repository.stars,
      forks: repository.forks,
      status: repository.status,
      metrics: repository.metrics,
      counts: repository._count,
      analyzedAt: repository.analyzedAt
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all repositories
 */
exports.listRepositories = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [repositories, total] = await Promise.all([
      prisma.repository.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          owner: true,
          githubUrl: true,
          status: true,
          language: true,
          stars: true,
          createdAt: true,
          analyzedAt: true
        }
      }),
      prisma.repository.count({ where })
    ]);

    res.json({
      repositories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get repository details
 */
exports.getRepository = async (req, res, next) => {
  try {
    const { repoId } = req.params;

    const repository = await prisma.repository.findUnique({
      where: { id: repoId },
      include: {
        metrics: true
      }
    });

    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    res.json(repository);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete repository
 */
exports.deleteRepository = async (req, res, next) => {
  try {
    const { repoId } = req.params;

    await prisma.repository.delete({
      where: { id: repoId }
    });

    res.json({ message: 'Repository deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Made with Bob
