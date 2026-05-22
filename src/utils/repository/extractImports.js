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

/**
 * Extract export statements from JavaScript/TypeScript code
 * NEW FUNCTION - Additive enhancement for dependency graph
 */
export function extractJSExports(code) {
  if (!code || typeof code !== 'string') {
    return [];
  }

  const exports = [];
  
  // Match: export default X
  const defaultExportRegex = /export\s+default\s+(?:class|function|const|let|var)?\s*(\w+)?/g;
  let match;
  
  while ((match = defaultExportRegex.exec(code)) !== null) {
    exports.push({
      type: 'default',
      name: match[1] || 'default',
      statement: match[0]
    });
  }

  // Match: export { X, Y }
  const namedExportRegex = /export\s+\{([^}]+)\}/g;
  
  while ((match = namedExportRegex.exec(code)) !== null) {
    const names = match[1].split(',').map(n => n.trim());
    names.forEach(name => {
      exports.push({
        type: 'named',
        name: name,
        statement: match[0]
      });
    });
  }

  // Match: export const X = ...
  const constExportRegex = /export\s+(?:const|let|var)\s+(\w+)/g;
  
  while ((match = constExportRegex.exec(code)) !== null) {
    exports.push({
      type: 'named',
      name: match[1],
      statement: match[0]
    });
  }

  // Match: export function X
  const functionExportRegex = /export\s+function\s+(\w+)/g;
  
  while ((match = functionExportRegex.exec(code)) !== null) {
    exports.push({
      type: 'named',
      name: match[1],
      statement: match[0]
    });
  }

  // Match: export class X
  const classExportRegex = /export\s+class\s+(\w+)/g;
  
  while ((match = classExportRegex.exec(code)) !== null) {
    exports.push({
      type: 'named',
      name: match[1],
      statement: match[0]
    });
  }

  // Match: module.exports = X
  const moduleExportsRegex = /module\.exports\s*=\s*(\w+)/g;
  
  while ((match = moduleExportsRegex.exec(code)) !== null) {
    exports.push({
      type: 'commonjs',
      name: match[1] || 'default',
      statement: match[0]
    });
  }

  return exports;
}

/**
 * Extract imports with enhanced metadata (line numbers, specifiers)
 * NEW FUNCTION - Additive enhancement for dependency graph
 */
export function extractJSImportsWithMetadata(code) {
  if (!code || typeof code !== 'string') {
    return [];
  }

  const imports = [];
  const lines = code.split('\n');
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // ES6 imports
    const es6Match = /import\s+(?:(?:\{([^}]*)\})|(?:\*\s+as\s+(\w+))|(\w+)(?:\s*,\s*\{([^}]*)\})?)\s+from\s+['"]([^'"]+)['"]/g.exec(line);
    if (es6Match) {
      const namedImports = es6Match[1] || es6Match[4] || '';
      const namespaceImport = es6Match[2] || '';
      const defaultImport = es6Match[3] || '';
      const source = es6Match[5];
      
      imports.push({
        type: 'es6',
        source,
        line: lineNumber,
        defaultImport: defaultImport || null,
        namedImports: namedImports ? namedImports.split(',').map(n => n.trim()) : [],
        namespaceImport: namespaceImport || null,
        statement: line.trim()
      });
    }
    
    // CommonJS requires
    const requireMatch = /(?:const|let|var)\s+(?:\{([^}]*)\}|(\w+))\s*=\s*require\(['"]([^'"]+)['"]\)/g.exec(line);
    if (requireMatch) {
      const destructured = requireMatch[1] || '';
      const variable = requireMatch[2] || '';
      const source = requireMatch[3];
      
      imports.push({
        type: 'commonjs',
        source,
        line: lineNumber,
        variable: variable || null,
        destructured: destructured ? destructured.split(',').map(n => n.trim()) : [],
        statement: line.trim()
      });
    }
    
    // Dynamic imports
    const dynamicMatch = /import\(['"]([^'"]+)['"]\)/g.exec(line);
    if (dynamicMatch) {
      imports.push({
        type: 'dynamic',
        source: dynamicMatch[1],
        line: lineNumber,
        statement: line.trim()
      });
    }
  });

  return imports;
}

/**
 * Get import type classification
 * NEW FUNCTION - Additive enhancement for dependency graph
 */
export function getImportType(importStatement) {
  if (!importStatement || typeof importStatement !== 'string') {
    return 'unknown';
  }

  if (importStatement.includes('import(')) {
    return 'dynamic';
  }
  
  if (importStatement.includes('require(')) {
    return 'commonjs';
  }
  
  if (importStatement.startsWith('import') && importStatement.includes('from')) {
    if (importStatement.includes('* as')) {
      return 'es6-namespace';
    }
    if (importStatement.includes('{')) {
      return 'es6-named';
    }
    return 'es6-default';
  }
  
  return 'unknown';
}

export default {
  extractJSImports,
  extractCSSImports,
  categorizeImports,
  getImportFrequency,
  // NEW exports - additive only
  extractJSExports,
  extractJSImportsWithMetadata,
  getImportType
};
