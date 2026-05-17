/**
 * Chat Controller
 * 
 * Handles chat and AI conversation requests.
 */

import ChatService from '../services/chat/index.js';
import DatabaseService from '../services/database/index.js';

const chatService = new ChatService();
const db = new DatabaseService();

/**
 * Create chat session
 * POST /api/chat/session
 */
export async function createChatSession(req, res) {
  try {
    const { repositoryId, title } = req.body;

    if (!repositoryId) {
      return res.status(400).json({ error: 'Repository ID is required' });
    }

    // Verify repository exists
    const repository = await db.getRepository(repositoryId);
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Create session in memory
    const session = chatService.createSession(repositoryId, { title });

    // Save to database
    const dbSession = await db.createChatSession({
      id: session.sessionId,
      repositoryId,
      title: title || `Chat ${new Date().toLocaleDateString()}`,
    });

    res.json({
      sessionId: dbSession.id,
      repositoryId: dbSession.repositoryId,
      title: dbSession.title,
      createdAt: dbSession.createdAt,
    });
  } catch (error) {
    console.error('Create chat session error:', error);
    res.status(500).json({
      error: 'Failed to create chat session',
      message: error.message,
    });
  }
}

/**
 * Send message
 * POST /api/chat/message
 */
export async function sendMessage(req, res) {
  try {
    const { sessionId, message, focusEntity, taskType } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        error: 'Session ID and message are required',
      });
    }

    // Send message and get response
    const response = await chatService.sendMessage(sessionId, message, {
      focusEntity,
      taskType: taskType || 'general',
      includeReasoning: false,
    });

    // Save messages to database
    await db.createChatMessage({
      sessionId,
      role: 'user',
      content: message,
      focusEntity,
    });

    await db.createChatMessage({
      sessionId,
      role: 'assistant',
      content: response.message,
      reasoning: response.reasoning,
      metadata: response.context,
    });

    res.json({
      sessionId: response.sessionId,
      message: response.message,
      context: response.context,
      metadata: response.metadata,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      error: 'Failed to send message',
      message: error.message,
    });
  }
}

/**
 * Send message with streaming
 * POST /api/chat/message/stream
 */
export async function sendMessageStream(req, res) {
  try {
    const { sessionId, message, focusEntity, taskType } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        error: 'Session ID and message are required',
      });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream response
    const stream = chatService.sendMessageStream(sessionId, message, {
      focusEntity,
      taskType: taskType || 'general',
    });

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error('Send message stream error:', error);
    res.status(500).json({
      error: 'Failed to stream message',
      message: error.message,
    });
  }
}

/**
 * Get chat history
 * GET /api/chat/history/:sessionId
 */
export async function getChatHistory(req, res) {
  try {
    const { sessionId } = req.params;
    const { limit = 20 } = req.query;

    const messages = await db.getChatMessages(sessionId, parseInt(limit));

    res.json({
      sessionId,
      messages: messages.reverse(), // Reverse to chronological order
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      error: 'Failed to get chat history',
      message: error.message,
    });
  }
}

/**
 * Get session info
 * GET /api/chat/session/:sessionId
 */
export async function getChatSession(req, res) {
  try {
    const { sessionId } = req.params;

    const session = await db.getChatSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: session.id,
      repositoryId: session.repositoryId,
      title: session.title,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      messageCount: session.messages.length,
    });
  } catch (error) {
    console.error('Get chat session error:', error);
    res.status(500).json({
      error: 'Failed to get chat session',
      message: error.message,
    });
  }
}

/**
 * Quick ask (single question without session)
 * POST /api/chat/quick-ask
 */
export async function quickAsk(req, res) {
  try {
    const { repositoryId, question, focusEntity } = req.body;

    if (!repositoryId || !question) {
      return res.status(400).json({
        error: 'Repository ID and question are required',
      });
    }

    const response = await chatService.quickAsk(repositoryId, question, {
      focusEntity,
    });

    res.json({
      question: response.question,
      answer: response.answer,
      context: response.context,
    });
  } catch (error) {
    console.error('Quick ask error:', error);
    res.status(500).json({
      error: 'Failed to process question',
      message: error.message,
    });
  }
}

/**
 * Get suggested questions
 * GET /api/chat/suggestions/:sessionId
 */
export async function getSuggestedQuestions(req, res) {
  try {
    const { sessionId } = req.params;

    const suggestions = chatService.getSuggestedQuestions(sessionId);

    res.json({
      sessionId,
      suggestions,
    });
  } catch (error) {
    console.error('Get suggested questions error:', error);
    res.status(500).json({
      error: 'Failed to get suggestions',
      message: error.message,
    });
  }
}

/**
 * Clear chat history
 * DELETE /api/chat/history/:sessionId
 */
export async function clearChatHistory(req, res) {
  try {
    const { sessionId } = req.params;

    chatService.clearHistory(sessionId);

    res.json({
      message: 'Chat history cleared successfully',
    });
  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({
      error: 'Failed to clear chat history',
      message: error.message,
    });
  }
}

// Made with Bob
