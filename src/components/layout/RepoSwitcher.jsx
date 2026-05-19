import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { formatRelativeTime, urlsMatch } from '../../utils/recentRepos';

function RepoSwitcher({
  repoLabel,
  repoUrl,
  recentRepos,
  isAnalyzing,
  onSelectRepo,
  onClearHistory,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleSelect = (url) => {
    setOpen(false);
    onSelectRepo?.(url);
  };

  if (!repoLabel && !repoUrl) return null;

  return (
    <div className="repo-switcher" ref={rootRef}>
      <button
        type="button"
        className={`topbar-repo topbar-repo-trigger ${open ? 'open' : ''}`}
        onClick={() => !isAnalyzing && setOpen((v) => !v)}
        disabled={isAnalyzing}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Recent repositories"
        title={repoLabel}
      >
        {isAnalyzing ? (
          <Loader2 size={14} className="repo-switcher-spinner" aria-hidden />
        ) : null}
        <span className="topbar-repo-label">{repoLabel}</span>
        <ChevronDown size={14} className={`repo-switcher-chevron ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className="repo-switcher-menu" role="listbox" aria-label="Recent repositories">
          {recentRepos.length === 0 ? (
            <p className="repo-switcher-empty">No recent repositories yet.</p>
          ) : (
            <ul className="repo-switcher-list">
              {recentRepos.map((item) => {
                const isActive = urlsMatch(item.url, repoUrl);
                return (
                  <li key={item.url}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={`repo-switcher-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelect(item.url)}
                    >
                      <span className="repo-switcher-item-label">{item.label}</span>
                      <span className="repo-switcher-item-time">
                        {formatRelativeTime(item.analyzedAt)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {recentRepos.length > 0 && (
            <div className="repo-switcher-footer">
              <button
                type="button"
                className="repo-switcher-clear"
                onClick={() => {
                  onClearHistory?.();
                  setOpen(false);
                }}
              >
                Clear history
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RepoSwitcher;
