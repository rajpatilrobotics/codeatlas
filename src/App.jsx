import React, { useState, useEffect, useRef } from 'react';
import './styles/tokens.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/command-center.css';
import './App.css';
import './styles/matte-overrides.css';
import './components/Homepage/Homepage.css';
import LoadingSpinner from './components/LoadingSpinner';
import ScrollToTopButton from './components/ScrollToTopButton';
import Footer from './components/Footer';
import AppShell from './components/layout/AppShell';
import PageHeader from './components/layout/PageHeader';
import LandingHeader from './components/layout/LandingHeader';
import { downloadRepositoryReportPdf } from './services/pdf/pdfReportService';

// Homepage Components
import HeroSection from './components/Homepage/HeroSection';
import ImpactComparison from './components/Homepage/ImpactComparison';
import HowItWorks from './components/Homepage/HowItWorks';
import CTASection from './components/Homepage/CTASection';

// Tab Content Components
import Summary from './components/TabContent/Summary';
import ArchitectureV2 from './components/TabContent/ArchitectureV2';
import OnboardingGuide from './components/TabContent/OnboardingGuide';
import Documentation from './components/TabContent/Documentation';
import SecurityScanner from './components/TabContent/SecurityScanner';
import Chat from './components/TabContent/Chat';

// Dashboard & future feature pages
import Dashboard from './components/pages/Dashboard';
import Planner from './components/pages/Planner';
import RepositoryGraph from './components/pages/RepositoryGraph';
import BlastRadius from './components/pages/BlastRadius';
import DebugNavigator from './components/pages/DebugNavigator';
import Heatmap from './components/pages/Heatmap';
import SavedWorkspaces from './components/pages/SavedWorkspaces';

// GitHub Service
import { analyzeRepository, analyzeArchitecture, parseGitHubUrl } from './services/githubService';
import {
  getRecentRepos,
  addRecentRepo,
  clearRecentRepos,
  normalizeRepoUrl,
} from './utils/recentRepos';

// AI Content Service - Generates real AI content based on repository context
// Note: AI functions now called via API endpoints to access server-side environment variables

// Code Analysis Service
import { codeAnalysisService } from './services/codeAnalysisService';

// Text Formatting Utilities
import { CLEAN_OUTPUT_RULES, cleanMarkdown } from './utils/textFormatting';

function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [previousUrl, setPreviousUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
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
  const [detailedArchitecture, setDetailedArchitecture] = useState(null);
  const [codeAnalysis, setCodeAnalysis] = useState(null);
  const [isCodeAnalysisLoading, setIsCodeAnalysisLoading] = useState(false);
  const [codeAnalysisError, setCodeAnalysisError] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');
  const [recentRepos, setRecentRepos] = useState(() => getRecentRepos());
  const [lastAnalyzedRepoUrl, setLastAnalyzedRepoUrl] = useState('');
  const resultsRef = useRef(null);

  // Helper function to prepare input for AI
  const prepareAIInput = (repoData) => {
    const { repoInfo, readme } = repoData;
    
    // Truncate README to 1000 characters for faster processing
    const truncatedReadme = readme && readme !== 'No README found'
      ? readme.substring(0, 1000) + (readme.length > 1000 ? '...' : '')
      : 'No README available';
    
    return `
Repository: ${repoInfo.name}
Description: ${repoInfo.description}
Primary Language: ${repoInfo.language}
Stars: ${repoInfo.stars}

README Content:
${truncatedReadme}
    `.trim();
  };

  // Helper function to prepare concise input for architecture analysis
  const prepareArchitectureInput = (repoData) => {
    const { repoInfo, techStack, importantFiles, readme } = repoData;
    
    // Get only file names, not content
    const keyFileNames = importantFiles.map(f => f.path).join(', ');
    
    // Get tech stack as comma-separated list with null safety
    const allTech = techStack && typeof techStack === 'object'
      ? Object.values(techStack).flat().join(', ')
      : 'Not detected';
    
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

  const prepareCompactCodeAnalysis = (analysis) => {
    if (!analysis) return null;

    return {
      summary: analysis.summary,
      security: analysis.security,
      definitions: {
        functions: (analysis.definitions?.functions || []).slice(0, 25),
        classes: (analysis.definitions?.classes || []).slice(0, 25),
        exports: (analysis.definitions?.exports || []).slice(0, 25)
      },
      files: (analysis.files || []).slice(0, 25).map(file => ({
        path: file.path,
        size: file.size,
        lines: file.lines,
        patterns: file.patterns,
        security: file.security,
        definitions: file.definitions
      }))
    };
  };

  // Seed recent list for sessions started before this feature
  useEffect(() => {
    if (!analysisComplete || !repoUrl.trim()) return;
    const normalized = normalizeRepoUrl(repoUrl);
    if (!normalized) return;
    if (!lastAnalyzedRepoUrl) {
      setLastAnalyzedRepoUrl(normalized);
    }
    if (recentRepos.length === 0) {
      setRecentRepos(addRecentRepo(normalized));
    }
  }, [analysisComplete, repoUrl, lastAnalyzedRepoUrl, recentRepos.length]);

  // Reset logic when URL changes
  useEffect(() => {
    if (repoUrl !== previousUrl && previousUrl !== '') {
      setAnalysisComplete(false);
      setActiveTab('dashboard');
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

const handleAnalyze = async (urlOverride) => {
  const targetUrl = (urlOverride ?? repoUrl).trim();
  if (!targetUrl) return;

  if (urlOverride) {
    setRepoUrl(targetUrl);
  }

  setIsAnalyzing(true);
  setAnalysisComplete(false);
  setError(null);
  setSuccessMessage('');
  setAiSummary('');
  setSummaryError(null);
  setQuickStartGuide('');
  setCommonIssues('');
  setFirstContributions([]);
  setArchitectureAnalysis(null);
  setArchitectureError(null);
  setDetailedArchitecture(null);
  setCodeAnalysis(null);
  setCodeAnalysisError(null);
  setIsSummaryLoading(false);
  setIsQuickStartLoading(false);
  setIsIssuesLoading(false);
  setIsContributionsLoading(false);
  setIsArchitectureLoading(false);
  setIsCodeAnalysisLoading(false);

  try {
    // Step 1: Analyze repository (cloning & parsing)
    const data = await analyzeRepository(targetUrl);
    if (data.error) {
      setError(data.error);
      setIsAnalyzing(false);
      return;
    }

    console.log('[DEBUG] App.jsx: setRepoData called with data:', {
      hasDependencyGraph: !!data.dependencyGraph,
      dependencyGraphNodes: data.dependencyGraph?.nodes?.length || 0,
      dependencyGraphEdges: data.dependencyGraph?.edges?.length || 0,
      analysisTiming: data.analysisTiming,
      dataKeys: Object.keys(data),
      sampleNode: data.dependencyGraph?.nodes?.[0]
    });
    
    setRepoData(data);
    setRepoSize(data.fileTree.length);
    const timingText = data.analysisTiming?.display ? ` in ${data.analysisTiming.display}` : '';
    setSuccessMessage(`Repository analyzed successfully${timingText}! ✓`);
    setAnalysisComplete(true);
    setActiveTab('dashboard');

    const normalized = normalizeRepoUrl(targetUrl);
    if (normalized) {
      setLastAnalyzedRepoUrl(normalized);
      setRecentRepos(addRecentRepo(normalized));
    }

    // Auto‑hide success message
    setTimeout(() => setSuccessMessage(''), 5000);

    // Step 2: Detect architecture
    setIsArchitectureLoading(true);
    try {
      const detailed = await analyzeArchitecture(data);
      setDetailedArchitecture(detailed);
    } catch (archErr) {
      console.error('Architecture detection failed:', archErr);
      setArchitectureError(archErr.message || 'Failed to detect architecture');
    } finally {
      setIsArchitectureLoading(false);
    }

    // Step 3: Build dependency graph & run security analysis (deep code analysis)
    setIsCodeAnalysisLoading(true);
    setCodeAnalysisError(null);
    let analysisResult = null; // expose to outer scope
    try {
      const parsed = parseGitHubUrl(targetUrl);
      if (!parsed) throw new Error('Invalid GitHub URL');
      const { owner, repo } = parsed;

      analysisResult = await codeAnalysisService.analyzeRepository(
        owner,
        repo,
        data.importantFiles,
        null
      );
      setCodeAnalysis(analysisResult);
    } catch (codeErr) {
      console.error('Code analysis failed:', codeErr);
      setCodeAnalysisError(codeErr.message || 'Failed to perform code analysis');
    } finally {
      setIsCodeAnalysisLoading(false);
    }

    // Step 4: Generate AI insights (summary, quick‑start, issues, contributions)
    // Summary
    setIsSummaryLoading(true);
    try {
      const response = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoData: data })
      });
      const result = await response.json();
      if (result.success) {
        setAiSummary(result.summary);
      } else {
        throw new Error(result.error || 'Failed to generate AI summary');
      }
    } catch (summaryErr) {
      console.error('AI Summary generation failed:', summaryErr);
      setSummaryError(summaryErr.message || 'Failed to generate AI summary');
    } finally {
      setIsSummaryLoading(false);
    }

    // Quick Start
    setIsQuickStartLoading(true);
    try {
      const response = await fetch('/api/ai/quickstart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoData: data })
      });
      const result = await response.json();
      if (result.success) {
        setQuickStartGuide(result.quickStart);
      } else {
        throw new Error(result.error || 'Failed to generate quick start guide');
      }
    } catch (quickStartErr) {
      console.error('Quick Start generation failed:', quickStartErr);
    } finally {
      setIsQuickStartLoading(false);
    }

    // Common Issues
    setIsIssuesLoading(true);
    try {
      const response = await fetch('/api/ai/common-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoData: data })
      });
      const result = await response.json();
      if (result.success) {
        setCommonIssues(result.issues);
      } else {
        throw new Error(result.error || 'Failed to generate common issues');
      }
    } catch (issuesErr) {
      console.error('Common Issues generation failed:', issuesErr);
    } finally {
      setIsIssuesLoading(false);
    }

    // First Contributions
    setIsContributionsLoading(true);
    try {
      const response = await fetch('/api/ai/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoData: data, codeAnalysis: prepareCompactCodeAnalysis(analysisResult) })
      });
      const result = await response.json();
      if (result.success) {
        setFirstContributions(Array.isArray(result.contributions) ? result.contributions : []);
      } else {
        throw new Error(result.error || 'Failed to generate contribution opportunities');
      }
    } catch (contributionsErr) {
      console.error('First Contributions generation failed:', contributionsErr);
    } finally {
      setIsContributionsLoading(false);
    }

    // No additional architecture AI call to keep UI order intact
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

  const handleDownloadPDF = async () => {
    if (!repoData) {
      setError('No repository data available to export.');
      return;
    }

    if (!analysisComplete) {
      setError('Analysis is still in progress. Please wait for it to complete before generating the PDF.');
      return;
    }

    setIsGeneratingPDF(true);
    setPdfProgress('Preparing report...');
    setError(null);

    try {
      const result = await downloadRepositoryReportPdf({
        repoData,
        repoSize,
        aiSummary,
        quickStartGuide,
        commonIssues,
        firstContributions,
        architectureAnalysis,
        detailedArchitecture,
        codeAnalysis,
        onProgress: setPdfProgress
      });

      setSuccessMessage(`PDF report downloaded: ${result.filename}`);
      window.setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error generating PDF report:', error);
      setError(error.message || 'Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
      setPdfProgress('');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            repoData={repoData}
            repoSize={repoSize}
            codeAnalysis={codeAnalysis}
            onNavigate={setActiveTab}
          />
        );
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
            codeAnalysis={codeAnalysis}
            isCodeAnalysisLoading={isCodeAnalysisLoading}
          />
        );
      case 'architecture-v2':
        return (
          <ArchitectureV2
            repoData={repoData}
            architectureAnalysis={architectureAnalysis}
            isArchitectureLoading={isArchitectureLoading}
            architectureError={architectureError}
            detailedArchitecture={detailedArchitecture}
            codeAnalysis={codeAnalysis}
            isCodeAnalysisLoading={isCodeAnalysisLoading}
          />
        );
      case 'onboarding':
        return (
          <OnboardingGuide
            repoData={repoData}
            codeAnalysis={codeAnalysis}
            detailedArchitecture={detailedArchitecture}
            aiSummary={aiSummary}
            quickStartGuide={quickStartGuide}
            commonIssues={commonIssues}
            firstContributions={firstContributions}
            isCodeAnalysisLoading={isCodeAnalysisLoading}
            isQuickStartLoading={isQuickStartLoading}
            isIssuesLoading={isIssuesLoading}
            isContributionsLoading={isContributionsLoading}
          />
        );
      case 'documentation':
        return (
          <Documentation
            repoData={repoData}
            codeAnalysis={codeAnalysis}
          />
        );
      case 'security':
        return (
          <SecurityScanner
            repoData={repoData}
            codeAnalysis={codeAnalysis}
            isCodeAnalysisLoading={isCodeAnalysisLoading}
            onNavigate={setActiveTab}
          />
        );
      case 'chat':
        return (
          <Chat
            repoData={repoData}
            codeAnalysis={codeAnalysis}
            isCodeAnalysisLoading={isCodeAnalysisLoading}
          />
        );
      case 'repository-graph':
        return (
          <RepositoryGraph
            repoData={repoData}
            codeAnalysis={codeAnalysis}
            onOpenArchitecture={() => setActiveTab('architecture')}
          />
        );
      case 'blast-radius':
        return (
          <BlastRadius
            repoData={repoData}
            codeAnalysis={codeAnalysis}
          />
        );
      case 'planner':
        return (
          <Planner
            repoData={repoData}
            codeAnalysis={codeAnalysis}
            firstContributions={firstContributions}
            onNavigate={setActiveTab}
          />
        );
      case 'debug-navigator':
        return (
          <DebugNavigator
            repoData={repoData}
            codeAnalysis={codeAnalysis}
            detailedArchitecture={detailedArchitecture}
            firstContributions={firstContributions}
            onNavigate={setActiveTab}
          />
        );
      case 'heatmap':
        return (
          <Heatmap
            repoData={repoData}
            codeAnalysis={codeAnalysis}
            onNavigate={setActiveTab}
          />
        );
      case 'saved-workspaces':
        return <SavedWorkspaces />;
      default:
        return (
          <Summary
            repoUrl={repoUrl}
            repoSize={repoSize}
            repoData={repoData}
            codeAnalysis={codeAnalysis}
          />
        );
    }
  };

  // Reset function to start a new analysis
  const handleNewAnalysis = () => {
    // Reset all state
    setAnalysisComplete(false);
    setRepoData(null);
    setRepoSize(null);
    setAiSummary('');
    setQuickStartGuide('');
    setCommonIssues([]);
    setFirstContributions([]);
    setArchitectureAnalysis('');
    setDetailedArchitecture(null);
    setCodeAnalysis(null);
    setError(null);
    setSuccessMessage('');
    setActiveTab('dashboard');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectRecentRepo = (url) => {
    if (isAnalyzing) return;
    handleAnalyze(url);
  };

  const handleClearRecentRepos = () => {
    clearRecentRepos();
    setRecentRepos([]);
  };

  const repoLabel =
    repoData?.repoInfo?.full_name ||
    repoData?.repoInfo?.name ||
    repoUrl?.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '') ||
    '';

  return (
    <div className="app">
      {/* ── Full-screen analysis loading screen ── */}
      {isAnalyzing && (
        <LoadingSpinner
          isVisible={isAnalyzing}
          repoData={repoData}
          isSummaryLoading={isSummaryLoading}
          isQuickStartLoading={isQuickStartLoading}
          isIssuesLoading={isIssuesLoading}
          isContributionsLoading={isContributionsLoading}
          isArchitectureLoading={isArchitectureLoading}
          isCodeAnalysisLoading={isCodeAnalysisLoading}
          codeAnalysis={codeAnalysis}
          repoUrl={repoUrl}
          isAnalyzing={isAnalyzing}
        />
      )}

      {/* ── Landing page (no analysis yet) ── */}
      {!analysisComplete && !isAnalyzing ? (
        <div className="landing-layout">
          <LandingHeader onLogoClick={handleNewAnalysis} />
          <main className="main-content">
            <div className="single-column">
              {error && (
                <div className="homepage-analysis-error message-banner error-banner" role="alert">
                  <span className="error-text">{error}</span>
                  <button
                    type="button"
                    className="retry-button"
                    onClick={() => setError(null)}
                  >
                    Dismiss
                  </button>
                </div>
              )}
              <HeroSection
                repoUrl={repoUrl}
                onUrlChange={setRepoUrl}
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
              />
              <ImpactComparison />
              <HowItWorks />
              <CTASection />
            </div>
          </main>
          <Footer />
        </div>
      ) : isAnalyzing ? null : (
        <AppShell
          activeTab={activeTab}
          onNavigate={setActiveTab}
          onLogoClick={handleNewAnalysis}
          repoLabel={repoLabel}
          repoUrl={repoUrl}
          recentRepos={recentRepos}
          isAnalyzing={isAnalyzing}
          lastAnalyzedRepoUrl={lastAnalyzedRepoUrl}
          onSelectRecentRepo={handleSelectRecentRepo}
          onAnalyze={() => handleAnalyze()}
          onClearRecentRepos={handleClearRecentRepos}
          onNewAnalysis={handleNewAnalysis}
          onDownloadPDF={handleDownloadPDF}
          isGeneratingPDF={isGeneratingPDF}
          pdfProgress={pdfProgress}
          repoData={repoData}
          codeAnalysis={codeAnalysis}
        >
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

          {/* Loading spinner is now rendered as a full-screen overlay above — see top of return */}

          {analysisComplete && (
            <div ref={resultsRef} className="results-section">
              {activeTab !== 'chat' && <PageHeader tabId={activeTab} />}
              <div className="tab-content-wrapper">
                {renderTabContent()}
              </div>
              
            </div>
          )}
        </AppShell>
      )}

      <ScrollToTopButton />
    </div>
  );
}

export default App;

// Made with Bob
