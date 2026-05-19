// Proxy configuration for development server
// Note: Groq/Gemini APIs don't require proxying - they use standard HTTP APIs
// This file is kept for reference but no longer needed for AI providers

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // No proxy configuration needed for Groq/Gemini APIs
  // They use standard HTTP endpoints that work with CORS
  
  // If you need to add proxy for other services, add them here
};

// Made with Bob
