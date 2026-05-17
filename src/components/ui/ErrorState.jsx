'use client';
import React from 'react';
import './ErrorState.css';

/**
 * ErrorState Component
 * Resilient, intelligent, trustworthy error handling
 * NO giant error pages, NO scary warnings
 */

const ErrorState = ({
  title = 'Something went wrong',
  message,
  error,
  retry,
  className = '',
  ...props
}) => {
  return (
    <div className={`error-state ${className}`} {...props}>
      <div className="error-state-icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2"/>
          <path d="M24 16V26" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="24" cy="32" r="1.5" fill="currentColor"/>
        </svg>
      </div>
      
      <h3 className="error-state-title">{title}</h3>
      
      {message && (
        <p className="error-state-message">{message}</p>
      )}
      
      {error && (
        <details className="error-state-details">
          <summary>Technical details</summary>
          <pre className="error-state-code">
            {error.toString()}
          </pre>
        </details>
      )}
      
      {retry && (
        <div className="error-state-action">
          {retry}
        </div>
      )}
    </div>
  );
};

export default ErrorState;

// Made with Bob
