/**
 * AI Text Generation API
 * Serverless function for AI text generation using Groq/Gemini
 */

import { generateText } from '../../src/services/ai/aiService.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

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

    const result = await generateText(prompt, options);
    
    return res.status(200).json({ 
      success: true, 
      result 
    });
  } catch (error) {
    console.error('AI generation error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to generate AI content' 
    });
  }
}
