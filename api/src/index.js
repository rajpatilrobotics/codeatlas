import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { securityMiddleware, rateLimiters } from './middleware/security.js';
import { requestLogger, errorLogger } from './utils/logger.js';
import { initSentry, sentryErrorHandler } from './utils/sentry.js';
import { serverAdapter } from './config/bullBoard.js';

// Import route modules
import repoRoutes from './routes/repo.routes.js';
import graphRoutes from './routes/graph.routes.js';
import chatRoutes from './routes/chat.routes.js';
import systemRoutes from './routes/system.routes.js';

// Initialize Sentry
initSentry();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));
app.use(requestLogger);

// Rate limiting
app.use('/api', rateLimiters.general);

// Bull Board - Queue monitoring dashboard
app.use('/admin/queues', serverAdapter.getRouter());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.get('/api', (req, res) => {
  res.json({
    message: 'CodeAtlas API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      queues: '/admin/queues',
      repo: '/api/repo',
      graph: '/api/graph',
      chat: '/api/chat',
      system: '/api/system'
    }
  });
});

// Mount route modules
app.use('/api/repo', repoRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/system', systemRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error logging
app.use(errorLogger);

// Sentry error handler (must be before other error handlers)
app.use(sentryErrorHandler);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CodeAtlas API server running on port ${PORT}`);
  console.log(`📊 Bull Board available at http://localhost:${PORT}/admin/queues`);
  console.log(`🏥 Health check at http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;

// Made with Bob
