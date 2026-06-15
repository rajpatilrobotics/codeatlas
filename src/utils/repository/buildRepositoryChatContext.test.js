import {
  buildRepositoryChatContext,
  detectChatMode,
  extractChatKeywords,
} from './buildRepositoryChatContext';

const repoData = {
  repoInfo: {
    name: 'codeatlas-chat',
    description: 'Repository intelligence workspace',
    language: 'JavaScript',
    stars: 4,
  },
  techStack: {
    frontend: ['React'],
    backend: ['Vercel Functions'],
  },
  aiSummary: 'CodeAtlas analyzes repositories and generates onboarding guidance.',
  fileTree: [{ path: 'src/App.jsx' }, { path: 'api/chat.js' }],
  importantFiles: [
    {
      path: 'README.md',
      content: 'Run npm install and vercel dev to start API routes.',
    },
    {
      path: 'package.json',
      content: '{"scripts":{"start":"react-scripts start","build":"react-scripts build"}}',
    },
    {
      path: 'src/components/TabContent/Architecture.jsx',
      content: 'Architecture graph renders components, services, and dependency flow.',
    },
    {
      path: 'src/components/TabContent/SecurityScanner.jsx',
      content: 'Security scanner checks dependencies, secrets, tokens, and auth risks.',
    },
  ],
};

const codeAnalysis = {
  files: [
    {
      path: 'api/chat.js',
      content: 'module.exports = async function chat(req, res) { return res.json({ success: true }); }',
      definitions: {
        functions: [{ name: 'chat' }],
      },
    },
  ],
};

describe('buildRepositoryChatContext', () => {
  it('detects supported chat modes', () => {
    expect(detectChatMode('How do I run this project?')).toBe('setup');
    expect(detectChatMode('Check auth vulnerabilities')).toBe('security');
    expect(detectChatMode('Explain the architecture')).toBe('architecture');
    expect(detectChatMode('Why is this failing?')).toBe('debug');
    expect(detectChatMode('What does this do?')).toBe('explain');
    expect(detectChatMode('hello')).toBe('general');
  });

  it('extracts useful keywords and mode terms', () => {
    const keywords = extractChatKeywords('Where is authentication handled?', 'security');
    expect(keywords).toContain('authentication');
    expect(keywords).toContain('security');
    expect(keywords).toContain('auth');
  });

  it('prioritizes setup files for setup questions', () => {
    const context = buildRepositoryChatContext({
      repoData,
      codeAnalysis,
      message: 'How do I install and run this project?',
    });

    expect(context.mode).toBe('setup');
    expect(context.matches[0].path).toBe('README.md');
    expect(context.matches.map((match) => match.path)).toContain('package.json');
  });

  it('prioritizes architecture files for architecture questions', () => {
    const context = buildRepositoryChatContext({
      repoData,
      codeAnalysis,
      message: 'Explain the architecture and service flow',
    });

    expect(context.mode).toBe('architecture');
    expect(context.matches[0].path).toBe('src/components/TabContent/Architecture.jsx');
  });

  it('prioritizes security files for security questions', () => {
    const context = buildRepositoryChatContext({
      repoData,
      codeAnalysis,
      message: 'Are there token or auth security risks?',
    });

    expect(context.mode).toBe('security');
    expect(context.matches[0].path).toBe('src/components/TabContent/SecurityScanner.jsx');
  });

  it('returns bounded snippets and compact history', () => {
    const context = buildRepositoryChatContext({
      repoData,
      codeAnalysis,
      message: 'Where is chat handled?',
      history: [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'second' },
        { role: 'user', content: 'third' },
        { role: 'assistant', content: 'fourth' },
        { role: 'user', content: 'fifth' },
        { role: 'assistant', content: 'sixth' },
        { role: 'user', content: 'seventh' },
      ],
    });

    expect(context.history).toHaveLength(6);
    expect(context.matches.length).toBeGreaterThan(0);
    expect(context.matches[0].snippets[0].text.length).toBeLessThanOrEqual(1603);
  });
});
