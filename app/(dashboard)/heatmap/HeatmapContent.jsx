'use client';

import React, { useState, useCallback, useMemo } from 'react';
import GraphVisualization from '@/src/components/features/GraphVisualization';
import Card from '@/src/components/ui/Card';
import Button from '@/src/components/ui/Button';
import Badge from '@/src/components/ui/Badge';
import { Activity, TrendingUp, Flame, Code, GitCommit } from 'lucide-react';
import './HeatmapContent.css';

/**
 * Heatmap Content Component
 * Displays code activity and complexity heatmap visualization
 */
const HeatmapContent = () => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [metricType, setMetricType] = useState('activity'); // activity, complexity, changes
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d

  // Mock heatmap data - will be replaced with real API data
  const mockNodes = useMemo(() => [
    // Hot files (high activity/complexity)
    {
      id: 'auth-service',
      type: 'default',
      data: { 
        label: 'src/services/auth.js', 
        type: 'service',
        activity: 95,
        complexity: 87,
        changes: 42
      },
      position: { x: 250, y: 50 },
    },
    {
      id: 'user-controller',
      type: 'default',
      data: { 
        label: 'src/controllers/user.js', 
        type: 'api',
        activity: 88,
        complexity: 76,
        changes: 38
      },
      position: { x: 100, y: 180 },
    },
    {
      id: 'payment-service',
      type: 'default',
      data: { 
        label: 'src/services/payment.js', 
        type: 'service',
        activity: 82,
        complexity: 91,
        changes: 35
      },
      position: { x: 400, y: 180 },
    },
    // Medium activity files
    {
      id: 'db-utils',
      type: 'default',
      data: { 
        label: 'src/utils/database.js', 
        type: 'function',
        activity: 65,
        complexity: 58,
        changes: 22
      },
      position: { x: 100, y: 320 },
    },
    {
      id: 'api-routes',
      type: 'default',
      data: { 
        label: 'src/routes/api.js', 
        type: 'api',
        activity: 58,
        complexity: 45,
        changes: 18
      },
      position: { x: 250, y: 320 },
    },
    {
      id: 'validation',
      type: 'default',
      data: { 
        label: 'src/middleware/validation.js', 
        type: 'function',
        activity: 52,
        complexity: 62,
        changes: 15
      },
      position: { x: 400, y: 320 },
    },
    // Low activity files
    {
      id: 'config',
      type: 'default',
      data: { 
        label: 'src/config/index.js', 
        type: 'file',
        activity: 25,
        complexity: 18,
        changes: 5
      },
      position: { x: 150, y: 460 },
    },
    {
      id: 'constants',
      type: 'default',
      data: { 
        label: 'src/constants.js', 
        type: 'file',
        activity: 15,
        complexity: 12,
        changes: 3
      },
      position: { x: 350, y: 460 },
    },
  ], []);

  const mockEdges = useMemo(() => [
    { id: 'e-auth-user', source: 'auth-service', target: 'user-controller', label: 'uses' },
    { id: 'e-auth-pay', source: 'auth-service', target: 'payment-service', label: 'validates' },
    { id: 'e-user-db', source: 'user-controller', target: 'db-utils', label: 'queries' },
    { id: 'e-user-api', source: 'user-controller', target: 'api-routes', label: 'exposes' },
    { id: 'e-pay-db', source: 'payment-service', target: 'db-utils', label: 'queries' },
    { id: 'e-pay-val', source: 'payment-service', target: 'validation', label: 'validates' },
    { id: 'e-api-cfg', source: 'api-routes', target: 'config', label: 'reads' },
    { id: 'e-val-const', source: 'validation', target: 'constants', label: 'uses' },
  ], []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const getMetricValue = (node) => {
    switch (metricType) {
      case 'activity': return node.data.activity;
      case 'complexity': return node.data.complexity;
      case 'changes': return node.data.changes;
      default: return 0;
    }
  };

  const getHeatColor = (value) => {
    if (value >= 80) return '#ef4444'; // Hot - Red
    if (value >= 60) return '#f97316'; // Warm - Orange
    if (value >= 40) return '#f59e0b'; // Medium - Amber
    if (value >= 20) return '#84cc16'; // Cool - Lime
    return '#10b981'; // Cold - Green
  };

  const stats = useMemo(() => {
    const values = mockNodes.map(n => getMetricValue(n));
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const hot = values.filter(v => v >= 80).length;
    
    return {
      average: Math.round(avg),
      maximum: max,
      minimum: min,
      hotspots: hot,
      totalFiles: mockNodes.length,
    };
  }, [mockNodes, metricType]);

  return (
    <div className="heatmap-content">
      {/* Header */}
      <div className="heatmap-header">
        <div className="heatmap-header-left">
          <h1 className="heatmap-title">Code Heatmap</h1>
          <p className="heatmap-subtitle">
            Visualize code activity, complexity, and change frequency
          </p>
        </div>
        <div className="heatmap-header-right">
          <Button variant="secondary" size="sm">
            Export Heatmap
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="heatmap-controls">
        <Card className="metric-selector">
          <div className="selector-label">Metric:</div>
          <div className="selector-buttons">
            <Button
              variant={metricType === 'activity' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setMetricType('activity')}
            >
              <Activity size={16} />
              Activity
            </Button>
            <Button
              variant={metricType === 'complexity' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setMetricType('complexity')}
            >
              <Code size={16} />
              Complexity
            </Button>
            <Button
              variant={metricType === 'changes' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setMetricType('changes')}
            >
              <GitCommit size={16} />
              Changes
            </Button>
          </div>
        </Card>

        <Card className="time-selector">
          <div className="selector-label">Time Range:</div>
          <div className="selector-buttons">
            <Button
              variant={timeRange === '7d' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTimeRange('7d')}
            >
              7 Days
            </Button>
            <Button
              variant={timeRange === '30d' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTimeRange('30d')}
            >
              30 Days
            </Button>
            <Button
              variant={timeRange === '90d' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTimeRange('90d')}
            >
              90 Days
            </Button>
          </div>
        </Card>
      </div>

      {/* Stats Bar */}
      <div className="heatmap-stats">
        <Card className="stat-card">
          <div className="stat-icon">
            <TrendingUp size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Average {metricType}</div>
            <div className="stat-value">{stats.average}</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">
            <Flame size={20} style={{ color: '#ef4444' }} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Hotspots</div>
            <div className="stat-value" style={{ color: '#ef4444' }}>{stats.hotspots}</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">
            <Activity size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Maximum</div>
            <div className="stat-value">{stats.maximum}</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">
            <Activity size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Minimum</div>
            <div className="stat-value">{stats.minimum}</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">
            <Code size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Files</div>
            <div className="stat-value">{stats.totalFiles}</div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="heatmap-main">
        {/* Heatmap Visualization */}
        <Card className="heatmap-card">
          <GraphVisualization
            initialNodes={mockNodes.map(node => ({
              ...node,
              style: {
                background: getHeatColor(getMetricValue(node)),
                color: 'white',
                borderColor: getHeatColor(getMetricValue(node)),
              }
            }))}
            initialEdges={mockEdges}
            graphType="heatmap"
            onNodeClick={handleNodeClick}
            height="700px"
          />
        </Card>

        {/* File Details Panel */}
        {selectedNode && (
          <Card className="file-details-card">
            <div className="file-details-header">
              <div className="file-header-left">
                <div 
                  className="heat-indicator" 
                  style={{ background: getHeatColor(getMetricValue(selectedNode)) }}
                >
                  <Flame size={16} />
                </div>
                <h3>{selectedNode.data.label}</h3>
              </div>
              <button
                className="close-button"
                onClick={() => setSelectedNode(null)}
              >
                ×
              </button>
            </div>
            <div className="file-details-content">
              <div className="metrics-grid">
                <div className="metric-item">
                  <div className="metric-label">Activity Score</div>
                  <div className="metric-value">{selectedNode.data.activity}</div>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill" 
                      style={{ 
                        width: `${selectedNode.data.activity}%`,
                        background: getHeatColor(selectedNode.data.activity)
                      }}
                    ></div>
                  </div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Complexity Score</div>
                  <div className="metric-value">{selectedNode.data.complexity}</div>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill" 
                      style={{ 
                        width: `${selectedNode.data.complexity}%`,
                        background: getHeatColor(selectedNode.data.complexity)
                      }}
                    ></div>
                  </div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Recent Changes</div>
                  <div className="metric-value">{selectedNode.data.changes}</div>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill" 
                      style={{ 
                        width: `${(selectedNode.data.changes / 50) * 100}%`,
                        background: getHeatColor((selectedNode.data.changes / 50) * 100)
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="detail-section">
                <div className="detail-label">File Type</div>
                <Badge variant="secondary">{selectedNode.data.type}</Badge>
              </div>
              <div className="detail-section">
                <div className="detail-label">Recommendations</div>
                <ul className="recommendation-list">
                  {getMetricValue(selectedNode) >= 80 && (
                    <>
                      <li>Consider refactoring to reduce complexity</li>
                      <li>Add comprehensive test coverage</li>
                      <li>Review for potential optimization</li>
                    </>
                  )}
                  {getMetricValue(selectedNode) < 80 && getMetricValue(selectedNode) >= 40 && (
                    <>
                      <li>Monitor for increasing complexity</li>
                      <li>Maintain current test coverage</li>
                    </>
                  )}
                  {getMetricValue(selectedNode) < 40 && (
                    <li>File is stable and well-maintained</li>
                  )}
                </ul>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Heat Scale Legend */}
      <Card className="heatmap-legend">
        <h4 className="legend-title">Heat Scale</h4>
        <div className="heat-scale">
          <div className="scale-item">
            <div className="scale-color" style={{ background: '#10b981' }}></div>
            <span>0-20 (Cold)</span>
          </div>
          <div className="scale-item">
            <div className="scale-color" style={{ background: '#84cc16' }}></div>
            <span>20-40 (Cool)</span>
          </div>
          <div className="scale-item">
            <div className="scale-color" style={{ background: '#f59e0b' }}></div>
            <span>40-60 (Medium)</span>
          </div>
          <div className="scale-item">
            <div className="scale-color" style={{ background: '#f97316' }}></div>
            <span>60-80 (Warm)</span>
          </div>
          <div className="scale-item">
            <div className="scale-color" style={{ background: '#ef4444' }}></div>
            <span>80-100 (Hot)</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default HeatmapContent;

// Made with Bob
