// Vercel Serverless Function for GitHub API
// This proxies GitHub API calls with server-side authentication
// Prevents token exposure and rate limit issues

const fetch = require('node-fetch');

const GITHUB_API_BASE = 'https://api.github.com';

// Helper to get authenticated headers
const getHeaders = (token) => {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  return headers;
};

// Parse GitHub URL to extract owner and repo
function parseGitHubUrl(url) {
  if (!url) return null;
  
  url = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
  
  const patterns = [
    /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)/,
    /^github\.com\/([^\/]+)\/([^\/]+)/,
    /^([^\/]+)\/([^\/]+)$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  }
  
  return null;
}

// Identify important files from file tree - COMPREHENSIVE VERSION
function identifyImportantFiles(fileTree, maxFiles = 50) {
  const importantPatterns = [
    // Critical files (priority 1)
    { pattern: /^README\.md$/i, priority: 1 },
    { pattern: /^package\.json$/i, priority: 1 },
    { pattern: /^requirements\.txt$/i, priority: 1 },
    { pattern: /^Cargo\.toml$/i, priority: 1 },
    { pattern: /^go\.mod$/i, priority: 1 },
    { pattern: /^composer\.json$/i, priority: 1 },
    
    // Main entry points (priority 2)
    { pattern: /^(src\/)?index\.(js|ts|jsx|tsx)$/i, priority: 2 },
    { pattern: /^(src\/)?main\.(js|ts|py|rs|go|java)$/i, priority: 2 },
    { pattern: /^(src\/)?App\.(jsx|tsx|js|ts)$/i, priority: 2 },
    { pattern: /^(src\/)?server\.(js|ts)$/i, priority: 2 },
    { pattern: /^(src\/)?app\.py$/i, priority: 2 },
    
    // Configuration files (priority 3)
    { pattern: /^\.env\.example$/i, priority: 3 },
    { pattern: /^config\.(js|json|yaml|yml)$/i, priority: 3 },
    { pattern: /^tsconfig\.json$/i, priority: 3 },
    { pattern: /^webpack\.config\.(js|ts)$/i, priority: 3 },
    { pattern: /^vite\.config\.(js|ts)$/i, priority: 3 },
    { pattern: /^next\.config\.(js|ts)$/i, priority: 3 },
    
    // Source files - Components (priority 4)
    { pattern: /\/(components?|views?|pages?|screens?)\/.*\.(jsx?|tsx?|vue)$/i, priority: 4 },
    
    // Source files - Services/Utils (priority 5)
    { pattern: /\/(services?|utils?|helpers?|lib|libs?)\/.*\.(js|ts|jsx|tsx|py|go|rs)$/i, priority: 5 },
    
    // API/Routes (priority 6)
    { pattern: /\/(api|routes?|controllers?|handlers?)\/.*\.(js|ts|py|go|rs)$/i, priority: 6 },
    
    // Models/Schemas (priority 7)
    { pattern: /\/(models?|schemas?|entities?)\/.*\.(js|ts|py|go|rs)$/i, priority: 7 },
    
    // Tests (priority 8)
    { pattern: /\.(test|spec)\.(js|ts|jsx|tsx|py)$/i, priority: 8 },
    { pattern: /\/__tests__\/.*\.(js|ts|jsx|tsx)$/i, priority: 8 },
    
    // Documentation (priority 9)
    { pattern: /\.md$/i, priority: 9 },
    
    // Other source files (priority 10)
    { pattern: /\.(js|ts|jsx|tsx|py|go|rs|java|php|rb)$/i, priority: 10 },
  ];

  // Score all files
  const scored = fileTree.map(path => {
    // Skip certain directories and files
    if (
      path.includes('node_modules/') ||
      path.includes('.git/') ||
      path.includes('dist/') ||
      path.includes('build/') ||
      path.includes('coverage/') ||
      path.includes('.next/') ||
      path.includes('__pycache__/') ||
      path.includes('vendor/') ||
      path.includes('.min.') ||
      path.endsWith('.lock') ||
      path.endsWith('.sum')
    ) {
      return { path, priority: 999 };
    }

    // Find matching pattern
    for (const { pattern, priority } of importantPatterns) {
      if (pattern.test(path)) {
        return { path, priority };
      }
    }
    
    return { path, priority: 999 };
  });

  // Return top files sorted by priority
  return scored
    .filter(item => item.priority < 999)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      // Secondary sort by path length (prefer shorter paths)
      return a.path.length - b.path.length;
    })
    .slice(0, maxFiles)
    .map(item => item.path);
}

// Detect tech stack from file tree and contents
function detectTechStack(fileTree, fileContents, packageJson) {
  const techStack = {
    frontend: [],
    backend: [],
    database: [],
    testing: [],
    devops: [],
    cache: [],
    messageQueue: [],
    authentication: [],
    orm: []
  };

  const depNames = (() => {
    if (!packageJson || typeof packageJson !== 'object') return [];
    const buckets = [
      packageJson.dependencies,
      packageJson.devDependencies,
      packageJson.peerDependencies,
      packageJson.optionalDependencies,
    ].filter(Boolean);
    const names = buckets.flatMap((bucket) => Object.keys(bucket || {}));
    return Array.from(new Set(names.map((name) => String(name).toLowerCase())));
  })();

  const allContent = Object.values(fileContents).join('\n').toLowerCase();
  const fileTreeStr = fileTree.join('\n').toLowerCase();

  const hasDep = (name) => depNames.includes(String(name).toLowerCase());
  const anyDep = (...names) => names.some(hasDep);

  // Frontend detection
  if (anyDep('react', 'react-dom') || allContent.includes('react')) techStack.frontend.push('React');
  if (anyDep('vue', '@vue/cli-service') || allContent.includes('vue')) techStack.frontend.push('Vue.js');
  if (anyDep('@angular/core', '@angular/cli') || allContent.includes('angular')) techStack.frontend.push('Angular');
  if (anyDep('svelte', '@sveltejs/kit') || allContent.includes('svelte')) techStack.frontend.push('Svelte');
  if (anyDep('next') || fileTreeStr.includes('next.config.') || allContent.includes('next')) techStack.frontend.push('Next.js');
  if (anyDep('vite') || fileTreeStr.includes('vite.config.')) techStack.frontend.push('Vite');

  // Backend detection
  if (anyDep('express') || allContent.includes('express')) techStack.backend.push('Express.js');
  if (anyDep('fastify') || allContent.includes('fastify')) techStack.backend.push('Fastify');
  if (anyDep('koa') || allContent.includes('koa')) techStack.backend.push('Koa');
  if (anyDep('@nestjs/core') || allContent.includes('nestjs')) techStack.backend.push('NestJS');
  if (allContent.includes('django')) techStack.backend.push('Django');
  if (allContent.includes('flask')) techStack.backend.push('Flask');
  if (allContent.includes('spring')) techStack.backend.push('Spring Boot');
  if (fileTreeStr.includes('go.mod')) techStack.backend.push('Go');

  // Database detection
  if (anyDep('mongodb', 'mongoose') || allContent.includes('mongodb') || allContent.includes('mongoose')) techStack.database.push('MongoDB');
  if (anyDep('pg', 'postgres') || allContent.includes('postgresql') || allContent.includes(' pg')) techStack.database.push('PostgreSQL');
  if (anyDep('mysql', 'mysql2') || allContent.includes('mysql')) techStack.database.push('MySQL');
  if (anyDep('redis', 'ioredis') || allContent.includes('redis')) techStack.database.push('Redis');
  if (anyDep('sqlite3', 'better-sqlite3') || allContent.includes('sqlite')) techStack.database.push('SQLite');

  // ORM detection
  if (anyDep('prisma') || allContent.includes('prisma')) techStack.orm.push('Prisma');
  if (anyDep('sequelize') || allContent.includes('sequelize')) techStack.orm.push('Sequelize');
  if (anyDep('typeorm') || allContent.includes('typeorm')) techStack.orm.push('TypeORM');
  if (anyDep('mongoose') || allContent.includes('mongoose')) techStack.orm.push('Mongoose');

  // Testing detection
  if (anyDep('jest', '@jest/globals') || allContent.includes('jest')) techStack.testing.push('Jest');
  if (anyDep('mocha') || allContent.includes('mocha')) techStack.testing.push('Mocha');
  if (anyDep('vitest') || allContent.includes('vitest')) techStack.testing.push('Vitest');
  if (allContent.includes('pytest')) techStack.testing.push('Pytest');
  if (anyDep('cypress') || allContent.includes('cypress')) techStack.testing.push('Cypress');
  if (anyDep('@playwright/test') || allContent.includes('playwright')) techStack.testing.push('Playwright');

  // DevOps detection
  if (fileTreeStr.includes('dockerfile')) techStack.devops.push('Docker');
  if (fileTreeStr.includes('.github/workflows')) techStack.devops.push('GitHub Actions');
  if (fileTreeStr.includes('vercel.json')) techStack.devops.push('Vercel');
  if (allContent.includes('kubernetes')) techStack.devops.push('Kubernetes');

  // Cache detection
  if (anyDep('redis', 'ioredis') || allContent.includes('redis')) techStack.cache.push('Redis');
  if (anyDep('memcached') || allContent.includes('memcached')) techStack.cache.push('Memcached');

  // Message queues
  if (anyDep('amqplib') || allContent.includes('rabbitmq')) techStack.messageQueue.push('RabbitMQ');
  if (anyDep('kafkajs') || allContent.includes('kafka')) techStack.messageQueue.push('Kafka');
  if (anyDep('bull', 'bullmq') || allContent.includes('bullmq')) techStack.messageQueue.push('BullMQ');

  // Authentication detection
  if (anyDep('passport') || allContent.includes('passport')) techStack.authentication.push('Passport.js');
  if (anyDep('jsonwebtoken') || allContent.includes('jwt') || allContent.includes('jsonwebtoken')) techStack.authentication.push('JWT');
  if (allContent.includes('oauth')) techStack.authentication.push('OAuth');
  if (anyDep('auth0') || allContent.includes('auth0')) techStack.authentication.push('Auth0');

  return techStack;
}

function extractPackageJson(fileContents) {
  const candidates = Object.entries(fileContents || {})
    .filter(([path, content]) => /(^|\/)package\.json$/i.test(path) && typeof content === 'string')
    .sort((a, b) => a[0].length - b[0].length);

  for (const [path, content] of candidates) {
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') return { path, packageJson: parsed };
    } catch (e) {
      // ignore invalid JSON
    }
  }

  return { path: null, packageJson: null };
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { repoUrl } = req.body;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    if (!GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN not configured');
      return res.status(500).json({ 
        error: 'GitHub token not configured on server. Please add GITHUB_TOKEN to environment variables.' 
      });
    }

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid GitHub URL format' });
    }

    const { owner, repo } = parsed;
    const headers = getHeaders(GITHUB_TOKEN);

    console.log(`Analyzing repository: ${owner}/${repo}`);

    // Fetch repository info
    const repoResponse = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}`,
      { headers }
    );

    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        return res.status(404).json({ 
          error: 'Repository not found or is private' 
        });
      }
      if (repoResponse.status === 403) {
        const rateLimitResponse = await fetch(
          `${GITHUB_API_BASE}/rate_limit`,
          { headers }
        );
        const rateLimit = await rateLimitResponse.json();
        return res.status(403).json({ 
          error: 'GitHub API rate limit exceeded',
          rateLimit: rateLimit.rate
        });
      }
      throw new Error(`GitHub API error: ${repoResponse.status}`);
    }

    const repoData = await repoResponse.json();

    // Fetch README
    let readme = 'No README found';
    try {
      const readmeResponse = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`,
        { headers }
      );
      if (readmeResponse.ok) {
        const readmeData = await readmeResponse.json();
        readme = Buffer.from(readmeData.content, 'base64').toString('utf-8');
      }
    } catch (e) {
      console.log('README not found');
    }

    // Fetch file tree
    const branch = repoData.default_branch || 'main';
    const treeResponse = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers }
    );

    let fileTree = [];
    let importantFiles = [];
    
    if (treeResponse.ok) {
      const treeData = await treeResponse.json();
      fileTree = treeData.tree
        .filter(item => item.type === 'blob')
        .map(item => item.path);
      
      importantFiles = identifyImportantFiles(fileTree, 50); // Top 50 most important files
      console.log(`✓ Identified ${importantFiles.length} important files for analysis`);
    }

    // Fetch contents of important files IN PARALLEL (massive speed improvement)
    // Batch into chunks of 10 to avoid overwhelming GitHub API
    const CONCURRENCY = 10;
    const fileContents = {};
    const importantFilesWithContent = [];

    const fetchFile = async (filePath) => {
      try {
        const fileResponse = await fetch(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${filePath}`,
          { headers }
        );
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          if (fileData.content) {
            const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
            return { path: filePath, content, size: fileData.size, sha: fileData.sha };
          }
        }
        return { path: filePath, error: 'File not found or empty' };
      } catch (e) {
        console.log(`Could not fetch ${filePath}`);
        return { path: filePath, error: 'Could not fetch file content' };
      }
    };

    // Run in parallel batches
    for (let i = 0; i < importantFiles.length; i += CONCURRENCY) {
      const batch = importantFiles.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(fetchFile));
      for (const result of results) {
        importantFilesWithContent.push(result);
        if (result.content) {
          fileContents[result.path] = result.content;
        }
      }
    }

    console.log(`✓ Successfully analyzed ${owner}/${repo}`);

    // Parse package.json (if present in fetched important files)
    const { path: packageJsonPath, packageJson } = extractPackageJson(fileContents);

    // Detect tech stack (prefer package.json deps, fallback to content scanning)
    const techStack = detectTechStack(fileTree, fileContents, packageJson);
    console.log('✓ Tech stack detected:', Object.entries(techStack).filter(([k, v]) => v.length > 0).map(([k, v]) => `${k}: ${v.length}`).join(', '));

    // Return comprehensive analysis
    return res.status(200).json({
      success: true,
      repoInfo: {
        name: repoData.full_name,
        description: repoData.description || 'No description available',
        stars: repoData.stargazers_count,
        language: repoData.language || 'Not specified',
        defaultBranch: repoData.default_branch,
        url: repoData.html_url,
        createdAt: repoData.created_at,
        updatedAt: repoData.updated_at,
        topics: repoData.topics || [],
        license: repoData.license?.name || 'No license',
        size: repoData.size,
        forks: repoData.forks_count,
        openIssues: repoData.open_issues_count,
      },
      readme,
      fileTree,
      fileCount: fileTree.length,
      importantFiles: importantFilesWithContent, // Now includes content
      fileContents, // Keep for backward compatibility
      techStack, // Add tech stack detection
      packageJson,
      packageJsonPath,
    });

  } catch (error) {
    console.error('GitHub analysis error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

// Made with Bob
