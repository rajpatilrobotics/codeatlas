import {
  buildReportData,
  getSecurityExportData,
  makePdfFileName,
  redactSensitiveText,
  sanitizePdfText
} from './reportDataBuilders';

function makeStorage(entries = {}) {
  return {
    getItem: jest.fn(key => entries[key] || null),
    setItem: jest.fn(),
    removeItem: jest.fn()
  };
}

const repoData = {
  repoInfo: {
    name: 'demo/repo',
    full_name: 'demo/repo',
    url: 'https://github.com/demo/repo',
    language: 'JavaScript',
    stars: 42,
    updatedAt: '2026-06-01T00:00:00Z',
    license: 'MIT',
    description: 'Demo repository'
  },
  fileTree: ['src/App.jsx', 'src/services/api.js', 'README.md'],
  techStack: {
    frontend: ['React'],
    backend: ['Express'],
    database: [],
    testing: ['Jest'],
    devops: []
  },
  importantFiles: [{ path: 'src/App.jsx', type: 'entry' }],
  keyCommands: ['npm install', 'npm start'],
  readme: '# Demo\nRun npm start.',
  packageJson: {
    scripts: { start: 'react-scripts start' },
    dependencies: { react: '^18.2.0' }
  }
};

const codeAnalysis = {
  summary: {
    analyzedFiles: 2,
    totalFiles: 2,
    totalLines: 120,
    frameworks: ['React']
  },
  files: [
    {
      path: 'src/App.jsx',
      content: "app.get('/api/demo', handler)\nprocess.env.DEMO_KEY"
    }
  ],
  definitions: {
    functions: [{ name: 'handler', file: 'src/App.jsx', line: 1 }]
  }
};

test('sanitizePdfText removes markup and compacts whitespace', () => {
  expect(sanitizePdfText('<strong>Hello</strong>   world\n\n\nnext')).toBe('Hello world\n\nnext');
});

test('makePdfFileName creates a safe dated PDF name', () => {
  expect(makePdfFileName('Demo Repo!?', new Date('2026-06-15T00:00:00Z'))).toBe('CodeAtlas_Report_demo-repo_2026-06-15.pdf');
});

test('redactSensitiveText removes common token formats', () => {
  const fakeGithubToken = `ghp_${'abcdefghijklmnopqrstuvwxyz123456'}`;
  const value = `Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456 GITHUB_TOKEN=${fakeGithubToken}`;
  const redacted = redactSensitiveText(value);
  expect(redacted).toContain('Bearer [redacted]');
  expect(redacted).not.toContain(fakeGithubToken);
});

test('getSecurityExportData prefers cached Security Scanner data', () => {
  const cacheKey = [
    'securityScan',
    'market-grade-v1',
    repoData.repoInfo.url,
    repoData.repoInfo.updatedAt,
    repoData.fileTree.length,
    codeAnalysis.summary.analyzedFiles
  ].join(':');
  const storage = makeStorage({
    [cacheKey]: JSON.stringify({
      generatedAt: '2026-06-15T00:00:00Z',
      source: 'test',
      score: { overall: 71, level: 'medium' },
      findings: [
        {
          title: 'Hardcoded token',
          severity: 'high',
          confidence: 'high',
          source: 'local-secret-scanner',
          file: 'src/App.jsx',
          recommendation: 'Move token to environment variables.',
          redactedEvidence: 'TOKEN=[redacted]'
        }
      ],
      sections: {
        coverage: { scannedFiles: 2 },
        fixChecklist: []
      }
    })
  });

  const security = getSecurityExportData({ repoData, codeAnalysis, storage });

  expect(security.source).toBe('Security Scanner cache');
  expect(security.score.overall).toBe(71);
  expect(security.severityCounts.high).toBe(1);
});

test('buildReportData creates every requested section with missing optional user work', () => {
  const report = buildReportData({
    repoData,
    repoSize: repoData.fileTree.length,
    aiSummary: 'This repo is a demo app.',
    quickStartGuide: 'Install dependencies and start the dev server.',
    commonIssues: '',
    firstContributions: [],
    architectureAnalysis: '',
    detailedArchitecture: null,
    codeAnalysis,
    storage: makeStorage()
  });

  expect(report.meta.filename).toMatch(/^CodeAtlas_Report_/);
  expect(report.sections.map(section => section.id)).toEqual([
    'dashboard',
    'summary',
    'architecture',
    'onboarding',
    'documentation',
    'repository-graph',
    'blast-radius',
    'planner',
    'debug-navigator',
    'heatmap',
    'security'
  ]);
});
