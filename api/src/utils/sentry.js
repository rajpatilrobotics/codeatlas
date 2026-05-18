import * as Sentry from '@sentry/node';
import { logger } from './logger.js';

const PLACEHOLDER_DSN =
  /your[-_]?sentry|sentry_dsn|optional|placeholder|example\.com/i;

/**
 * Only enable Sentry when DSN is a real https URL (not .env template text).
 */
function isSentryEnabled() {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return false;
  if (PLACEHOLDER_DSN.test(dsn)) return false;
  return dsn.startsWith('https://');
}

const initSentry = (app) => {
  if (!isSentryEnabled()) {
    logger.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment:
        process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      beforeSend(event) {
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        return event;
      },
      ignoreErrors: [
        'ECONNREFUSED',
        'ENOTFOUND',
        'ETIMEDOUT',
        'NetworkError',
        'Non-Error promise rejection',
      ],
    });

    logger.info('Sentry error tracking initialized');
  } catch (error) {
    logger.warn({ err: error }, 'Sentry init failed — continuing without it');
  }
};

const sentryRequestHandler = () => {
  if (!isSentryEnabled()) {
    return (req, res, next) => next();
  }
  if (Sentry.Handlers?.requestHandler) {
    return Sentry.Handlers.requestHandler();
  }
  return (req, res, next) => next();
};

const sentryTracingHandler = () => {
  if (!isSentryEnabled()) {
    return (req, res, next) => next();
  }
  if (Sentry.Handlers?.tracingHandler) {
    return Sentry.Handlers.tracingHandler();
  }
  return (req, res, next) => next();
};

const sentryErrorHandler = () => {
  if (!isSentryEnabled()) {
    return (err, req, res, next) => next(err);
  }
  if (typeof Sentry.expressErrorHandler === 'function') {
    return Sentry.expressErrorHandler();
  }
  if (Sentry.Handlers?.errorHandler) {
    return Sentry.Handlers.errorHandler();
  }
  return (err, req, res, next) => next(err);
};

const captureException = (error, context = {}) => {
  if (!isSentryEnabled()) {
    logger.error({ err: error, ...context }, 'Error captured (Sentry disabled)');
    return;
  }
  Sentry.captureException(error, { extra: context });
};

const captureMessage = (message, level = 'info', context = {}) => {
  if (!isSentryEnabled()) {
    logger[level]({ ...context }, message);
    return;
  }
  Sentry.captureMessage(message, { level, extra: context });
};

const setUser = (user) => {
  if (!isSentryEnabled()) return;
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
};

const clearUser = () => {
  if (!isSentryEnabled()) return;
  Sentry.setUser(null);
};

const addBreadcrumb = (message, category = 'default', data = {}) => {
  if (!isSentryEnabled()) return;
  Sentry.addBreadcrumb({ message, category, data, level: 'info' });
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
  isSentryEnabled,
};
