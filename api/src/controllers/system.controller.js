/**
 * System Controller
 * 
 * Handles system health checks and monitoring.
 */

import DatabaseService from '../services/database/index.js';
import ChatService from '../services/chat/index.js';
import prismaService from '../services/database/prisma.js';

const db = new DatabaseService();
const chatService = new ChatService();

/**
 * Health check
 * GET /api/system/health
 */
export async function healthCheck(req, res) {
  try {
    // Check database
    const dbHealthy = await db.healthCheck();

    // Check chat service
    const chatHealth = await chatService.healthCheck();

    // Get chat stats
    const chatStats = chatService.getStats();

    const status = dbHealthy && chatHealth.status === 'healthy' 
      ? 'healthy' 
      : 'degraded';

    res.json({
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy,
        ai: chatHealth.status === 'healthy',
        chat: true,
      },
      stats: {
        activeChatSessions: chatStats.activeSessions,
        totalMessages: chatStats.totalMessages,
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get system statistics
 * GET /api/system/stats
 */
export async function getSystemStats(req, res) {
  try {
    // Get repository count
    const repositories = await db.listRepositories({ take: 1000 });

    // Count by status
    const statusCounts = repositories.reduce((acc, repo) => {
      acc[repo.status] = (acc[repo.status] || 0) + 1;
      return acc;
    }, {});

    // Get chat stats
    const chatStats = chatService.getStats();

    res.json({
      repositories: {
        total: repositories.length,
        byStatus: statusCounts,
      },
      chat: {
        activeSessions: chatStats.activeSessions,
        totalMessages: chatStats.totalMessages,
        avgMessagesPerSession: chatStats.avgMessagesPerSession,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({
      error: 'Failed to get system statistics',
      message: error.message,
    });
  }
}

/**
 * Get API info
 * GET /api/system/info
 */
export async function getApiInfo(req, res) {
  res.json({
    name: 'CodeAtlas API',
    version: '1.0.0',
    description: 'AI-native developer intelligence platform',
    endpoints: {
      repository: [
        'POST /api/repo/analyze',
        'GET /api/repo/status/:repositoryId',
        'GET /api/repo/summary/:repositoryId',
        'GET /api/repo/onboarding/:repositoryId',
        'GET /api/repo/list',
        'DELETE /api/repo/:repositoryId',
      ],
      graph: [
        'GET /api/graph/heatmap/:repositoryId',
        'GET /api/graph/:repositoryId',
        'GET /api/graph/blast-radius/:repositoryId',
        'GET /api/graph/architecture/:repositoryId',
        'GET /api/graph/dependencies/:repositoryId/:entityId',
        'GET /api/graph/circular/:repositoryId',
      ],
      chat: [
        'POST /api/chat/session',
        'POST /api/chat/message',
        'POST /api/chat/message/stream',
        'GET /api/chat/history/:sessionId',
        'GET /api/chat/session/:sessionId',
        'POST /api/chat/quick-ask',
        'GET /api/chat/suggestions/:sessionId',
        'DELETE /api/chat/history/:sessionId',
      ],
      security: [
        'POST /api/security/scan',
        'GET /api/security/report/:repoId',
      ],
      planner: [
        'POST /api/planner/analyze',
        'GET /api/planner/impact/:repoId',
      ],
      debug: [
        'POST /api/debug/analyze',
        'GET /api/debug/suggestions/:repoId',
      ],
      heatmap: [
        'GET /api/heatmap/complexity/:repositoryId',
        'GET /api/heatmap/changes/:repositoryId',
      ],
      system: [
        'GET /api/system/health',
        'GET /api/system/stats',
        'GET /api/system/info',
      ],
    },
  });
}

// Made with Bob
