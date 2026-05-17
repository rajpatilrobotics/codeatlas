// ============================================
// CODEATLAS - System Controller
// ============================================

const prisma = require('../config/prisma');

/**
 * System health check
 */
exports.healthCheck = async (req, res, next) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'connected',
        redis: 'connected', // TODO: Add actual Redis check
        qdrant: 'connected' // TODO: Add actual Qdrant check
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
};

/**
 * Get system metrics
 */
exports.getMetrics = async (req, res, next) => {
  try {
    const [repoCount, fileCount, entityCount] = await Promise.all([
      prisma.repository.count(),
      prisma.file.count(),
      prisma.entity.count()
    ]);

    res.json({
      repositories: repoCount,
      files: fileCount,
      entities: entityCount,
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal
      },
      uptime: process.uptime()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get system status
 */
exports.getStatus = async (req, res, next) => {
  try {
    const activeJobs = await prisma.repository.count({
      where: {
        status: {
          in: ['PENDING', 'CLONING', 'PARSING', 'EXTRACTING', 'GENERATING_GRAPH', 'EMBEDDING', 'SUMMARIZING']
        }
      }
    });

    res.json({
      status: 'operational',
      activeJobs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

// Made with Bob
