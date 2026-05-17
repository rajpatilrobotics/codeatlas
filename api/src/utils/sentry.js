import * as Sentry from '@sentry/node';
import { logger } from './logger.js';

/**
 * Sentry Error Tracking Configuration
 * Provides error monitoring and performance tracking
 */

const initSentry = (app) => {
  // Only initialize Sentry in production or if DSN is provided
  if (!process.env.SENTRY_DSN) {
    logger.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Set sample rate for performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Integrations
    integrations: [
      // HTTP integration for tracking requests
      new Sentry.Integrations.Http({ tracing: true }),
      
      // Express integration
      new Sentry.Integrations.Express({ app }),
      
      // Prisma integration (if available)
      ...(process.env.DATABASE_URL ? [new Sentry.Integrations.Prisma()] : []),
    ],
    
    // Before send hook to filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      
      // Remove sensitive query parameters
      if (event.request?.query_string) {
        const sensitiveParams = ['token', 'api_key', 'password'];
        sensitiveParams.forEach(param => {
          if (event.request.query_string.includes(param)) {
            event.request.query_string = event.request.query_string.replace(
              new RegExp(`${param}=[^&]*`, 'g'),
              `${param}=[REDACTED]`
            );
          }
        });
      }
      
      return event;
    },
    
    // Ignore certain errors
    ignoreErrors: [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'NetworkError',
      'Non-Error promise rejection',
    ],
  });

  logger.info('Sentry error tracking initialized');
};

/**
 * Express middleware for Sentry request handler
 */
const sentryRequestHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.requestHandler();
};

/**
 * Express middleware for Sentry tracing
 */
const sentryTracingHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.tracingHandler();
};

/**
 * Express middleware for Sentry error handler
 */
const sentryErrorHandler = () => {
  if (!process.env.SENTRY_DSN) {
    return (err, req, res, next) => next(err);
  }
  return Sentry.Handlers.errorHandler();
};

/**
 * Capture exception manually
 */
const captureException = (error, context = {}) => {
  if (!process.env.SENTRY_DSN) {
    logger.error({ err: error, ...context }, 'Error captured (Sentry disabled)');
    return;
  }
  
  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Capture message manually
 */
const captureMessage = (message, level = 'info', context = {}) => {
  if (!process.env.SENTRY_DSN) {
    logger[level]({ ...context }, message);
    return;
  }
  
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
};

/**
 * Set user context for error tracking
 */
const setUser = (user) => {
  if (!process.env.SENTRY_DSN) return;
  
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
};

/**
 * Clear user context
 */
const clearUser = () => {
  if (!process.env.SENTRY_DSN) return;
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for debugging
 */
const addBreadcrumb = (message, category = 'default', data = {}) => {
  if (!process.env.SENTRY_DSN) return;
  
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};

export {
  initSentry,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
};

// Made with Bob
