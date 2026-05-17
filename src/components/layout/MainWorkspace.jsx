'use client';
/**
 * MainWorkspace Component
 * Central content area with optional right panel
 */

import React from 'react';
import './MainWorkspace.css';

const MainWorkspace = ({ children, rightPanel, className = '' }) => {
  return (
    <div className={`main-workspace ${rightPanel ? 'main-workspace-with-panel' : ''} ${className}`}>
      <div className="main-workspace-content">
        {children}
      </div>
      
      {rightPanel && (
        <aside className="main-workspace-panel">
          {rightPanel}
        </aside>
      )}
    </div>
  );
};

export default MainWorkspace;

// Made with Bob
