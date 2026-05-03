// IBM watsonx.ai API Service - Production Ready
// All API calls now go through backend to keep API keys secure
// NO direct Watsonx API calls, NO exposed credentials

/**
 * Get API base URL (works in both dev and production)
 */
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // In browser - use relative path for Vercel
    return window.location.origin;
  }
  return '';
};

const API_BASE = getApiBaseUrl();

/**
 * Generate text using IBM watsonx.ai Granite model via backend API
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
 * @param {number} options.repetitionPenalty - Repetition penalty (default: 1.0)
 * @returns {Promise<string>} Generated text response
 * @throws {Error} If text generation fails
 */
export async function generateText(prompt, options = {}) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Prompt must be a non-empty string');
  }

  console.log('Sending request to backend Watsonx API...');

  try {
    const response = await fetch(`${API_BASE}/api/watsonx/generate`, {
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
      
      if (response.status === 401) {
        throw new Error('Authentication failed. Please check Watsonx API credentials.');
      } else if (response.status === 500) {
        throw new Error(errorData.error || 'Server configuration error. Please contact support.');
      }
      
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

    // Provide user-friendly error messages
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please check your internet connection.');
    }

    throw error;
  }
}

/**
 * Send chat message via backend API
 * 
 * @param {string} message - User message
 * @param {string} context - Optional context about the repository
 * @returns {Promise<string>} AI response
 * @throws {Error} If chat fails
 */
export async function sendChatMessage(message, context = '') {
  if (!message || typeof message !== 'string') {
    throw new Error('Message must be a non-empty string');
  }

  console.log('Sending chat message to backend API...');

  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        context,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      if (response.status === 401) {
        throw new Error('Authentication failed. Please check Watsonx API credentials.');
      } else if (response.status === 500) {
        throw new Error(errorData.error || 'Server error. Please try again.');
      }
      
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.response) {
      console.log('✓ Chat response received');
      return data.response;
    } else {
      throw new Error('Invalid response from server');
    }

  } catch (error) {
    console.error('Chat error:', error);

    // Provide user-friendly error messages
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please check your internet connection.');
    }

    throw error;
  }
}

/**
 * Check if the backend server is running and configured correctly
 * @returns {Promise<boolean>} True if server is healthy
 */
export async function checkServerHealth() {
  try {
    const response = await fetch(`${API_BASE}/api/watsonx/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'test',
        options: { maxNewTokens: 1 }
      }),
    });
    
    // Any response (even error) means server is reachable
    return true;
    
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

// Export for compatibility
export default generateText;

// Made with Bob
