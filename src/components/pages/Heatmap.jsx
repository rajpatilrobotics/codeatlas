import React from 'react';
import Card from '../ui/Card';
import ComingSoon from '../ui/ComingSoon';

const MOCK_HEAT = [
  [0.2, 0.5, 0.8, 0.3, 0.9, 0.4, 0.6],
  [0.7, 0.3, 0.5, 0.9, 0.2, 0.8, 0.4],
  [0.4, 0.9, 0.2, 0.6, 0.7, 0.3, 0.5],
  [0.8, 0.2, 0.6, 0.4, 0.5, 0.9, 0.3],
  [0.3, 0.6, 0.4, 0.7, 0.8, 0.2, 0.9],
];

function heatColor(value) {
  const alpha = 0.15 + value * 0.85;
  return `rgba(255, 255, 255, ${alpha})`;
}

function Heatmap() {
  return (
    <ComingSoon>
      <Card title="Code Activity Heatmap">
        <p className="ca-page-desc">
          Sample heatmap showing relative activity and change frequency by module area.
        </p>
        <div className="ca-heatmap">
          {MOCK_HEAT.map((row, ri) => (
            <div key={ri} className="ca-heatmap-row">
              {row.map((val, ci) => (
                <div
                  key={ci}
                  className="ca-heatmap-cell"
                  style={{ background: heatColor(val) }}
                  title={`Intensity: ${Math.round(val * 100)}%`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="ca-heatmap-legend">
          <span>Low activity</span>
          <div className="ca-heatmap-legend-bar" />
          <span>High activity</span>
        </div>
      </Card>
    </ComingSoon>
  );
}

export default Heatmap;
