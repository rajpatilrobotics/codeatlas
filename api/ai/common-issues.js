/**
 * AI Common Issues Generation API
 * Serverless function for generating common issues
 */

import { generateCommonIssues } from '../../src/services/aiContentService.js';

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
    const { repoData } = req.body;

    if (!repoData) {
      return res.status(400).json({ error: 'Repository data is required' });
    }

    const issues = await generateCommonIssues(repoData);
    
    return res.status(200).json({ 
      success: true, 
      issues 
    });
  } catch (error) {
    console.error('Common issues generation error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to generate common issues' 
    });
  }
}
