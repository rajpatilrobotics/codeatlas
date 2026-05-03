/**
 * Universal Code Analysis Service
 * 
 * This service provides deep code analysis capabilities for all tabs.
 * It reads file contents from GitHub, extracts code snippets, detects patterns,
 * and provides insights that enhance every part of the application.
 * 
 * Features:
 * - File content reading and caching
 * - Code snippet extraction
 * - Pattern detection (frameworks, libraries, architectures)
 * - Security vulnerability scanning
 * - Dependency analysis
 * - Function/class extraction
 */

class CodeAnalysisService {
  constructor() {
    this.fileCache = new Map(); // Cache file contents
    this.analysisCache = new Map(); // Cache analysis results
    this.maxCacheSize = 100;
    this.cacheTTL = 3600000; // 1 hour
  }

  /**
   * Read file contents from GitHub API
   */
  async readFileFromGitHub(owner, repo, path, token) {
    const cacheKey = `${owner}/${repo}/${path}`;
    
    // Check cache first
    const cached = this.fileCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`📦 Cache hit for file: ${path}`);
      return cached.content;
    }

    try {
      console.log(`📥 Fetching file from GitHub: ${path}`);
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Decode base64 content
      const content = atob(data.content);
      
      // Cache the content
      this.cacheFile(cacheKey, content);
      
      return content;
    } catch (error) {
      console.error(`Error reading file ${path}:`, error);
      return null;
    }
  }

  /**
   * Cache file content with timestamp
   */
  cacheFile(key, content) {
    // Evict oldest if at capacity
    if (this.fileCache.size >= this.maxCacheSize) {
      const oldestKey = this.fileCache.keys().next().value;
      this.fileCache.delete(oldestKey);
    }

    this.fileCache.set(key, {
      content,
      timestamp: Date.now()
    });
  }

  /**
   * Extract code snippets based on keywords
   */
  extractSnippets(fileContent, keywords, contextLines = 5) {
    if (!fileContent) return [];

    const lines = fileContent.split('\n');
    const snippets = [];
    const processedLines = new Set(); // Avoid duplicate snippets

    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      
      lines.forEach((line, index) => {
        const lineLower = line.toLowerCase();
        
        // Check if line contains keyword and hasn't been processed
        if (lineLower.includes(keywordLower) && !processedLines.has(index)) {
          const start = Math.max(0, index - contextLines);
          const end = Math.min(lines.length, index + contextLines + 1);
          
          // Mark all lines in this snippet as processed
          for (let i = start; i < end; i++) {
            processedLines.add(i);
          }
          
          snippets.push({
            keyword,
            lineNumber: index + 1,
            code: lines.slice(start, end).join('\n'),
            context: `Lines ${start + 1}-${end}`,
            matchedLine: line.trim()
          });
        }
      });
    });

    return snippets;
  }

  /**
   * Detect technology patterns in code
   */
  detectPatterns(fileContent, filePath) {
    const patterns = {
      frameworks: [],
      libraries: [],
      patterns: [],
      databases: [],
      apis: []
    };

    if (!fileContent) return patterns;

    const content = fileContent.toLowerCase();
    const path = filePath.toLowerCase();

    // Framework detection
    if (content.includes('import react') || content.includes('from \'react\'')) {
      patterns.frameworks.push('React');
    }
    if (content.includes('express()') || content.includes('require(\'express\')')) {
      patterns.frameworks.push('Express.js');
    }
    if (content.includes('@angular') || content.includes('angular.module')) {
      patterns.frameworks.push('Angular');
    }
    if (content.includes('vue') && (content.includes('createapp') || content.includes('new vue'))) {
      patterns.frameworks.push('Vue.js');
    }
    if (content.includes('next') && path.includes('next')) {
      patterns.frameworks.push('Next.js');
    }

    // Library detection
    if (content.includes('axios')) patterns.libraries.push('Axios');
    if (content.includes('lodash') || content.includes('_.')  ) patterns.libraries.push('Lodash');
    if (content.includes('moment')) patterns.libraries.push('Moment.js');
    if (content.includes('socket.io')) patterns.libraries.push('Socket.io');
    if (content.includes('jwt') || content.includes('jsonwebtoken')) patterns.libraries.push('JWT');
    if (content.includes('bcrypt')) patterns.libraries.push('Bcrypt');

    // Database detection
    if (content.includes('mongoose.schema') || content.includes('mongoose.model')) {
      patterns.databases.push('MongoDB (Mongoose)');
    }
    if (content.includes('sequelize') || content.includes('new sequelize')) {
      patterns.databases.push('SQL (Sequelize)');
    }
    if (content.includes('prisma')) patterns.databases.push('Prisma');
    if (content.includes('pg.pool') || content.includes('pg.client')) {
      patterns.databases.push('PostgreSQL');
    }

    // Architecture patterns
    if (path.includes('controller')) patterns.patterns.push('MVC - Controller');
    if (path.includes('model')) patterns.patterns.push('MVC - Model');
    if (path.includes('view') || path.includes('component')) patterns.patterns.push('MVC - View');
    if (path.includes('service')) patterns.patterns.push('Service Layer');
    if (path.includes('middleware')) patterns.patterns.push('Middleware Pattern');
    if (path.includes('route')) patterns.patterns.push('Routing Layer');

    // API patterns
    if (content.includes('router.get') || content.includes('router.post')) {
      patterns.apis.push('REST API');
    }
    if (content.includes('graphql') || content.includes('apollo')) {
      patterns.apis.push('GraphQL');
    }
    if (content.includes('websocket') || content.includes('ws://')) {
      patterns.apis.push('WebSocket');
    }

    return patterns;
  }

  /**
   * Detect security issues in code
   */
  detectSecurityIssues(fileContent, filePath) {
    const issues = [];

    if (!fileContent) return issues;

    const lines = fileContent.split('\n');

    lines.forEach((line, index) => {
      const lineLower = line.toLowerCase();
      const lineNum = index + 1;

      // SQL Injection
      if (lineLower.includes('query(') && (lineLower.includes('+') || lineLower.includes('${') || lineLower.includes('`'))) {
        issues.push({
          severity: 'critical',
          type: 'SQL Injection',
          line: lineNum,
          code: line.trim(),
          message: 'Potential SQL injection vulnerability. Use parameterized queries.',
          file: filePath
        });
      }

      // Hardcoded secrets
      if (lineLower.includes('password') && (lineLower.includes('=') || lineLower.includes(':'))) {
        if (!lineLower.includes('process.env') && !lineLower.includes('config.')) {
          issues.push({
            severity: 'high',
            type: 'Hardcoded Secret',
            line: lineNum,
            code: line.trim(),
            message: 'Potential hardcoded password. Use environment variables.',
            file: filePath
          });
        }
      }

      // API keys
      if ((lineLower.includes('api_key') || lineLower.includes('apikey') || lineLower.includes('secret')) && 
          lineLower.includes('=') && !lineLower.includes('process.env')) {
        issues.push({
          severity: 'high',
          type: 'Hardcoded API Key',
          line: lineNum,
          code: line.trim(),
          message: 'Potential hardcoded API key. Use environment variables.',
          file: filePath
        });
      }

      // eval() usage
      if (lineLower.includes('eval(')) {
        issues.push({
          severity: 'high',
          type: 'Dangerous Function',
          line: lineNum,
          code: line.trim(),
          message: 'Use of eval() is dangerous and should be avoided.',
          file: filePath
        });
      }

      // Weak crypto
      if (lineLower.includes('md5') || lineLower.includes('sha1')) {
        issues.push({
          severity: 'medium',
          type: 'Weak Cryptography',
          line: lineNum,
          code: line.trim(),
          message: 'MD5/SHA1 are weak. Use bcrypt or SHA-256+.',
          file: filePath
        });
      }
    });

    return issues;
  }

  /**
   * Extract function and class definitions
   */
  extractDefinitions(fileContent, filePath) {
    const definitions = {
      functions: [],
      classes: [],
      exports: []
    };

    if (!fileContent) return definitions;

    const lines = fileContent.split('\n');
    const ext = filePath.split('.').pop();

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const lineNum = index + 1;

      // JavaScript/TypeScript functions
      if (ext === 'js' || ext === 'jsx' || ext === 'ts' || ext === 'tsx') {
        // Function declarations
        if (trimmed.startsWith('function ') || trimmed.startsWith('async function ')) {
          const match = trimmed.match(/function\s+(\w+)/);
          if (match) {
            definitions.functions.push({
              name: match[1],
              line: lineNum,
              type: 'function',
              async: trimmed.includes('async')
            });
          }
        }

        // Arrow functions
        if (trimmed.includes('=>') && (trimmed.includes('const ') || trimmed.includes('let '))) {
          const match = trimmed.match(/(?:const|let)\s+(\w+)\s*=/);
          if (match) {
            definitions.functions.push({
              name: match[1],
              line: lineNum,
              type: 'arrow',
              async: trimmed.includes('async')
            });
          }
        }

        // Class declarations
        if (trimmed.startsWith('class ')) {
          const match = trimmed.match(/class\s+(\w+)/);
          if (match) {
            definitions.classes.push({
              name: match[1],
              line: lineNum
            });
          }
        }

        // Exports
        if (trimmed.startsWith('export ')) {
          const match = trimmed.match(/export\s+(?:default\s+)?(?:function|class|const|let)?\s*(\w+)/);
          if (match) {
            definitions.exports.push({
              name: match[1],
              line: lineNum,
              default: trimmed.includes('default')
            });
          }
        }
      }

      // Python functions and classes
      if (ext === 'py') {
        if (trimmed.startsWith('def ')) {
          const match = trimmed.match(/def\s+(\w+)/);
          if (match) {
            definitions.functions.push({
              name: match[1],
              line: lineNum,
              type: 'function',
              async: trimmed.includes('async def')
            });
          }
        }

        if (trimmed.startsWith('class ')) {
          const match = trimmed.match(/class\s+(\w+)/);
          if (match) {
            definitions.classes.push({
              name: match[1],
              line: lineNum
            });
          }
        }
      }
    });

    return definitions;
  }

  /**
   * Analyze a single file comprehensively
   */
  async analyzeFile(owner, repo, file, token) {
    try {
      const content = await this.readFileFromGitHub(owner, repo, file.path, token);
      
      if (!content) {
        return null;
      }

      const analysis = {
        path: file.path,
        size: content.length,
        lines: content.split('\n').length,
        content: content,
        patterns: this.detectPatterns(content, file.path),
        security: this.detectSecurityIssues(content, file.path),
        definitions: this.extractDefinitions(content, file.path)
      };

      return analysis;
    } catch (error) {
      console.error(`Error analyzing file ${file.path}:`, error);
      return null;
    }
  }

  /**
   * Analyze entire repository
   */
  async analyzeRepository(owner, repo, files, token, maxFiles = 15) {
    console.log(`🔍 Starting repository analysis for ${owner}/${repo}`);
    console.log(`📁 Analyzing ${Math.min(files.length, maxFiles)} files...`);

    const startTime = Date.now();
    
    const analysis = {
      files: [],
      summary: {
        totalFiles: files.length,
        analyzedFiles: 0,
        totalLines: 0,
        frameworks: new Set(),
        libraries: new Set(),
        databases: new Set(),
        patterns: new Set(),
        apis: new Set()
      },
      security: {
        critical: [],
        high: [],
        medium: [],
        low: []
      },
      definitions: {
        functions: [],
        classes: [],
        exports: []
      }
    };

    // Analyze files in parallel (batches of 5)
    const batchSize = 5;
    const filesToAnalyze = files.slice(0, maxFiles);
    
    for (let i = 0; i < filesToAnalyze.length; i += batchSize) {
      const batch = filesToAnalyze.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(file => this.analyzeFile(owner, repo, file, token))
      );

      batchResults.forEach(result => {
        if (result) {
          analysis.files.push(result);
          analysis.summary.analyzedFiles++;
          analysis.summary.totalLines += result.lines;

          // Aggregate patterns
          result.patterns.frameworks.forEach(f => analysis.summary.frameworks.add(f));
          result.patterns.libraries.forEach(l => analysis.summary.libraries.add(l));
          result.patterns.databases.forEach(d => analysis.summary.databases.add(d));
          result.patterns.patterns.forEach(p => analysis.summary.patterns.add(p));
          result.patterns.apis.forEach(a => analysis.summary.apis.add(a));

          // Aggregate security issues
          result.security.forEach(issue => {
            analysis.security[issue.severity].push(issue);
          });

          // Aggregate definitions
          analysis.definitions.functions.push(...result.definitions.functions.map(f => ({
            ...f,
            file: result.path
          })));
          analysis.definitions.classes.push(...result.definitions.classes.map(c => ({
            ...c,
            file: result.path
          })));
          analysis.definitions.exports.push(...result.definitions.exports.map(e => ({
            ...e,
            file: result.path
          })));
        }
      });

      console.log(`✅ Analyzed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(filesToAnalyze.length / batchSize)}`);
    }

    // Convert Sets to Arrays
    analysis.summary.frameworks = Array.from(analysis.summary.frameworks);
    analysis.summary.libraries = Array.from(analysis.summary.libraries);
    analysis.summary.databases = Array.from(analysis.summary.databases);
    analysis.summary.patterns = Array.from(analysis.summary.patterns);
    analysis.summary.apis = Array.from(analysis.summary.apis);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✨ Repository analysis complete in ${duration}s`);
    console.log(`📊 Analyzed ${analysis.summary.analyzedFiles} files, ${analysis.summary.totalLines} lines`);
    console.log(`🔒 Found ${analysis.security.critical.length} critical, ${analysis.security.high.length} high security issues`);

    return analysis;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      fileCache: {
        size: this.fileCache.size,
        maxSize: this.maxCacheSize
      },
      analysisCache: {
        size: this.analysisCache.size,
        maxSize: this.maxCacheSize
      }
    };
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.fileCache.clear();
    this.analysisCache.clear();
    console.log('🗑️ All caches cleared');
  }
}

// Export singleton instance
export const codeAnalysisService = new CodeAnalysisService();
export default codeAnalysisService;

// Made with Bob
