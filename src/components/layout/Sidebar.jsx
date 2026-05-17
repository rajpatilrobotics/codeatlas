'use client';

/**
 * Sidebar Component
 * Main navigation for CodeAtlas V2
 * Flat structure with section labels
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './Sidebar.css';

const Sidebar = () => {
  const pathname = usePathname();

  const isActive = (path) => pathname === path;

  // Navigation structure - CodeAtlas V2 Final Structure
  const navigation = [
    {
      id: 'overview',
      label: 'OVERVIEW',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: '◆' },
        { path: '/summary', label: 'Summary', icon: '◇' },
        { path: '/architecture', label: 'Architecture', icon: '◈' },
      ]
    },
    {
      id: 'intelligence',
      label: 'INTELLIGENCE',
      items: [
        { path: '/repository-graph', label: 'Repository Graph', icon: '◉' },
        { path: '/blast-radius', label: 'Blast Radius', icon: '◎' },
        { path: '/planner', label: 'Planner', icon: '◐' },
        { path: '/debug', label: 'Debug Navigator', icon: '◑' },
        { path: '/heatmap', label: 'Heatmap', icon: '◒' },
      ]
    },
    {
      id: 'security',
      label: 'SECURITY',
      items: [
        { path: '/security', label: 'Security Scanner', icon: '◓' },
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
        { path: '/workspaces', label: 'Saved Workspaces', icon: '◗' },
      ]
    }
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-header">
        <Link href="/" className="sidebar-logo">
          <div className="sidebar-logo-icon">CA</div>
          <span className="sidebar-logo-text">CodeAtlas</span>
        </Link>
      </div>

      {/* Navigation - Flat Structure */}
      <nav className="sidebar-nav">
        {navigation.map((section) => (
          <div key={section.id} className="sidebar-section">
            {/* Section Label (not clickable) */}
            <div className="sidebar-section-header">
              <span className="sidebar-section-label">{section.label}</span>
            </div>

            {/* Always visible items */}
            <div className="sidebar-section-items">
              {section.items.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
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
