// ============================================
// CODEATLAS - Repository Ingestion Service
// ============================================

const simpleGit = require('simple-git');
const fs = require('fs').promises;
const path = require('path');
const ignore = require('ignore');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

// Ignored directories (from .env or defaults)
const IGNORED_DIRS = (process.env.IGNORED_DIRECTORIES || 
  'node_modules,.next,dist,build,coverage,.git,.github,__pycache__,.pytest_cache,.venv,venv,env').split(',');

// Ignored file extensions (from .env or defaults)
const IGNORED_EXTENSIONS = (process.env.IGNORED_EXTENSIONS || 
  '.jpg,.jpeg,.png,.gif,.svg,.ico,.mp4,.mp3,.avi,.mov,.zip,.tar,.gz,.rar,.7z,.exe,.dll,.so,.dylib,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx').split(',');

// Supported code file extensions
const CODE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx',
  '.py', '.java', '.go', '.rs',
  '.c', '.cpp', '.h', '.hpp',
  '.rb', '.php', '.swift', '.kt',
  '.cs', '.scala', '.r', '.m',
  '.json', '.yaml', '.yml', '.toml',
  '.md', '.txt', '.sh', '.bash'
];

// Maximum file size in bytes (from .env or default 10MB)
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024;

/**
 * Clone a GitHub repository
 */
async function cloneRepository(githubUrl, branch = 'main') {
  try {
    logger.info(`Cloning repository: ${githubUrl}`);
    
    // Create temporary directory for cloning
    const repoName = githubUrl.split('/').pop().replace('.git', '');
    const clonePath = path.join(process.cwd(), 'temp', 'repos', repoName);
    
    // Ensure temp directory exists
    await fs.mkdir(path.dirname(clonePath), { recursive: true });
    
    // Remove existing directory if it exists
    try {
      await fs.rm(clonePath, { recursive: true, force: true });
    } catch (err) {
      // Directory doesn't exist, ignore
    }
    
    // Clone repository
    const git = simpleGit();
    await git.clone(githubUrl, clonePath, ['--depth', '1', '--branch', branch]);
    
    logger.info(`Repository cloned successfully to: ${clonePath}`);
    
    return {
      success: true,
      clonePath,
      repoName
    };
  } catch (error) {
    logger.error(`Failed to clone repository: ${githubUrl}`, error);
    throw new Error(`Clone failed: ${error.message}`);
  }
}

/**
 * Load .gitignore patterns from repository
 */
async function loadGitignorePatterns(repoPath) {
  try {
    const gitignorePath = path.join(repoPath, '.gitignore');
    const content = await fs.readFile(gitignorePath, 'utf-8');
    return content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  } catch (error) {
    // No .gitignore file, return empty array
    return [];
  }
}

/**
 * Check if file should be ignored
 */
function shouldIgnoreFile(filePath, gitignorePatterns) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  
  // Check if in ignored directories
  for (const dir of IGNORED_DIRS) {
    if (filePath.includes(`/${dir}/`) || filePath.includes(`\\${dir}\\`)) {
      return true;
    }
  }
  
  // Check if has ignored extension
  if (IGNORED_EXTENSIONS.includes(ext)) {
    return true;
  }
  
  // Check against gitignore patterns
  if (gitignorePatterns.length > 0) {
    const ig = ignore().add(gitignorePatterns);
    if (ig.ignores(filePath)) {
      return true;
    }
  }
  
  // Check if it's a code file
  if (!CODE_EXTENSIONS.includes(ext) && ext !== '') {
    return true;
  }
  
  return false;
}

/**
 * Detect programming language from file extension
 */
function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  const languageMap = {
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.py': 'Python',
    '.java': 'Java',
    '.go': 'Go',
    '.rs': 'Rust',
    '.c': 'C',
    '.cpp': 'C++',
    '.h': 'C',
    '.hpp': 'C++',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.cs': 'C#',
    '.scala': 'Scala',
    '.r': 'R',
    '.m': 'Objective-C',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.toml': 'TOML',
    '.md': 'Markdown',
    '.txt': 'Text',
    '.sh': 'Shell',
    '.bash': 'Shell'
  };
  
  return languageMap[ext] || 'Unknown';
}

/**
 * Recursively scan directory for files
 */
async function scanDirectory(dirPath, basePath, gitignorePatterns = []) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);
      
      if (entry.isDirectory()) {
        // Skip ignored directories
        if (IGNORED_DIRS.includes(entry.name)) {
          continue;
        }
        
        // Recursively scan subdirectory
        const subFiles = await scanDirectory(fullPath, basePath, gitignorePatterns);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        // Check if file should be ignored
        if (shouldIgnoreFile(relativePath, gitignorePatterns)) {
          continue;
        }
        
        // Check file size
        const stats = await fs.stat(fullPath);
        if (stats.size > MAX_FILE_SIZE) {
          logger.warn(`Skipping large file: ${relativePath} (${stats.size} bytes)`);
          continue;
        }
        
        files.push({
          path: fullPath,
          relativePath,
          name: entry.name,
          size: stats.size,
          language: detectLanguage(entry.name)
        });
      }
    }
  } catch (error) {
    logger.error(`Error scanning directory: ${dirPath}`, error);
  }
  
  return files;
}

/**
 * Read file content
 */
async function readFileContent(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    logger.error(`Error reading file: ${filePath}`, error);
    return null;
  }
}

/**
 * Count lines of code in content
 */
function countLinesOfCode(content) {
  if (!content) return 0;
  
  const lines = content.split('\n');
  let loc = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('#')) {
      loc++;
    }
  }
  
  return loc;
}

/**
 * Process repository files
 */
async function processRepositoryFiles(clonePath) {
  try {
    logger.info(`Processing files in: ${clonePath}`);
    
    // Load gitignore patterns
    const gitignorePatterns = await loadGitignorePatterns(clonePath);
    
    // Scan directory for files
    const files = await scanDirectory(clonePath, clonePath, gitignorePatterns);
    
    logger.info(`Found ${files.length} files to process`);
    
    // Read content for each file
    const processedFiles = [];
    
    for (const file of files) {
      const content = await readFileContent(file.path);
      
      if (content !== null) {
        const linesOfCode = countLinesOfCode(content);
        
        processedFiles.push({
          path: file.path,
          relativePath: file.relativePath,
          name: file.name,
          content,
          size: file.size,
          language: file.language,
          linesOfCode,
          extension: path.extname(file.name)
        });
      }
    }
    
    logger.info(`Processed ${processedFiles.length} files successfully`);
    
    return {
      success: true,
      files: processedFiles,
      totalFiles: processedFiles.length,
      totalLines: processedFiles.reduce((sum, f) => sum + f.linesOfCode, 0)
    };
  } catch (error) {
    logger.error('Error processing repository files:', error);
    throw error;
  }
}

/**
 * Clean up cloned repository
 */
async function cleanupRepository(clonePath) {
  try {
    await fs.rm(clonePath, { recursive: true, force: true });
    logger.info(`Cleaned up repository: ${clonePath}`);
  } catch (error) {
    logger.error(`Error cleaning up repository: ${clonePath}`, error);
  }
}

/**
 * Main ingestion function
 */
async function ingestRepository(githubUrl, branch = 'main') {
  let clonePath = null;
  
  try {
    // Step 1: Clone repository
    const cloneResult = await cloneRepository(githubUrl, branch);
    clonePath = cloneResult.clonePath;
    
    // Step 2: Process files
    const processResult = await processRepositoryFiles(clonePath);
    
    return {
      success: true,
      clonePath,
      repoName: cloneResult.repoName,
      files: processResult.files,
      stats: {
        totalFiles: processResult.totalFiles,
        totalLines: processResult.totalLines
      }
    };
  } catch (error) {
    logger.error('Repository ingestion failed:', error);
    
    // Cleanup on error
    if (clonePath) {
      await cleanupRepository(clonePath);
    }
    
    throw error;
  }
}

module.exports = {
  cloneRepository,
  processRepositoryFiles,
  cleanupRepository,
  ingestRepository,
  detectLanguage,
  countLinesOfCode
};

// Made with Bob
