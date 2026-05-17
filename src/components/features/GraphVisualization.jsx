'use client';

import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './GraphVisualization.css';

/**
 * GraphVisualization Component
 * 
 * A reusable graph visualization component using React Flow.
 * Supports different graph types: dependency, architecture, blast-radius, heatmap
 */
const GraphVisualization = ({
  initialNodes = [],
  initialEdges = [],
  graphType = 'dependency',
  onNodeClick,
  onEdgeClick,
  height = '600px',
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Node types styling based on graph type
  const nodeTypes = useMemo(() => ({}), []);

  // Edge styling based on graph type
  const defaultEdgeOptions = useMemo(() => {
    const baseOptions = {
      animated: false,
      style: { stroke: '#64748b', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#64748b',
      },
    };

    switch (graphType) {
      case 'blast-radius':
        return {
          ...baseOptions,
          animated: true,
          style: { ...baseOptions.style, stroke: '#f59e0b' },
          markerEnd: { ...baseOptions.markerEnd, color: '#f59e0b' },
        };
      case 'heatmap':
        return {
          ...baseOptions,
          style: { ...baseOptions.style, stroke: '#ef4444' },
          markerEnd: { ...baseOptions.markerEnd, color: '#ef4444' },
        };
      default:
        return baseOptions;
    }
  }, [graphType]);

  // MiniMap node color based on node type
  const nodeColor = (node) => {
    switch (node.data?.type) {
      case 'file':
        return '#3b82f6';
      case 'function':
        return '#10b981';
      case 'class':
        return '#8b5cf6';
      case 'api':
        return '#f59e0b';
      case 'component':
        return '#ec4899';
      case 'service':
        return '#06b6d4';
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#84cc16';
      default:
        return '#64748b';
    }
  };

  const handleNodeClick = useCallback(
    (event, node) => {
      if (onNodeClick) {
        onNodeClick(node);
      }
    },
    [onNodeClick]
  );

  const handleEdgeClick = useCallback(
    (event, edge) => {
      if (onEdgeClick) {
        onEdgeClick(edge);
      }
    },
    [onEdgeClick]
  );

  return (
    <div className="graph-visualization" style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        attributionPosition="bottom-left"
        className={`graph-${graphType}`}
      >
        <Controls />
        <MiniMap nodeColor={nodeColor} zoomable pannable />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default GraphVisualization;

// Made with Bob
