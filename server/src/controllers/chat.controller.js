// ============================================
// CODEATLAS - Chat Controller
// ============================================

const prisma = require('../config/prisma');

/**
 * Send chat query
 */
exports.sendQuery = async (req, res, next) => {
  try {
    const { repoId, sessionId, message } = req.body;

    // TODO: Implement AI chat logic with DeepSeek
    const response = {
      message: 'AI response placeholder',
      timestamp: new Date().toISOString()
    };

    res.json({
      query: message,
      response: response.message,
      timestamp: response.timestamp
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get chat history
 */
exports.getChatHistory = async (req, res, next) => {
  try {
    const { repoId } = req.params;

    const sessions = await prisma.chatSession.findMany({
      where: { repositoryId: repoId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ sessions });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete chat session
 */
exports.deleteSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    await prisma.chatSession.delete({
      where: { id: sessionId }
    });

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new chat session
 */
exports.createSession = async (req, res, next) => {
  try {
    const { repoId, title } = req.body;

    const session = await prisma.chatSession.create({
      data: {
        repositoryId: repoId,
        title: title || 'New Chat',
        messages: []
      }
    });

    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
};

// Made with Bob
