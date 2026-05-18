import { cloneRepository, deleteRepository } from './cloner.js';
import { filterFiles, getFileStatistics } from './fileFilter.js';
import { validateGitHubUrl } from './validator.js';
import fs from 'fs';
const fsPromises = fs.promises;

/**
 * Main repository ingestion service
 * Orchestrates the entire ingestion pipeline
 */
class IngestionService {
  /**
   * Ingest a GitHub repository
   * @param {string} repoUrl - GitHub repository URL
   * @param {Object} options - Ingestion options
   * @returns {Promise<Object>} Ingestion result
   */
  async ingestRepository(repoUrl, options = {}) {
    const {
      token = process.env.GITHUB_TOKEN,
      onProgress = null,
      cleanup = true
    } = options;

    let cloneResult = null;

    try {
      // Step 1: Validate URL
      if (onProgress) {
        onProgress({ stage: 'validation', progress: 0, message: 'Validating repository URL...' });
      }

      const validation = validateGitHubUrl(repoUrl);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      if (onProgress) {
        onProgress({ stage: 'validation', progress: 100, message: 'URL validated' });
      }

      // Step 2: Clone repository
      if (onProgress) {
        onProgress({ stage: 'cloning', progress: 0, message: 'Cloning repository...' });
      }

      cloneResult = await cloneRepository(repoUrl, {
        token,
        onProgress: (cloneProgress) => {
          if (onProgress) {
            onProgress({
              stage: 'cloning',
              progress: cloneProgress.progress,
              message: cloneProgress.message
            });
          }
        }
      });

      if (onProgress) {
        onProgress({ stage: 'cloning', progress: 100, message: 'Repository cloned' });
      }

      // Step 3: Filter files
      if (onProgress) {
        onProgress({ stage: 'filtering', progress: 0, message: 'Filtering files...' });
      }

      console.log('🔍 DEBUG: About to filter files from path:', cloneResult.path);
      const files = await filterFiles(cloneResult.path);
      console.log('🔍 DEBUG: filterFiles returned:', files.length, 'files');
      console.log('🔍 DEBUG: Sample files:', files.slice(0, 3).map(f => ({ path: f.path, language: f.language })));
      
      const fileStats = getFileStatistics(files);
      console.log('🔍 DEBUG: File statistics:', fileStats);

      if (onProgress) {
        onProgress({
          stage: 'filtering',
          progress: 100,
          message: `Found ${files.length} files to analyze`
        });
      }

      // Step 4: Read file contents
      if (onProgress) {
        onProgress({ stage: 'reading', progress: 0, message: 'Reading file contents...' });
      }

      const filesWithContent = await this.readFileContents(files, onProgress);

      if (onProgress) {
        onProgress({
          stage: 'reading',
          progress: 100,
          message: 'File contents loaded'
        });
      }

      // Prepare result
      const result = {
        success: true,
        repository: {
          owner: cloneResult.owner,
          repo: cloneResult.repo,
          url: repoUrl,
          branch: cloneResult.branch,
          latestCommit: cloneResult.latestCommit
        },
        files: filesWithContent,
        statistics: {
          ...fileStats,
          totalSize: filesWithContent.reduce((sum, f) => sum + (f.size || 0), 0)
        },
        clonePath: cloneResult.path
      };

      // Step 5: Cleanup (optional)
      if (cleanup) {
        if (onProgress) {
          onProgress({ stage: 'cleanup', progress: 0, message: 'Cleaning up...' });
        }

        await deleteRepository(cloneResult.path);

        if (onProgress) {
          onProgress({ stage: 'cleanup', progress: 100, message: 'Cleanup complete' });
        }

        delete result.clonePath;
      }

      return result;
    } catch (error) {
      // Cleanup on error
      if (cloneResult && cloneResult.path) {
        try {
          await deleteRepository(cloneResult.path);
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError);
        }
      }

      throw new Error(`Repository ingestion failed: ${error.message}`);
    }
  }

  /**
   * Read contents of filtered files
   * @param {Array} files - Filtered file list
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Array>} Files with content
   */
  async readFileContents(files, onProgress = null) {
    const filesWithContent = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const content = await fsPromises.readFile(file.fullPath, 'utf-8');
        const stats = await fsPromises.stat(file.fullPath);

        filesWithContent.push({
          path: file.path,
          name: file.name,
          extension: file.extension,
          language: file.language,
          content: content,
          size: stats.size,
          lines: content.split('\n').length
        });

        // Report progress
        if (onProgress && (i % 10 === 0 || i === total - 1)) {
          const progress = Math.round(((i + 1) / total) * 100);
          onProgress({
            stage: 'reading',
            progress,
            message: `Reading files: ${i + 1}/${total}`
          });
        }
      } catch (error) {
        console.error(`Error reading file ${file.path}:`, error);
        // Skip files that can't be read
        continue;
      }
    }

    return filesWithContent;
  }

  /**
   * Validate repository URL
   * @param {string} repoUrl - Repository URL
   * @returns {Object} Validation result
   */
  validateUrl(repoUrl) {
    return validateGitHubUrl(repoUrl);
  }

  /**
   * Get repository metadata without full ingestion
   * @param {string} repoUrl - Repository URL
   * @param {Object} options - Options
   * @returns {Promise<Object>} Repository metadata
   */
  async getRepositoryMetadata(repoUrl, options = {}) {
    const { token = process.env.GITHUB_TOKEN } = options;

    // Validate URL
    const validation = validateGitHubUrl(repoUrl);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Clone repository
    const cloneResult = await cloneRepository(repoUrl, { token, depth: 1 });

    try {
      // Get basic file count
      const files = await filterFiles(cloneResult.path);
      const fileStats = getFileStatistics(files);

      const metadata = {
        owner: cloneResult.owner,
        repo: cloneResult.repo,
        url: repoUrl,
        branch: cloneResult.branch,
        latestCommit: cloneResult.latestCommit,
        statistics: fileStats
      };

      return metadata;
    } finally {
      // Always cleanup
      await deleteRepository(cloneResult.path);
    }
  }
}

// Export singleton instance
const ingestionService = new IngestionService();
export default ingestionService;

// Made with Bob
