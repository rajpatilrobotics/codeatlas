// Vercel Serverless Function for Chat
// This handles chat interactions using Groq/Gemini AI providers

const fetch = require('node-fetch');

// Import AI service (using dynamic import for ES modules)
let aiService;

async function getAIService() {
  if (!aiService) {
    // Import the AI service
    const aiModule = await import('../../src/services/ai/aiService.js');
    aiService = aiModule.default;
  }
  return aiService;
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check if AI providers are configured
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GROQ_API_KEY && !GEMINI_API_KEY) {
      console.error('AI providers not configured');
      return res.status(500).json({ 
        error: 'AI providers not configured on server. Please add GROQ_API_KEY or GEMINI_API_KEY to environment variables.' 
      });
    }

    console.log('Processing chat message...');

    // Construct the full prompt with context
    let fullPrompt = message;
    if (context) {
      fullPrompt = `Context:\n${context}\n\nUser: ${message}\n\nAssistant:`;
    }

    // Get AI service
    const service = await getAIService();

    // Generate chat response using AI service
    const messages = [
      { role: 'user', content: fullPrompt }
    ];

    const response = await service.generateChat(messages, {
      temperature: 0.7,
      maxTokens: 500,
      topP: 0.9,
    });

    console.log('✓ Chat response generated');
    return res.status(200).json({
      success: true,
      response: response,
      provider: process.env.DEFAULT_AI_PROVIDER || 'groq',
    });

  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

// Made with Bob
