/**
 * AI Architecture Analysis Generation API
 * Serverless function for generating architecture analysis
 */

import { generateArchitectureAnalysis } from '../../src/services/aiContentService.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { repoData, codeAnalysis } = req.body;

    if (!repoData) {
      return res.status(400).json({ error: 'Repository data is required' });
    }

    const architecture = await generateArchitectureAnalysis(repoData, codeAnalysis);
    
    return res.status(200).json({ 
      success: true, 
      architecture 
    });
  } catch (error) {
    console.error('Architecture analysis generation error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to generate architecture analysis' 
    });
  }
}
