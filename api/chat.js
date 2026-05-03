// Vercel Serverless Function for Chat
// This handles chat interactions using Watsonx AI

const fetch = require('node-fetch');

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

    console.log('Processing chat message...');

    // Construct the full prompt with context
    let fullPrompt = message;
    if (context) {
      fullPrompt = `Context:\n${context}\n\nUser: ${message}\n\nAssistant:`;
    }

    // Get the base URL for internal API call
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    // Call the watsonx generate endpoint
    const response = await fetch(`${baseUrl}/api/watsonx/generate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        options: {
          maxNewTokens: 500,
          temperature: 0.7,
          topP: 0.9,
          repetitionPenalty: 1.1,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Watsonx API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.text) {
      console.log('✓ Chat response generated');
      return res.status(200).json({
        success: true,
        response: data.text,
        model: data.model,
      });
    }

    throw new Error('Invalid response from Watsonx API');

  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

// Made with Bob
