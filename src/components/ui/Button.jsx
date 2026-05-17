'use client';
import React from 'react';
import './Button.css';

/**
 * Button Component
 * Minimal, monochrome button following CodeAtlas design system
 * 
 * Variants:
 * - primary: Accent cyan (for main actions)
 * - secondary: Subtle border (for secondary actions)
 * - ghost: No background (for tertiary actions)
 * - danger: Red accent (for destructive actions)
 * 
 * Sizes:
 * - sm: Small (28px height)
 * - md: Medium (36px height) - default
 * - lg: Large (44px height)
 */

const Button = ({
  children,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  loading = false,
  icon = null,
  iconPosition = 'left',
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const buttonClasses = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth && 'btn-full-width',
    disabled && 'btn-disabled',
    loading && 'btn-loading',
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="btn-spinner" />
      )}
      
      {!loading && icon && iconPosition === 'left' && (
        <span className="btn-icon btn-icon-left">
          {icon}
        </span>
      )}
      
      {!loading && (
        <span className="btn-text">
          {children}
        </span>
      )}
      
      {!loading && icon && iconPosition === 'right' && (
        <span className="btn-icon btn-icon-right">
          {icon}
        </span>
      )}
    </button>
  );
};

export default Button;

// Made with Bob
