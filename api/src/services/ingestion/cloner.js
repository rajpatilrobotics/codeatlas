const simpleGit = require('simple-git');
const fs = require('fs').promises;
const path = require('path');
const { validateGitHubUrl } = require('./validator');

/**
 * Base directory for cloned repositories
 */
const CLONE_BASE_DIR = path.join(process.cwd(), 'repos');

/**
 * Ensure clone directory exists
 */
async function ensureCloneDirectory() {
  try {
    await fs.mkdir(CLONE_BASE_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating clone directory:', error);
    throw new Error('Failed to create clone directory');
  }
}

/**
 * Generate unique directory name for repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {string} Directory path
 */
function getRepoDirectory(owner, repo) {
  const timestamp = Date.now();
  const dirName = `${owner}_${repo}_${timestamp}`;
  return path.join(CLONE_BASE_DIR, dirName);
}

/**
 * Clone GitHub repository
 * @param {string} repoUrl - GitHub repository URL
 * @param {Object} options - Clone options
 * @returns {Promise<Object>} Clone result
 */
async function cloneRepository(repoUrl, options = {}) {
  const {
    token = process.env.GITHUB_TOKEN,
    depth = 1, // Shallow clone by default
    onProgress = null
  } = options;

  // Validate URL
  const validation = validateGitHubUrl(repoUrl);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { owner, repo, cloneUrl } = validation;

  // Ensure clone directory exists
  await ensureCloneDirectory();

  // Generate unique directory for this clone
  const repoDir = getRepoDirectory(owner, repo);

  try {
    // Prepare clone URL with token if provided
    let authCloneUrl = cloneUrl;
    if (token) {
      authCloneUrl = cloneUrl.replace('https://', `https://${token}@`);
    }

    // Initialize git
    const git = simpleGit();

    // Clone options
    const cloneOptions = ['--depth', depth.toString()];

    // Report progress
    if (onProgress) {
      onProgress({ stage: 'cloning', progress: 0, message: 'Starting clone...' });
    }

    // Clone repository
    await git.clone(authCloneUrl, repoDir, cloneOptions);

    if (onProgress) {
      onProgress({ stage: 'cloning', progress: 100, message: 'Clone complete' });
    }

    // Get repository info
    const repoGit = simpleGit(repoDir);
    const log = await repoGit.log({ maxCount: 1 });
    const latestCommit = log.latest;

    // Get branch info
    const branches = await repoGit.branch();
    const currentBranch = branches.current;

    return {
      success: true,
      owner,
      repo,
      path: repoDir,
      branch: currentBranch,
      latestCommit: {
        hash: latestCommit?.hash,
        message: latestCommit?.message,
        author: latestCommit?.author_name,
        date: latestCommit?.date
      }
    };
  } catch (error) {
    // Clean up on error
    try {
      await fs.rm(repoDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Error cleaning up failed clone:', cleanupError);
    }

    throw new Error(`Failed to clone repository: ${error.message}`);
  }
}

/**
 * Delete cloned repository
 * @param {string} repoPath - Path to repository
 * @returns {Promise<boolean>} Success status
 */
async function deleteRepository(repoPath) {
  try {
    await fs.rm(repoPath, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error(`Error deleting repository at ${repoPath}:`, error);
    return false;
  }
}

/**
 * Check if repository exists
 * @param {string} repoPath - Path to repository
 * @returns {Promise<boolean>} Exists status
 */
async function repositoryExists(repoPath) {
  try {
    await fs.access(repoPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get repository size
 * @param {string} repoPath - Path to repository
 * @returns {Promise<number>} Size in bytes
 */
async function getRepositorySize(repoPath) {
  try {
    let totalSize = 0;

    async function calculateSize(dirPath) {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await calculateSize(fullPath);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    }

    await calculateSize(repoPath);
    return totalSize;
  } catch (error) {
    console.error(`Error calculating repository size for ${repoPath}:`, error);
    return 0;
  }
}

/**
 * Clean up old repositories
 * @param {number} maxAgeHours - Maximum age in hours
 * @returns {Promise<number>} Number of repositories cleaned
 */
async function cleanupOldRepositories(maxAgeHours = 24) {
  try {
    await ensureCloneDirectory();
    
    const entries = await fs.readdir(CLONE_BASE_DIR, { withFileTypes: true });
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    let cleanedCount = 0;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const dirPath = path.join(CLONE_BASE_DIR, entry.name);
      const stats = await fs.stat(dirPath);
      const age = now - stats.mtimeMs;

      if (age > maxAgeMs) {
        await deleteRepository(dirPath);
        cleanedCount++;
        console.log(`Cleaned up old repository: ${entry.name}`);
      }
    }

    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up old repositories:', error);
    return 0;
  }
}

/**
 * Get all cloned repositories
 * @returns {Promise<Array>} List of repositories
 */
async function listClonedRepositories() {
  try {
    await ensureCloneDirectory();
    
    const entries = await fs.readdir(CLONE_BASE_DIR, { withFileTypes: true });
    const repos = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const dirPath = path.join(CLONE_BASE_DIR, entry.name);
      const stats = await fs.stat(dirPath);
      const size = await getRepositorySize(dirPath);

      repos.push({
        name: entry.name,
        path: dirPath,
        created: stats.birthtime,
        modified: stats.mtime,
        size: size
      });
    }

    return repos;
  } catch (error) {
    console.error('Error listing cloned repositories:', error);
    return [];
  }
}

module.exports = {
  cloneRepository,
  deleteRepository,
  repositoryExists,
  getRepositorySize,
  cleanupOldRepositories,
  listClonedRepositories,
  CLONE_BASE_DIR
};

// Made with Bob
