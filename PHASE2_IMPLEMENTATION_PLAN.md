# Phase 2 Implementation Plan - Advanced Context & Memory

## Overview
Phase 2 focuses on making the AI assistant smarter by dynamically selecting relevant files, extracting code snippets, implementing caching, and improving response structure.

## Goals
- **Dynamic Context**: Select relevant files based on user questions
- **Code Intelligence**: Extract and include actual code snippets
- **Performance**: Cache responses for faster replies
- **Structure**: Enforce consistent, high-quality response format

---

## 1. Dynamic File Selection Based on Question

### Objective
Instead of always using the same 4 key files, intelligently select the most relevant files for each question.

### Implementation Strategy

#### A. Keyword Extraction
```javascript
function extractKeywords(question) {
  // Remove common words
  const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'how', 'what', 'where'];
  
  // Extract meaningful words
  const words = question.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.includes(w));
  
  return words;
}
```

#### B. File Relevance Scoring
```javascript
function scoreFileRelevance(file, keywords) {
  let score = 0;
  const fileName = file.path.toLowerCase();
  
  // Check filename matches
  keywords.forEach(keyword => {
    if (fileName.includes(keyword)) {
      score += 10;
    }
  });
  
  // Check file type relevance
  if (keywords.includes('auth') && fileName.includes('auth')) score += 20;
  if (keywords.includes('api') && fileName.includes('api')) score += 20;
  if (keywords.includes('config') && fileName.includes('config')) score += 15;
  
  return score;
}
```

#### C. Dynamic File Selection
```javascript
function selectRelevantFiles(question, allFiles, maxFiles = 4) {
  const keywords = extractKeywords(question);
  
  // Score all files
  const scoredFiles = allFiles.map(file => ({
    file,
    score: scoreFileRelevance(file, keywords)
  }));
  
  // Sort by score and take top N
  return scoredFiles
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFiles)
    .map(sf => sf.file);
}
```

### Benefits
- More relevant context for each question
- Better answers with specific file references
- Reduced token usage (only relevant files)

---

## 2. Code Snippet Extraction and Inclusion

### Objective
Extract actual code snippets from relevant files and include them in the AI context.

### Implementation Strategy

#### A. Code Snippet Extractor
```javascript
async function extractCodeSnippet(filePath, searchTerm, contextLines = 5) {
  try {
    const fileContent = await readFileContent(filePath);
    const lines = fileContent.split('\n');
    
    // Find matching lines
    const matches = [];
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
        // Get context around match
        const start = Math.max(0, index - contextLines);
        const end = Math.min(lines.length, index + contextLines + 1);
        
        matches.push({
          lineNumber: index + 1,
          snippet: lines.slice(start, end).join('\n'),
          context: `Lines ${start + 1}-${end}`
        });
      }
    });
    
    return matches;
  } catch (error) {
    console.error(`Error extracting snippet from ${filePath}:`, error);
    return [];
  }
}
```

#### B. Smart Snippet Selection
```javascript
async function getRelevantCodeSnippets(question, relevantFiles) {
  const keywords = extractKeywords(question);
  const snippets = [];
  
  for (const file of relevantFiles.slice(0, 2)) { // Top 2 files only
    for (const keyword of keywords.slice(0, 2)) { // Top 2 keywords
      const matches = await extractCodeSnippet(file.path, keyword, 3);
      if (matches.length > 0) {
        snippets.push({
          file: file.path,
          keyword,
          snippet: matches[0] // Take first match
        });
      }
    }
  }
  
  return snippets.slice(0, 2); // Max 2 snippets
}
```

#### C. Include in Context
```javascript
function buildContextWithSnippets(repoContext, snippets) {
  let context = `Repository: ${repoContext.repo_name}\n`;
  context += `Tech Stack: ${repoContext.tech_stack}\n\n`;
  
  if (snippets.length > 0) {
    context += `RELEVANT CODE SNIPPETS:\n\n`;
    snippets.forEach(s => {
      context += `File: ${s.file} (${s.context})\n`;
      context += `\`\`\`\n${s.snippet}\n\`\`\`\n\n`;
    });
  }
  
  return context;
}
```

### Benefits
- AI sees actual code, not just file names
- More accurate answers about implementation
- Better debugging assistance

---

## 3. Response Caching System

### Objective
Cache responses to common questions for faster replies and reduced API costs.

### Implementation Strategy

#### A. Cache Structure
```javascript
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
```

#### B. Integration with Chat
```javascript
const responseCache = new ResponseCache();

async function getChatResponse(question, context) {
  // Check cache first
  const cached = responseCache.get(question);
  if (cached) {
    console.log('✅ Cache hit!');
    return cached;
  }
  
  // Generate new response
  const response = await generateText(buildPrompt(question, context));
  
  // Cache it
  responseCache.set(question, response);
  
  return response;
}
```

### Benefits
- 50-70% faster responses for common questions
- Reduced API costs
- Better user experience

---

## 4. Structured Output Formatting

### Objective
Enforce consistent, high-quality response format from watsonx.ai.

### Implementation Strategy

#### A. Enhanced System Prompt with Format
```javascript
function buildStructuredPrompt(question, context, intent) {
  return `${getRoleBasedPrompt(intent)}

${context}

STRICT RESPONSE FORMAT:
1. **Direct Answer** (2-3 sentences max)
   - Start with the core answer
   - Be specific and concise

2. **File References** (if applicable)
   - Format: \`filename.ext\` or \`folder/filename.ext\`
   - Include line numbers if relevant: \`file.js:42\`

3. **Code Example** (if relevant)
   - Use proper code blocks with language
   - Keep examples short (5-10 lines max)

4. **Follow-up Question**
   - End with: 💡 You might also want to ask: [specific question]

USER QUESTION: ${question}

RESPONSE:`;
}
```

#### B. Response Parser
```javascript
function parseStructuredResponse(response) {
  const sections = {
    answer: '',
    files: [],
    code: '',
    followUp: ''
  };
  
  // Extract direct answer (first paragraph)
  const paragraphs = response.split('\n\n');
  sections.answer = paragraphs[0];
  
  // Extract file references
  const filePattern = /`([^`]+\.(js|jsx|ts|tsx|py|java|go|rs|json|md|yml|yaml|xml|html|css)(?::\d+)?)`/gi;
  sections.files = [...response.matchAll(filePattern)].map(m => m[1]);
  
  // Extract code blocks
  const codePattern = /```(\w+)?\n([\s\S]*?)```/g;
  const codeMatch = codePattern.exec(response);
  if (codeMatch) {
    sections.code = codeMatch[2];
  }
  
  // Extract follow-up question
  const followUpPattern = /💡.*?:\s*(.+?)(?:\n|$)/;
  const followUpMatch = response.match(followUpPattern);
  if (followUpMatch) {
    sections.followUp = followUpMatch[1];
  }
  
  return sections;
}
```

#### C. Response Validator
```javascript
function validateStructuredResponse(response) {
  const issues = [];
  
  // Check length
  if (response.length > 800) {
    issues.push('Response too long (>800 chars)');
  }
  
  // Check for follow-up question
  if (!response.includes('💡')) {
    issues.push('Missing follow-up question');
  }
  
  // Check for file references when discussing code
  const codeKeywords = ['function', 'class', 'component', 'file', 'code'];
  const hasCodeKeywords = codeKeywords.some(k => response.toLowerCase().includes(k));
  const hasFileRefs = /`[^`]+\.(js|jsx|ts|tsx|py|java)`/.test(response);
  
  if (hasCodeKeywords && !hasFileRefs) {
    issues.push('Discussing code but no file references');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}
```

### Benefits
- Consistent response quality
- Easier to parse and display
- Better user experience

---

## 5. Integration Plan

### Step 1: Add Helper Functions
```javascript
// Add to Chat.jsx
const responseCache = new ResponseCache();

function extractKeywords(question) { /* ... */ }
function scoreFileRelevance(file, keywords) { /* ... */ }
function selectRelevantFiles(question, allFiles) { /* ... */ }
async function extractCodeSnippet(filePath, searchTerm) { /* ... */ }
async function getRelevantCodeSnippets(question, files) { /* ... */ }
```

### Step 2: Update Message Handler
```javascript
const handleSendMessage = async () => {
  // ... existing code ...
  
  try {
    // Check cache first
    const cached = responseCache.get(currentInput);
    if (cached) {
      const botMessage = {
        id: Date.now() + 1,
        text: cached,
        sender: 'bot',
        timestamp: Date.now(),
        intent: intent,
        cached: true
      };
      setMessages(prev => [...prev, botMessage]);
      return;
    }
    
    // Select relevant files dynamically
    const relevantFiles = selectRelevantFiles(
      currentInput, 
      repoData.importantFiles
    );
    
    // Extract code snippets
    const snippets = await getRelevantCodeSnippets(
      currentInput, 
      relevantFiles
    );
    
    // Build enhanced context
    const enhancedContext = buildContextWithSnippets(
      repoContext, 
      snippets
    );
    
    // Build structured prompt
    const prompt = buildStructuredPrompt(
      currentInput, 
      enhancedContext, 
      intent
    );
    
    // Generate response
    const response = await generateText(prompt);
    
    // Validate response
    const validation = validateStructuredResponse(response);
    if (!validation.valid) {
      console.warn('Response validation issues:', validation.issues);
    }
    
    // Cache response
    responseCache.set(currentInput, response);
    
    // Add to messages
    const botMessage = {
      id: Date.now() + 1,
      text: response,
      sender: 'bot',
      timestamp: Date.now(),
      intent: intent,
      cached: false
    };
    
    setMessages(prev => [...prev, botMessage]);
  } catch (error) {
    // ... error handling ...
  }
};
```

### Step 3: Add Visual Indicators
```jsx
// Show cache indicator
{message.cached && (
  <span className="cache-badge" title="Cached response">⚡ Cached</span>
)}
```

---

## Testing Strategy

### Test Cases

1. **Dynamic File Selection**
   - Question: "How does authentication work?"
   - Expected: Should select auth-related files
   - Verify: Check console logs for selected files

2. **Code Snippet Extraction**
   - Question: "Show me the login function"
   - Expected: Should include actual login code
   - Verify: Response contains code block

3. **Response Caching**
   - Ask same question twice
   - Expected: Second response instant with cache badge
   - Verify: Console shows "Cache hit!"

4. **Structured Format**
   - Any question
   - Expected: Response has answer, files, and follow-up
   - Verify: All sections present

---

## Performance Metrics

### Expected Improvements
- **Response Time**: 2-3s → 0.5-2s (with caching)
- **Cache Hit Rate**: Target 40-50% for common questions
- **Context Relevance**: 70% → 90%
- **Code Reference Accuracy**: 40% → 85%

### Monitoring
```javascript
// Add analytics
function logChatMetrics(question, response, cached, duration) {
  console.log({
    timestamp: Date.now(),
    question: question.substring(0, 50),
    responseLength: response.length,
    cached,
    duration,
    intent: detectIntent(question)
  });
}
```

---

## Implementation Timeline

1. **Dynamic File Selection** - 30 minutes
2. **Code Snippet Extraction** - 45 minutes
3. **Response Caching** - 30 minutes
4. **Structured Output** - 45 minutes
5. **Testing & Refinement** - 30 minutes

**Total Estimated Time**: 3 hours

---

## Success Criteria

✅ Dynamic file selection working for all question types
✅ Code snippets extracted and included in context
✅ Cache hit rate >40% after 20 questions
✅ All responses follow structured format
✅ Response validation catches format issues
✅ Performance improvement measurable

---

## Next Steps

After Phase 2 completion, we'll move to Phase 3:
- Streaming responses for real-time feedback
- Multi-model strategy for different tasks
- Advanced code search integration
- Conversation summarization for long chats