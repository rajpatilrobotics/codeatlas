// IBM watsonx.ai API Service
// This service calls our Express backend server which handles IBM IAM authentication
// and watsonx.ai API calls to avoid CORS issues

// Backend server URL (runs on port 5001)
const BACKEND_URL = 'http://localhost:5001';

/**
 * Generate text using IBM watsonx.ai Granite model
 * Calls the backend Express server which handles authentication and API calls
 * 
 * @param {string} prompt - The text prompt to send to the model
 * @param {Object} options - Optional generation parameters
 * @param {string} options.decodingMethod - Decoding method (default: 'greedy')
 * @param {number} options.maxNewTokens - Maximum tokens to generate (default: 200)
 * @param {number} options.minNewTokens - Minimum tokens to generate (default: 1)
 * @param {number} options.temperature - Sampling temperature (default: 0.7)
 * @param {number} options.topP - Top-p sampling (default: 1)
 * @param {number} options.topK - Top-k sampling (default: 50)
 * @returns {Promise<string>} Generated text response
 * @throws {Error} If text generation fails
 */
export async function generateText(prompt, options = {}) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Prompt must be a non-empty string');
  }

  console.log('Sending request to backend server...');

  try {
    const response = await fetch(`${BACKEND_URL}/api/watsonx/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        options,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.text) {
      console.log('✓ Text generated successfully');
      return data.text;
    } else {
      throw new Error('Invalid response from server');
    }

  } catch (error) {
    console.error('Text generation error:', error);

    if (error.message.includes('Failed to fetch')) {
      throw new Error(
        'Cannot connect to backend server. Make sure the server is running on port 5000.'
      );
    }

    throw error;
  }
}

/**
 * Check if the backend server is running and configured correctly
 * @returns {Promise<Object>} Server health status
 */
export async function checkServerHealth() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Server health check:', data);
    return data;
    
  } catch (error) {
    console.error('Health check failed:', error);
    throw new Error('Backend server is not running or not accessible');
  }
}

// Made with Bob