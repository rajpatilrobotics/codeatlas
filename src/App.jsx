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
  const resultsRef = useRef(null);

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'onboarding', label: 'Onboarding Guide' },
    { id: 'documentation', label: 'Documentation' },
    { id: 'security', label: 'Security Scanner' },
    { id: 'chat', label: 'Chat' }
  ];

  // Reset logic when URL changes
  useEffect(() => {
    if (repoUrl !== previousUrl && previousUrl !== '') {
      setAnalysisComplete(false);
      setActiveTab('summary');
      setError(null);
      setSuccessMessage('');
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
    
    try {
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
      
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsAnalyzing(false);
    }
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
        return <Summary repoUrl={repoUrl} repoSize={repoSize} repoData={repoData} />;
      case 'architecture':
        return <Architecture />;
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
