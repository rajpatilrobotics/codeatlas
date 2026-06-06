import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState } from 'reactflow';
import { Crosshair, Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import 'reactflow/dist/style.css';
import Card from '../ui/Card';
import { buildRepositoryGraphData } from '../../utils/repository/buildGraphData.js';

const VIEW_OPTIONS = [
  { id: 'dependencies', label: 'Dependencies' },
  { id: 'folders', label: 'Folders' },
  { id: 'entry', label: 'Entry Points' },
  { id: 'high-coupling', label: 'High Coupling' }
];

const DIRECTION_OPTIONS = [
  { id: 'both', label: 'Both' },
  { id: 'imports', label: 'Imports' },
  { id: 'imported-by', label: 'Imported By' }
];

function getSourceModeLabel(sourceMode) {
  if (sourceMode === 'dependency-graph') return 'Graph-backed';
  if (sourceMode === 'folder-view') return 'Folder view';
  return 'File-structure fallback';
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value * 100)}%`;
}

function renderPathList(paths, emptyLabel, onSelectPath) {
  const visiblePaths = Array.isArray(paths) ? paths.slice(0, 10) : [];

  if (visiblePaths.length === 0) {
    return <p className="ca-repo-graph-empty-text">{emptyLabel}</p>;
  }

  return (
    <ul className="ca-repo-node-list">
      {visiblePaths.map(path => (
        <li key={path}>
          <button type="button" title={path} onClick={() => onSelectPath(path)}>
            {path}
          </button>
        </li>
      ))}
      {paths.length > visiblePaths.length && (
        <li className="ca-repo-node-list-more">+{paths.length - visiblePaths.length} more</li>
      )}
    </ul>
  );
}

function RepositoryGraph({ repoData, onOpenArchitecture }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('dependencies');
  const [direction, setDirection] = useState('both');
  const [selectedPath, setSelectedPath] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const graphCanvasRef = useRef(null);
  const reactFlowInstanceRef = useRef(null);
  const fitViewTimeoutRef = useRef(null);

  const graphModel = useMemo(() => {
    if (!repoData) {
      return {
        nodes: [],
        edges: [],
        stats: null,
        selectedNode: null,
        legend: [],
        fileIndex: [],
        fileIndexMeta: null,
        visibleSummary: null
      };
    }

    return buildRepositoryGraphData(repoData, {
      searchQuery,
      viewMode,
      direction,
      selectedPath
    });
  }, [repoData, searchQuery, viewMode, direction, selectedPath]);

  useEffect(() => {
    setNodes(graphModel.nodes);
    setEdges(graphModel.edges);
  }, [graphModel, setEdges, setNodes]);

  const fitGraphView = useCallback(() => {
    if (fitViewTimeoutRef.current) {
      window.clearTimeout(fitViewTimeoutRef.current);
    }

    fitViewTimeoutRef.current = window.setTimeout(() => {
      reactFlowInstanceRef.current?.fitView?.({ padding: 0.08, duration: 240 });
      fitViewTimeoutRef.current = null;
    }, 120);
  }, []);

  useEffect(() => () => {
    if (fitViewTimeoutRef.current) {
      window.clearTimeout(fitViewTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    const handleResizeObserverNoise = (event) => {
      const message = event?.message || '';

      if (
        message === 'ResizeObserver loop completed with undelivered notifications.' ||
        message === 'ResizeObserver loop limit exceeded'
      ) {
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
      }
    };

    window.addEventListener('error', handleResizeObserverNoise, true);

    return () => {
      window.removeEventListener('error', handleResizeObserverNoise, true);
    };
  }, []);

  useEffect(() => {
    fitGraphView();
  }, [fitGraphView, graphModel.nodes, graphModel.edges]);

  useEffect(() => {
    if (!selectedPath && direction !== 'both') {
      setDirection('both');
    }
  }, [direction, selectedPath]);

  const onReactFlowInit = useCallback((instance) => {
    reactFlowInstanceRef.current = instance;
    fitGraphView();
  }, [fitGraphView]);

  const toggleFullscreen = useCallback(async () => {
    const element = graphCanvasRef.current;
    if (!element) return;

    try {
      const currentFullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;

      if (!currentFullscreenElement) {
        await (element.requestFullscreen?.() || element.webkitRequestFullscreen?.());
        fitGraphView();
        return;
      }

      if (currentFullscreenElement === element) {
        await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
        fitGraphView();
        return;
      }

      await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
    } catch (error) {
      console.error('Repository graph fullscreen toggle failed', error);
    }
  }, [fitGraphView]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const element = graphCanvasRef.current;
      const currentFullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
      setIsFullscreen(Boolean(element && currentFullscreenElement === element));
      fitGraphView();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [fitGraphView]);

  const handleSelectPath = useCallback((path) => {
    setSelectedPath(path || '');
  }, []);

  const resetGraph = useCallback(() => {
    setSearchQuery('');
    setViewMode('dependencies');
    setDirection('both');
    setSelectedPath('');
    fitGraphView();
  }, [fitGraphView]);

  const focusSelected = useCallback(() => {
    if (!selectedPath) {
      fitGraphView();
      return;
    }

    const selectedNode = nodes.find(node => node.data?.path === selectedPath);
    if (!selectedNode) {
      fitGraphView();
      return;
    }

    const centerX = selectedNode.position.x + 78;
    const centerY = selectedNode.position.y + 24;
    if (reactFlowInstanceRef.current?.setCenter) {
      reactFlowInstanceRef.current.setCenter(centerX, centerY, { zoom: 1.05, duration: 240 });
      return;
    }

    fitGraphView();
  }, [fitGraphView, nodes, selectedPath]);

  const zoomInGraph = useCallback(() => {
    reactFlowInstanceRef.current?.zoomIn?.({ duration: 160 });
  }, []);

  const zoomOutGraph = useCallback(() => {
    reactFlowInstanceRef.current?.zoomOut?.({ duration: 160 });
  }, []);

  const onNodeClick = useCallback((event, node) => {
    setSelectedPath(node.data?.path || '');
  }, []);

  const onNodeMouseEnter = useCallback((event, node) => {
    const connectedEdges = edges.filter(edge => edge.source === node.id || edge.target === node.id);
    const connectedEdgeIds = new Set(connectedEdges.map(edge => edge.id));
    const connectedNodeIds = new Set([node.id]);

    connectedEdges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    setNodes(currentNodes =>
      currentNodes.map(item => {
        const baseStyle = item.data?.baseStyle || item.style || {};

        return {
          ...item,
          style: {
            ...baseStyle,
            opacity: connectedNodeIds.has(item.id) ? 1 : 0.24,
            ...(item.id === node.id && { border: '2px solid #ffffff' })
          }
        };
      })
    );

    setEdges(currentEdges =>
      currentEdges.map(edge => {
        const baseStyle = edge.data?.baseStyle || edge.style || {};
        const isConnected = connectedEdgeIds.has(edge.id);

        return {
          ...edge,
          style: {
            ...baseStyle,
            opacity: isConnected ? 1 : 0.1,
            stroke: isConnected ? '#ffffff' : baseStyle.stroke
          }
        };
      })
    );
  }, [edges, setNodes, setEdges]);

  const onNodeMouseLeave = useCallback(() => {
    setNodes(currentNodes =>
      currentNodes.map(node => ({
        ...node,
        style: node.data?.baseStyle || node.style
      }))
    );

    setEdges(currentEdges =>
      currentEdges.map(edge => ({
        ...edge,
        style: edge.data?.baseStyle || edge.style
      }))
    );
  }, [setNodes, setEdges]);

  const stats = graphModel.stats;
  const selectedNode = graphModel.selectedNode;
  const visibleSummary = graphModel.visibleSummary;
  const fileIndex = graphModel.fileIndex || [];
  const fileIndexMeta = graphModel.fileIndexMeta || {};
  const graphBackedRatio = stats
    ? `${stats.graphFileCount}/${stats.totalRepoFiles}`
    : '';
  const renderGraphModeControls = (extraClassName = '', ariaSuffix = '') => (
    <div className={`ca-repo-control-row ${extraClassName}`.trim()}>
      <div className="ca-repo-map-search">
        <input
          className="ca-repo-search-input"
          type="search"
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
          placeholder="Search path, file, folder, layer"
          aria-label={`Search repository graph${ariaSuffix}`}
        />
        {searchQuery && (
          <button
            type="button"
            className="ca-repo-clear-button"
            onClick={() => setSearchQuery('')}
          >
            Clear
          </button>
        )}
      </div>

      <div className="ca-repo-segment-group" aria-label={`Repository graph view mode${ariaSuffix}`}>
        {VIEW_OPTIONS.map(option => (
          <button
            key={option.id}
            type="button"
            className={`ca-repo-segment ${viewMode === option.id ? 'is-active' : ''}`}
            onClick={() => {
              setViewMode(option.id);
              setSelectedPath('');
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {selectedPath && (
        <div className="ca-repo-direction-control">
          <span>Direction</span>
          <div className="ca-repo-segment-group" aria-label={`Repository graph direction${ariaSuffix}`}>
            {DIRECTION_OPTIONS.map(option => (
              <button
                key={option.id}
                type="button"
                className={`ca-repo-segment ${direction === option.id ? 'is-active' : ''}`}
                onClick={() => setDirection(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (!repoData) {
    return (
      <Card title="Repository Graph" className="ca-repo-graph-card">
        <p className="ca-page-desc">
          Please analyze a repository first to view its dependency graph.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Repository Graph" className="ca-repo-graph-card">
      {stats && (
        <div className="ca-repo-trust-panel">
          <div className={`ca-repo-trust-pill ${stats.sourceMode === 'dependency-graph' ? 'is-graph' : 'is-fallback'}`}>
            {getSourceModeLabel(stats.sourceMode)}
          </div>
          <div className="ca-repo-status-line">
            <strong>{graphBackedRatio}</strong>
            <span>files graph-backed</span>
            <span>{stats.graphEdgeCount} real edges</span>
            <span>{formatPercent(stats.coverageRatio)} coverage</span>
            <span>showing {stats.shownNodeCount}/{stats.totalCandidateNodes}</span>
            {stats.analysisTime && <span>analyzed in {stats.analysisTime}</span>}
            {stats.fallbackFileCount > 0 && <span>{stats.fallbackFileCount} fallback-only</span>}
          </div>
          {stats.isLimited && (
            <div className="ca-repo-trust-pill">Bounded view</div>
          )}
        </div>
      )}

      <div className="ca-repo-workspace">
        <aside className="ca-repo-file-panel">
          <div className="ca-repo-panel-head">
            <div>
              <span className="ca-repo-kicker">Files</span>
              <h3>{fileIndexMeta.totalMatches ?? fileIndex.length} matches</h3>
            </div>
            {fileIndexMeta.isLimited && <span className="ca-repo-small-pill">Top {fileIndex.length}</span>}
          </div>
          <div className="ca-repo-file-list" role="listbox" aria-label="Repository files">
            {fileIndex.length > 0 ? fileIndex.map(item => (
              <button
                key={item.path}
                type="button"
                className={`ca-repo-file-row ${selectedPath === item.path ? 'is-active' : ''}`}
                onClick={() => handleSelectPath(item.path)}
                title={item.path}
              >
                <span className="ca-repo-file-name">{item.name}</span>
                <span className="ca-repo-file-path">{item.path}</span>
                <span className="ca-repo-file-meta">
                  <span className={`ca-repo-file-badge ${item.isGraphBacked ? 'is-graph' : 'is-fallback'}`}>
                    {item.isGraphBacked ? 'graph' : 'fallback'}
                  </span>
                  <span>{item.layer}</span>
                  <span>{item.language}</span>
                </span>
                <span className="ca-repo-file-counts">
                  <span>{item.importCount} imports</span>
                  <span>{item.dependentCount} imported by</span>
                </span>
              </button>
            )) : (
              <div className="ca-repo-empty-panel">
                No files match the current search.
              </div>
            )}
          </div>
        </aside>

        <section className="ca-repo-graph-stage">
          <div className="ca-repo-stage-header">
            <div>
              <span className="ca-repo-kicker">Relationship Map</span>
              <h3>{visibleSummary?.title || 'Repository graph'}</h3>
              <p>{visibleSummary?.description || 'Graph-backed repository relationships.'}</p>
            </div>
            {graphModel.legend.length > 0 && (
              <div className="ca-repo-legend">
                {graphModel.legend.map(item => (
                  <span key={item.key} className="ca-repo-legend-item">
                    <i style={{ background: item.color }} />
                    {item.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {selectedNode && (
            <div className="ca-repo-focus-banner">
              <div className="ca-repo-focus-main">
                <span className="ca-repo-kicker">Focused file</span>
                <strong title={selectedNode.path}>{selectedNode.path}</strong>
              </div>
              <div className="ca-repo-focus-meta">
                <span className={`ca-repo-file-badge ${selectedNode.isGraphBacked ? 'is-graph' : 'is-fallback'}`}>
                  {selectedNode.isGraphBacked ? 'graph-backed' : 'fallback-only'}
                </span>
                <span>{selectedNode.layer}</span>
                <span>{selectedNode.language}</span>
                <span>{selectedNode.importCount} imports</span>
                <span>{selectedNode.dependentCount} imported by</span>
              </div>
              <button type="button" className="ca-repo-clear-button" onClick={() => setSelectedPath('')}>
                Clear focus
              </button>
            </div>
          )}

          {renderGraphModeControls('ca-repo-map-controls')}

          <div className="ca-graph-container ca-repo-graph-canvas" ref={graphCanvasRef}>
            {renderGraphModeControls('ca-repo-map-controls ca-repo-fullscreen-map-controls', ' fullscreen')}
            <div className="ca-repo-canvas-controls" role="toolbar" aria-label="Repository graph controls">
              <button type="button" onClick={fitGraphView} title="Fit graph">
                <Crosshair size={15} />
                <span>Fit</span>
              </button>
              <button type="button" onClick={zoomInGraph} title="Zoom in">
                <ZoomIn size={15} />
                <span>Zoom In</span>
              </button>
              <button type="button" onClick={zoomOutGraph} title="Zoom out">
                <ZoomOut size={15} />
                <span>Zoom Out</span>
              </button>
              <button type="button" onClick={focusSelected} title="Focus selected file" disabled={!selectedPath}>
                <Crosshair size={15} />
                <span>Focus</span>
              </button>
              <button type="button" onClick={resetGraph} title="Reset graph">
                <RotateCcw size={15} />
                <span>Reset</span>
              </button>
            </div>
            <button
              type="button"
              className="ca-repo-fullscreen-button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Open graph fullscreen'}
              aria-label={isFullscreen ? 'Exit repository graph fullscreen' : 'Open repository graph fullscreen'}
              aria-pressed={isFullscreen}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
            </button>
            {nodes.length > 0 ? (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onInit={onReactFlowInit}
                onNodeClick={onNodeClick}
                onNodeMouseEnter={onNodeMouseEnter}
                onNodeMouseLeave={onNodeMouseLeave}
                minZoom={0.16}
                maxZoom={1.8}
                zoomOnScroll={false}
                panOnScroll={false}
                preventScrolling={false}
                zoomOnPinch
                panOnDrag
                selectionOnDrag={false}
                proOptions={{ hideAttribution: true }}
              >
                <Background color="#333" gap={16} />
                <Controls />
                <MiniMap
                  nodeColor={node => node.data?.color || '#888888'}
                  maskColor="rgba(0,0,0,0.82)"
                />
              </ReactFlow>
            ) : (
              <div className="ca-repo-graph-empty">
                <strong>No graph nodes match the current filters.</strong>
                <span>{searchQuery ? 'Try a different path or folder.' : 'Run repository analysis to generate graph data.'}</span>
              </div>
            )}
          </div>
        </section>

        <aside className="ca-repo-inspector-panel">
          {selectedNode ? (
            <>
              <div className="ca-repo-panel-head">
                <div>
                  <span className="ca-repo-kicker">Selected file</span>
                  <h3 title={selectedNode.path}>{selectedNode.name || selectedNode.path}</h3>
                </div>
                <span className={`ca-repo-file-badge ${selectedNode.isGraphBacked ? 'is-graph' : 'is-fallback'}`}>
                  {selectedNode.isGraphBacked ? 'graph' : 'fallback'}
                </span>
              </div>
              <p className="ca-repo-selected-path" title={selectedNode.path}>{selectedNode.path}</p>
              <div className="ca-repo-inspector-grid">
                <div><span>Layer</span><strong>{selectedNode.layer}</strong></div>
                <div><span>Language</span><strong>{selectedNode.language}</strong></div>
                <div><span>Imports</span><strong>{selectedNode.importCount}</strong></div>
                <div><span>Imported by</span><strong>{selectedNode.dependentCount}</strong></div>
              </div>
              {!selectedNode.isGraphBacked && (
                <div className="ca-repo-inspector-note">
                  This file is visible in the repository tree, but it is not graph-backed by parsed local imports.
                </div>
              )}
              <div className="ca-repo-inspector-section">
                <h4>Direct imports</h4>
                {renderPathList(selectedNode.directImports, 'No direct imports found.', handleSelectPath)}
              </div>
              <div className="ca-repo-inspector-section">
                <h4>Imported by</h4>
                {renderPathList(selectedNode.directDependents, 'No direct dependents found.', handleSelectPath)}
              </div>
              {selectedNode.edgeEvidence?.length > 0 && (
                <div className="ca-repo-inspector-section">
                  <h4>Evidence</h4>
                  <ul className="ca-repo-evidence-list">
                    {selectedNode.edgeEvidence.map((edge, index) => (
                      <li key={`${edge.sourcePath}-${edge.targetPath}-${index}`}>
                        <span>{edge.sourcePath}</span>
                        <strong>imports</strong>
                        <span>{edge.targetPath}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="ca-repo-panel-head">
                <div>
                  <span className="ca-repo-kicker">Inspector</span>
                  <h3>Select a file</h3>
                </div>
              </div>
              <p className="ca-repo-graph-empty-text">
                Pick a file from the list or click a graph node to focus its dependency neighborhood.
              </p>
              <div className="ca-repo-inspector-section">
                <h4>Top graph-backed files</h4>
                {renderPathList(fileIndex.filter(item => item.isGraphBacked).slice(0, 6).map(item => item.path), 'No graph-backed files found.', handleSelectPath)}
              </div>
            </>
          )}
        </aside>
      </div>

      {onOpenArchitecture && (
        <button type="button" className="ca-cta-link" onClick={onOpenArchitecture}>
          View full Architecture diagrams →
        </button>
      )}
    </Card>
  );
}

export default RepositoryGraph;
