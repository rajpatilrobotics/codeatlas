import React, { useState, useEffect, useRef } from 'react';
import { generateText } from '../../services/watsonxService';

function Chat({ repoData }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [repoContext, setRepoContext] = useState(null);
  const messagesEndRef = useRef(null);
  const MAX_CHARS = 200;

  // Build compressed repository context once
  useEffect(() => {
    if (repoData && !repoContext) {
      const context = buildCompressedContext(repoData);
      setRepoContext(context);
      
      // Add welcome message
      setMessages([{
        id: 1,
        text: `Hello! I've analyzed the **${context.repo_name}** repository. I'm here to answer your questions about this codebase. What would you like to know?`,
        sender: 'bot',
        timestamp: Date.now()
      }]);
    }
  }, [repoData, repoContext]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Build compressed repository context
  const buildCompressedContext = (data) => {
    const { repoInfo, techStack, importantFiles, aiSummary } = data;
    
    // Detect tech stack
    const allTech = Object.values(techStack || {}).flat();
    const techStackStr = allTech.length > 0 
      ? allTech.slice(0, 5).join(', ') 
      : repoInfo.language || 'Not detected';
    
    // Get key files (max 4)
    const keyFiles = (importantFiles || [])
      .slice(0, 4)
      .map(f => ({
        name: f.path,
        purpose: detectFilePurpose(f.path)
      }));
    
    // Get short summary (first 300 chars)
    const shortSummary = aiSummary 
      ? aiSummary.substring(0, 300).trim() + (aiSummary.length > 300 ? '...' : '')
      : 'Repository analysis in progress.';
    
    return {
      repo_name: repoInfo.name,
      repo_description: repoInfo.description || 'No description available',
      tech_stack: techStackStr,
      key_files: keyFiles,
      short_summary: shortSummary
    };
  };

  // Detect file purpose based on name
  const detectFilePurpose = (filename) => {
    const lower = filename.toLowerCase();
    if (lower.includes('package.json')) return 'Dependencies and scripts';
    if (lower.includes('readme')) return 'Project documentation';
    if (lower.includes('index') || lower.includes('main') || lower.includes('app')) return 'Main entry point';
    if (lower.includes('config')) return 'Configuration';
    if (lower.includes('test')) return 'Testing';
    if (lower.includes('docker')) return 'Containerization';
    if (lower.includes('.env')) return 'Environment variables';
    if (lower.includes('server')) return 'Backend server';
    return 'Core component';
  };

  // Build system prompt for watsonx
  const buildSystemPrompt = (userQuestion, chatHistory) => {
    if (!repoContext) return '';
    
    const filesList = repoContext.key_files
      .map(f => `- ${f.name}: ${f.purpose}`)
      .join('\n');
    
    const recentHistory = chatHistory.slice(-6); // Last 3 exchanges (6 messages)
    const historyStr = recentHistory
      .map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n');
    
    return `You are a senior software engineer assistant who has fully analyzed a GitHub repository.
Your job is to answer questions about this codebase accurately and helpfully.

STRICT RULES:
- Answer ONLY based on the repository context provided
- Do NOT hallucinate features, files, or logic
- If information is missing, say: "Not enough information in the repository"
- Keep answers concise (max 120 words)
- Reference file names, folders, or components when possible
- Prefer practical explanations over theory
- Use bullet points when helpful
- Always suggest a follow up question at the end
- Format code snippets with proper labels
- If asked about setup always include exact commands

REPOSITORY CONTEXT:
Name: ${repoContext.repo_name}
Description: ${repoContext.repo_description}
Tech Stack: ${repoContext.tech_stack}
Key Files:
${filesList}
Summary: ${repoContext.short_summary}

CHAT HISTORY (last 3 messages only):
${historyStr || 'No previous messages'}

USER QUESTION:
${userQuestion}

RESPONSE FORMAT:
- Start with direct answer
- Support with specific file references
- End with: 💡 You might also want to ask: [suggested follow up question]`;
  };

  // Format AI message with better structure
  const formatMessage = (text) => {
    // Split into sections and format
    const sections = text.split('\n\n');
    
    return sections.map((section, idx) => {
      // Check if it's a list
      if (section.includes('•') || section.includes('-')) {
        const lines = section.split('\n');
        const title = lines[0].includes('•') || lines[0].includes('-') ? null : lines.shift();
        
        return (
          <div key={idx} className="message-section">
            {title && <div className="section-title">{title}</div>}
            <ul className="message-list">
              {lines.map((line, i) => {
                const cleaned = line.replace(/^[•\-]\s*/, '').trim();
                if (!cleaned) return null;
                return <li key={i}>{formatInlineText(cleaned)}</li>;
              })}
            </ul>
          </div>
        );
      }
      
      // Check if it's a code block
      if (section.includes('```')) {
        const codeMatch = section.match(/```(\w+)?\n([\s\S]*?)```/);
        if (codeMatch) {
          return (
            <div key={idx} className="message-section">
              <pre className="code-block">
                <code>{codeMatch[2].trim()}</code>
              </pre>
            </div>
          );
        }
      }
      
      // Regular paragraph
      return (
        <div key={idx} className="message-section">
          <p className="message-paragraph">{formatInlineText(section)}</p>
        </div>
      );
    });
  };

  // Format inline text (bold file names, etc.)
  const formatInlineText = (text) => {
    // Bold text between **
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="highlight">{part.slice(2, -2)}</strong>;
      }
      // Detect file names (contains . and extension)
      if (part.match(/\b[\w-]+\.(jsx?|tsx?|json|md|css|html|py|java|go|rs)\b/i)) {
        return <code key={i} className="inline-code">{part}</code>;
      }
      return part;
    });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !repoContext) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Add realistic delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      // Build prompt with context
      const prompt = buildSystemPrompt(inputValue, messages);
      
      // Call watsonx.ai
      const response = await generateText(prompt, {
        maxNewTokens: 300,
        temperature: 0.7,
        topP: 0.9
      });

      const botMessage = {
        id: Date.now() + 1,
        text: response,
        sender: 'bot',
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        sender: 'bot',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
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

  const charCount = inputValue.length;
  const isOverLimit = charCount > MAX_CHARS;

  if (!repoData) {
    return (
      <div className="tab-content chat-tab">
        <div className="content-card">
          <h2 className="card-title">💬 Chat with AI Assistant</h2>
          <div className="card-content">
            <p className="text-secondary">Please analyze a repository first to start chatting.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content chat-tab">
      <div className="content-card chat-card">
        <h2 className="card-title">💬 Chat with AI Assistant</h2>
        <div className="chat-container">
          <div className="chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message-wrapper ${message.sender === 'user' ? 'user-wrapper' : 'bot-wrapper'}`}
              >
                <div className={`chat-message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}>
                  {message.sender === 'bot' && (
                    <div className="message-header">
                      <span className="message-avatar-icon">🤖</span>
                      <span className="message-sender">AI Assistant</span>
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
                  <div className="message-footer">
                    <span className="message-time">
                      {new Date(message.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="chat-message-wrapper bot-wrapper">
                <div className="chat-message bot-message typing-message">
                  <div className="message-header">
                    <span className="message-avatar-icon">🤖</span>
                    <span className="message-sender">AI Assistant</span>
                  </div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span className="typing-text">AI is typing</span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            <div className="chat-input-wrapper">
              <input
                type="text"
                className="chat-input"
                placeholder="Ask anything about this codebase..."
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
            <button
              className="send-button"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping || isOverLimit}
            >
              <span className="send-icon">➤</span>
            </button>
          </div>
        </div>
      </div>

      <div className="content-card">
        <h3 className="card-title">💡 Suggested Questions</h3>
        <div className="card-content">
          <div className="suggested-questions">
            <button 
              className="suggestion-chip"
              onClick={() => handleSuggestionClick("What does this project do?")}
              disabled={isTyping}
            >
              What does this project do?
            </button>
            <button 
              className="suggestion-chip"
              onClick={() => handleSuggestionClick("How do I set up this project?")}
              disabled={isTyping}
            >
              How do I set up this project?
            </button>
            <button 
              className="suggestion-chip"
              onClick={() => handleSuggestionClick("What are the main components?")}
              disabled={isTyping}
            >
              What are the main components?
            </button>
            <button 
              className="suggestion-chip"
              onClick={() => handleSuggestionClick("Where is authentication handled?")}
              disabled={isTyping}
            >
              Where is authentication handled?
            </button>
            <button 
              className="suggestion-chip"
              onClick={() => handleSuggestionClick("What are the key dependencies?")}
              disabled={isTyping}
            >
              What are the key dependencies?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;

// Made with Bob
