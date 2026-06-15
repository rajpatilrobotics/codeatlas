import {
  buildLegacyOnboardingSteps,
  buildOnboardingGuideModel,
  getOnboardingRepositoryKey,
} from './onboardingGuideModel';

const repoData = {
  repoInfo: {
    name: 'codeatlas',
    full_name: 'raj/codeatlas',
    url: 'https://github.com/raj/codeatlas',
    description: 'Evidence-backed repository intelligence',
    language: 'JavaScript',
    license: 'MIT',
    updatedAt: '2026-06-01T00:00:00Z',
  },
  readme: '# CodeAtlas\nUnderstand codebases faster.',
  fileTree: [
    'README.md',
    'package.json',
    'src/App.jsx',
    'src/components/TabContent/OnboardingGuide.jsx',
    'api/ai/onboarding.js',
    '.env.example',
  ],
  packageJson: {
    scripts: {
      start: 'react-scripts start',
      build: 'react-scripts build',
      test: 'react-scripts test',
    },
  },
  techStack: {
    frontend: ['React'],
    backend: ['Serverless API'],
  },
  importantFiles: [
    { path: 'src/App.jsx', content: 'function App() {}' },
    { path: 'api/ai/onboarding.js', content: 'export default function handler() {}' },
  ],
  envVariables: [
    { key: 'GROQ_API_KEY', example: 'gsk_...' },
  ],
};

const codeAnalysis = {
  summary: {
    analyzedFiles: 2,
    totalLines: 240,
    frameworks: ['React'],
    patterns: ['Service Layer'],
  },
  definitions: {
    exports: [{ name: 'handler', file: 'api/ai/onboarding.js', line: 4 }],
    classes: [],
    functions: [{ name: 'App', file: 'src/App.jsx', line: 12 }],
  },
  security: {
    critical: [],
    high: [
      {
        type: 'Hardcoded API Key',
        file: 'src/services/example.js',
        line: 9,
        message: 'Potential hardcoded API key.',
      },
    ],
    medium: [],
    low: [],
  },
  files: [
    { path: 'src/App.jsx' },
    { path: 'api/ai/onboarding.js' },
  ],
};

describe('onboardingGuideModel', () => {
  it('builds a v2 model from repository evidence', () => {
    const model = buildOnboardingGuideModel({
      repoData,
      codeAnalysis,
      detailedArchitecture: {
        frameworks: ['React'],
        architecture: {
          type: 'Frontend Application',
          patterns: { hasFrontend: true, hasBackend: true },
        },
      },
      aiSummary: 'AI summary generated from repository context.',
      firstContributions: [
        {
          task: 'Improve onboarding docs',
          file: 'README.md',
          difficulty: 'Easy',
          impact: 'Helps new contributors.',
        },
      ],
    });

    expect(model.version).toBe('v2');
    expect(model.repositoryKey).toBe('raj/codeatlas');
    expect(model.setup.recommendedCommands.map(item => item.command)).toEqual(
      expect.arrayContaining(['npm install', 'npm start', 'npm run build', 'npm run test'])
    );
    expect(model.readingPath).toEqual(expect.arrayContaining(['README.md', 'package.json', 'src/App.jsx']));
    expect(model.codeLandmarks.some(item => item.name === 'handler')).toBe(true);
    expect(model.riskHighlights[0]).toMatchObject({
      severity: 'high',
      file: 'src/services/example.js',
    });
    expect(model.firstContributions[0].file).toBe('README.md');
  });

  it('uses repository URL as a fallback key', () => {
    expect(getOnboardingRepositoryKey({
      repoInfo: {
        name: '',
        url: 'https://github.com/example/fallback-repo',
      },
    })).toBe('example/fallback-repo');
  });

  it('creates legacy steps from the evidence-backed checklist', () => {
    const model = buildOnboardingGuideModel({ repoData, codeAnalysis });
    const steps = buildLegacyOnboardingSteps(model);

    expect(steps).toHaveLength(model.checklist.length);
    expect(steps[0]).toHaveProperty('id');
    expect(steps[0].actions.length).toBeGreaterThan(0);
  });
});
