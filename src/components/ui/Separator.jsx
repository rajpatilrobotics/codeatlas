'use client';
import React from 'react';
import './Separator.css';

/**
 * Separator Component
 * Subtle dividers for matte black aesthetic
 * 
 * Orientation:
 * - horizontal: Horizontal line (default)
 * - vertical: Vertical line
 * 
 * Spacing:
 * - none: No margin
 * - sm: Small margin (8px)
 * - md: Medium margin (16px) - default
 * - lg: Large margin (24px)
 */

const Separator = ({
  orientation = 'horizontal',
  spacing = 'md',
  className = '',
  ...props
}) => {
  const separatorClasses = [
    'separator',
    `separator-${orientation}`,
    spacing !== 'none' && `separator-spacing-${spacing}`,
    className
  ].filter(Boolean).join(' ');

  return <div className={separatorClasses} {...props} />;
};

export default Separator;

// Made with Bob
