const CODE_EXTENSIONS = /\.(js|jsx|ts|tsx|py|go|java|rb|php|cs|rs|swift|kt)$/i;
const STYLE_EXTENSIONS = /\.(css|scss|sass|less)$/i;
const CONFIG_EXTENSIONS = /\.(json|yml|yaml|toml|env|config|lock)$/i;

const LAYER_META = {
  entry: { label: 'Entrypoints', color: '#22d3ee', rank: 0 },
  ui: { label: 'Interface', color: '#a78bfa', rank: 1 },
  api: { label: 'API Boundary', color: '#60a5fa', rank: 2 },
  service: { label: 'Services', color: '#34d399', rank: 3 },
  data: { label: 'Data Layer', color: '#f59e0b', rank: 4 },
  utility: { label: 'Utilities', color: '#94a3b8', rank: 5 },
  config: { label: 'Configuration', color: '#f472b6', rank: 6 },
  test: { label: 'Quality', color: '#c084fc', rank: 7 },
  style: { label: 'Styling', color: '#38bdf8', rank: 8 },
  docs: { label: 'Documentation', color: '#e5e7eb', rank: 9 },
  dependency: { label: 'External Dependencies', color: '#fb7185', rank: 10 }
};

function getPath(file) {
  return typeof file === 'string' ? file : file?.path;
}

function fileName(path) {
  return path?.split('/').pop() || path || 'Unknown';
}

function folderName(path) {
  const parts = path?.split('/') || [];
  return parts.length > 1 ? parts[0] : 'root';
}

function classifyLayer(path, file = {}) {
  const lower = path.toLowerCase();
  const apiCount = file.patterns?.apis?.length || 0;
  const dbCount = file.patterns?.databases?.length || 0;

  if (/(\b|\/)(index|main|app|server)\.(js|jsx|ts|tsx|py)$/i.test(path)) return 'entry';
  if (lower.includes('__test__') || lower.includes('.test.') || lower.includes('.spec.') || lower.includes('/test')) return 'test';
  if (lower.includes('/components/') || lower.includes('/pages/') || lower.includes('/views/') || /\.(jsx|tsx|vue)$/i.test(path)) return 'ui';
  if (lower.includes('/api/') || lower.includes('/routes/') || lower.includes('/controllers/') || apiCount > 0) return 'api';
  if (lower.includes('/services/') || lower.includes('/lib/') || lower.includes('/application/')) return 'service';
  if (lower.includes('/models/') || lower.includes('/schema') || lower.includes('/database') || lower.includes('/db/') || dbCount > 0) return 'data';
  if (lower.includes('/utils/') || lower.includes('/helpers/') || lower.includes('/hooks/')) return 'utility';
  if (lower.endsWith('.md') || lower.includes('readme') || lower.includes('/docs/')) return 'docs';
  if (STYLE_EXTENSIONS.test(path)) return 'style';
  if (CONFIG_EXTENSIONS.test(path) || lower.includes('/config/')) return 'config';
  return CODE_EXTENSIONS.test(path) ? 'service' : 'utility';
}

function countSecurityIssues(codeAnalysis) {
  const security = codeAnalysis?.security || {};
  return ['critical', 'high', 'medium', 'low'].reduce((total, severity) => total + (security[severity]?.length || 0), 0);
}

function scoreFile(path, file = {}, importantPaths = new Set()) {
  let score = 1;
  if (importantPaths.has(path)) score += 20;
  if (classifyLayer(path, file) === 'entry') score += 18;
  if (file.patterns?.apis?.length) score += file.patterns.apis.length * 8;
  if (file.patterns?.databases?.length) score += file.patterns.databases.length * 8;
  score += (file.definitions?.functions?.length || 0) * 2;
  score += (file.definitions?.classes?.length || 0) * 3;
  score += (file.security?.length || 0) * 8;
  if (path.includes('/components/') || path.includes('/services/')) score += 5;
  return score;
}

function extractImports(content) {
  if (!content) return [];
  const imports = [];
  const patterns = [
    /import\s+.*?\s+from\s+['"](.+?)['"]/g,
    /import\(['"](.+?)['"]\)/g,
    /require\(['"](.+?)['"]\)/g
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      imports.push(match[1]);
    }
  });

  return imports;
}

function resolveLocalImport(sourcePath, importPath, pathSet) {
  if (!importPath?.startsWith('.')) return null;
  const sourceParts = sourcePath.split('/');
  sourceParts.pop();
  const rawParts = `${sourceParts.join('/')}/${importPath}`.split('/');
  const normalized = [];

  rawParts.forEach((part) => {
    if (!part || part === '.') return;
    if (part === '..') normalized.pop();
    else normalized.push(part);
  });

  const base = normalized.join('/');
  const candidates = [
    base,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.js`,
    `${base}/index.jsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`
  ];

  return candidates.find(candidate => pathSet.has(candidate)) || null;
}

function uniquePush(collection, item) {
  if (!collection.some(existing => existing.id === item.id)) {
    collection.push(item);
  }
}

function buildFileRecords(repoData, codeAnalysis) {
  const codeFiles = new Map((codeAnalysis?.files || []).map(file => [file.path, file]));
  const paths = new Set([
    ...(repoData?.fileTree || []).map(getPath).filter(Boolean),
    ...(repoData?.importantFiles || []).map(getPath).filter(Boolean),
    ...(codeAnalysis?.files || []).map(getPath).filter(Boolean)
  ]);
  const importantPaths = new Set((repoData?.importantFiles || []).map(getPath).filter(Boolean));

  return Array.from(paths).map((path) => {
    const file = codeFiles.get(path) || (repoData?.importantFiles || []).find(item => getPath(item) === path) || {};
    const layer = classifyLayer(path, file);

    return {
      id: `file:${path}`,
      path,
      name: fileName(path),
      folder: folderName(path),
      layer,
      color: LAYER_META[layer]?.color || '#94a3b8',
      type: 'file',
      functions: file.definitions?.functions?.length || 0,
      classes: file.definitions?.classes?.length || 0,
      apis: file.patterns?.apis || [],
      databases: file.patterns?.databases || [],
      securityIssues: file.security?.length || 0,
      size: file.size || path.length,
      importance: scoreFile(path, file, importantPaths),
      imports: extractImports(file.content),
      hasContent: Boolean(file.content)
    };
  }).sort((a, b) => b.importance - a.importance);
}

function buildDependencyRecords(repoData) {
  const dependencies = repoData?.packageJson?.dependencies || {};
  const devDependencies = repoData?.packageJson?.devDependencies || {};

  return [
    ...Object.entries(dependencies).map(([name, version]) => ({ name, version, dev: false })),
    ...Object.entries(devDependencies).map(([name, version]) => ({ name, version, dev: true }))
  ];
}

function makeClusterNode(id, label, group, count, color, rank) {
  return {
    id,
    type: 'cluster',
    data: {
      label,
      nodeType: 'cluster',
      group,
      count,
      color,
      rank
    }
  };
}

function makeFileNode(record) {
  return {
    id: record.id,
    type: 'architectureV2',
    data: {
      ...record,
      nodeType: 'file',
      label: record.name
    }
  };
}

function makeDependencyNode(dep, index) {
  return {
    id: `dep:${dep.name}`,
    type: 'architectureV2',
    data: {
      label: dep.name,
      path: dep.name,
      nodeType: 'dependency',
      layer: dep.dev ? 'dev dependency' : 'dependency',
      color: LAYER_META.dependency.color,
      version: dep.version,
      importance: Math.max(4, 18 - index),
      functions: 0,
      classes: 0,
      securityIssues: 0
    }
  };
}

function edge(id, source, target, type, strength = 1, inferred = false) {
  return {
    id,
    source,
    target,
    type: 'architectureV2Edge',
    data: { relationship: type, strength, inferred }
  };
}

function filterRecords(records, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return records;
  return records.filter(record =>
    record.path.toLowerCase().includes(normalized) ||
    record.layer.toLowerCase().includes(normalized) ||
    record.name.toLowerCase().includes(normalized)
  );
}

export function buildArchitectureV2Graph({
  repoData,
  detailedArchitecture,
  codeAnalysis,
  viewMode = 'system',
  expandedGroups = [],
  searchQuery = '',
  maxNodes = 100
}) {
  if (!repoData) {
    return { nodes: [], edges: [], stats: null };
  }

  const expanded = new Set(expandedGroups);
  const allRecords = buildFileRecords(repoData, codeAnalysis);
  const records = filterRecords(allRecords, searchQuery);
  const dependencies = buildDependencyRecords(repoData);
  const visibleFiles = new Set();
  const nodes = [];
  const edges = [];
  const pathSet = new Set(allRecords.map(record => record.path));

  const addFileRecord = (record) => {
    if (nodes.length >= maxNodes) return;
    if (!visibleFiles.has(record.id)) {
      uniquePush(nodes, makeFileNode(record));
      visibleFiles.add(record.id);
    }
  };

  if (viewMode === 'dependencies') {
    const depCluster = makeClusterNode('cluster:deps', 'External Dependencies', 'dependencies', dependencies.length, LAYER_META.dependency.color, 0);
    uniquePush(nodes, depCluster);
    dependencies.slice(0, 35).forEach((dep, index) => {
      const depNode = makeDependencyNode(dep, index);
      uniquePush(nodes, depNode);
      edges.push(edge(`edge:deps:${dep.name}`, 'cluster:deps', depNode.id, dep.dev ? 'dev-depends-on' : 'depends-on', dep.dev ? 1 : 2, false));
    });
    records.slice(0, 35).forEach((record) => {
      if (record.imports.some(importPath => dependencies.some(dep => importPath === dep.name || importPath.startsWith(`${dep.name}/`)))) {
        addFileRecord(record);
        record.imports.forEach((importPath) => {
          const dep = dependencies.find(item => importPath === item.name || importPath.startsWith(`${item.name}/`));
          if (dep) edges.push(edge(`edge:${record.id}:dep:${dep.name}`, record.id, `dep:${dep.name}`, 'uses', 2, false));
        });
      }
    });
  } else {
    const groupKey = viewMode === 'modules' ? 'folder' : 'layer';
    const groups = new Map();
    records.forEach((record) => {
      const key = record[groupKey] || 'unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    });

    Array.from(groups.entries()).forEach(([group, groupRecords]) => {
      const layer = groupKey === 'layer' ? group : groupRecords[0]?.layer;
      const meta = LAYER_META[layer] || { label: group, color: '#94a3b8', rank: 99 };
      const clusterId = `cluster:${viewMode}:${group}`;
      uniquePush(nodes, makeClusterNode(clusterId, groupKey === 'layer' ? meta.label : group, group, groupRecords.length, meta.color, meta.rank));

      const shouldExpand = expanded.has(group) || searchQuery.trim();
      const limit = shouldExpand ? 14 : viewMode === 'flow' ? 4 : 3;
      groupRecords.slice(0, limit).forEach((record) => {
        addFileRecord(record);
        edges.push(edge(`edge:${clusterId}:${record.id}`, clusterId, record.id, 'contains', 1, false));
      });
    });

    if (viewMode === 'flow') {
      const flowLayers = ['entry', 'ui', 'api', 'service', 'data'];
      for (let index = 0; index < flowLayers.length - 1; index += 1) {
        const source = `cluster:${viewMode}:${flowLayers[index]}`;
        const target = `cluster:${viewMode}:${flowLayers[index + 1]}`;
        if (nodes.some(node => node.id === source) && nodes.some(node => node.id === target)) {
          edges.push(edge(`edge:flow:${flowLayers[index]}:${flowLayers[index + 1]}`, source, target, 'inferred-flow', 3, true));
        }
      }
    }
  }

  allRecords.forEach((record) => {
    if (!visibleFiles.has(record.id)) return;
    record.imports.forEach((importPath) => {
      const targetPath = resolveLocalImport(record.path, importPath, pathSet);
      const targetRecord = allRecords.find(item => item.path === targetPath);
      if (targetRecord && visibleFiles.has(targetRecord.id)) {
        uniquePush(edges, edge(`edge:import:${record.id}:${targetRecord.id}`, record.id, targetRecord.id, 'imports', 2, false));
      }
    });
  });

  const componentCount = detailedArchitecture?.components?.length || 0;
  const endpointCount = detailedArchitecture?.apiEndpoints?.length || 0;

  return {
    nodes,
    edges,
    stats: {
      totalFiles: allRecords.length,
      visibleNodes: nodes.length,
      visibleEdges: edges.length,
      dependencies: dependencies.length,
      components: componentCount,
      endpoints: endpointCount,
      securityIssues: countSecurityIssues(codeAnalysis),
      analyzedFiles: codeAnalysis?.summary?.analyzedFiles || 0,
      architecturePattern: detailedArchitecture?.patterns?.architecture || codeAnalysis?.summary?.patterns?.[0] || 'Detected from repository structure'
    }
  };
}

export { LAYER_META };
