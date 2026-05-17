const pino = require('pino');

/**
 * Pino Logger Configuration
 * Provides structured logging for the application
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  
  // Pretty print in development
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      }
    : undefined,
  
  // Base configuration
  base: {
    env: process.env.NODE_ENV || 'development',
    app: 'codeatlas-api',
  },
  
  // Timestamp format
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  
  // Serializers for common objects
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      headers: {
        host: req.headers.host,
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer,
      },
      remoteAddress: req.ip,
      remotePort: req.socket?.remotePort,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: res.getHeaders(),
    }),
    err: pino.stdSerializers.err,
  },
});

/**
 * Create a child logger with additional context
 */
const createLogger = (context) => {
  return logger.child(context);
};

/**
 * Log HTTP request
 */
const logRequest = (req, res, duration) => {
  const log = {
    req,
    res,
    duration: `${duration}ms`,
  };
  
  if (res.statusCode >= 500) {
    logger.error(log, 'HTTP Request Error');
  } else if (res.statusCode >= 400) {
    logger.warn(log, 'HTTP Request Warning');
  } else {
    logger.info(log, 'HTTP Request');
  }
};

/**
 * Log error with context
 */
const logError = (error, context = {}) => {
  logger.error(
    {
      err: error,
      ...context,
    },
    error.message || 'An error occurred'
  );
};

/**
 * Log info with context
 */
const logInfo = (message, context = {}) => {
  logger.info(context, message);
};

/**
 * Log warning with context
 */
const logWarn = (message, context = {}) => {
  logger.warn(context, message);
};

/**
 * Log debug with context
 */
const logDebug = (message, context = {}) => {
  logger.debug(context, message);
};

/**
 * Express middleware for request logging
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    logRequest(req, res, duration);
  });
  
  next();
};

module.exports = {
  logger,
  createLogger,
  logRequest,
  logError,
  logInfo,
  logWarn,
  logDebug,
  requestLogger,
};

// Made with Bob
