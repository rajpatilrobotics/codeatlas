import React from 'react';

const VARIANTS = {
  warning: 'ca-badge-warning',
  critical: 'ca-badge-critical',
  info: 'ca-badge-info',
  success: 'ca-badge-success',
  medium: 'ca-badge-medium',
  high: 'ca-badge-high',
  low: 'ca-badge-low',
};

function Badge({ children, variant = 'info', className = '' }) {
  return (
    <span className={`ca-badge ${VARIANTS[variant] || VARIANTS.info} ${className}`}>
      {children}
    </span>
  );
}

export default Badge;
