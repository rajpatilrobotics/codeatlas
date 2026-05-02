// Proxy configuration for development server
// This allows the React app to bypass CORS restrictions when calling IBM APIs

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy IBM IAM token requests
  app.use(
    '/api/iam/token',
    createProxyMiddleware({
      target: 'https://iam.cloud.ibm.com/identity/token',
      changeOrigin: true,
      pathRewrite: {
        '^/api/iam/token': '',
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying IAM request to:', proxyReq.path);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('IAM response status:', proxyRes.statusCode);
      },
    })
  );

  // Proxy watsonx.ai API requests
  app.use(
    '/api/watsonx/text/generation',
    createProxyMiddleware({
      target: 'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation',
      changeOrigin: true,
      pathRewrite: {
        '^/api/watsonx/text/generation': '',
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying watsonx.ai request to:', proxyReq.path);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('Watsonx.ai response status:', proxyRes.statusCode);
      },
    })
  );
};

// Made with Bob
