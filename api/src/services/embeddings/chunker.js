/**
 * Code Chunking Service
 * 
 * Intelligently chunks code for embedding generation.
 * Preserves semantic meaning and context.
 * 
 * Strategies:
 * - Function-level chunking
 * - Class-level chunking
 * - File-level chunking
 * - Semantic chunking with overlap
 */

class CodeChunker {
  constructor() {
    this.maxChunkSize = 1000; // Max characters per chunk
    this.overlapSize = 100; // Overlap between chunks
    this.minChunkSize = 100; // Minimum chunk size
  }

  /**
   * Chunk parsed entities intelligently
   * @param {Object} parseResult - Result from AST parser
   * @param {string} filePath - File path
   * @returns {Object[]} - Array of chunks with metadata
   */
  chunkEntities(parseResult, filePath) {
    const chunks = [];

    // Chunk functions
    if (parseResult.functions && parseResult.functions.length > 0) {
      parseResult.functions.forEach(func => {
        chunks.push(...this.chunkFunction(func, filePath));
      });
    }

    // Chunk classes
    if (parseResult.classes && parseResult.classes.length > 0) {
      parseResult.classes.forEach(cls => {
        chunks.push(...this.chunkClass(cls, filePath));
      });
    }

    // Chunk imports (as context)
    if (parseResult.imports && parseResult.imports.length > 0) {
      const importChunk = this.chunkImports(parseResult.imports, filePath);
      if (importChunk) {
        chunks.push(importChunk);
      }
    }

    // Chunk exports
    if (parseResult.exports && parseResult.exports.length > 0) {
      const exportChunk = this.chunkExports(parseResult.exports, filePath);
      if (exportChunk) {
        chunks.push(exportChunk);
      }
    }

    return chunks;
  }

  /**
   * Chunk a function
   * @param {Object} func - Function entity
   * @param {string} filePath - File path
   * @returns {Object[]} - Function chunks
   */
  chunkFunction(func, filePath) {
    const chunks = [];

    // Create main function chunk
    const content = this.buildFunctionContent(func);
    
    if (content.length <= this.maxChunkSize) {
      // Single chunk
      chunks.push({
        content,
        metadata: {
          type: 'function',
          name: func.name,
          filePath,
          startLine: func.loc?.start?.line,
          endLine: func.loc?.end?.line,
          params: func.params,
          async: func.async,
          generator: func.generator,
        },
      });
    } else {
      // Split into multiple chunks with overlap
      const subChunks = this.splitWithOverlap(content);
      subChunks.forEach((chunk, index) => {
        chunks.push({
          content: chunk,
          metadata: {
            type: 'function',
            name: func.name,
            filePath,
            startLine: func.loc?.start?.line,
            endLine: func.loc?.end?.line,
            chunkIndex: index,
            totalChunks: subChunks.length,
            params: func.params,
            async: func.async,
            generator: func.generator,
          },
        });
      });
    }

    return chunks;
  }

  /**
   * Chunk a class
   * @param {Object} cls - Class entity
   * @param {string} filePath - File path
   * @returns {Object[]} - Class chunks
   */
  chunkClass(cls, filePath) {
    const chunks = [];

    // Create class overview chunk
    const overview = this.buildClassOverview(cls);
    chunks.push({
      content: overview,
      metadata: {
        type: 'class',
        name: cls.name,
        filePath,
        startLine: cls.loc?.start?.line,
        endLine: cls.loc?.end?.line,
        superClass: cls.superClass,
        methodCount: cls.methods?.length || 0,
      },
    });

    // Chunk each method
    if (cls.methods && cls.methods.length > 0) {
      cls.methods.forEach(method => {
        const methodContent = this.buildMethodContent(method, cls.name);
        chunks.push({
          content: methodContent,
          metadata: {
            type: 'method',
            className: cls.name,
            methodName: method.name,
            filePath,
            startLine: method.loc?.start?.line,
            endLine: method.loc?.end?.line,
            static: method.static,
            async: method.async,
          },
        });
      });
    }

    return chunks;
  }

  /**
   * Chunk imports
   * @param {Object[]} imports - Import entities
   * @param {string} filePath - File path
   * @returns {Object} - Import chunk
   */
  chunkImports(imports, filePath) {
    const content = imports
      .map(imp => `import ${imp.specifiers?.join(', ') || '*'} from '${imp.source}'`)
      .join('\n');

    if (content.length < this.minChunkSize) {
      return null;
    }

    return {
      content,
      metadata: {
        type: 'imports',
        filePath,
        importCount: imports.length,
        sources: imports.map(imp => imp.source),
      },
    };
  }

  /**
   * Chunk exports
   * @param {Object[]} exports - Export entities
   * @param {string} filePath - File path
   * @returns {Object} - Export chunk
   */
  chunkExports(exports, filePath) {
    const content = exports
      .map(exp => `export ${exp.type} ${exp.name}`)
      .join('\n');

    if (content.length < this.minChunkSize) {
      return null;
    }

    return {
      content,
      metadata: {
        type: 'exports',
        filePath,
        exportCount: exports.length,
        names: exports.map(exp => exp.name),
      },
    };
  }

  /**
   * Build function content for embedding
   * @param {Object} func - Function entity
   * @returns {string} - Function content
   */
  buildFunctionContent(func) {
    const parts = [];

    // Function signature
    const signature = `function ${func.name}(${func.params?.join(', ') || ''})`;
    parts.push(signature);

    // Documentation
    if (func.documentation) {
      parts.push(`\n// ${func.documentation}`);
    }

    // Body (if available)
    if (func.body) {
      parts.push(`\n${func.body}`);
    }

    return parts.join('');
  }

  /**
   * Build class overview
   * @param {Object} cls - Class entity
   * @returns {string} - Class overview
   */
  buildClassOverview(cls) {
    const parts = [];

    // Class declaration
    const declaration = cls.superClass
      ? `class ${cls.name} extends ${cls.superClass}`
      : `class ${cls.name}`;
    parts.push(declaration);

    // Documentation
    if (cls.documentation) {
      parts.push(`\n// ${cls.documentation}`);
    }

    // Method signatures
    if (cls.methods && cls.methods.length > 0) {
      parts.push('\n// Methods:');
      cls.methods.forEach(method => {
        const methodSig = `${method.static ? 'static ' : ''}${method.name}(${method.params?.join(', ') || ''})`;
        parts.push(`// - ${methodSig}`);
      });
    }

    return parts.join('\n');
  }

  /**
   * Build method content
   * @param {Object} method - Method entity
   * @param {string} className - Class name
   * @returns {string} - Method content
   */
  buildMethodContent(method, className) {
    const parts = [];

    // Method signature
    const signature = `${className}.${method.name}(${method.params?.join(', ') || ''})`;
    parts.push(signature);

    // Documentation
    if (method.documentation) {
      parts.push(`\n// ${method.documentation}`);
    }

    // Body (if available)
    if (method.body) {
      parts.push(`\n${method.body}`);
    }

    return parts.join('');
  }

  /**
   * Split content into chunks with overlap
   * @param {string} content - Content to split
   * @returns {string[]} - Array of chunks
   */
  splitWithOverlap(content) {
    const chunks = [];
    let start = 0;

    while (start < content.length) {
      const end = Math.min(start + this.maxChunkSize, content.length);
      const chunk = content.substring(start, end);
      chunks.push(chunk);

      // Move start position with overlap
      start = end - this.overlapSize;

      // Prevent infinite loop
      if (start >= content.length - this.overlapSize) {
        break;
      }
    }

    return chunks;
  }

  /**
   * Chunk raw file content (fallback)
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @returns {Object[]} - File chunks
   */
  chunkFile(content, filePath) {
    if (content.length <= this.maxChunkSize) {
      return [
        {
          content,
          metadata: {
            type: 'file',
            filePath,
            size: content.length,
          },
        },
      ];
    }

    const chunks = this.splitWithOverlap(content);
    return chunks.map((chunk, index) => ({
      content: chunk,
      metadata: {
        type: 'file',
        filePath,
        chunkIndex: index,
        totalChunks: chunks.length,
        size: chunk.length,
      },
    }));
  }
}

export default CodeChunker;

// Made with Bob
