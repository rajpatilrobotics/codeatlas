/**
 * CodeAtlas API Server
 * 
 * Main Express server that orchestrates all services.
 */

import './loadEnv.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Import routes
import repoRoutes from './routes/repo.routes.js';
import graphRoutes from './routes/graph.routes.js';
import chatRoutes from './routes/chat.routes.js';
import systemRoutes from './routes/system.routes.js';
import heatmapRoutes from './routes/heatmap.routes.js';
import securityRoutes from './routes/security.routes.js';
import plannerRoutes from './routes/planner.routes.js';
import debugRoutes from './routes/debug.routes.js';

// Import services
import DatabaseService from './services/database/index.js';
import { startWorkers, stopWorkers } from './workers/index.js';
import { closeQueues } from './queues/index.js';
import { setupBullBoard } from './config/bullBoard.js';
import logger from './utils/logger.js';
import { initSentry, sentryErrorHandler } from './utils/sentry.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Sentry (error tracking)
initSentry(app);

// ==================== Middleware ====================

// Security
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false,
}));

// CORS - Allow Vercel deployments and localhost
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Dev: Next may use 3000, 3001, 3002, etc. if the default port is busy
    if (process.env.NODE_ENV !== 'production') {
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        return callback(null, true);
      }
    }

    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://codeatlas.vercel.app',
    ].filter(Boolean);
    
    // Allow all Vercel preview deployments (*.vercel.app)
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log rejected origins for debugging
    console.warn(`CORS: Rejected origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// Rate limiting - DISABLED IN DEVELOPMENT
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use('/api/', limiter);
  logger.info('✅ Rate limiting enabled for production');
} else {
  logger.info('⚠️  Rate limiting DISABLED for development');
}

// ==================== Routes ====================

// Health check (no rate limit)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/repo', repoRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/heatmap', heatmapRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/debug', debugRoutes);

// Bull Board (queue monitoring)
setupBullBoard(app);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'CodeAtlas API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api',
      docs: '/api/system/info',
      monitor: '/admin/queues',
    },
  });
});

// ==================== Error Handling ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Sentry error handler (must be before other error handlers)
app.use(sentryErrorHandler);

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ==================== Server Initialization ====================

async function startServer() {
  try {
    logger.info('🚀 Starting CodeAtlas API Server...');

    // Connect to database
    logger.info('📦 Connecting to database...');
    const db = new DatabaseService();
    await db.connect();
    logger.info('✅ Database connected');

    // Start workers
    logger.info('👷 Starting background workers...');
    await startWorkers();
    logger.info('✅ Workers started');

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`📍 API: http://localhost:${PORT}/api`);
      logger.info(`📊 Monitor: http://localhost:${PORT}/admin/queues`);
      logger.info(`🏥 Health: http://localhost:${PORT}/health`);
      logger.info('');
      logger.info('🎉 CodeAtlas API is ready!');
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// ==================== Graceful Shutdown ====================

async function gracefulShutdown(signal) {
  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  try {
    logger.info('Stopping workers...');
    await stopWorkers();

    logger.info('Closing job queues...');
    await closeQueues();

    logger.info('Disconnecting from database...');
    const db = new DatabaseService();
    await db.disconnect();

    logger.info('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  logger.error('Uncaught Exception:', error);
  logger.error('Stack trace:', error.stack);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION:');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();

export default app;

// Made with Bob
