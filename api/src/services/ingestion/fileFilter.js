import path from 'path';
import fs from 'fs';

const fsPromises = fs.promises;

/**
 * Directories to ignore during repository analysis
 */
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  '.nuxt',
  'out',
  '.cache',
  '.parcel-cache',
  '.vscode',
  '.idea',
  '__pycache__',
  '.pytest_cache',
  'venv',
  'env',
  '.env',
  'target',
  'bin',
  'obj',
  '.gradle',
  '.mvn'
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
 * File extensions to analyze
 */
const SUPPORTED_EXTENSIONS = new Set([
  // JavaScript/TypeScript
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  // Python
  '.py', '.pyw',
  // Java
  '.java',
  // Go
  '.go',
  // Rust
  '.rs',
  // C/C++
  '.c', '.cpp', '.cc', '.h', '.hpp',
  // C#
  '.cs',
  // Ruby
  '.rb',
  // PHP
  '.php',
  // Swift
  '.swift',
  // Kotlin
  '.kt', '.kts',
  // Scala
  '.scala',
  // Config files
  '.json', '.yaml', '.yml', '.toml', '.xml',
  // Markdown
  '.md', '.mdx'
]);

/**
 * Maximum file size to analyze (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Check if directory should be ignored
 * @param {string} dirName - Directory name
 * @returns {boolean} Should ignore
 */
function shouldIgnoreDirectory(dirName) {
  return IGNORED_DIRECTORIES.has(dirName) || dirName.startsWith('.');
}

/**
 * Check if file should be ignored based on extension
 * @param {string} fileName - File name
 * @returns {boolean} Should ignore
 */
function shouldIgnoreFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  
  // Ignore files without extension or with ignored extensions
  if (!ext || IGNORED_EXTENSIONS.has(ext)) {
    return true;
  }
  
  // Ignore hidden files
  if (fileName.startsWith('.')) {
    return true;
  }
  
  // Ignore lock files
  if (fileName.includes('.lock') || fileName.includes('-lock.')) {
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
 * Filter files in a directory recursively
 * @param {string} dirPath - Directory path
 * @param {string} basePath - Base repository path
 * @returns {Promise<Array>} Filtered file list
 */
async function filterFiles(dirPath, basePath = dirPath) {
  const files = [];
  
  try {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);
      
      if (entry.isDirectory()) {
        // Skip ignored directories
        if (shouldIgnoreDirectory(entry.name)) {
          continue;
        }
        
        // Recursively process subdirectory
        const subFiles = await filterFiles(fullPath, basePath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        // Skip ignored files
        if (shouldIgnoreFile(entry.name)) {
          continue;
        }
        
        // Only include supported files
        if (!isSupportedFile(entry.name)) {
          continue;
        }
        
        // Check file size
        const withinLimit = await isWithinSizeLimit(fullPath);
        if (!withinLimit) {
          console.warn(`Skipping large file: ${relativePath}`);
          continue;
        }
        
        files.push({
          path: relativePath,
          fullPath: fullPath,
          name: entry.name,
          extension: path.extname(entry.name),
          language: getFileLanguage(entry.name)
        });
      }
    }
  } catch (error) {
    console.error(`Error filtering files in ${dirPath}:`, error);
  }
  
  return files;
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
  IGNORED_DIRECTORIES,
  IGNORED_EXTENSIONS,
  SUPPORTED_EXTENSIONS,
  MAX_FILE_SIZE
};

// Made with Bob
