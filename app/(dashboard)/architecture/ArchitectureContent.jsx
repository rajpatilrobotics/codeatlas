'use client';

import React, { useState, useCallback, useMemo } from 'react';
import GraphVisualization from '@/src/components/features/GraphVisualization';
import Card from '@/src/components/ui/Card';
import Button from '@/src/components/ui/Button';
import Badge from '@/src/components/ui/Badge';
import { Layers, Database, Cloud, Server, Box } from 'lucide-react';
import './ArchitectureContent.css';

/**
 * Architecture Content Component
 * Displays the system architecture visualization
 */
const ArchitectureContent = () => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [viewMode, setViewMode] = useState('full'); // full, frontend, backend, infrastructure

  // Mock architecture data - will be replaced with real API data
  const mockNodes = useMemo(() => [
    // Frontend Layer
    {
      id: 'frontend',
      type: 'default',
      data: { label: 'Frontend (Next.js)', type: 'component', layer: 'frontend' },
      position: { x: 250, y: 50 },
    },
    {
      id: 'ui-components',
      type: 'default',
      data: { label: 'UI Components', type: 'component', layer: 'frontend' },
      position: { x: 100, y: 150 },
    },
    {
      id: 'state-mgmt',
      type: 'default',
      data: { label: 'State Management', type: 'service', layer: 'frontend' },
      position: { x: 400, y: 150 },
    },
    
    // Backend Layer
    {
      id: 'api-gateway',
      type: 'default',
      data: { label: 'API Gateway (Express)', type: 'api', layer: 'backend' },
      position: { x: 250, y: 300 },
    },
    {
      id: 'auth-service',
      type: 'default',
      data: { label: 'Auth Service', type: 'service', layer: 'backend' },
      position: { x: 100, y: 400 },
    },
    {
      id: 'graph-engine',
      type: 'default',
      data: { label: 'Graph Engine', type: 'service', layer: 'backend' },
      position: { x: 250, y: 400 },
    },
    {
      id: 'ai-orchestration',
      type: 'default',
      data: { label: 'AI Orchestration', type: 'service', layer: 'backend' },
      position: { x: 400, y: 400 },
    },
    
    // Data Layer
    {
      id: 'postgresql',
      type: 'default',
      data: { label: 'PostgreSQL (Neon)', type: 'database', layer: 'data' },
      position: { x: 100, y: 550 },
    },
    {
      id: 'redis',
      type: 'default',
      data: { label: 'Redis (Upstash)', type: 'database', layer: 'data' },
      position: { x: 250, y: 550 },
    },
    {
      id: 'qdrant',
      type: 'default',
      data: { label: 'Qdrant (Vector DB)', type: 'database', layer: 'data' },
      position: { x: 400, y: 550 },
    },
  ], []);

  const mockEdges = useMemo(() => [
    // Frontend connections
    { id: 'e-f-ui', source: 'frontend', target: 'ui-components', label: 'renders' },
    { id: 'e-f-state', source: 'frontend', target: 'state-mgmt', label: 'manages' },
    { id: 'e-f-api', source: 'frontend', target: 'api-gateway', label: 'calls' },
    
    // Backend connections
    { id: 'e-api-auth', source: 'api-gateway', target: 'auth-service', label: 'authenticates' },
    { id: 'e-api-graph', source: 'api-gateway', target: 'graph-engine', label: 'queries' },
    { id: 'e-api-ai', source: 'api-gateway', target: 'ai-orchestration', label: 'requests' },
    
    // Data connections
    { id: 'e-auth-pg', source: 'auth-service', target: 'postgresql', label: 'stores' },
    { id: 'e-graph-pg', source: 'graph-engine', target: 'postgresql', label: 'reads' },
    { id: 'e-graph-redis', source: 'graph-engine', target: 'redis', label: 'caches' },
    { id: 'e-ai-qdrant', source: 'ai-orchestration', target: 'qdrant', label: 'searches' },
  ], []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const stats = useMemo(() => ({
    totalComponents: mockNodes.length,
    frontend: mockNodes.filter(n => n.data.layer === 'frontend').length,
    backend: mockNodes.filter(n => n.data.layer === 'backend').length,
    data: mockNodes.filter(n => n.data.layer === 'data').length,
    connections: mockEdges.length,
  }), [mockNodes, mockEdges]);

  const getLayerIcon = (layer) => {
    switch (layer) {
      case 'frontend': return <Layers size={16} />;
      case 'backend': return <Server size={16} />;
      case 'data': return <Database size={16} />;
      case 'infrastructure': return <Cloud size={16} />;
      default: return <Box size={16} />;
    }
  };

  return (
    <div className="architecture-content">
      {/* Header */}
      <div className="arch-header">
        <div className="arch-header-left">
          <h1 className="arch-title">System Architecture</h1>
          <p className="arch-subtitle">
            Visualize the high-level architecture and component relationships
          </p>
        </div>
        <div className="arch-header-right">
          <Button variant="secondary" size="sm">
            Export Diagram
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="arch-stats">
        <Card className="stat-card">
          <div className="stat-icon">
            <Box size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Components</div>
            <div className="stat-value">{stats.totalComponents}</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">
            <Layers size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Frontend</div>
            <div className="stat-value">{stats.frontend}</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">
            <Server size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Backend</div>
            <div className="stat-value">{stats.backend}</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">
            <Database size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Data Layer</div>
            <div className="stat-value">{stats.data}</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">
            <Cloud size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Connections</div>
            <div className="stat-value">{stats.connections}</div>
          </div>
        </Card>
      </div>

      {/* View Mode Selector */}
      <Card className="view-selector">
        <div className="view-label">View Mode:</div>
        <div className="view-buttons">
          <Button
            variant={viewMode === 'full' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('full')}
          >
            Full Stack
          </Button>
          <Button
            variant={viewMode === 'frontend' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('frontend')}
          >
            Frontend Only
          </Button>
          <Button
            variant={viewMode === 'backend' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('backend')}
          >
            Backend Only
          </Button>
          <Button
            variant={viewMode === 'infrastructure' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('infrastructure')}
          >
            Infrastructure
          </Button>
        </div>
      </Card>

      {/* Main Content */}
      <div className="arch-main">
        {/* Architecture Visualization */}
        <Card className="arch-card">
          <GraphVisualization
            initialNodes={mockNodes}
            initialEdges={mockEdges}
            graphType="architecture"
            onNodeClick={handleNodeClick}
            height="700px"
          />
        </Card>

        {/* Component Details Panel */}
        {selectedNode && (
          <Card className="component-details-card">
            <div className="component-details-header">
              <div className="component-header-left">
                {getLayerIcon(selectedNode.data.layer)}
                <h3>{selectedNode.data.label}</h3>
              </div>
              <button
                className="close-button"
                onClick={() => setSelectedNode(null)}
              >
                ×
              </button>
            </div>
            <div className="component-details-content">
              <div className="detail-section">
                <div className="detail-label">Type</div>
                <Badge variant="primary">{selectedNode.data.type}</Badge>
              </div>
              <div className="detail-section">
                <div className="detail-label">Layer</div>
                <Badge variant="secondary">{selectedNode.data.layer}</Badge>
              </div>
              <div className="detail-section">
                <div className="detail-label">Component ID</div>
                <code className="detail-code">{selectedNode.id}</code>
              </div>
              <div className="detail-section">
                <div className="detail-label">Description</div>
                <p className="detail-text">
                  {selectedNode.data.layer === 'frontend' && 'Handles user interface and client-side logic'}
                  {selectedNode.data.layer === 'backend' && 'Processes business logic and API requests'}
                  {selectedNode.data.layer === 'data' && 'Manages data storage and retrieval'}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Architecture Layers Legend */}
      <Card className="arch-legend">
        <h4 className="legend-title">Architecture Layers</h4>
        <div className="legend-items">
          <div className="legend-item">
            <Layers size={16} className="legend-icon" style={{ color: '#ec4899' }} />
            <span>Frontend Layer</span>
          </div>
          <div className="legend-item">
            <Server size={16} className="legend-icon" style={{ color: '#8b5cf6' }} />
            <span>Backend Layer</span>
          </div>
          <div className="legend-item">
            <Database size={16} className="legend-icon" style={{ color: '#06b6d4' }} />
            <span>Data Layer</span>
          </div>
          <div className="legend-item">
            <Cloud size={16} className="legend-icon" style={{ color: '#10b981' }} />
            <span>Infrastructure</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ArchitectureContent;

// Made with Bob
