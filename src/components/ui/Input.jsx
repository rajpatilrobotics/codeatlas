import React, { forwardRef } from 'react';
import './Input.css';

/**
 * Input Component
 * Text input, search, textarea
 * 
 * Types:
 * - text: Standard text input
 * - search: Search input with icon
 * - url: URL input
 * - email: Email input
 * - password: Password input
 * - number: Number input
 * - textarea: Multi-line text
 * 
 * Sizes:
 * - sm: Small (32px height)
 * - md: Medium (40px height) - default
 * - lg: Large (48px height)
 */

const Input = forwardRef(({
  type = 'text',
  size = 'md',
  placeholder,
  value,
  onChange,
  onFocus,
  onBlur,
  disabled = false,
  error = false,
  errorMessage,
  icon = null,
  iconPosition = 'left',
  fullWidth = false,
  rows = 4,
  className = '',
  ...props
}, ref) => {
  const isTextarea = type === 'textarea';
  
  const inputClasses = [
    'input-wrapper',
    `input-${size}`,
    error && 'input-error',
    disabled && 'input-disabled',
    fullWidth && 'input-full-width',
    icon && `input-with-icon-${iconPosition}`,
    className
  ].filter(Boolean).join(' ');

  const inputProps = {
    className: 'input-field',
    placeholder,
    value,
    onChange,
    onFocus,
    onBlur,
    disabled,
    ref,
    ...props
  };

  return (
    <div className={inputClasses}>
      {icon && iconPosition === 'left' && (
        <span className="input-icon input-icon-left">
          {icon}
        </span>
      )}
      
      {isTextarea ? (
        <textarea
          {...inputProps}
          rows={rows}
        />
      ) : (
        <input
          {...inputProps}
          type={type}
        />
      )}
      
      {icon && iconPosition === 'right' && (
        <span className="input-icon input-icon-right">
          {icon}
        </span>
      )}
      
      {error && errorMessage && (
        <span className="input-error-message">
          {errorMessage}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

/**
 * SearchInput Component
 * Specialized input for search with icon
 */
export const SearchInput = forwardRef(({
  placeholder = 'Search...',
  ...props
}, ref) => {
  const searchIcon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 14L10.5 10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <Input
      ref={ref}
      type="search"
      placeholder={placeholder}
      icon={searchIcon}
      iconPosition="left"
      {...props}
    />
  );
});

SearchInput.displayName = 'SearchInput';

/**
 * InputGroup Component
 * Group multiple inputs together
 */
export const InputGroup = ({ children, className = '', ...props }) => {
  return (
    <div className={`input-group ${className}`} {...props}>
      {children}
    </div>
  );
};

/**
 * InputLabel Component
 * Label for inputs
 */
export const InputLabel = ({ 
  children, 
  required = false,
  htmlFor,
  className = '',
  ...props 
}) => {
  return (
    <label 
      className={`input-label ${className}`}
      htmlFor={htmlFor}
      {...props}
    >
      {children}
      {required && <span className="input-required">*</span>}
    </label>
  );
};

export default Input;

// Made with Bob
