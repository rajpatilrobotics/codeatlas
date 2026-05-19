import React from 'react';

function FeaturesGrid() {
  const features = [
    {
      icon: '🤖',
      title: 'AI Code Analysis',
      description: 'Understand architecture, tech stack, and structure — powered by AI'
    },
    {
      icon: '💬',
      title: 'AI Chat Assistant',
      description: 'Ask questions about code, get explanations, and receive guidance from AI'
    },
    {
      icon: '📝',
      title: 'Auto Documentation',
      description: 'Generate comprehensive documentation using AI'
    },
    {
      icon: '📊',
      title: 'Architecture Visualization',
      description: 'Interactive diagrams generated instantly from real code patterns'
    },
    {
      icon: '🔒',
      title: 'Security Scanner',
      description: 'AI-assisted vulnerability scanning detects security risks automatically'
    },
    {
      icon: '📝',
      title: 'Auto Documentation',
      description: 'Generate comprehensive documentation using watsonx AI'
    },
    {
      icon: '🎯',
      title: 'Smart Onboarding',
      description: 'Accelerate team onboarding with AI-powered step-by-step guides'
    }
  ];

  return (
    <section className="features-section">
      <div className="features-container">
        <div className="features-header">
          <h2 className="features-title">
            Everything You Need to <span className="features-title-gradient">Move Faster</span>
          </h2>
          <p className="features-subtitle">
            Powerful AI tools that accelerate development and boost productivity
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon-wrapper">
                <span className="feature-icon">{feature.icon}</span>
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              <div className="feature-card-glow"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturesGrid;

// Made with Bob
