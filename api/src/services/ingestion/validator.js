const { z } = require('zod');

/**
 * GitHub URL validation schema
 */
const githubUrlSchema = z.string().url().refine(
  (url) => {
    const githubPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
    return githubPattern.test(url);
  },
  {
    message: 'Must be a valid GitHub repository URL (e.g., https://github.com/user/repo)'
  }
);

/**
 * Validate GitHub repository URL
 * @param {string} url - Repository URL to validate
 * @returns {Object} Validation result with parsed data
 */
function validateGitHubUrl(url) {
  try {
    // Validate URL format
    githubUrlSchema.parse(url);

    // Extract owner and repo name
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts.length < 2) {
      return {
        valid: false,
        error: 'Invalid GitHub URL format'
      };
    }

    const [owner, repo] = pathParts;

    return {
      valid: true,
      owner,
      repo: repo.replace('.git', ''),
      fullName: `${owner}/${repo.replace('.git', '')}`,
      cloneUrl: `https://github.com/${owner}/${repo.replace('.git', '')}.git`
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message || 'Invalid GitHub URL'
    };
  }
}

/**
 * Validate repository name
 * @param {string} name - Repository name
 * @returns {boolean} Is valid
 */
function validateRepoName(name) {
  const repoNamePattern = /^[\w.-]+$/;
  return repoNamePattern.test(name) && name.length > 0 && name.length <= 100;
}

/**
 * Validate owner name
 * @param {string} owner - Owner/organization name
 * @returns {boolean} Is valid
 */
function validateOwnerName(owner) {
  const ownerPattern = /^[\w-]+$/;
  return ownerPattern.test(owner) && owner.length > 0 && owner.length <= 39;
}

/**
 * Check if URL is a GitHub URL
 * @param {string} url - URL to check
 * @returns {boolean} Is GitHub URL
 */
function isGitHubUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'github.com' || urlObj.hostname === 'www.github.com';
  } catch {
    return false;
  }
}

module.exports = {
  validateGitHubUrl,
  validateRepoName,
  validateOwnerName,
  isGitHubUrl,
  githubUrlSchema
};

// Made with Bob
