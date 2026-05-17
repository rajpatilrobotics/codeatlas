'use client';
import React from 'react';
import './Badge.css';

/**
 * Badge Component
 * Risk indicators and status badges
 * 
 * Variants:
 * - default: Neutral gray
 * - safe: Cool gray-blue (low risk)
 * - medium: Amber/yellow (medium risk)
 * - high: Orange (high risk)
 * - critical: Red (critical risk)
 * - success: Green (success state)
 * - info: Cyan (informational)
 * 
 * Sizes:
 * - sm: Small (20px height)
 * - md: Medium (24px height) - default
 * - lg: Large (28px height)
 */

const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  className = '',
  ...props
}) => {
  const badgeClasses = [
    'badge',
    `badge-${variant}`,
    `badge-${size}`,
    dot && 'badge-dot',
    pulse && 'badge-pulse',
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={badgeClasses} {...props}>
      {dot && <span className="badge-dot-indicator" />}
      <span className="badge-text">{children}</span>
    </span>
  );
};

/**
 * RiskBadge Component
 * Specialized badge for risk levels
 */
export const RiskBadge = ({ level, score, showScore = true, ...props }) => {
  // Determine variant based on score or level
  let variant = 'default';
  let displayText = level || 'Unknown';

  if (score !== undefined) {
    if (score >= 80) {
      variant = 'safe';
      displayText = 'Low Risk';
    } else if (score >= 60) {
      variant = 'medium';
      displayText = 'Medium Risk';
    } else if (score >= 40) {
      variant = 'high';
      displayText = 'High Risk';
    } else {
      variant = 'critical';
      displayText = 'Critical';
    }
  } else if (level) {
    const levelLower = level.toLowerCase();
    if (levelLower.includes('safe') || levelLower.includes('low')) {
      variant = 'safe';
    } else if (levelLower.includes('medium') || levelLower.includes('moderate')) {
      variant = 'medium';
    } else if (levelLower.includes('high')) {
      variant = 'high';
    } else if (levelLower.includes('critical') || levelLower.includes('severe')) {
      variant = 'critical';
    }
  }

  return (
    <Badge 
      variant={variant} 
      pulse={variant === 'critical'}
      {...props}
    >
      {showScore && score !== undefined ? `${score}/100` : displayText}
    </Badge>
  );
};

/**
 * StatusBadge Component
 * Specialized badge for status indicators
 */
export const StatusBadge = ({ status, ...props }) => {
  let variant = 'default';
  let displayText = status || 'Unknown';

  if (status) {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('success') || statusLower.includes('complete') || statusLower.includes('passed')) {
      variant = 'success';
    } else if (statusLower.includes('error') || statusLower.includes('failed')) {
      variant = 'critical';
    } else if (statusLower.includes('warning') || statusLower.includes('pending')) {
      variant = 'medium';
    } else if (statusLower.includes('info') || statusLower.includes('active')) {
      variant = 'info';
    }
  }

  return (
    <Badge variant={variant} {...props}>
      {displayText}
    </Badge>
  );
};

export default Badge;

// Made with Bob
