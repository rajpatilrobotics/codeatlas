/**
 * Main parser service
 * Orchestrates parsing of different file types using lightweight regex-based extraction
 * Replaces heavy Babel AST parsing to ensure stability and fast processing for MVP.
 */
class ParserService {
  /**
   * Parse a single file
   * @param {Object} file - File object with content
   * @returns {Object} Parsed result
   */
  parseFile(file) {
    const { content, path, language } = file;

    // Only parse JavaScript/TypeScript for now
    if (!this.isJavaScriptFile(language)) {
      return {
        success: false,
        error: `Unsupported language: ${language}`,
        path
      };
    }

    try {
      // Lightweight regex extraction
      const imports = this.extractImportsRegex(content, path);
      const exports = this.extractExportsRegex(content, path);
      const functions = this.extractFunctionsRegex(content, path);
      const classes = this.extractClassesRegex(content, path);
      const variables = []; // Skip variable extraction to save time/memory

      return {
        success: true,
        path,
        language,
        entities: {
          functions,
          classes,
          imports,
          exports,
          variables
        },
        statistics: {
          functionCount: functions.length,
          classCount: classes.length,
          importCount: imports.length,
          exportCount: exports.length,
          variableCount: variables.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          stack: error.stack
        },
        path
      };
    }
  }

  /**
   * Parse multiple files
   * @param {Array} files - Array of file objects
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Parsed results
   */
  async parseFiles(files, onProgress = null) {
    console.log('🔍 [ParserService] parseFiles called with', files.length, 'files');
    
    const results = [];
    const errors = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const result = this.parseFile(file);

        if (result.success) {
          results.push(result);
        } else {
          errors.push({
            path: file.path,
            error: result.error
          });
        }

        // Report progress periodically
        if (onProgress && (i % 50 === 0 || i === total - 1)) {
          const progress = Math.round(((i + 1) / total) * 100);
          onProgress({
            stage: 'parsing',
            progress,
            message: `Parsing files: ${i + 1}/${total}`,
            parsed: results.length,
            errors: errors.length
          });
        }
      } catch (error) {
        errors.push({
          path: file.path,
          error: {
            message: error.message,
            stack: error.stack
          }
        });
      }
    }

    const statistics = this.calculateStatistics(results);

    console.log('🔍 [ParserService] parseFiles complete:', {
      totalFiles: files.length,
      successfulParses: results.length,
      failedParses: errors.length,
      statistics
    });

    return {
      success: true,
      results,
      errors,
      statistics
    };
  }

  // --- Lightweight Regex Extractors ---

  extractImportsRegex(code, filePath) {
    const imports = [];
    // Matches: import { a, b } from "source"; import a from "source";
    const importRegex = /import\s+(?:(?:\*\s+as\s+\w+)|(?:{[^}]+})|(?:\w+))(?:\s*,\s*(?:(?:{[^}]+})|(?:\w+)))?\s+from\s+['"]([^'"]+)['"]/g;
    // Matches: require("source")
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

    let match;
    while ((match = importRegex.exec(code)) !== null) {
      imports.push({
        source: match[1],
        specifiers: [], // Keep it lightweight, don't parse specifiers deeply
        loc: { start: { line: 1 }, end: { line: 1 } },
        filePath
      });
    }

    while ((match = requireRegex.exec(code)) !== null) {
      imports.push({
        source: match[1],
        specifiers: [{ type: 'require', name: 'unknown' }],
        loc: { start: { line: 1 }, end: { line: 1 } },
        filePath
      });
    }

    return imports;
  }

  extractExportsRegex(code, filePath) {
    const exportsList = [];
    // Very basic regex to match "export const/let/var/function/class name"
    const namedExportRegex = /export\s+(?:const|let|var|function|class)\s+([a-zA-Z0-9_]+)/g;
    const defaultExportRegex = /export\s+default\s+([a-zA-Z0-9_]+)/g;

    let match;
    while ((match = namedExportRegex.exec(code)) !== null) {
      exportsList.push({
        type: 'named',
        name: match[1],
        loc: { start: { line: 1 }, end: { line: 1 } },
        filePath
      });
    }

    while ((match = defaultExportRegex.exec(code)) !== null) {
      exportsList.push({
        type: 'default',
        name: match[1] || 'default',
        loc: { start: { line: 1 }, end: { line: 1 } },
        filePath
      });
    }

    return exportsList;
  }

  extractFunctionsRegex(code, filePath) {
    const functions = [];
    const functionRegex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
    // simple arrow functions e.g., const myFunc = () =>
    const arrowRegex = /(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/g;

    let match;
    while ((match = functionRegex.exec(code)) !== null) {
      functions.push({
        type: 'function',
        name: match[1],
        params: [], // skip params parsing
        async: false,
        generator: false,
        loc: { start: { line: 1 }, end: { line: 1 } },
        filePath
      });
    }

    while ((match = arrowRegex.exec(code)) !== null) {
      functions.push({
        type: 'arrow_function',
        name: match[1],
        params: [],
        async: false,
        loc: { start: { line: 1 }, end: { line: 1 } },
        filePath
      });
    }

    return functions;
  }

  extractClassesRegex(code, filePath) {
    const classes = [];
    const classRegex = /class\s+([a-zA-Z0-9_]+)(?:\s+extends\s+([a-zA-Z0-9_]+))?\s*{/g;

    let match;
    while ((match = classRegex.exec(code)) !== null) {
      classes.push({
        type: 'class',
        name: match[1],
        superClass: match[2] || null,
        methods: [],
        properties: [],
        loc: { start: { line: 1 }, end: { line: 1 } },
        filePath
      });
    }

    return classes;
  }

  /**
   * Calculate aggregate statistics
   * @param {Array} results - Parse results
   * @returns {Object} Statistics
   */
  calculateStatistics(results) {
    const stats = {
      totalFiles: results.length,
      totalFunctions: 0,
      totalClasses: 0,
      totalImports: 0,
      totalExports: 0,
      totalVariables: 0,
      byLanguage: {}
    };

    results.forEach(result => {
      if (result.success && result.statistics) {
        stats.totalFunctions += result.statistics.functionCount;
        stats.totalClasses += result.statistics.classCount;
        stats.totalImports += result.statistics.importCount;
        stats.totalExports += result.statistics.exportCount;
        stats.totalVariables += result.statistics.variableCount;

        const lang = result.language || 'unknown';
        if (!stats.byLanguage[lang]) {
          stats.byLanguage[lang] = {
            files: 0,
            functions: 0,
            classes: 0
          };
        }
        stats.byLanguage[lang].files++;
        stats.byLanguage[lang].functions += result.statistics.functionCount;
        stats.byLanguage[lang].classes += result.statistics.classCount;
      }
    });

    return stats;
  }

  /**
   * Check if file is JavaScript/TypeScript
   * @param {string} language - Language identifier
   * @returns {boolean} Is JavaScript file
   */
  isJavaScriptFile(language) {
    return language === 'javascript' || language === 'typescript';
  }

  /**
   * Get all entities from parse results
   * @param {Array} results - Parse results
   * @returns {Object} All entities grouped by type
   */
  getAllEntities(results) {
    const allEntities = {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      variables: []
    };

    results.forEach(result => {
      if (result.success && result.entities) {
        allEntities.functions.push(...result.entities.functions);
        allEntities.classes.push(...result.entities.classes);
        allEntities.imports.push(...result.entities.imports);
        allEntities.exports.push(...result.entities.exports);
        allEntities.variables.push(...result.entities.variables);
      }
    });

    return allEntities;
  }

  /**
   * Get entities by file
   * @param {Array} results - Parse results
   * @returns {Object} Entities grouped by file
   */
  getEntitiesByFile(results) {
    const byFile = {};

    results.forEach(result => {
      if (result.success && result.entities) {
        byFile[result.path] = result.entities;
      }
    });

    return byFile;
  }

  /**
   * Find entity by name
   * @param {Array} results - Parse results
   * @param {string} name - Entity name
   * @param {string} type - Entity type (optional)
   * @returns {Array} Matching entities
   */
  findEntity(results, name, type = null) {
    const matches = [];

    results.forEach(result => {
      if (!result.success || !result.entities) return;

      const searchIn = type ? [result.entities[type]] : Object.values(result.entities);

      searchIn.forEach(entities => {
        if (Array.isArray(entities)) {
          entities.forEach(entity => {
            if (entity.name === name) {
              matches.push({
                ...entity,
                file: result.path
              });
            }
          });
        }
      });
    });

    return matches;
  }
}

const parserService = new ParserService();
export default parserService;
