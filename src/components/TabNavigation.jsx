import React from 'react';

function TabNavigation({ tabs, activeTab, onTabChange, onDownloadPDF, isGeneratingPDF, pdfProgress, onNewAnalysis }) {
  return (
    <nav className="tab-navigation">
      <div className="tab-nav-container">
        {onNewAnalysis && (
          <button
            className="new-analysis-btn"
            onClick={onNewAnalysis}
            title="Analyze a new repository"
          >
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
            style={{
              opacity: isGeneratingPDF ? 0.7 : 1,
              cursor: isGeneratingPDF ? 'not-allowed' : 'pointer'
            }}
          >
            <span className="download-icon">{isGeneratingPDF ? '⏳' : '📄'}</span>
            {isGeneratingPDF ? (pdfProgress || 'Generating...') : 'Download PDF'}
          </button>
        )}
      </div>
    </nav>
  );
}

export default TabNavigation;

// Made with Bob
