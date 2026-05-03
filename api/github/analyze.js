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
    headers['Authorization'] = `Bearer ${token}`;
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

// Identify important files from file tree
function identifyImportantFiles(fileTree) {
  const importantPatterns = [
    { pattern: /^README\.md$/i, priority: 1 },
    { pattern: /^package\.json$/i, priority: 2 },
    { pattern: /^requirements\.txt$/i, priority: 2 },
    { pattern: /^Cargo\.toml$/i, priority: 2 },
    { pattern: /^go\.mod$/i, priority: 2 },
    { pattern: /^(src\/)?index\.(js|ts|jsx|tsx)$/i, priority: 3 },
    { pattern: /^(src\/)?main\.(js|ts|py|rs|go)$/i, priority: 3 },
    { pattern: /^(src\/)?App\.(jsx|tsx|js|ts)$/i, priority: 3 },
    { pattern: /^\.env\.example$/i, priority: 4 },
    { pattern: /^config\.(js|json|yaml|yml)$/i, priority: 4 },
  ];

  const scored = fileTree.map(path => {
    for (const { pattern, priority } of importantPatterns) {
      if (pattern.test(path)) {
        return { path, priority };
      }
    }
    return { path, priority: 999 };
  });

  return scored
    .filter(item => item.priority < 999)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5)
    .map(item => item.path);
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
      
      importantFiles = identifyImportantFiles(fileTree);
    }

    // Fetch contents of important files
    const fileContents = {};
    for (const filePath of importantFiles) {
      try {
        const fileResponse = await fetch(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${filePath}`,
          { headers }
        );
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          if (fileData.content) {
            fileContents[filePath] = Buffer.from(fileData.content, 'base64').toString('utf-8');
          }
        }
      } catch (e) {
        console.log(`Could not fetch ${filePath}`);
      }
    }

    console.log(`✓ Successfully analyzed ${owner}/${repo}`);

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
      importantFiles,
      fileContents,
    });

  } catch (error) {
    console.error('GitHub analysis error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

// Made with Bob
