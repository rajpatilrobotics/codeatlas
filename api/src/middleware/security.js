import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

/**
 * Security Middleware Configuration
 * Implements Helmet.js, CORS, and Rate Limiting
 */

// Helmet configuration for security headers
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// CORS configuration
const corsConfig = cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'https://codeatlas.vercel.app', // Production frontend
    ];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message) => {
  // COMPLETELY DISABLE rate limiting in development - always return bypass middleware
  const isDevelopment = process.env.NODE_ENV !== 'production' || process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    console.log(`[SECURITY] Rate limiter DISABLED for development (${message})`);
    return (req, res, next) => next();
  }
  
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
};

// General API rate limiter - 100 requests per 15 minutes (production only)
const generalLimiter = createRateLimiter(
  15 * 60 * 1000,
  100,
  'Too many requests from this IP, please try again later.'
);

// Strict rate limiter for sensitive endpoints - 10 requests per 15 minutes (production only)
const strictLimiter = createRateLimiter(
  15 * 60 * 1000,
  10,
  'Too many requests to this endpoint, please try again later.'
);

// Auth rate limiter - 5 requests per 15 minutes (production only)
const authLimiter = createRateLimiter(
  15 * 60 * 1000,
  5,
  'Too many authentication attempts, please try again later.'
);

// Repository analysis rate limiter - 3 requests per hour (production only)
const analysisLimiter = createRateLimiter(
  60 * 60 * 1000,
  3,
  'Too many analysis requests, please try again in an hour.'
);

// Chat rate limiter - 50 requests per 15 minutes (production only)
const chatLimiter = createRateLimiter(
  15 * 60 * 1000,
  50,
  'Too many chat requests, please slow down.'
);

export {
  helmetConfig,
  corsConfig,
  generalLimiter,
  strictLimiter,
  authLimiter,
  analysisLimiter,
  chatLimiter,
};

// Made with Bob
