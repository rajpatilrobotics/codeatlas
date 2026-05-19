import React from 'react';

function Pill({ children, className = '' }) {
  return <span className={`ca-pill ${className}`}>{children}</span>;
}

export default Pill;
