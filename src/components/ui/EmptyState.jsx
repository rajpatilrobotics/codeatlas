import React from 'react';

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="ca-empty-state">
      {Icon && <Icon size={40} className="ca-empty-state-icon" />}
      <h3 className="ca-empty-state-title">{title}</h3>
      {description && <p className="ca-empty-state-desc">{description}</p>}
      {action}
    </div>
  );
}

export default EmptyState;
