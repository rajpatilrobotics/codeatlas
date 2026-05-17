'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import './CommandPalette.css';

// Command categories and actions
const COMMANDS = [
  // Navigation
  {
    id: 'nav-dashboard',
    title: 'Go to Dashboard',
    description: 'Repository mission control',
    category: 'Navigation',
    icon: '📊',
    action: '/dashboard',
    keywords: ['dashboard', 'home', 'overview']
  },
  {
    id: 'nav-architecture',
    title: 'Open Architecture',
    description: 'View system architecture diagrams',
    category: 'Navigation',
    icon: '🏗️',
    action: '/architecture',
    keywords: ['architecture', 'diagram', 'system']
  },
  {
    id: 'nav-repo-graph',
    title: 'Open Repository Graph',
    description: 'Visualize dependency graph',
    category: 'Navigation',
    icon: '🔗',
    action: '/repository-graph',
    keywords: ['graph', 'dependencies', 'repo']
  },
  {
    id: 'nav-blast-radius',
    title: 'Open Blast Radius',
    description: 'Analyze change impact',
    category: 'Navigation',
    icon: '💥',
    action: '/blast-radius',
    keywords: ['blast', 'radius', 'impact']
  },
  {
    id: 'nav-security',
    title: 'Open Security Scanner',
    description: 'View security analysis',
    category: 'Navigation',
    icon: '🔒',
    action: '/security',
    keywords: ['security', 'vulnerabilities', 'scan']
  },
  {
    id: 'nav-chat',
    title: 'Open AI Chat',
    description: 'Chat with AI about your code',
    category: 'Navigation',
    icon: '💬',
    action: '/chat',
    keywords: ['chat', 'ai', 'ask']
  },
  {
    id: 'nav-docs',
    title: 'Open Documentation',
    description: 'View auto-generated docs',
    category: 'Navigation',
    icon: '📚',
    action: '/documentation',
    keywords: ['docs', 'documentation', 'readme']
  },
  {
    id: 'nav-planner',
    title: 'Open Planner',
    description: 'Plan code changes',
    category: 'Navigation',
    icon: '📋',
    action: '/planner',
    keywords: ['planner', 'plan', 'tasks']
  },
  {
    id: 'nav-debug',
    title: 'Open Debug Navigator',
    description: 'Debug with AI assistance',
    category: 'Navigation',
    icon: '🐛',
    action: '/debug-navigator',
    keywords: ['debug', 'fix', 'error']
  },
  {
    id: 'nav-heatmap',
    title: 'Open Heatmap',
    description: 'View code complexity heatmap',
    category: 'Navigation',
    icon: '🔥',
    action: '/heatmap',
    keywords: ['heatmap', 'complexity', 'hot']
  },
  {
    id: 'nav-workspaces',
    title: 'Open Workspaces',
    description: 'View saved workspaces',
    category: 'Navigation',
    icon: '📁',
    action: '/workspaces',
    keywords: ['workspaces', 'saved', 'projects']
  },
  
  // Actions
  {
    id: 'action-analyze',
    title: 'Analyze New Repository',
    description: 'Start analyzing a new repository',
    category: 'Actions',
    icon: '🔍',
    action: 'analyze',
    keywords: ['analyze', 'new', 'repository', 'scan']
  },
  {
    id: 'action-search-files',
    title: 'Search Files',
    description: 'Search through repository files',
    category: 'Actions',
    icon: '📄',
    action: 'search-files',
    keywords: ['search', 'files', 'find']
  },
  {
    id: 'action-risky-modules',
    title: 'Show Risky Modules',
    description: 'Display high-risk code modules',
    category: 'Actions',
    icon: '⚠️',
    action: 'risky-modules',
    keywords: ['risky', 'risk', 'dangerous', 'vulnerable']
  },
  {
    id: 'action-explain-arch',
    title: 'Explain Architecture',
    description: 'Get AI explanation of architecture',
    category: 'Actions',
    icon: '🤖',
    action: 'explain-architecture',
    keywords: ['explain', 'architecture', 'ai']
  },
  {
    id: 'action-security-scan',
    title: 'Run Security Scan',
    description: 'Perform security analysis',
    category: 'Actions',
    icon: '🛡️',
    action: 'security-scan',
    keywords: ['security', 'scan', 'vulnerabilities']
  }
];

function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const router = useRouter();

  // Filter commands based on query
  const filteredCommands = query.trim() === ''
    ? COMMANDS
    : COMMANDS.filter(cmd => {
        const searchText = query.toLowerCase();
        return (
          cmd.title.toLowerCase().includes(searchText) ||
          cmd.description.toLowerCase().includes(searchText) ||
          cmd.keywords.some(keyword => keyword.includes(searchText))
        );
      });

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            handleCommandSelect(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle command selection
  const handleCommandSelect = (command) => {
    if (command.action.startsWith('/')) {
      // Navigation command
      router.push(command.action);
    } else {
      // Action command (would trigger specific actions)
      console.log('Execute action:', command.action);
      // TODO: Implement action handlers
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        {/* Search Input */}
        <div className="command-palette-search">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M9 16C12.866 16 16 12.866 16 9C16 5.13401 12.866 2 9 2C5.13401 2 2 5.13401 2 9C2 12.866 5.13401 16 9 16Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18 18L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Search commands..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <kbd className="command-palette-kbd">ESC</kbd>
        </div>

        {/* Results */}
        <div className="command-palette-results">
          {Object.keys(groupedCommands).length === 0 ? (
            <div className="command-palette-empty">
              <span className="empty-icon">🔍</span>
              <p>No commands found</p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, commands]) => (
              <div key={category} className="command-category">
                <div className="command-category-label">{category}</div>
                {commands.map((command, idx) => {
                  const globalIndex = filteredCommands.indexOf(command);
                  return (
                    <button
                      key={command.id}
                      className={`command-item ${globalIndex === selectedIndex ? 'selected' : ''}`}
                      onClick={() => handleCommandSelect(command)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                    >
                      <span className="command-icon">{command.icon}</span>
                      <div className="command-content">
                        <div className="command-title">{command.title}</div>
                        <div className="command-description">{command.description}</div>
                      </div>
                      <kbd className="command-shortcut">↵</kbd>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="command-palette-footer">
          <div className="footer-hint">
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            <span>Navigate</span>
          </div>
          <div className="footer-hint">
            <kbd>↵</kbd>
            <span>Select</span>
          </div>
          <div className="footer-hint">
            <kbd>ESC</kbd>
            <span>Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;

// Made with Bob