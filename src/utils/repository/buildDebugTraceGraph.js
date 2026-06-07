const MAX_DEBUG_GRAPH_NODES = 25;
const MAX_DEBUG_GRAPH_EDGES = 35;
const ERROR_NODE_ID = 'debug:error';

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeNodeId(value) {
  return `debug:${String(value || '')
    .replace(/^debug:/, '')
    .replace(/[^a-zA-Z0-9_.:/@-]/g, '-')}`;
}

function getFileLabel(path) {
  return String(path || '').split('/').pop() || path || 'unknown';
}

function getReasonLabel(reason) {
  const value = String(reason || '').trim();
  if (!value) return 'related';
  return value.split(' · ')[0].replace(/^probable\s+/i, '');
}

function getNodeType(file, rootCausePath) {
  if (file.path === rootCausePath) return 'root-cause';
  if (file.direction === 'mentioned') return 'stack';
  if (file.direction === 'upstream') return 'upstream';
  if (file.direction === 'downstream') return 'downstream';
  if (file.direction === 'same-module') return 'same-module';
  return 'related';
}

function getNodePosition(type, index, total) {
  const column = {
    error: 0,
    stack: 1,
    'root-cause': 2,
    upstream: 2,
    downstream: 3,
    'same-module': 3,
    related: 3,
  }[type] ?? 3;
  const x = column * 300;
  const rowHeight = type === 'stack' ? 132 : 118;
  const offset = Math.max(0, (Math.min(total, 8) - 1) * rowHeight * 0.18);
  const y = index * rowHeight - offset;

  return { x, y };
}

function makeFileNode(file, index, total, rootCausePath) {
  const type = getNodeType(file, rootCausePath);
  return {
    id: sanitizeNodeId(file.path),
    type: 'debugTrace',
    position: getNodePosition(type, index, total),
    data: {
      label: getFileLabel(file.path),
      path: file.path,
      type,
      reason: file.reason || file.relationship || 'Related debug trace file',
      confidence: file.confidence || 'medium',
      depth: file.depth,
      direction: file.direction || 'related',
    },
  };
}

function makeEdge(source, target, label, kind = 'related') {
  return {
    id: `debug-edge:${source}->${target}:${kind}`.replace(/\s+/g, '-'),
    source,
    target,
    label,
    animated: false,
    className: `ca-debug-flow-edge ca-debug-flow-edge--${kind}`,
    style: {
      strokeWidth: kind === 'root-cause' ? 2.4 : 1.8,
    },
    labelStyle: {
      fill: 'rgba(255,255,255,0.72)',
      fontSize: 11,
      fontWeight: 650,
    },
    labelBgStyle: {
      fill: 'rgba(10,10,10,0.78)',
      stroke: 'rgba(255,255,255,0.08)',
    },
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 6,
  };
}

function addEdge(edges, edgeKeys, edge) {
  if (!edge?.source || !edge?.target || edge.source === edge.target) return;
  if (edges.length >= MAX_DEBUG_GRAPH_EDGES) return;
  const key = `${edge.source}->${edge.target}`;
  if (edgeKeys.has(key)) return;
  edgeKeys.add(key);
  edges.push(edge);
}

function makeErrorNode(context) {
  const errorSummary = context?.errorSummary || {};
  const type = errorSummary.type || 'Unknown error';
  const message = errorSummary.message || 'Paste an error to build a trace.';

  return {
    id: ERROR_NODE_ID,
    type: 'debugTrace',
    position: { x: 0, y: 0 },
    data: {
      label: type,
      path: message,
      type: 'error',
      reason: 'Parsed error summary',
      confidence: context?.confidence || 'none',
    },
  };
}

function selectGraphFiles(context) {
  const trace = context?.dependencyTrace || {};
  const rootCausePath = safeArray(context?.rootCauseCandidates)[0]?.path || '';
  const seeds = safeArray(trace.seedFiles);
  const related = safeArray(trace.relatedFiles);
  const selected = [];
  const seen = new Set();

  const take = (items, count) => {
    safeArray(items).slice(0, count).forEach(item => {
      if (!item?.path || seen.has(item.path) || selected.length >= MAX_DEBUG_GRAPH_NODES - 1) return;
      seen.add(item.path);
      selected.push(item);
    });
  };

  take(seeds, 8);
  take(related.filter(file => file.path === rootCausePath), 1);
  take(related.filter(file => file.direction === 'upstream'), 8);
  take(related.filter(file => file.direction === 'downstream'), 8);
  take(related.filter(file => file.direction === 'same-module'), 4);
  take(related, MAX_DEBUG_GRAPH_NODES - 1);

  return selected;
}

function buildTraceEdges(context, graphFiles) {
  const trace = context?.dependencyTrace || {};
  const rootCausePath = safeArray(context?.rootCauseCandidates)[0]?.path || '';
  const nodeIds = new Set([ERROR_NODE_ID, ...graphFiles.map(file => sanitizeNodeId(file.path))]);
  const fileDirections = new Map(graphFiles.map(file => [file.path, file.direction || 'related']));
  const seedFiles = graphFiles.filter(file => file.direction === 'mentioned');
  const edges = [];
  const edgeKeys = new Set();

  seedFiles.forEach(file => {
    addEdge(edges, edgeKeys, makeEdge(ERROR_NODE_ID, sanitizeNodeId(file.path), 'stack frame', file.path === rootCausePath ? 'root-cause' : 'stack'));
  });

  safeArray(trace.tracePaths).forEach(tracePath => {
    const source = sanitizeNodeId(tracePath.from);
    const target = sanitizeNodeId(tracePath.to);
    if (!nodeIds.has(source) || !nodeIds.has(target)) return;
    const targetPath = String(tracePath.to || '');
    const kind = targetPath === rootCausePath
      ? 'root-cause'
      : (fileDirections.get(targetPath) || tracePath.direction || 'related');
    addEdge(edges, edgeKeys, makeEdge(source, target, getReasonLabel(tracePath.reason || tracePath.relationship), kind));
  });

  graphFiles
    .filter(file => file.direction !== 'mentioned')
    .forEach(file => {
      if (nodeIds.size === 0) return;
      const sourcePath = file.sourcePath || seedFiles[0]?.path;
      const source = sanitizeNodeId(sourcePath);
      const target = sanitizeNodeId(file.path);
      if (!nodeIds.has(source) || !nodeIds.has(target)) return;
      const kind = file.path === rootCausePath ? 'root-cause' : file.direction || 'related';
      addEdge(edges, edgeKeys, makeEdge(source, target, getReasonLabel(file.reason || file.relationship), kind));
    });

  return edges;
}

function rebalanceNodePositions(nodes) {
  const byType = new Map();
  nodes.forEach(node => {
    const type = node.data?.type || 'related';
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type).push(node);
  });

  byType.forEach((items, type) => {
    items.forEach((node, index) => {
      node.position = getNodePosition(type, index, items.length);
    });
  });

  return nodes;
}

export function buildDebugTraceGraph(context = {}) {
  const trace = context?.dependencyTrace || {};

  if (!context?.hasInput) {
    return {
      available: false,
      reason: 'Paste an error to build a deterministic trace graph.',
      nodes: [],
      edges: [],
      summary: { nodeCount: 0, edgeCount: 0, isLimited: false, mode: 'deterministic' },
    };
  }

  if (!trace.available) {
    return {
      available: false,
      reason: trace.reason || 'Dependency graph unavailable. Showing parser/list view only.',
      nodes: [],
      edges: [],
      summary: { nodeCount: 0, edgeCount: 0, isLimited: false, mode: 'deterministic' },
    };
  }

  const graphFiles = selectGraphFiles(context);
  if (graphFiles.length === 0) {
    return {
      available: false,
      reason: 'No matched files are available for a trace graph yet.',
      nodes: [],
      edges: [],
      summary: { nodeCount: 0, edgeCount: 0, isLimited: false, mode: 'deterministic' },
    };
  }

  const rootCausePath = safeArray(context.rootCauseCandidates)[0]?.path || '';
  const nodes = rebalanceNodePositions([
    makeErrorNode(context),
    ...graphFiles.map((file, index) => makeFileNode(file, index, graphFiles.length, rootCausePath)),
  ]).slice(0, MAX_DEBUG_GRAPH_NODES);
  const nodeIds = new Set(nodes.map(node => node.id));
  const edges = buildTraceEdges(context, graphFiles)
    .filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .slice(0, MAX_DEBUG_GRAPH_EDGES);

  return {
    available: true,
    reason: 'Deterministic trace graph built from parsed stack frames and dependency context.',
    nodes,
    edges,
    summary: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      isLimited: Boolean(trace.isLimited || safeArray(trace.relatedFiles).length > graphFiles.length || safeArray(trace.tracePaths).length > edges.length),
      mode: 'deterministic',
    },
  };
}

export default buildDebugTraceGraph;
