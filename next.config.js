/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Proxy API requests to backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL + '/api/:path*',
      },
    ];
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  
  // Image optimization
  images: {
    domains: ['localhost', 'github.com'],
    unoptimized: true, // For development
  },
  
  // Disable x-powered-by header
  poweredByHeader: false,
  
  // Webpack configuration
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  
  // Experimental features
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;

// Made with Bob
