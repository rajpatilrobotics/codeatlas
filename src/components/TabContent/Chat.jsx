import React, { useState, useEffect, useRef } from 'react';
import { generateText } from '../../services/watsonxService';
import { CLEAN_OUTPUT_RULES, cleanMarkdown } from '../../utils/textFormatting';

// PHASE 2: Response Cache Class
class ResponseCache {
  constructor(maxSize = 50, ttl = 3600000) { // 1 hour TTL
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
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    cached.hits++;
    return cached.response;
  }
  
  set(question, response) {
    const key = this.normalizeQuestion(question);
    
    // Evict oldest if at capacity
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
  
  getStats() {
    return {
      size: this.cache.size,
      totalHits: Array.from(this.cache.values())
        .reduce((sum, entry) => sum + entry.hits, 0)
    };
  }
}

// Create cache instance outside component
const responseCache = new ResponseCache();

function Chat({ repoData, codeAnalysis, isCodeAnalysisLoading }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [repoContext, setRepoContext] = useState(null);
  const messagesEndRef = useRef(null);
  const MAX_CHARS = 200;

  // Build compressed repository context once
  useEffect(() => {
    if (repoData && !repoContext) {
      try {
        const context = buildCompressedContext(repoData);
        setRepoContext(context);
        
        // Add welcome message
        setMessages([{
          id: 1,
          text: `Hello! I've analyzed the **${context?.repo_name || 'repository'}**. I'm here to answer your questions about this codebase. What would you like to know?`,
          sender: 'bot',
          timestamp: Date.now()
        }]);
      } catch (error) {
        console.error('Error building context:', error);
        setMessages([{
          id: 1,
          text: 'Hello! I\'m ready to help you understand this codebase. What would you like to know?',
          sender: 'bot',
          timestamp: Date.now()
        }]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoData]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Build compressed repository context
  const buildCompressedContext = (data) => {
    if (!data) return null;
    
    const { repoInfo, techStack, importantFiles, aiSummary } = data;
    
    // Detect tech stack with null safety
    const allTech = Object.values(techStack || {}).flat().filter(Boolean);
    const techStackStr = allTech.length > 0
      ? allTech.slice(0, 5).join(', ')
      : repoInfo?.language || 'Not detected';
    
    // Get key files (max 4) with null safety
    const keyFiles = (Array.isArray(importantFiles) ? importantFiles : [])
      .slice(0, 4)
      .map(f => ({
        name: f?.path || 'unknown',
        purpose: detectFilePurpose(f?.path || ''),
        fullPath: f?.path || ''
      }));
    
    // Get short summary (first 300 chars)
    const shortSummary = aiSummary
      ? aiSummary.substring(0, 300).trim() + (aiSummary.length > 300 ? '...' : '')
      : 'Repository analysis in progress.';
    
    return {
      repo_name: repoInfo?.name || 'Unknown Repository',
      repo_description: repoInfo?.description || 'No description available',
      tech_stack: techStackStr,
      key_files: keyFiles,
      short_summary: shortSummary,
      all_files: Array.isArray(importantFiles) ? importantFiles : []
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
    if (lower.includes('auth')) return 'Authentication';
    if (lower.includes('api')) return 'API endpoints';
    if (lower.includes('component')) return 'UI component';
    if (lower.includes('service')) return 'Service layer';
    if (lower.includes('util') || lower.includes('helper')) return 'Utility functions';
    return 'Core component';
  };

  // PHASE 1: Intent Detection
  const detectIntent = (question) => {
    if (/explain|what is|how does|tell me about|describe/i.test(question)) {
      return 'explain';
    }
    if (/error|bug|fix|issue|problem|not working|broken|fail/i.test(question)) {
      return 'debug';
    }
    if (/optimize|better|improve|refactor|enhance|performance/i.test(question)) {
      return 'improve';
    }
    if (/install|setup|configure|run|start|deploy|build/i.test(question)) {
      return 'setup';
    }
    if (/where|which file|locate|find|search/i.test(question)) {
      return 'find';
    }
    if (/security|vulnerability|secure|auth|permission/i.test(question)) {
      return 'security';
    }
    if (/architecture|structure|design|pattern|organize/i.test(question)) {
      return 'architecture';
    }
    
    return 'general';
  };

  // PHASE 2: Extract Keywords from Question
  const extractKeywords = (question) => {
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'how', 'what', 'where', 
                       'does', 'do', 'can', 'could', 'would', 'should', 'this', 'that', 'these', 
                       'those', 'i', 'you', 'me', 'my', 'your', 'about', 'from', 'with'];
    
    const words = question.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.includes(w));
    
    return [...new Set(words)]; // Remove duplicates
  };

  // PHASE 2: Score File Relevance
  const scoreFileRelevance = (file, keywords) => {
    if (!file || !file.path) return 0;
    
    let score = 0;
    const fileName = file.path.toLowerCase();
    
    (keywords || []).forEach(keyword => {
      // Exact filename match
      if (fileName.includes(keyword)) {
        score += 15;
      }
      
      // Directory match
      const dirs = fileName.split('/');
      if (dirs.some(dir => dir.includes(keyword))) {
        score += 10;
      }
      
      // Extension relevance
      if (keyword === 'component' && /\.(jsx|tsx|vue)$/.test(fileName)) score += 5;
      if (keyword === 'style' && /\.(css|scss|sass)$/.test(fileName)) score += 5;
      if (keyword === 'test' && /\.(test|spec)\.(js|ts)$/.test(fileName)) score += 5;
    });
    
    // Boost important file types
    if (fileName.includes('auth')) score += 8;
    if (fileName.includes('api')) score += 8;
    if (fileName.includes('config')) score += 6;
    if (fileName.includes('index') || fileName.includes('main')) score += 5;
    
    return score;
  };

  // PHASE 2: Select Relevant Files Dynamically
  const selectRelevantFiles = (question, allFiles, maxFiles = 4) => {
    if (!allFiles || !Array.isArray(allFiles) || allFiles.length === 0) return [];
    
    const keywords = extractKeywords(question);
    console.log('🔍 Keywords extracted:', keywords);
    
    // Score all files with null safety
    const scoredFiles = (allFiles || [])
      .filter(file => file && file.path)
      .map(file => ({
        file,
        score: scoreFileRelevance(file, keywords)
      }));
    
    // Sort by score and take top N
    const selected = scoredFiles
      .sort((a, b) => b.score - a.score)
      .slice(0, maxFiles)
      .map(sf => sf.file);
    
    console.log('📁 Selected files:', selected.map(f => f?.path || 'unknown'));
    
    return selected;
  };

  // Helper function to extract code snippets from file content
  const extractSnippetsFromContent = (content, keywords, contextLines = 3) => {
    if (!content || !keywords || keywords.length === 0) return [];
    
    const lines = content.split('\n');
    const snippets = [];
    const maxSnippets = 3;
    
    keywords.forEach(keyword => {
      for (let i = 0; i < lines.length && snippets.length < maxSnippets; i++) {
        const line = lines[i];
        if (line.toLowerCase().includes(keyword.toLowerCase())) {
          const start = Math.max(0, i - contextLines);
          const end = Math.min(lines.length, i + contextLines + 1);
          const snippetLines = lines.slice(start, end);
          
          snippets.push({
            lineNumber: start + 1,
            code: snippetLines.join('\n'),
            context: `Lines ${start + 1}-${end}`
          });
          
          // Skip ahead to avoid overlapping snippets
          i += contextLines;
        }
      }
    });
    
    return snippets;
  };

  // PHASE 2: Build Context with Dynamic Files and Code Snippets
  const buildDynamicContext = (question, baseContext) => {
    if (!baseContext) return null;
    
    const relevantFiles = selectRelevantFiles(
      question,
      baseContext.all_files,
      4
    );
    
    const dynamicFiles = (relevantFiles || []).map(f => ({
      name: f?.path || 'unknown',
      purpose: detectFilePurpose(f?.path || '')
    }));
    
    // Extract code snippets if codeAnalysis is available
    const codeSnippets = [];
    if (codeAnalysis && codeAnalysis.files && Array.isArray(codeAnalysis.files) && relevantFiles.length > 0) {
      const keywords = extractKeywords(question);
      
      (relevantFiles || []).forEach(relevantFile => {
        const analysisFile = (codeAnalysis.files || []).find(f => f?.path === relevantFile?.path);
        if (analysisFile && analysisFile.content) {
          const snippets = extractSnippetsFromContent(analysisFile.content, keywords, 3);
          if (snippets.length > 0) {
            codeSnippets.push({
              file: analysisFile.path,
              snippets: snippets
            });
          }
        }
      });
      
      console.log('📝 Extracted code snippets:', codeSnippets.length, 'files with snippets');
    }
    
    return {
      ...baseContext,
      key_files: dynamicFiles.length > 0 ? dynamicFiles : (baseContext.key_files || []),
      code_snippets: codeSnippets
    };
  };

  // Build System Prompt - Exact format as specified in task requirements
  const buildStructuredPrompt = (userQuestion, intent, context, chatHistory) => {
    if (!context) return '';
    
    // Build key files list with actual file names
    const filesList = (context.key_files || [])
      .map((f) => `${f?.name || 'unknown'}: ${f?.purpose || 'unknown'}`)
      .join('\n');
    
    // Get last 3 messages (6 total - 3 exchanges) for chat history
    const recentHistory = (Array.isArray(chatHistory) ? chatHistory : []).slice(-6);
    const historyStr = recentHistory
      .map(m => `${m?.sender === 'user' ? 'User' : 'Assistant'}: ${m?.text || ''}`)
      .join('\n');
    
    return `You are a senior software engineer assistant who has fully analyzed a GitHub repository.
Your job is to answer questions about this codebase accurately and helpfully.

${CLEAN_OUTPUT_RULES}

STRICT RULES:
- Answer ONLY based on the repository context provided
- Do NOT hallucinate features, files, or logic
- If information is missing, say: Not enough information in the repository
- Keep answers concise (max 120 words)
- Reference file names, folders, or components when possible
- Prefer practical explanations over theory
- Use bullet points when helpful
- Always suggest a follow up question at the end
- If asked about setup always include exact commands

REPOSITORY CONTEXT:
Name: ${context.repo_name}
Description: ${context.repo_description}
Tech Stack: ${context.tech_stack}
Key Files:
${filesList}
Summary: ${context.short_summary}

CHAT HISTORY (last 3 messages only):
${historyStr || 'No previous messages'}

USER QUESTION:
${userQuestion}

RESPONSE FORMAT:
- Start with direct answer
- Support with specific file references
- End with: 💡 You might also want to ask: {suggested follow up question}`;
  };

  // PHASE 2: Validate Structured Response
  const validateStructuredResponse = (response, context) => {
    if (!response || !context) return { valid: true, issues: [], warnings: 0 };
    
    const issues = [];
    
    // Check length
    if (response.length > 1000) {
      issues.push('Response too long (>1000 chars)');
    }
    
    // Check for follow-up question
    if (!response.includes('💡')) {
      issues.push('Missing follow-up question');
    }
    
    // Validate file references
    const filePattern = /`([^`]+\.(jsx?|tsx?|py|java|go|rs|json|md|yml|yaml|xml|html|css))`/gi;
    const matches = [...response.matchAll(filePattern)];
    
    if (matches.length > 0 && context.all_files && Array.isArray(context.all_files)) {
      matches.forEach(match => {
        const filename = match[1];
        const exists = context.all_files.some(f =>
          f?.path?.includes(filename) || filename.includes(f?.path?.split('/').pop())
        );
        
        if (!exists) {
          console.warn(`⚠️ AI mentioned file that may not exist: ${filename}`);
          issues.push(`Mentioned non-existent file: ${filename}`);
        }
      });
    }
    
    return {
      valid: issues.length === 0,
      issues,
      warnings: issues.length
    };
  };

  // PHASE 1: Response Validation (Enhanced)
  const validateResponse = (response) => {
    if (!repoContext || !response) return response;
    
    // Check for file references in backticks
    const filePattern = /`([^`]+\.(js|jsx|ts|tsx|py|java|go|rs|json|md|yml|yaml|xml|html|css))`/gi;
    const matches = response.match(filePattern);
    
    if (matches && repoContext.all_files && Array.isArray(repoContext.all_files)) {
      // Validate each file reference
      matches.forEach(match => {
        const filename = match.replace(/`/g, '');
        const exists = repoContext.all_files.some(f =>
          f?.path?.includes(filename) || filename.includes(f?.path?.split('/').pop())
        );
        
        if (!exists) {
          console.warn(`⚠️ AI mentioned file that may not exist: ${filename}`);
        }
      });
    }
    
    // Check for hallucination indicators
    const hallucinations = [
      /I can see in the code/i,
      /Looking at the implementation/i,
      /The code shows/i
    ];
    
    const mightBeHallucinating = hallucinations.some(pattern => pattern.test(response));
    
    if (mightBeHallucinating && !matches) {
      console.warn('⚠️ AI might be hallucinating - no file references but claims to see code');
    }
    
    return response;
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
    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    // Add realistic delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      // PHASE 2: Check cache first
      const cached = responseCache.get(currentInput);
      if (cached) {
        console.log('✅ Cache hit! Returning cached response');
        const botMessage = {
          id: Date.now() + 1,
          text: cached,
          sender: 'bot',
          timestamp: Date.now(),
          intent: detectIntent(currentInput),
          cached: true
        };
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
        return;
      }
      
      // PHASE 1: Detect intent
      const intent = detectIntent(currentInput);
      console.log(`🎯 Detected intent: ${intent}`);
      
      // PHASE 2: Build dynamic context with relevant files
      const dynamicContext = buildDynamicContext(currentInput, repoContext);
      
      // PHASE 2: Build structured prompt
      const prompt = buildStructuredPrompt(currentInput, intent, dynamicContext, messages);
      
      // Call watsonx.ai
      const response = await generateText(prompt, {
        maxNewTokens: 350,
        temperature: 0.7,
        topP: 0.9
      });

      // Clean markdown formatting from response
      const cleanedResponse = cleanMarkdown(response);

      // PHASE 2: Validate structured response
      const validation = validateStructuredResponse(cleanedResponse, repoContext);
      if (!validation.valid) {
        console.warn('⚠️ Response validation issues:', validation.issues);
      }

      // PHASE 1: Validate response
      const validatedResponse = validateResponse(cleanedResponse);

      // PHASE 2: Cache the response
      responseCache.set(currentInput, validatedResponse);
      console.log('💾 Response cached. Cache stats:', responseCache.getStats());

      const botMessage = {
        id: Date.now() + 1,
        text: validatedResponse,
        sender: 'bot',
        timestamp: Date.now(),
        intent: intent,
        cached: false
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
        <div className="chat-header-section">
          <h2 className="card-title">💬 Chat with AI Assistant</h2>
          <p className="chat-powered-by">
            Powered by <span className="watsonx-highlight">watsonx AI</span>
          </p>
        </div>
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
                      {message.intent && (
                        <span className="intent-badge">{message.intent}</span>
                      )}
                      {message.cached && (
                        <span className="cache-badge" title="Cached response - instant reply!">⚡</span>
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
                      <span className="typing-text">Analyzing with watsonx AI</span>
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
        <h3 className="card-title">🎯 Quick Actions</h3>
        <div className="card-content">
          <div className="intent-presets">
            <button 
              className="intent-preset-chip explain"
              onClick={() => handleSuggestionClick("Explain how this project works")}
              disabled={isTyping}
              title="Get explanations about the codebase"
            >
              📖 Explain
            </button>
            <button 
              className="intent-preset-chip debug"
              onClick={() => handleSuggestionClick("Help me debug an issue")}
              disabled={isTyping}
              title="Get help fixing bugs and errors"
            >
              🐛 Debug
            </button>
            <button 
              className="intent-preset-chip improve"
              onClick={() => handleSuggestionClick("Suggest improvements for the code")}
              disabled={isTyping}
              title="Get optimization suggestions"
            >
              ⚡ Improve
            </button>
            <button 
              className="intent-preset-chip setup"
              onClick={() => handleSuggestionClick("How do I set up this project?")}
              disabled={isTyping}
              title="Get setup and installation help"
            >
              🛠️ Setup
            </button>
            <button 
              className="intent-preset-chip find"
              onClick={() => handleSuggestionClick("Where can I find specific functionality?")}
              disabled={isTyping}
              title="Locate files and features"
            >
              🔍 Find
            </button>
            <button 
              className="intent-preset-chip security"
              onClick={() => handleSuggestionClick("Check for security issues")}
              disabled={isTyping}
              title="Security analysis and recommendations"
            >
              🔒 Security
            </button>
            <button 
              className="intent-preset-chip architecture"
              onClick={() => handleSuggestionClick("Explain the architecture")}
              disabled={isTyping}
              title="Understand system design and structure"
            >
              🏗️ Architecture
            </button>
            <button 
              className="intent-preset-chip general"
              onClick={() => handleSuggestionClick("Tell me about this repository")}
              disabled={isTyping}
              title="General questions about the project"
            >
              💬 General
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
