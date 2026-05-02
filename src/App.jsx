import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Header from './components/Header';
import InputSection from './components/InputSection';
import LoadingSpinner from './components/LoadingSpinner';
import TabNavigation from './components/TabNavigation';
import TimeSavedBadge from './components/TimeSavedBadge';
import DownloadPDFButton from './components/DownloadPDFButton';
import Footer from './components/Footer';

// Tab Content Components
import Summary from './components/TabContent/Summary';
import Architecture from './components/TabContent/Architecture';
import OnboardingGuide from './components/TabContent/OnboardingGuide';
import Documentation from './components/TabContent/Documentation';
import SecurityScanner from './components/TabContent/SecurityScanner';
import Chat from './components/TabContent/Chat';

// GitHub Service
import { analyzeRepository } from './services/githubService';

// Watsonx.ai Service
import { generateText } from './services/watsonxService';

function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [previousUrl, setPreviousUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [repoSize, setRepoSize] = useState(0);
  const [repoData, setRepoData] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [quickStartGuide, setQuickStartGuide] = useState('');
  const [isQuickStartLoading, setIsQuickStartLoading] = useState(false);
  const [commonIssues, setCommonIssues] = useState('');
  const [isIssuesLoading, setIsIssuesLoading] = useState(false);
  const [firstContributions, setFirstContributions] = useState([]);
  const [isContributionsLoading, setIsContributionsLoading] = useState(false);
  const [architectureAnalysis, setArchitectureAnalysis] = useState(null);
  const [isArchitectureLoading, setIsArchitectureLoading] = useState(false);
  const [architectureError, setArchitectureError] = useState(null);
  const resultsRef = useRef(null);

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'onboarding', label: 'Onboarding Guide' },
    { id: 'documentation', label: 'Documentation' },
    { id: 'security', label: 'Security Scanner' },
    { id: 'chat', label: 'Chat' }
  ];

  // Helper function to prepare input for watsonx.ai
  const prepareAIInput = (repoData) => {
    const { repoInfo, readme, fileTree } = repoData;
    
    // Truncate README to 3000 characters to avoid token limits
    const truncatedReadme = readme && readme !== 'No README found'
      ? readme.substring(0, 3000) + (readme.length > 3000 ? '...' : '')
      : 'No README available';
    
    // Format file structure (top-level files and folders only)
    const topLevelItems = fileTree
      .filter(path => !path.includes('/') || path.split('/').length <= 2)
      .slice(0, 30); // Limit to 30 items
    
    const fileStructure = topLevelItems.join('\n');
    
    return `
Repository: ${repoInfo.name}
Description: ${repoInfo.description}
Primary Language: ${repoInfo.language}
Stars: ${repoInfo.stars}

README Content:
${truncatedReadme}

File Structure (top-level):
${fileStructure}
    `.trim();
  };

  // Helper function to prepare concise input for architecture analysis
  const prepareArchitectureInput = (repoData) => {
    const { repoInfo, techStack, importantFiles, readme } = repoData;
    
    // Get only file names, not content
    const keyFileNames = importantFiles.map(f => f.path).join(', ');
    
    // Get tech stack as comma-separated list
    const allTech = Object.values(techStack).flat().join(', ');
    
    // Short README snippet (first 500 chars)
    const readmeSnippet = readme && readme !== 'No README found'
      ? readme.substring(0, 500)
      : 'No README available';
    
    return `
Repository: ${repoInfo.name}
Description: ${repoInfo.description}
Primary Language: ${repoInfo.language}
Tech Stack: ${allTech || 'Not detected'}
Key Files: ${keyFileNames}

README Snippet:
${readmeSnippet}
    `.trim();
  };

  // Reset logic when URL changes
  useEffect(() => {
    if (repoUrl !== previousUrl && previousUrl !== '') {
      setAnalysisComplete(false);
      setActiveTab('summary');
      setError(null);
      setSuccessMessage('');
      setAiSummary('');
      setSummaryError(null);
      setQuickStartGuide('');
      setCommonIssues('');
      setFirstContributions([]);
      setArchitectureAnalysis(null);
      setArchitectureError(null);
    }
    setPreviousUrl(repoUrl);
  }, [repoUrl, previousUrl]);

  // Smooth scroll to results after analysis completes
  useEffect(() => {
    if (analysisComplete && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, [analysisComplete]);

  // Test watsonx.ai integration on component mount
  useEffect(() => {
    const testWatsonxIntegration = async () => {
      try {
        console.log('🧪 Testing watsonx.ai integration...');
        const response = await generateText('Say hello in one sentence');
        console.log('✅ Watsonx.ai Response:', response);
      } catch (error) {
        console.error('❌ Watsonx.ai Test Failed:', error.message);
      }
    };
    
    testWatsonxIntegration();
  }, []); // Run once on mount

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) return;
    
    setIsAnalyzing(true);
    setAnalysisComplete(false);
    setError(null);
    setSuccessMessage('');
    setAiSummary('');
    setSummaryError(null);
    setQuickStartGuide('');
    
    try {
      // Step 1: Analyze repository using GitHub service
      const data = await analyzeRepository(repoUrl);
      
      if (data.error) {
        setError(data.error);
        setIsAnalyzing(false);
        return;
      }
      
      setRepoData(data);
      setRepoSize(data.fileTree.length);
      setSuccessMessage('Repository analyzed successfully! ✓');
      setAnalysisComplete(true);
      setActiveTab('summary');
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      
      // Step 2: Generate AI summary using watsonx.ai
      setIsSummaryLoading(true);
      try {
        const aiInput = prepareAIInput(data);
        const prompt = `You are a developer onboarding assistant. Analyze this GitHub repository and provide a plain English summary covering:
- What this project does
- Who it is for
- The main technology stack
- The most important things a new developer should know

Keep it clear, structured, and concise. Do not include unnecessary text.

${aiInput}`;

        const generatedSummary = await generateText(prompt, {
          maxNewTokens: 500,
          temperature: 0.7
        });
        
        setAiSummary(generatedSummary);
      } catch (summaryErr) {
        console.error('AI Summary generation failed:', summaryErr);
        setSummaryError(summaryErr.message || 'Failed to generate AI summary');
      } finally {
        setIsSummaryLoading(false);
      }
      
      // Step 3: Generate Quick Start Guide using watsonx.ai
      setIsQuickStartLoading(true);
      try {
        const packageJson = data.importantFiles.find(f => f.path === 'package.json');
        const hasPackageJson = packageJson && !packageJson.error;
        
        const quickStartPrompt = `Generate a concise Quick Start Guide for this repository. Include:
1. Prerequisites (Node.js version, etc.)
2. Installation steps
3. Configuration (environment variables)
4. How to run the project
5. Common commands

Repository: ${data.repoInfo.name}
Language: ${data.repoInfo.language}
${hasPackageJson ? 'Has package.json with dependencies' : 'No package.json found'}

Keep it practical and actionable. Use numbered steps.`;

        const quickStart = await generateText(quickStartPrompt, {
          maxNewTokens: 400,
          temperature: 0.5
        });
        
        setQuickStartGuide(quickStart);
      } catch (quickStartErr) {
        console.error('Quick Start generation failed:', quickStartErr);
      } finally {
        setIsQuickStartLoading(false);
      }
      
      // Step 4: Generate Common Issues & Solutions using watsonx.ai
      setIsIssuesLoading(true);
      try {
        const issuesPrompt = `Based on this repository, identify 3-4 common setup issues that new developers might face and provide solutions:

Repository: ${data.repoInfo.name}
Language: ${data.repoInfo.language}
Has ${data.envVariables?.length || 0} environment variables

Common categories:
- Missing environment variables
- Dependency installation problems
- Port conflicts
- Database connection issues
- Permission errors

Format as: "Issue: [problem] → Solution: [fix]"`;

        const issues = await generateText(issuesPrompt, {
          maxNewTokens: 400,
          temperature: 0.6
        });
        
        setCommonIssues(issues);
      } catch (issuesErr) {
        console.error('Common Issues generation failed:', issuesErr);
      } finally {
        setIsIssuesLoading(false);
      }
      
      // Step 5: Generate First Contribution Suggestions using watsonx.ai
      setIsContributionsLoading(true);
      try {
        const contributionsPrompt = `Analyze this repository and suggest 3-5 beginner-friendly tasks that a new developer could tackle as their first contribution. Be specific and actionable.

Repository: ${data.repoInfo.name}
Language: ${data.repoInfo.language}
Tech Stack: ${Object.values(data.techStack || {}).flat().join(', ')}
Has ${data.importantFiles?.length || 0} key files

Suggest tasks like:
- Add missing error handling in specific files
- Write unit tests for untested functions
- Improve documentation for complex functions
- Add input validation
- Refactor repetitive code patterns

IMPORTANT: Write in plain text only. Format each suggestion as:
"Task: [specific task]
File: [filename]
Difficulty: [Easy/Medium]
Impact: [why this matters]"

Provide 3-5 suggestions.`;

        const suggestions = await generateText(contributionsPrompt, {
          maxNewTokens: 600,
          temperature: 0.7
        });
        
        // Parse the suggestions into structured format
        const parsedSuggestions = parseSuggestions(suggestions);
        setFirstContributions(parsedSuggestions);
      } catch (contributionsErr) {
        console.error('First Contributions generation failed:', contributionsErr);
      } finally {
        setIsContributionsLoading(false);
      }
      
      // Step 6: Generate Architecture Analysis using watsonx.ai
      setIsArchitectureLoading(true);
      try {
        const architectureInput = prepareArchitectureInput(data);
        const architecturePrompt = `You are a software architect. Analyze this repository and provide:

1. Component breakdown – major modules and their roles
2. Technology architecture – frontend, backend, database, APIs
3. Data flow – how data moves through the system
4. Key dependencies and their purpose
5. Folder structure explanation – what each main folder contains

${architectureInput}

Keep response structured, concise, and easy to scan using bullet points.`;

        const architectureResponse = await generateText(architecturePrompt, {
          maxNewTokens: 600,
          temperature: 0.6
        });
        
        setArchitectureAnalysis(architectureResponse);
      } catch (architectureErr) {
        console.error('Architecture analysis generation failed:', architectureErr);
        setArchitectureError(architectureErr.message || 'Failed to generate architecture analysis');
      } finally {
        setIsArchitectureLoading(false);
      }
      
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper function to parse AI suggestions into structured format
  const parseSuggestions = (text) => {
    const suggestions = [];
    const blocks = text.split(/Task:/i).filter(b => b.trim());
    
    blocks.forEach((block, index) => {
      const lines = block.trim().split('\n');
      const task = lines[0]?.trim() || `Contribution ${index + 1}`;
      const file = lines.find(l => l.toLowerCase().includes('file:'))?.split(':')[1]?.trim() || 'Various files';
      const difficulty = lines.find(l => l.toLowerCase().includes('difficulty:'))?.split(':')[1]?.trim() || 'Medium';
      const impact = lines.find(l => l.toLowerCase().includes('impact:'))?.split(':')[1]?.trim() || 'Improves code quality';
      
      suggestions.push({ task, file, difficulty, impact });
    });
    
    return suggestions.slice(0, 5); // Limit to 5 suggestions
  };

  const handleQuickOnboard = () => {
    if (!repoUrl.trim()) return;
    
    setIsAnalyzing(true);
    setAnalysisComplete(false);
    
    // Simulate quick onboarding
    setTimeout(() => {
      const randomSize = Math.floor(Math.random() * 500) + 100;
      setRepoSize(randomSize);
      setIsAnalyzing(false);
      setAnalysisComplete(true);
      setActiveTab('onboarding');
    }, 2500);
  };

  const handleDownloadPDF = () => {
    alert('PDF Report download would start here (UI only - no backend)');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <Summary
            repoUrl={repoUrl}
            repoSize={repoSize}
            repoData={repoData}
            aiSummary={aiSummary}
            isSummaryLoading={isSummaryLoading}
            summaryError={summaryError}
            quickStartGuide={quickStartGuide}
            isQuickStartLoading={isQuickStartLoading}
            commonIssues={commonIssues}
            isIssuesLoading={isIssuesLoading}
            firstContributions={firstContributions}
            isContributionsLoading={isContributionsLoading}
          />
        );
      case 'architecture':
        return (
          <Architecture
            repoData={repoData}
            architectureAnalysis={architectureAnalysis}
            isArchitectureLoading={isArchitectureLoading}
            architectureError={architectureError}
          />
        );
      case 'onboarding':
        return <OnboardingGuide />;
      case 'documentation':
        return <Documentation />;
      case 'security':
        return <SecurityScanner />;
      case 'chat':
        return <Chat />;
      default:
        return <Summary repoUrl={repoUrl} repoSize={repoSize} repoData={repoData} />;
    }
  };

  return (
    <div className="app">
      <Header />
      
      <main className="main-content">
        <div className="single-column">
          {!analysisComplete && !isAnalyzing && (
            <div className="empty-state">
              <div className="empty-state-icon">🚢</div>
              <h2 className="empty-state-title">Understand Any Codebase in Minutes</h2>
              <p className="empty-state-subtitle">
                Paste a GitHub repository URL and get instant AI-powered insights
              </p>
              <div className="empty-state-features">
                <div className="feature-item">
                  <span className="feature-icon">⚡</span>
                  <span className="feature-text">AI-powered analysis</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📚</span>
                  <span className="feature-text">Interactive onboarding</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🔒</span>
                  <span className="feature-text">Security scanning</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">💬</span>
                  <span className="feature-text">Live chat support</span>
                </div>
              </div>
              <p className="empty-state-cta">👇 Get Started Below</p>
            </div>
          )}

          <InputSection
            repoUrl={repoUrl}
            onUrlChange={setRepoUrl}
            onAnalyze={handleAnalyze}
            onQuickOnboard={handleQuickOnboard}
            isAnalyzing={isAnalyzing}
            disabled={isAnalyzing}
          />

          {/* Success Message Banner */}
          {successMessage && (
            <div className="message-banner success-banner">
              {successMessage}
            </div>
          )}

          {/* Error Message Banner */}
          {error && (
            <div className="message-banner error-banner">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
              <button
                className="retry-button"
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          <LoadingSpinner isVisible={isAnalyzing} />

          {analysisComplete && (
            <div ref={resultsRef} className="results-section">
              <div className="results-header">
                <TimeSavedBadge repoSize={repoSize} isVisible={analysisComplete} />
                <DownloadPDFButton
                  isVisible={analysisComplete}
                  onClick={handleDownloadPDF}
                />
              </div>

              <TabNavigation
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />

              <div className="tab-content-wrapper">
                {renderTabContent()}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;

// Made with Bob

