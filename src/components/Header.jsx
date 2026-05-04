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
    </header>
  );
}

export default Header;

// Made with Bob
