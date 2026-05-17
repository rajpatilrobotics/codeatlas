/**
 * Sidebar Component
 * Main navigation for CodeAtlas
 * Hierarchical structure with 5 main sections
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState(['overview', 'intelligence']);

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const isActive = (path) => location.pathname === path;
  const isExpanded = (sectionId) => expandedSections.includes(sectionId);

  // Navigation structure
  const navigation = [
    {
      id: 'overview',
      label: 'OVERVIEW',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: '◆' },
        { path: '/summary', label: 'Summary', icon: '◇' },
      ]
    },
    {
      id: 'intelligence',
      label: 'INTELLIGENCE',
      items: [
        { path: '/architecture', label: 'Architecture', icon: '◈' },
        { path: '/repository-graph', label: 'Repository Graph', icon: '◉', badge: 'New' },
        { path: '/blast-radius', label: 'Blast Radius', icon: '◎', badge: 'New' },
        { path: '/planner', label: 'Planner', icon: '◐', badge: 'New' },
        { path: '/debug-navigator', label: 'Debug Navigator', icon: '◑', badge: 'New' },
        { path: '/heatmap', label: 'Heatmap', icon: '◒', badge: 'New' },
      ]
    },
    {
      id: 'security',
      label: 'SECURITY',
      items: [
        { path: '/security-scanner', label: 'Security Scanner', icon: '◓' },
      ]
    },
    {
      id: 'ai-workspace',
      label: 'AI WORKSPACE',
      items: [
        { path: '/chat', label: 'Chat', icon: '◔' },
        { path: '/documentation', label: 'Documentation', icon: '◕' },
        { path: '/onboarding', label: 'Onboarding', icon: '◖' },
      ]
    },
    {
      id: 'workspaces',
      label: 'WORKSPACES',
      items: [
        { path: '/workspaces', label: 'Saved Workspaces', icon: '◗', badge: 'New' },
      ]
    }
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-header">
        <Link to="/" className="sidebar-logo">
          <div className="sidebar-logo-icon">CA</div>
          <span className="sidebar-logo-text">CodeAtlas</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navigation.map((section) => (
          <div key={section.id} className="sidebar-section">
            <button
              className={`sidebar-section-header ${isExpanded(section.id) ? 'sidebar-section-expanded' : ''}`}
              onClick={() => toggleSection(section.id)}
            >
              <span className="sidebar-section-label">{section.label}</span>
              <svg 
                className="sidebar-section-icon" 
                width="12" 
                height="12" 
                viewBox="0 0 12 12" 
                fill="none"
              >
                <path 
                  d="M4.5 3L7.5 6L4.5 9" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {isExpanded(section.id) && (
              <div className="sidebar-section-items">
                {section.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`sidebar-item ${isActive(item.path) ? 'sidebar-item-active' : ''}`}
                  >
                    <span className="sidebar-item-icon">{item.icon}</span>
                    <span className="sidebar-item-label">{item.label}</span>
                    {item.badge && (
                      <span className="sidebar-item-badge">{item.badge}</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="sidebar-footer-item">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path 
              d="M8 2V14M2 8H14" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round"
            />
          </svg>
          <span>New Analysis</span>
        </button>
        
        <div className="sidebar-footer-divider" />
        
        <button className="sidebar-footer-item">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5V8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>Recent</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

// Made with Bob
