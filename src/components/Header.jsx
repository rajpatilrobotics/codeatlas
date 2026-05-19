import React, { useState, useEffect } from 'react';

function Header({ onLogoClick }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Add scrolled class when user scrolls down more than 10px
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);

    // Cleanup
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`header ${isScrolled ? 'header-scrolled' : ''}`}>
      <div className="header-content">
        <div className="header-left">
          <div
            className="logo clickable-logo"
            onClick={onLogoClick}
            title="Return to home"
          >
            <img
              src="/devdock-logo-horizontal.svg"
              alt="DevDock"
              className="logo-image"
              style={{ height: '40px', width: 'auto' }}
            />
          </div>
          <p className="tagline">AI-Powered Code Analysis & Onboarding Platform</p>
        </div>
        
        <div className="header-right">
          <p className="header-attribution">
            Built using <span className="attribution-highlight">IBM Bob</span> and <span className="attribution-highlight">Groq/Gemini AI</span>
          </p>
          <p className="header-subtext">
            Intelligent code analysis powered by enterprise AI
          </p>
          <div className="header-developer">
            <span className="developer-text">Built by <span className="developer-name">Raj Patil</span></span>
            <a
              href="https://www.linkedin.com/in/raj-patil-a492a1155/"
              target="_blank"
              rel="noopener noreferrer"
              className="header-linkedin-link"
              aria-label="Raj Patil's LinkedIn Profile"
            >
              <svg className="header-linkedin-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;

// Made with Bob
