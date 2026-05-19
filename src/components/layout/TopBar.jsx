import React from 'react';
import { Search, Menu, ChevronDown } from 'lucide-react';

function TopBar({ repoLabel, onMenuClick, onOpenCommandCenter }) {
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
        {repoLabel && (
          <div className="topbar-repo" title={repoLabel}>
            <span>{repoLabel}</span>
            <ChevronDown size={14} />
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
