import path from 'path';
import fs from 'fs';

const fsPromises = fs.promises;

/**
 * Directories to ignore completely during repository analysis
 */
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  'vendor',
  'venv',
  '__pycache__',
  'target',
  'bin',
  'obj',
  'out',
  'public/assets',
  'generated',
  'tmp',
  'cache',
  '.nuxt',
  '.cache',
  '.parcel-cache',
  '.vscode',
  '.idea',
  '.pytest_cache',
  'env',
  '.env',
  '.gradle',
  '.mvn'
]);

/**
 * Priority directories to process first
 */
const PRIORITY_DIRECTORIES = new Set([
  'src',
  'app',
  'components',
  'services',
  'api',
  'controllers',
  'hooks',
  'lib',
  'utils',
  'models',
  'routes',
  'db',
  'config',
  'docs'
]);

/**
 * File extensions to ignore (binary and generated files)
 */
const IGNORED_EXTENSIONS = new Set([
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp',
  // Videos
  '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
  // Audio
  '.mp3', '.wav', '.ogg', '.flac', '.aac',
  // Archives
  '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2',
  // Executables
  '.exe', '.dll', '.so', '.dylib', '.app',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  // Fonts
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  // Other binary
  '.bin', '.dat', '.db', '.sqlite', '.lock'
]);

/**
 * File extensions to analyze (only these will be processed)
 */
const SUPPORTED_EXTENSIONS = new Set([
  // JavaScript/TypeScript
  '.js', '.jsx', '.ts', '.tsx',
  // Python
  '.py',
  // Java
  '.java',
  // Go
  '.go',
  // Markdown
  '.md'
]);

/**
 * Important files without extensions that should be included
 */
const IMPORTANT_FILES_NO_EXT = new Set([
  'README',
  'LICENSE',
  'CHANGELOG',
  'CONTRIBUTING',
  'AUTHORS',
  'NOTICE',
  'Makefile',
  'Dockerfile',
  'Jenkinsfile',
  'Vagrantfile'
]);

/**
 * Maximum file size to analyze (1MB)
 */
const MAX_FILE_SIZE = 1 * 1024 * 1024;

/**
 * Maximum number of files to process per repository
 */
const MAX_FILES_PER_REPO = 500;

/**
 * Lockfiles to skip
 */
const LOCKFILES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'composer.lock',
  'Gemfile.lock',
  'Pipfile.lock',
  'poetry.lock',
  'cargo.lock'
]);

/**
 * Check if directory should be ignored
 * @param {string} dirName - Directory name
 * @returns {boolean} Should ignore
 */
function shouldIgnoreDirectory(dirName) {
  return IGNORED_DIRECTORIES.has(dirName) || dirName.startsWith('.');
}

/**
 * Check if file is minified
 * @param {string} fileName - File name
 * @returns {boolean} Is minified
 */
function isMinifiedFile(fileName) {
  return fileName.includes('.min.');
}

/**
 * Check if file is a lockfile
 * @param {string} fileName - File name
 * @returns {boolean} Is lockfile
 */
function isLockfile(fileName) {
  return LOCKFILES.has(fileName);
}

/**
 * Check if file should be ignored based on extension
 * @param {string} fileName - File name
 * @returns {boolean} Should ignore
 */
function shouldIgnoreFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const baseName = path.basename(fileName);
  
  // Allow important files without extensions
  if (!ext && IMPORTANT_FILES_NO_EXT.has(baseName)) {
    return false;
  }
  
  // Ignore files without extension (unless they're important files above)
  if (!ext) {
    return true;
  }
  
  // Ignore files with ignored extensions
  if (IGNORED_EXTENSIONS.has(ext)) {
    return true;
  }
  
  // Ignore hidden files
  if (fileName.startsWith('.')) {
    return true;
  }
  
  // Ignore minified files
  if (isMinifiedFile(fileName)) {
    return true;
  }
  
  // Ignore lockfiles
  if (isLockfile(fileName)) {
    return true;
  }
  
  return false;
}

/**
 * Check if file is supported for analysis
 * @param {string} fileName - File name
 * @returns {boolean} Is supported
 */
function isSupportedFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const baseName = path.basename(fileName);
  
  // Important files without extensions are supported
  if (!ext && IMPORTANT_FILES_NO_EXT.has(baseName)) {
    return true;
  }
  
  return SUPPORTED_EXTENSIONS.has(ext);
}

/**
 * Check if file size is within limits
 * @param {string} filePath - Path to file
 * @returns {Promise<boolean>} Is within size limit
 */
async function isWithinSizeLimit(filePath) {
  try {
    const stats = await fsPromises.stat(filePath);
    return stats.size <= MAX_FILE_SIZE;
  } catch (error) {
    console.error(`Error checking file size for ${filePath}:`, error);
    return false;
  }
}

/**
 * Get file language from extension
 * @param {string} fileName - File name
 * @returns {string} Language identifier
 */
function getFileLanguage(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  
  const languageMap = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    '.py': 'python',
    '.pyw': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.c': 'c',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.kts': 'kotlin',
    '.scala': 'scala',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.xml': 'xml',
    '.md': 'markdown',
    '.mdx': 'markdown'
  };
  
  return languageMap[ext] || 'unknown';
}

/**
 * Check if directory is a priority directory
 * @param {string} dirName - Directory name
 * @returns {boolean} Is priority
 */
function isPriorityDirectory(dirName) {
  return PRIORITY_DIRECTORIES.has(dirName);
}

/**
 * Filter files in a directory recursively with smart prioritization
 * @param {string} dirPath - Directory path
 * @param {string} basePath - Base repository path
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} Filtered file list
 */
async function filterFiles(dirPath, basePath = dirPath, options = {}) {
  const { maxFiles = MAX_FILES_PER_REPO } = options;
  const priorityFiles = [];
  const regularFiles = [];
  
  console.log('🔍 [FileFilter] Scanning directory:', dirPath);
  
  try {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    console.log('🔍 [FileFilter] Found', entries.length, 'entries in', path.basename(dirPath));
    
    // Separate priority and regular directories
    const priorityDirs = [];
    const regularDirs = [];
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (shouldIgnoreDirectory(entry.name)) {
          continue;
        }
        
        if (isPriorityDirectory(entry.name)) {
          priorityDirs.push(entry);
        } else {
          regularDirs.push(entry);
        }
      }
    }
    
    // Process priority directories first
    for (const entry of priorityDirs) {
      const fullPath = path.join(dirPath, entry.name);
      const subFiles = await filterFiles(fullPath, basePath, { maxFiles });
      priorityFiles.push(...subFiles);
      
      // Stop if we've reached max files
      if (priorityFiles.length >= maxFiles) {
        break;
      }
    }
    
    // Process regular directories if we haven't reached max files
    if (priorityFiles.length < maxFiles) {
      for (const entry of regularDirs) {
        const fullPath = path.join(dirPath, entry.name);
        const subFiles = await filterFiles(fullPath, basePath, { maxFiles });
        regularFiles.push(...subFiles);
        
        // Stop if we've reached max files
        if (priorityFiles.length + regularFiles.length >= maxFiles) {
          break;
        }
      }
    }
    
    // Process files in current directory
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      
      // Stop if we've reached max files
      if (priorityFiles.length + regularFiles.length >= maxFiles) {
        break;
      }
      
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);
      
      console.log('🔍 [FileFilter] Checking file:', entry.name);
      
      // Skip ignored files
      if (shouldIgnoreFile(entry.name)) {
        console.log('  ❌ Ignored (shouldIgnoreFile)');
        continue;
      }
      
      // Only include supported files
      if (!isSupportedFile(entry.name)) {
        const ext = path.extname(entry.name).toLowerCase();
        console.log('  ❌ Not supported - extension:', ext, '- supported:', Array.from(SUPPORTED_EXTENSIONS).join(', '));
        continue;
      }
      
      console.log('  ✅ Passed initial checks');
      
      // Check file size
      const withinLimit = await isWithinSizeLimit(fullPath);
      if (!withinLimit) {
        console.warn(`Skipping large file (>1MB): ${relativePath}`);
        continue;
      }
      
      const fileInfo = {
        path: relativePath,
        fullPath: fullPath,
        name: entry.name,
        extension: path.extname(entry.name),
        language: getFileLanguage(entry.name)
      };
      
      // Add to priority or regular based on directory
      const dirName = path.basename(dirPath);
      if (isPriorityDirectory(dirName)) {
        priorityFiles.push(fileInfo);
      } else {
        regularFiles.push(fileInfo);
      }
    }
  } catch (error) {
    console.error(`Error filtering files in ${dirPath}:`, error);
  }
  
  // Combine priority files first, then regular files, up to max limit
  const allFiles = [...priorityFiles, ...regularFiles];
  return allFiles.slice(0, maxFiles);
}

/**
 * Get file statistics
 * @param {Array} files - Filtered file list
 * @returns {Object} File statistics
 */
function getFileStatistics(files) {
  const stats = {
    total: files.length,
    byLanguage: {},
    byExtension: {}
  };
  
  files.forEach(file => {
    // Count by language
    stats.byLanguage[file.language] = (stats.byLanguage[file.language] || 0) + 1;
    
    // Count by extension
    stats.byExtension[file.extension] = (stats.byExtension[file.extension] || 0) + 1;
  });
  
  return stats;
}

export {
  shouldIgnoreDirectory,
  shouldIgnoreFile,
  isSupportedFile,
  isWithinSizeLimit,
  getFileLanguage,
  filterFiles,
  getFileStatistics,
  isPriorityDirectory,
  isMinifiedFile,
  isLockfile,
  IGNORED_DIRECTORIES,
  PRIORITY_DIRECTORIES,
  IGNORED_EXTENSIONS,
  SUPPORTED_EXTENSIONS,
  MAX_FILE_SIZE,
  MAX_FILES_PER_REPO,
  LOCKFILES
};

// Made with Bob
