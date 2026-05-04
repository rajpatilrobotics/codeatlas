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
function detectTechStack(fileTree, fileContents) {
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

  const allContent = Object.values(fileContents).join('\n').toLowerCase();
  const fileTreeStr = fileTree.join('\n').toLowerCase();

  // Frontend detection
  if (fileTreeStr.includes('package.json') && allContent.includes('react')) techStack.frontend.push('React');
  if (allContent.includes('vue')) techStack.frontend.push('Vue.js');
  if (allContent.includes('angular')) techStack.frontend.push('Angular');
  if (allContent.includes('svelte')) techStack.frontend.push('Svelte');
  if (allContent.includes('next')) techStack.frontend.push('Next.js');

  // Backend detection
  if (allContent.includes('express')) techStack.backend.push('Express.js');
  if (allContent.includes('fastify')) techStack.backend.push('Fastify');
  if (allContent.includes('django')) techStack.backend.push('Django');
  if (allContent.includes('flask')) techStack.backend.push('Flask');
  if (allContent.includes('spring')) techStack.backend.push('Spring Boot');
  if (fileTreeStr.includes('go.mod')) techStack.backend.push('Go');

  // Database detection
  if (allContent.includes('mongodb') || allContent.includes('mongoose')) techStack.database.push('MongoDB');
  if (allContent.includes('postgresql') || allContent.includes('pg')) techStack.database.push('PostgreSQL');
  if (allContent.includes('mysql')) techStack.database.push('MySQL');
  if (allContent.includes('redis')) techStack.database.push('Redis');
  if (allContent.includes('sqlite')) techStack.database.push('SQLite');

  // ORM detection
  if (allContent.includes('prisma')) techStack.orm.push('Prisma');
  if (allContent.includes('sequelize')) techStack.orm.push('Sequelize');
  if (allContent.includes('typeorm')) techStack.orm.push('TypeORM');
  if (allContent.includes('mongoose')) techStack.orm.push('Mongoose');

  // Testing detection
  if (allContent.includes('jest')) techStack.testing.push('Jest');
  if (allContent.includes('mocha')) techStack.testing.push('Mocha');
  if (allContent.includes('pytest')) techStack.testing.push('Pytest');
  if (allContent.includes('cypress')) techStack.testing.push('Cypress');

  // DevOps detection
  if (fileTreeStr.includes('dockerfile')) techStack.devops.push('Docker');
  if (fileTreeStr.includes('.github/workflows')) techStack.devops.push('GitHub Actions');
  if (fileTreeStr.includes('vercel.json')) techStack.devops.push('Vercel');
  if (allContent.includes('kubernetes')) techStack.devops.push('Kubernetes');

  // Cache detection
  if (allContent.includes('redis')) techStack.cache.push('Redis');
  if (allContent.includes('memcached')) techStack.cache.push('Memcached');

  // Authentication detection
  if (allContent.includes('passport')) techStack.authentication.push('Passport.js');
  if (allContent.includes('jwt') || allContent.includes('jsonwebtoken')) techStack.authentication.push('JWT');
  if (allContent.includes('oauth')) techStack.authentication.push('OAuth');
  if (allContent.includes('auth0')) techStack.authentication.push('Auth0');

  return techStack;
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
      
      importantFiles = identifyImportantFiles(fileTree, 50); // Analyze up to 50 important files
      console.log(`✓ Identified ${importantFiles.length} important files for analysis`);
    }

    // Fetch contents of important files with structured format
    const fileContents = {};
    const importantFilesWithContent = [];
    
    for (const filePath of importantFiles) {
      try {
        const fileResponse = await fetch(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${filePath}`,
          { headers }
        );
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          if (fileData.content) {
            const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
            fileContents[filePath] = content;
            
            // Add structured file data for analysis
            importantFilesWithContent.push({
              path: filePath,
              content: content,
              size: fileData.size,
              sha: fileData.sha
            });
          }
        }
      } catch (e) {
        console.log(`Could not fetch ${filePath}`);
        importantFilesWithContent.push({
          path: filePath,
          error: 'Could not fetch file content'
        });
      }
    }

    console.log(`✓ Successfully analyzed ${owner}/${repo}`);

    // Detect tech stack
    const techStack = detectTechStack(fileTree, fileContents);
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
    });

  } catch (error) {
    console.error('GitHub analysis error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

// Made with Bob
