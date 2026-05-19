import React from 'react';

function LandingHeader({ onLogoClick }) {
  return (
    <header className="landing-header">
      <div className="landing-header-inner">
        <button type="button" className="sidebar-brand" onClick={onLogoClick}>
          <div className="sidebar-logo" aria-hidden="true" />
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">CodeAtlas</span>
            <span className="sidebar-brand-tagline">Understand Systems. Predict Impact.</span>
          </div>
        </button>
        <span className="topbar-attribution">
          Built by <strong>Raj Patil</strong>
        </span>
      </div>
    </header>
  );
}

export default LandingHeader;
