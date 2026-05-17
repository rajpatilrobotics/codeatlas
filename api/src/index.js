const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { securityMiddleware, rateLimiters } = require('./middleware/security');
const { requestLogger, errorLogger } = require('./utils/logger');
const { initSentry, sentryErrorHandler } = require('./utils/sentry');
const { serverAdapter } = require('./config/bullBoard');

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

// API routes (to be implemented)
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
      security: '/api/security',
      planner: '/api/planner',
      debug: '/api/debug',
      heatmap: '/api/heatmap'
    }
  });
});

// Repository routes
app.post('/api/repo/analyze', rateLimiters.repo, (req, res) => {
  res.json({ message: 'Repository analysis endpoint - to be implemented' });
});

app.get('/api/repo/status/:jobId', (req, res) => {
  res.json({ message: 'Job status endpoint - to be implemented' });
});

app.get('/api/repo/summary/:repoId', (req, res) => {
  res.json({ message: 'Repository summary endpoint - to be implemented' });
});

// Graph routes
app.get('/api/graph/architecture/:repoId', rateLimiters.graph, (req, res) => {
  res.json({ message: 'Architecture graph endpoint - to be implemented' });
});

app.get('/api/graph/blast-radius/:repoId', rateLimiters.graph, (req, res) => {
  res.json({ message: 'Blast radius endpoint - to be implemented' });
});

app.get('/api/graph/heatmap/:repoId', rateLimiters.graph, (req, res) => {
  res.json({ message: 'Heatmap endpoint - to be implemented' });
});

// Chat routes
app.post('/api/chat/query', rateLimiters.chat, (req, res) => {
  res.json({ message: 'Chat query endpoint - to be implemented' });
});

app.get('/api/chat/history/:repoId', (req, res) => {
  res.json({ message: 'Chat history endpoint - to be implemented' });
});

// Security routes
app.get('/api/security/scan/:repoId', (req, res) => {
  res.json({ message: 'Security scan endpoint - to be implemented' });
});

// Planner routes
app.post('/api/planner/analyze', (req, res) => {
  res.json({ message: 'Planner analysis endpoint - to be implemented' });
});

// Debug routes
app.get('/api/debug/trace/:repoId', (req, res) => {
  res.json({ message: 'Debug trace endpoint - to be implemented' });
});

// Heatmap routes
app.get('/api/heatmap/activity/:repoId', (req, res) => {
  res.json({ message: 'Activity heatmap endpoint - to be implemented' });
});

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

module.exports = app;

// Made with Bob
