import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Network, Search, Layers, GitBranch, Boxes, Activity, Maximize2, DownloadCloud } from 'lucide-react';
import { buildArchitectureV2Graph } from '../../utils/repository/buildArchitectureV2Graph';
import { cleanMarkdown } from '../../utils/textFormatting';

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
  { id: 'flow', label: 'Flow', description: 'Entrypoint to data path' },
  { id: 'techstack', label: 'Tech Stack', description: 'Detected technologies & infrastructure' }
];

const nodeTypes = {
  architectureV2: memo(function ArchitectureV2Node({ data, selected }) {
    const riskLevel = data.securityIssues > 0 ? 'risk' : 'clean';
    const isTechNode = data.nodeType === 'technology';
    const isCompact = Boolean(data.compact);
    const showFunctionClass = !isTechNode;
    const showMetrics = showFunctionClass || Boolean(data.version) || (data.securityIssues || 0) > 0;

    return (
      <div
        className={`arch-v2-node ${isCompact ? 'arch-v2-techstack-item' : ''} ${selected ? 'selected' : ''} ${riskLevel}`}
        style={{ '--node-accent': data.color || 'rgba(255,255,255,0.12)' }}
      >
        <Handle type="target" position={Position.Left} className="arch-v2-handle" />
        <div className="arch-v2-node-topline">
          <span className="arch-v2-node-kind">{data.layer}</span>
          <span className="arch-v2-node-score">{Math.round(data.importance || 0)}</span>
        </div>
        <div className="arch-v2-node-title" title={data.label}>{data.label}</div>
        <div className="arch-v2-node-path" title={data.path}>{data.path}</div>
        {showMetrics ? (
          <div className="arch-v2-node-metrics">
            {showFunctionClass && <span>{data.functions || 0} fn</span>}
            {showFunctionClass && <span>{data.classes || 0} cls</span>}
            {data.version && <span>{data.version}</span>}
            {data.securityIssues > 0 && <span className="arch-v2-node-risk">{data.securityIssues} risk</span>}
          </div>
        ) : null}
        <Handle type="source" position={Position.Right} className="arch-v2-handle" />
      </div>
    );
  }),
  cluster: memo(function ArchitectureV2Cluster({ data, selected }) {
    const isCompact = Boolean(data.compact);
    return (
      <div
        className={`arch-v2-cluster ${isCompact ? 'arch-v2-techstack-cluster' : ''} ${selected ? 'selected' : ''}`}
        style={{ '--node-accent': data.color || 'rgba(255,255,255,0.12)' }}
      >
        <Handle type="target" position={Position.Left} className="arch-v2-handle" />
        <div className="arch-v2-cluster-orbit" />
        <div>
          <div className="arch-v2-cluster-eyebrow">{data.eyebrow || 'Cluster'}</div>
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
    className,
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

    const isActive = typeof className === 'string' && className.includes('is-active');
    const baseStroke = style?.stroke || 'rgba(255,255,255,0.8)';
    const baseWidth = style?.strokeWidth || 1;
    const glowWidth = Math.min(10, baseWidth + 6);
    const glowOpacity = data?.inferred ? 0.14 : 0.18;

    return (
      <>
        {isActive ? (
          <BaseEdge
            id={`${id}-glow`}
            path={edgePath}
            style={{
              ...style,
              stroke: baseStroke,
              strokeWidth: glowWidth,
              opacity: glowOpacity,
            }}
            className="arch-v2-edge-glow"
          />
        ) : null}
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          style={style}
          className={`arch-v2-edge-path ${className || ''}`.trim()}
        />
        {data?.showLabel === false ? null : (
          <EdgeLabelRenderer>
            <div
              className="arch-v2-edge-label"
              style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            >
              {data?.relationship || 'relates'}
            </div>
          </EdgeLabelRenderer>
        )}
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
      'elk.spacing.nodeNode': '78',
      'elk.layered.spacing.nodeNodeBetweenLayers': '128',
      'elk.spacing.edgeNode': '46',
      'elk.spacing.edgeEdge': '24',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.separateConnectedComponents': 'true',
      'elk.padding': '[top=40,left=40,bottom=40,right=40]'
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: node.type === 'cluster'
        ? 250
        : node.data?.nodeType === 'technology'
          ? 250
          : node.data?.nodeType === 'dependency'
            ? 238
            : 280,
      height: node.type === 'cluster'
        ? 118
        : node.data?.nodeType === 'technology'
          ? 118
          : 132
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

function parseAnalysisSections(rawText) {
  const text = cleanMarkdown(rawText || '').trim();
  if (!text) return [];

  const lines = text.split('\n');
  const sections = [];
  let currentTitle = 'Overview';
  let buffer = [];

  const flush = () => {
    const content = buffer.join('\n').trim();
    if (content) sections.push({ title: currentTitle, content });
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isHeader =
      /^\d+\./.test(trimmed) ||
      /^#{1,3}\s+/.test(trimmed) ||
      (trimmed.length < 72 && (trimmed.endsWith(':') || (/^[A-Z][^.!?]*$/.test(trimmed) && trimmed.length > 6)));

    if (isHeader) {
      flush();
      currentTitle = trimmed
        .replace(/^#{1,3}\s+/, '')
        .replace(/^\d+\.\s*/, '')
        .replace(/:$/, '')
        .trim() || 'Overview';
      continue;
    }

    buffer.push(trimmed);
  }

  flush();
  return sections;
}

function AnalysisText({ text, maxSections = 6 }) {
  const sections = useMemo(() => parseAnalysisSections(text), [text]);

  if (!sections.length) return null;

  return (
    <div className="arch-v2-analysis">
      {sections.slice(0, maxSections).map((section) => (
        <div key={section.title} className="arch-v2-analysis-section">
          <div className="arch-v2-analysis-title">{section.title}</div>
          <div className="arch-v2-analysis-body">
            {section.content.split('\n').map((line, idx) => {
              const trimmed = line.trim();
              const isBullet = /^[-*•]\s+/.test(trimmed);
              if (isBullet) {
                return (
                  <div key={idx} className="arch-v2-analysis-bullet">{trimmed.replace(/^[-*•]\s+/, '')}</div>
                );
              }
              return (
                <div key={idx} className="arch-v2-analysis-line">{trimmed}</div>
              );
            })}
          </div>
        </div>
      ))}
      {sections.length > maxSections ? (
        <div className="arch-v2-analysis-more">Showing {maxSections} of {sections.length} sections</div>
      ) : null}
    </div>
  );
}

function ArchitectureV2({
  repoData,
  architectureAnalysis,
  isArchitectureLoading,
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
  const reactFlowWrapper = useRef(null);
  const fullscreenWrapper = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const importantFiles = useMemo(() => repoData?.importantFiles || [], [repoData]);
  const techStack = useMemo(() => repoData?.techStack || {}, [repoData]);
  const packageJson = useMemo(() => repoData?.packageJson || {}, [repoData]);
  const packageJsonPath = repoData?.packageJsonPath;

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
      className: active ? 'is-active' : 'is-idle',
      animated: active && !edge.data?.inferred && strength > 1,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.22)'
      },
      style: {
        stroke: active
          ? (edge.data?.inferred ? 'rgba(210,210,210,0.88)' : 'rgba(255,255,255,0.88)')
          : 'rgba(255,255,255,0.18)',
        strokeWidth: active ? Math.min(4, 1.35 + strength) : 1,
        strokeDasharray: edge.data?.inferred ? '6 8' : undefined,
        opacity: active ? 0.92 : 0.38
      }
    };
  }), [layoutedGraph.edges, connectedIds]);

  const handleNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
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

  const modeInsight = useMemo(() => {
    const depsCount =
      (packageJson?.dependencies ? Object.keys(packageJson.dependencies).length : 0) +
      (packageJson?.devDependencies ? Object.keys(packageJson.devDependencies).length : 0) +
      (packageJson?.peerDependencies ? Object.keys(packageJson.peerDependencies).length : 0);

    const techCount = Object.values(techStack).reduce(
      (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
      0
    );

    if (viewMode === 'flow') {
      return {
        title: 'Hybrid Architecture Layout',
        description: 'This diagram combines Hub & Spoke (Backend as central hub) with Layered Tiers (organized by function).',
        bullets: [
          '📊 Architecture Tiers:',
          '🎨 Presentation Tier: Frontend Layer',
          '⚙️ Application Tier: Backend (Hub) + Authentication',
          '🔗 Data Access Tier: ORM Layer',
          '💾 Persistence Tier: Database + Cache + Message Queue',
          '🚀 Infrastructure Tier: Testing + DevOps',
          '💡 Interactive Features: Drag nodes to rearrange • Zoom with mouse wheel • Pan by dragging background',
          '🔵 Solid arrows: Primary data flow • ⚪ Dashed lines: Async/Cache connections'
        ]
      };
    }

    if (viewMode === 'techstack') {
      return {
        title: 'Detected Technology Stack',
        description: 'Technologies are inferred from repo files, manifests, and dependency metadata.',
        bullets: [
          packageJsonPath ? `Package manifest: ${packageJsonPath}` : 'Package manifest: detected automatically',
          `Total technologies detected: ${techCount}`,
          `Dependencies indexed: ${depsCount}`
        ]
      };
    }

    if (viewMode === 'dependencies') {
      return {
        title: 'Dependency Intelligence',
        description: 'This map surfaces internal imports and external packages that shape module coupling.',
        bullets: [
          `Repository dependencies indexed: ${depsCount}`,
          `Graph edges rendered: ${rawGraph.edges.length}`,
          'Select a node to see its immediate dependency neighborhood'
        ]
      };
    }

    if (viewMode === 'modules') {
      return {
        title: 'Module Clusters',
        description: 'Folders and modules are grouped into clusters to keep large codebases readable.',
        bullets: [
          `Key components detected: ${importantFiles.length}`,
          'Double-click a cluster to expand/collapse its representative files',
          'Use search to focus on a subsystem or folder'
        ]
      };
    }

    return {
      title: 'System Overview',
      description: 'A layered architecture overview built from repository structure and code analysis.',
      bullets: [
        `Nodes rendered: ${rawGraph.nodes.length}`,
        `Connections rendered: ${rawGraph.edges.length}`,
        rawGraph.stats?.architecturePattern
          ? `Detected pattern: ${rawGraph.stats.architecturePattern}`
          : 'Detected pattern: inferred from structure'
      ]
    };
  }, [viewMode, rawGraph.edges.length, rawGraph.nodes.length, rawGraph.stats?.architecturePattern, importantFiles.length, packageJson, packageJsonPath, techStack]);

  const toggleFullscreen = useCallback(async () => {
    const el = fullscreenWrapper.current;
    if (!el) return;
    try {
      const currentFullscreenEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (!currentFullscreenEl) {
        await (el.requestFullscreen?.() || el.webkitRequestFullscreen?.());
        return;
      }

      if (currentFullscreenEl === el) {
        await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
        return;
      }

      // If something else is fullscreen, exit first.
      await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
    } catch (err) {
      console.error('Fullscreen toggle failed', err);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const target = fullscreenWrapper.current;
      const currentFullscreenEl = document.fullscreenElement || document.webkitFullscreenElement;
      setIsFullscreen(Boolean(target && currentFullscreenEl === target));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    handleFullscreenChange();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const exportPng = useCallback(async () => {
    const el = reactFlowWrapper.current;
    if (!el) return;
    if (isExporting) return;
    setIsExporting(true);
    try {
      const mod = await import('html-to-image');
      const toPng = mod.toPng || mod.default?.toPng;
      if (!toPng) throw new Error('html-to-image toPng export not available');
      const scale = 2;
      const width = el.clientWidth * scale;
      const height = el.clientHeight * scale;
      const dataUrl = await toPng(el, {
        width,
        height,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          background: getComputedStyle(el).backgroundColor || '#0a0a0a'
        },
        bgcolor: getComputedStyle(el).backgroundColor || '#0a0a0a'
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `architecture-${viewMode}.png`;
      a.click();
    } catch (err) {
      console.error('Export PNG failed', err);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, viewMode]);

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

      <section className="arch-v2-shell" ref={fullscreenWrapper}>
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
          <div className="arch-v2-actions">
            <button
              type="button"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              aria-pressed={isFullscreen}
              onClick={toggleFullscreen}
              className="arch-v2-btn arch-v2-btn--icon"
            >
              <Maximize2 size={16} />
              <span className="arch-v2-btn-text">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
            </button>
            <button
              type="button"
              title={isExporting ? 'Exporting PNG…' : 'Download PNG'}
              aria-label="Download PNG"
              aria-busy={isExporting}
              disabled={isExporting}
              onClick={exportPng}
              className="arch-v2-btn arch-v2-btn--icon"
            >
              {isExporting ? <span className="arch-v2-btn-spinner" aria-hidden="true" /> : <DownloadCloud size={16} />}
              <span className="arch-v2-btn-text">{isExporting ? 'Exporting…' : 'Download PNG'}</span>
            </button>
          </div>
        </div>

        <div className="arch-v2-map" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onPaneClick={handlePaneClick}
            fitView
            fitViewOptions={{ padding: 0.18, includeHiddenNodes: false }}
            minZoom={0.08}
            maxZoom={1.8}
            defaultEdgeOptions={{ zIndex: 2 }}
            proOptions={{ hideAttribution: false }}
          >
            <Background color="rgba(255,255,255,0.03)" gap={22} size={1} />
            <Controls />
            <MiniMap
              pannable
              zoomable
              maskColor="rgba(0,0,0,0.6)"
              nodeColor={() => 'rgba(255,255,255,0.85)'}
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
              <span style={{ background: 'rgba(255,255,255,0.12)' }} />
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

            <details className="arch-v2-insight" style={{ marginTop: 14 }}>
              <summary className="arch-v2-insight-summary">Mode Insights</summary>
              <div className="arch-v2-insight-body">
                <div className="arch-v2-insight-title">{modeInsight.title}</div>
                <div className="arch-v2-insight-desc">{modeInsight.description}</div>
                <ul className="arch-v2-insight-list">
                  {modeInsight.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </details>

            <details className="arch-v2-insight">
              <summary className="arch-v2-insight-summary">Architecture Analysis</summary>
              <div className="arch-v2-insight-body">
                {isArchitectureLoading ? (
                  <div className="arch-v2-insight-muted">Generating architecture analysis…</div>
                ) : architectureError ? (
                  <div className="arch-v2-insight-muted">Failed to generate analysis: {architectureError}</div>
                ) : architectureAnalysis ? (
                  <div className="arch-v2-insight-scroll">
                    <AnalysisText text={architectureAnalysis} maxSections={6} />
                  </div>
                ) : (
                  <div className="arch-v2-insight-muted">Architecture analysis will appear here once generated.</div>
                )}
              </div>
            </details>

            <details className="arch-v2-insight">
              <summary className="arch-v2-insight-summary">Code Analysis Insights</summary>
              <div className="arch-v2-insight-body">
                {isCodeAnalysisLoading ? (
                  <div className="arch-v2-insight-muted">Analyzing code structure…</div>
                ) : codeAnalysis?.summary ? (
                  <>
                    {Array.isArray(codeAnalysis.summary.patterns) && codeAnalysis.summary.patterns.length > 0 ? (
                      <div className="arch-v2-pill-row">
                        {codeAnalysis.summary.patterns.slice(0, 8).map((pattern) => (
                          <span key={pattern} className="arch-v2-pill">{pattern}</span>
                        ))}
                      </div>
                    ) : null}

                    <div className="arch-v2-mini-grid">
                      <div><strong>{codeAnalysis.summary.totalFiles || 0}</strong><span>files</span></div>
                      <div><strong>{codeAnalysis.summary.totalLines || 0}</strong><span>lines</span></div>
                      <div><strong>{codeAnalysis.definitions?.functions?.length || 0}</strong><span>functions</span></div>
                      <div><strong>{codeAnalysis.definitions?.classes?.length || 0}</strong><span>classes</span></div>
                    </div>

                    {codeAnalysis.summary.languages && Object.keys(codeAnalysis.summary.languages).length > 0 ? (
                      <div className="arch-v2-language-list">
                        {Object.entries(codeAnalysis.summary.languages).slice(0, 6).map(([lang, pct]) => (
                          <div key={lang} className="arch-v2-language-item">
                            <span>{lang}</span>
                            <em>{pct}%</em>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {codeAnalysis.definitions && (codeAnalysis.definitions.functions?.length || codeAnalysis.definitions.classes?.length) ? (
                      <div className="arch-v2-defs">
                        <div className="arch-v2-defs-title">Key Code Definitions</div>
                        <div className="arch-v2-defs-grid">
                          {Array.isArray(codeAnalysis.definitions.functions) && codeAnalysis.definitions.functions.length > 0 ? (
                            <div className="arch-v2-defs-col">
                              <div className="arch-v2-defs-coltitle">Functions ({codeAnalysis.definitions.functions.length})</div>
                              <div className="arch-v2-defs-list">
                                {codeAnalysis.definitions.functions.slice(0, 6).map((func) => (
                                  <div key={`${func?.file || 'unknown'}:${func?.line || 0}:${func?.name || 'Unknown'}`} className="arch-v2-def">
                                    <div className="arch-v2-def-name">{func?.name || 'Unknown'}</div>
                                    <div className="arch-v2-def-meta">{func?.file || 'unknown'}:{func?.line || 0}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {Array.isArray(codeAnalysis.definitions.classes) && codeAnalysis.definitions.classes.length > 0 ? (
                            <div className="arch-v2-defs-col">
                              <div className="arch-v2-defs-coltitle">Classes ({codeAnalysis.definitions.classes.length})</div>
                              <div className="arch-v2-defs-list">
                                {codeAnalysis.definitions.classes.slice(0, 6).map((cls) => (
                                  <div key={`${cls?.file || 'unknown'}:${cls?.line || 0}:${cls?.name || 'Unknown'}`} className="arch-v2-def">
                                    <div className="arch-v2-def-name">{cls?.name || 'Unknown'}</div>
                                    <div className="arch-v2-def-meta">{cls?.file || 'unknown'}:{cls?.line || 0}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="arch-v2-insight-muted">Run repository analysis to populate code insights.</div>
                )}
              </div>
            </details>
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

            <details className="arch-v2-insight" open style={{ marginTop: 16 }}>
              <summary className="arch-v2-insight-summary">Insights</summary>
              <div className="arch-v2-insight-body">
                <div className="arch-v2-insight-title">{modeInsight.title}</div>
                <div className="arch-v2-insight-desc">{modeInsight.description}</div>
                <ul className="arch-v2-insight-list">
                  {modeInsight.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </details>

            <details className="arch-v2-insight" open={viewMode === 'system'}>
              <summary className="arch-v2-insight-summary">Architecture Analysis</summary>
              <div className="arch-v2-insight-body">
                {isArchitectureLoading ? (
                  <div className="arch-v2-insight-muted">Generating architecture analysis…</div>
                ) : architectureError ? (
                  <div className="arch-v2-insight-muted">Failed to generate analysis: {architectureError}</div>
                ) : architectureAnalysis ? (
                  <div className="arch-v2-insight-scroll">
                    <AnalysisText text={architectureAnalysis} maxSections={6} />
                  </div>
                ) : (
                  <div className="arch-v2-insight-muted">Architecture analysis will appear here once generated.</div>
                )}
              </div>
            </details>

            <details className="arch-v2-insight" open={viewMode === 'system' || viewMode === 'modules'}>
              <summary className="arch-v2-insight-summary">Code Analysis Insights</summary>
              <div className="arch-v2-insight-body">
                {isCodeAnalysisLoading ? (
                  <div className="arch-v2-insight-muted">Analyzing code structure…</div>
                ) : codeAnalysis?.summary ? (
                  <>
                    {Array.isArray(codeAnalysis.summary.patterns) && codeAnalysis.summary.patterns.length > 0 ? (
                      <div className="arch-v2-pill-row">
                        {codeAnalysis.summary.patterns.slice(0, 8).map((pattern) => (
                          <span key={pattern} className="arch-v2-pill">{pattern}</span>
                        ))}
                      </div>
                    ) : null}

                    <div className="arch-v2-mini-grid">
                      <div><strong>{codeAnalysis.summary.totalFiles || 0}</strong><span>files</span></div>
                      <div><strong>{codeAnalysis.summary.totalLines || 0}</strong><span>lines</span></div>
                      <div><strong>{codeAnalysis.definitions?.functions?.length || 0}</strong><span>functions</span></div>
                      <div><strong>{codeAnalysis.definitions?.classes?.length || 0}</strong><span>classes</span></div>
                    </div>

                    {codeAnalysis.summary.languages && Object.keys(codeAnalysis.summary.languages).length > 0 ? (
                      <div className="arch-v2-language-list">
                        {Object.entries(codeAnalysis.summary.languages).slice(0, 6).map(([lang, pct]) => (
                          <div key={lang} className="arch-v2-language-item">
                            <span>{lang}</span>
                            <em>{pct}%</em>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {codeAnalysis.definitions && (codeAnalysis.definitions.functions?.length || codeAnalysis.definitions.classes?.length) ? (
                      <div className="arch-v2-defs">
                        <div className="arch-v2-defs-title">Key Code Definitions</div>
                        <div className="arch-v2-defs-grid">
                          {Array.isArray(codeAnalysis.definitions.functions) && codeAnalysis.definitions.functions.length > 0 ? (
                            <div className="arch-v2-defs-col">
                              <div className="arch-v2-defs-coltitle">Functions ({codeAnalysis.definitions.functions.length})</div>
                              <div className="arch-v2-defs-list">
                                {codeAnalysis.definitions.functions.slice(0, 6).map((func) => (
                                  <div key={`${func?.file || 'unknown'}:${func?.line || 0}:${func?.name || 'Unknown'}`} className="arch-v2-def">
                                    <div className="arch-v2-def-name">{func?.name || 'Unknown'}</div>
                                    <div className="arch-v2-def-meta">{func?.file || 'unknown'}:{func?.line || 0}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {Array.isArray(codeAnalysis.definitions.classes) && codeAnalysis.definitions.classes.length > 0 ? (
                            <div className="arch-v2-defs-col">
                              <div className="arch-v2-defs-coltitle">Classes ({codeAnalysis.definitions.classes.length})</div>
                              <div className="arch-v2-defs-list">
                                {codeAnalysis.definitions.classes.slice(0, 6).map((cls) => (
                                  <div key={`${cls?.file || 'unknown'}:${cls?.line || 0}:${cls?.name || 'Unknown'}`} className="arch-v2-def">
                                    <div className="arch-v2-def-name">{cls?.name || 'Unknown'}</div>
                                    <div className="arch-v2-def-meta">{cls?.file || 'unknown'}:{cls?.line || 0}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="arch-v2-insight-muted">Run repository analysis to populate code insights.</div>
                )}
              </div>
            </details>

            {importantFiles.length > 0 ? (
              <details className="arch-v2-insight" open={viewMode === 'modules'}>
                <summary className="arch-v2-insight-summary">Key Components</summary>
                <div className="arch-v2-insight-body">
                  <div className="arch-v2-insight-scroll">
                    <ul className="arch-v2-keyfiles">
                      {importantFiles.slice(0, 18).map((file) => (
                        <li key={file.path || file.name}>
                          <span className="arch-v2-keyfiles-path">{file?.path || 'Unknown file'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </details>
            ) : null}

            {viewMode === 'techstack' && techStack && Object.keys(techStack).length > 0 ? (
              <details className="arch-v2-insight" open>
                <summary className="arch-v2-insight-summary">Technology Breakdown</summary>
                <div className="arch-v2-insight-body">
                  <div className="arch-v2-tech-grid">
                    {Object.entries(techStack)
                      .filter(([, list]) => Array.isArray(list) && list.length > 0)
                      .map(([key, list]) => (
                        <div key={key} className="arch-v2-tech-card">
                          <strong>{key}</strong>
                          <span>{list.length}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </details>
            ) : null}
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
