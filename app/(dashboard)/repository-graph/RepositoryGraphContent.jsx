'use client';

import React, { useState, useCallback, useMemo } from 'react';
import GraphVisualization from '@/src/components/features/GraphVisualization';
import Card from '@/src/components/ui/Card';
import Button from '@/src/components/ui/Button';
import Badge from '@/src/components/ui/Badge';
import { Search, Filter, Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import './RepositoryGraphContent.css';

/**
 * Repository Graph Content Component
 * Displays the dependency graph of the repository
 */
const RepositoryGraphContent = () => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - will be replaced with real API data
  const mockNodes = useMemo(() => [
    {
      id: '1',
      type: 'default',
      data: { label: 'src/index.js', type: 'file' },
      position: { x: 250, y: 50 },
    },
    {
      id: '2',
      type: 'default',
      data: { label: 'src/App.jsx', type: 'component' },
      position: { x: 100, y: 150 },
    },
    {
      id: '3',
      type: 'default',
      data: { label: 'src/api/client.js', type: 'service' },
      position: { x: 400, y: 150 },
    },
    {
      id: '4',
      type: 'default',
      data: { label: 'src/utils/helpers.js', type: 'function' },
      position: { x: 250, y: 250 },
    },
    {
      id: '5',
      type: 'default',
      data: { label: 'src/components/Layout.jsx', type: 'component' },
      position: { x: 100, y: 350 },
    },
    {
      id: '6',
      type: 'default',
      data: { label: 'src/services/auth.js', type: 'service' },
      position: { x: 400, y: 350 },
    },
  ], []);

  const mockEdges = useMemo(() => [
    { id: 'e1-2', source: '1', target: '2', label: 'imports' },
    { id: 'e1-3', source: '1', target: '3', label: 'imports' },
    { id: 'e2-4', source: '2', target: '4', label: 'uses' },
    { id: 'e2-5', source: '2', target: '5', label: 'renders' },
    { id: 'e3-6', source: '3', target: '6', label: 'depends on' },
    { id: 'e4-6', source: '4', target: '6', label: 'calls' },
  ], []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const handleExport = () => {
    console.log('Exporting graph...');
    // TODO: Implement graph export functionality
  };

  const stats = useMemo(() => ({
    totalNodes: mockNodes.length,
    totalEdges: mockEdges.length,
    files: mockNodes.filter(n => n.data.type === 'file').length,
    components: mockNodes.filter(n => n.data.type === 'component').length,
    services: mockNodes.filter(n => n.data.type === 'service').length,
    functions: mockNodes.filter(n => n.data.type === 'function').length,
  }), [mockNodes, mockEdges]);

  return (
    <div className="repository-graph-content">
      {/* Header */}
      <div className="graph-header">
        <div className="graph-header-left">
          <h1 className="graph-title">Repository Graph</h1>
          <p className="graph-subtitle">
            Visualize dependencies and relationships across your codebase
          </p>
        </div>
        <div className="graph-header-right">
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download size={16} />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="graph-stats">
        <Card className="stat-card">
          <div className="stat-label">Total Nodes</div>
          <div className="stat-value">{stats.totalNodes}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Total Edges</div>
          <div className="stat-value">{stats.totalEdges}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Files</div>
          <div className="stat-value">{stats.files}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Components</div>
          <div className="stat-value">{stats.components}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Services</div>
          <div className="stat-value">{stats.services}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Functions</div>
          <div className="stat-value">{stats.functions}</div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="graph-main">
        {/* Graph Visualization */}
        <Card className="graph-card">
          <div className="graph-controls">
            <div className="graph-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="graph-search-input"
              />
            </div>
            <div className="graph-filters">
              <Button
                variant={filterType === 'all' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                All
              </Button>
              <Button
                variant={filterType === 'files' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilterType('files')}
              >
                Files
              </Button>
              <Button
                variant={filterType === 'components' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilterType('components')}
              >
                Components
              </Button>
              <Button
                variant={filterType === 'services' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilterType('services')}
              >
                Services
              </Button>
            </div>
          </div>

          <GraphVisualization
            initialNodes={mockNodes}
            initialEdges={mockEdges}
            graphType="dependency"
            onNodeClick={handleNodeClick}
            height="600px"
          />
        </Card>

        {/* Node Details Panel */}
        {selectedNode && (
          <Card className="node-details-card">
            <div className="node-details-header">
              <h3>Node Details</h3>
              <button
                className="close-button"
                onClick={() => setSelectedNode(null)}
              >
                ×
              </button>
            </div>
            <div className="node-details-content">
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{selectedNode.data.label}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <Badge variant="primary">{selectedNode.data.type}</Badge>
              </div>
              <div className="detail-row">
                <span className="detail-label">ID:</span>
                <span className="detail-value">{selectedNode.id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Position:</span>
                <span className="detail-value">
                  ({Math.round(selectedNode.position.x)}, {Math.round(selectedNode.position.y)})
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Legend */}
      <Card className="graph-legend">
        <h4 className="legend-title">Legend</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#3b82f6' }}></div>
            <span>File</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ec4899' }}></div>
            <span>Component</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#06b6d4' }}></div>
            <span>Service</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#10b981' }}></div>
            <span>Function</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#f59e0b' }}></div>
            <span>API</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#8b5cf6' }}></div>
            <span>Class</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RepositoryGraphContent;

// Made with Bob
