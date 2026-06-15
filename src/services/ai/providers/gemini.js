/**
 * Gemini AI Provider
 * Uses Google AI API with gemini-2.5-flash model
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * Generate text using Gemini API
 */
export async function generateText(prompt, options = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2000,
          topP: options.topP || 0.9,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
      return data.candidates[0].content.parts[0].text;
    }

    throw new Error('No response from Gemini API');
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

/**
 * Generate chat response using Gemini API
 */
export async function generateChat(messages, options = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    const systemInstruction = messages
      .filter(msg => msg.role === 'system' && msg.content)
      .map(msg => msg.content)
      .join('\n\n');

    const contents = messages
      .filter(msg => msg.role !== 'system' && msg.content)
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...(systemInstruction
          ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
          : {}),
        contents: contents,
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2000,
          topP: options.topP || 0.9,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
      return data.candidates[0].content.parts[0].text;
    }

    throw new Error('No response from Gemini API');
  } catch (error) {
    console.error('Gemini chat error:', error);
    throw error;
  }
}

/**
 * Generate structured JSON output using Gemini API
 */
export async function generateStructuredJSON(prompt, schema, options = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    const enhancedPrompt = `${prompt}\n\nPlease respond with valid JSON only. Do not include any other text. The JSON should follow this structure:\n${JSON.stringify(schema, null, 2)}`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: enhancedPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: options.temperature || 0.3, // Lower temperature for more deterministic JSON
          maxOutputTokens: options.maxTokens || 4000,
          topP: options.topP || 0.9,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
      const content = data.candidates[0].content.parts[0].text;
      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse JSON from Gemini response:', parseError);
        throw new Error('Invalid JSON response from Gemini API');
      }
    }

    throw new Error('No response from Gemini API');
  } catch (error) {
    console.error('Gemini structured JSON error:', error);
    throw error;
  }
}

export default {
  generateText,
  generateChat,
  generateStructuredJSON
};
