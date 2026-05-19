/**
 * Unified AI Service
 * Main service that routes AI requests to appropriate providers
 * with fallback support
 */

import { getBestProvider, getAvailableProviders } from './router.js';
import * as groqProvider from './providers/groq.js';
import * as geminiProvider from './providers/gemini.js';

const providers = {
  groq: groqProvider,
  gemini: geminiProvider
};

/**
 * Generate text using the best available provider
 */
export async function generateText(prompt, options = {}) {
  const availableProviders = getAvailableProviders();
  
  if (availableProviders.length === 0) {
    throw new Error('No AI providers configured. Please set GROQ_API_KEY or GEMINI_API_KEY environment variables.');
  }

  let lastError;
  
  for (const providerName of availableProviders) {
    try {
      const provider = providers[providerName];
      if (!provider) {
        console.warn(`Provider ${providerName} not found, skipping`);
        continue;
      }
      
      console.log(`Using ${providerName} provider for text generation`);
      return await provider.generateText(prompt, options);
    } catch (error) {
      console.error(`${providerName} provider failed:`, error);
      lastError = error;
      // Continue to next provider
    }
  }

  throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Generate chat response using the best available provider
 */
export async function generateChat(messages, options = {}) {
  const availableProviders = getAvailableProviders();
  
  if (availableProviders.length === 0) {
    throw new Error('No AI providers configured. Please set GROQ_API_KEY or GEMINI_API_KEY environment variables.');
  }

  let lastError;
  
  for (const providerName of availableProviders) {
    try {
      const provider = providers[providerName];
      if (!provider) {
        console.warn(`Provider ${providerName} not found, skipping`);
        continue;
      }
      
      console.log(`Using ${providerName} provider for chat`);
      return await provider.generateChat(messages, options);
    } catch (error) {
      console.error(`${providerName} provider failed:`, error);
      lastError = error;
      // Continue to next provider
    }
  }

  throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Generate structured JSON output using the best available provider
 */
export async function generateStructuredJSON(prompt, schema, options = {}) {
  const availableProviders = getAvailableProviders();
  
  if (availableProviders.length === 0) {
    throw new Error('No AI providers configured. Please set GROQ_API_KEY or GEMINI_API_KEY environment variables.');
  }

  let lastError;
  
  for (const providerName of availableProviders) {
    try {
      const provider = providers[providerName];
      if (!provider) {
        console.warn(`Provider ${providerName} not found, skipping`);
        continue;
      }
      
      console.log(`Using ${providerName} provider for structured JSON`);
      return await provider.generateStructuredJSON(prompt, schema, options);
    } catch (error) {
      console.error(`${providerName} provider failed:`, error);
      lastError = error;
      // Continue to next provider
    }
  }

  throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Generate text using a specific provider
 */
export async function generateTextWithProvider(providerName, prompt, options = {}) {
  const provider = providers[providerName];
  
  if (!provider) {
    throw new Error(`Provider ${providerName} not found`);
  }

  return await provider.generateText(prompt, options);
}

/**
 * Generate chat response using a specific provider
 */
export async function generateChatWithProvider(providerName, messages, options = {}) {
  const provider = providers[providerName];
  
  if (!provider) {
    throw new Error(`Provider ${providerName} not found`);
  }

  return await provider.generateChat(messages, options);
}

/**
 * Generate structured JSON using a specific provider
 */
export async function generateStructuredJSONWithProvider(providerName, prompt, schema, options = {}) {
  const provider = providers[providerName];
  
  if (!provider) {
    throw new Error(`Provider ${providerName} not found`);
  }

  return await provider.generateStructuredJSON(prompt, schema, options);
}

export default {
  generateText,
  generateChat,
  generateStructuredJSON,
  generateTextWithProvider,
  generateChatWithProvider,
  generateStructuredJSONWithProvider
};
