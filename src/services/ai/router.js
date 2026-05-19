/**
 * AI Provider Router
 * Handles provider selection and fallback logic
 */

const DEFAULT_PROVIDER = process.env.DEFAULT_AI_PROVIDER || 'groq';
const FALLBACK_PROVIDER = process.env.FALLBACK_AI_PROVIDER || 'gemini';

/**
 * Get the primary AI provider
 */
export function getPrimaryProvider() {
  return DEFAULT_PROVIDER;
}

/**
 * Get the fallback AI provider
 */
export function getFallbackProvider() {
  return FALLBACK_PROVIDER;
}

/**
 * Check if a provider is available (has API key configured)
 */
export function isProviderAvailable(provider) {
  const envVar = `${provider.toUpperCase()}_API_KEY`;
  return !!process.env[envVar];
}

/**
 * Get available providers in order of preference
 */
export function getAvailableProviders() {
  const providers = [];

  if (isProviderAvailable(DEFAULT_PROVIDER)) {
    providers.push(DEFAULT_PROVIDER);
  }

  if (isProviderAvailable(FALLBACK_PROVIDER) && FALLBACK_PROVIDER !== DEFAULT_PROVIDER) {
    providers.push(FALLBACK_PROVIDER);
  }

  return providers;
}

/**
 * Get the best available provider
 */
export function getBestProvider() {
  const available = getAvailableProviders();
  
  if (available.length === 0) {
    throw new Error('No AI providers configured. Please set GROQ_API_KEY or GEMINI_API_KEY environment variables.');
  }

  return available[0];
}

export default {
  getPrimaryProvider,
  getFallbackProvider,
  isProviderAvailable,
  getAvailableProviders,
  getBestProvider
};
