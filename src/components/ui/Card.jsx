import React from 'react';
import './Card.css';

/**
 * Card Component
 * Matte black panel with subtle depth
 * Inspired by Vercel/Linear/Render dashboards
 * 
 * Variants:
 * - default: Standard panel (bg-panel-1)
 * - elevated: Slightly elevated (bg-panel-2)
 * - flat: No border, minimal (bg-panel-1, no border)
 * 
 * Padding:
 * - none: No padding
 * - sm: Small padding (12px)
 * - md: Medium padding (16px) - default
 * - lg: Large padding (24px)
 * - xl: Extra large padding (32px)
 */

const Card = ({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  onClick,
  className = '',
  ...props
}) => {
  const cardClasses = [
    'card',
    `card-${variant}`,
    padding !== 'none' && `card-padding-${padding}`,
    hover && 'card-hover',
    onClick && 'card-clickable',
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div
      className={cardClasses}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * CardHeader Component
 * Header section for cards with title and optional actions
 */
export const CardHeader = ({
  title,
  subtitle,
  action,
  className = '',
  ...props
}) => {
  return (
    <div className={`card-header ${className}`} {...props}>
      <div className="card-header-content">
        {title && <h3 className="card-title">{title}</h3>}
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="card-header-action">{action}</div>}
    </div>
  );
};

/**
 * CardBody Component
 * Main content area of card
 */
export const CardBody = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`card-body ${className}`} {...props}>
      {children}
    </div>
  );
};

/**
 * CardFooter Component
 * Footer section for cards with actions
 */
export const CardFooter = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`card-footer ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;

// Made with Bob
