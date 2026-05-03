// GitHub API Service - Production Ready
// All API calls now go through backend to keep tokens secure
// NO direct GitHub API calls, NO exposed tokens

/**
 * Get API base URL (works in both dev and production)
 */
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // In browser - use relative path for Vercel
    return window.location.origin;
  }
  return '';
};

const API_BASE = getApiBaseUrl();

/**
 * Parse GitHub URL to extract owner and repository name
 * Supports formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - github.com/owner/repo
 * - owner/repo
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
 * Analyze repository via backend API
 * This calls our secure backend which handles GitHub authentication
 * @param {string} repoUrl - GitHub repository URL
 * @returns {Promise<Object>} - Repository analysis data including:
 *   - repoInfo: Repository metadata
 *   - readme: README content
 *   - fileTree: Array of file paths
 *   - importantFiles: Key files identified
 *   - fileContents: Contents of important files
 */
export async function analyzeRepository(repoUrl) {
  try {
    console.log('Analyzing repository via backend API...');
    
    const response = await fetch(`${API_BASE}/api/github/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repoUrl }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      if (response.status === 404) {
        throw new Error('Repository not found or is private. Please check the URL and ensure the repository is public.');
      } else if (response.status === 403) {
        throw new Error(errorData.error || 'GitHub API rate limit exceeded. Please try again later.');
      } else if (response.status === 500) {
        throw new Error(errorData.error || 'Server configuration error. Please contact support.');
      }
      
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Analysis failed');
    }

    console.log('✓ Repository analyzed successfully');
    return data;

  } catch (error) {
    console.error('Repository analysis error:', error);
    
    // Provide user-friendly error messages
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please check your internet connection.');
    }
    
    throw error;
  }
}

/**
 * Fetch repository information from backend API
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} - Repository metadata
 */
export async function fetchRepositoryInfo(owner, repo) {
  const repoUrl = `https://github.com/${owner}/${repo}`;
  const data = await analyzeRepository(repoUrl);
  return data.repoInfo;
}

/**
 * Analyze architecture using repository data
 * This is a helper function that prepares data for AI analysis
 * @param {Object} repoData - Repository data from analyzeRepository
 * @returns {Object} - Structured architecture data
 */
export async function analyzeArchitecture(repoData) {
  if (!repoData || !repoData.repoInfo) {
    throw new Error('Invalid repository data');
  }

  const { repoInfo, fileTree = [], importantFiles = [], fileContents = {} } = repoData;

  // Detect frameworks and technologies from file tree
  const frameworks = detectFrameworks(fileTree);
  const architecture = detectArchitecture(fileTree, fileContents);

  return {
    frameworks,
    architecture,
    fileStructure: {
      totalFiles: fileTree.length,
      importantFiles,
      directories: extractDirectories(fileTree),
    },
    technologies: {
      primaryLanguage: repoInfo.language,
      detectedTechnologies: frameworks,
    }
  };
}

/**
 * Detect frameworks from file tree
 */
function detectFrameworks(fileTree) {
  const frameworks = [];
  
  const patterns = {
    'React': [/package\.json/, /react/i],
    'Vue': [/package\.json/, /vue/i],
    'Angular': [/angular\.json/, /package\.json/],
    'Next.js': [/next\.config\.(js|ts)/, /pages\//],
    'Express': [/package\.json/, /express/i],
    'Django': [/manage\.py/, /settings\.py/],
    'Flask': [/app\.py/, /flask/i],
    'Spring Boot': [/pom\.xml/, /application\.(properties|yml)/],
    'FastAPI': [/main\.py/, /fastapi/i],
  };

  for (const [framework, patterns] of Object.entries(patterns)) {
    const hasIndicators = patterns.some(pattern => 
      fileTree.some(file => pattern.test(file))
    );
    if (hasIndicators) {
      frameworks.push(framework);
    }
  }

  return frameworks;
}

/**
 * Detect architecture patterns
 */
function detectArchitecture(fileTree, fileContents) {
  const patterns = {
    hasFrontend: fileTree.some(f => /^(src|public|components|pages)\//i.test(f)),
    hasBackend: fileTree.some(f => /^(server|api|backend|routes|controllers)\//i.test(f)),
    hasDatabase: fileTree.some(f => /^(models|schemas|migrations|database)\//i.test(f)),
    hasTests: fileTree.some(f => /^(tests?|__tests__|spec)\//i.test(f)),
    hasDocker: fileTree.some(f => /^(Dockerfile|docker-compose\.yml)$/i.test(f)),
    hasCI: fileTree.some(f => /^\.github\/workflows\//i.test(f)),
  };

  let architectureType = 'Unknown';
  
  if (patterns.hasFrontend && patterns.hasBackend) {
    architectureType = 'Full-stack Application';
  } else if (patterns.hasFrontend) {
    architectureType = 'Frontend Application';
  } else if (patterns.hasBackend) {
    architectureType = 'Backend API';
  }

  return {
    type: architectureType,
    patterns,
  };
}

/**
 * Extract unique directories from file tree
 */
function extractDirectories(fileTree) {
  const dirs = new Set();
  
  fileTree.forEach(file => {
    const parts = file.split('/');
    if (parts.length > 1) {
      dirs.add(parts[0]);
    }
  });

  return Array.from(dirs).sort();
}

// Export for compatibility
export default analyzeRepository;

// Made with Bob
