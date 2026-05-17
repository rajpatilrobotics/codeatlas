'use client';
import React, { useState } from 'react';
import './RepositoryGraph.css';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Dropdown from '../components/ui/Dropdown';
import EmptyState from '../components/ui/EmptyState';

// Mock graph data (will be replaced with real data)
const MOCK_NODES = [
  { id: 1, name: 'App.jsx', type: 'component', connections: 8, size: 'large' },
  { id: 2, name: 'authService.js', type: 'service', connections: 12, size: 'large' },
  { id: 3, name: 'Dashboard.jsx', type: 'component', connections: 6, size: 'medium' },
  { id: 4, name: 'apiClient.js', type: 'utility', connections: 15, size: 'large' },
  { id: 5, name: 'UserProfile.jsx', type: 'component', connections: 4, size: 'medium' },
  { id: 6, name: 'database.js', type: 'service', connections: 10, size: 'large' },
  { id: 7, name: 'Button.jsx', type: 'component', connections: 20, size: 'xlarge' },
  { id: 8, name: 'validation.js', type: 'utility', connections: 8, size: 'medium' },
  { id: 9, name: 'routes.js', type: 'config', connections: 7, size: 'medium' },
  { id: 10, name: 'Header.jsx', type: 'component', connections: 5, size: 'medium' },
];

const MOCK_CONNECTIONS = [
  { from: 1, to: 3, strength: 'strong' },
  { from: 1, to: 5, strength: 'strong' },
  { from: 1, to: 10, strength: 'strong' },
  { from: 2, to: 4, strength: 'strong' },
  { from: 2, to: 6, strength: 'medium' },
  { from: 3, to: 7, strength: 'medium' },
  { from: 4, to: 6, strength: 'strong' },
  { from: 5, to: 7, strength: 'weak' },
  { from: 8, to: 2, strength: 'medium' },
  { from: 9, to: 1, strength: 'strong' },
];

const MOCK_CLUSTERS = [
  { id: 1, name: 'UI Components', count: 15, color: '#06B6D4' },
  { id: 2, name: 'Services', count: 8, color: '#10B981' },
  { id: 3, name: 'Utilities', count: 12, color: '#F59E0B' },
  { id: 4, name: 'Configuration', count: 5, color: '#8B5CF6' },
];

const VIEW_MODES = [
  { value: 'force', label: 'Force-Directed' },
  { value: 'circular', label: 'Circular' },
  { value: 'hierarchical', label: 'Hierarchical' },
  { value: 'radial', label: 'Radial' },
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Files' },
  { value: 'components', label: 'Components Only' },
  { value: 'services', label: 'Services Only' },
  { value: 'utilities', label: 'Utilities Only' },
];

function RepositoryGraph() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [viewMode, setViewMode] = useState('force');
  const [filter, setFilter] = useState('all');
  const [showLabels, setShowLabels] = useState(true);
  const hasRepository = true; // Will be replaced with real state

  const getNodeColor = (type) => {
    const colors = {
      component: '#06B6D4',
      service: '#10B981',
      utility: '#F59E0B',
      config: '#8B5CF6'
    };
    return colors[type] || '#6B7280';
  };

  const getNodeSize = (size) => {
    const sizes = {
      small: 40,
      medium: 60,
      large: 80,
      xlarge: 100
    };
    return sizes[size] || 60;
  };

  if (!hasRepository) {
    return (
      <div className="repository-graph-page">
        <EmptyState
          icon="🕸️"
          title="No Repository Analyzed"
          description="Analyze a repository to visualize its dependency graph"
          action={
            <Button variant="primary" size="medium">
              Analyze Repository
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="repository-graph-page">
      {/* Header */}
      <div className="graph-header">
        <div>
          <h1 className="graph-title">Repository Graph</h1>
          <p className="graph-subtitle">Visualize file dependencies and relationships</p>
        </div>
        <div className="graph-actions">
          <Button variant="secondary" size="small">
            Export PNG
          </Button>
          <Button variant="primary" size="small">
            Regenerate
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card className="graph-controls">
        <div className="controls-row">
          <div className="control-group">
            <label className="control-label">View Mode</label>
            <Dropdown
              options={VIEW_MODES}
              value={viewMode}
              onChange={setViewMode}
              placeholder="Select view"
            />
          </div>
          
          <div className="control-group">
            <label className="control-label">Filter</label>
            <Dropdown
              options={FILTER_OPTIONS}
              value={filter}
              onChange={setFilter}
              placeholder="Filter files"
            />
          </div>

          <div className="control-group">
            <label className="control-label">Options</label>
            <button
              className={`toggle-button ${showLabels ? 'active' : ''}`}
              onClick={() => setShowLabels(!showLabels)}
            >
              {showLabels ? '🏷️ Labels On' : '🏷️ Labels Off'}
            </button>
          </div>
        </div>
      </Card>

      <div className="graph-content">
        {/* Main Graph Visualization */}
        <Card className="graph-canvas-card">
          <div className="graph-canvas">
            {/* SVG Graph Visualization (simplified representation) */}
            <svg className="graph-svg" viewBox="0 0 800 600">
              {/* Connections */}
              {MOCK_CONNECTIONS.map((conn, idx) => {
                const fromNode = MOCK_NODES.find(n => n.id === conn.from);
                const toNode = MOCK_NODES.find(n => n.id === conn.to);
                if (!fromNode || !toNode) return null;
                
                // Simple positioning (will be replaced with force-directed layout)
                const x1 = 100 + (fromNode.id * 70) % 700;
                const y1 = 100 + (fromNode.id * 50) % 500;
                const x2 = 100 + (toNode.id * 70) % 700;
                const y2 = 100 + (toNode.id * 50) % 500;
                
                return (
                  <line
                    key={idx}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    className={`graph-connection ${conn.strength}`}
                    strokeWidth={conn.strength === 'strong' ? 2 : 1}
                  />
                );
              })}
              
              {/* Nodes */}
              {MOCK_NODES.map((node) => {
                const x = 100 + (node.id * 70) % 700;
                const y = 100 + (node.id * 50) % 500;
                const size = getNodeSize(node.size);
                const color = getNodeColor(node.type);
                
                return (
                  <g
                    key={node.id}
                    className={`graph-node ${selectedNode?.id === node.id ? 'selected' : ''}`}
                    onClick={() => setSelectedNode(node)}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={size / 2}
                      fill={color}
                      opacity={0.8}
                    />
                    {showLabels && (
                      <text
                        x={x}
                        y={y + size / 2 + 15}
                        className="node-label"
                        textAnchor="middle"
                      >
                        {node.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Graph Legend */}
            <div className="graph-legend">
              <div className="legend-title">Node Types</div>
              <div className="legend-items">
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#06B6D4' }}></span>
                  <span>Components</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#10B981' }}></span>
                  <span>Services</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#F59E0B' }}></span>
                  <span>Utilities</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#8B5CF6' }}></span>
                  <span>Config</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="graph-sidebar">
          {/* Clusters */}
          <Card>
            <h3 className="sidebar-title">Clusters</h3>
            <div className="clusters-list">
              {MOCK_CLUSTERS.map((cluster) => (
                <div key={cluster.id} className="cluster-item">
                  <div className="cluster-header">
                    <span 
                      className="cluster-dot"
                      style={{ background: cluster.color }}
                    ></span>
                    <span className="cluster-name">{cluster.name}</span>
                  </div>
                  <Badge variant="secondary" size="small">
                    {cluster.count} files
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Selected Node Details */}
          {selectedNode ? (
            <Card>
              <h3 className="sidebar-title">Node Details</h3>
              <div className="node-details">
                <div className="detail-row">
                  <span className="detail-label">File</span>
                  <code className="detail-value">{selectedNode.name}</code>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Type</span>
                  <Badge variant="secondary" size="small">
                    {selectedNode.type}
                  </Badge>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Connections</span>
                  <span className="detail-value">{selectedNode.connections}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Importance</span>
                  <Badge 
                    variant={selectedNode.connections > 10 ? 'danger' : selectedNode.connections > 5 ? 'warning' : 'success'}
                    size="small"
                  >
                    {selectedNode.connections > 10 ? 'High' : selectedNode.connections > 5 ? 'Medium' : 'Low'}
                  </Badge>
                </div>
              </div>
              <Button variant="primary" size="small" style={{ marginTop: '12px', width: '100%' }}>
                View File
              </Button>
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon="👆"
                title="Select a Node"
                description="Click on any node to view its details"
              />
            </Card>
          )}

          {/* Graph Stats */}
          <Card>
            <h3 className="sidebar-title">Graph Stats</h3>
            <div className="stats-list">
              <div className="stat-row">
                <span className="stat-label">Total Nodes</span>
                <span className="stat-value">{MOCK_NODES.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Connections</span>
                <span className="stat-value">{MOCK_CONNECTIONS.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Clusters</span>
                <span className="stat-value">{MOCK_CLUSTERS.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Avg Connections</span>
                <span className="stat-value">
                  {(MOCK_NODES.reduce((sum, n) => sum + n.connections, 0) / MOCK_NODES.length).toFixed(1)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default RepositoryGraph;

// Made with Bob
