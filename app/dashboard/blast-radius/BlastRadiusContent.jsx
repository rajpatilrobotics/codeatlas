'use client';

import React, { useState, useCallback, useMemo } from 'react';
import GraphVisualization from '@/src/components/features/GraphVisualization';
import Card from '@/src/components/ui/Card';
import Button from '@/src/components/ui/Button';
import Badge from '@/src/components/ui/Badge';
import './BlastRadiusContent.css';

// Simple icon components to replace lucide-react
const IconAlertTriangle = () => <span>⚠️</span>;
const IconAlertCircle = () => <span>🔴</span>;
const IconInfo = () => <span>ℹ️</span>;
const IconCheckCircle = () => <span>✅</span>;
const IconTarget = () => <span>🎯</span>;

/**
 * Blast Radius Content Component
 * Displays impact analysis and blast radius visualization
 */
const BlastRadiusContent = () => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [targetFile, setTargetFile] = useState('src/api/auth.js');
  const [riskFilter, setRiskFilter] = useState('all');

  // Mock blast radius data - will be replaced with real API data
  const mockNodes = useMemo(() => [
    // Target node
    {
      id: 'target',
      type: 'default',
      data: { label: 'src/api/auth.js', type: 'file', risk: 'critical' },
      position: { x: 250, y: 50 },
    },
    // Direct dependencies (high risk)
    {
      id: 'user-service',
      type: 'default',
      data: { label: 'src/services/user.js', type: 'service', risk: 'high' },
      position: { x: 100, y: 200 },
    },
    {
      id: 'session-mgmt',
      type: 'default',
      data: { label: 'src/utils/session.js', type: 'function', risk: 'high' },
      position: { x: 400, y: 200 },
    },
    // Secondary dependencies (medium risk)
    {
      id: 'db-user',
      type: 'default',
      data: { label: 'src/db/user.js', type: 'database', risk: 'medium' },
      position: { x: 50, y: 350 },
    },
    {
      id: 'api-routes',
      type: 'default',
      data: { label: 'src/routes/api.js', type: 'api', risk: 'medium' },
      position: { x: 200, y: 350 },
    },
    {
      id: 'middleware',
      type: 'default',
      data: { label: 'src/middleware/auth.js', type: 'function', risk: 'medium' },
      position: { x: 350, y: 350 },
    },
    // Tertiary dependencies (low risk)
    {
      id: 'logger',
      type: 'default',
      data: { label: 'src/utils/logger.js', type: 'function', risk: 'low' },
      position: { x: 150, y: 500 },
    },
    {
      id: 'config',
      type: 'default',
      data: { label: 'src/config/index.js', type: 'file', risk: 'low' },
      position: { x: 350, y: 500 },
    },
  ], []);

  const mockEdges = useMemo(() => [
    { id: 'e-t-us', source: 'target', target: 'user-service', label: 'imports', animated: true },
    { id: 'e-t-sm', source: 'target', target: 'session-mgmt', label: 'uses', animated: true },
    { id: 'e-us-db', source: 'user-service', target: 'db-user', label: 'queries' },
    { id: 'e-us-api', source: 'user-service', target: 'api-routes', label: 'exposes' },
    { id: 'e-sm-mw', source: 'session-mgmt', target: 'middleware', label: 'validates' },
    { id: 'e-db-log', source: 'db-user', target: 'logger', label: 'logs' },
    { id: 'e-api-log', source: 'api-routes', target: 'logger', label: 'logs' },
    { id: 'e-mw-cfg', source: 'middleware', target: 'config', label: 'reads' },
  ], []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const stats = useMemo(() => {
    const riskCounts = mockNodes.reduce((acc, node) => {
      acc[node.data.risk] = (acc[node.data.risk] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalAffected: mockNodes.length - 1, // Exclude target
      critical: riskCounts.critical || 0,
      high: riskCounts.high || 0,
      medium: riskCounts.medium || 0,
      low: riskCounts.low || 0,
      impactScore: 87, // Mock score
    };
  }, [mockNodes]);

  const getRiskIcon = (risk) => {
    switch (risk) {
      case 'critical': return <IconAlertTriangle />;
      case 'high': return <IconAlertCircle />;
      case 'medium': return <IconInfo />;
      case 'low': return <IconCheckCircle />;
      default: return <IconTarget />;
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#f59e0b';
      case 'low': return '#84cc16';
      default: return '#64748b';
    }
  };

  return (
    <div className="blast-radius-content">
      {/* Header */}
      <div className="blast-header">
        <div className="blast-header-left">
          <h1 className="blast-title">Blast Radius Analysis</h1>
          <p className="blast-subtitle">
            Analyze the impact of changes and identify affected components
          </p>
        </div>
        <div className="blast-header-right">
          <Button variant="secondary" size="sm">
            Export Report
          </Button>
        </div>
      </div>

      {/* Target File Selector */}
      <Card className="target-selector">
        <div className="target-label">
          <IconTarget />
          <span>Target File:</span>
        </div>
        <input
          type="text"
          value={targetFile}
          onChange={(e) => setTargetFile(e.target.value)}
          className="target-input"
          placeholder="Enter file path..."
        />
        <Button variant="primary" size="sm">
          Analyze
        </Button>
      </Card>

      {/* Stats Bar */}
      <div className="blast-stats">
        <Card className="stat-card impact-score">
          <div className="stat-icon">
            <IconTarget />
          </div>
          <div className="stat-info">
            <div className="stat-label">Impact Score</div>
            <div className="stat-value">{stats.impactScore}%</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">
            <IconAlertTriangle />
          </div>
          <div className="stat-info">
            <div className="stat-label">Critical</div>
            <div className="stat-value" style={{ color: '#ef4444' }}>{stats.critical}</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">
            <IconAlertCircle />
          </div>
          <div className="stat-info">
            <div className="stat-label">High Risk</div>
            <div className="stat-value" style={{ color: '#f97316' }}>{stats.high}</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">
            <IconInfo />
          </div>
          <div className="stat-info">
            <div className="stat-label">Medium Risk</div>
            <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.medium}</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">
            <IconCheckCircle />
          </div>
          <div className="stat-info">
            <div className="stat-label">Low Risk</div>
            <div className="stat-value" style={{ color: '#84cc16' }}>{stats.low}</div>
          </div>
        </Card>
      </div>

      {/* Risk Filter */}
      <Card className="risk-filter">
        <div className="filter-label">Filter by Risk:</div>
        <div className="filter-buttons">
          <Button
            variant={riskFilter === 'all' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setRiskFilter('all')}
          >
            All
          </Button>
          <Button
            variant={riskFilter === 'critical' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setRiskFilter('critical')}
          >
            Critical
          </Button>
          <Button
            variant={riskFilter === 'high' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setRiskFilter('high')}
          >
            High
          </Button>
          <Button
            variant={riskFilter === 'medium' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setRiskFilter('medium')}
          >
            Medium
          </Button>
          <Button
            variant={riskFilter === 'low' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setRiskFilter('low')}
          >
            Low
          </Button>
        </div>
      </Card>

      {/* Main Content */}
      <div className="blast-main">
        {/* Blast Radius Visualization */}
        <Card className="blast-card">
          <GraphVisualization
            initialNodes={mockNodes}
            initialEdges={mockEdges}
            graphType="blast-radius"
            onNodeClick={handleNodeClick}
            height="700px"
          />
        </Card>

        {/* Impact Details Panel */}
        {selectedNode && (
          <Card className="impact-details-card">
            <div className="impact-details-header">
              <div className="impact-header-left">
                <div className="risk-indicator" style={{ background: getRiskColor(selectedNode.data.risk) }}>
                  {getRiskIcon(selectedNode.data.risk)}
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
            <div className="impact-details-content">
              <div className="detail-section">
                <div className="detail-label">Risk Level</div>
                <Badge 
                  variant="primary" 
                  style={{ 
                    background: getRiskColor(selectedNode.data.risk),
                    textTransform: 'uppercase'
                  }}
                >
                  {selectedNode.data.risk}
                </Badge>
              </div>
              <div className="detail-section">
                <div className="detail-label">Component Type</div>
                <Badge variant="secondary">{selectedNode.data.type}</Badge>
              </div>
              <div className="detail-section">
                <div className="detail-label">Impact Description</div>
                <p className="detail-text">
                  {selectedNode.data.risk === 'critical' && 'Critical component - changes will have immediate and widespread impact'}
                  {selectedNode.data.risk === 'high' && 'High-risk component - changes may affect multiple dependent systems'}
                  {selectedNode.data.risk === 'medium' && 'Medium-risk component - changes have moderate impact scope'}
                  {selectedNode.data.risk === 'low' && 'Low-risk component - changes have minimal impact on other systems'}
                </p>
              </div>
              <div className="detail-section">
                <div className="detail-label">Recommended Actions</div>
                <ul className="action-list">
                  <li>Review all dependent components</li>
                  <li>Run comprehensive test suite</li>
                  <li>Update documentation</li>
                  <li>Notify affected teams</li>
                </ul>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Risk Legend */}
      <Card className="blast-legend">
        <h4 className="legend-title">Risk Levels</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ef4444' }}></div>
            <span>Critical - Immediate widespread impact</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#f97316' }}></div>
            <span>High - Affects multiple systems</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#f59e0b' }}></div>
            <span>Medium - Moderate impact scope</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#84cc16' }}></div>
            <span>Low - Minimal impact</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BlastRadiusContent;

// Made with Bob
