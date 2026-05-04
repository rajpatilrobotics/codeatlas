import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import './components/Homepage/Homepage.css';
import Header from './components/Header';
import InputSection from './components/InputSection';
import LoadingSpinner from './components/LoadingSpinner';
import TabNavigation from './components/TabNavigation';
import TimeSavedBadge from './components/TimeSavedBadge';
import DownloadPDFButton from './components/DownloadPDFButton';
import Footer from './components/Footer';
import { jsPDF } from 'jspdf';

// Homepage Components
import HeroSection from './components/Homepage/HeroSection';
import ImpactComparison from './components/Homepage/ImpactComparison';
import PoweredByBob from './components/Homepage/PoweredByBob';
import HowItWorks from './components/Homepage/HowItWorks';
import ProductivityHighlight from './components/Homepage/ProductivityHighlight';
import FeaturesGrid from './components/Homepage/FeaturesGrid';
import CTASection from './components/Homepage/CTASection';

// Tab Content Components
import Summary from './components/TabContent/Summary';
import Architecture from './components/TabContent/Architecture';
import OnboardingGuide from './components/TabContent/OnboardingGuide';
import Documentation from './components/TabContent/Documentation';
import SecurityScanner from './components/TabContent/SecurityScanner';
import Chat from './components/TabContent/Chat';

// GitHub Service
import { analyzeRepository, analyzeArchitecture, parseGitHubUrl } from './services/githubService';

// Watsonx.ai Service
import { generateText } from './services/watsonxService';

// Code Analysis Service
import { codeAnalysisService } from './services/codeAnalysisService';

// Text Formatting Utilities
import { CLEAN_OUTPUT_RULES, cleanMarkdown } from './utils/textFormatting';

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
  const [detailedArchitecture, setDetailedArchitecture] = useState(null);
  const [codeAnalysis, setCodeAnalysis] = useState(null);
  const [isCodeAnalysisLoading, setIsCodeAnalysisLoading] = useState(false);
  const [codeAnalysisError, setCodeAnalysisError] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
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
        const prompt = `${CLEAN_OUTPUT_RULES}

You are a developer onboarding assistant. Analyze this GitHub repository and provide a plain English summary covering:
- What this project does
- Who it is for
- The main technology stack
- The most important things a new developer should know

Keep it clear, structured, and concise. Do not include unnecessary text.

${aiInput}`;

        const generatedSummary = await generateText(prompt, {
          maxNewTokens: 300,
          temperature: 0.7
        });
        
        const cleanedSummary = cleanMarkdown(generatedSummary);
        setAiSummary(cleanedSummary);
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
        
        const quickStartPrompt = `${CLEAN_OUTPUT_RULES}

Generate a concise Quick Start Guide for this repository. Include:
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
        
        const cleanedQuickStart = cleanMarkdown(quickStart);
        setQuickStartGuide(cleanedQuickStart);
      } catch (quickStartErr) {
        console.error('Quick Start generation failed:', quickStartErr);
      } finally {
        setIsQuickStartLoading(false);
      }
      
      // Step 4: Generate Common Issues & Solutions using watsonx.ai
      setIsIssuesLoading(true);
      try {
        const issuesPrompt = `${CLEAN_OUTPUT_RULES}

Based on this repository, identify 3-4 common setup issues that new developers might face and provide solutions:

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
        
        const cleanedIssues = cleanMarkdown(issues);
        setCommonIssues(cleanedIssues);
      } catch (issuesErr) {
        console.error('Common Issues generation failed:', issuesErr);
      } finally {
        setIsIssuesLoading(false);
      }
      
      // Step 5: Generate First Contribution Suggestions using watsonx.ai
      setIsContributionsLoading(true);
      try {
        const contributionsPrompt = `${CLEAN_OUTPUT_RULES}

Analyze this repository and suggest 3-5 beginner-friendly tasks that a new developer could tackle as their first contribution. Be specific and actionable.

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

Format each suggestion as:
"Task: [specific task]
File: [filename]
Difficulty: [Easy/Medium]
Impact: [why this matters]"

Provide 3-5 suggestions.`;

        const suggestions = await generateText(contributionsPrompt, {
          maxNewTokens: 600,
          temperature: 0.7
        });
        
        const cleanedSuggestions = cleanMarkdown(suggestions);
        // Parse the suggestions into structured format
        const parsedSuggestions = parseSuggestions(cleanedSuggestions);
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
        const architecturePrompt = `${CLEAN_OUTPUT_RULES}

You are a software architect. Analyze this repository and provide:

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
        
        const cleanedArchitecture = cleanMarkdown(architectureResponse);
        setArchitectureAnalysis(cleanedArchitecture);
        
        // Step 6b: Perform detailed architecture analysis
        const detailedAnalysis = analyzeArchitecture(data.fileTree, data.importantFiles);
        setDetailedArchitecture(detailedAnalysis);
        console.log('Detailed Architecture Analysis:', detailedAnalysis);
        
      } catch (architectureErr) {
        console.error('Architecture analysis generation failed:', architectureErr);
        setArchitectureError(architectureErr.message || 'Failed to generate architecture analysis');
      } finally {
        setIsArchitectureLoading(false);
      
      // Step 7: Perform deep code analysis using pre-fetched file contents
      setIsCodeAnalysisLoading(true);
      setCodeAnalysisError(null);
      try {
        console.log('🔬 Starting deep code analysis...');
        
        // Parse GitHub URL to get owner and repo
        const parsed = parseGitHubUrl(repoUrl);
        if (!parsed) {
          throw new Error('Invalid GitHub URL');
        }
        
        const { owner, repo } = parsed;
        
        // Use pre-fetched file contents from backend (no token needed on client)
        // The backend already fetched file contents securely
        if (!data.importantFiles || data.importantFiles.length === 0) {
          console.warn('⚠️ No files available for analysis');
          setCodeAnalysisError('No files available for analysis');
        } else {
          // Analyze repository with code analysis service using pre-fetched content
          const analysis = await codeAnalysisService.analyzeRepository(
            owner,
            repo,
            data.importantFiles,
            null // No token needed - using pre-fetched content
          );
          
          setCodeAnalysis(analysis);
          console.log('✅ Code analysis complete!', analysis.summary);
        }
        
      } catch (codeErr) {
        console.error('Code analysis failed:', codeErr);
        setCodeAnalysisError(codeErr.message || 'Failed to perform code analysis');
      } finally {
        setIsCodeAnalysisLoading(false);
      }
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
    if (!repoData) {
      alert('No repository data available to export');
      return;
    }

    console.log('=== PDF GENERATION DEBUG ===');
    console.log('codeAnalysis:', codeAnalysis);
    console.log('codeAnalysis.security:', codeAnalysis?.security);
    
    // Check sessionStorage
    const cachedSecurity = sessionStorage.getItem('securityScanCache');
    console.log('sessionStorage securityScanCache:', cachedSecurity);
    if (cachedSecurity) {
      try {
        const parsed = JSON.parse(cachedSecurity);
        console.log('Parsed security data:', parsed);
      } catch (e) {
        console.error('Failed to parse cached security:', e);
      }
    }

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
    // Try to get security data from sessionStorage if not in codeAnalysis
    let securityData = codeAnalysis?.security;
    console.log('Security data from codeAnalysis:', securityData);
    
    if (!securityData) {
      try {
        const cached = sessionStorage.getItem('securityScanCache');
        console.log('Attempting to retrieve from sessionStorage:', cached);
        if (cached) {
          securityData = JSON.parse(cached);
          console.log('Successfully parsed security data from cache:', securityData);
        }
      } catch (err) {
        console.error('Failed to parse security cache:', err);
      }
    }

    console.log('Final security data for PDF:', securityData);

    // ALWAYS add security section, even if no data
    startNewSection('Security Scanner');
    addSectionTitle('SECURITY SCANNER');
    addSpace(5);

    if (securityData) {
      addSubtitle('Security Overview');
      addText(`Overall Security Score: ${securityData.score || securityData.overall_score || 'N/A'}/100`);
      addText(`Risk Level: ${securityData.riskLevel || securityData.risk_level || 'N/A'}`);
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

      // Security Issues
      if (securityData.issues && securityData.issues.length > 0) {
        addSubtitle(`Security Issues Found (${securityData.issues.length})`);
        addSpace(3);
        
        securityData.issues.forEach((issue, index) => {
          checkPageBreak(35);
          
          // Issue number and title
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(12);
          pdf.text(`${index + 1}. ${issue.title}`, margin, y);
          y += 6;
          
          // Severity badge
          pdf.setFontSize(10);
          const severityLower = (issue.severity || '').toLowerCase();
          const severityColor = severityLower === 'high' ? [220, 53, 69] :
                               severityLower === 'medium' ? [255, 193, 7] : [40, 167, 69];
          pdf.setTextColor(...severityColor);
          pdf.text(`[${(issue.severity || 'UNKNOWN').toUpperCase()}]`, margin, y);
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
          if (issue.file) {
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
        addText('No security issues detected.');
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
      }

      // Additional Security Metrics
      if (securityData.metrics) {
        addSpace(8);
        addSubtitle('Security Metrics');
        Object.entries(securityData.metrics).forEach(([key, value]) => {
          addText(`${key}: ${value}`);
        });
      }
    } else {
      // If no security data at all, add a note
      addText('No security scan data available. Please visit the Security Scanner tab to run a scan.');
      addSpace(5);
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(10);
      addText('Tip: The security scan analyzes your repository for vulnerabilities and security best practices.');
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
    }

    pdf.save('DevDock_Report.pdf');
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
            codeAnalysis={codeAnalysis}
            isCodeAnalysisLoading={isCodeAnalysisLoading}
          />
        );
      case 'architecture':
        return (
          <Architecture
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

  return (
    <div className="app">
      <Header />
      
      <main className="main-content">
        <div className="single-column">
          {!analysisComplete && !isAnalyzing && (
            <>
              <HeroSection
                repoUrl={repoUrl}
                onUrlChange={setRepoUrl}
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
              />
              <ImpactComparison />
              <PoweredByBob />
              <HowItWorks />
              <ProductivityHighlight />
              <FeaturesGrid />
              <CTASection />
            </>
          )}

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
                  isGenerating={isGeneratingPDF}
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

