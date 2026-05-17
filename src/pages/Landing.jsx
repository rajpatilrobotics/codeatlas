/**
 * Landing Page
 * First impression - hero, features, CTA
 * Minimal, powerful, conversion-focused
 */

import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import './Landing.css';

const Landing = () => {
  const features = [
    {
      icon: '◈',
      title: 'Architecture Intelligence',
      description: 'Visualize your codebase structure with AI-powered architecture diagrams and dependency graphs.'
    },
    {
      icon: '◉',
      title: 'Repository Graph',
      description: 'Interactive network visualization of your entire codebase relationships and connections.'
    },
    {
      icon: '◎',
      title: 'Blast Radius Analysis',
      description: 'Understand the impact of changes before you make them. See what breaks when you modify code.'
    },
    {
      icon: '◐',
      title: 'AI Planner',
      description: 'Get intelligent task breakdowns and implementation strategies for complex features.'
    },
    {
      icon: '◓',
      title: 'Security Scanner',
      description: 'Automated vulnerability detection with real-time security insights and recommendations.'
    },
    {
      icon: '◔',
      title: 'Multi-LLM Support',
      description: 'Choose from Watsonx, GPT-4, Claude, or Gemini. Use the right AI for each task.'
    }
  ];

  const stats = [
    { value: '10x', label: 'Faster Onboarding' },
    { value: '80%', label: 'Time Saved' },
    { value: '5min', label: 'To First Insight' }
  ];

  return (
    <div className="landing">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-header-content">
          <div className="landing-logo">
            <div className="landing-logo-icon">CA</div>
            <span className="landing-logo-text">CodeAtlas</span>
          </div>
          
          <nav className="landing-nav">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#how-it-works" className="landing-nav-link">How It Works</a>
            <a href="https://github.com" className="landing-nav-link">GitHub</a>
          </nav>

          <div className="landing-header-actions">
            <Button variant="ghost" size="sm">Sign In</Button>
            <Button variant="primary" size="sm">Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <span className="landing-hero-badge-icon">✨</span>
            <span>Powered by AI • Multi-LLM Support</span>
          </div>

          <h1 className="landing-hero-title">
            Understand Any Codebase
            <br />
            <span className="landing-hero-title-gradient">In Minutes, Not Months</span>
          </h1>

          <p className="landing-hero-description">
            CodeAtlas uses AI to analyze, visualize, and explain your codebase.
            Get architecture diagrams, security insights, and intelligent documentation instantly.
          </p>

          <div className="landing-hero-actions">
            <Link to="/dashboard">
              <Button variant="primary" size="lg">
                Start Analyzing
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Button>
            </Link>
            <Button variant="secondary" size="lg">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L10 6H14L11 9L12 13L8 10L4 13L5 9L2 6H6L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              View Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="landing-hero-stats">
            {stats.map((stat, index) => (
              <div key={index} className="landing-hero-stat">
                <div className="landing-hero-stat-value">{stat.value}</div>
                <div className="landing-hero-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero Visual */}
        <div className="landing-hero-visual">
          <div className="landing-hero-visual-card">
            <div className="landing-hero-visual-header">
              <div className="landing-hero-visual-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="landing-hero-visual-title">Architecture Analysis</div>
            </div>
            <div className="landing-hero-visual-content">
              <div className="landing-hero-visual-graph">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="landing-hero-visual-node" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="landing-features">
        <div className="landing-section-header">
          <h2 className="landing-section-title">Everything You Need</h2>
          <p className="landing-section-description">
            Comprehensive code intelligence powered by multiple AI models
          </p>
        </div>

        <div className="landing-features-grid">
          {features.map((feature, index) => (
            <Card key={index} className="landing-feature-card">
              <div className="landing-feature-icon">{feature.icon}</div>
              <h3 className="landing-feature-title">{feature.title}</h3>
              <p className="landing-feature-description">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="landing-how">
        <div className="landing-section-header">
          <h2 className="landing-section-title">How It Works</h2>
          <p className="landing-section-description">
            Three simple steps to complete code understanding
          </p>
        </div>

        <div className="landing-how-steps">
          <div className="landing-how-step">
            <div className="landing-how-step-number">01</div>
            <h3 className="landing-how-step-title">Connect Repository</h3>
            <p className="landing-how-step-description">
              Link your GitHub repository or paste a URL. CodeAtlas supports any language.
            </p>
          </div>

          <div className="landing-how-step">
            <div className="landing-how-step-number">02</div>
            <h3 className="landing-how-step-title">AI Analysis</h3>
            <p className="landing-how-step-description">
              Our multi-LLM system analyzes your code, generating insights and visualizations.
            </p>
          </div>

          <div className="landing-how-step">
            <div className="landing-how-step-number">03</div>
            <h3 className="landing-how-step-title">Explore & Learn</h3>
            <p className="landing-how-step-description">
              Navigate architecture diagrams, security reports, and AI-generated documentation.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-cta">
        <div className="landing-cta-content">
          <h2 className="landing-cta-title">Ready to Understand Your Code?</h2>
          <p className="landing-cta-description">
            Join developers who save hours every week with AI-powered code intelligence.
          </p>
          <Link to="/dashboard">
            <Button variant="primary" size="lg">
              Start Free Analysis
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div className="landing-footer-left">
            <div className="landing-logo">
              <div className="landing-logo-icon">CA</div>
              <span className="landing-logo-text">CodeAtlas</span>
            </div>
            <p className="landing-footer-tagline">AI-powered code intelligence</p>
          </div>

          <div className="landing-footer-links">
            <div className="landing-footer-section">
              <h4 className="landing-footer-section-title">Product</h4>
              <a href="#features" className="landing-footer-link">Features</a>
              <a href="#how-it-works" className="landing-footer-link">How It Works</a>
              <a href="#" className="landing-footer-link">Pricing</a>
            </div>

            <div className="landing-footer-section">
              <h4 className="landing-footer-section-title">Resources</h4>
              <a href="#" className="landing-footer-link">Documentation</a>
              <a href="#" className="landing-footer-link">API Reference</a>
              <a href="#" className="landing-footer-link">GitHub</a>
            </div>

            <div className="landing-footer-section">
              <h4 className="landing-footer-section-title">Company</h4>
              <a href="#" className="landing-footer-link">About</a>
              <a href="#" className="landing-footer-link">Blog</a>
              <a href="#" className="landing-footer-link">Contact</a>
            </div>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <p className="landing-footer-copyright">© 2026 CodeAtlas. Built for developers.</p>
          <div className="landing-footer-bottom-links">
            <a href="#" className="landing-footer-link">Privacy</a>
            <a href="#" className="landing-footer-link">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

// Made with Bob
