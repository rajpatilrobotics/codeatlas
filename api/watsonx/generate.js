// Vercel Serverless Function for Watsonx AI
// This proxies IBM Watsonx AI API calls with server-side authentication
// Handles IAM token management and prevents API key exposure

const fetch = require('node-fetch');

// Token cache (in-memory for serverless)
let cachedToken = null;
let tokenExpiry = null;

/**
 * Get IBM IAM access token
 */
async function getAccessToken(apiKey) {
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
        apikey: apiKey,
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

    // Get environment variables
    const WATSONX_API_KEY = process.env.WATSONX_API_KEY;
    const WATSONX_PROJECT_ID = process.env.WATSONX_PROJECT_ID;
    const WATSONX_REGION_URL = process.env.WATSONX_REGION_URL || 'https://us-south.ml.cloud.ibm.com';
    const WATSONX_MODEL_ID = process.env.WATSONX_MODEL_ID || 'ibm/granite-13b-chat-v2';

    if (!WATSONX_API_KEY || !WATSONX_PROJECT_ID) {
      console.error('Watsonx credentials not configured');
      return res.status(500).json({ 
        error: 'Watsonx credentials not configured on server. Please add WATSONX_API_KEY and WATSONX_PROJECT_ID to environment variables.' 
      });
    }

    console.log('Generating text with Watsonx AI...');

    // Get access token
    const accessToken = await getAccessToken(WATSONX_API_KEY);

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
      model_id: WATSONX_MODEL_ID,
      project_id: WATSONX_PROJECT_ID,
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

    // Call Watsonx API
    const response = await fetch(
      `${WATSONX_REGION_URL}/ml/v1/text/generation?version=2023-05-29`,
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
      console.error('Watsonx API error:', errorText);
      
      if (response.status === 401) {
        // Token expired, clear cache
        cachedToken = null;
        tokenExpiry = null;
        return res.status(401).json({ error: 'Authentication token expired. Please retry.' });
      }
      
      return res.status(response.status).json({ 
        error: `Watsonx API error: ${errorText}` 
      });
    }

    const data = await response.json();

    // Extract generated text
    if (data.results && data.results.length > 0 && data.results[0].generated_text) {
      const generatedText = data.results[0].generated_text.trim();
      console.log('✓ Text generated successfully');
      
      return res.status(200).json({
        success: true,
        text: generatedText,
        model: WATSONX_MODEL_ID,
      });
    } else {
      return res.status(500).json({ error: 'No generated text in response' });
    }

  } catch (error) {
    console.error('Watsonx generation error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

// Made with Bob
