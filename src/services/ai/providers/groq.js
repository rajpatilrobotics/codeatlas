/**
 * Groq AI Provider
 * Uses Groq API with llama-3.3-70b-versatile model
 * OpenAI-compatible API
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Generate text using Groq API
 */
export async function generateText(prompt, options = {}) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  try {
    const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        top_p: options.topP || 0.9,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    }

    throw new Error('No response from Groq API');
  } catch (error) {
    console.error('Groq API error:', error);
    throw error;
  }
}

/**
 * Generate chat response using Groq API
 */
export async function generateChat(messages, options = {}) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  try {
    const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        top_p: options.topP || 0.9,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    }

    throw new Error('No response from Groq API');
  } catch (error) {
    console.error('Groq chat error:', error);
    throw error;
  }
}

/**
 * Generate structured JSON output using Groq API
 */
export async function generateStructuredJSON(prompt, schema, options = {}) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  try {
    const enhancedPrompt = `${prompt}\n\nPlease respond with valid JSON only. Do not include any other text.`;

    const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        temperature: options.temperature || 0.3, // Lower temperature for more deterministic JSON
        max_tokens: options.maxTokens || 4000,
        top_p: options.topP || 0.9,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
      const content = data.choices[0].message.content;
      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse JSON from Groq response:', parseError);
        throw new Error('Invalid JSON response from Groq API');
      }
    }

    throw new Error('No response from Groq API');
  } catch (error) {
    console.error('Groq structured JSON error:', error);
    throw error;
  }
}

export default {
  generateText,
  generateChat,
  generateStructuredJSON
};
