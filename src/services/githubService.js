// GitHub API Service for fetching repository data
// No authentication required for public repositories (60 requests/hour limit)

const GITHUB_API_BASE = 'https://api.github.com';

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
    headers: {
      'Accept': 'application/vnd.github.v3+json'
    }
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
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
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
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
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
    { pattern: /^webpack\.config\.js$/i, priority: 4 }
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
  
  // Sort by priority and limit to 5 files
  matches.sort((a, b) => a.priority - b.priority);
  return matches.slice(0, 5).map(m => m.path);
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
    testing: []
  };

  // Check package.json for dependencies
  const packageJson = importantFiles.find(f => f.path === 'package.json');
  if (packageJson && !packageJson.error) {
    try {
      const pkg = JSON.parse(packageJson.content);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      // Frontend frameworks
      if (allDeps.react) techStack.frontend.push('React');
      if (allDeps.vue) techStack.frontend.push('Vue.js');
      if (allDeps.angular || allDeps['@angular/core']) techStack.frontend.push('Angular');
      if (allDeps.svelte) techStack.frontend.push('Svelte');
      if (allDeps.next) techStack.frontend.push('Next.js');
      
      // Backend frameworks
      if (allDeps.express) techStack.backend.push('Express.js');
      if (allDeps.fastify) techStack.backend.push('Fastify');
      if (allDeps.koa) techStack.backend.push('Koa');
      if (allDeps.nestjs || allDeps['@nestjs/core']) techStack.backend.push('NestJS');
      
      // Databases
      if (allDeps.mongoose) techStack.database.push('MongoDB');
      if (allDeps.pg || allDeps.postgres) techStack.database.push('PostgreSQL');
      if (allDeps.mysql || allDeps.mysql2) techStack.database.push('MySQL');
      if (allDeps.redis) techStack.database.push('Redis');
      if (allDeps.sqlite3) techStack.database.push('SQLite');
      
      // Testing
      if (allDeps.jest) techStack.testing.push('Jest');
      if (allDeps.mocha) techStack.testing.push('Mocha');
      if (allDeps.cypress) techStack.testing.push('Cypress');
      if (allDeps.playwright) techStack.testing.push('Playwright');
      
      // DevOps
      if (allDeps.docker || fileTree.includes('Dockerfile')) techStack.devops.push('Docker');
      if (fileTree.includes('.github/workflows')) techStack.devops.push('GitHub Actions');
    } catch (e) {
      // Invalid JSON, skip
    }
  }
  
  // Check for Python requirements
  if (fileTree.includes('requirements.txt')) {
    techStack.backend.push('Python');
  }
  
  // Check for other languages
  if (fileTree.some(f => f.endsWith('.go'))) techStack.backend.push('Go');
  if (fileTree.some(f => f.endsWith('.rs'))) techStack.backend.push('Rust');
  if (fileTree.some(f => f.endsWith('.java'))) techStack.backend.push('Java');
  if (fileTree.some(f => f.endsWith('.php'))) techStack.backend.push('PHP');
  
  return techStack;
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
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
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
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
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
