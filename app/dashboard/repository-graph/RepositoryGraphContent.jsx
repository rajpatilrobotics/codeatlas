'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import useRepoStore from '@/store/useRepoStore';
import GraphVisualization from '@/src/components/features/GraphVisualization';
import Card from '@/src/components/ui/Card';
import Button from '@/src/components/ui/Button';
import Badge from '@/src/components/ui/Badge';
import LoadingState from '@/src/components/ui/LoadingState';
import ErrorState from '@/src/components/ui/ErrorState';
import EmptyState from '@/src/components/ui/EmptyState';
import './RepositoryGraphContent.css';

// Simple icon components to replace lucide-react
const IconSearch = () => <span>🔍</span>;
const IconFilter = () => <span>⚙</span>;
const IconDownload = () => <span>⬇</span>;
const IconZoomIn = () => <span>➕</span>;
const IconZoomOut = () => <span>➖</span>;
const IconMaximize = () => <span>⛶</span>;

/**
 * Repository Graph Content Component
 * Displays the dependency graph of the repository
 */
const RepositoryGraphContent = () => {
  const currentRepo = useRepoStore((state) => state.currentRepo);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchGraphData() {
      if (!currentRepo?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const result = await apiClient.getRepositoryGraph(currentRepo.id, 'dependency');
        setGraphData(result);
      } catch (err) {
        console.error('Failed to fetch repository graph:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchGraphData();
  }, [currentRepo?.id]);

  // Transform API data to graph format
  const { nodes, edges } = useMemo(() => {
    if (!graphData?.nodes || !graphData?.edges) {
      return { nodes: [], edges: [] };
    }

    const transformedNodes = graphData.nodes.map((node, index) => ({
      id: node.id || `node-${index}`,
      type: 'default',
      data: {
        label: node.name || node.label || node.id,
        type: node.type || 'file'
      },
      position: node.position || { x: Math.random() * 500, y: Math.random() * 500 },
    }));

    const transformedEdges = graphData.edges.map((edge, index) => ({
      id: edge.id || `edge-${index}`,
      source: edge.source || edge.from,
      target: edge.target || edge.to,
      label: edge.label || edge.type || 'depends on',
    }));

    return { nodes: transformedNodes, edges: transformedEdges };
  }, [graphData]);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const handleExport = () => {
    console.log('Exporting graph...');
    // TODO: Implement graph export functionality
  };

  const stats = useMemo(() => ({
    totalNodes: nodes.length,
    totalEdges: edges.length,
    files: nodes.filter(n => n.data.type === 'file').length,
    components: nodes.filter(n => n.data.type === 'component').length,
    services: nodes.filter(n => n.data.type === 'service').length,
    functions: nodes.filter(n => n.data.type === 'function').length,
  }), [nodes, edges]);

  if (loading) {
    return (
      <div className="repository-graph-content">
        <LoadingState message="Loading repository graph..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="repository-graph-content">
        <ErrorState message={error} />
      </div>
    );
  }

  if (!currentRepo) {
    return (
      <div className="repository-graph-content">
        <EmptyState message="No repository selected. Please analyze a repository first." />
      </div>
    );
  }

  if (!nodes.length) {
    return (
      <div className="repository-graph-content">
        <EmptyState message="No graph data available for this repository." />
      </div>
    );
  }

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
            <IconDownload />
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
              <IconSearch />
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
            initialNodes={nodes}
            initialEdges={edges}
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
