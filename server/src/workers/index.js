// ============================================
// CODEATLAS - Worker Process Entry Point
// ============================================

require('dotenv').config();
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

logger.info('🚀 Starting CodeAtlas Workers...');

// Import all workers
const repoAnalysisWorker = require('./repoAnalysisWorker');

logger.info('✅ All workers initialized and ready');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Keep process alive
process.stdin.resume();

// Made with Bob
