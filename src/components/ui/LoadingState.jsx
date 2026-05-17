'use client';
/**
 * LoadingState Component
 * Skeleton screens for content loading states
 * Minimal, subtle, non-intrusive
 */

import React from 'react';
import './LoadingState.css';

const LoadingState = ({ 
  variant = 'default',
  lines = 3,
  showAvatar = false,
  showImage = false,
  className = ''
}) => {
  // Render different skeleton patterns based on variant
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <div className="loading-skeleton-card">
            {showImage && <div className="loading-skeleton-image" />}
            <div className="loading-skeleton-content">
              <div className="loading-skeleton-line loading-skeleton-title" />
              <div className="loading-skeleton-line" />
              <div className="loading-skeleton-line loading-skeleton-short" />
            </div>
          </div>
        );

      case 'list':
        return (
          <div className="loading-skeleton-list">
            {Array.from({ length: lines }).map((_, index) => (
              <div key={index} className="loading-skeleton-list-item">
                {showAvatar && <div className="loading-skeleton-avatar" />}
                <div className="loading-skeleton-list-content">
                  <div className="loading-skeleton-line loading-skeleton-title" />
                  <div className="loading-skeleton-line loading-skeleton-short" />
                </div>
              </div>
            ))}
          </div>
        );

      case 'table':
        return (
          <div className="loading-skeleton-table">
            <div className="loading-skeleton-table-header">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="loading-skeleton-line loading-skeleton-short" />
              ))}
            </div>
            {Array.from({ length: lines }).map((_, index) => (
              <div key={index} className="loading-skeleton-table-row">
                {Array.from({ length: 4 }).map((_, cellIndex) => (
                  <div key={cellIndex} className="loading-skeleton-line" />
                ))}
              </div>
            ))}
          </div>
        );

      case 'graph':
        return (
          <div className="loading-skeleton-graph">
            <div className="loading-skeleton-graph-header">
              <div className="loading-skeleton-line loading-skeleton-title" />
              <div className="loading-skeleton-line loading-skeleton-short" />
            </div>
            <div className="loading-skeleton-graph-body">
              <div className="loading-skeleton-graph-placeholder">
                <div className="loading-skeleton-graph-nodes">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="loading-skeleton-node" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="loading-skeleton-default">
            {Array.from({ length: lines }).map((_, index) => (
              <div 
                key={index} 
                className={`loading-skeleton-line ${
                  index === 0 ? 'loading-skeleton-title' : 
                  index === lines - 1 ? 'loading-skeleton-short' : ''
                }`} 
              />
            ))}
          </div>
        );
    }
  };

  return (
    <div className={`loading-state ${className}`}>
      {renderSkeleton()}
    </div>
  );
};

// Inline loading spinner for buttons and small spaces
export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  return (
    <div className={`loading-spinner loading-spinner-${size} ${className}`}>
      <div className="loading-spinner-circle" />
    </div>
  );
};

// Fullscreen loading overlay
export const LoadingOverlay = ({ message = 'Loading...' }) => {
  return (
    <div className="loading-overlay">
      <div className="loading-overlay-content">
        <LoadingSpinner size="lg" />
        {message && <p className="loading-overlay-message">{message}</p>}
      </div>
    </div>
  );
};

export default LoadingState;

// Made with Bob
