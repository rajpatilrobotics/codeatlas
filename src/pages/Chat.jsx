'use client';
import React, { useState, useEffect, useRef } from 'react';
import './Chat.css';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { Select } from '../components/ui/Dropdown';
import EmptyState from '../components/ui/EmptyState';

// Response Cache for instant replies
class ResponseCache {
  constructor(maxSize = 50, ttl = 3600000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }
  
  normalizeQuestion(question) {
    return question.toLowerCase().trim().replace(/\s+/g, ' ');
  }
  
  get(question) {
    const key = this.normalizeQuestion(question);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    cached.hits++;
    return cached.response;
  }
  
  set(question, response) {
    const key = this.normalizeQuestion(question);
    
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      hits: 0
    });
  }
}

const responseCache = new ResponseCache();

// LLM Models Configuration
const LLM_MODELS = [
  { 
    id: 'watsonx', 
    name: 'IBM watsonx.ai', 
    icon: '🔷',
    description: 'Enterprise-grade AI',
    color: 'cyan'
  },
  { 
    id: 'gpt4', 
    name: 'GPT-4 Turbo', 
    icon: '🟢',
    description: 'Most capable model',
    color: 'green'
  },
  { 
    id: 'claude', 
    name: 'Claude 3 Opus', 
    icon: '🟣',
    description: 'Best for analysis',
    color: 'purple'
  },
  { 
    id: 'gemini', 
    name: 'Gemini Pro', 
    icon: '🔵',
    description: 'Fast & efficient',
    color: 'blue'
  }
];

// Intent Detection
const detectIntent = (question) => {
  if (/explain|what is|how does|tell me about|describe/i.test(question)) return 'explain';
  if (/error|bug|fix|issue|problem|not working|broken|fail/i.test(question)) return 'debug';
  if (/optimize|better|improve|refactor|enhance|performance/i.test(question)) return 'improve';
  if (/install|setup|configure|run|start|deploy|build/i.test(question)) return 'setup';
  if (/where|which file|locate|find|search/i.test(question)) return 'find';
  if (/security|vulnerability|secure|auth|permission/i.test(question)) return 'security';
  if (/architecture|structure|design|pattern|organize/i.test(question)) return 'architecture';
  return 'general';
};

// Intent Presets
const INTENT_PRESETS = [
  { id: 'explain', label: 'Explain', icon: '📖', question: 'Explain how this project works' },
  { id: 'debug', label: 'Debug', icon: '🐛', question: 'Help me debug an issue' },
  { id: 'improve', label: 'Improve', icon: '⚡', question: 'Suggest improvements for the code' },
  { id: 'setup', label: 'Setup', icon: '🛠️', question: 'How do I set up this project?' },
  { id: 'find', label: 'Find', icon: '🔍', question: 'Where can I find specific functionality?' },
  { id: 'security', label: 'Security', icon: '🔒', question: 'Check for security issues' },
  { id: 'architecture', label: 'Architecture', icon: '🏗️', question: 'Explain the architecture' },
  { id: 'general', label: 'General', icon: '💬', question: 'Tell me about this repository' }
];

// Suggested Questions
const SUGGESTED_QUESTIONS = [
  'What does this project do?',
  'How do I set up this project?',
  'What are the main components?',
  'Where is authentication handled?',
  'What are the key dependencies?',
  'Show me the API endpoints',
  'Explain the database schema',
  'What testing framework is used?'
];

function Chat() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState(LLM_MODELS[0]);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const messagesEndRef = useRef(null);
  const MAX_CHARS = 500;

  // Mock repository data (will be replaced with real data)
  const hasRepository = true;

  // Initialize with welcome message
  useEffect(() => {
    if (hasRepository && messages.length === 0) {
      setMessages([{
        id: 1,
        text: "Hello! I've analyzed your repository. I'm here to answer questions about your codebase. What would you like to know?",
        sender: 'bot',
        timestamp: Date.now(),
        model: selectedModel.id
      }]);
    }
  }, [hasRepository, messages.length, selectedModel.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    // Realistic delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      // Check cache first
      const cached = responseCache.get(currentInput);
      if (cached) {
        const botMessage = {
          id: Date.now() + 1,
          text: cached,
          sender: 'bot',
          timestamp: Date.now(),
          intent: detectIntent(currentInput),
          cached: true,
          model: selectedModel.id
        };
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
        return;
      }
      
      // Detect intent
      const intent = detectIntent(currentInput);
      
      // Mock AI response (will be replaced with real API call)
      const mockResponse = generateMockResponse(currentInput, intent, selectedModel);
      
      // Cache the response
      responseCache.set(currentInput, mockResponse);

      const botMessage = {
        id: Date.now() + 1,
        text: mockResponse,
        sender: 'bot',
        timestamp: Date.now(),
        intent: intent,
        cached: false,
        model: selectedModel.id
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: `Sorry, I encountered an error. Please try again.`,
        sender: 'bot',
        timestamp: Date.now(),
        model: selectedModel.id
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Mock response generator
  const generateMockResponse = (question, intent, model) => {
    const responses = {
      explain: `Based on the repository analysis, this is a React-based web application with a Node.js backend. The main entry point is \`src/index.js\`, which renders the \`App.jsx\` component.\n\nKey features include:\n• User authentication via JWT tokens\n• RESTful API endpoints in \`/api\` directory\n• State management using React Context\n• Responsive UI with CSS modules\n\n💡 You might also want to ask: "How does authentication work in this project?"`,
      debug: `To debug issues in this codebase:\n\n1. Check the browser console for errors\n2. Review \`src/utils/errorHandler.js\` for error logging\n3. Enable debug mode in \`.env\` file\n4. Use React DevTools to inspect component state\n\nCommon issues:\n• Missing environment variables in \`.env\`\n• CORS errors - check \`server/middleware/cors.js\`\n• API endpoint mismatches\n\n💡 You might also want to ask: "What logging tools are available?"`,
      improve: `Here are optimization suggestions:\n\n**Performance:**\n• Implement code splitting in \`App.jsx\`\n• Add React.memo() to frequently re-rendered components\n• Lazy load images and heavy components\n\n**Code Quality:**\n• Add PropTypes validation\n• Implement error boundaries\n• Extract repeated logic into custom hooks\n\n**Security:**\n• Update dependencies with vulnerabilities\n• Add rate limiting to API endpoints\n\n💡 You might also want to ask: "Show me specific files that need refactoring"`,
      setup: `To set up this project:\n\n\`\`\`bash\n# Clone the repository\ngit clone <repo-url>\n\n# Install dependencies\nnpm install\n\n# Copy environment variables\ncp .env.example .env\n\n# Start development server\nnpm run dev\n\`\`\`\n\n**Prerequisites:**\n• Node.js 18+ and npm 9+\n• PostgreSQL 14+ (for database)\n• Redis (for caching)\n\nThe app will run on http://localhost:3000\n\n💡 You might also want to ask: "What environment variables do I need?"`,
      find: `Key functionality locations:\n\n**Authentication:** \`src/services/authService.js\`\n**API Routes:** \`src/api/routes/\` directory\n**Components:** \`src/components/\` directory\n**State Management:** \`src/context/AppContext.js\`\n**Utilities:** \`src/utils/\` directory\n\nUse the search feature (Cmd+K) to quickly locate specific files or functions.\n\n💡 You might also want to ask: "Show me the folder structure"`,
      security: `Security analysis:\n\n**✅ Good practices:**\n• JWT tokens with expiration\n• Password hashing with bcrypt\n• HTTPS enforcement\n• Input validation\n\n**⚠️ Recommendations:**\n• Add rate limiting to login endpoint\n• Implement CSRF protection\n• Update \`axios\` to latest version (CVE-2023-45857)\n• Add security headers in \`server/middleware/security.js\`\n\n💡 You might also want to ask: "How do I fix the axios vulnerability?"`,
      architecture: `This project follows a **client-server architecture**:\n\n**Frontend (React):**\n• Component-based UI in \`src/components/\`\n• React Router for navigation\n• Context API for state management\n\n**Backend (Node.js/Express):**\n• RESTful API in \`server/routes/\`\n• Middleware for auth, logging, errors\n• PostgreSQL database with Sequelize ORM\n\n**Key patterns:**\n• Service layer pattern for business logic\n• Repository pattern for data access\n• Middleware chain for request processing\n\n💡 You might also want to ask: "Show me the data flow diagram"`,
      general: `This is a full-stack web application built with:\n\n**Tech Stack:**\n• Frontend: React 18, React Router, Axios\n• Backend: Node.js, Express, PostgreSQL\n• Tools: Webpack, Babel, ESLint\n\n**Project Stats:**\n• 156 files, 12,450 lines of code\n• 23 npm dependencies\n• Last updated: 2 days ago\n\nThe project appears to be a task management system with user authentication, real-time updates, and a responsive UI.\n\n💡 You might also want to ask: "What are the main features?"`
    };

    return responses[intent] || responses.general;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (question) => {
    setInputValue(question);
  };

  const handleModelSelect = (model) => {
    setSelectedModel(model);
    setShowModelSelector(false);
  };

  const charCount = inputValue.length;
  const isOverLimit = charCount > MAX_CHARS;

  // Format message text
  const formatMessage = (text) => {
    const parts = text.split('\n\n');
    
    return parts.map((section, idx) => {
      // Code block
      if (section.includes('```')) {
        const codeMatch = section.match(/```(\w+)?\n([\s\S]*?)```/);
        if (codeMatch) {
          return (
            <pre key={idx} className="code-block">
              <code>{codeMatch[2].trim()}</code>
            </pre>
          );
        }
      }
      
      // List
      if (section.includes('•') || section.match(/^\d+\./m)) {
        const lines = section.split('\n');
        const title = lines[0].match(/^[•\d]/) ? null : lines.shift();
        
        return (
          <div key={idx} className="message-section">
            {title && <div className="section-title">{title}</div>}
            <ul className="message-list">
              {lines.map((line, i) => {
                const cleaned = line.replace(/^[•\-\d.]\s*/, '').trim();
                if (!cleaned) return null;
                return <li key={i}>{formatInlineText(cleaned)}</li>;
              })}
            </ul>
          </div>
        );
      }
      
      // Paragraph
      return (
        <p key={idx} className="message-paragraph">
          {formatInlineText(section)}
        </p>
      );
    });
  };

  // Format inline text (bold, code, etc.)
  const formatInlineText = (text) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="inline-code">{part.slice(1, -1)}</code>;
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  if (!hasRepository) {
    return (
      <div className="chat-page">
        <EmptyState
          icon="💬"
          title="No Repository Analyzed"
          description="Analyze a repository first to start chatting with AI"
          action={
            <Button variant="primary" size="medium">
              Analyze Repository
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="chat-page">
      {/* Main Chat Area */}
      <div className="chat-main">
        <Card className="chat-card">
          {/* Chat Header */}
          <div className="chat-header">
            <div className="chat-header-left">
              <h1 className="chat-title">AI Assistant</h1>
              <p className="chat-subtitle">Ask anything about your codebase</p>
            </div>
            
            {/* Model Selector */}
            <div className="model-selector">
              <button 
                className="model-selector-trigger"
                onClick={() => setShowModelSelector(!showModelSelector)}
              >
                <span className="model-icon">{selectedModel.icon}</span>
                <span className="model-name">{selectedModel.name}</span>
                <span className="model-chevron">▼</span>
              </button>
              
              {showModelSelector && (
                <div className="model-dropdown">
                  {LLM_MODELS.map(model => (
                    <button
                      key={model.id}
                      className={`model-option ${model.id === selectedModel.id ? 'active' : ''}`}
                      onClick={() => handleModelSelect(model)}
                    >
                      <span className="model-icon">{model.icon}</span>
                      <div className="model-info">
                        <div className="model-name">{model.name}</div>
                        <div className="model-description">{model.description}</div>
                      </div>
                      {model.id === selectedModel.id && (
                        <span className="model-check">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message-wrapper ${message.sender === 'user' ? 'user' : 'bot'}`}
              >
                <div className="message-bubble">
                  {message.sender === 'bot' && (
                    <div className="message-meta">
                      <span className="message-avatar">
                        {LLM_MODELS.find(m => m.id === message.model)?.icon || '🤖'}
                      </span>
                      <span className="message-sender">
                        {LLM_MODELS.find(m => m.id === message.model)?.name || 'AI Assistant'}
                      </span>
                      {message.intent && (
                        <Badge variant="secondary" size="small">
                          {message.intent}
                        </Badge>
                      )}
                      {message.cached && (
                        <span className="cache-badge" title="Cached response">⚡</span>
                      )}
                    </div>
                  )}
                  
                  <div className="message-content">
                    {message.sender === 'user' ? (
                      <div className="message-text">{message.text}</div>
                    ) : (
                      <div className="message-text formatted">
                        {formatMessage(message.text)}
                      </div>
                    )}
                  </div>
                  
                  <div className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="message-wrapper bot">
                <div className="message-bubble typing">
                  <div className="message-meta">
                    <span className="message-avatar">{selectedModel.icon}</span>
                    <span className="message-sender">{selectedModel.name}</span>
                  </div>
                  <div className="typing-indicator">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="chat-input-area">
            <div className="chat-input-wrapper">
              <input
                type="text"
                className="chat-input"
                placeholder="Ask anything about this repository..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                maxLength={MAX_CHARS}
                disabled={isTyping}
              />
              <div className={`char-counter ${isOverLimit ? 'over-limit' : ''}`}>
                {charCount}/{MAX_CHARS}
              </div>
            </div>
            <Button
              variant="primary"
              size="medium"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping || isOverLimit}
            >
              Send
            </Button>
          </div>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="chat-sidebar">
        {/* Intent Presets */}
        <Card>
          <h3 className="sidebar-title">Quick Actions</h3>
          <div className="intent-grid">
            {INTENT_PRESETS.map(preset => (
              <button
                key={preset.id}
                className={`intent-chip ${preset.id}`}
                onClick={() => handleSuggestionClick(preset.question)}
                disabled={isTyping}
                title={preset.question}
              >
                <span className="intent-icon">{preset.icon}</span>
                <span className="intent-label">{preset.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Suggested Questions */}
        <Card>
          <h3 className="sidebar-title">Suggested Questions</h3>
          <div className="suggestions-list">
            {SUGGESTED_QUESTIONS.map((question, idx) => (
              <button
                key={idx}
                className="suggestion-item"
                onClick={() => handleSuggestionClick(question)}
                disabled={isTyping}
              >
                {question}
              </button>
            ))}
          </div>
        </Card>

        {/* Tips */}
        <Card>
          <h3 className="sidebar-title">💡 Tips</h3>
          <ul className="tips-list">
            <li>Ask specific questions for better answers</li>
            <li>Reference file names or components</li>
            <li>Use quick actions for common tasks</li>
            <li>Switch models for different perspectives</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

export default Chat;

// Made with Bob
