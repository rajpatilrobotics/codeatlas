/**
 * AI Blast Radius Reasoning API
 * Serverless function for generating blast radius reasoning
 */

import { getBlastRadiusReasoning } from '../../src/utils/repository/blastRadiusAnalysis.js';

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
    const { blastRadius, repoData } = req.body;

    if (!blastRadius || !repoData) {
      return res.status(400).json({ error: 'Blast radius data and repository data are required' });
    }

    const reasoning = await getBlastRadiusReasoning(blastRadius, repoData);
    
    return res.status(200).json({ 
      success: true, 
      reasoning 
    });
  } catch (error) {
    console.error('Blast radius reasoning generation error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to generate blast radius reasoning' 
    });
  }
}
