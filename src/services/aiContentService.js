/**
 * AI Content Service
 * Generates real AI content based on repository context
 * Replaces hardcoded mock data with dynamic AI responses
 */

import { generateText, generateStructuredJSON } from './ai/aiService.js';

/**
 * Structured JSON schema for AI responses
 */
const CONTENT_SCHEMA = {
  repository: {},
  components: [],
  dependencies: [],
  services: [],
  apis: [],
  stateManagement: [],
  criticalPaths: [],
  securityFindings: [],
  blastRadius: [],
  architectureSummary: "",
  recommendations: []
};

/**
 * Generate AI summary based on repository context
 */
export async function generateAISummary(repoData) {
  if (!repoData) {
    throw new Error('Repository data is required');
  }

  const { repoInfo, readme, techStack, importantFiles } = repoData;

  const prompt = `You are a senior software engineer. Analyze this GitHub repository and provide a plain English summary.

Repository Information:
- Name: ${repoInfo?.name || 'Unknown'}
- Description: ${repoInfo?.description || 'No description'}
- Language: ${repoInfo?.language || 'Unknown'}
- Stars: ${repoInfo?.stargazers_count || 0}
- Forks: ${repoInfo?.forks_count || 0}

Tech Stack: ${Object.values(techStack || {}).flat().slice(0, 5).join(', ')}

README Preview: ${readme?.substring(0, 1000) || 'No README available'}

Key Files: ${(importantFiles || []).slice(0, 5).map(f => f?.path).join(', ')}

Provide a concise summary (max 300 words) covering:
1. What this project does
2. Who it is for
3. The main technology stack
4. The most important things a new developer should know

Format the response in plain English with clear sections.`;

  try {
    const summary = await generateText(prompt, {
      temperature: 0.7,
      maxTokens: 500,
    });
    return summary;
  } catch (error) {
    console.error('Error generating AI summary:', error);
    throw new Error('Failed to generate AI summary. Please try again.');
  }
}

/**
 * Generate quick start guide based on repository context
 */
export async function generateQuickStart(repoData) {
  if (!repoData) {
    throw new Error('Repository data is required');
  }

  const { repoInfo, readme, packageJson } = repoData;

  const prompt = `You are a technical writer. Create a quick start guide for this repository.

Repository: ${repoInfo?.name || 'Unknown'}
Description: ${repoInfo?.description || 'No description'}

README Content: ${readme?.substring(0, 2000) || 'No README available'}

${packageJson ? `Package.json scripts: ${JSON.stringify(packageJson.scripts || {})}` : ''}

Create a comprehensive quick start guide with:
1. Prerequisites (Node.js version, etc.)
2. Installation steps with exact commands
3. Configuration (environment variables if needed)
4. How to run the project
5. Common commands (build, test, lint, etc.)

Use code blocks for commands. Keep it practical and actionable.`;

  try {
    const quickStart = await generateText(prompt, {
      temperature: 0.6,
      maxTokens: 800,
    });
    return quickStart;
  } catch (error) {
    console.error('Error generating quick start:', error);
    throw new Error('Failed to generate quick start guide. Please try again.');
  }
}

/**
 * Generate common issues based on repository context
 */
export async function generateCommonIssues(repoData) {
  if (!repoData) {
    throw new Error('Repository data is required');
  }

  const { repoInfo, readme, techStack } = repoData;

  const prompt = `You are a DevOps engineer. Identify common issues developers might face with this repository.

Repository: ${repoInfo?.name || 'Unknown'}
Tech Stack: ${Object.values(techStack || {}).flat().join(', ')}

README Content: ${readme?.substring(0, 1500) || 'No README available'}

List 5-8 common issues with solutions:
1. Missing environment variables
2. Dependency installation problems
3. Port conflicts
4. Permission errors
5. Build failures
6. Runtime errors
7. Testing issues
8. Deployment issues

For each issue, provide:
- Clear title
- Root cause
- Step-by-step solution

Keep it practical and actionable.`;

  try {
    const issues = await generateText(prompt, {
      temperature: 0.6,
      maxTokens: 600,
    });
    return issues;
  } catch (error) {
    console.error('Error generating common issues:', error);
    throw new Error('Failed to generate common issues. Please try again.');
  }
}

/**
 * Generate first contribution opportunities based on repository context
 */
export async function generateFirstContributions(repoData, codeAnalysis) {
  if (!repoData) {
    throw new Error('Repository data is required');
  }

  const { repoInfo, importantFiles } = repoData;

  const prompt = `You are an open source maintainer. Suggest first contribution opportunities for this repository.

Repository: ${repoInfo?.name || 'Unknown'}
Description: ${repoInfo?.description || 'No description'}

Key Files: ${(importantFiles || []).slice(0, 10).map(f => f?.path).join(', ')}

${codeAnalysis ? `Code Analysis: ${JSON.stringify(codeAnalysis).substring(0, 500)}` : ''}

Suggest 4-6 first contribution tasks with:
1. Task description
2. Specific file(s) to work on
3. Difficulty level (Easy, Medium, Hard)
4. Impact on the project

Focus on tasks suitable for new contributors:
- Documentation improvements
- Adding tests
- Bug fixes
- Small feature additions
- Code refactoring
- UI improvements`;

  try {
    const contributions = await generateStructuredJSON(prompt, {
      contributions: [
        {
          task: "",
          file: "",
          difficulty: "",
          impact: ""
        }
      ]
    }, {
      temperature: 0.7,
      maxTokens: 600,
    });
    return contributions.contributions || [];
  } catch (error) {
    console.error('Error generating first contributions:', error);
    throw new Error('Failed to generate contribution opportunities. Please try again.');
  }
}

/**
 * Generate architecture analysis based on repository context
 */
export async function generateArchitectureAnalysis(repoData, codeAnalysis) {
  if (!repoData) {
    throw new Error('Repository data is required');
  }

  const { repoInfo, techStack, importantFiles } = repoData;

  const prompt = `You are a software architect. Analyze the architecture of this repository.

Repository: ${repoInfo?.name || 'Unknown'}
Description: ${repoInfo?.description || 'No description'}
Language: ${repoInfo?.language || 'Unknown'}

Tech Stack: ${Object.values(techStack || {}).flat().join(', ')}

Key Files: ${(importantFiles || []).slice(0, 15).map(f => f?.path).join(', ')}

${codeAnalysis ? `Code Analysis: ${JSON.stringify(codeAnalysis).substring(0, 800)}` : ''}

Provide a comprehensive architecture analysis covering:
1. Component Breakdown - Main components and their responsibilities
2. Technology Architecture - Frontend, backend, databases, APIs
3. Data Flow - How data moves through the system
4. Key Dependencies - Critical libraries and frameworks

Use clear sections and bullet points. Be specific to this repository.`;

  try {
    const architecture = await generateText(prompt, {
      temperature: 0.6,
      maxTokens: 1000,
    });
    return architecture;
  } catch (error) {
    console.error('Error generating architecture analysis:', error);
    throw new Error('Failed to generate architecture analysis. Please try again.');
  }
}

/**
 * Generate security analysis based on code analysis results
 */
export async function generateSecurityAnalysis(repoData, codeAnalysis) {
  if (!repoData) {
    throw new Error('Repository data is required');
  }

  const { repoInfo, importantFiles } = repoData;

  const prompt = `You are a security analyst. Analyze the security posture of this repository.

Repository: ${repoInfo?.name || 'Unknown'}
Language: ${repoInfo?.language || 'Unknown'}

Key Files: ${(importantFiles || []).slice(0, 20).map(f => f?.path).join(', ')}

${codeAnalysis ? `Code Analysis: ${JSON.stringify(codeAnalysis).substring(0, 1000)}` : ''}

Provide a security analysis in JSON format with:
{
  "overall_score": number (0-100),
  "risk_level": "Low" | "Medium" | "High",
  "passed_checks": ["check1", "check2"],
  "issues": [
    {
      "severity": "High" | "Medium" | "Low",
      "title": "",
      "description": "",
      "file": "",
      "fix": ""
    }
  ],
  "recommendations": ["rec1", "rec2"]
}

Focus on:
- Common security vulnerabilities
- API security
- Input validation
- Authentication/authorization
- Dependency security
- Secret management`;

  try {
    const security = await generateStructuredJSON(prompt, {
      overall_score: 0,
      risk_level: "Medium",
      passed_checks: [],
      issues: [],
      recommendations: []
    }, {
      temperature: 0.5,
      maxTokens: 1200,
    });
    return security;
  } catch (error) {
    console.error('Error generating security analysis:', error);
    throw new Error('Failed to generate security analysis. Please try again.');
  }
}

/**
 * Generate onboarding guide based on repository context
 */
export async function generateOnboardingGuide(repoData) {
  if (!repoData) {
    throw new Error('Repository data is required');
  }

  const { repoInfo, readme, techStack, packageJson } = repoData;

  const prompt = `You are a developer advocate. Create an onboarding guide for this repository.

Repository: ${repoInfo?.name || 'Unknown'}
Description: ${repoInfo?.description || 'No description'}
Language: ${repoInfo?.language || 'Unknown'}

Tech Stack: ${Object.values(techStack || {}).flat().join(', ')}

${packageJson ? `Available Scripts: ${Object.keys(packageJson.scripts || {}).join(', ')}` : ''}

README Content: ${readme?.substring(0, 2000) || 'No README available'}

Create an onboarding guide in JSON format with:
{
  "steps": [
    {
      "title": "",
      "description": "",
      "actions": ["action1", "action2"],
      "icon": "emoji",
      "duration": "time estimate",
      "difficulty": "Beginner" | "Intermediate" | "Advanced"
    }
  ]
}

Include steps for:
1. Project Overview & Goals
2. Environment Setup
3. Codebase Orientation
4. Development Workflow
5. First Contribution
6. Testing & Quality Assurance
7. Best Practices & Code Style
8. Resources & Documentation`;

  try {
    const onboarding = await generateStructuredJSON(prompt, {
      steps: []
    }, {
      temperature: 0.6,
      maxTokens: 1500,
    });
    return onboarding;
  } catch (error) {
    console.error('Error generating onboarding guide:', error);
    throw new Error('Failed to generate onboarding guide. Please try again.');
  }
}

export default {
  generateAISummary,
  generateQuickStart,
  generateCommonIssues,
  generateFirstContributions,
  generateArchitectureAnalysis,
  generateSecurityAnalysis,
  generateOnboardingGuide
};
