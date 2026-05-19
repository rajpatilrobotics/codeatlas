/**
 * Extract Imports
 * Extracts import statements from code files
 */

/**
 * Extract import statements from JavaScript/TypeScript code
 */
export function extractJSImports(code) {
  if (!code || typeof code !== 'string') {
    return [];
  }

  const imports = [];
  
  // Match ES6 imports: import ... from '...'
  const es6ImportRegex = /import\s+(?:(?:\{[^}]*\})|(?:\*)\s+as\s+\w+|(?:\w+(?:\s*,\s*\w+)*))\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = es6ImportRegex.exec(code)) !== null) {
    imports.push({
      type: 'es6',
      source: match[1],
      statement: match[0]
    });
  }

  // Match CommonJS requires: require('...')
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
  
  while ((match = requireRegex.exec(code)) !== null) {
    imports.push({
      type: 'commonjs',
      source: match[1],
      statement: match[0]
    });
  }

  // Match dynamic imports: import('...')
  const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;
  
  while ((match = dynamicImportRegex.exec(code)) !== null) {
    imports.push({
      type: 'dynamic',
      source: match[1],
      statement: match[0]
    });
  }

  return imports;
}

/**
 * Extract CSS imports
 */
export function extractCSSImports(code) {
  if (!code || typeof code !== 'string') {
    return [];
  }

  const imports = [];
  
  // Match @import statements
  const importRegex = /@import\s+(?:url\(['"]?([^'")]+)['"]?\)|['"]([^'"]+)['"])/g;
  let match;
  
  while ((match = importRegex.exec(code)) !== null) {
    imports.push({
      type: 'css',
      source: match[1] || match[2],
      statement: match[0]
    });
  }

  return imports;
}

/**
 * Categorize imports by type (local, npm package, relative)
 */
export function categorizeImports(imports) {
  const categories = {
    npm: [],
    local: [],
    relative: [],
    external: []
  };

  imports.forEach(imp => {
    const { source } = imp;
    
    if (source.startsWith('.')) {
      categories.relative.push(imp);
    } else if (source.startsWith('/') || source.startsWith('~/')) {
      categories.local.push(imp);
    } else if (source.startsWith('http://') || source.startsWith('https://')) {
      categories.external.push(imp);
    } else {
      // Assume it's an npm package
      categories.npm.push(imp);
    }
  });

  return categories;
}

/**
 * Get import frequency map
 */
export function getImportFrequency(imports) {
  const frequency = {};
  
  imports.forEach(imp => {
    const { source } = imp;
    frequency[source] = (frequency[source] || 0) + 1;
  });

  return frequency;
}

export default {
  extractJSImports,
  extractCSSImports,
  categorizeImports,
  getImportFrequency
};
