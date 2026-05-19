// Text Formatting Utilities for Clean AI Output
// Ensures all AI responses are free from markdown formatting

// Global formatting rules to be prepended to all AI prompts
export const CLEAN_OUTPUT_RULES = `
STRICT OUTPUT RULES:
1. Do NOT use markdown formatting:
   - No bold (no **)
   - No italic (no *)
   - No backticks (no \`)
   - No hashtags (no #)
   - No markdown lists
2. Do NOT use special formatting symbols:
   - No asterisks (*)
   - No dashes used as separators (---)
   - No decorative characters
3. Write in clean, natural plain text:
   - Proper sentences
   - Simple formatting
   - Easy to read
4. Structure content clearly using:
   - Short paragraphs (2-3 lines max)
   - Simple bullet points using "•" only (optional)
   - Line breaks between sections
5. Keep tone professional and human-like:
   - Avoid "AI-style" wording
   - Avoid over-explaining
   - Be direct and clear
6. Keep responses concise:
   - No long paragraphs
   - No repetition
   - No filler words
7. If listing items:
   - Use simple bullet points or numbered steps
   - Keep each point short (1-2 lines)
8. For headings:
   - Use plain text only
   - No symbols like ## or **
9. Output must be directly usable in UI:
   - No cleanup required
   - No formatting artifacts
10. If unsure:
    - Prefer simpler output over complex formatting
`;

/**
 * Clean text by removing markdown formatting artifacts
 * This is a safety net in case AI still generates markdown
 * 
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text without markdown
 */
export function cleanMarkdown(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let cleaned = text;

  // Remove bold markers (**)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  
  // Remove italic markers (*)
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  
  // Remove backticks (`)
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  
  // Remove hashtags at start of lines (# ## ###)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  
  // Remove horizontal rules (---, ___, ***)
  cleaned = cleaned.replace(/^[-_*]{3,}$/gm, '');
  
  // Remove markdown links [text](url) - keep just text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove markdown images ![alt](url)
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  
  // Clean up multiple consecutive newlines (max 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Build a complete prompt with clean output rules prepended
 * 
 * @param {string} userPrompt - The actual prompt content
 * @returns {string} Complete prompt with formatting rules
 */
export function buildCleanPrompt(userPrompt) {
  return `${CLEAN_OUTPUT_RULES}

${userPrompt}`;
}

/**
 * Process AI response - clean and validate
 * 
 * @param {string} response - Raw AI response
 * @returns {string} Cleaned and validated response
 */
export function processAIResponse(response) {
  // Clean markdown artifacts
  let cleaned = cleanMarkdown(response);
  
  // Additional processing if needed
  // (e.g., validate length, check for issues)
  
  return cleaned;
}

/**
 * Enhance text by making important keywords and headings bold
 * Wraps important terms in <strong> tags for better readability
 *
 * @param {string} text - Text to enhance
 * @returns {string} Enhanced text with bold formatting
 */
export function enhanceTextFormatting(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let enhanced = text;

  // Common important keywords to make bold (case-insensitive)
  const importantKeywords = [
    'Prerequisites',
    'Requirements',
    'Installation',
    'Setup',
    'Configuration',
    'Important',
    'Note',
    'Warning',
    'Caution',
    'Step',
    'Usage',
    'Example',
    'Features',
    'Benefits',
    'Overview',
    'Summary',
    'Key Points',
    'Getting Started',
    'Quick Start',
    'Dependencies',
    'Environment Variables',
    'API Keys',
    'Commands',
    'Scripts',
    'Testing',
    'Deployment',
    'Production',
    'Development',
    'Build',
    'Run',
    'Start',
    'Stop'
  ];

  // Make keywords bold when they appear at the start of a line or after a colon
  importantKeywords.forEach(keyword => {
    // Match keyword at start of line (with optional whitespace)
    const startOfLineRegex = new RegExp(`^(\\s*)(${keyword})(:?)`, 'gim');
    enhanced = enhanced.replace(startOfLineRegex, '$1<strong>$2</strong>$3');
    
    // Match keyword after a newline
    const afterNewlineRegex = new RegExp(`(\\n\\s*)(${keyword})(:?)`, 'gim');
    enhanced = enhanced.replace(afterNewlineRegex, '$1<strong>$2</strong>$3');
  });

  // Make numbered steps bold (e.g., "1.", "Step 1:", "Step 1 -")
  enhanced = enhanced.replace(/^(\s*)(\d+\.|Step \d+:?|Step \d+ -)/gim, '$1<strong>$2</strong>');
  enhanced = enhanced.replace(/(\n\s*)(\d+\.|Step \d+:?|Step \d+ -)/gim, '$1<strong>$2</strong>');

  return enhanced;
}

// Made with Bob
