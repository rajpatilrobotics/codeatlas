import React, { useState } from 'react';
import './OnboardingGuide.css';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Separator from '../components/Separator';

// Mock onboarding steps (will be replaced with AI-generated content)
const MOCK_STEPS = [
  {
    id: 1,
    icon: '🎯',
    title: 'Understand the Project Structure',
    difficulty: 'Beginner',
    duration: '15 min',
    description: 'Get familiar with the repository organization, key directories, and file structure. Understanding the layout is crucial for navigating the codebase effectively.',
    actions: [
      'Review the root directory structure and identify main folders',
      'Locate configuration files (package.json, .env.example, etc.)',
      'Identify the entry point of the application',
      'Understand the separation between frontend and backend code'
    ],
    resources: [
      { name: 'Project README', link: '#' },
      { name: 'Architecture Diagram', link: '#' }
    ]
  },
  {
    id: 2,
    icon: '⚙️',
    title: 'Set Up Development Environment',
    difficulty: 'Beginner',
    duration: '20 min',
    description: 'Install dependencies and configure your local development environment. This ensures you can run and test the application on your machine.',
    actions: [
      'Install Node.js 18+ and npm 9+',
      'Clone the repository to your local machine',
      'Run npm install to install all dependencies',
      'Copy .env.example to .env and configure environment variables',
      'Start the development server with npm run dev'
    ],
    resources: [
      { name: 'Setup Guide', link: '#' },
      { name: 'Environment Variables', link: '#' }
    ]
  },
  {
    id: 3,
    icon: '🔍',
    title: 'Explore Key Components',
    difficulty: 'Intermediate',
    duration: '30 min',
    description: 'Dive into the main components and understand their responsibilities. Focus on the core functionality and how different parts interact.',
    actions: [
      'Review the main App component and routing structure',
      'Understand state management approach (Context/Redux/Zustand)',
      'Explore API service layer and data fetching patterns',
      'Study authentication flow and protected routes',
      'Examine reusable UI components in /components directory'
    ],
    resources: [
      { name: 'Component Documentation', link: '#' },
      { name: 'API Reference', link: '#' }
    ]
  },
  {
    id: 4,
    icon: '🧪',
    title: 'Run Tests and Understand Testing',
    difficulty: 'Intermediate',
    duration: '25 min',
    description: 'Learn about the testing strategy and run existing tests. Understanding tests helps you grasp expected behavior and write better code.',
    actions: [
      'Run npm test to execute the test suite',
      'Review test files and understand testing patterns',
      'Check code coverage with npm run test:coverage',
      'Understand mocking strategies for API calls',
      'Learn about integration vs unit tests in this project'
    ],
    resources: [
      { name: 'Testing Guide', link: '#' },
      { name: 'Test Examples', link: '#' }
    ]
  },
  {
    id: 5,
    icon: '🚀',
    title: 'Make Your First Contribution',
    difficulty: 'Advanced',
    duration: '45 min',
    description: 'Pick a good first issue and make your first contribution. Start with something small to get familiar with the contribution workflow.',
    actions: [
      'Browse open issues labeled "good first issue"',
      'Create a new branch for your changes',
      'Make your changes following the coding standards',
      'Write tests for your new code',
      'Submit a pull request with a clear description',
      'Respond to code review feedback'
    ],
    resources: [
      { name: 'Contributing Guide', link: '#' },
      { name: 'Code Style Guide', link: '#' }
    ]
  }
];

const MOCK_INSIGHTS = {
  frameworks: ['React 18', 'Node.js', 'Express', 'PostgreSQL'],
  functions: [
    { name: 'authenticateUser', file: 'src/services/authService.js', line: 45 },
    { name: 'fetchRepositoryData', file: 'src/api/github.js', line: 23 },
    { name: 'generateDiagram', file: 'src/utils/diagramGenerator.js', line: 67 }
  ],
  patterns: ['MVC', 'Repository Pattern', 'Service Layer'],
  stats: {
    files: 156,
    lines: 12450,
    functions: 89,
    classes: 34
  }
};

function OnboardingGuide() {
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [expandedStep, setExpandedStep] = useState(null);

  const toggleStepCompletion = (stepId) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }
    setCompletedSteps(newCompleted);
  };

  const toggleStepExpansion = (stepId) => {
    setExpandedStep(expandedStep === stepId ? null : stepId);
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      'Beginner': 'var(--status-success)',
      'Intermediate': 'var(--status-warning)',
      'Advanced': 'var(--status-error)'
    };
    return colors[difficulty] || 'var(--text-tertiary)';
  };

  const progressPercentage = (completedSteps.size / MOCK_STEPS.length) * 100;

  return (
    <div className="onboarding-page">
      {/* Header */}
      <div className="onboarding-header">
        <div>
          <h1 className="onboarding-title">Onboarding Guide</h1>
          <p className="onboarding-subtitle">Your personalized path to mastering this codebase</p>
        </div>
        <Button variant="primary" size="medium">
          Regenerate Guide
        </Button>
      </div>

      {/* Progress Card */}
      <Card className="progress-card">
        <div className="progress-header">
          <div>
            <h3 className="progress-title">Your Progress</h3>
            <p className="progress-subtitle">
              {completedSteps.size} of {MOCK_STEPS.length} steps completed
            </p>
          </div>
          <div className="progress-percentage">
            {Math.round(progressPercentage)}%
          </div>
        </div>
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </Card>

      {/* Code Insights */}
      <Card>
        <h3 className="section-title">Code Insights</h3>
        <Separator />
        
        <div className="insights-grid">
          {/* Frameworks */}
          <div className="insight-section">
            <h4 className="insight-title">⚡ Tech Stack</h4>
            <div className="tech-badges">
              {MOCK_INSIGHTS.frameworks.map((fw, idx) => (
                <span key={idx} className="tech-badge">{fw}</span>
              ))}
            </div>
            <p className="insight-tip">
              💡 Familiarize yourself with these technologies first
            </p>
          </div>

          {/* Key Functions */}
          <div className="insight-section">
            <h4 className="insight-title">🔧 Key Functions</h4>
            <ul className="function-list">
              {MOCK_INSIGHTS.functions.map((func, idx) => (
                <li key={idx} className="function-item">
                  <code className="function-name">{func.name}()</code>
                  <span className="function-location">
                    {func.file}:{func.line}
                  </span>
                </li>
              ))}
            </ul>
            <p className="insight-tip">
              💡 Start by understanding these core functions
            </p>
          </div>

          {/* Architecture Patterns */}
          <div className="insight-section">
            <h4 className="insight-title">🏗️ Architecture</h4>
            <div className="pattern-badges">
              {MOCK_INSIGHTS.patterns.map((pattern, idx) => (
                <span key={idx} className="pattern-badge">{pattern}</span>
              ))}
            </div>
            <p className="insight-tip">
              💡 The codebase follows these patterns
            </p>
          </div>

          {/* Stats */}
          <div className="insight-section">
            <h4 className="insight-title">📊 Codebase Stats</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{MOCK_INSIGHTS.stats.files}</span>
                <span className="stat-label">Files</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{MOCK_INSIGHTS.stats.lines.toLocaleString()}</span>
                <span className="stat-label">Lines</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{MOCK_INSIGHTS.stats.functions}</span>
                <span className="stat-label">Functions</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{MOCK_INSIGHTS.stats.classes}</span>
                <span className="stat-label">Classes</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Onboarding Steps */}
      <div className="steps-container">
        {MOCK_STEPS.map((step) => (
          <Card 
            key={step.id}
            className={`step-card ${completedSteps.has(step.id) ? 'completed' : ''}`}
          >
            {/* Step Header */}
            <div className="step-header">
              <div className="step-header-left">
                <span className="step-icon">{step.icon}</span>
                <div className="step-info">
                  <div className="step-meta">
                    <Badge variant="secondary" size="small">Step {step.id}</Badge>
                    <Badge 
                      variant={step.difficulty === 'Beginner' ? 'success' : step.difficulty === 'Intermediate' ? 'warning' : 'danger'}
                      size="small"
                    >
                      {step.difficulty}
                    </Badge>
                    <span className="step-duration">⏱️ {step.duration}</span>
                  </div>
                  <h3 className="step-title">{step.title}</h3>
                </div>
              </div>
              
              <div className="step-actions">
                <button
                  className="expand-button"
                  onClick={() => toggleStepExpansion(step.id)}
                >
                  {expandedStep === step.id ? '▼' : '▶'}
                </button>
                <button
                  className={`complete-button ${completedSteps.has(step.id) ? 'completed' : ''}`}
                  onClick={() => toggleStepCompletion(step.id)}
                >
                  {completedSteps.has(step.id) ? '✓' : ''}
                </button>
              </div>
            </div>

            {/* Step Description */}
            <p className="step-description">{step.description}</p>

            {/* Expanded Content */}
            {expandedStep === step.id && (
              <div className="step-expanded">
                <Separator />
                
                {/* Action Items */}
                <div className="action-items">
                  <h4 className="action-title">📋 Action Items</h4>
                  <ul className="action-list">
                    {step.actions.map((action, idx) => (
                      <li key={idx} className="action-item">
                        <span className="action-bullet">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Resources */}
                {step.resources && step.resources.length > 0 && (
                  <div className="resources">
                    <h4 className="resources-title">📚 Resources</h4>
                    <div className="resources-list">
                      {step.resources.map((resource, idx) => (
                        <a key={idx} href={resource.link} className="resource-link">
                          {resource.name} →
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Completion Message */}
      {completedSteps.size === MOCK_STEPS.length && (
        <Card className="completion-card">
          <div className="completion-content">
            <span className="completion-icon">🎉</span>
            <h3 className="completion-title">Congratulations!</h3>
            <p className="completion-text">
              You've completed all onboarding steps. You're now ready to contribute to this project!
            </p>
            <Button variant="primary" size="medium">
              View Contributing Guide
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default OnboardingGuide;

// Made with Bob
