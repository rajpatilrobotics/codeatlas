import React from 'react';

function ImpactComparison() {
  const beforeItems = [
    {
      icon: '⏰',
      text: 'Hours reading docs',
      subtext: 'Manual exploration'
    },
    {
      icon: '📚',
      text: 'Days understanding code',
      subtext: 'Complex mapping'
    },
    {
      icon: '🔍',
      text: 'Manual security checks',
      subtext: 'Time-consuming'
    },
    {
      icon: '🐌',
      text: 'Slow onboarding',
      subtext: 'Weeks to productivity'
    },
    {
      icon: '🔄',
      text: 'Context switching',
      subtext: 'Lost productivity'
    },
    {
      icon: '❓',
      text: 'Unclear dependencies',
      subtext: 'Integration issues'
    },
    {
      icon: '📝',
      text: 'Outdated docs',
      subtext: 'Confusion & errors'
    }
  ];

  const afterItems = [
    {
      icon: '⚡',
      text: 'Instant AI analysis',
      subtext: '2-3 minutes',
      highlight: true
    },
    {
      icon: '🎯',
      text: 'Full understanding',
      subtext: 'Complete insights',
      highlight: true
    },
    {
      icon: '🛡️',
      text: 'Auto security scan',
      subtext: 'Real-time detection',
      highlight: true
    },
    {
      icon: '🚀',
      text: 'Rapid onboarding',
      subtext: 'Hours, not weeks',
      highlight: true
    },
    {
      icon: '🎨',
      text: 'Interactive diagrams',
      subtext: 'Visual clarity',
      highlight: true
    },
    {
      icon: '🔗',
      text: 'Auto dependency map',
      subtext: 'Clear relationships',
      highlight: true
    },
    {
      icon: '📊',
      text: 'Always up-to-date',
      subtext: 'Live analysis',
      highlight: true
    }
  ];

  return (
    <section className="impact-comparison-section">
      <div className="impact-comparison-container">
        <div className="impact-comparison-header">
          <h2 className="impact-comparison-title">
            The DevDock <span className="title-gradient">Difference</span>
          </h2>
          <p className="impact-comparison-subtitle">
            AI transforms your development workflow
          </p>
        </div>

        <div className="comparison-grid">
          {/* Before Column */}
          <div className="comparison-column before-column">
            <div className="column-header">
              <span className="column-icon">❌</span>
              <h3 className="column-title">Without DevDock</h3>
              <p className="column-subtitle">Traditional approach</p>
            </div>
            <div className="comparison-items">
              {beforeItems.map((item, index) => (
                <div key={index} className="comparison-item before-item">
                  <span className="item-icon">{item.icon}</span>
                  <div className="item-content">
                    <p className="item-text">{item.text}</p>
                    <p className="item-subtext">{item.subtext}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* VS Divider */}
          <div className="vs-divider">
            <div className="vs-circle">
              <span className="vs-text">VS</span>
            </div>
            <div className="vs-line"></div>
          </div>

          {/* After Column */}
          <div className="comparison-column after-column">
            <div className="column-header">
              <span className="column-icon">✅</span>
              <h3 className="column-title">With DevDock</h3>
              <p className="column-subtitle">AI-powered speed</p>
            </div>
            <div className="comparison-items">
              {afterItems.map((item, index) => (
                <div key={index} className={`comparison-item after-item ${item.highlight ? 'highlight' : ''}`}>
                  <span className="item-icon">{item.icon}</span>
                  <div className="item-content">
                    <p className="item-text">{item.text}</p>
                    <p className="item-subtext">{item.subtext}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ImpactComparison;

// Made with Bob