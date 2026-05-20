import React, { useState, useEffect } from 'react';
import { Rocket, CheckCircle, Users, Zap, FileCode, Target, Clock, RefreshCw, Award } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Pill from '../ui/Pill';
import MetricCard from '../ui/MetricCard';

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
    if (cachedData && cachedData !== 'undefined' && cachedData !== 'null') {
      try {
        const parsed = JSON.parse(cachedData);
        setOnboardingData(parsed);
      } catch (err) {
        console.error('Failed to parse cached data:', err);
        localStorage.removeItem('onboarding_guide_cache');
      }
    } else if (cachedData) {
      // Clear invalid cache
      localStorage.removeItem('onboarding_guide_cache');
    }
  }, []);

  const generateOnboardingGuide = async () => {
    setLoading(true);
    setError(null);

    try {
      // Generate onboarding guide using API endpoint
      const response = await fetch('/api/ai/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoData })
      });
      const result = await response.json();
      
      if (result.success) {
        const guideData = result.onboarding;
        
        // Cache the response
        localStorage.setItem('onboarding_guide_cache', JSON.stringify(guideData));
        
        setOnboardingData(guideData);
      } else {
        throw new Error(result.error || 'Failed to generate onboarding guide');
      }
    } catch (err) {
      console.error('Error generating onboarding guide:', err);
      setError(err.message || 'Failed to generate onboarding guide');
    } finally {
      setLoading(false);
    }
  };

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
      <Card 
        title="Personalized Onboarding Guide" 
        icon={Rocket}
        headerAction={
          onboardingData ? (
            <button
              onClick={generateOnboardingGuide}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'rgba(102, 126, 234, 0.1)',
                color: '#667eea',
                border: '1px solid rgba(102, 126, 234, 0.3)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              <RefreshCw size={16} />
              Regenerate
            </button>
          ) : null
        }
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
          Get a customized onboarding experience tailored to this repository. 
          Our AI will analyze the codebase and create a step-by-step guide just for you.
        </p>
        
        {!onboardingData && !loading && (
          <button
            onClick={generateOnboardingGuide}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)'
            }}
          >
            <Zap size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Generate My Onboarding Guide
          </button>
        )}
      </Card>

      {/* Loading State */}
      {loading && (
        <Card title="Generating Guide" icon={Clock}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid var(--border-color)',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '10px', fontSize: '16px' }}>
              Generating your onboarding guide...
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Analyzing repository structure and creating personalized steps
            </p>
          </div>
        </Card>
      )}

      {/* Progress Bar */}
      {onboardingData && (
        <Card 
          title="Progress" 
          icon={Award}
          headerAction={<Badge variant="success">{Math.round(progressPercentage)}% Complete</Badge>}
        >
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>
              {completedSteps.size} of {onboardingData.steps.length} steps completed
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '12px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '6px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progressPercentage}%`,
              height: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              transition: 'width 0.3s ease',
              borderRadius: '6px'
            }}></div>
          </div>
        </Card>
      )}

      {/* Code Analysis Insights */}
      {codeAnalysis && !isCodeAnalysisLoading && (
        <Card title="Code Insights from Analysis" icon={FileCode}>
          <div className="ca-metrics-grid">
            {codeAnalysis.summary && (
              <MetricCard label="Files Analyzed" value={codeAnalysis.summary.analyzedFiles || 0} />
            )}
            {codeAnalysis.summary && (
              <MetricCard label="Lines of Code" value={codeAnalysis.summary.totalLines?.toLocaleString() || 0} />
            )}
            {codeAnalysis.definitions && (
              <MetricCard label="Functions" value={codeAnalysis.definitions?.functions?.length || 0} />
            )}
            {codeAnalysis.definitions && (
              <MetricCard label="Classes" value={codeAnalysis.definitions?.classes?.length || 0} />
            )}
          </div>
          
          {/* Detected Frameworks */}
          {codeAnalysis.summary && codeAnalysis.summary.frameworks && codeAnalysis.summary.frameworks.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} />
                Frameworks & Libraries
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {codeAnalysis.summary.frameworks.map((fw, idx) => (
                  <Pill key={idx} variant="info">{fw}</Pill>
                ))}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>
                💡 Familiarize yourself with these technologies before diving into the code
              </p>
            </div>
          )}

          {/* Key Functions */}
          {codeAnalysis.definitions && codeAnalysis.definitions.functions && codeAnalysis.definitions.functions.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCode size={16} />
                Key Functions to Understand
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {codeAnalysis.definitions.functions.slice(0, 5).map((func, idx) => (
                  <li 
                    key={idx} 
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px',
                      background: 'rgba(102, 126, 234, 0.08)',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      border: '1px solid rgba(102, 126, 234, 0.15)'
                    }}
                  >
                    <code style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{func.name}()</code>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {func.file} : Line {func.line}
                    </span>
                  </li>
                ))}
              </ul>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>
                💡 Start by understanding these core functions
              </p>
            </div>
          )}

          {/* Architecture Patterns */}
          {codeAnalysis.summary && codeAnalysis.summary.patterns && codeAnalysis.summary.patterns.length > 0 && (
            <div>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} />
                Architecture Patterns
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {codeAnalysis.summary.patterns.map((pattern, idx) => (
                  <Pill key={idx} variant="success">{pattern}</Pill>
                ))}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>
                💡 The codebase follows these architectural patterns
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Onboarding Steps */}
      {onboardingData && onboardingData.steps.map((step, index) => (
        <Card
          key={index}
          title={step.title}
          icon={() => <span style={{ fontSize: '24px' }}>{step.icon}</span>}
          headerAction={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge variant="info">Step {index + 1}</Badge>
              <Badge 
                variant={step.difficulty === 'Beginner' ? 'success' : step.difficulty === 'Intermediate' ? 'warning' : 'danger'}
              >
                {step.difficulty}
              </Badge>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} />
                {step.duration}
              </span>
            </div>
          }
          style={{
            opacity: completedSteps.has(index) ? 0.85 : 1,
            transition: 'all 0.3s ease'
          }}
          headerActionRight={
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
              {completedSteps.has(index) && <CheckCircle size={16} />}
            </button>
          }
        >
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
            {step.description}
          </p>

          {/* Action Items */}
          <div style={{
            background: 'rgba(102, 126, 234, 0.08)',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid rgba(102, 126, 234, 0.2)'
          }}>
            <h4 style={{
              margin: '0 0 12px 0',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Target size={14} />
              Action Items
            </h4>
            <ul style={{
              margin: 0,
              paddingLeft: '0',
              listStyle: 'none'
            }}>
              {step.actions.map((action, actionIndex) => (
                <li key={actionIndex} style={{
                  marginBottom: '8px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  fontSize: '13px',
                  lineHeight: '1.6'
                }}>
                  <span style={{
                    color: '#667eea',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    minWidth: '16px'
                  }}>•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      ))}

      {/* Completion Message */}
      {onboardingData && completedSteps.size === onboardingData.steps.length && (
        <Card 
          title="Congratulations!" 
          icon={Award}
          style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
            border: '2px solid rgba(102, 126, 234, 0.3)'
          }}
        >
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <CheckCircle size={64} style={{ color: '#10b981', marginBottom: '16px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.6' }}>
              You've completed all onboarding steps. You're now ready to contribute to this project!
            </p>
          </div>
        </Card>
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
