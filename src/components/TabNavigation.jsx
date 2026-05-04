import React from 'react';

function TabNavigation({ tabs, activeTab, onTabChange, onDownloadPDF, isGeneratingPDF, onNewAnalysis }) {
  return (
    <nav className="tab-navigation">
      <div className="tab-nav-container">
        {onNewAnalysis && (
          <button
            className="new-analysis-btn"
            onClick={onNewAnalysis}
            title="Analyze a new repository"
          >
            <span className="new-analysis-icon">🔄</span>
            New Analysis
          </button>
        )}
        
        <div className="tab-list">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {onDownloadPDF && (
          <button
            className="download-pdf-btn-nav"
            onClick={onDownloadPDF}
            disabled={isGeneratingPDF}
          >
            <span className="download-icon">📄</span>
            {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
          </button>
        )}
      </div>
    </nav>
  );
}

export default TabNavigation;

// Made with Bob
