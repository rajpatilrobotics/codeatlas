import React, { useMemo, useState, useCallback } from 'react';
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import Card from '../ui/Card';
import { buildSimplifiedGraph, calculateGraphStats } from '../../utils/repository/buildGraphData.js';

function RepositoryGraph({ repoData, onOpenArchitecture }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [graphStats, setGraphStats] = useState(null);

  // Build graph data from repository
  useMemo(() => {
    if (!repoData || !repoData.fileStructure) {
      return;
    }

    try {
      const graphData = buildSimplifiedGraph(repoData.fileStructure, 50);
      const stats = calculateGraphStats(graphData.nodes, graphData.edges);

      // Style nodes based on type
      const styledNodes = graphData.nodes.map(node => ({
        ...node,
        style: {
          background: '#111',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
          borderRadius: 8,
          padding: 10,
          ...(node.data.type === 'component' && { borderColor: '#4CAF50', borderWidth: 2 }),
          ...(node.data.type === 'page' && { borderColor: '#2196F3', borderWidth: 2 }),
          ...(node.data.type === 'service' && { borderColor: '#FF9800', borderWidth: 2 }),
        }
      }));

      setNodes(styledNodes);
      setEdges(graphData.edges);
      setGraphStats(stats);
    } catch (error) {
      console.error('Error building graph:', error);
    }
  }, [repoData]);

  // Handle node click
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  // Handle node selection for dependency highlighting
  const onNodeMouseEnter = useCallback((event, node) => {
    // Highlight connected nodes
    const connectedEdges = edges.filter(edge => edge.source === node.id || edge.target === node.id);
    const connectedNodeIds = new Set([node.id]);
    
    connectedEdges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    setNodes(currentNodes =>
      currentNodes.map(n => ({
        ...n,
        style: {
          ...n.style,
          opacity: connectedNodeIds.has(n.id) ? 1 : 0.3,
          ...(n.id === node.id && { borderColor: '#fff', borderWidth: 3 })
        }
      }))
    );

    setEdges(currentEdges =>
      currentEdges.map(e => ({
        ...e,
        style: {
          ...e.style,
          opacity: connectedEdges.has(e.source) && connectedNodeIds.has(e.target) ? 1 : 0.2,
          ...(e.source === node.id || e.target === node.id) && { stroke: '#fff', strokeWidth: 2 }
        }
      }))
    );
  }, [edges, setNodes, setEdges]);

  const onNodeMouseLeave = useCallback(() => {
    // Reset highlighting
    setNodes(currentNodes =>
      currentNodes.map(n => ({
        ...n,
        style: {
          ...n.style,
          opacity: 1,
          borderColor: n.data.type === 'component' ? '#4CAF50' :
                      n.data.type === 'page' ? '#2196F3' :
                      n.data.type === 'service' ? '#FF9800' :
                      'rgba(255,255,255,0.1)',
          borderWidth: n.data.type === 'component' || n.data.type === 'page' || n.data.type === 'service' ? 2 : 1
        }
      }))
    );

    setEdges(currentEdges =>
      currentEdges.map(e => ({
        ...e,
        style: {
          ...e.style,
          opacity: 1,
          stroke: '#888888',
          strokeWidth: 1
        }
      }))
    );
  }, [setNodes, setEdges]);

  if (!repoData) {
    return (
      <Card title="Repository Dependency Graph">
        <p className="ca-page-desc">
          Please analyze a repository first to view its dependency graph.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Repository Dependency Graph">
      {graphStats && (
        <div className="graph-stats" style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div><strong>Files:</strong> {graphStats.nodeCount}</div>
            <div><strong>Components:</strong> {graphStats.componentCount}</div>
            <div><strong>Services:</strong> {graphStats.serviceCount}</div>
            <div><strong>Pages:</strong> {graphStats.pageCount}</div>
          </div>
        </div>
      )}
      
      <div className="ca-graph-container" style={{ height: 500 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#333" gap={16} />
          <Controls />
          <MiniMap nodeColor="#888888" maskColor="rgba(0,0,0,0.8)" />
        </ReactFlow>
      </div>

      {selectedNode && (
        <div className="node-details" style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
          <div><strong>File:</strong> {selectedNode.data.label}</div>
          <div><strong>Path:</strong> {selectedNode.data.path}</div>
          <div><strong>Type:</strong> {selectedNode.data.type}</div>
        </div>
      )}

      {onOpenArchitecture && (
        <button type="button" className="ca-cta-link" onClick={onOpenArchitecture}>
          View full Architecture diagrams →
        </button>
      )}
    </Card>
  );
}

export default RepositoryGraph;
