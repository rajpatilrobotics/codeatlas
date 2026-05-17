// ============================================
// CODEATLAS - Chat Service
// ============================================

const aiOrchestration = require('./aiOrchestration.service');
const prisma = require('../config/prisma');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

/**
 * Create new chat session
 */
async function createChatSession(repoId, userId = null) {
  try {
    logger.info(`Creating chat session for repo ${repoId}`);
    
    const session = await prisma.chatSession.create({
      data: {
        repositoryId: repoId,
        userId,
        title: 'New Chat',
        messages: []
      }
    });
    
    return session;
  } catch (error) {
    logger.error('Error creating chat session:', error);
    throw error;
  }
}

/**
 * Get chat session
 */
async function getChatSession(sessionId) {
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        repository: {
          select: {
            id: true,
            name: true,
            primaryLanguage: true
          }
        }
      }
    });
    
    if (!session) {
      throw new Error(`Chat session not found: ${sessionId}`);
    }
    
    return session;
  } catch (error) {
    logger.error('Error getting chat session:', error);
    throw error;
  }
}

/**
 * Get all chat sessions for a repository
 */
async function getChatSessions(repoId, limit = 20) {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { repositoryId: repoId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: true
      }
    });
    
    return sessions;
  } catch (error) {
    logger.error('Error getting chat sessions:', error);
    throw error;
  }
}

/**
 * Update chat session title
 */
async function updateChatTitle(sessionId, title) {
  try {
    const session = await prisma.chatSession.update({
      where: { id: sessionId },
      data: { title }
    });
    
    return session;
  } catch (error) {
    logger.error('Error updating chat title:', error);
    throw error;
  }
}

/**
 * Delete chat session
 */
async function deleteChatSession(sessionId) {
  try {
    await prisma.chatSession.delete({
      where: { id: sessionId }
    });
    
    return { success: true };
  } catch (error) {
    logger.error('Error deleting chat session:', error);
    throw error;
  }
}

/**
 * Add message to chat session
 */
async function addMessage(sessionId, role, content, metadata = {}) {
  try {
    const session = await getChatSession(sessionId);
    
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata
    };
    
    const updatedMessages = [...session.messages, newMessage];
    
    // Auto-generate title from first user message
    let title = session.title;
    if (title === 'New Chat' && role === 'user' && updatedMessages.length === 1) {
      title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
    }
    
    const updatedSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        messages: updatedMessages,
        title,
        updatedAt: new Date()
      }
    });
    
    return {
      message: newMessage,
      session: updatedSession
    };
  } catch (error) {
    logger.error('Error adding message:', error);
    throw error;
  }
}

/**
 * Get conversation history for context
 */
function getConversationHistory(messages, maxMessages = 10) {
  // Get last N messages for context
  const recentMessages = messages.slice(-maxMessages);
  
  return recentMessages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}

/**
 * Compress conversation history for long chats
 */
function compressConversationHistory(messages, maxTokens = 2000) {
  // Simple compression: keep first and last messages, summarize middle
  if (messages.length <= 6) {
    return messages;
  }
  
  const firstTwo = messages.slice(0, 2);
  const lastFour = messages.slice(-4);
  const middleCount = messages.length - 6;
  
  const compressed = [
    ...firstTwo,
    {
      role: 'system',
      content: `[${middleCount} messages summarized for context]`
    },
    ...lastFour
  ];
  
  return compressed;
}

/**
 * Send chat message and get AI response
 */
async function sendMessage(sessionId, userMessage, options = {}) {
  try {
    logger.info(`Processing chat message for session ${sessionId}`);
    
    const {
      includeGraph = true,
      includeEntities = true,
      streaming = false
    } = options;
    
    // Get session
    const session = await getChatSession(sessionId);
    
    // Add user message
    await addMessage(sessionId, 'user', userMessage);
    
    // Get conversation history
    const conversationHistory = getConversationHistory(session.messages);
    const compressedHistory = compressConversationHistory(conversationHistory);
    
    // Generate AI response
    const aiResponse = await aiOrchestration.generateResponse(
      session.repositoryId,
      userMessage,
      {
        conversationHistory: compressedHistory,
        includeGraph,
        includeEntities
      }
    );
    
    // Add assistant message
    const assistantMessage = await addMessage(
      sessionId,
      'assistant',
      aiResponse.response,
      {
        intent: aiResponse.intent,
        contextUsed: {
          filesReferenced: aiResponse.context.relevantCode?.length || 0,
          entitiesReferenced: aiResponse.context.entities?.length || 0,
          dependenciesReferenced: aiResponse.context.dependencies?.length || 0
        },
        tokensUsed: aiResponse.metadata.tokensUsed
      }
    );
    
    return {
      userMessage: {
        role: 'user',
        content: userMessage
      },
      assistantMessage: assistantMessage.message,
      context: aiResponse.context,
      metadata: aiResponse.metadata
    };
  } catch (error) {
    logger.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Send streaming chat message
 */
async function* sendStreamingMessage(sessionId, userMessage, options = {}) {
  try {
    logger.info(`Processing streaming chat message for session ${sessionId}`);
    
    const {
      includeGraph = true,
      includeEntities = true
    } = options;
    
    // Get session
    const session = await getChatSession(sessionId);
    
    // Add user message
    await addMessage(sessionId, 'user', userMessage);
    
    // Get conversation history
    const conversationHistory = getConversationHistory(session.messages);
    const compressedHistory = compressConversationHistory(conversationHistory);
    
    // Stream AI response
    let fullResponse = '';
    
    const stream = aiOrchestration.generateStreamingResponse(
      session.repositoryId,
      userMessage,
      {
        conversationHistory: compressedHistory,
        includeGraph,
        includeEntities
      }
    );
    
    for await (const chunk of stream) {
      fullResponse += chunk;
      yield chunk;
    }
    
    // Add complete assistant message
    await addMessage(sessionId, 'assistant', fullResponse);
    
  } catch (error) {
    logger.error('Error in streaming message:', error);
    throw error;
  }
}

/**
 * Quick actions for common queries
 */
async function executeQuickAction(sessionId, action, params = {}) {
  try {
    logger.info(`Executing quick action: ${action}`);
    
    const session = await getChatSession(sessionId);
    const repoId = session.repositoryId;
    
    let response;
    
    switch (action) {
      case 'explain_architecture':
        response = await aiOrchestration.generateArchitectureSummary(repoId);
        await addMessage(sessionId, 'assistant', response.summary, {
          action: 'explain_architecture'
        });
        break;
        
      case 'generate_onboarding':
        response = await aiOrchestration.generateOnboardingGuide(repoId);
        await addMessage(sessionId, 'assistant', response.guide, {
          action: 'generate_onboarding'
        });
        break;
        
      case 'explain_code':
        if (!params.filePath || !params.startLine || !params.endLine) {
          throw new Error('Missing required parameters for explain_code');
        }
        response = await aiOrchestration.explainCode(
          repoId,
          params.filePath,
          params.startLine,
          params.endLine
        );
        await addMessage(sessionId, 'assistant', response.explanation, {
          action: 'explain_code',
          filePath: params.filePath,
          lines: response.lines
        });
        break;
        
      case 'analyze_entity':
        if (!params.entityName) {
          throw new Error('Missing entityName parameter');
        }
        response = await aiOrchestration.analyzeEntity(repoId, params.entityName);
        await addMessage(sessionId, 'assistant', response.analysis, {
          action: 'analyze_entity',
          entityName: params.entityName
        });
        break;
        
      case 'analyze_blast_radius':
        if (!params.nodeId) {
          throw new Error('Missing nodeId parameter');
        }
        response = await aiOrchestration.analyzeBlastRadiusImpact(repoId, params.nodeId);
        await addMessage(sessionId, 'assistant', response.analysis, {
          action: 'analyze_blast_radius',
          nodeId: params.nodeId
        });
        break;
        
      case 'debug_help':
        if (!params.errorMessage) {
          throw new Error('Missing errorMessage parameter');
        }
        response = await aiOrchestration.provideDebugAssistance(
          repoId,
          params.errorMessage,
          params.stackTrace || ''
        );
        await addMessage(sessionId, 'assistant', response.assistance, {
          action: 'debug_help'
        });
        break;
        
      default:
        throw new Error(`Unknown quick action: ${action}`);
    }
    
    return response;
  } catch (error) {
    logger.error('Error executing quick action:', error);
    throw error;
  }
}

/**
 * Search chat history
 */
async function searchChatHistory(repoId, query, limit = 10) {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { repositoryId: repoId },
      orderBy: { updatedAt: 'desc' }
    });
    
    const results = [];
    
    for (const session of sessions) {
      for (const message of session.messages) {
        if (message.content.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            sessionId: session.id,
            sessionTitle: session.title,
            message,
            timestamp: message.timestamp
          });
          
          if (results.length >= limit) break;
        }
      }
      if (results.length >= limit) break;
    }
    
    return results;
  } catch (error) {
    logger.error('Error searching chat history:', error);
    throw error;
  }
}

/**
 * Get chat statistics
 */
async function getChatStatistics(repoId) {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { repositoryId: repoId },
      select: {
        messages: true,
        createdAt: true
      }
    });
    
    const totalSessions = sessions.length;
    const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0);
    const avgMessagesPerSession = totalSessions > 0 ? totalMessages / totalSessions : 0;
    
    // Count by intent (from metadata)
    const intentCounts = {};
    sessions.forEach(session => {
      session.messages.forEach(msg => {
        if (msg.metadata?.intent) {
          intentCounts[msg.metadata.intent] = (intentCounts[msg.metadata.intent] || 0) + 1;
        }
      });
    });
    
    return {
      totalSessions,
      totalMessages,
      avgMessagesPerSession: Math.round(avgMessagesPerSession * 100) / 100,
      intentDistribution: intentCounts,
      mostRecentSession: sessions[0]?.createdAt || null
    };
  } catch (error) {
    logger.error('Error getting chat statistics:', error);
    throw error;
  }
}

module.exports = {
  createChatSession,
  getChatSession,
  getChatSessions,
  updateChatTitle,
  deleteChatSession,
  addMessage,
  sendMessage,
  sendStreamingMessage,
  executeQuickAction,
  searchChatHistory,
  getChatStatistics,
  getConversationHistory,
  compressConversationHistory
};

// Made with Bob
