import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Chat from './Chat';

jest.mock('marked', () => ({
  marked: {
    setOptions: jest.fn(),
    parse: (text) => text,
  },
}));

jest.mock('dompurify', () => ({
  sanitize: (html) => html,
}));

const repoData = {
  repoInfo: {
    name: 'codeatlas-chat',
    description: 'Repository intelligence workspace',
    language: 'JavaScript',
  },
  techStack: {
    frontend: ['React'],
    backend: ['Vercel Functions'],
  },
  aiSummary: 'CodeAtlas analyzes repositories and answers codebase questions.',
  fileTree: [{ path: 'README.md' }, { path: 'api/chat.js' }],
  importantFiles: [
    {
      path: 'README.md',
      content: 'Run npm install and vercel dev to start the project.',
    },
    {
      path: 'api/chat.js',
      content: 'The chat API accepts message, repoContext, and mode.',
    },
  ],
};

const codeAnalysis = {
  files: [
    {
      path: 'src/components/TabContent/Chat.jsx',
      content: 'function Chat() { return <section className="ca-chat-workspace" />; }',
      definitions: {
        functions: [{ name: 'Chat' }],
      },
    },
  ],
};

describe('Chat', () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        answer: 'Use `vercel dev` so API routes are available.',
        sources: [{ path: 'README.md', reason: 'Contains local setup command' }],
        suggestedQuestions: ['Which file owns chat?'],
        provider: 'groq',
      }),
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    jest.restoreAllMocks();
  });

  it('renders a repository chat workspace', () => {
    act(() => {
      root.render(<Chat repoData={repoData} codeAnalysis={codeAnalysis} isCodeAnalysisLoading={false} />);
    });

    expect(container.querySelector('.ca-chat-workspace')).not.toBeNull();
    expect(container.textContent).toContain('CodeAtlas Chat');
    expect(container.textContent).toContain('codeatlas-chat');
  });

  it('fills quick prompts and sends structured chat context', async () => {
    await act(async () => {
      root.render(<Chat repoData={repoData} codeAnalysis={codeAnalysis} isCodeAnalysisLoading={false} />);
    });

    const setupButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Setup'));

    await act(async () => {
      setupButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const textarea = container.querySelector('#codeatlas-chat-input');
    expect(textarea.value).toContain('install dependencies');

    await act(async () => {
      container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));

    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(requestBody.message).toContain('install dependencies');
    expect(requestBody.mode).toBe('setup');
    expect(requestBody.repoContext.matches.length).toBeGreaterThan(0);
  });
});
