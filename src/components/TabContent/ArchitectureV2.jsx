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
import {
  Crosshair,
  DownloadCloud,
  GitBranch,
  Layers,
  LocateFixed,
  Maximize2,
  Network,
  RotateCcw,
  Search,
  ZoomIn,
  ZoomOut,
  Boxes,
  Activity,
  BookOpen,
  Compass,
  FileCode2,
  Route,
  Server,
  ShieldAlert,
} from 'lucide-react';
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
  { id: 'overview', label: 'Overview', description: 'Project purpose and architecture snapshot' },
  { id: 'system-context', label: 'System Context', description: 'Users, boundaries, and external services' },
  { id: 'containers', label: 'Containers', description: 'Major runtime and deployable parts' },
  { id: 'modules', label: 'Modules', description: 'Subsystem and folder-level organization' },
  { id: 'runtime-flow', label: 'Runtime Flow', description: 'A key request or data path through the system' },
  { id: 'tech-stack', label: 'Tech Stack', description: 'Detected technologies and deployment model' }
];

const ARCHITECTURE_VIEW_CONFIG = {
  overview: { direction: 'DOWN', padding: 0.28, minZoom: 0.32, maxZoom: 1.7, nodeSpacing: 54, layerSpacing: 92 },
  'system-context': { direction: 'RIGHT', padding: 0.24, minZoom: 0.26, maxZoom: 1.7, nodeSpacing: 56, layerSpacing: 108 },
  containers: { direction: 'RIGHT', padding: 0.22, minZoom: 0.24, maxZoom: 1.75, nodeSpacing: 52, layerSpacing: 104 },
  modules: { direction: 'DOWN', padding: 0.18, minZoom: 0.2, maxZoom: 1.65, nodeSpacing: 46, layerSpacing: 86 },
  'runtime-flow': { direction: 'RIGHT', padding: 0.3, minZoom: 0.32, maxZoom: 1.8, nodeSpacing: 60, layerSpacing: 118 },
  'tech-stack': { direction: 'DOWN', padding: 0.2, minZoom: 0.3, maxZoom: 1.65, nodeSpacing: 58, layerSpacing: 104, layout: 'tech-lanes' }
};

const DEFAULT_VIEW_CONFIG = ARCHITECTURE_VIEW_CONFIG.overview;

function getViewConfig(viewMode) {
  return ARCHITECTURE_VIEW_CONFIG[viewMode] || DEFAULT_VIEW_CONFIG;
}

function makeFitViewOptions(config, duration) {
  return {
    padding: config.padding,
    includeHiddenNodes: false,
    minZoom: config.minZoom,
    maxZoom: config.maxZoom,
    ...(duration ? { duration } : {})
  };
}

const nodeTypes = {
  architectureV2: memo(function ArchitectureV2Node({ data, selected }) {
    const sourceFiles = Array.isArray(data.sourceFiles) ? data.sourceFiles : [];
    const evidence = Array.isArray(data.evidence) ? data.evidence : [];
    const isBoundary = Boolean(data.externalBoundary);
    const isCompact = Boolean(data.compact);
    const isTechnology = data.layer === 'technology';
    const isActionNode = data.action === 'toggle-tech-group';
    const confidence = data.confidence || 'medium';
    const nodeChips = [
      data.count ? { label: `${data.count} items` } : null,
      sourceFiles.length ? { label: `${sourceFiles.length} files` } : null,
      data.technology ? { label: data.technology, title: data.technology } : null,
      isBoundary ? { label: 'boundary', className: 'arch-v2-node-boundary' } : null,
      data.securityIssues > 0 ? { label: `${data.securityIssues} risks`, className: 'arch-v2-node-risk' } : null,
      evidence.length ? { label: `${evidence.length} evidence` } : null
    ].filter(Boolean).slice(0, isCompact ? 2 : 3);

    return (
      <div
        className={`arch-v2-node ${isCompact ? 'arch-v2-node--compact' : ''} ${isBoundary ? 'arch-v2-node--boundary' : ''} ${isTechnology ? 'arch-v2-node--technology' : ''} ${isActionNode ? 'arch-v2-node--action' : ''} ${selected ? 'selected' : ''}`}
        style={{ '--node-accent': data.color || 'rgba(255,255,255,0.12)' }}
      >
        {isTechnology ? (
          <Handle id="top" type="target" position={Position.Top} className="arch-v2-handle arch-v2-handle--vertical" />
        ) : null}
        <Handle type="target" position={Position.Left} className="arch-v2-handle" />
        <div className="arch-v2-node-topline">
          <span className="arch-v2-node-kind">{data.architectureType || data.layer || 'Architecture'}</span>
          <span className={`arch-v2-confidence arch-v2-confidence--${confidence}`}>{confidence}</span>
        </div>
        <div className="arch-v2-node-title" title={data.label}>{data.label}</div>
        <div className="arch-v2-node-desc" title={data.description || data.path}>
          {data.description || data.path || 'Architecture element inferred from repository analysis.'}
        </div>
        <div className="arch-v2-node-metrics">
          {nodeChips.map((chip) => (
            <span key={chip.label} className={chip.className || ''} title={chip.title || chip.label}>
              {chip.label}
            </span>
          ))}
        </div>
        <Handle type="source" position={Position.Right} className="arch-v2-handle" />
        {isTechnology ? (
          <Handle id="bottom" type="source" position={Position.Bottom} className="arch-v2-handle arch-v2-handle--vertical" />
        ) : null}
      </div>
    );
  }),
  cluster: memo(function ArchitectureV2Cluster({ data, selected }) {
    const sourceFiles = Array.isArray(data.sourceFiles) ? data.sourceFiles : [];
    const isTechnology = data.layer === 'technology';
    return (
      <div
        className={`arch-v2-cluster ${isTechnology ? 'arch-v2-cluster--technology' : ''} ${selected ? 'selected' : ''}`}
        style={{ '--node-accent': data.color || 'rgba(255,255,255,0.12)' }}
      >
        {isTechnology ? (
          <Handle id="top" type="target" position={Position.Top} className="arch-v2-handle arch-v2-handle--vertical" />
        ) : null}
        <Handle type="target" position={Position.Left} className="arch-v2-handle" />
        <div className="arch-v2-cluster-mark" />
        <div>
          <div className="arch-v2-cluster-eyebrow">{data.architectureType || 'Architecture Cluster'}</div>
          <div className="arch-v2-cluster-title">{data.label}</div>
          <div className="arch-v2-cluster-subtitle">
            {data.count || sourceFiles.length || 0} mapped items
            {data.confidence ? ` · ${data.confidence} confidence` : ''}
          </div>
        </div>
        <Handle type="source" position={Position.Right} className="arch-v2-handle" />
        {isTechnology ? (
          <Handle id="bottom" type="source" position={Position.Bottom} className="arch-v2-handle arch-v2-handle--vertical" />
        ) : null}
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
    const [isHovered, setIsHovered] = useState(false);
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
    const shouldShowLabel = data?.showLabel !== false && (data?.labelVisible || isHovered);

    return (
      <>
        <g
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
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
        </g>
        {shouldShowLabel ? (
          <EdgeLabelRenderer>
            <div
              className={[
                'arch-v2-edge-label',
                data?.labelVisible ? 'is-visible' : '',
                data?.lineRole ? `arch-v2-edge-label--${data.lineRole}` : ''
              ].filter(Boolean).join(' ')}
              style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            >
              {data?.relationship || 'relates'}
            </div>
          </EdgeLabelRenderer>
        ) : null}
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

function layoutTechStackLanes(nodes, edges, viewConfig = {}) {
  const categoryNodes = nodes.filter(node => node.data?.architectureType === 'Technology Category');
  if (categoryNodes.length === 0) return fallbackLayout(nodes, edges);

  const categoryIds = new Set(categoryNodes.map(node => node.id));
  const childIdsByCategory = new Map(categoryNodes.map(node => [node.id, []]));
  const categoryByKey = new Map(categoryNodes.map(node => [normalizeArchitectureKey(node.id.replace(/^tech:/, '')), node.id]));
  const primaryOrder = ['frontend', 'backend', 'database', 'storage', 'orm', 'cache', 'authentication'];
  const databaseLikeKeys = new Set(['database', 'storage', 'orm', 'cache']);

  const nodeById = new Map(nodes.map(node => [node.id, node]));
  nodes.forEach((node) => {
    if (categoryIds.has(node.id)) return;
    const categoryId = categoryByKey.get(normalizeArchitectureKey(node.data?.technology));
    if (categoryId) childIdsByCategory.get(categoryId)?.push(node.id);
  });

  const viewportWidth = Math.max(1640, Number(viewConfig.canvasWidth) || 1480);
  const compactCanvas = viewportWidth < 1180;
  const canvasPaddingY = 78;
  const categoryHeight = 112;
  const categoryWidth = compactCanvas ? 284 : 300;
  const itemWidth = compactCanvas ? 248 : 260;
  const itemHeight = compactCanvas ? 138 : 146;
  const columnGapX = compactCanvas ? 56 : 72;
  const tierGapY = compactCanvas ? 108 : 130;
  const rowGapY = compactCanvas ? 86 : 100;
  const baseItemGapY = compactCanvas ? 36 : 44;
  const baseCategoryChildGap = compactCanvas ? 52 : 64;
  const childGapForCount = (count) => {
    if (count >= 8) return compactCanvas ? 28 : 34;
    if (count >= 5) return compactCanvas ? 32 : 38;
    return baseItemGapY;
  };
  const categoryChildGapForCount = (count) => {
    if (count >= 8) return compactCanvas ? 44 : 52;
    if (count >= 5) return compactCanvas ? 48 : 58;
    return baseCategoryChildGap;
  };

  const blocks = categoryNodes.map((node) => {
    const childIds = childIdsByCategory.get(node.id) || [];
    const key = node.id.replace(/^tech:/, '');
    const childGapY = childGapForCount(childIds.length);
    const categoryChildGap = categoryChildGapForCount(childIds.length);
    const height = childIds.length
      ? categoryHeight + categoryChildGap + childIds.length * itemHeight + Math.max(0, childIds.length - 1) * childGapY
      : categoryHeight;

    return {
      node,
      key,
      childIds,
      childGapY,
      categoryChildGap,
      width: categoryWidth,
      height
    };
  });

  const blockByKey = new Map(blocks.map(block => [block.key, block]));
  const selectedPrimaryBlocks = [];
  const usedKeys = new Set();
  const addPrimaryBlock = (key) => {
    const block = blockByKey.get(key);
    if (!block || usedKeys.has(key) || selectedPrimaryBlocks.length >= 4) return false;
    selectedPrimaryBlocks.push(block);
    usedKeys.add(key);
    return true;
  };

  primaryOrder.forEach((key) => {
    if (databaseLikeKeys.has(key) && selectedPrimaryBlocks.some(block => databaseLikeKeys.has(block.key))) {
      return;
    }
    addPrimaryBlock(key);
  });

  if (selectedPrimaryBlocks.length < Math.min(4, blocks.length)) {
    blocks.forEach((block) => {
      if (selectedPrimaryBlocks.length >= Math.min(4, blocks.length)) return;
      addPrimaryBlock(block.key);
    });
  }

  const runtimeBlocks = selectedPrimaryBlocks;
  const supportBlocks = blocks.filter(block => !usedKeys.has(block.key));

  const packRows = (items, maxPerRow) => {
    const rows = [];
    for (let index = 0; index < items.length; index += maxPerRow) {
      const rowBlocks = items.slice(index, index + maxPerRow);
      rows.push({
        blocks: rowBlocks,
        width: rowBlocks.reduce((sum, block) => sum + block.width, 0) + Math.max(0, rowBlocks.length - 1) * columnGapX,
        height: Math.max(...rowBlocks.map(block => block.height), categoryHeight)
      });
    }
    return rows;
  };

  const maxColumnsForWidth = Math.max(1, Math.floor((viewportWidth - 88 + columnGapX) / (categoryWidth + columnGapX)));
  const runtimeRows = packRows(runtimeBlocks, runtimeBlocks.length <= 4 ? runtimeBlocks.length : Math.min(4, maxColumnsForWidth));
  const supportRows = packRows(supportBlocks, Math.min(supportBlocks.length <= 3 ? 3 : 3, maxColumnsForWidth));
  const rows = [...runtimeRows, ...supportRows];

  const positioned = new Map();
  let yOffset = canvasPaddingY;

  rows.forEach((row, rowIndex) => {
    let xOffset = Math.max(44, (viewportWidth - row.width) / 2);

    row.blocks.forEach((block) => {
      const { node, childIds, width, childGapY, categoryChildGap } = block;
      const blockY = yOffset;

      positioned.set(node.id, {
        ...node,
        position: {
          x: xOffset + (width - categoryWidth) / 2,
          y: blockY
        }
      });

      childIds.forEach((childId, childIndex) => {
        const child = nodeById.get(childId);
        if (!child) return;

        positioned.set(child.id, {
          ...child,
          position: {
            x: xOffset + (width - itemWidth) / 2,
            y: blockY + categoryHeight + categoryChildGap + childIndex * (itemHeight + childGapY)
          }
        });
      });

      xOffset += width + columnGapX;
    });

    yOffset += row.height + (
      rowIndex === runtimeRows.length - 1 && supportRows.length > 0
        ? tierGapY
        : rowGapY
    );
  });

  nodes.forEach((node, index) => {
    if (positioned.has(node.id)) return;
    positioned.set(node.id, {
      ...node,
      position: {
        x: 44 + (index % 3) * (categoryWidth + columnGapX),
        y: yOffset + Math.floor(index / 3) * 170
      }
    });
  });

  return {
    nodes: nodes.map(node => positioned.get(node.id) || node),
    edges: edges.map((edge) => {
      const isContainment = edge.data?.containment || edge.data?.relationship === 'contains';
      const isTechRelationship = edge.id?.startsWith('tech:relationship:');

      if (isContainment) {
        return {
          ...edge,
          zIndex: 0,
          data: {
            ...edge.data,
            lineRole: 'hierarchy',
            showLabel: false
          }
        };
      }

      if (isTechRelationship) {
        return {
          ...edge,
          zIndex: 1,
          data: {
            ...edge.data,
            lineRole: 'relationship',
            showLabel: true
          }
        };
      }

      return edge;
    })
  };
}

async function layoutWithElk(nodes, edges, viewConfig = DEFAULT_VIEW_CONFIG) {
  if (nodes.length === 0) return { nodes, edges };
  if (viewConfig.layout === 'tech-lanes') return layoutTechStackLanes(nodes, edges, viewConfig);

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': viewConfig.direction,
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': String(viewConfig.nodeSpacing || 54),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(viewConfig.layerSpacing || 96),
      'elk.spacing.edgeNode': '28',
      'elk.spacing.edgeEdge': '16',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.separateConnectedComponents': 'true',
      'elk.padding': '[top=24,left=28,bottom=24,right=28]'
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: node.type === 'cluster'
        ? 300
        : node.data?.compact
          ? 240
          : 320,
      height: node.type === 'cluster'
        ? 112
        : node.data?.compact
          ? 104
          : 150
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

function toList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function itemPath(item) {
  return typeof item === 'string' ? item : item?.path || item?.name || '';
}

function normalizeArchitectureKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getTechStackGroupKey(node) {
  if (!node?.data || node.data.layer !== 'technology') return '';
  if (node.data.architectureType === 'Technology Category') {
    return normalizeArchitectureKey(String(node.id || '').replace(/^tech:/, ''));
  }
  return normalizeArchitectureKey(node.data.technology);
}

function collectRepositoryPaths(repoData, codeAnalysis, importantFiles) {
  return Array.from(new Set([
    ...toList(repoData?.fileTree).map(itemPath),
    ...toList(repoData?.fileStructure).map(itemPath),
    ...toList(importantFiles).map(itemPath),
    ...toList(codeAnalysis?.files).map(itemPath)
  ].filter(Boolean)));
}

function dependencyNames(packageJson = {}) {
  return [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
    packageJson.optionalDependencies
  ].flatMap(bucket => Object.keys(bucket || {}));
}

function inferProjectType({ techStack, packageJson, paths }) {
  const deps = dependencyNames(packageJson).join(' ').toLowerCase();
  const tech = Object.values(techStack || {}).flat().join(' ').toLowerCase();
  const pathText = paths.join(' ').toLowerCase();
  const hasFrontend = /react|next|vite|vue|frontend|component|tsx|jsx/.test(`${tech} ${deps} ${pathText}`);
  const hasBackend = /express|koa|fastapi|flask|django|spring|api|server|routes/.test(`${tech} ${deps} ${pathText}`);
  const hasAi = /openai|groq|gemini|anthropic|llm|ai/.test(`${tech} ${deps} ${pathText}`);
  const hasCli = /(^|\/)(cli|main|manage)\.(js|ts|py)/.test(pathText);

  if (hasAi && hasBackend) return 'AI-enabled backend system';
  if (hasFrontend && hasBackend) return 'Full-stack web application';
  if (hasFrontend) return 'Frontend application';
  if (hasBackend) return 'Backend/API service';
  if (hasCli) return 'CLI or automation tool';
  return paths.length ? 'Repository application' : 'Architecture unavailable';
}

function pickEntryPoints(paths, importantFiles) {
  const importantPaths = toList(importantFiles).map(itemPath);
  const candidates = paths.filter(path => (
    /(^|\/)(app|server|main|index|cli|manage|wsgi|asgi)\.(js|jsx|ts|tsx|py)$/i.test(path) ||
    /(^|\/)api\//i.test(path) ||
    /(_routes|routes)\.(js|ts|py)$/i.test(path)
  ));
  return Array.from(new Set([...importantPaths, ...candidates]))
    .filter(path => candidates.includes(path) || /(^|\/)(app|server|main|index|cli|manage|wsgi|asgi)\./i.test(path))
    .slice(0, 5);
}

function topFolders(paths, limit = 5) {
  const counts = new Map();
  paths.forEach((path) => {
    const folder = path.includes('/') ? path.split('/')[0] : 'root';
    counts.set(folder, (counts.get(folder) || 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([folder, count]) => ({ folder, count }));
}

function detectExternalNames({ rawGraph, repoData, techStack, packageJson, paths }) {
  const evidenceText = [
    ...dependencyNames(packageJson),
    ...Object.values(techStack || {}).flat(),
    ...toList(repoData?.envVariables).map(item => (typeof item === 'string' ? item : item?.name || item?.key || '')),
    ...paths,
    ...toList(rawGraph?.nodes).flatMap(node => [node?.data?.label, ...toList(node?.data?.evidence)])
  ].join(' ').toLowerCase();

  const patterns = [
    ['GitHub', /github|octokit|gh_/],
    ['AI providers', /openai|groq|gemini|anthropic|llm|model api/],
    ['YouTube API', /youtube|yt-dlp|googleapis/],
    ['Database/cache', /postgres|mongodb|mysql|sqlite|redis|supabase|database|cache/],
    ['Vercel/serverless', /vercel|serverless/],
    ['Docker/runtime', /docker|container/],
    ['CI workflows', /github\/workflows|github actions|actions|circleci|ci\.yml|ci\.yaml/]
  ];

  return patterns
    .filter(([, pattern]) => pattern.test(evidenceText))
    .map(([label]) => label)
    .slice(0, 6);
}

function buildArchitectureSummary({ repoData, codeAnalysis, rawGraph, importantFiles, techStack, packageJson, packageJsonPath }) {
  const paths = collectRepositoryPaths(repoData, codeAnalysis, importantFiles);
  const entryPoints = pickEntryPoints(paths, importantFiles);
  const folders = topFolders(paths, 5);
  const deps = dependencyNames(packageJson);
  const externals = detectExternalNames({ rawGraph, repoData, techStack, packageJson, paths });
  const securityBuckets = codeAnalysis?.security || {};
  const securityIssues = ['critical', 'high', 'medium', 'low'].reduce(
    (sum, key) => sum + toList(securityBuckets[key]).length,
    0
  );
  const patterns = toList(codeAnalysis?.summary?.patterns);
  const architecturePattern = rawGraph?.stats?.architecturePattern || patterns[0] || 'Inferred from repository structure';
  const projectType = inferProjectType({ techStack, packageJson, paths });
  const configFiles = paths.filter(path => /(^|\/)(dockerfile|docker-compose|vercel\.json|package\.json|requirements\.txt|pyproject\.toml|\.github\/workflows|\.env\.example)/i.test(path));
  const docs = paths.filter(path => /(^|\/)(readme|docs|architecture|contributing).*\.?md$/i.test(path));
  const risks = [
    securityIssues > 0 ? `${securityIssues} security findings in code analysis` : null,
    externals.length > 0 ? `${externals.length} external/service boundaries need runtime config validation` : null,
    configFiles.length > 0 ? `${configFiles.length} deployment or runtime config files detected` : null,
    !codeAnalysis?.summary ? 'Code analysis summary is unavailable, so confidence is lower' : null
  ].filter(Boolean).slice(0, 4);

  const readingPath = [
    docs[0] || 'README / docs',
    entryPoints[0],
    folders[0]?.folder && `${folders[0].folder}/`,
    packageJsonPath || configFiles[0],
    externals[0] && 'External integration configuration'
  ].filter(Boolean).slice(0, 5);

  return {
    projectType,
    architecturePattern,
    entryPoints,
    folders,
    externals,
    risks,
    readingPath,
    stats: {
      files: rawGraph?.stats?.totalFiles || paths.length,
      analyzed: rawGraph?.stats?.analyzedFiles || codeAnalysis?.summary?.analyzedFiles || 0,
      dependencies: rawGraph?.stats?.dependencies || deps.length,
      components: rawGraph?.stats?.components || rawGraph?.nodes?.length || 0
    }
  };
}

function buildNodeWhy(node) {
  const data = node?.data || {};
  const evidenceCount = toList(data.evidence).length;
  const fileCount = toList(data.sourceFiles).length;
  const type = data.architectureType || data.nodeType || 'architecture element';

  if (data.externalBoundary) {
    return `CodeAtlas represents this as an external or boundary element because repository evidence points outside the core codebase.`;
  }
  if (fileCount > 0 && evidenceCount > 0) {
    return `CodeAtlas groups this as a ${type} because ${fileCount} representative source files and ${evidenceCount} evidence signals support it.`;
  }
  if (fileCount > 0) {
    return `CodeAtlas groups this as a ${type} because representative source files map to this architecture role.`;
  }
  if (evidenceCount > 0) {
    return `CodeAtlas includes this ${type} because repository analysis found matching evidence signals.`;
  }
  return `CodeAtlas inferred this ${type} from the current architecture view and repository structure.`;
}

function buildSelectedNodeDetails(selectedNode, rawGraph) {
  if (!selectedNode) return null;
  const nodeById = new Map(toList(rawGraph?.nodes).map(node => [node.id, node]));
  const node = nodeById.get(selectedNode.id) || selectedNode;
  const relationships = toList(rawGraph?.edges)
    .filter(edge => edge.source === node.id || edge.target === node.id)
    .map((edge) => {
      const direction = edge.source === node.id ? 'outgoing' : 'incoming';
      const relatedId = direction === 'outgoing' ? edge.target : edge.source;
      const relatedNode = nodeById.get(relatedId);
      return {
        id: edge.id,
        direction,
        relationship: edge.data?.relationship || 'relates',
        inferred: Boolean(edge.data?.inferred),
        label: relatedNode?.data?.label || relatedId,
        type: relatedNode?.data?.architectureType || relatedNode?.data?.layer || 'Architecture element'
      };
    });

  return {
    node,
    why: buildNodeWhy(node),
    incoming: relationships.filter(item => item.direction === 'incoming'),
    outgoing: relationships.filter(item => item.direction === 'outgoing')
  };
}

function ArchitectureOverviewSummary({ summary }) {
  const fallback = 'Not enough repository evidence yet';

  return (
    <section className="arch-v2-overview-summary" aria-label="Architecture overview summary">
      <div className="arch-v2-overview-brief">
        <div className="arch-v2-kicker">Overview brief</div>
        <h3>What this system looks like</h3>
        <p>
          CodeAtlas summarizes the architecture before the diagram so a developer can understand
          the project shape, entry points, modules, external boundaries, and where to start reading.
        </p>
      </div>

      <div className="arch-v2-overview-grid">
        <ArchitectureSummaryCard
          icon={<Compass size={17} />}
          label="Project Type"
          value={summary.projectType || fallback}
          meta={`${summary.stats.files || 0} files · ${summary.stats.components || 0} parts`}
        />
        <ArchitectureSummaryCard
          icon={<Server size={17} />}
          label="Architecture Pattern"
          value={summary.architecturePattern || fallback}
          meta={summary.stats.dependencies ? `${summary.stats.dependencies} package signals` : 'repository-derived'}
        />
        <ArchitectureSummaryCard
          icon={<Route size={17} />}
          label="Main Entry Points"
          value={summary.entryPoints[0] || fallback}
          list={summary.entryPoints.slice(1, 4)}
        />
        <ArchitectureSummaryCard
          icon={<Boxes size={17} />}
          label="Key Modules"
          value={summary.folders[0] ? `${summary.folders[0].folder}/` : fallback}
          list={summary.folders.slice(1, 4).map(item => `${item.folder}/ · ${item.count}`)}
        />
        <ArchitectureSummaryCard
          icon={<GitBranch size={17} />}
          label="External Services"
          value={summary.externals[0] || fallback}
          list={summary.externals.slice(1, 4)}
        />
        <ArchitectureSummaryCard
          icon={<ShieldAlert size={17} />}
          label="Risks / Warnings"
          value={summary.risks[0] || 'No major warnings from available analysis'}
          list={summary.risks.slice(1, 4)}
          tone={summary.risks.length ? 'warning' : 'calm'}
        />
      </div>

      <div className="arch-v2-reading-path">
        <div className="arch-v2-reading-title">
          <BookOpen size={16} />
          Recommended reading path
        </div>
        <div className="arch-v2-reading-list">
          {summary.readingPath.length > 0 ? summary.readingPath.map((item, index) => (
            <span key={`${item}-${index}`}>{index + 1}. {item}</span>
          )) : (
            <span>Run repository analysis to populate a reading path.</span>
          )}
        </div>
      </div>
    </section>
  );
}

function ArchitectureSummaryCard({ icon, label, value, meta, list = [], tone = 'default' }) {
  return (
    <article className={`arch-v2-summary-card arch-v2-summary-card--${tone}`}>
      <div className="arch-v2-summary-icon">{icon}</div>
      <div className="arch-v2-summary-body">
        <span>{label}</span>
        <strong title={value}>{value}</strong>
        {meta ? <em>{meta}</em> : null}
        {list.length > 0 ? (
          <div className="arch-v2-summary-list">
            {list.map(item => <small key={item} title={item}>{item}</small>)}
          </div>
        ) : null}
      </div>
    </article>
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
  const [viewMode, setViewMode] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [layoutedGraph, setLayoutedGraph] = useState({ nodes: [], edges: [] });
  const [isLayouting, setIsLayouting] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const reactFlowWrapper = useRef(null);
  const fullscreenWrapper = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(0);

  const importantFiles = useMemo(() => repoData?.importantFiles || [], [repoData]);
  const techStack = useMemo(() => repoData?.techStack || {}, [repoData]);
  const packageJson = useMemo(() => repoData?.packageJson || {}, [repoData]);
  const packageJsonPath = repoData?.packageJsonPath;
  const technologyBreakdown = useMemo(() => {
    const entries = Object.entries(techStack)
      .filter(([, list]) => Array.isArray(list) && list.length > 0);
    const dependencies = dependencyNames(packageJson);

    if (dependencies.length > 0) {
      entries.push(['dependencies', dependencies]);
    }

    return entries;
  }, [packageJson, techStack]);
  const baseViewConfig = useMemo(() => getViewConfig(viewMode), [viewMode]);
  const viewConfig = useMemo(() => ({
    ...baseViewConfig,
    canvasWidth
  }), [baseViewConfig, canvasWidth]);
  const fitViewOptions = useMemo(() => makeFitViewOptions(viewConfig), [viewConfig]);
  const animatedFitViewOptions = useMemo(() => makeFitViewOptions(viewConfig, 320), [viewConfig]);
  const miniMapStyle = useMemo(() => ({ width: 118, height: 84 }), []);
  const miniMapNodeColor = useCallback((node) => node?.data?.color || 'rgba(255,255,255,0.72)', []);

  useEffect(() => {
    const el = reactFlowWrapper.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    let frameId = 0;
    const updateWidth = (width) => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const nextWidth = Math.round(width);
        setCanvasWidth((current) => (
          Math.abs(current - nextWidth) > 8 ? nextWidth : current
        ));
      });
    };

    updateWidth(el.clientWidth);
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry?.contentRect?.width) {
        updateWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(el);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [viewMode, isFullscreen]);

  const rawGraph = useMemo(() => {
    return buildArchitectureV2Graph({
      repoData,
      detailedArchitecture,
      codeAnalysis,
      viewMode,
      expandedGroups,
      searchQuery,
      maxNodes: 96
    });
  }, [repoData, detailedArchitecture, codeAnalysis, viewMode, expandedGroups, searchQuery]);

  const primaryIds = useMemo(() => {
    if (!selectedNode) return new Set();
    const ids = new Set([selectedNode.id]);

    if (viewMode === 'tech-stack') {
      const selectedGroup = getTechStackGroupKey(selectedNode);
      if (selectedGroup) {
        rawGraph.nodes.forEach((node) => {
          if (getTechStackGroupKey(node) === selectedGroup) {
            ids.add(node.id);
          }
        });
      }
    }

    return ids;
  }, [rawGraph.nodes, selectedNode, viewMode]);

  const connectedIds = useMemo(() => {
    if (!selectedNode) return new Set();

    if (viewMode === 'tech-stack') {
      const ids = new Set(primaryIds);
      const nodeById = new Map(rawGraph.nodes.map(node => [node.id, node]));
      const relatedGroups = new Set(
        Array.from(ids)
          .map(id => getTechStackGroupKey(nodeById.get(id)))
          .filter(Boolean)
      );

      rawGraph.edges.forEach((edge) => {
        if (ids.has(edge.source) || ids.has(edge.target)) {
          const sourceGroup = getTechStackGroupKey(nodeById.get(edge.source));
          const targetGroup = getTechStackGroupKey(nodeById.get(edge.target));
          if (sourceGroup) relatedGroups.add(sourceGroup);
          if (targetGroup) relatedGroups.add(targetGroup);
        }
      });

      rawGraph.nodes.forEach((node) => {
        const group = getTechStackGroupKey(node);
        if (group && relatedGroups.has(group)) {
          ids.add(node.id);
        }
      });

      return ids;
    }

    const ids = new Set(primaryIds);
    rawGraph.edges.forEach((edge) => {
      if (edge.source === selectedNode.id) ids.add(edge.target);
      if (edge.target === selectedNode.id) ids.add(edge.source);
    });
    return ids;
  }, [primaryIds, rawGraph.edges, rawGraph.nodes, selectedNode, viewMode]);

  const nodes = useMemo(() => layoutedGraph.nodes.map((node) => {
    let className = '';

    if (connectedIds.size > 0) {
      if (primaryIds.has(node.id)) {
        className = 'arch-v2-primary';
      } else if (connectedIds.has(node.id)) {
        className = 'arch-v2-related';
      } else {
        className = 'arch-v2-muted';
      }
    }

    return {
      ...node,
      className
    };
  }), [layoutedGraph.nodes, connectedIds, primaryIds]);

  useEffect(() => {
    let cancelled = false;
    setIsLayouting(true);
    setLayoutedGraph({ nodes: [], edges: [] });

    layoutWithElk(rawGraph.nodes, rawGraph.edges, viewConfig)
      .then((graph) => {
        if (!cancelled) setLayoutedGraph(graph);
      })
      .finally(() => {
        if (!cancelled) setIsLayouting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rawGraph.nodes, rawGraph.edges, viewConfig]);

  const edges = useMemo(() => layoutedGraph.edges.map((edge) => {
    const hasSelection = connectedIds.size > 0;
    const active = !hasSelection || connectedIds.has(edge.source) || connectedIds.has(edge.target);
    const strength = edge.data?.strength || 1;
    const isContainment = edge.data?.containment || edge.data?.relationship === 'contains';
    const isCategoryRelationship = edge.id?.startsWith('tech:relationship:');
    const isHierarchyLine = edge.data?.lineRole === 'hierarchy';
    const relationshipWidth = hasSelection
      ? Math.min(3.1, 1.5 + strength * 0.38)
      : Math.min(2.35, 1.3 + strength * 0.25);
    const containmentWidth = hasSelection && active ? 1.8 : 1.42;
    const labelVisible = isCategoryRelationship
      ? (!hasSelection || active)
      : hasSelection && active;
    const lineClass = isContainment ? 'is-hierarchy-line' : isCategoryRelationship ? 'is-relationship-line' : '';

    return {
      ...edge,
      className: [active ? 'is-active' : 'is-idle', lineClass].filter(Boolean).join(' '),
      animated: hasSelection && active && !edge.data?.inferred && !isContainment && strength > 2,
      zIndex: isContainment ? 0 : 1,
      data: {
        ...edge.data,
        labelVisible
      },
      markerEnd: isContainment ? undefined : {
        type: MarkerType.ArrowClosed,
        color: active && hasSelection ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.22)'
      },
      style: {
        stroke: isContainment
          ? 'rgba(214, 211, 209, 0.42)'
          : active
            ? (edge.data?.inferred ? 'rgba(205,205,205,0.56)' : 'rgba(255,255,255,0.74)')
            : 'rgba(255,255,255,0.12)',
        strokeWidth: isContainment
          ? containmentWidth
          : active
            ? relationshipWidth
            : 1.2,
        strokeDasharray: edge.data?.inferred
          ? (isCategoryRelationship ? '4 9' : (hasSelection && active ? '5 10' : '3 12'))
          : undefined,
        opacity: isContainment
          ? (hasSelection ? (active ? 0.72 : 0.18) : (isHierarchyLine ? 0.52 : 0.42))
          : active
            ? (hasSelection ? 0.9 : isCategoryRelationship ? 0.78 : 0.58)
            : 0.2
      }
    };
  }), [layoutedGraph.edges, connectedIds]);

  const toggleTechGroup = useCallback((group) => {
    if (!group) return;
    setExpandedGroups((current) => (
      current.includes(group)
        ? current.filter(item => item !== group)
        : [...current, group]
    ));
  }, []);

  const handleNodeClick = useCallback((event, node) => {
    if (viewMode === 'tech-stack' && node.data?.action === 'toggle-tech-group') {
      toggleTechGroup(node.data.group);
      setSelectedNode(null);
      return;
    }

    setSelectedNode(node);
  }, [toggleTechGroup, viewMode]);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodeDoubleClick = useCallback((event, node) => {
    if (node.type !== 'cluster') return;
    const group = node.data?.group;
    if (!group) return;
    toggleTechGroup(group);
  }, [toggleTechGroup]);

  const fitArchitectureView = useCallback(() => {
    reactFlowInstance?.fitView(animatedFitViewOptions);
  }, [animatedFitViewOptions, reactFlowInstance]);

  const zoomInArchitecture = useCallback(() => {
    reactFlowInstance?.zoomIn?.({ duration: 180 });
  }, [reactFlowInstance]);

  const zoomOutArchitecture = useCallback(() => {
    reactFlowInstance?.zoomOut?.({ duration: 180 });
  }, [reactFlowInstance]);

  const focusSelectedArchitecture = useCallback(() => {
    if (!reactFlowInstance || !selectedNode) return;
    reactFlowInstance.fitView({
      nodes: [{ id: selectedNode.id }],
      padding: 0.48,
      duration: 320
    });
  }, [reactFlowInstance, selectedNode]);

  const resetArchitectureView = useCallback(() => {
    setViewMode('overview');
    setSearchQuery('');
    setExpandedGroups([]);
    setSelectedNode(null);
    window.setTimeout(() => {
      reactFlowInstance?.fitView(makeFitViewOptions(DEFAULT_VIEW_CONFIG, 320));
    }, 80);
  }, [reactFlowInstance]);

  useEffect(() => {
    if (!reactFlowInstance || isLayouting || layoutedGraph.nodes.length === 0) return undefined;
    const timeoutId = window.setTimeout(() => {
      reactFlowInstance.fitView(makeFitViewOptions(viewConfig, 260));
    }, 60);

    return () => window.clearTimeout(timeoutId);
  }, [reactFlowInstance, isLayouting, layoutedGraph.nodes.length, layoutedGraph.edges.length, viewConfig, searchQuery]);

  useEffect(() => {
    if (!reactFlowInstance || layoutedGraph.nodes.length === 0) return undefined;
    const timeoutId = window.setTimeout(() => {
      reactFlowInstance.fitView(makeFitViewOptions(viewConfig, 260));
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [reactFlowInstance, isFullscreen, layoutedGraph.nodes.length, viewConfig]);

  const modeInsight = useMemo(() => {
    const depsCount =
      (packageJson?.dependencies ? Object.keys(packageJson.dependencies).length : 0) +
      (packageJson?.devDependencies ? Object.keys(packageJson.devDependencies).length : 0) +
      (packageJson?.peerDependencies ? Object.keys(packageJson.peerDependencies).length : 0);

    const techCount = Object.values(techStack).reduce(
      (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
      0
    );

    if (viewMode === 'system-context') {
      return {
        title: 'System Boundaries',
        description: 'This view explains who interacts with the project and which external systems or managed services appear in the repository evidence.',
        bullets: [
          `${rawGraph.stats?.externalServices || 0} external systems detected`,
          'Boundary nodes are derived from package names, environment variable names, file paths, and tech stack signals',
          'Dashed relationships mean the direction is inferred from architecture role, not a raw file edge'
        ]
      };
    }

    if (viewMode === 'containers') {
      return {
        title: 'Runtime Containers',
        description: 'Containers are high-level runtime or deployable parts, not individual source files.',
        bullets: [
          `${rawGraph.stats?.components || 0} architecture parts detected`,
          `${rawGraph.stats?.endpoints || 0} endpoint signals detected`,
          'Source files are shown as evidence inside each container card'
        ]
      };
    }

    if (viewMode === 'modules') {
      return {
        title: 'Module Organization',
        description: 'Modules summarize folder and subsystem clusters with representative files only.',
        bullets: [
          `Repository files indexed: ${rawGraph.stats?.totalFiles || 0}`,
          `Module relationships shown: ${rawGraph.edges.length}`,
          'Raw file dependency exploration stays in Repository Graph'
        ]
      };
    }

    if (viewMode === 'runtime-flow') {
      return {
        title: 'Key Runtime Path',
        description: 'This view turns repository evidence into a readable request/data path from entrypoint to services and boundaries.',
        bullets: [
          'Stages with source files have higher confidence',
          'Inferred stages are labeled through dashed relationships',
          'Use this as an onboarding explanation, not as a full trace profiler'
        ]
      };
    }

    if (viewMode === 'tech-stack') {
      return {
        title: 'Technology and Deployment',
        description: 'Technologies are grouped from repository analysis, package manifests, and detected stack metadata.',
        bullets: [
          packageJsonPath ? `Package manifest: ${packageJsonPath}` : 'Package manifest: detected automatically',
          `Total technologies detected: ${techCount}`,
          `Dependencies indexed: ${depsCount}`
        ]
      };
    }

    return {
      title: 'Architecture Snapshot',
      description: 'A product-level architecture map built from repository structure, package metadata, detected technologies, and code analysis.',
      bullets: [
        `Architecture nodes rendered: ${rawGraph.nodes.length}`,
        `Relationships rendered: ${rawGraph.edges.length}`,
        rawGraph.stats?.architecturePattern
          ? `Detected pattern: ${rawGraph.stats.architecturePattern}`
          : 'Detected pattern: inferred from structure'
      ]
    };
  }, [viewMode, rawGraph.edges.length, rawGraph.nodes.length, rawGraph.stats, packageJson, packageJsonPath, techStack]);

  const architectureSummary = useMemo(() => (
    buildArchitectureSummary({
      repoData,
      codeAnalysis,
      rawGraph,
      importantFiles,
      techStack,
      packageJson,
      packageJsonPath
    })
  ), [repoData, codeAnalysis, rawGraph, importantFiles, techStack, packageJson, packageJsonPath]);

  const selectedNodeDetails = useMemo(() => (
    buildSelectedNodeDetails(selectedNode, rawGraph)
  ), [selectedNode, rawGraph]);

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
          <p className="text-secondary">Analyze a repository to generate a high-level architecture map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content architecture-v2-tab">
      <section className="arch-v2-hero">
        <div>
          <div className="arch-v2-kicker">Architecture understanding</div>
          <h2>System Architecture</h2>
          <p>
            A high-level software architecture surface built from repository structure,
            code analysis, manifests, detected technologies, and integration evidence.
          </p>
        </div>
        <div className="arch-v2-stats">
          <div><strong>{rawGraph.stats?.components || 0}</strong><span>parts</span></div>
          <div><strong>{rawGraph.stats?.externalServices || 0}</strong><span>externals</span></div>
          <div><strong>{rawGraph.stats?.dependencies || 0}</strong><span>packages</span></div>
          <div><strong>{rawGraph.stats?.visibleNodes || 0}</strong><span>shown</span></div>
        </div>
      </section>

      {viewMode === 'overview' ? (
        <ArchitectureOverviewSummary summary={architectureSummary} />
      ) : null}

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
                  setSearchQuery('');
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
              placeholder="Search architecture parts, services, technologies..."
            />
          </label>
        </div>

        <div className="arch-v2-canvas-toolbar" aria-label="Architecture diagram controls">
          <div className="arch-v2-canvas-tools">
            <button
              type="button"
              title="Fit diagram"
              aria-label="Fit diagram"
              disabled={!reactFlowInstance || isLayouting}
              onClick={fitArchitectureView}
              className="arch-v2-btn arch-v2-btn--icon"
            >
              <LocateFixed size={16} />
              <span className="arch-v2-btn-text">Fit</span>
            </button>
            <button
              type="button"
              title="Zoom in"
              aria-label="Zoom in"
              disabled={!reactFlowInstance}
              onClick={zoomInArchitecture}
              className="arch-v2-btn arch-v2-btn--icon"
            >
              <ZoomIn size={16} />
              <span className="arch-v2-btn-text">Zoom In</span>
            </button>
            <button
              type="button"
              title="Zoom out"
              aria-label="Zoom out"
              disabled={!reactFlowInstance}
              onClick={zoomOutArchitecture}
              className="arch-v2-btn arch-v2-btn--icon"
            >
              <ZoomOut size={16} />
              <span className="arch-v2-btn-text">Zoom Out</span>
            </button>
            <button
              type="button"
              title={selectedNode ? 'Focus selected architecture element' : 'Select a node to focus'}
              aria-label="Focus selected architecture element"
              disabled={!reactFlowInstance || !selectedNode}
              onClick={focusSelectedArchitecture}
              className="arch-v2-btn arch-v2-btn--icon"
            >
              <Crosshair size={16} />
              <span className="arch-v2-btn-text">Focus</span>
            </button>
            <button
              type="button"
              title="Reset Architecture V2 view"
              aria-label="Reset Architecture V2 view"
              disabled={!reactFlowInstance}
              onClick={resetArchitectureView}
              className="arch-v2-btn arch-v2-btn--icon"
            >
              <RotateCcw size={16} />
              <span className="arch-v2-btn-text">Reset</span>
            </button>
          </div>

          <div className="arch-v2-canvas-tools arch-v2-canvas-tools--right">
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
            onInit={setReactFlowInstance}
            fitView
            fitViewOptions={fitViewOptions}
            minZoom={viewConfig.minZoom}
            maxZoom={viewConfig.maxZoom}
            defaultEdgeOptions={{ zIndex: 0 }}
            proOptions={{ hideAttribution: false }}
          >
            <Background color="rgba(255,255,255,0.03)" gap={22} size={1} />
            <Controls showInteractive={false} />
            {(viewMode !== 'tech-stack' || isFullscreen) ? (
              <MiniMap
                pannable
                zoomable
                maskColor="rgba(0,0,0,0.72)"
                nodeColor={miniMapNodeColor}
                nodeStrokeWidth={2}
                style={miniMapStyle}
              />
            ) : null}
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
              <span style={{ background: selectedNode.data?.color || 'rgba(255,255,255,0.12)' }} />
              <div>
                <h3>{selectedNode.data?.label}</h3>
                <p>{selectedNode.data?.description || selectedNode.data?.architectureType || selectedNode.data?.nodeType}</p>
              </div>
            </div>
            <div className="arch-v2-inspector-grid">
              <div><strong>{selectedNode.data?.architectureType || selectedNode.type}</strong><span>type</span></div>
              <div><strong>{selectedNode.data?.layer || 'architecture'}</strong><span>layer</span></div>
              <div><strong>{selectedNode.data?.confidence || 'medium'}</strong><span>confidence</span></div>
              <div><strong>{Array.isArray(selectedNode.data?.sourceFiles) ? selectedNode.data.sourceFiles.length : 0}</strong><span>source files</span></div>
            </div>
            <p className="arch-v2-inspector-note">
              This is architecture evidence, not a raw file dependency view. Selecting a node highlights its immediate high-level relationships.
            </p>

            <div className="arch-v2-node-explain">
              <div className="arch-v2-node-explain-title">
                <FileCode2 size={15} />
                Why this exists
              </div>
              <p>{selectedNodeDetails?.why || 'CodeAtlas inferred this element from repository architecture evidence.'}</p>
            </div>

            {(selectedNodeDetails?.incoming.length || selectedNodeDetails?.outgoing.length) ? (
              <details className="arch-v2-insight" open>
                <summary className="arch-v2-insight-summary">Related Architecture Elements</summary>
                <div className="arch-v2-insight-body">
                  {selectedNodeDetails?.incoming.length ? (
                    <div className="arch-v2-relation-group">
                      <div className="arch-v2-relation-title">Incoming</div>
                      {selectedNodeDetails.incoming.slice(0, 8).map((item) => (
                        <div key={item.id} className="arch-v2-relation-item">
                          <span>{item.label}</span>
                          <em>{item.relationship}{item.inferred ? ' · inferred' : ''}</em>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {selectedNodeDetails?.outgoing.length ? (
                    <div className="arch-v2-relation-group">
                      <div className="arch-v2-relation-title">Outgoing</div>
                      {selectedNodeDetails.outgoing.slice(0, 8).map((item) => (
                        <div key={item.id} className="arch-v2-relation-item">
                          <span>{item.label}</span>
                          <em>{item.relationship}{item.inferred ? ' · inferred' : ''}</em>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </details>
            ) : (
              <div className="arch-v2-node-explain arch-v2-node-explain--muted">
                <div className="arch-v2-node-explain-title">
                  <GitBranch size={15} />
                  Relationships
                </div>
                <p>No direct relationships are shown in this filtered architecture view.</p>
              </div>
            )}

            {Array.isArray(selectedNode.data?.evidence) && selectedNode.data.evidence.length > 0 ? (
              <details className="arch-v2-insight" open style={{ marginTop: 14 }}>
                <summary className="arch-v2-insight-summary">Evidence</summary>
                <div className="arch-v2-insight-body">
                  <ul className="arch-v2-insight-list">
                    {selectedNode.data.evidence.slice(0, 8).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </details>
            ) : null}

            {Array.isArray(selectedNode.data?.sourceFiles) && selectedNode.data.sourceFiles.length > 0 ? (
              <details className="arch-v2-insight">
                <summary className="arch-v2-insight-summary">Representative Source Files</summary>
                <div className="arch-v2-insight-body">
                  <div className="arch-v2-insight-scroll">
                    <ul className="arch-v2-keyfiles">
                      {selectedNode.data.sourceFiles.slice(0, 12).map((path) => (
                        <li key={path}>
                          <span className="arch-v2-keyfiles-path">{path}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </details>
            ) : null}

            <details className="arch-v2-insight">
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
                <h3>Architecture Explorer</h3>
                <p>Select an architecture element to inspect its evidence, confidence, and connected relationships.</p>
              </div>
            </div>
            <div className="arch-v2-inspector-actions">
              <div><Layers size={18} /> High-level architecture map</div>
              <div><GitBranch size={18} /> Evidence-labeled relationships</div>
              <div><Boxes size={18} /> Repository-derived containers</div>
              <div><Activity size={18} /> Runtime flow explanation</div>
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

            <details className="arch-v2-insight" open={viewMode === 'overview'}>
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

            <details className="arch-v2-insight" open={viewMode === 'overview' || viewMode === 'modules'}>
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
                <summary className="arch-v2-insight-summary">Representative Files</summary>
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

            {viewMode === 'tech-stack' && technologyBreakdown.length > 0 ? (
              <details className="arch-v2-insight" open>
                <summary className="arch-v2-insight-summary">Technology Breakdown</summary>
                <div className="arch-v2-insight-body">
                  <div className="arch-v2-tech-grid">
                    {technologyBreakdown
                      .map(([key, list]) => {
                        const group = normalizeArchitectureKey(key);
                        const isExpanded = expandedGroups.includes(group);
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`arch-v2-tech-card ${isExpanded ? 'is-expanded' : ''}`}
                            onClick={() => toggleTechGroup(group)}
                            title={isExpanded ? 'Collapse category' : 'Expand category'}
                          >
                            <strong>{key}</strong>
                            <span>{isExpanded ? 'open' : list.length}</span>
                          </button>
                        );
                      })}
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
      <strong>{isLayouting ? 'Laying out architecture' : 'Architecture map ready'}</strong>
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
      High-level architecture view
    </div>
  );
}

export default ArchitectureV2;
