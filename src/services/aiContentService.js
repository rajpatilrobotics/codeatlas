/**
 * AI Content Service
 * Generates real AI content based on repository context
 * Replaces hardcoded mock data with dynamic AI responses
 */

import { generateText, generateStructuredJSON, isAIProviderFailure } from './ai/aiService.js';
import {
  buildLegacyOnboardingSteps,
  buildOnboardingGuideModel,
} from '../utils/onboardingGuideModel.js';

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

function getRepoName(repoData) {
  return repoData?.repoInfo?.name || 'this repository';
}

function getRepoLanguage(repoData) {
  return repoData?.repoInfo?.language || 'the primary language';
}

function getTechStackList(repoData) {
  return Object.values(repoData?.techStack || {}).flat().filter(Boolean);
}

function getKeyFilePaths(repoData, limit = 6) {
  return (repoData?.importantFiles || [])
    .map(file => file?.path)
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeSecurityIssues(codeAnalysis) {
  const security = codeAnalysis?.security || {};

  return ['critical', 'high', 'medium', 'low'].flatMap(severity =>
    (security[severity] || []).map(issue => ({
      severity: severity === 'critical' ? 'High' : severity.charAt(0).toUpperCase() + severity.slice(1),
      title: issue.title || issue.type || 'Security issue detected',
      description: issue.description || issue.message || 'Review this finding from static analysis.',
      file: issue.file || issue.path || 'Unknown',
      fix: issue.fix || issue.recommendation || 'Review the affected code and apply the recommended secure pattern.'
    }))
  );
}

function buildFallbackContributions(repoData, codeAnalysis) {
  const keyFiles = getKeyFilePaths(repoData, 4);
  const techStack = getTechStackList(repoData);
  const firstFile = keyFiles[0] || 'README.md';
  const testTarget = keyFiles.find(path => /\.(js|jsx|ts|tsx|py|java|go|rb)$/.test(path)) || firstFile;

  return [
    {
      task: `Improve setup documentation for ${getRepoName(repoData)}`,
      file: 'README.md',
      difficulty: 'Easy',
      impact: 'Helps new contributors install, configure, and run the project with fewer blockers.'
    },
    {
      task: 'Add or expand tests around an important code path',
      file: testTarget,
      difficulty: 'Medium',
      impact: 'Improves confidence when future contributors change core behavior.'
    },
    {
      task: 'Document the repository structure and key entry points',
      file: firstFile,
      difficulty: 'Easy',
      impact: `Makes the ${getRepoLanguage(repoData)} codebase easier to navigate.`
    },
    {
      task: techStack.length > 0 ? `Review dependency usage for ${techStack.slice(0, 3).join(', ')}` : 'Review dependency usage and cleanup opportunities',
      file: keyFiles[1] || firstFile,
      difficulty: 'Medium',
      impact: 'Reduces maintenance friction and highlights small cleanup opportunities for contributors.'
    }
  ].slice(0, codeAnalysis?.summary?.analyzedFiles ? 4 : 3);
}

function buildFallbackSecurityAnalysis(repoData, codeAnalysis) {
  const issues = normalizeSecurityIssues(codeAnalysis).slice(0, 6);
  const highIssueCount = issues.filter(issue => issue.severity === 'High').length;
  const score = issues.length === 0 ? 82 : Math.max(45, 82 - highIssueCount * 15 - issues.length * 5);
  const riskLevel = score < 60 ? 'High' : score < 80 ? 'Medium' : 'Low';

  return {
    overall_score: score,
    risk_level: riskLevel,
    passed_checks: [
      'Repository metadata analyzed',
      'Important files reviewed from static analysis',
      codeAnalysis?.summary?.analyzedFiles
        ? `${codeAnalysis.summary.analyzedFiles} files included in local code analysis`
        : 'Static code context reviewed where available'
    ],
    issues,
    recommendations: [
      'Keep secrets out of source control and load credentials from server-side environment variables.',
      'Validate user input at API boundaries before passing data to downstream services.',
      'Review dependency updates regularly and prioritize security patches.',
      'Add tests for authentication, authorization, and error-handling paths when present.'
    ],
    source: 'fallback',
    warning: 'AI provider quota or rate limits prevented live security generation.'
  };
}

function withLegacyOnboardingSteps(model) {
  return {
    ...model,
    steps: buildLegacyOnboardingSteps(model)
  };
}

function buildFallbackOnboardingGuide(repoData) {
  return withLegacyOnboardingSteps({
    ...buildOnboardingGuideModel({ repoData }),
    source: 'fallback',
    warning: 'AI provider quota or rate limits prevented live onboarding enhancement.'
  });
}

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
    if (isAIProviderFailure(error)) {
      console.warn('Using fallback contribution opportunities because AI providers are unavailable or rate limited.');
      return buildFallbackContributions(repoData, codeAnalysis);
    }
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
    if (isAIProviderFailure(error)) {
      console.warn('Using fallback security analysis because AI providers are unavailable or rate limited.');
      return buildFallbackSecurityAnalysis(repoData, codeAnalysis);
    }
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

  const evidenceModel = buildOnboardingGuideModel({ repoData });
  const prompt = `You are improving copy for an evidence-backed developer onboarding guide.

Rules:
- Use only the repository evidence in the JSON below.
- Do not add files, scripts, services, risks, or technologies that are not present.
- Keep checklist ids unchanged.
- Return concise copy that helps a new contributor understand what to do next.

Evidence-backed model:
${JSON.stringify(evidenceModel).substring(0, 6000)}

Return JSON:
{
  "summary": "",
  "checklistNotes": [
    {
      "id": "",
      "description": ""
    }
  ]
}`;

  try {
    const enhancement = await generateStructuredJSON(prompt, {
      summary: "",
      checklistNotes: []
    }, {
      temperature: 0.6,
      maxTokens: 1500,
    });

    const notesById = new Map(
      (enhancement.checklistNotes || [])
        .filter(note => note?.id && note?.description)
        .map(note => [note.id, note.description])
    );
    const enhancedModel = {
      ...evidenceModel,
      checklist: evidenceModel.checklist.map(item => ({
        ...item,
        description: notesById.get(item.id) || item.description
      })),
      aiContext: {
        ...evidenceModel.aiContext,
        summary: enhancement.summary || evidenceModel.aiContext.summary
      }
    };

    return withLegacyOnboardingSteps(enhancedModel);
  } catch (error) {
    console.error('Error generating onboarding guide:', error);
    if (isAIProviderFailure(error)) {
      console.warn('Using fallback onboarding guide because AI providers are unavailable or rate limited.');
      return buildFallbackOnboardingGuide(repoData);
    }
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
