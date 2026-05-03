import React, { useState, useEffect } from 'react';
import { generateText } from '../../services/watsonxService';

function OnboardingGuide({ repoData, codeAnalysis, isCodeAnalysisLoading }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [onboardingData, setOnboardingData] = useState(null);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // Auto-generate guide when repoData is available
  useEffect(() => {
    if (repoData && !onboardingData && !loading) {
      generateOnboardingGuide();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoData]);

  // Check for cached data on mount
  useEffect(() => {
    const cachedData = localStorage.getItem('onboarding_guide_cache');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setOnboardingData(parsed);
      } catch (err) {
        console.error('Failed to parse cached data:', err);
        localStorage.removeItem('onboarding_guide_cache');
      }
    }
  }, []);

  const generateOnboardingGuide = async () => {
    setLoading(true);
    setError(null);

    const prompt = `You are a senior developer creating an onboarding guide. Analyze the repository and return ONLY valid JSON in this format:
{
  "steps": [
    {
      "title": "Project Overview",
      "description": "Explain what the project does and its purpose",
      "actions": ["Understand main goal", "Identify core features"],
      "icon": "🎯",
      "duration": "15 minutes",
      "difficulty": "Beginner"
    },
    {
      "title": "Environment Setup",
      "description": "Setup instructions",
      "actions": ["Install dependencies", "Run project locally"],
      "icon": "⚙️",
      "duration": "30 minutes",
      "difficulty": "Beginner"
    },
    {
      "title": "Codebase Orientation",
      "description": "Where key logic exists",
      "actions": ["Explore main folders", "Understand architecture"],
      "icon": "🗺️",
      "duration": "45 minutes",
      "difficulty": "Intermediate"
    },
    {
      "title": "First Task",
      "description": "Beginner friendly task to make",
      "actions": ["Fix small bug", "Add simple feature"],
      "icon": "🚀",
      "duration": "1 hour",
      "difficulty": "Beginner"
    },
    {
      "title": "Resources",
      "description": "Important files and docs",
      "actions": ["Read README", "Check config files"],
      "icon": "📚",
      "duration": "20 minutes",
      "difficulty": "Beginner"
    }
  ]
}

Rules:
- Return ONLY JSON
- No explanations before or after
- Keep content concise and practical
- Fill all fields with real repo specific content`;

    try {
      const response = await generateText(prompt, {
        maxNewTokens: 2000,
        temperature: 0.7,
        topP: 0.9,
      });

      // Extract JSON from response (handle cases where model adds extra text)
      let jsonStr = response.trim();
      
      // Try to find JSON object in the response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const parsedData = JSON.parse(jsonStr);

      // Validate the structure
      if (!parsedData.steps || !Array.isArray(parsedData.steps)) {
        throw new Error('Invalid response structure: missing steps array');
      }

      // Cache the response
      localStorage.setItem('onboarding_guide_cache', JSON.stringify(parsedData));
      
      setOnboardingData(parsedData);
      setLoading(false);
    } catch (err) {
      console.error('Error generating onboarding guide:', err);
      setError(err.message || 'Failed to generate onboarding guide');
      setLoading(false);
      
      // Fallback to default data
      setOnboardingData(getDefaultOnboardingData());
    }
  };

  const getDefaultOnboardingData = () => ({
    steps: [
      {
        title: "Project Overview",
        description: "Understand the project's purpose and main features",
        actions: ["Review README.md", "Explore project structure", "Identify key technologies"],
        icon: "🎯",
        duration: "15 minutes",
        difficulty: "Beginner"
      },
      {
        title: "Environment Setup",
        description: "Set up your development environment",
        actions: ["Install Node.js and npm", "Clone the repository", "Install dependencies with npm install"],
        icon: "⚙️",
        duration: "30 minutes",
        difficulty: "Beginner"
      },
      {
        title: "Codebase Orientation",
        description: "Navigate through the codebase structure",
        actions: ["Explore src/ directory", "Understand component hierarchy", "Review service layer"],
        icon: "🗺️",
        duration: "45 minutes",
        difficulty: "Intermediate"
      },
      {
        title: "First Task",
        description: "Complete your first contribution",
        actions: ["Pick a good first issue", "Create a feature branch", "Submit a pull request"],
        icon: "🚀",
        duration: "1 hour",
        difficulty: "Beginner"
      },
      {
        title: "Resources",
        description: "Familiarize yourself with important documentation",
        actions: ["Read contributing guidelines", "Review code style guide", "Join team communication channels"],
        icon: "📚",
        duration: "20 minutes",
        difficulty: "Beginner"
      }
    ]
  });

  const toggleStepCompletion = (stepIndex) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepIndex)) {
      newCompleted.delete(stepIndex);
    } else {
      newCompleted.add(stepIndex);
    }
    setCompletedSteps(newCompleted);
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      'Beginner': '#10b981',
      'Intermediate': '#f59e0b',
      'Advanced': '#ef4444'
    };
    return colors[difficulty] || '#6b7280';
  };

  const progressPercentage = onboardingData 
    ? (completedSteps.size / onboardingData.steps.length) * 100 
    : 0;

  return (
    <div className="tab-content onboarding-tab">
      {/* Header Section */}
      <div className="content-card">
        <h2 className="card-title">🚀 Personalized Onboarding Guide</h2>
        <div className="card-content">
          <p className="guide-intro">
            Get a customized onboarding experience tailored to this repository. 
            Our AI will analyze the codebase and create a step-by-step guide just for you.
          </p>
          
          {!onboardingData && !loading && (
            <button
              onClick={generateOnboardingGuide}
              className="generate-button"
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.3)';
              }}
            >
              ✨ Generate My Onboarding Guide
            </button>
          )}

          {onboardingData && (
            <button
              onClick={generateOnboardingGuide}
              className="regenerate-button"
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#a0aec0',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                e.target.style.color = '#ffffff';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                e.target.style.color = '#a0aec0';
              }}
            >
              🔄 Regenerate Guide
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="content-card" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="loading-spinner" style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #2563eb',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <h3 style={{ color: '#374151', marginBottom: '10px' }}>
            Generating your onboarding guide...
          </h3>
          <p style={{ color: '#6b7280' }}>
            Analyzing repository structure and creating personalized steps
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="content-card" style={{
          backgroundColor: '#fef2f2',
          borderLeft: '4px solid #ef4444'
        }}>
          <h3 style={{ color: '#dc2626', marginBottom: '10px' }}>
            ⚠️ Generation Error
          </h3>
          <p style={{ color: '#991b1b', marginBottom: '15px' }}>{error}</p>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Don't worry! We've loaded a default onboarding guide below.
          </p>
        </div>
      )}

      {/* Progress Bar */}
      {onboardingData && (
        <div className="content-card" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '600', color: '#374151' }}>
              Progress: {completedSteps.size} of {onboardingData.steps.length} steps
            </span>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              {Math.round(progressPercentage)}% Complete
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '12px',
            backgroundColor: '#e5e7eb',
            borderRadius: '6px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progressPercentage}%`,
              height: '100%',
              backgroundColor: '#10b981',
              transition: 'width 0.3s ease',
              borderRadius: '6px'
            }}></div>
          </div>
        </div>
      )}

      {/* Code Analysis Insights */}
      {codeAnalysis && !isCodeAnalysisLoading && (
        <div className="content-card">
          <h3 className="card-title">🔬 Code Insights from Analysis</h3>
          <div className="card-content">
            <div className="code-insights-grid">
              {/* Detected Frameworks */}
              {codeAnalysis.summary && codeAnalysis.summary.frameworks && codeAnalysis.summary.frameworks.length > 0 && (
                <div className="insight-section">
                  <h4 className="insight-title">⚡ Frameworks & Libraries</h4>
                  <div className="tech-badges">
                    {codeAnalysis.summary.frameworks.map((fw, idx) => (
                      <span key={idx} className="tech-badge">{fw}</span>
                    ))}
                  </div>
                  <p className="insight-tip">
                    💡 Familiarize yourself with these technologies before diving into the code
                  </p>
                </div>
              )}

              {/* Key Functions */}
              {codeAnalysis.definitions && codeAnalysis.definitions.functions && codeAnalysis.definitions.functions.length > 0 && (
                <div className="insight-section">
                  <h4 className="insight-title">🔧 Key Functions to Understand</h4>
                  <ul className="function-list">
                    {codeAnalysis.definitions.functions.slice(0, 5).map((func, idx) => (
                      <li key={idx} className="function-item">
                        <code>{func.name}()</code>
                        <span className="function-location">
                          {func.file} : Line {func.line}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="insight-tip">
                    💡 Start by understanding these core functions
                  </p>
                </div>
              )}

              {/* Architecture Patterns */}
              {codeAnalysis.summary && codeAnalysis.summary.patterns && codeAnalysis.summary.patterns.length > 0 && (
                <div className="insight-section">
                  <h4 className="insight-title">🏗️ Architecture Patterns</h4>
                  <div className="pattern-badges">
                    {codeAnalysis.summary.patterns.map((pattern, idx) => (
                      <span key={idx} className="pattern-badge">{pattern}</span>
                    ))}
                  </div>
                  <p className="insight-tip">
                    💡 The codebase follows these architectural patterns
                  </p>
                </div>
              )}

              {/* Files Analyzed */}
              {codeAnalysis.summary && (
                <div className="insight-section">
                  <h4 className="insight-title">📊 Codebase Stats</h4>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-value">{codeAnalysis.summary.analyzedFiles || 0}</span>
                      <span className="stat-label">Files Analyzed</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{codeAnalysis.summary.totalLines?.toLocaleString() || 0}</span>
                      <span className="stat-label">Lines of Code</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{codeAnalysis.definitions?.functions?.length || 0}</span>
                      <span className="stat-label">Functions</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{codeAnalysis.definitions?.classes?.length || 0}</span>
                      <span className="stat-label">Classes</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Steps */}
      {onboardingData && onboardingData.steps.map((step, index) => (
        <div
          key={index}
          className="content-card"
          style={{
            opacity: completedSteps.has(index) ? 0.85 : 1,
            transition: 'all 0.3s ease',
            position: 'relative',
            background: completedSteps.has(index)
              ? 'rgba(102, 126, 234, 0.08)'
              : 'rgba(255, 255, 255, 0.05)'
          }}
        >
          {/* Step Header */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '15px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
              <div style={{
                fontSize: '40px',
                lineHeight: '1'
              }}>
                {step.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#e2e8f0'
                  }}>
                    Step {index + 1}
                  </span>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    backgroundColor: getDifficultyColor(step.difficulty) + '30',
                    color: getDifficultyColor(step.difficulty),
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: `1px solid ${getDifficultyColor(step.difficulty)}50`
                  }}>
                    {step.difficulty}
                  </span>
                  <span style={{
                    fontSize: '13px',
                    color: '#cbd5e0',
                    fontWeight: '500'
                  }}>
                    ⏱️ {step.duration}
                  </span>
                </div>
                <h3 style={{
                  margin: '0',
                  fontSize: '22px',
                  color: '#ffffff',
                  fontWeight: '700'
                }}>
                  {step.title}
                </h3>
              </div>
            </div>
            
            {/* Completion Checkbox */}
            <button
              onClick={() => toggleStepCompletion(index)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: completedSteps.has(index) ? 'none' : '2px solid rgba(255, 255, 255, 0.2)',
                background: completedSteps.has(index) ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                transition: 'all 0.2s',
                flexShrink: 0,
                boxShadow: completedSteps.has(index) ? '0 0 15px rgba(102, 126, 234, 0.5)' : 'none'
              }}
            >
              {completedSteps.has(index) && '✓'}
            </button>
          </div>

          {/* Step Description */}
          <p style={{
            color: '#cbd5e0',
            marginBottom: '20px',
            lineHeight: '1.7',
            fontSize: '15px'
          }}>
            {step.description}
          </p>

          {/* Action Items */}
          <div style={{
            background: 'rgba(102, 126, 234, 0.08)',
            padding: '18px',
            borderRadius: '10px',
            border: '1px solid rgba(102, 126, 234, 0.2)'
          }}>
            <h4 style={{
              margin: '0 0 14px 0',
              fontSize: '13px',
              fontWeight: '700',
              color: '#e2e8f0',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              📋 Action Items
            </h4>
            <ul style={{
              margin: 0,
              paddingLeft: '0',
              listStyle: 'none'
            }}>
              {step.actions.map((action, actionIndex) => (
                <li key={actionIndex} style={{
                  marginBottom: '10px',
                  color: '#cbd5e0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}>
                  <span style={{
                    color: '#667eea',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    minWidth: '18px'
                  }}>•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}

      {/* Completion Message */}
      {onboardingData && completedSteps.size === onboardingData.steps.length && (
        <div className="content-card" style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
          borderLeft: '4px solid #667eea',
          textAlign: 'center',
          padding: '30px',
          border: '1px solid rgba(102, 126, 234, 0.3)'
        }}>
          <div style={{ fontSize: '60px', marginBottom: '15px' }}>🎉</div>
          <h3 style={{ color: '#ffffff', marginBottom: '10px', fontSize: '24px' }}>
            Congratulations!
          </h3>
          <p style={{ color: '#a0aec0', fontSize: '16px' }}>
            You've completed all onboarding steps. You're now ready to contribute to this project!
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default OnboardingGuide;

// Made with Bob
