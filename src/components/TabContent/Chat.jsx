import React, { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  FileText,
  Loader2,
  MessageSquare,
  Network,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { buildRepositoryChatContext, detectChatMode } from '../../utils/repository/buildRepositoryChatContext';

const MAX_CHARS = 1200;

marked.setOptions({
  breaks: true,
  gfm: true,
});

const QUICK_ACTIONS = [
  {
    label: 'Explain',
    prompt: 'What does this repository do, and which files should I read first?',
    icon: Search,
  },
  {
    label: 'Setup',
    prompt: 'How do I install dependencies and run this project locally?',
    icon: Terminal,
  },
  {
    label: 'Architecture',
    prompt: 'Explain the architecture and the main data flow.',
    icon: Network,
  },
  {
    label: 'Security',
    prompt: 'What security risks or dependency concerns are visible in this repository?',
    icon: ShieldCheck,
  },
];

const DEFAULT_FOLLOW_UPS = [
  'Which files should I inspect first?',
  'How do I run this project locally?',
  'Where are the main risks in this repository?',
];

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sanitizeMarkdown(text) {
  const html = marked.parse(text || '');
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });
}

function MarkdownContent({ text }) {
  return (
    <div
      className="ca-chat-markdown"
      dangerouslySetInnerHTML={{ __html: sanitizeMarkdown(text) }}
    />
  );
}

function buildWelcomeMessage(repoData, contextPreview) {
  const hasRepo = Boolean(repoData?.repoInfo);
  const repoName = repoData?.repoInfo?.name || 'this repository';
  const fileCount = contextPreview?.repo?.fileCount || 0;
  const sourceCount = contextPreview?.matches?.length || 0;
  const text = hasRepo
    ? `I am ready to answer general developer questions and questions about **${repoName}** using the repository analysis CodeAtlas has already gathered.\n\nWhen you ask about this repository, I can ground answers in ${fileCount || 'available'} files and cite the most relevant sources when there is enough context.`
    : 'I am ready to answer general developer questions. Analyze a GitHub repository when you want CodeAtlas Chat to ground answers in real files and cite sources.';

  return {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    status: 'ready',
    text,
    sources: contextPreview?.matches?.slice(0, Math.min(sourceCount, 3)).map((match) => ({
      path: match.path,
      reason: match.reason,
    })) || [],
    suggestedQuestions: DEFAULT_FOLLOW_UPS,
    provider: null,
    timestamp: Date.now(),
  };
}

function MessageSources({ sources = [] }) {
  if (!sources.length) return null;

  return (
    <div className="ca-chat-sources" aria-label="Response sources">
      {sources.map((source) => (
        <span key={`${source.path}-${source.reason}`} className="ca-chat-source-chip" title={source.reason}>
          <FileText size={13} aria-hidden="true" />
          {source.path}
        </span>
      ))}
    </div>
  );
}

function ChatMessage({ message, onCopy, copied, onRetry, onSuggestion }) {
  const isAssistant = message.role === 'assistant';
  const isError = message.status === 'error';

  return (
    <article className={`ca-chat-message ${isAssistant ? 'assistant' : 'user'} ${isError ? 'error' : ''}`}>
      <div className="ca-chat-message-rail" aria-hidden="true">
        {isAssistant ? <Bot size={18} /> : <MessageSquare size={18} />}
      </div>
      <div className="ca-chat-message-body">
        <header className="ca-chat-message-meta">
          <span>{isAssistant ? 'CodeAtlas Chat' : 'You'}</span>
          {message.provider && <span>{message.provider}</span>}
          <time dateTime={new Date(message.timestamp).toISOString()}>{formatTime(message.timestamp)}</time>
        </header>

        <div className="ca-chat-message-surface">
          {isAssistant ? <MarkdownContent text={message.text} /> : <p>{message.text}</p>}
        </div>

        <MessageSources sources={message.sources} />

        {isAssistant && message.suggestedQuestions?.length > 0 && (
          <div className="ca-chat-followups" aria-label="Suggested follow-up questions">
            {message.suggestedQuestions.slice(0, 3).map((question) => (
              <button
                key={question}
                type="button"
                className="ca-chat-followup"
                onClick={() => onSuggestion(question)}
              >
                {question}
              </button>
            ))}
          </div>
        )}

        {isAssistant && (
          <div className="ca-chat-message-actions">
            <button
              type="button"
              className="ca-chat-icon-button"
              onClick={() => onCopy(message)}
              title="Copy response"
              aria-label="Copy response"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
            {isError && message.retryQuestion && (
              <button
                type="button"
                className="ca-chat-icon-button"
                onClick={() => onRetry(message.retryQuestion)}
                title="Retry request"
                aria-label="Retry request"
              >
                <RefreshCw size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function LoadingMessage() {
  return (
    <article className="ca-chat-message assistant pending" aria-label="CodeAtlas Chat is answering">
      <div className="ca-chat-message-rail" aria-hidden="true">
        <Loader2 size={18} />
      </div>
      <div className="ca-chat-message-body">
        <header className="ca-chat-message-meta">
          <span>CodeAtlas Chat</span>
          <span>retrieving context</span>
        </header>
        <div className="ca-chat-message-surface">
          <div className="ca-chat-thinking">
            <span />
            <span />
            <span />
            Reading relevant files and preparing a grounded answer
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyChatState({ repoData, onSuggestion }) {
  const repoName = repoData?.repoInfo?.name || 'this repository';

  return (
    <div className="ca-chat-empty-state">
      <Bot size={28} aria-hidden="true" />
      <h3>Ask CodeAtlas Chat anything</h3>
      <p>Ask a general developer question, or ask about {repoName} and CodeAtlas will cite source files when the context supports the response.</p>
      <div className="ca-chat-empty-actions">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button key={action.label} type="button" onClick={() => onSuggestion(action.prompt)}>
              <Icon size={15} aria-hidden="true" />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ContextPanel({ contextPreview, isCodeAnalysisLoading }) {
  const repo = contextPreview?.repo || {};
  const matches = contextPreview?.matches || [];

  return (
    <aside className="ca-chat-context-panel" aria-label="Repository context">
      <div className="ca-chat-panel-section">
        <span className="ca-chat-panel-label">Repository</span>
        <h3>{repo.name || 'Unknown repository'}</h3>
        <p>{repo.description || 'No description available.'}</p>
      </div>

      <div className="ca-chat-context-grid">
        <div>
          <span>{repo.fileCount || 0}</span>
          <small>files</small>
        </div>
        <div>
          <span>{repo.importantFileCount || 0}</span>
          <small>key files</small>
        </div>
      </div>

      {isCodeAnalysisLoading && (
        <div className="ca-chat-context-note">
          <Loader2 size={14} aria-hidden="true" />
          Code analysis is still indexing. Answers may improve once it finishes.
        </div>
      )}

      <div className="ca-chat-panel-section">
        <span className="ca-chat-panel-label">Detected Stack</span>
        <div className="ca-chat-stack-list">
          {(repo.techStack || []).slice(0, 8).map((item) => (
            <span key={item}>{item}</span>
          ))}
          {(!repo.techStack || repo.techStack.length === 0) && <small>No stack detected yet</small>}
        </div>
      </div>

      <div className="ca-chat-panel-section">
        <span className="ca-chat-panel-label">Likely Sources</span>
        <div className="ca-chat-source-list">
          {matches.slice(0, 5).map((match) => (
            <div key={match.path}>
              <strong>{match.path}</strong>
              <small>{match.purpose}</small>
            </div>
          ))}
          {matches.length === 0 && <small>No source files available yet.</small>}
        </div>
      </div>
    </aside>
  );
}

function Chat({ repoData, codeAnalysis, isCodeAnalysisLoading }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const logRef = useRef(null);
  const textareaRef = useRef(null);

  const contextPreview = useMemo(() => {
    if (!repoData) {
      return {
        repo: {
          name: 'No repository analyzed',
          description: 'General assistant mode is available. Analyze a repository for source-grounded answers.',
          fileCount: 0,
          importantFileCount: 0,
          techStack: [],
        },
        matches: [],
        suggestedQuestions: DEFAULT_FOLLOW_UPS,
      };
    }

    return buildRepositoryChatContext({
      repoData,
      codeAnalysis,
      message: 'repository overview setup architecture security',
      maxMatches: 5,
    });
  }, [repoData, codeAnalysis]);

  useEffect(() => {
    if (!contextPreview) {
      setMessages([]);
      return;
    }
    setMessages([buildWelcomeMessage(repoData, contextPreview)]);
  }, [repoData, contextPreview]);

  useEffect(() => {
    const shellContent = document.querySelector('.app-shell-content');
    if (typeof shellContent?.scrollTo === 'function') {
      shellContent.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  useEffect(() => {
    if (typeof logRef.current?.scrollTo === 'function') {
      logRef.current.scrollTo({
        top: logRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isSending]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
  }, [inputValue]);

  const setSuggestion = (question) => {
    setInputValue(question);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const copyMessage = async (message) => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopiedMessageId(message.id);
      setTimeout(() => setCopiedMessageId(null), 1600);
    } catch (error) {
      console.error('Could not copy chat response:', error);
    }
  };

  const sendMessage = async (questionOverride) => {
    const question = (questionOverride || inputValue).trim();
    if (!question || isSending || question.length > MAX_CHARS) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: question,
      timestamp: Date.now(),
    };

    const history = [...messages, userMessage].map((message) => ({
      role: message.role,
      content: message.text,
    }));

    const repoContext = repoData
      ? buildRepositoryChatContext({
        repoData,
        codeAnalysis,
        message: question,
        history,
      })
      : {
        repo: null,
        matches: [],
        history,
        suggestedQuestions: DEFAULT_FOLLOW_UPS,
      };

    setMessages((current) => [...current, userMessage]);
    setInputValue('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: question,
          repoContext,
          mode: detectChatMode(question),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Chat API failed with status ${response.status}`);
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          status: 'ready',
          text: data.answer || 'Not enough repository information in the current analysis to answer that accurately.',
          sources: data.sources || [],
          suggestedQuestions: data.suggestedQuestions || DEFAULT_FOLLOW_UPS,
          provider: data.provider,
          timestamp: Date.now(),
        },
      ]);
    } catch (error) {
      const apiHint = String(error.message || '').includes('Unexpected token')
        ? 'The local React server is running without API routes. Use `vercel dev` for real chat responses.'
        : error.message;

      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          status: 'error',
          text: `I could not complete that request.\n\n${apiHint}`,
          sources: [],
          suggestedQuestions: [],
          retryQuestion: question,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const isOverLimit = inputValue.length > MAX_CHARS;
  const canSend = inputValue.trim().length > 0 && !isSending && !isOverLimit;

  return (
    <div className="tab-content chat-tab ca-chat-tab">
      <section className="ca-chat-workspace" aria-label="CodeAtlas repository chat">
        <div className="ca-chat-layout">
          <main className="ca-chat-main" aria-label="Conversation">
            <div
              ref={logRef}
              className="ca-chat-log"
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
              aria-busy={isSending}
            >
              {messages.length === 0 ? (
                <EmptyChatState repoData={repoData} onSuggestion={setSuggestion} />
              ) : (
                messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    copied={copiedMessageId === message.id}
                    onCopy={copyMessage}
                    onRetry={sendMessage}
                    onSuggestion={setSuggestion}
                  />
                ))
              )}
              {isSending && <LoadingMessage />}
              <div ref={messagesEndRef} />
            </div>

            <div className="ca-chat-quick-actions" aria-label="Quick prompts">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => setSuggestion(action.prompt)}
                    disabled={isSending}
                  >
                    <Icon size={15} aria-hidden="true" />
                    {action.label}
                  </button>
                );
              })}
            </div>

            <form
              className="ca-chat-composer"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
            >
              <label htmlFor="codeatlas-chat-input" className="sr-only">
                Ask CodeAtlas Chat
              </label>
              <textarea
                id="codeatlas-chat-input"
                ref={textareaRef}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything, or ask about setup, architecture, security, files, or debugging..."
                maxLength={MAX_CHARS + 1}
                disabled={isSending}
                rows={1}
              />
              <div className="ca-chat-composer-footer">
                <span className={isOverLimit ? 'over-limit' : ''}>
                  {inputValue.length}/{MAX_CHARS}
                </span>
                {isOverLimit && (
                  <span className="ca-chat-limit-warning">
                    <AlertTriangle size={13} aria-hidden="true" />
                    Shorten your question
                  </span>
                )}
              </div>
              <button type="submit" className="ca-chat-send" disabled={!canSend} aria-label="Send message">
                {isSending ? <Loader2 size={18} /> : <Send size={18} />}
              </button>
            </form>
          </main>

          <ContextPanel contextPreview={contextPreview} isCodeAnalysisLoading={isCodeAnalysisLoading} />
        </div>
      </section>
    </div>
  );
}

export default Chat;
