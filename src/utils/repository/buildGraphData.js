/**
 * Build Graph Data
 * Builds ReactFlow-compatible graph data from repository structure and
 * graph-backed dependency analysis.
 */

const DEFAULT_OVERVIEW_MAX_NODES = 42;
const DEFAULT_OVERVIEW_MAX_EDGES = 110;
const DEFAULT_FOCUSED_MAX_NODES = 36;
const DEFAULT_FOCUSED_MAX_EDGES = 90;
const DEFAULT_FILE_INDEX_LIMIT = 260;

const LAYER_ORDER = ['entry', 'api', 'service', 'data', 'utility', 'ui', 'package', 'config', 'documentation', 'file'];

const LAYER_COLORS = {
  entry: '#6ea8fe',
  api: '#8dd7bf',
  service: '#f2c14e',
  data: '#ef8354',
  utility: '#b8b8ff',
  ui: '#9ad1d4',
  package: '#d0d0d0',
  config: '#c9ada7',
  documentation: '#a5a5a5',
  file: '#8a8a8a',
  folder: '#ffffff'
};

function normalizePath(file) {
  if (typeof file === 'string') return file;
  if (file && typeof file.path === 'string') return file.path;
  return '';
}

export function normalizeRepositoryFiles(files) {
  if (!Array.isArray(files)) return [];

  return Array.from(new Set(
    files
      .map(normalizePath)
      .map(path => path.trim())
      .filter(Boolean)
  ));
}

function getFileName(path) {
  return String(path || '').split('/').pop() || path || 'unknown';
}

function getExtension(path) {
  const match = String(path || '').toLowerCase().match(/\.[^./]+$/);
  return match ? match[0].slice(1) : '';
}

function classifyPath(path) {
  const lower = String(path || '').toLowerCase();
  const extension = getExtension(path);

  if (/(\b|\/)(index|main|app|server|manage|cli)\.(js|jsx|ts|tsx|py)$/i.test(path)) return 'entry';
  if (lower.includes('/api/') || lower.includes('/routes/') || lower.includes('/controllers/')) return 'api';
  if (lower.includes('/services/') || lower.includes('/lib/')) return 'service';
  if (lower.includes('/models/') || lower.includes('/schema') || lower.includes('/database') || /(^|\/)models\.py$/i.test(path)) return 'data';
  if (lower.includes('/utils/') || lower.includes('/helpers/') || lower.includes('/hooks/')) return 'utility';
  if (lower.includes('/components/') || lower.includes('/pages/') || /\.(jsx|tsx)$/i.test(path)) return 'ui';
  if (/(^|\/)(__init__)\.py$/i.test(path)) return 'package';
  if (['json', 'yml', 'yaml', 'toml', 'ini', 'env', 'lock'].includes(extension)) return 'config';
  if (['md', 'mdx', 'txt'].includes(extension)) return 'documentation';

  return 'file';
}

function classifyLegacyNodeType(path) {
  const lower = String(path || '').toLowerCase();
  const extension = getExtension(path);

  if (lower.includes('components')) return 'component';
  if (lower.includes('pages')) return 'page';
  if (lower.includes('services') || lower.includes('api')) return 'service';
  if (lower.includes('utils') || lower.includes('helpers')) return 'utility';
  if (lower.includes('hooks')) return 'hook';
  if (lower.includes('context')) return 'context';
  if (['css', 'scss', 'sass'].includes(extension)) return 'style';
  if (extension === 'json') return 'config';
  if (extension === 'md') return 'documentation';

  return 'file';
}

function getLayerColor(layer) {
  return LAYER_COLORS[layer] || LAYER_COLORS.file;
}

function getNodeBaseStyle(layer, isSelected = false, isFallback = false) {
  const color = getLayerColor(layer);

  return {
    width: 156,
    minHeight: 38,
    padding: '7px 9px',
    background: isFallback ? '#141414' : '#101010',
    border: `${isSelected ? 2 : 1}px solid ${isSelected ? '#ffffff' : color}`,
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 11.5,
    lineHeight: 1.25,
    textAlign: 'left',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    boxShadow: isSelected ? `0 0 0 2px ${color}33` : 'none'
  };
}

function getEdgeBaseStyle(edge) {
  const strength = Number(edge?.strength || edge?.weight || 1);
  const width = Math.min(2.4, Math.max(1, strength * 0.75));

  return {
    stroke: '#6f6f6f',
    strokeWidth: width,
    opacity: 0.46
  };
}

function layerRank(layer) {
  const index = LAYER_ORDER.indexOf(layer);
  return index === -1 ? LAYER_ORDER.length : index;
}

function getViewModeScore(node, viewMode) {
  const imports = Number(node.importCount || 0);
  const dependents = Number(node.dependentCount || 0);
  const importance = Number(node.importance || 0);
  const degree = imports + dependents;
  let score = importance + dependents * 10 + imports * 4 + degree;

  if (node.layer === 'entry') score += 120;
  if (node.layer === 'api') score += 80;
  if (node.layer === 'service') score += 70;
  if (node.layer === 'data') score += 65;
  if (node.layer === 'utility') score += 35;

  if (viewMode === 'entry') {
    score = (node.layer === 'entry' ? 220 : 0) +
      (node.layer === 'api' ? 120 : 0) +
      (node.layer === 'service' ? 90 : 0) +
      importance + degree * 5;
  }

  if (viewMode === 'high-coupling') {
    score = degree * 30 + dependents * 20 + imports * 8 + importance;
  }

  return score;
}

function compareGraphNodes(a, b, viewMode) {
  const scoreDelta = getViewModeScore(b, viewMode) - getViewModeScore(a, viewMode);
  if (scoreDelta !== 0) return scoreDelta;

  const layerDelta = layerRank(a.layer) - layerRank(b.layer);
  if (layerDelta !== 0) return layerDelta;

  return String(a.path).localeCompare(String(b.path));
}

function graphNodeFromDependencyNode(node) {
  const path = node.path || String(node.id || '').replace(/^file:/, '');
  const layer = node.layer || classifyPath(path);
  const id = node.id || `file:${path}`;

  return {
    id,
    path,
    name: node.name || getFileName(path),
    layer,
    type: node.type || classifyPath(path),
    language: node.language || getExtension(path) || 'unknown',
    importCount: Number(node.importCount || 0),
    dependentCount: Number(node.dependentCount || 0),
    importance: Number(node.importance || 0),
    isHub: Boolean(node.isHub)
  };
}

function graphEdgeFromDependencyEdge(edge, nodeById, nodeByPath) {
  const sourceId = nodeById.has(edge?.source)
    ? edge.source
    : nodeByPath.get(String(edge?.source || ''))?.id;
  const targetId = nodeById.has(edge?.target)
    ? edge.target
    : nodeByPath.get(String(edge?.target || ''))?.id;

  if (!sourceId || !targetId || !nodeById.has(sourceId) || !nodeById.has(targetId)) {
    return null;
  }

  const sourceNode = nodeById.get(sourceId);
  const targetNode = nodeById.get(targetId);
  const importTypes = Array.isArray(edge.importTypes)
    ? edge.importTypes
    : [edge.importType].filter(Boolean);

  return {
    id: edge.id || `edge:${sourceNode.path}->${targetNode.path}`,
    source: sourceId,
    target: targetId,
    sourcePath: sourceNode.path,
    targetPath: targetNode.path,
    strength: Number(edge.strength || edge.weight || 1),
    importType: edge.importType || importTypes[0] || 'import',
    importTypes,
    statements: Array.isArray(edge.statements) ? edge.statements : [],
    relationship: edge.relationship || 'imports'
  };
}

function buildEdgeIndexes(edges) {
  const outgoing = new Map();
  const incoming = new Map();

  edges.forEach(edge => {
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    if (!incoming.has(edge.target)) incoming.set(edge.target, []);
    outgoing.get(edge.source).push(edge);
    incoming.get(edge.target).push(edge);
  });

  return { outgoing, incoming };
}

function getDirectionalEdges(nodeId, indexes, direction) {
  if (direction === 'imports') return indexes.outgoing.get(nodeId) || [];
  if (direction === 'imported-by') return indexes.incoming.get(nodeId) || [];

  return [
    ...(indexes.outgoing.get(nodeId) || []),
    ...(indexes.incoming.get(nodeId) || [])
  ];
}

function getOtherNodeId(edge, nodeId, direction) {
  if (direction === 'imports') return edge.target;
  if (direction === 'imported-by') return edge.source;
  return edge.source === nodeId ? edge.target : edge.source;
}

function collectNeighborhood(seedIds, indexes, direction, maxDepth = 2) {
  const nodeIds = new Set(seedIds);
  const edgeIds = new Set();
  const queue = seedIds.map(id => ({ id, depth: 0 }));
  const visited = new Set(seedIds);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.depth >= maxDepth) continue;

    getDirectionalEdges(current.id, indexes, direction).forEach(edge => {
      const nextId = getOtherNodeId(edge, current.id, direction);
      if (!nextId) return;

      nodeIds.add(nextId);
      edgeIds.add(edge.id);

      if (!visited.has(nextId)) {
        visited.add(nextId);
        queue.push({ id: nextId, depth: current.depth + 1 });
      }
    });
  }

  return { nodeIds, edgeIds };
}

function matchesSearch(node, query) {
  if (!query) return true;
  const haystack = [
    node.path,
    node.name,
    node.layer,
    node.language,
    String(node.path || '').split('/').slice(0, -1).join('/')
  ].join(' ').toLowerCase();

  return haystack.includes(query);
}

function limitVisibleNodes(candidateIds, nodeById, viewMode, maxNodes, focusNodeId, queryMatches = new Set()) {
  return Array.from(candidateIds)
    .filter(id => nodeById.has(id))
    .sort((a, b) => {
      if (a === focusNodeId) return -1;
      if (b === focusNodeId) return 1;
      if (queryMatches.has(a) && !queryMatches.has(b)) return -1;
      if (!queryMatches.has(a) && queryMatches.has(b)) return 1;
      return compareGraphNodes(nodeById.get(a), nodeById.get(b), viewMode);
    })
    .slice(0, maxNodes);
}

function getVisibleGraphNodeIds(nodes, edges, indexes, options) {
  const {
    maxNodes,
    searchQuery,
    viewMode,
    direction,
    selectedPath,
    nodeByPath
  } = options;
  const query = String(searchQuery || '').trim().toLowerCase();
  const selectedNodeId = selectedPath ? nodeByPath.get(selectedPath)?.id : null;
  const candidateIds = new Set();
  const queryMatches = new Set();
  let focusedEdgeIds = null;

  if (selectedNodeId) {
    const neighborhood = collectNeighborhood([selectedNodeId], indexes, direction, 2);
    focusedEdgeIds = neighborhood.edgeIds;
    neighborhood.nodeIds.forEach(id => candidateIds.add(id));
  }

  if (query) {
    nodes
      .filter(node => matchesSearch(node, query))
      .sort((a, b) => compareGraphNodes(a, b, viewMode))
      .slice(0, maxNodes)
      .forEach(node => {
        queryMatches.add(node.id);
        candidateIds.add(node.id);
        collectNeighborhood([node.id], indexes, 'both', 1).nodeIds.forEach(id => candidateIds.add(id));
      });
  }

  if (candidateIds.size === 0 && !query) {
    const sortedNodes = [...nodes].sort((a, b) => compareGraphNodes(a, b, viewMode));

    sortedNodes.slice(0, maxNodes).forEach(node => candidateIds.add(node.id));

    if (viewMode === 'entry') {
      sortedNodes
        .filter(node => ['entry', 'api', 'service'].includes(node.layer))
        .slice(0, maxNodes)
        .forEach(node => candidateIds.add(node.id));
    }
  }

  return {
    visibleIds: new Set(limitVisibleNodes(candidateIds, new Map(nodes.map(node => [node.id, node])), viewMode, maxNodes, selectedNodeId, queryMatches)),
    selectedNodeId,
    focusedEdgeIds
  };
}

function buildFallbackSearchNodes(repositoryFiles, graphNodes, searchQuery, maxCount) {
  const query = String(searchQuery || '').trim().toLowerCase();
  if (!query || maxCount <= 0) return [];

  const graphPaths = new Set(graphNodes.map(node => node.path));

  return repositoryFiles
    .filter(path => !graphPaths.has(path) && path.toLowerCase().includes(query))
    .slice(0, maxCount)
    .map(path => ({
      id: `fallback:${path}`,
      path,
      name: getFileName(path),
      layer: classifyPath(path),
      language: getExtension(path) || 'file',
      importCount: 0,
      dependentCount: 0,
      importance: 0,
      isFallback: true
    }));
}

function makeFileIndexItem(path, graphNode = null) {
  const layer = graphNode?.layer || classifyPath(path);
  const language = graphNode?.language || getExtension(path) || 'file';

  return {
    id: graphNode?.id || `fallback:${path}`,
    path,
    name: graphNode?.name || getFileName(path),
    layer,
    language,
    isGraphBacked: Boolean(graphNode),
    isFallbackOnly: !graphNode,
    importCount: Number(graphNode?.importCount || 0),
    dependentCount: Number(graphNode?.dependentCount || 0),
    importance: Number(graphNode?.importance || 0),
    score: Number(graphNode?.importance || 0) +
      Number(graphNode?.dependentCount || 0) * 10 +
      Number(graphNode?.importCount || 0) * 4 +
      (graphNode?.layer === 'entry' ? 120 : 0)
  };
}

function matchesFileIndex(item, query) {
  if (!query) return true;

  return [
    item.path,
    item.name,
    item.layer,
    item.language,
    String(item.path || '').split('/').slice(0, -1).join('/')
  ].join(' ').toLowerCase().includes(query);
}

function buildFileIndex(repositoryFiles, graphNodes, searchQuery = '', limit = DEFAULT_FILE_INDEX_LIMIT) {
  const query = String(searchQuery || '').trim().toLowerCase();
  const graphNodeByPath = new Map(graphNodes.map(node => [node.path, node]));
  const allItems = repositoryFiles.map(path => makeFileIndexItem(path, graphNodeByPath.get(path)));
  const matchingItems = allItems.filter(item => matchesFileIndex(item, query));
  const sortedItems = matchingItems.sort((a, b) => {
    if (a.isGraphBacked !== b.isGraphBacked) {
      return a.isGraphBacked ? -1 : 1;
    }

    if (a.isGraphBacked && b.isGraphBacked) {
      const scoreDelta = b.score - a.score;
      if (scoreDelta !== 0) return scoreDelta;
    }

    return a.path.localeCompare(b.path);
  });

  return {
    items: sortedItems.slice(0, limit),
    totalMatches: matchingItems.length,
    totalFiles: allItems.length,
    graphBackedMatches: matchingItems.filter(item => item.isGraphBacked).length,
    fallbackMatches: matchingItems.filter(item => item.isFallbackOnly).length,
    isLimited: sortedItems.length > limit
  };
}

function layoutGroup(nodeIds, startX, startY, options = {}) {
  const maxRows = options.maxRows || 6;
  const columnGap = options.columnGap || 182;
  const rowGap = options.rowGap || 70;

  return nodeIds.map((id, index) => ({
    id,
    position: {
      x: startX + Math.floor(index / maxRows) * columnGap,
      y: startY + (index % maxRows) * rowGap
    }
  }));
}

function positionOverviewNodes(nodes) {
  const positioned = new Map();
  const grouped = new Map();
  const totalNodes = nodes.length;
  const maxRows = totalNodes >= 38 ? 8 : totalNodes >= 28 ? 7 : 6;
  const rowGap = totalNodes >= 38 ? 104 : 112;
  const columnGap = 188;
  const laneGap = 46;
  let laneX = 0;

  nodes
    .sort((a, b) => layerRank(a.layer) - layerRank(b.layer) || String(a.path).localeCompare(String(b.path)))
    .forEach(node => {
      if (!grouped.has(node.layer)) grouped.set(node.layer, []);
      grouped.get(node.layer).push(node);
    });

  Array.from(grouped.entries())
    .sort(([a], [b]) => layerRank(a) - layerRank(b))
    .forEach(([, layerNodes]) => {
      const visibleRows = Math.min(maxRows, layerNodes.length);
      const yOffset = Math.max(0, Math.floor((maxRows - visibleRows) / 2) * rowGap);
      const layerColumns = Math.max(1, Math.ceil(layerNodes.length / maxRows));

      layerNodes.forEach((node, index) => {
        positioned.set(node.id, {
          x: laneX + Math.floor(index / maxRows) * columnGap,
          y: yOffset + (index % maxRows) * rowGap
        });
      });

      laneX += layerColumns * columnGap + laneGap;
    });

  return positioned;
}

function positionGraphNodes(nodes, edges, selectedNodeId, direction) {
  const outgoingTargets = new Set(edges.filter(edge => edge.source === selectedNodeId).map(edge => edge.target));
  const incomingSources = new Set(edges.filter(edge => edge.target === selectedNodeId).map(edge => edge.source));
  const positioned = new Map();

  if (selectedNodeId) {
    const incomingIds = nodes.filter(node => incomingSources.has(node.id)).map(node => node.id);
    const outgoingIds = nodes.filter(node => outgoingTargets.has(node.id)).map(node => node.id);
    const relatedIds = nodes.filter(node => (
      node.id !== selectedNodeId &&
      !incomingSources.has(node.id) &&
      !outgoingTargets.has(node.id)
    )).map(node => node.id);

    layoutGroup(incomingIds, 0, 0).forEach(item => positioned.set(item.id, item.position));
    positioned.set(selectedNodeId, { x: 410, y: 170 });
    layoutGroup(outgoingIds, 700, 0).forEach(item => positioned.set(item.id, item.position));
    layoutGroup(relatedIds, 320, 380, { maxRows: 3 }).forEach(item => positioned.set(item.id, item.position));
  }

  if (positioned.size !== nodes.length) {
    const overviewPositions = positionOverviewNodes(nodes.filter(node => !positioned.has(node.id)));
    overviewPositions.forEach((position, id) => positioned.set(id, position));
  }

  return positioned;
}

function toReactFlowNode(node, position, selectedNodeId, isFallback = false) {
  const isSelected = node.id === selectedNodeId;
  const baseStyle = getNodeBaseStyle(node.layer, isSelected, isFallback);

  return {
    id: node.id,
    data: {
      label: node.name,
      path: node.path,
      layer: node.layer,
      type: node.layer,
      language: node.language,
      importCount: node.importCount || 0,
      dependentCount: node.dependentCount || 0,
      importance: node.importance || 0,
      color: getLayerColor(node.layer),
      baseStyle
    },
    position,
    style: baseStyle
  };
}

function toReactFlowEdge(edge) {
  const baseStyle = getEdgeBaseStyle(edge);

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: false,
    style: baseStyle,
    data: {
      sourcePath: edge.sourcePath,
      targetPath: edge.targetPath,
      importType: edge.importType,
      importTypes: edge.importTypes,
      statements: edge.statements,
      relationship: edge.relationship,
      baseStyle
    }
  };
}

function buildStats({
  repoData,
  repositoryFiles,
  dependencyGraph,
  sourceMode,
  viewMode,
  nodes,
  edges,
  visibleNodes,
  visibleEdges,
  searchQuery,
  selectedPath
}) {
  const totalRepoFiles = Number(repoData?.fileCount || repositoryFiles.length || 0);
  const graphFileCount = dependencyGraph?.nodes?.length || 0;
  const graphEdgeCount = dependencyGraph?.edges?.length || 0;
  const coverageRatio = dependencyGraph?.metadata?.coverageRatio ??
    (totalRepoFiles > 0 ? graphFileCount / totalRepoFiles : 0);

  return {
    sourceMode,
    viewMode,
    totalRepoFiles,
    graphFileCount,
    fallbackFileCount: Math.max(totalRepoFiles - graphFileCount, 0),
    graphEdgeCount,
    shownNodeCount: visibleNodes.length,
    shownEdgeCount: visibleEdges.length,
    totalCandidateNodes: nodes.length,
    totalCandidateEdges: edges.length,
    coverageRatio: Number(coverageRatio || 0),
    coveragePercent: Math.round(Number(coverageRatio || 0) * 100),
    isLimited: visibleNodes.length < nodes.length || visibleEdges.length < edges.length,
    hasSearch: Boolean(searchQuery),
    selectedPath,
    analysisTime: repoData?.analysisTiming?.display || null,
    supportedExtensions: dependencyGraph?.metadata?.supportedExtensions || []
  };
}

function getSelectedNodeDetails(selectedPath, nodes, visibleEdges, allEdges = visibleEdges, fileIndexItems = []) {
  if (!selectedPath) return null;

  const selected = nodes.find(node => node.path === selectedPath);
  const fallbackSelected = fileIndexItems.find(item => item.path === selectedPath);
  if (!selected && !fallbackSelected) return null;
  const selectedDetails = selected || {
    id: fallbackSelected.id,
    path: fallbackSelected.path,
    name: fallbackSelected.name,
    layer: fallbackSelected.layer,
    language: fallbackSelected.language,
    importCount: 0,
    dependentCount: 0,
    importance: 0,
    isFallback: true
  };

  const directImportEdges = allEdges
    .filter(edge => edge.sourcePath === selectedPath)
    .sort((a, b) => Number(b.strength || 0) - Number(a.strength || 0));
  const directDependentEdges = allEdges
    .filter(edge => edge.targetPath === selectedPath)
    .sort((a, b) => Number(b.strength || 0) - Number(a.strength || 0));
  const directImports = directImportEdges
    .map(edge => edge.targetPath);
  const directDependents = directDependentEdges
    .map(edge => edge.sourcePath);

  return {
    ...selectedDetails,
    isGraphBacked: Boolean(selected),
    isFallbackOnly: !selected,
    directImports,
    directDependents,
    visibleDirectImports: visibleEdges
      .filter(edge => edge.sourcePath === selectedPath)
      .map(edge => edge.targetPath),
    visibleDirectDependents: visibleEdges
      .filter(edge => edge.targetPath === selectedPath)
      .map(edge => edge.sourcePath),
    edgeEvidence: [...directImportEdges, ...directDependentEdges]
      .slice(0, 8)
      .map(edge => ({
        sourcePath: edge.sourcePath,
        targetPath: edge.targetPath,
        importType: edge.importType,
        importTypes: edge.importTypes,
        statements: edge.statements || []
      }))
  };
}

function buildDependencyReactFlowGraph(repoData, repositoryFiles, dependencyGraph, options = {}) {
  const viewMode = options.viewMode || 'dependencies';
  const direction = options.direction || 'both';
  const searchQuery = options.searchQuery || '';
  const selectedPath = options.selectedPath || '';
  const isFocused = Boolean(selectedPath || String(searchQuery || '').trim());
  const maxNodes = options.maxNodes || (isFocused ? DEFAULT_FOCUSED_MAX_NODES : DEFAULT_OVERVIEW_MAX_NODES);
  const maxEdges = options.maxEdges || (isFocused ? DEFAULT_FOCUSED_MAX_EDGES : DEFAULT_OVERVIEW_MAX_EDGES);
  const nodes = (dependencyGraph.nodes || [])
    .map(graphNodeFromDependencyNode)
    .filter(node => node.path);
  const fileIndex = buildFileIndex(repositoryFiles, nodes, searchQuery, options.fileIndexLimit || DEFAULT_FILE_INDEX_LIMIT);
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const nodeByPath = new Map(nodes.map(node => [node.path, node]));
  const edges = (dependencyGraph.edges || [])
    .map(edge => graphEdgeFromDependencyEdge(edge, nodeById, nodeByPath))
    .filter(Boolean);
  const indexes = buildEdgeIndexes(edges);
  const { visibleIds, selectedNodeId, focusedEdgeIds } = getVisibleGraphNodeIds(nodes, edges, indexes, {
    maxNodes,
    searchQuery,
    viewMode,
    direction,
    selectedPath,
    nodeByPath
  });
  let visibleNodes = nodes.filter(node => visibleIds.has(node.id));
  let visibleEdges = edges.filter(edge => visibleIds.has(edge.source) && visibleIds.has(edge.target));
  const fallbackSearchNodes = buildFallbackSearchNodes(
    repositoryFiles,
    nodes,
    searchQuery,
    Math.max(0, maxNodes - visibleNodes.length)
  );

  visibleNodes = [...visibleNodes, ...fallbackSearchNodes];
  const effectiveSelectedNodeId = selectedNodeId ||
    fallbackSearchNodes.find(node => node.path === selectedPath)?.id ||
    null;

  if (selectedNodeId && focusedEdgeIds) {
    visibleEdges = visibleEdges.filter(edge => focusedEdgeIds.has(edge.id));
  }

  visibleEdges = visibleEdges
    .sort((a, b) => {
      const aSelected = a.source === effectiveSelectedNodeId || a.target === effectiveSelectedNodeId ? 1 : 0;
      const bSelected = b.source === effectiveSelectedNodeId || b.target === effectiveSelectedNodeId ? 1 : 0;
      if (aSelected !== bSelected) return bSelected - aSelected;
      return Number(b.strength || 0) - Number(a.strength || 0);
    })
    .slice(0, maxEdges);

  const positions = positionGraphNodes(visibleNodes, visibleEdges, effectiveSelectedNodeId, direction);
  const reactNodes = visibleNodes.map(node => toReactFlowNode(
    node,
    positions.get(node.id),
    effectiveSelectedNodeId,
    Boolean(node.isFallback)
  ));
  const reactEdges = visibleEdges.map(toReactFlowEdge);
  const statsNodes = fallbackSearchNodes.length > 0 ? [...nodes, ...fallbackSearchNodes] : nodes;

  return {
    nodes: reactNodes,
    edges: reactEdges,
    stats: buildStats({
      repoData,
      repositoryFiles,
      dependencyGraph,
      sourceMode: 'dependency-graph',
      viewMode,
      nodes: statsNodes,
      edges,
      visibleNodes,
      visibleEdges,
      searchQuery,
      selectedPath
    }),
    fileIndex: fileIndex.items,
    fileIndexMeta: {
      totalFiles: fileIndex.totalFiles,
      totalMatches: fileIndex.totalMatches,
      graphBackedMatches: fileIndex.graphBackedMatches,
      fallbackMatches: fileIndex.fallbackMatches,
      isLimited: fileIndex.isLimited
    },
    visibleSummary: {
      mode: selectedPath ? 'focused' : searchQuery ? 'search' : 'overview',
      title: selectedPath ? 'Focused file neighborhood' : searchQuery ? 'Search-focused graph' : 'High-signal overview',
      description: selectedPath
        ? 'Showing the selected file, direct dependencies, dependents, and one capped transitive hop.'
        : searchQuery
          ? 'Showing graph-backed matches first, with fallback-only files available in the list.'
          : 'Showing the most connected and important graph-backed files.',
      maxNodes,
      maxEdges
    },
    selectedNode: getSelectedNodeDetails(selectedPath, statsNodes, visibleEdges, edges, fileIndex.items),
    legend: Array.from(new Set(visibleNodes.map(node => node.layer)))
      .sort((a, b) => layerRank(a) - layerRank(b))
      .map(layer => ({ key: layer, label: layer, color: getLayerColor(layer) }))
  };
}

function buildFolderGraph(repoData, repositoryFiles, options = {}) {
  const maxNodes = options.maxNodes || DEFAULT_OVERVIEW_MAX_NODES;
  const searchQuery = String(options.searchQuery || '').trim().toLowerCase();
  const selectedPath = options.selectedPath || '';
  const fileIndex = buildFileIndex(repositoryFiles, [], searchQuery, options.fileIndexLimit || DEFAULT_FILE_INDEX_LIMIT);
  const filteredFiles = repositoryFiles
    .filter(path => !searchQuery || path.toLowerCase().includes(searchQuery))
    .slice(0, Math.max(0, maxNodes - 12));
  const folderNames = Array.from(new Set(
    filteredFiles.map(path => path.includes('/') ? path.split('/')[0] : 'root')
  )).slice(0, 12);
  const folderNodes = folderNames.map(folder => ({
    id: `folder:${folder}`,
    path: folder === 'root' ? '(root)' : `${folder}/`,
    name: folder,
    layer: 'folder',
    language: 'folder',
    importCount: 0,
    dependentCount: filteredFiles.filter(path => (folder === 'root' ? !path.includes('/') : path.startsWith(`${folder}/`))).length,
    importance: 0
  }));
  const fileNodes = filteredFiles.map(path => ({
    id: `file:${path}`,
    path,
    name: getFileName(path),
    layer: classifyPath(path),
    language: getExtension(path) || 'file',
    importCount: 0,
    dependentCount: 0,
    importance: 0
  }));
  const allNodes = [...folderNodes, ...fileNodes];
  const allEdges = fileNodes.map(fileNode => {
    const folder = fileNode.path.includes('/') ? fileNode.path.split('/')[0] : 'root';
    return {
      id: `edge:folder:${folder}->${fileNode.id}`,
      source: `folder:${folder}`,
      target: fileNode.id,
      sourcePath: folder,
      targetPath: fileNode.path,
      importType: 'contains',
      importTypes: ['contains'],
      strength: 1,
      relationship: 'contains',
      statements: []
    };
  }).filter(edge => folderNames.includes(edge.source.replace('folder:', '')));
  const visibleNodes = allNodes.slice(0, maxNodes);
  const visibleIds = new Set(visibleNodes.map(node => node.id));
  const visibleEdges = allEdges.filter(edge => visibleIds.has(edge.source) && visibleIds.has(edge.target)).slice(0, options.maxEdges || DEFAULT_OVERVIEW_MAX_EDGES);
  const folderPositions = new Map();

  visibleNodes.forEach((node, index) => {
    const isFolder = node.id.startsWith('folder:');
    folderPositions.set(node.id, {
      x: isFolder ? 0 : 260 + (index % 3) * 220,
      y: isFolder ? index * 90 : Math.floor(index / 3) * 90
    });
  });

  return {
    nodes: visibleNodes.map(node => toReactFlowNode(node, folderPositions.get(node.id), selectedPath && node.path === selectedPath ? node.id : null, true)),
    edges: visibleEdges.map(toReactFlowEdge),
    stats: buildStats({
      repoData,
      repositoryFiles,
      dependencyGraph: repoData?.dependencyGraph || null,
      sourceMode: repoData?.dependencyGraph ? 'folder-view' : 'file-structure-fallback',
      viewMode: 'folders',
      nodes: allNodes,
      edges: allEdges,
      visibleNodes,
      visibleEdges,
      searchQuery,
      selectedPath
    }),
    fileIndex: fileIndex.items,
    fileIndexMeta: {
      totalFiles: fileIndex.totalFiles,
      totalMatches: fileIndex.totalMatches,
      graphBackedMatches: fileIndex.graphBackedMatches,
      fallbackMatches: fileIndex.fallbackMatches,
      isLimited: fileIndex.isLimited
    },
    visibleSummary: {
      mode: 'folders',
      title: 'File-structure fallback',
      description: 'Showing folder containment because graph-backed dependency data is unavailable or folder view is selected.',
      maxNodes,
      maxEdges: options.maxEdges || DEFAULT_OVERVIEW_MAX_EDGES
    },
    selectedNode: getSelectedNodeDetails(selectedPath, visibleNodes, visibleEdges, visibleEdges, fileIndex.items),
    legend: [
      { key: 'folder', label: 'folder', color: getLayerColor('folder') },
      ...Array.from(new Set(visibleNodes.map(node => node.layer).filter(layer => layer !== 'folder')))
        .sort((a, b) => layerRank(a) - layerRank(b))
        .map(layer => ({ key: layer, label: layer, color: getLayerColor(layer) }))
    ]
  };
}

export function buildRepositoryGraphData(repoData, options = {}) {
  const repositoryFiles = normalizeRepositoryFiles(
    Array.isArray(repoData?.fileTree) && repoData.fileTree.length > 0
      ? repoData.fileTree
      : repoData?.fileStructure
  );
  const dependencyGraph = repoData?.dependencyGraph;
  const hasDependencyGraph = dependencyGraph &&
    Array.isArray(dependencyGraph.nodes) &&
    dependencyGraph.nodes.length > 0 &&
    Array.isArray(dependencyGraph.edges);
  const viewMode = options.viewMode || 'dependencies';

  if (hasDependencyGraph && viewMode !== 'folders') {
    return buildDependencyReactFlowGraph(repoData, repositoryFiles, dependencyGraph, options);
  }

  return buildFolderGraph(repoData, repositoryFiles, options);
}

/**
 * Build nodes from file structure
 */
export function buildNodes(fileStructure, dependencies = []) {
  if (!fileStructure || !Array.isArray(fileStructure)) {
    return [];
  }

  const nodes = [];
  const nodeMap = new Map();

  fileStructure.forEach((file, index) => {
    const path = normalizePath(file);
    if (!path) return;

    const name = getFileName(path);
    const type = classifyLegacyNodeType(path);
    const nodeId = `node-${index}`;

    nodes.push({
      id: nodeId,
      data: {
        label: name,
        path,
        type,
        size: file.size || 0
      },
      position: {
        x: (index % 5) * 200,
        y: Math.floor(index / 5) * 100
      },
      type: type === 'component' ? 'custom' : 'default'
    });

    nodeMap.set(path, nodeId);
  });

  dependencies.forEach((dep, index) => {
    const depId = `dep-${index}`;
    nodes.push({
      id: depId,
      data: {
        label: dep.name,
        version: dep.version,
        type: 'dependency'
      },
      position: {
        x: 1200 + (index % 3) * 150,
        y: Math.floor(index / 3) * 100
      },
      type: 'dependency'
    });
  });

  return { nodes, nodeMap };
}

/**
 * Build edges from import relationships
 */
export function buildEdges(fileStructure, imports, nodeMap) {
  if (!imports || !nodeMap) {
    return [];
  }

  const edges = [];
  const edgeSet = new Set();

  imports.forEach(imp => {
    const { source } = imp;
    const sourceNode = nodeMap.get(source);

    if (sourceNode) {
      const edgeId = `edge-${sourceNode}-${source}`;
      if (!edgeSet.has(edgeId)) {
        edges.push({
          id: edgeId,
          source: sourceNode,
          target: `dep-${source.replace(/[^a-zA-Z0-9]/g, '')}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#888' }
        });
        edgeSet.add(edgeId);
      }
    }
  });

  return edges;
}

/**
 * Build complete graph data for ReactFlow
 */
export function buildGraphData(fileStructure, dependencies = [], imports = []) {
  const { nodes, nodeMap } = buildNodes(fileStructure, dependencies);
  const edges = buildEdges(fileStructure, imports, nodeMap);

  return {
    nodes,
    edges,
    nodeMap
  };
}

/**
 * Build simplified graph for large repositories
 */
export function buildSimplifiedGraph(fileStructure, maxNodes = 50) {
  if (!fileStructure || !Array.isArray(fileStructure)) {
    return { nodes: [], edges: [] };
  }

  const importantFiles = normalizeRepositoryFiles(fileStructure)
    .filter(path => (
      path.includes('components') ||
      path.includes('pages') ||
      path.includes('services') ||
      path.includes('App') ||
      path.includes('index')
    ))
    .slice(0, maxNodes);

  const { nodes, nodeMap } = buildNodes(importantFiles);
  const edges = [];
  const pathMap = new Map();

  importantFiles.forEach(path => {
    const parts = path.split('/');

    if (parts.length > 1) {
      const parentPath = parts.slice(0, -1).join('/');
      const parentNode = nodeMap.get(parentPath);
      const currentNode = nodeMap.get(path);

      if (parentNode && currentNode) {
        const edgeId = `edge-${parentNode}-${currentNode}`;
        if (!pathMap.has(edgeId)) {
          edges.push({
            id: edgeId,
            source: parentNode,
            target: currentNode,
            type: 'smoothstep'
          });
          pathMap.set(edgeId, true);
        }
      }
    }
  });

  return { nodes, edges };
}

/**
 * Calculate graph statistics
 */
export function calculateGraphStats(nodes, edges) {
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    componentCount: nodes.filter(n => n.data.type === 'component').length,
    serviceCount: nodes.filter(n => n.data.type === 'service').length,
    pageCount: nodes.filter(n => n.data.type === 'page').length,
    dependencyCount: nodes.filter(n => n.data.type === 'dependency').length
  };
}

const graphDataUtils = {
  buildNodes,
  buildEdges,
  buildGraphData,
  buildSimplifiedGraph,
  calculateGraphStats,
  buildRepositoryGraphData,
  normalizeRepositoryFiles
};

export default graphDataUtils;
