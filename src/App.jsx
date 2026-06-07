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
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

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

  // ========== DIAGRAM CAPTURE FUNCTIONS ==========
  
  /**
   * Captures a single diagram as a high-quality PNG image
   * @param {string} diagramId - The DOM element ID of the diagram
   * @returns {Promise<string|null>} Base64 encoded image data URL or null if not found
   */
  const captureDiagramAsImage = async (diagramId) => {
    try {
      const element = document.getElementById(diagramId);
      if (!element) {
        console.warn(`Diagram element not found: ${diagramId}`);
        return null;
      }
      
      // Hide controls temporarily for clean export
      const controls = element.querySelectorAll(
        '.react-flow__controls, .react-flow__minimap, .react-flow__attribution'
      );
      controls.forEach(control => {
        control.style.display = 'none';
      });
      
      // Capture with high quality settings
      const dataUrl = await toPng(element, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#1a1a2e',
        cacheBust: true
      });
      
      // Restore controls
      controls.forEach(control => {
        control.style.display = '';
      });
      
      return dataUrl;
    } catch (error) {
      console.error(`Failed to capture diagram ${diagramId}:`, error);
      return null;
    }
  };

  /**
   * Captures all available architecture diagrams
   * @returns {Promise<Array>} Array of captured diagram objects with title and image data
   */
  const captureAllDiagrams = async () => {
    const diagrams = [
      { id: 'system-architecture-diagram', title: '🏗️ Interactive System Architecture' },
      { id: 'dynamic-flow-diagram', title: '📊 Dynamic Data Flow Diagram' },
      { id: 'tech-stack-diagram', title: '🏗️ Comprehensive Technology Stack' },
      { id: 'function-call-flow-diagram', title: '🔄 Function Call Flow (From Code Analysis)' },
      { id: 'file-structure-diagram', title: '📁 Analyzed File Structure' },
      { id: 'folder-structure-diagram', title: '📁 Interactive Folder Structure' }
    ];
    
    const captured = [];
    
    for (let i = 0; i < diagrams.length; i++) {
      const diagram = diagrams[i];
      setPdfProgress(`Capturing diagrams... (${i + 1}/${diagrams.length})`);
      
      // Small delay to allow UI update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const imageData = await captureDiagramAsImage(diagram.id);
      
      if (imageData) {
        captured.push({
          id: diagram.id,
          title: diagram.title,
          image: imageData
        });
        console.log(`✅ Captured: ${diagram.title}`);
      } else {
        console.log(`⏭️ Skipped: ${diagram.title} (not found or empty)`);
      }
    }
    
    return captured;
  };

  // ========== PDF GENERATION FUNCTION ==========
  
  const handleDownloadPDF = async () => {
    // ========== DATA VALIDATION ==========
    if (!repoData) {
      alert('No repository data available to export');
      return;
    }

    // Validate that analysis is complete
    if (!analysisComplete) {
      alert('Analysis is still in progress. Please wait for it to complete before generating the PDF.');
      return;
    }

    console.log('=== PDF GENERATION DEBUG ===');
    console.log('repoData:', repoData);
    console.log('aiSummary:', aiSummary);
    console.log('codeAnalysis:', codeAnalysis);
    console.log('architectureAnalysis:', architectureAnalysis);
    console.log('detailedArchitecture:', detailedArchitecture);

    setIsGeneratingPDF(true);
    setPdfProgress('Preparing PDF generation...');

    try {
      // ========== CAPTURE ARCHITECTURE DIAGRAMS ==========
      console.log('📸 Starting diagram capture...');
      setPdfProgress('Capturing diagrams...');
      
      // Wait a moment to ensure diagrams are fully rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const capturedDiagrams = await captureAllDiagrams();
      console.log(`✅ Captured ${capturedDiagrams.length} diagrams`);
      
      setPdfProgress('Generating PDF document...');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let y = margin;

    const addPageHeader = (sectionName) => {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(150, 150, 150);
      pdf.text(`DevDock AI Report - ${repoData.repoInfo.name}`, margin, 10);
      pdf.text(sectionName, pageWidth - margin, 10, { align: 'right' });
      pdf.setTextColor(0, 0, 0);
      y = margin + 5;
    };

    const addMainTitle = (text) => {
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(47, 129, 247);
      const lines = pdf.splitTextToSize(text, maxWidth);
      lines.forEach(line => {
        pdf.text(line, margin, y);
        y += 10;
      });
      pdf.setTextColor(0, 0, 0);
      y += 5;
    };

    const addSectionTitle = (text) => {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(47, 129, 247);
      const lines = pdf.splitTextToSize(text, maxWidth);
      lines.forEach(line => {
        pdf.text(line, margin, y);
        y += 8;
      });
      pdf.setTextColor(0, 0, 0);
      
      // Add underline
      pdf.setDrawColor(47, 129, 247);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, margin + 60, y);
      y += 8;
    };

    const addSubtitle = (text) => {
      checkPageBreak(15);
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      const lines = pdf.splitTextToSize(text, maxWidth);
      lines.forEach(line => {
        pdf.text(line, margin, y);
        y += 7;
      });
      y += 2;
    };

    const addText = (text, indent = 0) => {
      if (!text || text === 'No README found') return;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      const lines = pdf.splitTextToSize(String(text), maxWidth - indent);
      lines.forEach(line => {
        checkPageBreak(7);
        pdf.text(line, margin + indent, y);
        y += 6;
      });
    };

    const addBullet = (text) => {
      checkPageBreak(7);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text('•', margin + 2, y);
      const lines = pdf.splitTextToSize(String(text), maxWidth - 8);
      lines.forEach((line, index) => {
        if (index > 0) checkPageBreak(7);
        pdf.text(line, margin + 8, y);
        y += 6;
      });
    };

    const addSpace = (size = 5) => {
      y += size;
    };

    const addDivider = () => {
      checkPageBreak(5);
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 5;
    };

    const checkPageBreak = (requiredSpace = 10) => {
      if (y + requiredSpace > pageHeight - 20) {
        pdf.addPage();
        y = margin;
      }
    };

    const startNewSection = (sectionName) => {
      pdf.addPage();
      y = margin;
      addPageHeader(sectionName);
      addSpace(10);
    };

    // ========== COVER PAGE ==========
    y = pageHeight / 3;
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(47, 129, 247);
    pdf.text('DevDock AI Report', pageWidth / 2, y, { align: 'center' });
    
    y += 15;
    pdf.setFontSize(18);
    pdf.setTextColor(0, 0, 0);
    const repoNameLines = pdf.splitTextToSize(repoData.repoInfo.name, maxWidth);
    repoNameLines.forEach(line => {
      pdf.text(line, pageWidth / 2, y, { align: 'center' });
      y += 10;
    });
    
    y += 20;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated on ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`, pageWidth / 2, y, { align: 'center' });

    // ========== SUMMARY SECTION ==========
    startNewSection('Summary');
    addSectionTitle('SUMMARY');
    addSpace(5);

    addSubtitle('Repository Information');
    addText(`Description: ${repoData.repoInfo.description || 'N/A'}`);
    addText(`Primary Language: ${repoData.repoInfo.language || 'N/A'}`);
    addText(`Stars: ${repoData.repoInfo.stars || 0}`);
    addText(`License: ${repoData.repoInfo.license || 'N/A'}`);
    addText(`Last Updated: ${new Date(repoData.repoInfo.updatedAt).toLocaleDateString()}`);
    addSpace(8);

    if (aiSummary) {
      addSubtitle('AI-Generated Summary');
      addText(aiSummary);
      addSpace(8);
    }

    if (repoData.techStack && Object.keys(repoData.techStack).length > 0) {
      addSubtitle('Technology Stack');
      Object.entries(repoData.techStack).forEach(([category, items]) => {
        if (items && items.length > 0) {
          pdf.setFont('helvetica', 'bold');
          addText(`${category}:`);
          pdf.setFont('helvetica', 'normal');
          items.forEach(item => addBullet(item));
          addSpace(3);
        }
      });
      addSpace(5);
    }

    if (repoData.complexity) {
      addSubtitle('Project Complexity');
      addText(`Complexity Level: ${repoData.complexity.level}`);
      addText(`Complexity Score: ${repoData.complexity.score}/100`);
      addText(`Traditional Onboarding Time: ${repoData.complexity.traditionalTime}`);
      addText(`DevDock Onboarding Time: ${repoData.complexity.devdockTime}`);
      addSpace(5);
    }

    // ========== ARCHITECTURE SECTION ==========
    startNewSection('Architecture');
    addSectionTitle('ARCHITECTURE');
    addSpace(5);

    if (architectureAnalysis) {
      addSubtitle('Architecture Analysis');
      addText(architectureAnalysis);
      addSpace(8);
    }

    if (repoData.fileTree && repoData.fileTree.length > 0) {
      addSubtitle('Project Structure');
      addText(`Total Files: ${repoData.fileTree.length}`);
      addSpace(5);
    }

    if (repoData.importantFiles && repoData.importantFiles.length > 0) {
      addSubtitle('Key Files');
      repoData.importantFiles.forEach(file => {
        addBullet(file.path);
        if (file.type) {
          addText(`Type: ${file.type}`, 10);
        }
      });
      addSpace(8);
    }

    if (detailedArchitecture) {
      addSubtitle('Detailed Architecture');
      if (detailedArchitecture.layers) {
        addText('Architecture Layers:');
        Object.entries(detailedArchitecture.layers).forEach(([layer, files]) => {
          addText(`${layer}: ${files.length} files`, 5);
        });
        addSpace(5);
      }
      if (detailedArchitecture.patterns && Array.isArray(detailedArchitecture.patterns)) {
        addText('Design Patterns:');
        detailedArchitecture.patterns.forEach(pattern => addBullet(pattern));
        addSpace(5);
      }
    }

    if (codeAnalysis && codeAnalysis.structure) {
      addSubtitle('Code Structure Analysis');
      if (codeAnalysis.structure.components) {
        addText(`Components: ${codeAnalysis.structure.components}`);
      }
      if (codeAnalysis.structure.services) {
        addText(`Services: ${codeAnalysis.structure.services}`);
      }
      if (codeAnalysis.structure.utilities) {
        addText(`Utilities: ${codeAnalysis.structure.utilities}`);
      }
      addSpace(5);
    }

    // ========== ARCHITECTURE DIAGRAMS SECTION ==========
    if (capturedDiagrams.length > 0) {
      console.log(`📊 Adding ${capturedDiagrams.length} diagrams to PDF...`);
      
      capturedDiagrams.forEach((diagram, index) => {
        // Start new page for each diagram
        if (index === 0) {
          startNewSection('Architecture Diagrams');
          addSectionTitle('ARCHITECTURE DIAGRAMS');
          addSpace(5);
        } else {
          pdf.addPage();
          y = margin;
          addPageHeader('Architecture Diagrams');
          addSpace(10);
        }
        
        // Add diagram title
        addSubtitle(diagram.title);
        addSpace(5);
        
        // Calculate image dimensions to fit on page
        // Leave space for title and margins
        const availableHeight = pageHeight - y - margin - 10;
        const availableWidth = maxWidth;
        
        // Add image to PDF
        try {
          pdf.addImage(
            diagram.image,
            'PNG',
            margin,
            y,
            availableWidth,
            availableHeight,
            undefined,
            'FAST'
          );
          console.log(`✅ Added diagram to PDF: ${diagram.title}`);
        } catch (imgError) {
          console.error(`Failed to add diagram ${diagram.title}:`, imgError);
          addText(`[Diagram could not be rendered]`);
        }
      });
      
      console.log('✅ All diagrams added to PDF');
    } else {
      console.log('⚠️ No diagrams captured for PDF');
    }

    // ========== ONBOARDING GUIDE SECTION ==========
    startNewSection('Onboarding Guide');
    addSectionTitle('ONBOARDING GUIDE');
    addSpace(5);

    if (quickStartGuide) {
      addSubtitle('Quick Start Guide');
      addText(quickStartGuide);
      addSpace(8);
    }

    if (commonIssues) {
      addSubtitle('Common Issues & Solutions');
      addText(commonIssues);
      addSpace(8);
    }

    if (firstContributions && firstContributions.length > 0) {
      addSubtitle('First Contribution Suggestions');
      firstContributions.forEach((contrib, index) => {
        checkPageBreak(25);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${index + 1}. ${contrib.task}`, margin, y);
        y += 6;
        pdf.setFont('helvetica', 'normal');
        addText(`File: ${contrib.file}`, 5);
        addText(`Difficulty: ${contrib.difficulty}`, 5);
        addText(`Impact: ${contrib.impact}`, 5);
        addSpace(5);
        addDivider();
      });
    }

    if (repoData.envVariables && repoData.envVariables.length > 0) {
      addSubtitle('Environment Variables');
      repoData.envVariables.forEach(env => addBullet(env));
      addSpace(8);
    }

    if (repoData.keyCommands && repoData.keyCommands.length > 0) {
      addSubtitle('Key Commands');
      repoData.keyCommands.forEach(cmd => addBullet(cmd));
      addSpace(5);
    }

    // ========== DOCUMENTATION SECTION ==========
    if (repoData.readme && repoData.readme !== 'No README found') {
      startNewSection('Documentation');
      addSectionTitle('DOCUMENTATION');
      addSpace(5);
      addSubtitle('README');
      addText(repoData.readme);
    }

    // ========== SECURITY SCANNER SECTION ==========
    // PRIORITY FIX: Check sessionStorage FIRST (SecurityScanner data source)
    let securityData = null;
    
    // Try sessionStorage first (this is what the UI uses)
    try {
      const cached = sessionStorage.getItem('securityScanCache');
      console.log('Checking sessionStorage for security data:', cached ? 'Found' : 'Not found');
      if (cached) {
        securityData = JSON.parse(cached);
        console.log('✅ Using security data from sessionStorage (SecurityScanner):', securityData);
      }
    } catch (err) {
      console.error('Failed to parse security cache from sessionStorage:', err);
    }
    
    // Fallback to codeAnalysis.security if sessionStorage is empty
    if (!securityData && codeAnalysis?.security) {
      console.log('⚠️ Falling back to codeAnalysis.security');
      securityData = codeAnalysis.security;
    }

    console.log('Final security data for PDF:', securityData);

    // ALWAYS add security section
    startNewSection('Security Scanner');
    addSectionTitle('SECURITY SCANNER');
    addSpace(5);

    // Check if we have valid security data with the correct structure
    const hasValidSecurityData = securityData && (
      securityData.overall_score !== undefined ||
      securityData.score !== undefined ||
      securityData.issues !== undefined
    );

    if (hasValidSecurityData) {
      // Security Overview
      addSubtitle('Security Overview');
      const score = securityData.overall_score || securityData.score;
      const riskLevel = securityData.risk_level || securityData.riskLevel;
      
      if (score !== undefined && score !== null) {
        addText(`Overall Security Score: ${score}/100`);
      }
      
      if (riskLevel) {
        addText(`Risk Level: ${riskLevel}`);
      }
      
      addSpace(8);

      // Passed Security Checks
      if (securityData.passed_checks && securityData.passed_checks.length > 0) {
        addSubtitle(`Passed Security Checks (${securityData.passed_checks.length})`);
        addSpace(3);
        securityData.passed_checks.forEach(check => {
          checkPageBreak(10);
          pdf.setTextColor(40, 167, 69);
          pdf.text('✓', margin, y);
          pdf.setTextColor(0, 0, 0);
          addText(check, 8);
        });
        addSpace(8);
      }

      // Security Issues - DYNAMIC RENDERING
      const issues = securityData.issues || [];
      
      if (issues.length > 0) {
        addSubtitle(`Security Issues Found (${issues.length})`);
        addSpace(3);
        
        issues.forEach((issue, index) => {
          checkPageBreak(35);
          
          // Issue number and title
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(12);
          pdf.text(`${index + 1}. ${issue.title || 'Security Issue'}`, margin, y);
          y += 6;
          
          // Severity badge with color coding
          pdf.setFontSize(10);
          const severityLower = (issue.severity || 'medium').toLowerCase();
          const severityColor = severityLower === 'high' ? [220, 53, 69] :
                               severityLower === 'medium' ? [255, 193, 7] : [40, 167, 69];
          pdf.setTextColor(...severityColor);
          pdf.text(`[${(issue.severity || 'MEDIUM').toUpperCase()}]`, margin, y);
          pdf.setTextColor(0, 0, 0);
          y += 7;
          
          // Description
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(11);
          if (issue.description) {
            pdf.setFont('helvetica', 'bold');
            addText('Description:', 5);
            pdf.setFont('helvetica', 'normal');
            addText(issue.description, 5);
          }
          
          // File location
          if (issue.file && issue.file !== 'Unknown') {
            pdf.setFont('helvetica', 'bold');
            addText('File:', 5);
            pdf.setFont('helvetica', 'normal');
            addText(issue.file, 5);
          }
          
          // Fix recommendation
          if (issue.fix) {
            pdf.setFont('helvetica', 'bold');
            addText('Recommended Fix:', 5);
            pdf.setFont('helvetica', 'normal');
            addText(issue.fix, 5);
          }
          
          addSpace(5);
          addDivider();
        });
      } else {
        // Only show "No issues" if issues array is explicitly empty
        addText('✅ No security issues detected. Great job!');
        addSpace(8);
      }

      // Security Recommendations
      if (securityData.recommendations && securityData.recommendations.length > 0) {
        addSubtitle(`Security Recommendations (${securityData.recommendations.length})`);
        addSpace(3);
        securityData.recommendations.forEach((rec, index) => {
          checkPageBreak(10);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${index + 1}.`, margin, y);
          pdf.setFont('helvetica', 'normal');
          addText(rec, 8);
          addSpace(3);
        });
        addSpace(5);
      }

      // Code Analysis Vulnerabilities (if available)
      if (codeAnalysis?.security) {
        const codeSecVulns = codeAnalysis.security;
        const totalVulns = (codeSecVulns.critical?.length || 0) +
                          (codeSecVulns.high?.length || 0) +
                          (codeSecVulns.medium?.length || 0) +
                          (codeSecVulns.low?.length || 0);
        
        if (totalVulns > 0) {
          addSpace(8);
          addSubtitle('Code Analysis - Detected Vulnerabilities');
          addText(`Total vulnerabilities found: ${totalVulns}`);
          addSpace(3);
          
          // Critical
          if (codeSecVulns.critical && codeSecVulns.critical.length > 0) {
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(220, 53, 69);
            addText(`🔴 Critical (${codeSecVulns.critical.length})`);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('helvetica', 'normal');
            codeSecVulns.critical.slice(0, 3).forEach(vuln => {
              addBullet(`${vuln.type}: ${vuln.message} (${vuln.file})`);
            });
            addSpace(3);
          }
          
          // High
          if (codeSecVulns.high && codeSecVulns.high.length > 0) {
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(255, 193, 7);
            addText(`🟠 High (${codeSecVulns.high.length})`);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('helvetica', 'normal');
            codeSecVulns.high.slice(0, 3).forEach(vuln => {
              addBullet(`${vuln.type}: ${vuln.message} (${vuln.file})`);
            });
            addSpace(3);
          }
          
          // Medium
          if (codeSecVulns.medium && codeSecVulns.medium.length > 0) {
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(255, 193, 7);
            addText(`🟡 Medium (${codeSecVulns.medium.length})`);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('helvetica', 'normal');
            codeSecVulns.medium.slice(0, 3).forEach(vuln => {
              addBullet(`${vuln.type}: ${vuln.message} (${vuln.file})`);
            });
            addSpace(3);
          }
          
          // Low
          if (codeSecVulns.low && codeSecVulns.low.length > 0) {
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(40, 167, 69);
            addText(`🔵 Low (${codeSecVulns.low.length})`);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('helvetica', 'normal');
            codeSecVulns.low.slice(0, 3).forEach(vuln => {
              addBullet(`${vuln.type}: ${vuln.message} (${vuln.file})`);
            });
          }
        }
      }
    } else {
      // No security data available
      addText('⚠️ Security scan not yet performed.');
      addSpace(5);
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(10);
      addText('To include security analysis in this report:');
      addText('1. Navigate to the Security Scanner tab in the app', 5);
      addText('2. Wait for the security scan to complete', 5);
      addText('3. Generate the PDF report again', 5);
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
    }

    // Save the PDF
    setPdfProgress('Saving PDF...');
    pdf.save('DevDock_Report.pdf');
    
    console.log('✅ PDF generated successfully!');
    setIsGeneratingPDF(false);
    setPdfProgress('');
    
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
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
            isCodeAnalysisLoading={isCodeAnalysisLoading}
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
        return <DebugNavigator />;
      case 'heatmap':
        return <Heatmap />;
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
              <PageHeader tabId={activeTab} />
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
