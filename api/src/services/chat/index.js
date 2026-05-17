/**
 * Chat Service
 * 
 * Main chat service that combines:
 * - Conversation management
 * - AI orchestration
 * - Multi-turn conversations
 * - Context awareness
 * - Streaming support
 * 
 * Provides a complete conversational AI experience.
 */

import AIService from '../ai/index.js';
import ConversationManager from './conversationManager.js';

class ChatService {
  constructor() {
    this.ai = new AIService();
    this.conversations = new ConversationManager();
  }

  /**
   * Send message and get AI response
   * @param {string} sessionId - Session ID
   * @param {string} message - User message
   * @param {Object} options - Chat options
   * @returns {Promise<Object>} - Chat response
   */
  async sendMessage(sessionId, message, options = {}) {
    const {
      focusEntity = null,
      taskType = 'general',
      includeReasoning = false,
    } = options;

    try {
      // Get session
      const session = this.conversations.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      console.log(`Processing message in session: ${sessionId}`);

      // Add user message to history
      this.conversations.addMessage(sessionId, {
        role: 'user',
        content: message,
        focusEntity,
      });

      // Get conversation history
      const history = this.conversations.getFormattedHistory(sessionId, 5);

      // Get session context
      const sessionContext = this.conversations.getContext(sessionId);

      // Determine focus entity (from message or session context)
      const effectiveFocusEntity = focusEntity || sessionContext.focusEntity;

      // Generate AI response
      const aiResponse = await this.ai.generateResponse(
        session.repoId,
        message,
        {
          conversationHistory: history,
          focusEntity: effectiveFocusEntity,
          taskType,
          includeReasoning,
        }
      );

      // Add AI response to history
      this.conversations.addMessage(sessionId, {
        role: 'assistant',
        content: aiResponse.response,
        reasoning: aiResponse.reasoning,
        context: aiResponse.context,
      });

      // Update session context
      if (aiResponse.context?.graphContext?.focusEntity) {
        this.conversations.updateSessionContext(sessionId, {
          focusEntity: aiResponse.context.graphContext.focusEntity,
        });
      }

      return {
        sessionId,
        message: aiResponse.response,
        reasoning: includeReasoning ? aiResponse.reasoning : null,
        context: aiResponse.context,
        metadata: {
          ...aiResponse.metadata,
          messageCount: session.messages.length + 2, // +2 for current exchange
        },
      };
    } catch (error) {
      console.error('Send message failed:', error);
      throw error;
    }
  }

  /**
   * Send message with streaming response
   * @param {string} sessionId - Session ID
   * @param {string} message - User message
   * @param {Object} options - Chat options
   * @returns {AsyncGenerator} - Streaming response
   */
  async *sendMessageStream(sessionId, message, options = {}) {
    const {
      focusEntity = null,
      taskType = 'general',
    } = options;

    try {
      // Get session
      const session = this.conversations.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Add user message
      this.conversations.addMessage(sessionId, {
        role: 'user',
        content: message,
        focusEntity,
      });

      // Get history and context
      const history = this.conversations.getFormattedHistory(sessionId, 5);
      const sessionContext = this.conversations.getContext(sessionId);
      const effectiveFocusEntity = focusEntity || sessionContext.focusEntity;

      // Stream AI response
      const stream = this.ai.generateStreamingResponse(
        session.repoId,
        message,
        {
          conversationHistory: history,
          focusEntity: effectiveFocusEntity,
          taskType,
        }
      );

      let fullResponse = '';

      for await (const chunk of stream) {
        if (chunk.type === 'ai_chunk' && chunk.data.type === 'chunk') {
          fullResponse += chunk.data.content;
        }

        yield chunk;
      }

      // Add complete response to history
      this.conversations.addMessage(sessionId, {
        role: 'assistant',
        content: fullResponse,
      });
    } catch (error) {
      yield {
        type: 'error',
        data: {
          message: error.message,
        },
      };
    }
  }

  /**
   * Create new chat session
   * @param {string} repoId - Repository ID
   * @param {Object} metadata - Session metadata
   * @returns {Object} - Session info
   */
  createSession(repoId, metadata = {}) {
    return this.conversations.createSession(repoId, metadata);
  }

  /**
   * Get session information
   * @param {string} sessionId - Session ID
   * @returns {Object|null} - Session info
   */
  getSession(sessionId) {
    const session = this.conversations.getSession(sessionId);

    if (!session) {
      return null;
    }

    return {
      id: session.id,
      repoId: session.repoId,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      messageCount: session.messages.length,
      context: session.context,
    };
  }

  /**
   * Get chat history
   * @param {string} sessionId - Session ID
   * @param {number} limit - Max messages
   * @returns {Object[]} - Message history
   */
  getHistory(sessionId, limit = 20) {
    return this.conversations.getHistory(sessionId, limit);
  }

  /**
   * Clear chat history
   * @param {string} sessionId - Session ID
   * @returns {boolean} - Success status
   */
  clearHistory(sessionId) {
    return this.conversations.clearHistory(sessionId);
  }

  /**
   * Delete session
   * @param {string} sessionId - Session ID
   * @returns {boolean} - Success status
   */
  deleteSession(sessionId) {
    return this.conversations.deleteSession(sessionId);
  }

  /**
   * Get all sessions for a repository
   * @param {string} repoId - Repository ID
   * @returns {Object[]} - Sessions
   */
  getRepoSessions(repoId) {
    return this.conversations.getRepoSessions(repoId);
  }

  /**
   * Quick ask (single question without session)
   * @param {string} repoId - Repository ID
   * @param {string} question - Question
   * @param {Object} options - Options
   * @returns {Promise<Object>} - Response
   */
  async quickAsk(repoId, question, options = {}) {
    try {
      // Create temporary session
      const session = this.createSession(repoId, {
        temporary: true,
      });

      // Send message
      const response = await this.sendMessage(session.sessionId, question, options);

      // Delete temporary session
      this.deleteSession(session.sessionId);

      return {
        question,
        answer: response.message,
        context: response.context,
        metadata: response.metadata,
      };
    } catch (error) {
      console.error('Quick ask failed:', error);
      throw error;
    }
  }

  /**
   * Explain code entity in chat
   * @param {string} sessionId - Session ID
   * @param {string} entityId - Entity ID
   * @returns {Promise<Object>} - Explanation
   */
  async explainEntity(sessionId, entityId) {
    const message = `Explain this code entity: ${entityId}`;

    return this.sendMessage(sessionId, message, {
      focusEntity: entityId,
      taskType: 'definition',
    });
  }

  /**
   * Debug assistance in chat
   * @param {string} sessionId - Session ID
   * @param {string} issue - Issue description
   * @param {string} entityId - Related entity (optional)
   * @returns {Promise<Object>} - Debug suggestions
   */
  async debugAssist(sessionId, issue, entityId = null) {
    const message = `Help me debug: ${issue}`;

    return this.sendMessage(sessionId, message, {
      focusEntity: entityId,
      taskType: 'debug',
    });
  }

  /**
   * Analyze dependencies in chat
   * @param {string} sessionId - Session ID
   * @param {string} entityId - Entity ID
   * @returns {Promise<Object>} - Dependency analysis
   */
  async analyzeDependencies(sessionId, entityId) {
    const message = `Analyze the dependencies of: ${entityId}`;

    return this.sendMessage(sessionId, message, {
      focusEntity: entityId,
      taskType: 'dependency',
    });
  }

  /**
   * Get suggested follow-up questions
   * @param {string} sessionId - Session ID
   * @returns {string[]} - Suggested questions
   */
  getSuggestedQuestions(sessionId) {
    const session = this.conversations.getSession(sessionId);

    if (!session) {
      return [];
    }

    const context = session.context;
    const suggestions = [];

    // Based on focus entity
    if (context.focusEntity) {
      suggestions.push(
        `How is ${context.focusEntity} used in the codebase?`,
        `What depends on ${context.focusEntity}?`,
        `Show me examples of ${context.focusEntity}`
      );
    }

    // Based on recent topics
    if (context.topics.length > 0) {
      const topic = context.topics[context.topics.length - 1];
      suggestions.push(
        `Tell me more about ${topic}`,
        `What are the best practices for ${topic}?`
      );
    }

    // Generic suggestions
    suggestions.push(
      'Explain the overall architecture',
      'What are the main components?',
      'Show me the entry points'
    );

    return suggestions.slice(0, 5);
  }

  /**
   * Export chat history
   * @param {string} sessionId - Session ID
   * @param {string} format - Export format (json, markdown)
   * @returns {string} - Exported content
   */
  exportHistory(sessionId, format = 'json') {
    const history = this.getHistory(sessionId);

    if (format === 'markdown') {
      return this.exportAsMarkdown(history);
    }

    return JSON.stringify(history, null, 2);
  }

  /**
   * Export history as markdown
   * @param {Object[]} history - Message history
   * @returns {string} - Markdown content
   */
  exportAsMarkdown(history) {
    const lines = ['# Chat History\n'];

    history.forEach((message, index) => {
      const role = message.role === 'user' ? '**User**' : '**Assistant**';
      lines.push(`## Message ${index + 1}`);
      lines.push(`${role}: ${message.content}\n`);
    });

    return lines.join('\n');
  }

  /**
   * Get chat statistics
   * @returns {Object} - Statistics
   */
  getStats() {
    return this.conversations.getStats();
  }

  /**
   * Cleanup expired sessions
   * @returns {number} - Number cleaned
   */
  cleanup() {
    return this.conversations.cleanupExpiredSessions();
  }

  /**
   * Health check
   * @returns {Promise<Object>} - Health status
   */
  async healthCheck() {
    const aiHealth = await this.ai.healthCheck();
    const chatStats = this.getStats();

    return {
      status: aiHealth.status,
      services: {
        ...aiHealth.services,
        chat: true,
      },
      stats: chatStats,
      timestamp: new Date().toISOString(),
    };
  }
}

export default ChatService;

// Made with Bob
