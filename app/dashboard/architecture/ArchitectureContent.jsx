'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { useActiveRepo } from '@/hooks/useActiveRepo';
import GraphVisualization from '@/src/components/features/GraphVisualization';
import Card from '@/src/components/ui/Card';
import Button from '@/src/components/ui/Button';
import Badge from '@/src/components/ui/Badge';
import LoadingState from '@/src/components/ui/LoadingState';
import ErrorState from '@/src/components/ui/ErrorState';
import EmptyState from '@/src/components/ui/EmptyState';
import './ArchitectureContent.css';

// Simple icon components to replace lucide-react
const IconLayers = () => <span>◈</span>;
const IconDatabase = () => <span>◉</span>;
const IconCloud = () => <span>☁</span>;
const IconServer = () => <span>⬢</span>;
const IconBox = () => <span>◻</span>;

/**
 * Architecture Content Component
 * Displays the system architecture visualization
 */
const ArchitectureContent = () => {
  const { repoId, currentRepo, loading: repoLoading } = useActiveRepo();
  const [architectureData, setArchitectureData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [viewMode, setViewMode] = useState('full'); // full, frontend, backend, infrastructure

  useEffect(() => {
    async function fetchArchitecture() {
      if (repoLoading) return;
      if (!repoId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const result = await apiClient.getArchitecture(repoId);
        setArchitectureData(result);
      } catch (err) {
        console.error('Failed to fetch architecture:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchArchitecture();
  }, [repoId, repoLoading]);

  const layerY = {
    presentation: 80,
    business: 240,
    data: 400,
    utility: 560,
    external: 720,
    frontend: 80,
    backend: 240,
  };

  // Transform API data to graph format
  const { nodes, edges } = useMemo(() => {
    const rawNodes = architectureData?.graph?.nodes || [];
    const rawEdges = architectureData?.graph?.edges || [];

    if (rawNodes.length) {
      return {
        nodes: rawNodes.map((node, index) => ({
          id: node.id || `node-${index}`,
          type: 'default',
          data: {
            label: node.data?.label || node.name || node.id,
            type: node.data?.type || node.type || 'file',
            layer: node.data?.layer || node.layer || 'business',
          },
          position:
            node.position || {
              x: 80 + (index % 8) * 130,
              y: layerY[node.data?.layer || node.layer] ?? 240,
            },
        })),
        edges: rawEdges.map((edge, index) => ({
          id: edge.id || `edge-${index}`,
          source: edge.source || edge.from,
          target: edge.target || edge.to,
          label: edge.label || edge.type || 'connects',
        })),
      };
    }

    if (!architectureData?.layers) {
      return { nodes: [], edges: [] };
    }

    const transformedNodes = [];
    const transformedEdges = [];
    let yOffset = 50;

    const layersArray = Object.entries(architectureData.layers || {}).map(([name, components]) => ({
      name,
      components: components || [],
    }));

    layersArray.forEach((layer) => {
      const layerComponents = layer.components || [];
      layerComponents.forEach((component, compIndex) => {
        const isId = typeof component === 'string';
        transformedNodes.push({
          id: isId ? component : component.id || `${layer.name}-${compIndex}`,
          type: 'default',
          data: {
            label: isId ? component : component.name || component.label || component.id,
            type: isId ? 'file' : component.type || 'file',
            layer: layer.name,
          },
          position: {
            x: 100 + compIndex * 150,
            y: layerY[layer.name] ?? yOffset,
          },
        });
      });
      yOffset += 150;
    });

    if (architectureData.relationships) {
      architectureData.relationships.forEach((rel, index) => {
        transformedEdges.push({
          id: rel.id || `edge-${index}`,
          source: rel.source || rel.from,
          target: rel.target || rel.to,
          label: rel.label || rel.type || 'connects',
        });
      });
    }

    return { nodes: transformedNodes, edges: transformedEdges };
  }, [architectureData]);

  // Mock architecture data - fallback for development
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

  const stats = useMemo(() => {
    const s = architectureData?.statistics;
    if (s) {
      return {
        totalComponents: s.totalComponents ?? nodes.length,
        frontend: s.presentation ?? nodes.filter((n) => n.data.layer === 'presentation').length,
        backend: s.business ?? nodes.filter((n) => n.data.layer === 'business').length,
        data: s.data ?? nodes.filter((n) => n.data.layer === 'data').length,
        connections: s.connections ?? edges.length,
      };
    }
    return {
      totalComponents: nodes.length,
      frontend: nodes.filter((n) => ['frontend', 'presentation'].includes(n.data.layer)).length,
      backend: nodes.filter((n) => ['backend', 'business'].includes(n.data.layer)).length,
      data: nodes.filter((n) => n.data.layer === 'data').length,
      connections: edges.length,
    };
  }, [architectureData, nodes, edges]);

  if (repoLoading || loading) {
    return (
      <div className="architecture-content">
        <LoadingState message="Loading architecture..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="architecture-content">
        <ErrorState message={error} />
      </div>
    );
  }

  if (!repoId) {
    return (
      <div className="architecture-content">
        <EmptyState message="No repository selected. Please analyze a repository first." />
      </div>
    );
  }

  if (!nodes.length) {
    return (
      <div className="architecture-content">
        <EmptyState message="No architecture data available for this repository." />
      </div>
    );
  }

  const getLayerIcon = (layer) => {
    switch (layer) {
      case 'frontend': return <IconLayers />;
      case 'backend': return <IconServer />;
      case 'data': return <IconDatabase />;
      case 'infrastructure': return <IconCloud />;
      default: return <IconBox />;
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
            <IconBox />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Components</div>
            <div className="stat-value">{stats.totalComponents}</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">
            <IconLayers />
          </div>
          <div className="stat-info">
            <div className="stat-label">Frontend</div>
            <div className="stat-value">{stats.frontend}</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">
            <IconServer />
          </div>
          <div className="stat-info">
            <div className="stat-label">Backend</div>
            <div className="stat-value">{stats.backend}</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">
            <IconDatabase />
          </div>
          <div className="stat-info">
            <div className="stat-label">Data Layer</div>
            <div className="stat-value">{stats.data}</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">
            <IconCloud />
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
            initialNodes={nodes}
            initialEdges={edges}
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
            <span className="legend-icon" style={{ color: '#ec4899' }}><IconLayers /></span>
            <span>Frontend Layer</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon" style={{ color: '#8b5cf6' }}><IconServer /></span>
            <span>Backend Layer</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon" style={{ color: '#06b6d4' }}><IconDatabase /></span>
            <span>Data Layer</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon" style={{ color: '#10b981' }}><IconCloud /></span>
            <span>Infrastructure</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ArchitectureContent;

// Made with Bob
