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
              style={{ height: isScrolled ? '40px' : '50px', width: 'auto' }}
            />
          </div>
          <p className="tagline">AI-Powered Code Analysis & Onboarding Platform</p>
        </div>
        
        <div className="header-right">
          <p className="header-attribution">
            Built using <span className="attribution-highlight">IBM Bob</span> and <span className="attribution-highlight">IBM watsonx AI</span>
          </p>
          <p className="header-subtext">
            Intelligent code analysis powered by enterprise AI
          </p>
          <p className="header-developer">
            Built by <span className="developer-name">Raj Patil</span>
          </p>
        </div>
      </div>
    </header>
  );
}

export default Header;

// Made with Bob
