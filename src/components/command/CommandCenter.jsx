import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, File, Route, Boxes } from 'lucide-react';
import { STATIC_COMMANDS } from '../../config/commandPalette';
import { buildPaletteItems, groupPaletteItems } from '../../utils/commandPaletteSearch';

const TYPE_ICONS = {
  file: File,
  api: Route,
  'graph-node': Boxes,
};

function CommandCenter({
  isOpen,
  onClose,
  onNavigate,
  onNewAnalysis,
  repoData,
  codeAnalysis,
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const flatItems = useMemo(
    () =>
      buildPaletteItems({
        query,
        repoData,
        codeAnalysis,
        staticCommands: STATIC_COMMANDS,
      }),
    [query, repoData, codeAnalysis]
  );

  const grouped = useMemo(() => groupPaletteItems(flatItems), [flatItems]);

  const flatForKeyboard = useMemo(
    () => grouped.flatMap((g) => g.items),
    [grouped]
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const runItem = useCallback(
    (item) => {
      if (!item || item.disabled) return;
      if (item.action === 'new-analysis') {
        onNewAnalysis?.();
      } else if (item.tabId) {
        onNavigate?.(item.tabId);
        if (item.type === 'file' && item.path) {
          sessionStorage.setItem('codeatlas_command_file', item.path);
        }
        if (item.type === 'api') {
          sessionStorage.setItem('codeatlas_command_focus', 'api');
        }
      }
      onClose();
    },
    [onClose, onNavigate, onNewAnalysis]
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatForKeyboard.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = flatForKeyboard[selectedIndex];
        if (item) runItem(item);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, flatForKeyboard, selectedIndex, onClose, runItem]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-selected="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  let runningIndex = 0;

  return (
    <div className="cmdk-overlay" role="presentation" onClick={onClose}>
      <div
        className="cmdk-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Command center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cmdk-search-wrap">
          <Search size={18} className="cmdk-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="cmdk-input"
            placeholder="Search commands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search commands"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="cmdk-list" ref={listRef}>
          {flatForKeyboard.length === 0 ? (
            <p className="cmdk-empty">No matching commands or files</p>
          ) : (
            grouped.map((group) => (
              <div key={group.name} className="cmdk-group">
                <div className="cmdk-group-label">{group.name}</div>
                {group.items.map((item) => {
                  const idx = runningIndex;
                  runningIndex += 1;
                  const isSelected = idx === selectedIndex;
                  const Icon =
                    item.icon ||
                    TYPE_ICONS[item.type] ||
                    Search;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`cmdk-item ${isSelected ? 'cmdk-item-selected' : ''}`}
                      data-selected={isSelected}
                      disabled={item.disabled}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => runItem(item)}
                    >
                      <Icon size={18} className="cmdk-item-icon" />
                      <span className="cmdk-item-text">
                        <span className="cmdk-item-label">{item.label}</span>
                        {item.sublabel && (
                          <span className="cmdk-item-sublabel">{item.sublabel}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="cmdk-footer">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}

export default CommandCenter;
