import React from 'react';
import { Search, Menu } from 'lucide-react';
import RepoSwitcher from './RepoSwitcher';
import { urlsMatch } from '../../utils/recentRepos';

function TopBar({
  repoLabel,
  repoUrl,
  recentRepos,
  isAnalyzing,
  lastAnalyzedRepoUrl,
  onMenuClick,
  onOpenCommandCenter,
  onNewAnalysis,
  onDownloadPDF,
  onSelectRecentRepo,
  onAnalyze,
  onClearRecentRepos,
  isGeneratingPDF,
  pdfProgress,
}) {
  const showAnalyze =
    Boolean(repoUrl?.trim()) &&
    (!lastAnalyzedRepoUrl || !urlsMatch(repoUrl, lastAnalyzedRepoUrl));

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <button
          type="button"
          className="topbar-search-trigger"
          onClick={onOpenCommandCenter}
          aria-label="Open command center"
        >
          <Search size={16} />
          <span className="topbar-search-placeholder">Search</span>
          <span className="topbar-search-kbd">⌘K</span>
        </button>

        <div className="topbar-actions">
          {onNewAnalysis && (
            <button type="button" className="topbar-action-btn" onClick={onNewAnalysis}>
              New Analysis
            </button>
          )}
          {onDownloadPDF && (
            <button
              type="button"
              className="topbar-action-btn topbar-action-btn-primary"
              onClick={onDownloadPDF}
              disabled={isGeneratingPDF}
              aria-busy={isGeneratingPDF}
              aria-live="polite"
              title={isGeneratingPDF ? (pdfProgress || 'Generating PDF report') : 'Download PDF report'}
            >
              {isGeneratingPDF ? pdfProgress || 'Generating...' : 'Download PDF'}
            </button>
          )}
        </div>

        {(repoLabel || repoUrl) && (
          <div className="topbar-repo-group">
            <RepoSwitcher
              repoLabel={repoLabel}
              repoUrl={repoUrl}
              recentRepos={recentRepos}
              isAnalyzing={isAnalyzing}
              onSelectRepo={onSelectRecentRepo}
              onClearHistory={onClearRecentRepos}
            />
            {showAnalyze && onAnalyze && (
              <button
                type="button"
                className="topbar-action-btn topbar-action-btn-primary topbar-analyze-btn"
                onClick={onAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="topbar-right">
        <span className="topbar-attribution">
          Built by <strong>Raj Patil</strong>
        </span>
      </div>
    </header>
  );
}

export default TopBar;
