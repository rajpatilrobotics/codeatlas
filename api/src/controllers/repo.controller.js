/**
 * Repository Controller
 *
 * Handles repository analysis requests and status tracking.
 */

import DatabaseService from '../services/database/index.js';
import AIService from '../services/ai/index.js';
import { repoAnalysisQueue } from '../queues/index.js';
import logger from '../utils/logger.js';

const db = new DatabaseService();
const aiService = new AIService();

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

      // If completed but has zero / stale data, force re-analyze
      if (repository.status === 'completed') {
        const stats = await db.getRepositoryStats(repository.id);
        const hasData = stats.fileCount > 0 || stats.entityCount > 0;

        if (!hasData) {
          logger.info('[RepoController] Force re-analyzing repository with empty analysis data', {
            repositoryId: repository.id,
            url: repository.url,
          });
          await db.clearRepositoryAnalysisData(repository.id);
          await db.updateRepositoryStatus(repository.id, 'pending', 0);
        } else {
          return res.json({
            repositoryId: repository.id,
            status: repository.status,
            progress: 100,
            message: 'Repository already analyzed',
          });
        }
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

    const files = await db.getFilesByRepository(repositoryId);
    const entities = await db.getEntitiesByRepository(repositoryId);

    const languageCounts = {};
    for (const file of files) {
      const lang = file.language || 'unknown';
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    }
    const techStack = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, fileCount]) => ({ name, fileCount }));

    const entityBreakdown = {};
    for (const entity of entities) {
      entityBreakdown[entity.type] = (entityBreakdown[entity.type] || 0) + 1;
    }

    const topFiles = files.slice(0, 10).map((f) => f.path);
    const repoLabel = `${repository.owner}/${repository.name}`;

    let summaryText;
    if (statistics.files === 0) {
      summaryText = `${repoLabel} has not been fully indexed yet. Run analysis again from the home page with the GitHub URL: ${repository.url}`;
    } else {
      const primaryLang = repository.language || techStack[0]?.name || 'multi-language';
      const breakdown = Object.entries(entityBreakdown)
        .map(([type, count]) => `${count} ${type}s`)
        .slice(0, 6)
        .join(', ');
      const baseSummary = `${repoLabel} is a ${primaryLang} project with ${statistics.files} indexed files and ${statistics.entities} code entities (${breakdown || 'see graph views'}). The dependency graph contains ${statistics.relationships} relationships. Use Repository Graph and Chat to explore further.`;

      // Try to generate an AI summary if the repo has data
      try {
        logger.info('[RepoController] Generating AI summary for repository', { repositoryId });
        // Give basic context to the prompt
        const aiPrompt = `Generate a highly detailed architectural and onboarding summary for ${repoLabel}. It is a ${primaryLang} project. Include project purpose, architecture overview, and key features. Top files include: ${topFiles.join(', ')}`;
        const aiResponse = await aiService.generateResponse(repositoryId, aiPrompt, {
          taskType: 'architecture',
          includeReasoning: false
        });
        summaryText = aiResponse.response || baseSummary;
      } catch (aiErr) {
        logger.warn('[RepoController] AI summary generation failed, falling back to base summary', { error: aiErr.message });
        summaryText = baseSummary;
      }
    }

    const quickStart =
      statistics.files === 0
        ? `1. Open the CodeAtlas home page\n2. Paste: ${repository.url}\n3. Wait for analysis to complete\n4. Return to Dashboard and Summary`
        : [
            '1. Repository Graph — explore file and module dependencies',
            '2. Architecture — see layered structure',
            '3. Chat — ask questions about this codebase',
            '4. Heatmap — find complex or hot files',
            '',
            topFiles.length ? 'Notable files:' : '',
            ...topFiles.map((p) => `- ${p}`),
          ]
            .filter(Boolean)
            .join('\n');

    const insights = [];
    if (statistics.files > 0) {
      insights.push({
        title: 'Repository indexed',
        description: `${statistics.files} files, ${statistics.entities} code entities, and ${statistics.relationships} relationships are ready.`,
      });
      if (techStack.length) {
        insights.push({
          title: 'Languages detected',
          description: techStack.map((t) => `${t.name} (${t.fileCount} files)`).join(', '),
        });
      }
    }
    if (repository.status === 'analyzing') {
      insights.push({
        title: 'Analysis in progress',
        description: 'Refresh in a few seconds for updated metrics.',
      });
    }
    if (repository.status === 'failed') {
      insights.push({
        title: 'Last analysis failed',
        description: 'Run analyze again from the home page.',
      });
    }
    if (statistics.files === 0 && repository.status === 'completed') {
      insights.push({
        title: 'Empty index',
        description: 'Analysis finished but no files were stored. Try a larger public repo (e.g. expressjs/express) or re-run analyze.',
      });
    }

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
      insights,
      summary: summaryText,
      description: summaryText,
      techStack,
      entityBreakdown,
      topFiles,
      quickStart,
      setupInstructions: quickStart,
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
 * Onboarding guide derived from repository summary.
 * GET /api/repo/onboarding/:repositoryId
 */
export async function getRepositoryOnboarding(req, res) {
  try {
    const { repositoryId } = req.params;

    const repository = await db.getRepository(repositoryId);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const repoStats = await db.getRepositoryStats(repositoryId);
    const stats = {
      files: repoStats.fileCount || 0,
      entities: repoStats.entityCount || 0,
      relationships: repoStats.relationshipCount || 0,
    };

    const sections = [
      {
        title: 'Repository overview',
        items: [
          `Analyze **${repository.owner}/${repository.name}** from your indexed graph.`,
          `Indexed files: **${stats.files}**, entities: **${stats.entities}**, relationships: **${stats.relationships}**.`,
        ],
      },
      {
        title: 'Suggested first steps',
        items: [
          'Open **Summary** for health metrics and language mix.',
          'Use **Repository Graph** to explore dependency structure.',
          'Try **Chat** with a concrete question about a module or API.',
        ],
      },
      {
        title: 'When analysis is still running',
        items: [
          'Watch **Dashboard** progress until status is **completed**.',
          'Graph and heatmap views work best after the first successful ingest.',
        ],
      },
    ];

    const markdown = sections
      .map((s) => `## ${s.title}\n\n${s.items.map((i) => `- ${i}`).join('\n')}`)
      .join('\n\n');

    return res.json({
      repositoryId,
      repository: {
        id: repository.id,
        name: repository.name,
        owner: repository.owner,
        url: repository.url,
        status: repository.status,
      },
      statistics: stats,
      sections,
      markdown,
    });
  } catch (error) {
    logger.error('[RepoController] getRepositoryOnboarding error', {
      error: error.message,
      repositoryId: req.params.repositoryId,
    });
    return res.status(500).json({
      error: 'Failed to build onboarding guide',
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
