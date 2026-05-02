// Express backend server for watsonx.ai API proxy
// This server handles IBM IAM authentication and watsonx.ai API calls
// to avoid CORS issues in the browser

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 5001;

// Simple CORS middleware - allow everything
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Parse JSON bodies
app.use(express.json());

// Configuration from environment variables
const WATSONX_CONFIG = {
  apiKey: process.env.REACT_APP_WATSONX_API_KEY,
  projectId: process.env.REACT_APP_WATSONX_PROJECT_ID,
  regionUrl: process.env.REACT_APP_WATSONX_REGION_URL,
  modelId: process.env.REACT_APP_WATSONX_MODEL_ID,
};

// Token cache
let cachedToken = null;
let tokenExpiry = null;

/**
 * Get IBM IAM access token
 */
async function getAccessToken() {
  // Return cached token if still valid (with 5 minute buffer)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 300000) {
    console.log('Using cached IAM token');
    return cachedToken;
  }

  console.log('Fetching new IAM access token...');

  try {
    const response = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
        apikey: WATSONX_CONFIG.apiKey,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`IAM authentication failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new Error('No access token in IAM response');
    }

    // Cache the token
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);

    console.log('✓ IAM token obtained successfully');
    return cachedToken;

  } catch (error) {
    console.error('IAM authentication error:', error);
    cachedToken = null;
    tokenExpiry = null;
    throw error;
  }
}

/**
 * API endpoint to generate text using watsonx.ai
 */
app.post('/api/watsonx/generate', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('Generating text for prompt:', prompt.substring(0, 50) + '...');

    // Get access token
    const accessToken = await getAccessToken();

    // Prepare request body
    const requestBody = {
      input: prompt,
      parameters: {
        decoding_method: options.decodingMethod || 'greedy',
        max_new_tokens: options.maxNewTokens || 200,
        min_new_tokens: options.minNewTokens || 1,
        stop_sequences: options.stopSequences || [],
        repetition_penalty: options.repetitionPenalty || 1.0,
      },
      model_id: WATSONX_CONFIG.modelId,
      project_id: WATSONX_CONFIG.projectId,
    };

    // Add optional parameters
    if (options.temperature !== undefined) {
      requestBody.parameters.temperature = options.temperature;
    }
    if (options.topP !== undefined) {
      requestBody.parameters.top_p = options.topP;
    }
    if (options.topK !== undefined) {
      requestBody.parameters.top_k = options.topK;
    }

    // Call watsonx.ai API
    const response = await fetch(
      `${WATSONX_CONFIG.regionUrl}/ml/v1/text/generation?version=2023-05-29`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Watsonx.ai API error:', errorText);
      
      if (response.status === 401) {
        // Token expired, clear cache
        cachedToken = null;
        tokenExpiry = null;
        return res.status(401).json({ error: 'Authentication token expired' });
      }
      
      return res.status(response.status).json({ 
        error: `Watsonx.ai API error: ${errorText}` 
      });
    }

    const data = await response.json();

    // Extract generated text
    if (data.results && data.results.length > 0 && data.results[0].generated_text) {
      const generatedText = data.results[0].generated_text.trim();
      console.log('✓ Text generated successfully');
      
      return res.json({
        success: true,
        text: generatedText,
        model: WATSONX_CONFIG.modelId,
      });
    } else {
      return res.status(500).json({ error: 'No generated text in response' });
    }

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Watsonx.ai proxy server is running',
    config: {
      hasApiKey: !!WATSONX_CONFIG.apiKey,
      hasProjectId: !!WATSONX_CONFIG.projectId,
      regionUrl: WATSONX_CONFIG.regionUrl,
      modelId: WATSONX_CONFIG.modelId,
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Watsonx.ai proxy server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/watsonx/generate`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health\n`);
});

// Made with Bob
