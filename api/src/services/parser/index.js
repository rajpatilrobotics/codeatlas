const {
  parseCode,
  extractFunctions,
  extractClasses,
  extractImports,
  extractExports,
  extractVariables
} = require('./babelParser');

/**
 * Main parser service
 * Orchestrates parsing of different file types
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
      // Parse code to AST
      const parseResult = parseCode(content, {
        language,
        filePath: path
      });

      if (!parseResult.success) {
        return {
          success: false,
          error: parseResult.error,
          path
        };
      }

      const { ast } = parseResult;

      // Extract all entities
      const functions = extractFunctions(ast, path);
      const classes = extractClasses(ast, path);
      const imports = extractImports(ast, path);
      const exports = extractExports(ast, path);
      const variables = extractVariables(ast, path);

      return {
        success: true,
        path,
        language: parseResult.language,
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

        // Report progress
        if (onProgress && (i % 10 === 0 || i === total - 1)) {
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

    // Calculate aggregate statistics
    const statistics = this.calculateStatistics(results);

    return {
      success: true,
      results,
      errors,
      statistics
    };
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

        // Count by language
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

// Export singleton instance
module.exports = new ParserService();

// Made with Bob
