/**
 * Prompt Builder Service
 * 
 * Constructs structured prompts for DeepSeek-R1 with:
 * - System instructions
 * - Repository context
 * - Graph context
 * - Retrieved code context
 * - User query
 * - Output formatting
 * 
 * Ensures prompts are well-structured and context-rich.
 */

class PromptBuilder {
  constructor() {
    this.maxContextLength = 8000; // Characters
    this.maxCodeSnippets = 10;
  }

  /**
   * Build complete prompt for code understanding
   * @param {Object} params - Prompt parameters
   * @returns {string} - Formatted prompt
   */
  buildPrompt(params) {
    const {
      query,
      repoContext = {},
      graphContext = {},
      retrievedContext = [],
      conversationHistory = [],
      taskType = 'general',
    } = params;

    const sections = [];

    // System prompt
    sections.push(this.buildSystemPrompt(taskType));

    // Repository context
    if (repoContext && Object.keys(repoContext).length > 0) {
      sections.push(this.buildRepoContext(repoContext));
    }

    // Graph context
    if (graphContext && Object.keys(graphContext).length > 0) {
      sections.push(this.buildGraphContext(graphContext));
    }

    // Retrieved code context
    if (retrievedContext && retrievedContext.length > 0) {
      sections.push(this.buildCodeContext(retrievedContext));
    }

    // Conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      sections.push(this.buildConversationHistory(conversationHistory));
    }

    // User query
    sections.push(this.buildUserQuery(query));

    // Output instructions
    sections.push(this.buildOutputInstructions(taskType));

    return sections.join('\n\n---\n\n');
  }

  /**
   * Build system prompt based on task type
   * @param {string} taskType - Task type
   * @returns {string} - System prompt
   */
  buildSystemPrompt(taskType) {
    const basePrompt = `You are CodeAtlas AI, an expert code analysis assistant specialized in understanding and explaining codebases.

Your capabilities:
- Deep code understanding and analysis
- Dependency and architecture reasoning
- Graph-aware context interpretation
- Precise technical explanations
- Actionable recommendations

Your responses should be:
- Accurate and technically precise
- Well-structured and clear
- Grounded in the provided code context
- Helpful for developers`;

    const taskSpecific = {
      general: '',
      debug: '\n\nFocus on identifying issues, root causes, and suggesting fixes.',
      architecture: '\n\nFocus on system design, patterns, and architectural decisions.',
      dependency: '\n\nFocus on dependency relationships, impact analysis, and coupling.',
      implementation: '\n\nFocus on implementation details, best practices, and code quality.',
      onboarding: '\n\nFocus on explaining concepts clearly for developers new to the codebase.',
    };

    return `# System Instructions\n\n${basePrompt}${taskSpecific[taskType] || ''}`;
  }

  /**
   * Build repository context section
   * @param {Object} repoContext - Repository metadata
   * @returns {string} - Formatted context
   */
  buildRepoContext(repoContext) {
    const parts = ['# Repository Context'];

    if (repoContext.name) {
      parts.push(`**Repository:** ${repoContext.name}`);
    }

    if (repoContext.description) {
      parts.push(`**Description:** ${repoContext.description}`);
    }

    if (repoContext.language) {
      parts.push(`**Primary Language:** ${repoContext.language}`);
    }

    if (repoContext.fileCount) {
      parts.push(`**Files:** ${repoContext.fileCount}`);
    }

    if (repoContext.architecture) {
      parts.push(`**Architecture:** ${repoContext.architecture}`);
    }

    if (repoContext.techStack && repoContext.techStack.length > 0) {
      parts.push(`**Tech Stack:** ${repoContext.techStack.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Build graph context section
   * @param {Object} graphContext - Graph relationships
   * @returns {string} - Formatted context
   */
  buildGraphContext(graphContext) {
    const parts = ['# Graph Context'];

    if (graphContext.focusEntity) {
      parts.push(`**Focus Entity:** ${graphContext.focusEntity}`);
    }

    if (graphContext.dependencies && graphContext.dependencies.length > 0) {
      parts.push('\n**Dependencies:**');
      graphContext.dependencies.slice(0, 10).forEach(dep => {
        parts.push(`- ${dep.source} → ${dep.target} (${dep.type})`);
      });
    }

    if (graphContext.dependents && graphContext.dependents.length > 0) {
      parts.push('\n**Dependents:**');
      graphContext.dependents.slice(0, 10).forEach(dep => {
        parts.push(`- ${dep.source} ← ${dep.target} (${dep.type})`);
      });
    }

    if (graphContext.neighbors && graphContext.neighbors.length > 0) {
      parts.push(`\n**Related Entities:** ${graphContext.neighbors.length} entities within 2 hops`);
    }

    if (graphContext.circularDependencies && graphContext.circularDependencies.length > 0) {
      parts.push(`\n⚠️ **Circular Dependencies Detected:** ${graphContext.circularDependencies.length}`);
    }

    return parts.join('\n');
  }

  /**
   * Build code context section from retrieved results
   * @param {Object[]} retrievedContext - Retrieved code snippets
   * @returns {string} - Formatted context
   */
  buildCodeContext(retrievedContext) {
    const parts = ['# Retrieved Code Context'];

    // Limit number of snippets
    const snippets = retrievedContext.slice(0, this.maxCodeSnippets);

    parts.push(`Found ${snippets.length} relevant code snippets:\n`);

    snippets.forEach((snippet, index) => {
      const header = [
        `## Snippet ${index + 1}`,
        `**Type:** ${snippet.type}`,
        `**File:** ${snippet.filePath}`,
      ];

      if (snippet.name) {
        header.push(`**Name:** ${snippet.name}`);
      }

      if (snippet.startLine) {
        header.push(`**Lines:** ${snippet.startLine}-${snippet.endLine}`);
      }

      if (snippet.score) {
        header.push(`**Relevance:** ${(snippet.score * 100).toFixed(1)}%`);
      }

      parts.push(header.join('\n'));

      // Add code content
      if (snippet.content) {
        const truncated = this.truncateCode(snippet.content, 500);
        parts.push(`\n\`\`\`${this.detectLanguage(snippet.filePath)}\n${truncated}\n\`\`\``);
      }

      parts.push(''); // Empty line between snippets
    });

    return parts.join('\n');
  }

  /**
   * Build conversation history section
   * @param {Object[]} history - Conversation history
   * @returns {string} - Formatted history
   */
  buildConversationHistory(history) {
    const parts = ['# Conversation History'];

    // Limit to last 5 exchanges
    const recent = history.slice(-5);

    recent.forEach((exchange, index) => {
      parts.push(`\n**Turn ${index + 1}:**`);
      parts.push(`User: ${exchange.query}`);
      if (exchange.response) {
        parts.push(`Assistant: ${this.truncateText(exchange.response, 200)}`);
      }
    });

    return parts.join('\n');
  }

  /**
   * Build user query section
   * @param {string} query - User query
   * @returns {string} - Formatted query
   */
  buildUserQuery(query) {
    return `# User Query\n\n${query}`;
  }

  /**
   * Build output instructions
   * @param {string} taskType - Task type
   * @returns {string} - Output instructions
   */
  buildOutputInstructions(taskType) {
    const baseInstructions = `# Output Instructions

Provide a clear, well-structured response that:
1. Directly addresses the user's query
2. References specific code snippets when relevant
3. Explains technical concepts clearly
4. Provides actionable insights
5. Uses markdown formatting for readability`;

    const taskSpecific = {
      debug: '\n6. Identifies root causes and suggests specific fixes',
      architecture: '\n6. Explains design patterns and architectural decisions',
      dependency: '\n6. Analyzes impact and suggests improvements',
      implementation: '\n6. Provides code examples and best practices',
      onboarding: '\n6. Explains concepts step-by-step for newcomers',
    };

    return baseInstructions + (taskSpecific[taskType] || '');
  }

  /**
   * Truncate code to max length
   * @param {string} code - Code content
   * @param {number} maxLength - Max length
   * @returns {string} - Truncated code
   */
  truncateCode(code, maxLength) {
    if (code.length <= maxLength) {
      return code;
    }

    return code.substring(0, maxLength) + '\n// ... (truncated)';
  }

  /**
   * Truncate text to max length
   * @param {string} text - Text content
   * @param {number} maxLength - Max length
   * @returns {string} - Truncated text
   */
  truncateText(text, maxLength) {
    if (text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength) + '...';
  }

  /**
   * Detect language from file path
   * @param {string} filePath - File path
   * @returns {string} - Language identifier
   */
  detectLanguage(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();

    const languageMap = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      rs: 'rust',
      rb: 'ruby',
      php: 'php',
      cs: 'csharp',
      swift: 'swift',
      kt: 'kotlin',
    };

    return languageMap[ext] || 'text';
  }

  /**
   * Calculate prompt token estimate
   * @param {string} prompt - Prompt text
   * @returns {number} - Estimated tokens
   */
  estimateTokens(prompt) {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(prompt.length / 4);
  }

  /**
   * Validate prompt length
   * @param {string} prompt - Prompt text
   * @param {number} maxTokens - Max tokens allowed
   * @returns {boolean} - Is valid
   */
  validatePromptLength(prompt, maxTokens = 8000) {
    const estimated = this.estimateTokens(prompt);
    return estimated <= maxTokens;
  }
}

export default PromptBuilder;

// Made with Bob
