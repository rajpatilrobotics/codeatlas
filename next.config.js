const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Proxy API requests to backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  
  // Image optimization - using remotePatterns instead of deprecated domains
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
      },
    ],
    unoptimized: true, // For development
  },
  
  // Disable x-powered-by header
  poweredByHeader: false,
  
  // Turbopack configuration (Next.js 16+) — pin root so a lockfile in $HOME is not picked
  turbopack: {
    root: path.join(__dirname),
  },
  
  // Webpack configuration (fallback for when using --webpack flag)
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  
  // Experimental features - serverActions is now stable, no longer needed
  experimental: {
    // Remove deprecated serverActions boolean
  },
};

module.exports = nextConfig;

// Made with Bob
