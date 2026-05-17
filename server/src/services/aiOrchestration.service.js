// ============================================
// CODEATLAS - AI Orchestration Service
// ============================================

const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { RunnableSequence } = require('@langchain/core/runnables');
const retrievalService = require('./retrieval.service');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

// Initialize DeepSeek model via OpenAI-compatible API
const model = new ChatOpenAI({
  modelName: 'deepseek-reasoner',
  temperature: 0.7,
  maxTokens: 4000,
  openAIApiKey: process.env.DEEPSEEK_API_KEY,
  configuration: {
    baseURL: 'https://api.deepseek.com/v1'
  }
});

/**
 * System prompt for CodeAtlas AI
 */
const SYSTEM_PROMPT = `You are CodeAtlas AI, an intelligent code analysis assistant with deep understanding of software architecture, dependencies, and code relationships.

Your capabilities:
- Analyze code structure and architecture
- Explain dependencies and relationships
- Identify potential issues and improvements
- Provide debugging guidance
- Answer questions about codebases

Guidelines:
- Be precise and technical
- Reference specific files, functions, and lines when available
- Explain complex concepts clearly
- Provide actionable insights
- Use the provided context to ground your responses
- If information is not in the context, acknowledge limitations

Always structure your responses clearly with:
1. Direct answer to the question
2. Supporting evidence from the codebase
3. Additional context or recommendations if relevant`;

/**
 * Build prompt with context
 */
function buildPrompt(query, context, conversationHistory = []) {
  let prompt = `${SYSTEM_PROMPT}\n\n`;
  
  // Add repository context
  if (context.repository) {
    prompt += `## Repository Context\n`;
    prompt += `Repository: ${context.repository.name}\n`;
    prompt += `Primary Language: ${context.repository.primaryLanguage}\n`;
    if (context.repository.description) {
      prompt += `Description: ${context.repository.description}\n`;
    }
    prompt += `\n`;
  }
  
  // Add architecture context
  if (context.architecture) {
    prompt += `## Architecture Overview\n`;
    prompt += context.summary || '';
    prompt += `\n\n`;
  }
  
  // Add relevant code
  if (context.relevantCode && context.relevantCode.length > 0) {
    prompt += `## Relevant Code\n\n`;
    context.relevantCode.forEach((code, index) => {
      prompt += `### ${index + 1}. ${code.filePath}`;
      if (code.lines) {
        prompt += ` (lines ${code.lines})`;
      }
      prompt += `\n\`\`\`\n${code.content}\n\`\`\`\n\n`;
    });
  }
  
  // Add dependencies
  if (context.dependencies && context.dependencies.length > 0) {
    prompt += `## Dependencies\n`;
    context.dependencies.forEach(dep => {
      prompt += `- ${dep.path} (${dep.language}, ${dep.linesOfCode} LOC)\n`;
    });
    prompt += `\n`;
  }
  
  // Add entities
  if (context.entities && context.entities.length > 0) {
    prompt += `## Related Entities\n`;
    context.entities.forEach(entity => {
      prompt += `- ${entity.type}: ${entity.name} in ${entity.filePath} (lines ${entity.lines})\n`;
    });
    prompt += `\n`;
  }
  
  // Add conversation history
  if (conversationHistory.length > 0) {
    prompt += `## Conversation History\n`;
    conversationHistory.slice(-3).forEach(msg => {
      prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });
    prompt += `\n`;
  }
  
  // Add user query
  prompt += `## User Query\n${query}\n\n`;
  prompt += `## Response\nProvide a detailed, technical response based on the context above:`;
  
  return prompt;
}

/**
 * Generate AI response with graph-aware RAG
 */
async function generateResponse(repoId, query, options = {}) {
  try {
    const {
      conversationHistory = [],
      includeGraph = true,
      includeEntities = true
    } = options;
    
    logger.info(`Generating AI response for query: ${query.substring(0, 50)}...`);
    
    // Step 1: Detect query intent
    const intent = retrievalService.detectQueryIntent(query);
    logger.info(`Detected intent: ${intent}`);
    
    // Step 2: Retrieve relevant context
    const context = await retrievalService.smartRetrieval(repoId, query, intent);
    
    // Step 3: Build prompt
    const prompt = buildPrompt(query, context, conversationHistory);
    
    // Step 4: Generate response
    const response = await model.invoke(prompt);
    
    logger.info('AI response generated successfully');
    
    return {
      response: response.content,
      context,
      intent,
      metadata: {
        tokensUsed: response.response_metadata?.tokenUsage || null,
        model: 'deepseek-reasoner'
      }
    };
  } catch (error) {
    logger.error('Error generating AI response:', error);
    throw error;
  }
}

/**
 * Generate code explanation
 */
async function explainCode(repoId, filePath, startLine, endLine) {
  try {
    logger.info(`Explaining code: ${filePath} lines ${startLine}-${endLine}`);
    
    // Get file context
    const fileContext = await retrievalService.retrieveFileContext(repoId, filePath);
    
    // Extract specific code section
    const lines = fileContext.file.content.split('\n');
    const codeSection = lines.slice(startLine - 1, endLine).join('\n');
    
    const query = `Explain this code section from ${filePath}:\n\n\`\`\`\n${codeSection}\n\`\`\``;
    
    const prompt = buildPrompt(query, {
      file: fileContext.file,
      dependencies: fileContext.dependencies,
      entities: fileContext.entities
    });
    
    const response = await model.invoke(prompt);
    
    return {
      explanation: response.content,
      codeSection,
      filePath,
      lines: `${startLine}-${endLine}`
    };
  } catch (error) {
    logger.error('Error explaining code:', error);
    throw error;
  }
}

/**
 * Analyze function or class
 */
async function analyzeEntity(repoId, entityName) {
  try {
    logger.info(`Analyzing entity: ${entityName}`);
    
    const entityContext = await retrievalService.retrieveEntityContext(repoId, entityName);
    
    const query = `Analyze the ${entityContext.entity.type.toLowerCase()} "${entityName}" and explain:
1. Its purpose and functionality
2. Its dependencies and relationships
3. Potential issues or improvements
4. Usage patterns`;
    
    const prompt = buildPrompt(query, {
      entity: entityContext.entity,
      calls: entityContext.calls,
      calledBy: entityContext.calledBy
    });
    
    const response = await model.invoke(prompt);
    
    return {
      analysis: response.content,
      entity: entityContext.entity,
      relationships: {
        calls: entityContext.calls,
        calledBy: entityContext.calledBy
      }
    };
  } catch (error) {
    logger.error('Error analyzing entity:', error);
    throw error;
  }
}

/**
 * Generate architecture summary
 */
async function generateArchitectureSummary(repoId) {
  try {
    logger.info(`Generating architecture summary for repo ${repoId}`);
    
    const archContext = await retrievalService.retrieveArchitectureContext(repoId);
    
    const query = `Provide a comprehensive architecture summary of this repository, including:
1. Overall structure and organization
2. Key components and their roles
3. Technology stack and patterns used
4. Potential architectural concerns or improvements`;
    
    const prompt = buildPrompt(query, archContext);
    
    const response = await model.invoke(prompt);
    
    return {
      summary: response.content,
      architecture: archContext.architecture,
      repository: archContext.repository
    };
  } catch (error) {
    logger.error('Error generating architecture summary:', error);
    throw error;
  }
}

/**
 * Generate onboarding guide
 */
async function generateOnboardingGuide(repoId) {
  try {
    logger.info(`Generating onboarding guide for repo ${repoId}`);
    
    const archContext = await retrievalService.retrieveArchitectureContext(repoId);
    
    const query = `Create a comprehensive onboarding guide for new developers joining this project. Include:
1. Project overview and purpose
2. Key directories and files to understand first
3. Development setup and workflow
4. Important patterns and conventions
5. Where to start making changes`;
    
    const prompt = buildPrompt(query, archContext);
    
    const response = await model.invoke(prompt);
    
    return {
      guide: response.content,
      entryPoints: archContext.architecture.components.entryPoints,
      keyFiles: [
        ...archContext.architecture.components.services,
        ...archContext.architecture.components.routes
      ].slice(0, 10)
    };
  } catch (error) {
    logger.error('Error generating onboarding guide:', error);
    throw error;
  }
}

/**
 * Analyze blast radius impact
 */
async function analyzeBlastRadiusImpact(repoId, nodeId) {
  try {
    logger.info(`Analyzing blast radius impact for node ${nodeId}`);
    
    const graphEngine = require('./graphEngine.service');
    const blastRadius = await graphEngine.calculateBlastRadius(repoId, nodeId);
    
    const query = `Analyze the impact of changes to this component:

Target: ${blastRadius.targetNode.name || blastRadius.targetNode.path}
Type: ${blastRadius.targetNode.type}

Affected Components:
- Critical: ${blastRadius.summary.critical}
- High Risk: ${blastRadius.summary.high}
- Medium Risk: ${blastRadius.summary.medium}
- Low Risk: ${blastRadius.summary.low}

Provide:
1. Risk assessment
2. Testing recommendations
3. Deployment considerations
4. Potential side effects`;
    
    const prompt = buildPrompt(query, {
      blastRadius: blastRadius.summary,
      affectedNodes: blastRadius.affectedNodes.slice(0, 20)
    });
    
    const response = await model.invoke(prompt);
    
    return {
      analysis: response.content,
      blastRadius: blastRadius.summary,
      criticalNodes: blastRadius.riskGroups.critical,
      highRiskNodes: blastRadius.riskGroups.high
    };
  } catch (error) {
    logger.error('Error analyzing blast radius impact:', error);
    throw error;
  }
}

/**
 * Debug assistance
 */
async function provideDebugAssistance(repoId, errorMessage, stackTrace) {
  try {
    logger.info('Providing debug assistance');
    
    // Extract file paths from stack trace
    const filePathRegex = /[\w\/\-\.]+\.(js|ts|jsx|tsx|py|java)/g;
    const filePaths = [...new Set((stackTrace || '').match(filePathRegex) || [])];
    
    // Retrieve context for relevant files
    let context = { relevantCode: [] };
    
    if (filePaths.length > 0) {
      const retrievalQuery = `Error in files: ${filePaths.join(', ')}`;
      context = await retrievalService.hybridRetrieval(repoId, retrievalQuery, {
        limit: 5
      });
    }
    
    const query = `Help debug this error:

Error Message: ${errorMessage}

Stack Trace:
${stackTrace}

Provide:
1. Root cause analysis
2. Potential fixes
3. Related code that might be affected
4. Prevention strategies`;
    
    const prompt = buildPrompt(query, context);
    
    const response = await model.invoke(prompt);
    
    return {
      assistance: response.content,
      relevantFiles: filePaths,
      context: context.relevantCode
    };
  } catch (error) {
    logger.error('Error providing debug assistance:', error);
    throw error;
  }
}

/**
 * Streaming response (for real-time chat)
 */
async function* generateStreamingResponse(repoId, query, options = {}) {
  try {
    const {
      conversationHistory = [],
      includeGraph = true,
      includeEntities = true
    } = options;
    
    logger.info('Generating streaming response');
    
    // Retrieve context
    const intent = retrievalService.detectQueryIntent(query);
    const context = await retrievalService.smartRetrieval(repoId, query, intent);
    
    // Build prompt
    const prompt = buildPrompt(query, context, conversationHistory);
    
    // Stream response
    const stream = await model.stream(prompt);
    
    for await (const chunk of stream) {
      yield chunk.content;
    }
  } catch (error) {
    logger.error('Error in streaming response:', error);
    throw error;
  }
}

module.exports = {
  generateResponse,
  explainCode,
  analyzeEntity,
  generateArchitectureSummary,
  generateOnboardingGuide,
  analyzeBlastRadiusImpact,
  provideDebugAssistance,
  generateStreamingResponse,
  buildPrompt
};

// Made with Bob
