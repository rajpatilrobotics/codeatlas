import React from 'react';
import Badge from './Badge';

function AlertRow({ type, title, time }) {
  const variantMap = { warning: 'warning', critical: 'critical', info: 'info' };
  return (
    <div className="ca-alert-row">
      <div className="ca-alert-row-content">
        <p className="ca-alert-row-title">{title}</p>
        <div className="ca-alert-row-meta">
          <Badge variant={variantMap[type] || 'info'}>{type}</Badge>
          <span className="ca-alert-row-time">{time}</span>
        </div>
      </div>
    </div>
  );
}

export default AlertRow;
