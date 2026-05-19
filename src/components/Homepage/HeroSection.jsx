import React, { useState } from 'react';

function HeroSection({ repoUrl, onUrlChange, onAnalyze, isAnalyzing }) {
  const [error, setError] = useState('');

  const validateUrl = (url) => {
    if (!url.trim()) {
      return 'Please enter a GitHub repository URL';
    }
    if (!url.includes('github.com')) {
      return 'Please enter a valid GitHub URL (must contain github.com)';
    }
    return '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validateUrl(repoUrl);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    onAnalyze();
  };

  const handleInputChange = (e) => {
    onUrlChange(e.target.value);
    if (error) {
      setError('');
    }
  };

  return (
    <section className="hero-section">
      <div className="hero-content">
        <div className="hero-logo-container hero-codeatlas-brand">
          <div className="sidebar-logo hero-brand-icon" aria-hidden="true" />
          <div className="hero-brand-text">
            <span className="hero-brand-name">CodeAtlas</span>
            <span className="hero-brand-tagline">Understand Systems. Predict Impact.</span>
          </div>
        </div>
        <h1 className="hero-subtitle">
          Understand Any Codebase
          <span className="hero-title-gradient"> in Minutes</span>
        </h1>
        
        <p className="hero-subheading">
          Whether you're joining a team or exploring a new repository, CodeAtlas turns confusion into clarity using IBM Bob and AI.
        </p>

        <div className="hero-info-section">
          <p className="info-label">Manual onboarding takes days</p>
          <p className="info-label">CodeAtlas gets you productive in minutes</p>
        </div>

        <p className="hero-support-line">
          From first day to first contribution faster than ever.
        </p>

        <div className="hero-chips-section">
          <div className="hero-feature-chips">
            <span className="feature-chip">Instant Code Summary</span>
            <span className="feature-chip">Visual Architecture</span>
            <span className="feature-chip">5 Step Onboarding</span>
            <span className="feature-chip">Security Insights</span>
            <span className="feature-chip">AI Code Chat</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="hero-form">
          <div className="hero-input-wrapper">
            <input
              type="text"
              className={`hero-input ${error ? 'hero-input-error' : ''}`}
              placeholder="https://github.com/username/repository"
              value={repoUrl}
              onChange={handleInputChange}
              disabled={isAnalyzing}
            />
            {error && (
              <div className="hero-error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}
          </div>
          
          <button
            type="submit"
            className="hero-cta-button"
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <span className="button-spinner"></span>
                Analyzing...
              </>
            ) : (
              <>
                Analyze Repository
              </>
            )}
          </button>

          <div className="hero-info-section">
            <p className="info-label">Paste any GitHub repository to get started</p>
          </div>
        </form>

        <div className="hero-footer-section">
          <div className="impact-stats">
            <div className="impact-stat">
              <div className="stat-value">10x</div>
              <div className="stat-label">Faster</div>
              <div className="stat-sublabel">Code Analysis</div>
            </div>
            <div className="impact-stat">
              <div className="stat-value">90%</div>
              <div className="stat-label">Time Saved</div>
              <div className="stat-sublabel">On Documentation</div>
            </div>
            <div className="impact-stat">
              <div className="stat-value">95%</div>
              <div className="stat-label">Faster</div>
              <div className="stat-sublabel">Security Scans</div>
            </div>
            <div className="impact-stat">
              <div className="stat-value">80%</div>
              <div className="stat-label">Less</div>
              <div className="stat-sublabel">Onboarding Time</div>
            </div>
          </div>

          <p className="hero-powered-by">
            Powered by IBM Bob and AI
          </p>

          <div className="hero-developer-credit">
            <span className="developer-credit-text">Built by Raj Patil</span>
            <a
              href="https://www.linkedin.com/in/raj-patil-a492a1155/"
              target="_blank"
              rel="noopener noreferrer"
              className="developer-linkedin-link"
              aria-label="Raj Patil's LinkedIn Profile"
            >
              <svg className="developer-linkedin-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="hero-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
    </section>
  );
}

export default HeroSection;

// Made with Bob
