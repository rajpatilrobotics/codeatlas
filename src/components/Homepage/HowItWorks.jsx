import React from 'react';

function HowItWorks() {
  const steps = [
    {
      number: '01',
      icon: '📋',
      title: 'Paste Repository',
      description: 'Enter any GitHub repository URL into the input field above',
      time: 'Seconds',
      timeLabel: 'Fast'
    },
    {
      number: '02',
      icon: '⚡',
      title: 'AI Analyzes',
      description: 'DevDock analyzes your entire codebase',
      time: '2-3 minutes',
      timeLabel: 'Automated'
    },
    {
      number: '03',
      icon: '✨',
      title: 'Get Insights',
      description: 'Get comprehensive analysis, security scans, interactive tools, and AI for code questions',
      time: 'Instantly',
      timeLabel: 'Ready'
    }
  ];

  return (
    <section className="how-it-works-section">
      <div className="how-it-works-container">
        <div className="how-it-works-header">
          <h2 className="how-it-works-title">How It Works</h2>
          <p className="how-it-works-subtitle">
            From repository to insights in minutes — three simple steps
          </p>
        </div>

        <div className="steps-container">
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <div className="step-card">
                <div className="step-number">{step.number}</div>
                <div className="step-icon">{step.icon}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
                <div className="step-time-badge">
                  <span className="time-badge-label">{step.timeLabel}</span>
                  <span className="time-badge-value">{step.time}</span>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="step-connector">
                  <div className="connector-line"></div>
                  <div className="connector-arrow">→</div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;

// Made with Bob
