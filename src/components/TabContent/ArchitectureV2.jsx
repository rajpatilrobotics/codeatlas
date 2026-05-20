import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  getSmoothStepPath,
} from 'reactflow';
import 'reactflow/dist/style.css';
import '../../styles/architecture-v2.css';
import { Network, Search, Layers, GitBranch, Boxes, Activity, Maximize2 } from 'lucide-react';
import { buildArchitectureV2Graph } from '../../utils/repository/buildArchitectureV2Graph';

let elkInstancePromise;

async function getElkInstance() {
  if (!elkInstancePromise) {
    elkInstancePromise = import('elkjs/lib/elk.bundled.js').then((module) => {
      const ELK = module.default || module;
      return new ELK();
    });
  }
  return elkInstancePromise;
}

const VIEW_MODES = [
  { id: 'system', label: 'System', description: 'Layered architecture overview' },
  { id: 'modules', label: 'Modules', description: 'Folder and module clusters' },
  { id: 'dependencies', label: 'Dependencies', description: 'Internal and package usage' },
  { id: 'flow', label: 'Flow', description: 'Entrypoint to data path' }
];

const nodeTypes = {
  architectureV2: memo(function ArchitectureV2Node({ data, selected }) {
    const riskLevel = data.securityIssues > 0 ? 'risk' : 'clean';

    return (
      <div
        className={`arch-v2-node ${selected ? 'selected' : ''} ${riskLevel}`}
        style={{ '--node-accent': data.color || '#38bdf8' }}
      >
        <Handle type="target" position={Position.Left} className="arch-v2-handle" />
        <div className="arch-v2-node-topline">
          <span className="arch-v2-node-kind">{data.layer}</span>
          <span className="arch-v2-node-score">{Math.round(data.importance || 0)}</span>
        </div>
        <div className="arch-v2-node-title" title={data.label}>{data.label}</div>
        <div className="arch-v2-node-path" title={data.path}>{data.path}</div>
        <div className="arch-v2-node-metrics">
          <span>{data.functions || 0} fn</span>
          <span>{data.classes || 0} cls</span>
          {data.version && <span>{data.version}</span>}
          {data.securityIssues > 0 && <span className="arch-v2-node-risk">{data.securityIssues} risk</span>}
        </div>
        <Handle type="source" position={Position.Right} className="arch-v2-handle" />
      </div>
    );
  }),
  cluster: memo(function ArchitectureV2Cluster({ data, selected }) {
    return (
      <div
        className={`arch-v2-cluster ${selected ? 'selected' : ''}`}
        style={{ '--node-accent': data.color || '#38bdf8' }}
      >
        <Handle type="target" position={Position.Left} className="arch-v2-handle" />
        <div className="arch-v2-cluster-orbit" />
        <div>
          <div className="arch-v2-cluster-eyebrow">Cluster</div>
          <div className="arch-v2-cluster-title">{data.label}</div>
          <div className="arch-v2-cluster-subtitle">{data.count || 0} mapped items</div>
        </div>
        <Handle type="source" position={Position.Right} className="arch-v2-handle" />
      </div>
    );
  })
};

const edgeTypes = {
  architectureV2Edge: memo(function ArchitectureV2Edge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    data,
    style,
  }) {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 18,
    });

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          style={style}
        />
        <EdgeLabelRenderer>
          <div
            className="arch-v2-edge-label"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {data?.relationship || 'relates'}
          </div>
        </EdgeLabelRenderer>
      </>
    );
  })
};

function fallbackLayout(nodes, edges) {
  return {
    nodes: nodes.map((node, index) => ({
      ...node,
      position: {
        x: (index % 4) * 310,
        y: Math.floor(index / 4) * 190
      }
    })),
    edges
  };
}

async function layoutWithElk(nodes, edges, direction = 'RIGHT') {
  if (nodes.length === 0) return { nodes, edges };

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '70',
      'elk.layered.spacing.nodeNodeBetweenLayers': '110',
      'elk.spacing.edgeNode': '40',
      'elk.spacing.edgeEdge': '24',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.separateConnectedComponents': 'true'
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: node.type === 'cluster' ? 250 : node.data?.nodeType === 'dependency' ? 230 : 280,
      height: node.type === 'cluster' ? 118 : 132
    })),
    edges: edges
      .filter(edge => nodes.some(node => node.id === edge.source) && nodes.some(node => node.id === edge.target))
      .map(edge => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target]
      }))
  };

  try {
    const elk = await getElkInstance();
    const layout = await elk.layout(graph);
    const positionMap = new Map((layout.children || []).map(child => [child.id, child]));

    return {
      nodes: nodes.map((node) => {
        const layoutNode = positionMap.get(node.id);
        return {
          ...node,
          position: {
            x: layoutNode?.x || 0,
            y: layoutNode?.y || 0
          }
        };
      }),
      edges
    };
  } catch (error) {
    console.warn('Architecture V2 ELK layout failed, using fallback layout:', error);
    return fallbackLayout(nodes, edges);
  }
}

function ArchitectureV2({
  repoData,
  detailedArchitecture,
  architectureError,
  codeAnalysis,
  isCodeAnalysisLoading,
}) {
  const [viewMode, setViewMode] = useState('system');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [layoutedGraph, setLayoutedGraph] = useState({ nodes: [], edges: [] });
  const [isLayouting, setIsLayouting] = useState(false);

  const rawGraph = useMemo(() => buildArchitectureV2Graph({
    repoData,
    detailedArchitecture,
    codeAnalysis,
    viewMode,
    expandedGroups,
    searchQuery,
    maxNodes: 110
  }), [repoData, detailedArchitecture, codeAnalysis, viewMode, expandedGroups, searchQuery]);

  const connectedIds = useMemo(() => {
    if (!selectedNode) return new Set();
    const ids = new Set([selectedNode.id]);
    rawGraph.edges.forEach((edge) => {
      if (edge.source === selectedNode.id) ids.add(edge.target);
      if (edge.target === selectedNode.id) ids.add(edge.source);
    });
    return ids;
  }, [rawGraph.edges, selectedNode]);

  useEffect(() => {
    let cancelled = false;
    setIsLayouting(true);

    layoutWithElk(rawGraph.nodes, rawGraph.edges, viewMode === 'flow' ? 'RIGHT' : 'DOWN')
      .then((graph) => {
        if (!cancelled) setLayoutedGraph(graph);
      })
      .finally(() => {
        if (!cancelled) setIsLayouting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rawGraph.nodes, rawGraph.edges, viewMode]);

  const nodes = useMemo(() => layoutedGraph.nodes.map((node) => ({
    ...node,
    className: connectedIds.size > 0 && !connectedIds.has(node.id) ? 'arch-v2-muted' : '',
  })), [layoutedGraph.nodes, connectedIds]);

  const edges = useMemo(() => layoutedGraph.edges.map((edge) => {
    const active = connectedIds.size === 0 || connectedIds.has(edge.source) || connectedIds.has(edge.target);
    const strength = edge.data?.strength || 1;
    return {
      ...edge,
      animated: active && !edge.data?.inferred && strength > 1,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: active ? '#67e8f9' : 'rgba(148, 163, 184, 0.35)'
      },
      style: {
        stroke: active ? (edge.data?.inferred ? '#818cf8' : '#67e8f9') : 'rgba(148, 163, 184, 0.22)',
        strokeWidth: active ? Math.min(4, 1.4 + strength) : 1,
        strokeDasharray: edge.data?.inferred ? '6 8' : undefined,
        opacity: active ? 0.95 : 0.25
      }
    };
  }), [layoutedGraph.edges, connectedIds]);

  const handleNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const handleNodeDoubleClick = useCallback((event, node) => {
    if (node.type !== 'cluster') return;
    const group = node.data?.group;
    if (!group) return;
    setExpandedGroups((current) => (
      current.includes(group)
        ? current.filter(item => item !== group)
        : [...current, group]
    ));
  }, []);

  if (!repoData) {
    return (
      <div className="tab-content architecture-v2-tab">
        <div className="content-card arch-v2-empty">
          <Network size={36} />
          <h2>Architecture V2</h2>
          <p className="text-secondary">Analyze a repository to generate the experimental architecture intelligence map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content architecture-v2-tab">
      <section className="arch-v2-hero">
        <div>
          <div className="arch-v2-kicker">Experimental graph intelligence</div>
          <h2>Architecture Intelligence Map</h2>
          <p>
            A clustered architecture surface built from repository structure, code definitions,
            imports, dependencies, and detected implementation patterns.
          </p>
        </div>
        <div className="arch-v2-stats">
          <div><strong>{rawGraph.stats?.totalFiles || 0}</strong><span>files</span></div>
          <div><strong>{rawGraph.stats?.dependencies || 0}</strong><span>deps</span></div>
          <div><strong>{rawGraph.stats?.visibleNodes || 0}</strong><span>nodes</span></div>
          <div><strong>{rawGraph.stats?.securityIssues || 0}</strong><span>risks</span></div>
        </div>
      </section>

      <section className="arch-v2-shell">
        <div className="arch-v2-toolbar">
          <div className="arch-v2-modes" role="tablist" aria-label="Architecture V2 modes">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={viewMode === mode.id ? 'active' : ''}
                onClick={() => {
                  setViewMode(mode.id);
                  setSelectedNode(null);
                }}
                title={mode.description}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <label className="arch-v2-search">
            <Search size={16} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search files, folders, layers..."
            />
          </label>
        </div>

        <div className="arch-v2-map">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            fitView
            fitViewOptions={{ padding: 0.18, includeHiddenNodes: false }}
            minZoom={0.08}
            maxZoom={1.8}
            defaultEdgeOptions={{ zIndex: 2 }}
            proOptions={{ hideAttribution: false }}
          >
            <Background color="rgba(148, 163, 184, 0.18)" gap={22} size={1} />
            <Controls />
            <MiniMap
              pannable
              zoomable
              maskColor="rgba(2, 6, 23, 0.76)"
              nodeColor={(node) => node.data?.color || '#38bdf8'}
            />
            <PanelStatus
              isLayouting={isLayouting || isCodeAnalysisLoading}
              architectureError={architectureError}
              architecturePattern={rawGraph.stats?.architecturePattern}
            />
            <FitHint />
          </ReactFlow>
        </div>
      </section>

      <aside className="arch-v2-inspector">
        {selectedNode ? (
          <>
            <div className="arch-v2-inspector-heading">
              <span style={{ background: selectedNode.data?.color || '#38bdf8' }} />
              <div>
                <h3>{selectedNode.data?.label}</h3>
                <p>{selectedNode.data?.path || selectedNode.data?.nodeType}</p>
              </div>
            </div>
            <div className="arch-v2-inspector-grid">
              <div><strong>{selectedNode.data?.nodeType || selectedNode.type}</strong><span>type</span></div>
              <div><strong>{selectedNode.data?.layer || selectedNode.data?.group || 'cluster'}</strong><span>layer</span></div>
              <div><strong>{selectedNode.data?.functions || 0}</strong><span>functions</span></div>
              <div><strong>{selectedNode.data?.classes || 0}</strong><span>classes</span></div>
            </div>
            <p className="arch-v2-inspector-note">
              Double-click cluster nodes to expand or collapse their representative files. Selecting a node highlights its immediate architecture path.
            </p>
          </>
        ) : (
          <>
            <div className="arch-v2-inspector-heading">
              <span />
              <div>
                <h3>Graph Explorer</h3>
                <p>Select a node to inspect its metadata and connected relationships.</p>
              </div>
            </div>
            <div className="arch-v2-inspector-actions">
              <div><Layers size={18} /> Cluster-first overview</div>
              <div><GitBranch size={18} /> Import-aware relationships</div>
              <div><Boxes size={18} /> Real repository structure</div>
              <div><Activity size={18} /> Active path highlighting</div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function PanelStatus({ isLayouting, architectureError, architecturePattern }) {
  return (
    <div className="arch-v2-status-panel">
      <span className={isLayouting ? 'pulse' : ''} />
      <strong>{isLayouting ? 'Laying out graph' : 'ELK layout ready'}</strong>
      <em>{architectureError ? 'Architecture text analysis unavailable' : architecturePattern}</em>
    </div>
  );
}

function FitHint() {
  return (
    <div
      className="arch-v2-fit-hint"
      title="Use the React Flow controls to fit, pan, and zoom"
    >
      <Maximize2 size={14} />
      Explore with pan and zoom
    </div>
  );
}

export default ArchitectureV2;
