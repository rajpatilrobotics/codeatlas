import React from 'react';
import './EmptyState.css';

/**
 * EmptyState Component
 * Minimal, calm empty states
 * NO mascots, NO giant illustrations
 */

const EmptyState = ({
  icon,
  title,
  description,
  action,
  className = '',
  ...props
}) => {
  return (
    <div className={`empty-state ${className}`} {...props}>
      {icon && (
        <div className="empty-state-icon">
          {icon}
        </div>
      )}
      
      {title && (
        <h3 className="empty-state-title">
          {title}
        </h3>
      )}
      
      {description && (
        <p className="empty-state-description">
          {description}
        </p>
      )}
      
      {action && (
        <div className="empty-state-action">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;

// Made with Bob
