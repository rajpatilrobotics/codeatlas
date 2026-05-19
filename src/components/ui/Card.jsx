import React from 'react';

function Card({ title, icon: Icon, children, className = '', headerAction }) {
  return (
    <div className={`ca-card content-card ${className}`}>
      {(title || Icon) && (
        <div className="ca-card-header">
          <div className="ca-card-title-row">
            {Icon && <Icon size={18} className="ca-card-icon" />}
            {title && <h2 className="card-title ca-card-title">{title}</h2>}
          </div>
          {headerAction}
        </div>
      )}
      <div className="card-content">{children}</div>
    </div>
  );
}

export default Card;
