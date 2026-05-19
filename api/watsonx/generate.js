// Vercel Serverless Function for AI Generation
// This proxies AI API calls using Groq/Gemini providers
// Handles provider selection and fallback logic

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
    const { prompt, options = {} } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
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

    console.log('Generating text with AI provider...');

    // Get AI service
    const service = await getAIService();

    // Map options to AI service format
    const aiOptions = {
      temperature: options.temperature || 0.7,
      maxTokens: options.maxNewTokens || 200,
      topP: options.topP || 0.9,
    };

    // Generate text using AI service
    const text = await service.generateText(prompt, aiOptions);

    console.log('✓ Text generated successfully');

    return res.status(200).json({
      success: true,
      text: text,
      provider: process.env.DEFAULT_AI_PROVIDER || 'groq',
    });

  } catch (error) {
    console.error('AI generation error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

// Made with Bob
