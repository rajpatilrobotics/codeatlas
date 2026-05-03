// GitHub API Service for fetching repository data
// Uses GitHub token for authentication (5000 requests/hour with token)

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_TOKEN = process.env.REACT_APP_GITHUB_TOKEN;

// Helper function to get headers with authentication
const getHeaders = () => {
  const headers = {
    'Accept': 'application/vnd.github.v3+json'
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }
  
  return headers;
};

/**
 * Parse GitHub URL to extract owner and repository name
 * Supports formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - github.com/owner/repo
 * @param {string} url - GitHub repository URL
 * @returns {Object|null} - { owner, repo } or null if invalid
 */
export function parseGitHubUrl(url) {
  if (!url || typeof url !== 'string') return null;
  
  // Remove trailing slashes and .git extension
  url = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
  
  // Match GitHub URL patterns
  const patterns = [
    /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)/,
    /^github\.com\/([^\/]+)\/([^\/]+)/,
    /^([^\/]+)\/([^\/]+)$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2]
      };
    }
  }
  
  return null;
}

/**
 * Fetch repository information from GitHub API
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} - Repository metadata
 */
export async function fetchRepositoryInfo(owner, repo) {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
    headers: getHeaders()
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Repository not found or is private');
    } else if (response.status === 403) {
      throw new Error('GitHub API rate limit reached. Please try again later.');
    } else {
      throw new Error(`Failed to fetch repository: ${response.statusText}`);
    }
  }
  
  const data = await response.json();
  
  return {
    name: data.full_name,
    description: data.description || 'No description available',
    stars: data.stargazers_count,
    language: data.language || 'Not specified',
    defaultBranch: data.default_branch,
    url: data.html_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    topics: data.topics || [],
    license: data.license?.name || 'No license'
  };
}

/**
 * Fetch repository file tree
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Branch name (default: main/master)
 * @returns {Promise<Array>} - Array of file paths
 */
export async function fetchFileTree(owner, repo, branch = 'main') {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    {
      headers: getHeaders()
    }
  );
  
  if (!response.ok) {
    // Try 'master' branch if 'main' fails
    if (branch === 'main') {
      return fetchFileTree(owner, repo, 'master');
    }
    throw new Error('Failed to fetch file tree');
  }
  
  const data = await response.json();
  
  // Filter out directories, only return files
  const files = data.tree
    .filter(item => item.type === 'blob')
    .map(item => item.path);
  
  return files;
}

/**
 * Fetch content of a specific file
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path
 * @returns {Promise<string>} - File content
 */
export async function fetchFileContent(owner, repo, path) {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: getHeaders()
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${path}`);
  }
  
  const data = await response.json();
  
  // GitHub returns content as base64 encoded
  if (data.content) {
    try {
      return atob(data.content.replace(/\n/g, ''));
    } catch (e) {
      return 'Unable to decode file content';
    }
  }
  
  return 'No content available';
}

/**
 * Identify important files in the repository
 * @param {Array} fileTree - Array of file paths
 * @returns {Array} - Array of important file paths (3-5 files)
 */
export function identifyImportantFiles(fileTree) {
  const importantPatterns = [
    // Documentation (highest priority)
    { pattern: /^README\.md$/i, priority: 1 },
    { pattern: /^README\.txt$/i, priority: 1 },
    
    // Package/dependency files
    { pattern: /^package\.json$/i, priority: 2 },
    { pattern: /^requirements\.txt$/i, priority: 2 },
    { pattern: /^Cargo\.toml$/i, priority: 2 },
    { pattern: /^go\.mod$/i, priority: 2 },
    { pattern: /^Gemfile$/i, priority: 2 },
    { pattern: /^composer\.json$/i, priority: 2 },
    
    // Entry points
    { pattern: /^(src\/)?index\.(js|ts|jsx|tsx)$/i, priority: 3 },
    { pattern: /^(src\/)?main\.(js|ts|py|rs|go)$/i, priority: 3 },
    { pattern: /^(src\/)?App\.(jsx|tsx|js|ts)$/i, priority: 3 },
    { pattern: /^(src\/)?app\.py$/i, priority: 3 },
    
    // Configuration files
    { pattern: /^\.env\.example$/i, priority: 4 },
    { pattern: /^config\.(js|json|yaml|yml)$/i, priority: 4 },
    { pattern: /^tsconfig\.json$/i, priority: 4 },
    { pattern: /^webpack\.config\.js$/i, priority: 4 },
    
    // Route/Controller files (priority 5)
    { pattern: /routes?\.(js|ts|py)$/i, priority: 5 },
    { pattern: /controller\.(js|ts|py)$/i, priority: 5 },
    { pattern: /views\.py$/i, priority: 5 },
    { pattern: /urls\.py$/i, priority: 5 },
    
    // Model/Schema files (priority 6)
    { pattern: /models?\.(js|ts|py)$/i, priority: 6 },
    { pattern: /schema\.(js|ts|graphql)$/i, priority: 6 },
    { pattern: /entity\.(js|ts)$/i, priority: 6 },
    
    // Service files (priority 7)
    { pattern: /service\.(js|ts|py)$/i, priority: 7 },
    { pattern: /api\.(js|ts|py)$/i, priority: 7 },
    
    // Component files (priority 8)
    { pattern: /\.(jsx|tsx|vue)$/i, priority: 8 },
    { pattern: /component\.(js|ts)$/i, priority: 8 },
    
    // Middleware files (priority 9)
    { pattern: /middleware\.(js|ts|py)$/i, priority: 9 },
    { pattern: /auth\.(js|ts|py)$/i, priority: 9 },
    
    // Utility files (priority 10)
    { pattern: /utils?\.(js|ts|py)$/i, priority: 10 },
    { pattern: /helpers?\.(js|ts|py)$/i, priority: 10 }
  ];
  
  const matches = [];
  
  for (const file of fileTree) {
    for (const { pattern, priority } of importantPatterns) {
      if (pattern.test(file)) {
        matches.push({ path: file, priority });
        break;
      }
    }
  }
  
  // Sort by priority and limit to 100 files for comprehensive analysis
  matches.sort((a, b) => a.priority - b.priority);
  return matches.slice(0, 100).map(m => m.path);
}

/**
 * Detect technology stack from file tree and package files
 * @param {Array} fileTree - Array of file paths
 * @param {Array} importantFiles - Array of important file objects with content
 * @returns {Object} - Detected technologies with categories
 */
export function detectTechStack(fileTree, importantFiles) {
  const techStack = {
    frontend: [],
    backend: [],
    database: [],
    devops: [],
    testing: [],
    cache: [],
    messageQueue: [],
    authentication: [],
    orm: []
  };

  // Use Set to avoid duplicates
  const detected = {
    frontend: new Set(),
    backend: new Set(),
    database: new Set(),
    devops: new Set(),
    testing: new Set(),
    cache: new Set(),
    messageQueue: new Set(),
    authentication: new Set(),
    orm: new Set()
  };

  // Check package.json for dependencies
  const packageJson = importantFiles.find(f => f.path === 'package.json');
  if (packageJson && !packageJson.error) {
    try {
      const pkg = JSON.parse(packageJson.content);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      // Frontend frameworks & libraries
      if (allDeps.react) detected.frontend.add('React');
      if (allDeps['react-dom']) detected.frontend.add('React DOM');
      if (allDeps['react-router'] || allDeps['react-router-dom']) detected.frontend.add('React Router');
      if (allDeps.redux || allDeps['@reduxjs/toolkit']) detected.frontend.add('Redux');
      if (allDeps['react-query'] || allDeps['@tanstack/react-query']) detected.frontend.add('React Query');
      if (allDeps.vue) detected.frontend.add('Vue.js');
      if (allDeps['vue-router']) detected.frontend.add('Vue Router');
      if (allDeps.vuex || allDeps.pinia) detected.frontend.add('Vuex/Pinia');
      if (allDeps.angular || allDeps['@angular/core']) detected.frontend.add('Angular');
      if (allDeps.svelte) detected.frontend.add('Svelte');
      if (allDeps.next) detected.frontend.add('Next.js');
      if (allDeps.nuxt) detected.frontend.add('Nuxt.js');
      if (allDeps.gatsby) detected.frontend.add('Gatsby');
      if (allDeps.remix) detected.frontend.add('Remix');
      
      // UI Libraries
      if (allDeps['@mui/material'] || allDeps['@material-ui/core']) detected.frontend.add('Material-UI');
      if (allDeps['antd']) detected.frontend.add('Ant Design');
      if (allDeps['bootstrap'] || allDeps['react-bootstrap']) detected.frontend.add('Bootstrap');
      if (allDeps['tailwindcss']) detected.frontend.add('Tailwind CSS');
      if (allDeps['styled-components']) detected.frontend.add('Styled Components');
      if (allDeps['@emotion/react']) detected.frontend.add('Emotion');
      if (allDeps['chakra-ui'] || allDeps['@chakra-ui/react']) detected.frontend.add('Chakra UI');
      
      // Build tools
      if (allDeps.webpack || pkg.devDependencies?.webpack) detected.devops.add('Webpack');
      if (allDeps.vite) detected.devops.add('Vite');
      if (allDeps.parcel) detected.devops.add('Parcel');
      if (allDeps.rollup) detected.devops.add('Rollup');
      if (allDeps.esbuild) detected.devops.add('esbuild');
      
      // TypeScript
      if (allDeps.typescript || fileTree.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))) {
        detected.frontend.add('TypeScript');
      }
      
      // Backend frameworks (Node.js)
      if (allDeps.express) detected.backend.add('Express.js');
      if (allDeps.fastify) detected.backend.add('Fastify');
      if (allDeps.koa) detected.backend.add('Koa');
      if (allDeps.hapi || allDeps['@hapi/hapi']) detected.backend.add('Hapi');
      if (allDeps.nestjs || allDeps['@nestjs/core']) detected.backend.add('NestJS');
      if (allDeps.socket || allDeps['socket.io']) detected.backend.add('Socket.IO');
      if (allDeps.graphql || allDeps['apollo-server']) detected.backend.add('GraphQL');
      if (allDeps['@apollo/server']) detected.backend.add('Apollo Server');
      if (allDeps.trpc || allDeps['@trpc/server']) detected.backend.add('tRPC');
      
      // API & Data fetching
      if (allDeps.axios) detected.backend.add('Axios');
      if (allDeps.fetch || allDeps['node-fetch']) detected.backend.add('Fetch API');
      if (allDeps.prisma || allDeps['@prisma/client']) detected.backend.add('Prisma');
      if (allDeps.typeorm) detected.backend.add('TypeORM');
      if (allDeps.sequelize) detected.backend.add('Sequelize');
      
      // Databases & ORMs
      if (allDeps.mongoose) detected.database.add('MongoDB');
      if (allDeps.mongodb) detected.database.add('MongoDB Driver');
      if (allDeps.pg || allDeps.postgres) detected.database.add('PostgreSQL');
      if (allDeps.mysql || allDeps.mysql2) detected.database.add('MySQL');
      if (allDeps.redis || allDeps['ioredis']) {
        detected.database.add('Redis');
        detected.cache.add('Redis');
      }
      if (allDeps.sqlite3 || allDeps['better-sqlite3']) detected.database.add('SQLite');
      if (allDeps.firebase || allDeps['firebase-admin']) detected.database.add('Firebase');
      if (allDeps.supabase || allDeps['@supabase/supabase-js']) detected.database.add('Supabase');
      if (allDeps.dynamodb || allDeps['aws-sdk']) detected.database.add('DynamoDB');
      
      // Cache detection
      if (allDeps.memcached) detected.cache.add('Memcached');
      if (allDeps['node-cache']) detected.cache.add('Node-Cache');
      
      // Message Queue detection
      if (allDeps.amqplib || allDeps.rabbitmq) detected.messageQueue.add('RabbitMQ');
      if (allDeps.kafkajs || allDeps.kafka) detected.messageQueue.add('Kafka');
      if (allDeps.bull || allDeps.bullmq) detected.messageQueue.add('Bull/BullMQ');
      if (allDeps.bee || allDeps['bee-queue']) detected.messageQueue.add('Bee Queue');
      if (allDeps.celery) detected.messageQueue.add('Celery');
      
      // Authentication detection
      if (allDeps.passport || allDeps['passport-local']) detected.authentication.add('Passport.js');
      if (allDeps.jsonwebtoken || allDeps.jwt) detected.authentication.add('JWT');
      if (allDeps['express-session']) detected.authentication.add('Express Session');
      if (allDeps.bcrypt || allDeps.bcryptjs) detected.authentication.add('Bcrypt');
      if (allDeps.auth0 || allDeps['@auth0/auth0-react']) detected.authentication.add('Auth0');
      if (allDeps['next-auth']) detected.authentication.add('NextAuth.js');
      if (allDeps.clerk || allDeps['@clerk/nextjs']) detected.authentication.add('Clerk');
      
      // ORM/ODM detection
      if (allDeps.prisma || allDeps['@prisma/client']) detected.orm.add('Prisma');
      if (allDeps.typeorm) detected.orm.add('TypeORM');
      if (allDeps.sequelize) detected.orm.add('Sequelize');
      if (allDeps.mongoose) detected.orm.add('Mongoose');
      if (allDeps.typegoose || allDeps['@typegoose/typegoose']) detected.orm.add('Typegoose');
      if (allDeps.drizzle || allDeps['drizzle-orm']) detected.orm.add('Drizzle ORM');
      
      // Testing frameworks
      if (allDeps.jest) detected.testing.add('Jest');
      if (allDeps.mocha) detected.testing.add('Mocha');
      if (allDeps.chai) detected.testing.add('Chai');
      if (allDeps.jasmine) detected.testing.add('Jasmine');
      if (allDeps.vitest) detected.testing.add('Vitest');
      if (allDeps.cypress) detected.testing.add('Cypress');
      if (allDeps.playwright) detected.testing.add('Playwright');
      if (allDeps.puppeteer) detected.testing.add('Puppeteer');
      if (allDeps['@testing-library/react']) detected.testing.add('React Testing Library');
      if (allDeps.enzyme) detected.testing.add('Enzyme');
      
      // DevOps & CI/CD
      if (allDeps.docker || fileTree.some(f => f.includes('Dockerfile'))) detected.devops.add('Docker');
      if (fileTree.some(f => f.includes('docker-compose'))) detected.devops.add('Docker Compose');
      if (fileTree.some(f => f.includes('.github/workflows'))) detected.devops.add('GitHub Actions');
      if (fileTree.some(f => f.includes('.gitlab-ci'))) detected.devops.add('GitLab CI');
      if (fileTree.some(f => f.includes('Jenkinsfile'))) detected.devops.add('Jenkins');
      if (fileTree.some(f => f.includes('.circleci'))) detected.devops.add('CircleCI');
      if (allDeps.pm2) detected.devops.add('PM2');
      if (allDeps.nodemon) detected.devops.add('Nodemon');
      
      // Linting & Formatting
      if (allDeps.eslint) detected.devops.add('ESLint');
      if (allDeps.prettier) detected.devops.add('Prettier');
      if (allDeps.husky) detected.devops.add('Husky');
      if (allDeps['lint-staged']) detected.devops.add('lint-staged');
      
    } catch (e) {
      // Invalid JSON, skip
    }
  }
  
  // Check for Python
  if (fileTree.some(f => f.includes('requirements.txt'))) {
    detected.backend.add('Python');
    // Check for Python frameworks
    const reqFile = importantFiles.find(f => f.path.includes('requirements.txt'));
    if (reqFile && !reqFile.error) {
      const content = reqFile.content.toLowerCase();
      if (content.includes('django')) detected.backend.add('Django');
      if (content.includes('flask')) detected.backend.add('Flask');
      if (content.includes('fastapi')) detected.backend.add('FastAPI');
      if (content.includes('tornado')) detected.backend.add('Tornado');
      if (content.includes('pyramid')) detected.backend.add('Pyramid');
    }
  }
  
  // Check for other languages by file extensions
  if (fileTree.some(f => f.endsWith('.go'))) detected.backend.add('Go');
  if (fileTree.some(f => f.endsWith('.rs'))) detected.backend.add('Rust');
  if (fileTree.some(f => f.endsWith('.java'))) detected.backend.add('Java');
  if (fileTree.some(f => f.endsWith('.kt'))) detected.backend.add('Kotlin');
  if (fileTree.some(f => f.endsWith('.php'))) detected.backend.add('PHP');
  if (fileTree.some(f => f.endsWith('.rb'))) detected.backend.add('Ruby');
  if (fileTree.some(f => f.endsWith('.cs'))) detected.backend.add('C#');
  if (fileTree.some(f => f.endsWith('.swift'))) detected.backend.add('Swift');
  
  // Check for specific config files
  if (fileTree.some(f => f.includes('next.config'))) detected.frontend.add('Next.js');
  if (fileTree.some(f => f.includes('nuxt.config'))) detected.frontend.add('Nuxt.js');
  if (fileTree.some(f => f.includes('vite.config'))) detected.devops.add('Vite');
  if (fileTree.some(f => f.includes('webpack.config'))) detected.devops.add('Webpack');
  if (fileTree.some(f => f.includes('tailwind.config'))) detected.frontend.add('Tailwind CSS');
  if (fileTree.some(f => f.includes('tsconfig.json'))) detected.frontend.add('TypeScript');
  
  // Check for Python frameworks in requirements.txt for authentication/ORM
  const reqFile = importantFiles.find(f => f.path.includes('requirements.txt'));
  if (reqFile && !reqFile.error) {
    const content = reqFile.content.toLowerCase();
    if (content.includes('sqlalchemy')) detected.orm.add('SQLAlchemy');
    if (content.includes('django')) detected.orm.add('Django ORM');
    if (content.includes('flask-login')) detected.authentication.add('Flask-Login');
    if (content.includes('django-allauth')) detected.authentication.add('Django Allauth');
  }
  
  // Convert Sets back to arrays
  techStack.frontend = Array.from(detected.frontend);
  techStack.backend = Array.from(detected.backend);
  techStack.database = Array.from(detected.database);
  techStack.devops = Array.from(detected.devops);
  techStack.testing = Array.from(detected.testing);
  techStack.cache = Array.from(detected.cache);
  techStack.messageQueue = Array.from(detected.messageQueue);
  techStack.authentication = Array.from(detected.authentication);
  techStack.orm = Array.from(detected.orm);
  
  return techStack;
}
/**
 * Extract functions from JavaScript/TypeScript code
 */
function extractFunctions(content, filePath) {
  const functions = [];
  
  // Function declarations: function name() {}
  const funcDeclRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
  let match;
  while ((match = funcDeclRegex.exec(content)) !== null) {
    functions.push({
      name: match[1],
      params: match[2].trim(),
      type: 'function',
      file: filePath
    });
  }
  
  // Arrow functions: const name = () => {}
  const arrowFuncRegex = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g;
  while ((match = arrowFuncRegex.exec(content)) !== null) {
    functions.push({
      name: match[1],
      params: match[2].trim(),
      type: 'arrow',
      file: filePath
    });
  }
  
  // Class methods: methodName() {}
  const methodRegex = /(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{/g;
  while ((match = methodRegex.exec(content)) !== null) {
    if (!['if', 'for', 'while', 'switch', 'catch'].includes(match[1])) {
      functions.push({
        name: match[1],
        params: match[2].trim(),
        type: 'method',
        file: filePath
      });
    }
  }
  
  return functions;
}

/**
 * Extract classes from code
 */
function extractClasses(content, filePath) {
  const classes = [];
  
  // Class declarations
  const classRegex = /(?:export\s+)?(?:default\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/g;
  let match;
  while ((match = classRegex.exec(content)) !== null) {
    classes.push({
      name: match[1],
      extends: match[2] || null,
      file: filePath
    });
  }
  
  return classes;
}

/**
 * Extract imports/dependencies from code
 */
function extractImports(content, filePath) {
  const imports = [];
  
  // ES6 imports: import X from 'package'
  const es6ImportRegex = /import\s+(?:{[^}]+}|\w+|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = es6ImportRegex.exec(content)) !== null) {
    imports.push({
      module: match[1],
      type: 'es6',
      file: filePath
    });
  }
  
  // CommonJS require: require('package')
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push({
      module: match[1],
      type: 'commonjs',
      file: filePath
    });
  }
  
  // Python imports
  const pythonImportRegex = /(?:from\s+(\S+)\s+)?import\s+([^\n]+)/g;
  while ((match = pythonImportRegex.exec(content)) !== null) {
    imports.push({
      module: match[1] || match[2].split(',')[0].trim(),
      type: 'python',
      file: filePath
    });
  }
  
  return imports;
}

/**
 * Calculate Lines of Code (LOC) for a file
 */
function calculateLOC(content) {
  if (!content) return 0;
  
  const lines = content.split('\n');
  let loc = 0;
  let inBlockComment = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (trimmed.length === 0) continue;
    
    // Handle block comments
    if (trimmed.startsWith('/*')) inBlockComment = true;
    if (inBlockComment) {
      if (trimmed.endsWith('*/')) inBlockComment = false;
      continue;
    }
    
    // Skip single-line comments
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
    
    loc++;
  }
  
  return loc;
}

/**
 * Parse package.json for detailed information
 */
function parsePackageJson(content) {
  try {
    const pkg = JSON.parse(content);
    return {
      name: pkg.name || 'Unknown',
      version: pkg.version || '0.0.0',
      description: pkg.description || '',
      scripts: Object.keys(pkg.scripts || {}),
      dependencies: Object.keys(pkg.dependencies || {}),
      devDependencies: Object.keys(pkg.devDependencies || {}),
      engines: pkg.engines || {},
      main: pkg.main || 'index.js',
      author: pkg.author || 'Unknown'
    };
  } catch (e) {
    return null;
  }
}

/**
 * Extract configuration details from various config files
 */
function extractConfigDetails(importantFiles) {
  const config = {
    ports: [],
    databases: [],
    envVars: [],
    apiKeys: []
  };
  
  importantFiles.forEach(file => {
    if (!file.content || file.error) return;
    
    // Extract port numbers
    const portRegex = /(?:PORT|port)\s*[=:]\s*(?:process\.env\.\w+\s*\|\|\s*)?(\d+)/g;
    let match;
    while ((match = portRegex.exec(file.content)) !== null) {
      config.ports.push({ port: match[1], file: file.path });
    }
    
    // Extract database URLs
    const dbRegex = /(?:mongodb|postgresql|mysql|redis):\/\/[^\s'"]+/g;
    while ((match = dbRegex.exec(file.content)) !== null) {
      config.databases.push({ url: match[0], file: file.path });
    }
    
    // Extract environment variables from .env.example
    if (file.path.includes('.env')) {
      const envLines = file.content.split('\n');
      envLines.forEach(line => {
        const envMatch = line.match(/^([A-Z_]+)=/);
        if (envMatch) {
          config.envVars.push(envMatch[1]);
        }
      });
    }
  });
  
  return config;
}


/**
 * Analyze repository architecture in detail
 * Detects API endpoints, database models, components, patterns, and metrics
 * @param {Array} fileTree - Array of file paths
 * @param {Array} importantFiles - Array of important file objects with content
 * @returns {Object} - Detailed architecture analysis
 */
export function analyzeArchitecture(fileTree, importantFiles) {
  const analysis = {
    apiEndpoints: [],
    databaseModels: [],
    components: [],
    middleware: [],
    patterns: {
      architecture: 'Unknown',
      features: []
    },
    metrics: {
      totalFiles: fileTree.length,
      componentCount: 0,
      apiEndpointCount: 0,
      modelCount: 0,
      middlewareCount: 0,
      totalLOC: 0,
      avgLOCPerFile: 0,
      functionCount: 0,
      classCount: 0
    },
    folderStructure: {},
    // NEW: Comprehensive data for detailed visualization
    detailedFiles: [],
    allFunctions: [],
    allClasses: [],
    allImports: [],
    configuration: {},
    packageInfo: null
  };

  // Detect API Endpoints
  analysis.apiEndpoints = detectAPIEndpoints(importantFiles, fileTree);
  analysis.metrics.apiEndpointCount = analysis.apiEndpoints.length;

  // Detect Database Models
  analysis.databaseModels = detectDatabaseModels(importantFiles, fileTree);
  analysis.metrics.modelCount = analysis.databaseModels.length;

  // Detect Components
  analysis.components = detectComponents(fileTree);
  analysis.metrics.componentCount = analysis.components.length;

  // Detect Middleware
  analysis.middleware = detectMiddleware(importantFiles, fileTree);
  analysis.metrics.middlewareCount = analysis.middleware.length;

  // Detect Architectural Pattern
  analysis.patterns = detectArchitecturalPattern(fileTree);

  // Analyze Folder Structure
  analysis.folderStructure = analyzeFolderStructure(fileTree);

  // NEW: Extract comprehensive details from all important files
  let totalLOC = 0;
  importantFiles.forEach(file => {
    if (file.content && !file.error) {
      const loc = calculateLOC(file.content);
      totalLOC += loc;

      // Extract functions
      const functions = extractFunctions(file.content, file.path);
      analysis.allFunctions.push(...functions);

      // Extract classes
      const classes = extractClasses(file.content, file.path);
      analysis.allClasses.push(...classes);

      // Extract imports
      const imports = extractImports(file.content, file.path);
      analysis.allImports.push(...imports);

      // Store detailed file info
      analysis.detailedFiles.push({
        path: file.path,
        loc,
        functions: functions.length,
        classes: classes.length,
        imports: imports.length
      });
    }
  });

  // Calculate metrics
  analysis.metrics.totalLOC = totalLOC;
  analysis.metrics.avgLOCPerFile = importantFiles.length > 0
    ? Math.round(totalLOC / importantFiles.length)
    : 0;
  analysis.metrics.functionCount = analysis.allFunctions.length;
  analysis.metrics.classCount = analysis.allClasses.length;

  // Extract configuration details
  analysis.configuration = extractConfigDetails(importantFiles);

  // Parse package.json if available
  const packageFile = importantFiles.find(f => f.path === 'package.json');
  if (packageFile && !packageFile.error) {
    analysis.packageInfo = parsePackageJson(packageFile.content);
  }

  return analysis;
}

/**
 * Detect API endpoints from route files
 */
function detectAPIEndpoints(importantFiles, fileTree) {
  const endpoints = [];
  const routePatterns = [
    // Express.js patterns with handler
    {
      regex: /(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/g,
      framework: 'Express'
    },
    // NestJS patterns
    {
      regex: /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"`]([^'"`]*)['"`]\s*\)/g,
      framework: 'NestJS'
    },
    // Django patterns
    {
      regex: /path\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/g,
      framework: 'Django'
    },
    // FastAPI patterns
    {
      regex: /@app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*(?:async\s+)?def\s+(\w+)/g,
      framework: 'FastAPI'
    },
    // Flask patterns
    {
      regex: /@app\.route\s*\(\s*['"`]([^'"`]+)['"`].*methods\s*=\s*\[['"`]([^'"`]+)['"`]\]/g,
      framework: 'Flask'
    }
  ];

  // Check route files - increased limit to 50
  const routeFiles = fileTree.filter(f =>
    f.includes('route') || f.includes('controller') || f.includes('api') ||
    f.includes('views.py') || f.includes('urls.py') || f.includes('main.py') ||
    f.includes('endpoint') || f.includes('handler')
  ).slice(0, 50);

  routeFiles.forEach(filePath => {
    const file = importantFiles.find(f => f.path === filePath);
    if (file && !file.error && file.content) {
      routePatterns.forEach(pattern => {
        let match;
        const regex = new RegExp(pattern.regex);
        while ((match = regex.exec(file.content)) !== null) {
          const method = match[1] ? match[1].toUpperCase() : 'GET';
          const path = match[2] || match[1];
          const handler = match[3] || 'handler';
          
          if (path && path.length > 0 && path.length < 100) {
            endpoints.push({
              method,
              path: path.startsWith('/') ? path : `/${path}`,
              file: filePath.split('/').pop(),
              fullPath: filePath,
              handler,
              framework: pattern.framework
            });
          }
        }
      });
    }
  });

  // Remove duplicates and increase limit to 50
  const uniqueEndpoints = Array.from(new Set(endpoints.map(e => `${e.method} ${e.path}`)))
    .map(key => endpoints.find(e => `${e.method} ${e.path}` === key))
    .slice(0, 50);

  return uniqueEndpoints;
}

/**
 * Detect database models and schemas
 */
function detectDatabaseModels(importantFiles, fileTree) {
  const models = [];
  
  // Find model files - increased limit to 30
  const modelFiles = fileTree.filter(f =>
    f.includes('model') || f.includes('schema') || f.includes('entity') ||
    f.includes('table') || f.includes('database')
  ).slice(0, 30);

  const modelPatterns = [
    // Mongoose
    { regex: /const\s+(\w+)Schema\s*=\s*new\s+Schema\s*\(\s*\{([^}]+)\}/g, type: 'Mongoose' },
    // Prisma
    { regex: /model\s+(\w+)\s*\{([^}]+)\}/g, type: 'Prisma' },
    // TypeORM
    { regex: /@Entity\s*\(\s*[^)]*\)\s*(?:export\s+)?class\s+(\w+)/g, type: 'TypeORM' },
    // Django
    { regex: /class\s+(\w+)\s*\(\s*models\.Model\s*\)/g, type: 'Django' },
    // SQLAlchemy
    { regex: /class\s+(\w+)\s*\(\s*Base\s*\)/g, type: 'SQLAlchemy' },
    // Sequelize
    { regex: /(\w+)\s*=\s*sequelize\.define\s*\(\s*['"`](\w+)['"`]/g, type: 'Sequelize' }
  ];

  modelFiles.forEach(filePath => {
    const file = importantFiles.find(f => f.path === filePath);
    if (file && !file.error && file.content) {
      modelPatterns.forEach(pattern => {
        let match;
        const regex = new RegExp(pattern.regex);
        while ((match = regex.exec(file.content)) !== null) {
          const modelName = match[1];
          const fields = match[2] ? extractFields(match[2]) : [];
          if (modelName && modelName.length < 50) {
            models.push({
              name: modelName,
              fields: fields.slice(0, 10), // Increased field limit
              file: filePath.split('/').pop(),
              fullPath: filePath,
              type: pattern.type,
              fieldCount: fields.length
            });
          }
        }
      });
    }
  });

  return models.slice(0, 30); // Increased limit to 30 models
}

/**
 * Extract fields from model definition
 */
function extractFields(fieldString) {
  const fields = [];
  const fieldPatterns = [
    /(\w+)\s*:\s*(\w+)/g, // TypeScript/Prisma style
    /['"`](\w+)['"`]\s*:\s*\{?\s*type\s*:\s*(\w+)/g, // Mongoose style
    /(\w+)\s*=\s*models\.(\w+Field)/g // Django style
  ];

  fieldPatterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern);
    while ((match = regex.exec(fieldString)) !== null) {
      if (match[1] && match[1].length < 30) {
        fields.push({
          name: match[1],
          type: match[2] || 'Unknown'
        });
      }
    }
  });

  return fields;
}

/**
 * Detect React/Vue/Angular components
 */
function detectComponents(fileTree) {
  const components = [];
  
  // React components - increased limit to 50
  const reactComponents = fileTree.filter(f =>
    ((f.endsWith('.jsx') || f.endsWith('.tsx')) &&
    (f.includes('component') || f.includes('src/'))) ||
    (f.includes('components/') && (f.endsWith('.jsx') || f.endsWith('.tsx')))
  ).slice(0, 50);

  reactComponents.forEach(path => {
    const name = path.split('/').pop().replace(/\.(jsx|tsx)$/, '');
    const folder = path.split('/').slice(-2, -1)[0] || 'root';
    if (name && name.length < 50) {
      components.push({
        name,
        type: 'React',
        path: path.replace(/^.*\/src\//, 'src/'),
        fullPath: path,
        folder,
        extension: path.endsWith('.tsx') ? 'tsx' : 'jsx'
      });
    }
  });

  // Vue components - increased limit to 50
  const vueComponents = fileTree.filter(f => f.endsWith('.vue')).slice(0, 50);
  vueComponents.forEach(path => {
    const name = path.split('/').pop().replace('.vue', '');
    const folder = path.split('/').slice(-2, -1)[0] || 'root';
    if (name && name.length < 50) {
      components.push({
        name,
        type: 'Vue',
        path: path.replace(/^.*\/src\//, 'src/'),
        fullPath: path,
        folder,
        extension: 'vue'
      });
    }
  });

  // Angular components - increased limit to 50
  const angularComponents = fileTree.filter(f =>
    f.endsWith('.component.ts')
  ).slice(0, 50);
  angularComponents.forEach(path => {
    const name = path.split('/').pop().replace('.component.ts', '');
    const folder = path.split('/').slice(-2, -1)[0] || 'root';
    if (name && name.length < 50) {
      components.push({
        name,
        type: 'Angular',
        path: path.replace(/^.*\/src\//, 'src/'),
        fullPath: path,
        folder,
        extension: 'ts'
      });
    }
  });

  return components.slice(0, 50); // Increased limit to 50 components
}

/**
 * Detect middleware from package.json and files
 */
function detectMiddleware(importantFiles, fileTree) {
  const middleware = [];
  
  const packageJson = importantFiles.find(f => f.path === 'package.json');
  if (packageJson && !packageJson.error) {
    try {
      const pkg = JSON.parse(packageJson.content);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      const middlewareMap = {
        'cors': 'CORS',
        'helmet': 'Security Headers',
        'morgan': 'HTTP Logging',
        'compression': 'Response Compression',
        'express-rate-limit': 'Rate Limiting',
        'body-parser': 'Body Parsing',
        'cookie-parser': 'Cookie Parsing',
        'express-session': 'Session Management',
        'passport': 'Authentication',
        'multer': 'File Upload',
        'express-validator': 'Input Validation',
        'winston': 'Application Logging',
        'pino': 'Fast Logging'
      };

      Object.keys(middlewareMap).forEach(dep => {
        if (allDeps[dep]) {
          middleware.push({
            name: middlewareMap[dep],
            package: dep
          });
        }
      });
    } catch (e) {
      // Invalid JSON
    }
  }

  return middleware;
}

/**
 * Detect architectural pattern from folder structure
 */
function detectArchitecturalPattern(fileTree) {
  const patterns = {
    architecture: 'Unknown',
    features: []
  };

  const folders = fileTree.map(f => f.split('/')[0]).filter(Boolean);
  const uniqueFolders = [...new Set(folders)];

  // MVC Pattern
  if (uniqueFolders.includes('models') && uniqueFolders.includes('views') && uniqueFolders.includes('controllers')) {
    patterns.architecture = 'MVC (Model-View-Controller)';
    patterns.features.push('Separation of Concerns', 'Traditional Web Architecture');
  }
  // Clean Architecture
  else if (uniqueFolders.includes('domain') || uniqueFolders.includes('application') || uniqueFolders.includes('infrastructure')) {
    patterns.architecture = 'Clean Architecture';
    patterns.features.push('Domain-Driven Design', 'Dependency Inversion');
  }
  // Microservices
  else if (uniqueFolders.includes('services') && fileTree.some(f => f.includes('docker-compose'))) {
    patterns.architecture = 'Microservices';
    patterns.features.push('Service-Oriented', 'Containerized');
  }
  // Monorepo
  else if (uniqueFolders.includes('packages') || uniqueFolders.includes('apps')) {
    patterns.architecture = 'Monorepo';
    patterns.features.push('Multi-Package', 'Shared Dependencies');
  }
  // Layered Architecture
  else if (uniqueFolders.includes('api') && uniqueFolders.includes('business') && uniqueFolders.includes('data')) {
    patterns.architecture = 'Layered Architecture';
    patterns.features.push('Horizontal Layers', 'Clear Boundaries');
  }
  // Component-Based (React/Vue)
  else if (uniqueFolders.includes('components') || uniqueFolders.includes('src')) {
    patterns.architecture = 'Component-Based';
    patterns.features.push('Reusable Components', 'Modern Frontend');
  }
  // Default
  else {
    patterns.architecture = 'Standard Structure';
    patterns.features.push('Conventional Layout');
  }

  return patterns;
}

/**
 * Analyze folder structure
 */
function analyzeFolderStructure(fileTree) {
  const structure = {};
  
  fileTree.forEach(path => {
    const parts = path.split('/');
    if (parts.length > 0) {
      const topLevel = parts[0];
      if (!structure[topLevel]) {
        structure[topLevel] = 0;
      }
      structure[topLevel]++;
    }
  });

  // Get top 10 folders by file count
  const sortedFolders = Object.entries(structure)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});

  return sortedFolders;
}

/**
 * Fetch repository contributors
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} - Array of top contributors
 */
export async function fetchContributors(owner, repo) {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contributors?per_page=5`,
      {
        headers: getHeaders()
      }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.map(contributor => ({
      login: contributor.login,
      avatar: contributor.avatar_url,
      contributions: contributor.contributions,
      url: contributor.html_url
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Fetch repository commit activity
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} - Commit activity stats
 */
export async function fetchCommitActivity(owner, repo) {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/stats/participation`,
      {
        headers: getHeaders()
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const recentWeeks = data.all.slice(-12); // Last 12 weeks
    const totalCommits = recentWeeks.reduce((sum, count) => sum + count, 0);
    const avgPerWeek = Math.round(totalCommits / 12);
    
    return {
      totalCommits,
      avgPerWeek,
      recentWeeks
    };
  } catch (error) {
    return null;
  }
}

/**
 * Extract key commands from package.json
 * @param {Array} importantFiles - Array of important file objects
 * @returns {Object} - Key commands organized by category
 */
export function extractKeyCommands(importantFiles) {
  const packageJson = importantFiles.find(f => f.path === 'package.json');
  if (!packageJson || packageJson.error) {
    return null;
  }
  
  try {
    const pkg = JSON.parse(packageJson.content);
    const scripts = pkg.scripts || {};
    
    const commands = {
      development: [],
      build: [],
      test: [],
      deployment: []
    };
    
    // Categorize scripts
    Object.entries(scripts).forEach(([name, command]) => {
      const lowerName = name.toLowerCase();
      
      if (lowerName.includes('dev') || lowerName.includes('start')) {
        commands.development.push({ name, command });
      } else if (lowerName.includes('build') || lowerName.includes('compile')) {
        commands.build.push({ name, command });
      } else if (lowerName.includes('test') || lowerName.includes('spec')) {
        commands.test.push({ name, command });
      } else if (lowerName.includes('deploy') || lowerName.includes('publish')) {
        commands.deployment.push({ name, command });
      }
    });
    
    return commands;
  } catch (e) {
    return null;
  }
}

/**
 * Calculate project complexity score
 * @param {Array} fileTree - Array of file paths
 * @param {Array} importantFiles - Array of important file objects
 * @returns {Object} - Complexity analysis
 */
export function calculateComplexity(fileTree, importantFiles) {
  let score = 0;
  let factors = [];
  
  // Factor 1: File count (0-30 points)
  const fileCount = fileTree.length;
  if (fileCount < 50) {
    score += 5;
    factors.push('Small codebase');
  } else if (fileCount < 200) {
    score += 15;
    factors.push('Medium codebase');
  } else if (fileCount < 1000) {
    score += 25;
    factors.push('Large codebase');
  } else {
    score += 30;
    factors.push('Very large codebase');
  }
  
  // Factor 2: Dependencies (0-25 points)
  const packageJson = importantFiles.find(f => f.path === 'package.json');
  if (packageJson && !packageJson.error) {
    try {
      const pkg = JSON.parse(packageJson.content);
      const depCount = Object.keys(pkg.dependencies || {}).length +
                       Object.keys(pkg.devDependencies || {}).length;
      
      if (depCount < 10) {
        score += 5;
        factors.push('Few dependencies');
      } else if (depCount < 30) {
        score += 12;
        factors.push('Moderate dependencies');
      } else if (depCount < 100) {
        score += 20;
        factors.push('Many dependencies');
      } else {
        score += 25;
        factors.push('Very many dependencies');
      }
    } catch (e) {
      // Invalid JSON
    }
  }
  
  // Factor 3: Directory depth (0-20 points)
  const maxDepth = Math.max(...fileTree.map(f => f.split('/').length));
  if (maxDepth <= 3) {
    score += 5;
    factors.push('Flat structure');
  } else if (maxDepth <= 5) {
    score += 10;
    factors.push('Moderate nesting');
  } else if (maxDepth <= 8) {
    score += 15;
    factors.push('Deep nesting');
  } else {
    score += 20;
    factors.push('Very deep nesting');
  }
  
  // Factor 4: Configuration files (0-15 points)
  const configFiles = fileTree.filter(f =>
    f.includes('config') ||
    f.includes('.env') ||
    f.includes('webpack') ||
    f.includes('babel') ||
    f.includes('tsconfig')
  ).length;
  
  if (configFiles < 3) {
    score += 3;
  } else if (configFiles < 6) {
    score += 8;
  } else {
    score += 15;
    factors.push('Complex configuration');
  }
  
  // Factor 5: Multiple languages (0-10 points)
  const hasJS = fileTree.some(f => f.endsWith('.js') || f.endsWith('.jsx'));
  const hasTS = fileTree.some(f => f.endsWith('.ts') || f.endsWith('.tsx'));
  const hasPython = fileTree.some(f => f.endsWith('.py'));
  const hasGo = fileTree.some(f => f.endsWith('.go'));
  const hasRust = fileTree.some(f => f.endsWith('.rs'));
  
  const languageCount = [hasJS, hasTS, hasPython, hasGo, hasRust].filter(Boolean).length;
  if (languageCount > 1) {
    score += languageCount * 3;
    factors.push('Multiple languages');
  }
  
  // Determine complexity level and time savings
  let level, color, traditionalTime, devDockTime;
  if (score < 30) {
    level = 'Simple';
    color = '#43e97b';
    traditionalTime = '1-2 hours';
    devDockTime = '5-10 min';
  } else if (score < 60) {
    level = 'Moderate';
    color = '#f5af19';
    traditionalTime = '3-5 hours';
    devDockTime = '10-15 min';
  } else {
    level = 'Complex';
    color = '#f85149';
    traditionalTime = '1-2 days';
    devDockTime = '15-20 min';
  }
  
  return {
    score: Math.min(score, 100),
    level,
    color,
    traditionalTime,
    devDockTime,
    factors
  };
}

/**
 * Extract environment variables from .env.example
 * @param {Array} importantFiles - Array of important file objects
 * @returns {Array} - List of environment variables with descriptions
 */
export function extractEnvVariables(importantFiles) {
  const envFile = importantFiles.find(f => f.path === '.env.example' || f.path === '.env.sample');
  if (!envFile || envFile.error) {
    return [];
  }
  
  const lines = envFile.content.split('\n');
  const variables = [];
  
  lines.forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      variables.push({
        key: key.trim(),
        example: value || '(required)',
        description: '' // Could be enhanced with comments
      });
    }
  });
  
  return variables;
}

/**
 * Main function to analyze a GitHub repository
 * @param {string} url - GitHub repository URL
 * @returns {Promise<Object>} - Complete repository analysis
 */
export async function analyzeRepository(url) {
  try {
    // Step 1: Parse URL
    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      return {
        error: 'Invalid GitHub URL format. Please use: https://github.com/owner/repo'
      };
    }
    
    const { owner, repo } = parsed;
    
    // Step 2: Fetch repository info
    const repoInfo = await fetchRepositoryInfo(owner, repo);
    
    // Step 3: Fetch file tree
    const fileTree = await fetchFileTree(owner, repo, repoInfo.defaultBranch);
    
    // Step 4: Identify important files
    const importantFilePaths = identifyImportantFiles(fileTree);
    
    // Step 5: Fetch content of important files (in parallel)
    const fileContentPromises = importantFilePaths.map(async (path) => {
      try {
        const content = await fetchFileContent(owner, repo, path);
        return { path, content };
      } catch (error) {
        return { path, content: 'Failed to fetch content', error: true };
      }
    });
    
    const importantFiles = await Promise.all(fileContentPromises);
    
    // Step 6: Fetch README content separately
    let readme = 'No README found';
    const readmeFile = importantFiles.find(f => /^README\.md$/i.test(f.path));
    if (readmeFile && !readmeFile.error) {
      readme = readmeFile.content;
    }
    
    // Step 7: Detect tech stack
    const techStack = detectTechStack(fileTree, importantFiles);
    
    // Step 8: Fetch contributors and commit activity (in parallel)
    const [contributors, commitActivity] = await Promise.all([
      fetchContributors(owner, repo),
      fetchCommitActivity(owner, repo)
    ]);
    
    // Step 9: Extract key commands
    const keyCommands = extractKeyCommands(importantFiles);
    
    // Step 10: Calculate complexity
    const complexity = calculateComplexity(fileTree, importantFiles);
    
    // Step 11: Extract environment variables
    const envVariables = extractEnvVariables(importantFiles);
    
    return {
      repoInfo,
      fileTree,
      importantFiles,
      readme,
      techStack,
      contributors,
      commitActivity,
      keyCommands,
      complexity,
      envVariables,
      error: null
    };
    
  } catch (error) {
    return {
      error: error.message || 'An unexpected error occurred while analyzing the repository'
    };
  }
}

// Made with Bob
