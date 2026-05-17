/**
 * Conversation Manager Service
 * 
 * Manages chat sessions, conversation history, and context.
 * Handles multi-turn conversations with memory.
 * 
 * Features:
 * - Session management
 * - Conversation history
 * - Context compression
 * - Memory management
 */

class ConversationManager {
  constructor() {
    // In-memory storage (TODO: Move to Redis/Database)
    this.sessions = new Map();
    this.maxHistoryLength = 20; // Max messages per session
    this.maxContextAge = 3600000; // 1 hour in milliseconds
  }

  /**
   * Create new conversation session
   * @param {string} repoId - Repository ID
   * @param {Object} metadata - Session metadata
   * @returns {Object} - Session info
   */
  createSession(repoId, metadata = {}) {
    const sessionId = this.generateSessionId();

    const session = {
      id: sessionId,
      repoId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      messages: [],
      context: {
        focusEntity: null,
        recentEntities: [],
        topics: [],
      },
      metadata,
    };

    this.sessions.set(sessionId, session);

    console.log(`Created session: ${sessionId} for repo: ${repoId}`);

    return {
      sessionId,
      repoId,
      createdAt: session.createdAt,
    };
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {Object|null} - Session or null
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if session expired
    const age = Date.now() - new Date(session.lastActivity).getTime();
    if (age > this.maxContextAge) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Add message to session
   * @param {string} sessionId - Session ID
   * @param {Object} message - Message object
   * @returns {boolean} - Success status
   */
  addMessage(sessionId, message) {
    const session = this.getSession(sessionId);

    if (!session) {
      console.error(`Session not found: ${sessionId}`);
      return false;
    }

    // Add message
    session.messages.push({
      ...message,
      timestamp: new Date().toISOString(),
    });

    // Update last activity
    session.lastActivity = new Date().toISOString();

    // Trim history if too long
    if (session.messages.length > this.maxHistoryLength) {
      session.messages = session.messages.slice(-this.maxHistoryLength);
    }

    // Update context
    this.updateContext(session, message);

    return true;
  }

  /**
   * Get conversation history
   * @param {string} sessionId - Session ID
   * @param {number} limit - Max messages to return
   * @returns {Object[]} - Message history
   */
  getHistory(sessionId, limit = 10) {
    const session = this.getSession(sessionId);

    if (!session) {
      return [];
    }

    return session.messages.slice(-limit);
  }

  /**
   * Get formatted history for AI
   * @param {string} sessionId - Session ID
   * @param {number} limit - Max exchanges
   * @returns {Object[]} - Formatted history
   */
  getFormattedHistory(sessionId, limit = 5) {
    const messages = this.getHistory(sessionId, limit * 2); // Get pairs

    const formatted = [];
    for (let i = 0; i < messages.length; i += 2) {
      const userMsg = messages[i];
      const aiMsg = messages[i + 1];

      if (userMsg && userMsg.role === 'user') {
        formatted.push({
          query: userMsg.content,
          response: aiMsg?.role === 'assistant' ? aiMsg.content : null,
        });
      }
    }

    return formatted;
  }

  /**
   * Update session context based on message
   * @param {Object} session - Session object
   * @param {Object} message - Message object
   */
  updateContext(session, message) {
    // Extract entities mentioned
    if (message.entities && message.entities.length > 0) {
      message.entities.forEach(entity => {
        if (!session.context.recentEntities.includes(entity)) {
          session.context.recentEntities.push(entity);
        }
      });

      // Keep only recent entities (last 10)
      session.context.recentEntities = session.context.recentEntities.slice(-10);
    }

    // Update focus entity
    if (message.focusEntity) {
      session.context.focusEntity = message.focusEntity;
    }

    // Extract topics (simple keyword extraction)
    if (message.content) {
      const topics = this.extractTopics(message.content);
      topics.forEach(topic => {
        if (!session.context.topics.includes(topic)) {
          session.context.topics.push(topic);
        }
      });

      // Keep only recent topics (last 5)
      session.context.topics = session.context.topics.slice(-5);
    }
  }

  /**
   * Extract topics from text
   * @param {string} text - Text content
   * @returns {string[]} - Extracted topics
   */
  extractTopics(text) {
    // Simple keyword extraction (can be improved with NLP)
    const keywords = [
      'authentication', 'authorization', 'database', 'api', 'frontend',
      'backend', 'testing', 'deployment', 'security', 'performance',
      'error', 'bug', 'feature', 'refactor', 'optimization',
    ];

    const topics = [];
    const lowerText = text.toLowerCase();

    keywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        topics.push(keyword);
      }
    });

    return topics;
  }

  /**
   * Get session context
   * @param {string} sessionId - Session ID
   * @returns {Object} - Session context
   */
  getContext(sessionId) {
    const session = this.getSession(sessionId);

    if (!session) {
      return null;
    }

    return session.context;
  }

  /**
   * Update session context
   * @param {string} sessionId - Session ID
   * @param {Object} context - Context updates
   * @returns {boolean} - Success status
   */
  updateSessionContext(sessionId, context) {
    const session = this.getSession(sessionId);

    if (!session) {
      return false;
    }

    session.context = {
      ...session.context,
      ...context,
    };

    return true;
  }

  /**
   * Clear session history
   * @param {string} sessionId - Session ID
   * @returns {boolean} - Success status
   */
  clearHistory(sessionId) {
    const session = this.getSession(sessionId);

    if (!session) {
      return false;
    }

    session.messages = [];
    session.context = {
      focusEntity: null,
      recentEntities: [],
      topics: [],
    };

    console.log(`Cleared history for session: ${sessionId}`);

    return true;
  }

  /**
   * Delete session
   * @param {string} sessionId - Session ID
   * @returns {boolean} - Success status
   */
  deleteSession(sessionId) {
    const deleted = this.sessions.delete(sessionId);

    if (deleted) {
      console.log(`Deleted session: ${sessionId}`);
    }

    return deleted;
  }

  /**
   * Get all sessions for a repository
   * @param {string} repoId - Repository ID
   * @returns {Object[]} - Sessions
   */
  getRepoSessions(repoId) {
    const sessions = [];

    this.sessions.forEach(session => {
      if (session.repoId === repoId) {
        sessions.push({
          id: session.id,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          messageCount: session.messages.length,
        });
      }
    });

    return sessions;
  }

  /**
   * Compress conversation history
   * Summarize old messages to save context
   * @param {string} sessionId - Session ID
   * @returns {Object} - Compressed history
   */
  compressHistory(sessionId) {
    const session = this.getSession(sessionId);

    if (!session || session.messages.length < 10) {
      return null;
    }

    // Keep recent messages, summarize old ones
    const recentMessages = session.messages.slice(-10);
    const oldMessages = session.messages.slice(0, -10);

    // Simple summarization (can be improved with AI)
    const summary = {
      messageCount: oldMessages.length,
      topics: [...new Set(oldMessages.flatMap(m => this.extractTopics(m.content || '')))],
      entities: [...new Set(oldMessages.flatMap(m => m.entities || []))],
    };

    return {
      summary,
      recentMessages,
    };
  }

  /**
   * Generate unique session ID
   * @returns {string} - Session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up expired sessions
   * @returns {number} - Number of sessions cleaned
   */
  cleanupExpiredSessions() {
    let cleaned = 0;
    const now = Date.now();

    this.sessions.forEach((session, sessionId) => {
      const age = now - new Date(session.lastActivity).getTime();
      if (age > this.maxContextAge) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired sessions`);
    }

    return cleaned;
  }

  /**
   * Get statistics
   * @returns {Object} - Statistics
   */
  getStats() {
    let totalMessages = 0;

    this.sessions.forEach(session => {
      totalMessages += session.messages.length;
    });

    return {
      activeSessions: this.sessions.size,
      totalMessages,
      avgMessagesPerSession: this.sessions.size > 0
        ? Math.round(totalMessages / this.sessions.size)
        : 0,
    };
  }
}

export default ConversationManager;

// Made with Bob
