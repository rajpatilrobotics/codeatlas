const chatHandler = require('../api/chat');

const repoContext = {
  matches: [
    {
      path: 'README.md',
      reason: 'Project overview and features',
    },
    {
      path: 'app.py',
      reason: 'Application entry point',
    },
  ],
};

describe('api/chat response parsing', () => {
  it('responds warmly to greetings without requiring repository snippets', () => {
    const response = chatHandler._internal.buildFriendlyChatResponse('hi', {
      repo: {
        name: 'octocat/Hello-World',
        fileCount: 1,
      },
      matches: [],
    });

    expect(chatHandler._internal.isGreetingMessage('hi')).toBe(true);
    expect(response.success).toBe(true);
    expect(response.provider).toBe('local');
    expect(response.answer).toContain('Hi, I am CodeAtlas Chat.');
    expect(response.answer).toContain('octocat/Hello-World');
    expect(response.answer).not.toContain('not enough repository');
    expect(response.suggestedQuestions).toContain('What does this repository do?');
  });

  it('recognizes capability questions as friendly chat prompts', () => {
    expect(chatHandler._internal.isCapabilitiesMessage('what can you do?')).toBe(true);
    expect(chatHandler._internal.isCapabilitiesMessage('what can u do?')).toBe(true);
    expect(chatHandler._internal.isCapabilitiesMessage('how can you help me?')).toBe(true);
    expect(chatHandler._internal.isCapabilitiesMessage('help')).toBe(true);
    expect(chatHandler._internal.isCapabilitiesMessage('are there security risks in this repo?')).toBe(false);
  });

  it('classifies general chat separately from repository-grounded questions', () => {
    expect(chatHandler._internal.classifyChatIntent('hi')).toBe('greeting');
    expect(chatHandler._internal.classifyChatIntent('what can u do?')).toBe('capabilities');
    expect(chatHandler._internal.classifyChatIntent('what is React?')).toBe('general');
    expect(chatHandler._internal.classifyChatIntent('what is React?', 'explain')).toBe('general');
    expect(chatHandler._internal.classifyChatIntent('are there security risks in this repo?')).toBe('security');
    expect(chatHandler._internal.requiresRepositoryEvidence('security')).toBe(true);
    expect(chatHandler._internal.requiresRepositoryEvidence('general')).toBe(false);
  });

  it('builds hybrid chat messages without forcing general prompts into repository-only mode', () => {
    const messages = chatHandler._internal.buildChatMessages({
      message: 'what can u do?',
      mode: 'general',
      repoContext: {
        repo: { name: 'octocat/Hello-World' },
        matches: [],
        history: [],
      },
    });

    expect(messages[0].role).toBe('system');
    expect(messages[messages.length - 1].role).toBe('user');
    expect(messages[messages.length - 1].content).toContain('"intent": "capabilities"');
    expect(messages[messages.length - 1].content).toContain('"repositoryGrounded": false');
  });

  it('unwraps structured model JSON before sending the answer to the UI', () => {
    const rawModelText = `{
      "answer": "This repository is a self-hosted AI workspace.

Read README.md first for the overview, then app.py for the backend entry point.",
      "sources": [
        { "path": "README.md", "reason": "Project overview and features" },
        { "path": "app.py", "reason": "Application entry point" }
      ],
      "suggestedQuestions": [
        "How do I install dependencies?",
        "What are the system requirements?"
      ]
    }`;

    const parsed = chatHandler._internal.parseModelResponse(rawModelText, repoContext);

    expect(parsed.answer).toContain('This repository is a self-hosted AI workspace.');
    expect(parsed.answer).toContain('Read README.md first');
    expect(parsed.answer).not.toContain('"answer"');
    expect(parsed.sources).toEqual([
      { path: 'README.md', reason: 'Project overview and features' },
      { path: 'app.py', reason: 'Application entry point' },
    ]);
    expect(parsed.suggestedQuestions).toEqual([
      'How do I install dependencies?',
      'What are the system requirements?',
    ]);
  });

  it('does not attach repository source chips to plain general answers', () => {
    const parsed = chatHandler._internal.parseModelResponse('I can help with code, debugging, and repository questions.', repoContext, {
      fallbackToMatches: false,
    });

    expect(parsed.answer).toContain('I can help');
    expect(parsed.sources).toEqual([]);
  });

  it('returns an honest provider-unavailable message for rate limits and overloads', () => {
    const providerErrors = [
      chatHandler._internal.classifyProviderError(
        'groq',
        new Error('Groq API error: 429 - Rate limit reached on tokens per day. Please try again in 9m53.568s.')
      ),
      chatHandler._internal.classifyProviderError(
        'gemini',
        new Error('Gemini API error: 503 - This model is currently experiencing high demand.')
      ),
    ];

    const response = chatHandler._internal.buildProviderUnavailableResponse(providerErrors, 'security');

    expect(response.success).toBe(true);
    expect(response.provider).toBe('unavailable');
    expect(response.answer).toContain('AI provider is unavailable');
    expect(response.answer).toContain('groq hit a rate limit or quota limit');
    expect(response.answer).toContain('gemini is temporarily overloaded');
    expect(response.answer).toContain('No repository answer was generated');
    expect(response.answer).toContain('not going to invent vulnerabilities');
  });
});
