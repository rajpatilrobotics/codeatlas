import React from 'react';

function MetricCard({ label, value, icon: Icon, trend }) {
  return (
    <div className="ca-metric-card">
      <div className="ca-metric-card-top">
        {Icon && <Icon size={18} className="ca-metric-icon" />}
        {trend && <span className="ca-metric-trend">{trend}</span>}
      </div>
      <div className="ca-metric-value">{value}</div>
      <div className="ca-metric-label">{label}</div>
    </div>
  );
}

export default MetricCard;
