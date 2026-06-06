const CODE_EXTENSIONS = /\.(js|jsx|ts|tsx|py|go|java|rb|php|cs|rs|swift|kt)$/i;
const STYLE_EXTENSIONS = /\.(css|scss|sass|less)$/i;
const CONFIG_EXTENSIONS = /\.(json|yml|yaml|toml|env|config|lock)$/i;

const LAYER_META = {
  entry: { label: 'Entry Points', color: '#7aa7ff', rank: 0 },
  ui: { label: 'Interface', color: '#8fd3ff', rank: 1 },
  api: { label: 'API Boundary', color: '#78f0c4', rank: 2 },
  service: { label: 'Application Services', color: '#f8d47a', rank: 3 },
  data: { label: 'Data Layer', color: '#ff9f6e', rank: 4 },
  utility: { label: 'Shared Utilities', color: '#b8c0cc', rank: 5 },
  config: { label: 'Configuration', color: '#f0a1ff', rank: 6 },
  test: { label: 'Quality', color: '#c7a7ff', rank: 7 },
  style: { label: 'Styling', color: '#6ee7f9', rank: 8 },
  docs: { label: 'Documentation', color: '#e5e7eb', rank: 9 },
  external: { label: 'External Systems', color: '#ffb4b4', rank: 10 },
  platform: { label: 'Runtime Platform', color: '#a7f3d0', rank: 11 },
  technology: { label: 'Technology', color: '#d6d3d1', rank: 12 }
};

const VIEW_TITLES = {
  overview: 'Architecture overview',
  'system-context': 'System context',
  containers: 'Runtime containers',
  modules: 'Module map',
  'runtime-flow': 'Runtime flow',
  'tech-stack': 'Technology stack'
};

function getPath(file) {
  return typeof file === 'string' ? file : file?.path;
}

function fileName(path = '') {
  return path.split('/').pop() || path || 'Unknown';
}

function folderName(path = '') {
  const parts = path.split('/').filter(Boolean);
  return parts.length > 1 ? parts[0] : 'root';
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean).map(value => String(value).trim()).filter(Boolean)));
}

function sanitizeId(value) {
  return String(value || 'item').toLowerCase().replace(/[^a-z0-9:_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function classifyLayer(path, file = {}) {
  const lower = path.toLowerCase();
  const apiCount = file.patterns?.apis?.length || 0;
  const dbCount = file.patterns?.databases?.length || 0;

  if (/(\b|\/)(index|main|app|server|cli)\.(js|jsx|ts|tsx|py)$/i.test(path)) return 'entry';
  if (lower.includes('__test__') || lower.includes('.test.') || lower.includes('.spec.') || lower.includes('/test')) return 'test';
  if (lower.includes('/components/') || lower.includes('/pages/') || lower.includes('/views/') || /\.(jsx|tsx|vue)$/i.test(path)) return 'ui';
  if (lower.includes('/api/') || lower.includes('/routes/') || lower.includes('/controllers/') || lower.endsWith('_routes.py') || apiCount > 0) return 'api';
  if (lower.includes('/services/') || lower.includes('/lib/') || lower.includes('/application/') || lower.includes('_service')) return 'service';
  if (lower.includes('/models/') || lower.includes('/schema') || lower.includes('/database') || lower.includes('/db/') || dbCount > 0) return 'data';
  if (lower.includes('/utils/') || lower.includes('/helpers/') || lower.includes('/hooks/')) return 'utility';
  if (lower.endsWith('.md') || lower.includes('readme') || lower.includes('/docs/')) return 'docs';
  if (STYLE_EXTENSIONS.test(path)) return 'style';
  if (CONFIG_EXTENSIONS.test(path) || lower.includes('/config/') || lower.includes('.github/') || lower.includes('dockerfile')) return 'config';
  return CODE_EXTENSIONS.test(path) ? 'service' : 'utility';
}

function countSecurityIssues(codeAnalysis) {
  const security = codeAnalysis?.security || {};
  return ['critical', 'high', 'medium', 'low'].reduce((total, severity) => total + safeArray(security[severity]).length, 0);
}

function scoreFile(path, file = {}, importantPaths = new Set()) {
  let score = 1;
  const layer = classifyLayer(path, file);
  if (importantPaths.has(path)) score += 22;
  if (layer === 'entry') score += 20;
  if (layer === 'api') score += 16;
  if (layer === 'service') score += 12;
  if (layer === 'data') score += 12;
  if (layer === 'config') score += 8;
  if (file.patterns?.apis?.length) score += file.patterns.apis.length * 8;
  if (file.patterns?.databases?.length) score += file.patterns.databases.length * 8;
  score += safeArray(file.definitions?.functions).length * 2;
  score += safeArray(file.definitions?.classes).length * 3;
  score += safeArray(file.security).length * 8;
  return score;
}

function buildFileRecords(repoData, codeAnalysis) {
  const codeFiles = new Map(safeArray(codeAnalysis?.files).map(file => [file.path, file]));
  const importantFiles = safeArray(repoData?.importantFiles);
  const importantPaths = new Set(importantFiles.map(getPath).filter(Boolean));
  const paths = new Set([
    ...safeArray(repoData?.fileTree).map(getPath).filter(Boolean),
    ...safeArray(repoData?.fileStructure).map(getPath).filter(Boolean),
    ...importantFiles.map(getPath).filter(Boolean),
    ...safeArray(codeAnalysis?.files).map(getPath).filter(Boolean)
  ]);

  return Array.from(paths).map((path) => {
    const file = codeFiles.get(path) || importantFiles.find(item => getPath(item) === path) || {};
    const layer = classifyLayer(path, file);
    return {
      path,
      name: fileName(path),
      folder: folderName(path),
      layer,
      color: LAYER_META[layer]?.color || LAYER_META.utility.color,
      functions: safeArray(file.definitions?.functions).length,
      classes: safeArray(file.definitions?.classes).length,
      apis: safeArray(file.patterns?.apis),
      databases: safeArray(file.patterns?.databases),
      securityIssues: safeArray(file.security).length,
      size: file.size || path.length,
      importance: scoreFile(path, file, importantPaths)
    };
  }).sort((a, b) => b.importance - a.importance);
}

function buildDependencyRecords(repoData) {
  const packageJson = repoData?.packageJson && typeof repoData.packageJson === 'object' ? repoData.packageJson : {};
  const buckets = [
    ['runtime', packageJson.dependencies],
    ['development', packageJson.devDependencies],
    ['peer', packageJson.peerDependencies],
    ['optional', packageJson.optionalDependencies],
  ];

  return buckets.flatMap(([kind, bucket]) => (
    Object.entries(bucket || {}).map(([name, version]) => ({ name, version, kind }))
  ));
}

function normalizeTechStack(techStack) {
  if (!techStack || typeof techStack !== 'object') return {};
  return Object.fromEntries(
    Object.entries(techStack)
      .map(([key, value]) => [key, unique(Array.isArray(value) ? value : [value])])
      .filter(([, list]) => list.length > 0)
  );
}

function getRepoName(repoData) {
  return (
    repoData?.repoInfo?.full_name ||
    repoData?.repoInfo?.name ||
    repoData?.repository?.full_name ||
    repoData?.repository?.name ||
    repoData?.name ||
    'Repository'
  );
}

function getRepoDescription(repoData) {
  const readme = typeof repoData?.readme === 'string' ? repoData.readme : '';
  const firstReadmeLine = readme
    .split('\n')
    .map(line => line.replace(/^#+\s*/, '').trim())
    .find(line => line && line.length > 20 && line.length < 220);

  return (
    repoData?.repoInfo?.description ||
    repoData?.repository?.description ||
    firstReadmeLine ||
    'Repository architecture inferred from analyzed files, manifests, and dependency evidence.'
  );
}

function sourceFiles(records, limit = 6) {
  return records.slice(0, limit).map(record => record.path);
}

function makeNode(id, options = {}) {
  const layer = options.layer || 'utility';
  return {
    id,
    type: options.type || 'architectureV2',
    data: {
      label: options.label || id,
      path: options.path || '',
      description: options.description || '',
      nodeType: options.nodeType || 'architecture',
      architectureType: options.architectureType || 'Component',
      layer,
      color: options.color || LAYER_META[layer]?.color || LAYER_META.utility.color,
      confidence: options.confidence || 'medium',
      evidence: unique(options.evidence || []),
      sourceFiles: unique(options.sourceFiles || []),
      technology: options.technology || '',
      group: options.group || '',
      action: options.action || '',
      expanded: Boolean(options.expanded),
      hiddenCount: options.hiddenCount || 0,
      totalItems: options.totalItems || 0,
      count: options.count || 0,
      externalBoundary: Boolean(options.externalBoundary),
      compact: Boolean(options.compact),
      functions: options.functions || 0,
      classes: options.classes || 0,
      securityIssues: options.securityIssues || 0,
      importance: options.importance || 0
    },
    position: { x: 0, y: 0 }
  };
}

function edge(id, source, target, relationship, strength = 1, inferred = false) {
  return {
    id,
    source,
    target,
    type: 'architectureV2Edge',
    data: {
      relationship,
      strength,
      inferred,
      showLabel: true
    }
  };
}

function recordsForLayer(records, layer) {
  return records.filter(record => record.layer === layer);
}

function detectExternalServices({ records, dependencies, techStack, repoData }) {
  const depNames = dependencies.map(dep => dep.name.toLowerCase());
  const techNames = Object.values(techStack).flat().map(item => item.toLowerCase());
  const envNames = safeArray(repoData?.envVariables)
    .map(item => (typeof item === 'string' ? item : item?.name || item?.key || ''))
    .filter(Boolean)
    .map(item => item.toLowerCase());
  const paths = records.map(record => record.path.toLowerCase());

  const specs = [
    { id: 'github', label: 'GitHub', category: 'Source and API', pattern: /github|octokit|gh_/, layer: 'platform' },
    { id: 'ai', label: 'AI Providers', category: 'Model APIs', pattern: /openai|groq|gemini|anthropic|llm/, layer: 'external' },
    { id: 'youtube', label: 'YouTube API', category: 'External content API', pattern: /youtube|yt-dlp|googleapis/, layer: 'external' },
    { id: 'database', label: 'Database Services', category: 'Persistence', pattern: /postgres|mongodb|mysql|sqlite|redis|supabase|database|db_/, layer: 'data' },
    { id: 'vercel', label: 'Vercel / Serverless', category: 'Deployment', pattern: /vercel|serverless/, layer: 'platform' },
    { id: 'docker', label: 'Docker Runtime', category: 'Runtime packaging', pattern: /docker|container/, layer: 'platform' },
    { id: 'ci', label: 'CI Workflows', category: 'Delivery', pattern: /github\/workflows|actions|circleci|ci\.yml|ci\.yaml/, layer: 'platform' }
  ];

  return specs.flatMap((spec) => {
    const evidence = [];
    if (depNames.some(name => spec.pattern.test(name))) evidence.push('package dependency');
    if (techNames.some(name => spec.pattern.test(name))) evidence.push('technology detection');
    if (envNames.some(name => spec.pattern.test(name))) evidence.push('environment variable name');
    if (paths.some(path => spec.pattern.test(path))) evidence.push('repository file path');
    if (evidence.length === 0) return [];

    return [{
      id: `external:${spec.id}`,
      label: spec.label,
      category: spec.category,
      layer: spec.layer,
      evidence
    }];
  });
}

function detectContainers({ records, dependencies, techStack, repoData }) {
  const ui = [...recordsForLayer(records, 'ui'), ...recordsForLayer(records, 'style')];
  const api = recordsForLayer(records, 'api');
  const entry = recordsForLayer(records, 'entry');
  const services = recordsForLayer(records, 'service');
  const data = recordsForLayer(records, 'data');
  const config = recordsForLayer(records, 'config');
  const tests = recordsForLayer(records, 'test');
  const docs = recordsForLayer(records, 'docs');
  const externals = detectExternalServices({ records, dependencies, techStack, repoData });
  const hasFrontendTech = safeArray(techStack.frontend).length > 0;
  const hasBackendTech = safeArray(techStack.backend).length > 0 || dependencies.some(dep => /express|fastapi|flask|django|next|react|vite/.test(dep.name.toLowerCase()));
  const hasDataTech = ['database', 'orm', 'cache', 'messageQueue'].some(key => safeArray(techStack[key]).length > 0);

  const containers = [];

  if (ui.length || hasFrontendTech) {
    containers.push({
      id: 'container:interface',
      label: 'Interface Surface',
      architectureType: 'Container',
      layer: 'ui',
      description: 'User-facing screens, views, components, and styling assets.',
      evidence: [ui.length ? `${ui.length} interface/style files` : null, hasFrontendTech ? 'frontend technology detected' : null],
      sourceFiles: sourceFiles(ui),
      technology: safeArray(techStack.frontend).slice(0, 4).join(', '),
      count: ui.length,
      confidence: ui.length ? 'high' : 'medium'
    });
  }

  if (api.length || entry.length || hasBackendTech) {
    containers.push({
      id: 'container:application',
      label: 'Application / API Runtime',
      architectureType: 'Container',
      layer: 'api',
      description: 'Entrypoints, routes, controllers, or server runtime handling requests.',
      evidence: [entry.length ? `${entry.length} entrypoint files` : null, api.length ? `${api.length} API boundary files` : null, hasBackendTech ? 'backend runtime detected' : null],
      sourceFiles: sourceFiles([...entry, ...api]),
      technology: safeArray(techStack.backend).slice(0, 4).join(', '),
      count: entry.length + api.length,
      confidence: (api.length || entry.length) ? 'high' : 'medium'
    });
  }

  if (services.length) {
    containers.push({
      id: 'container:services',
      label: 'Domain Services',
      architectureType: 'Container',
      layer: 'service',
      description: 'Business logic, orchestration, handlers, helpers, and integration code.',
      evidence: [`${services.length} service/application files`],
      sourceFiles: sourceFiles(services),
      count: services.length,
      confidence: 'high'
    });
  }

  if (data.length || hasDataTech) {
    containers.push({
      id: 'container:data',
      label: 'Persistence Boundary',
      architectureType: 'Container',
      layer: 'data',
      description: 'Models, database access, schemas, cache, or persistence-related files.',
      evidence: [data.length ? `${data.length} data-layer files` : null, hasDataTech ? 'database/cache technology detected' : null],
      sourceFiles: sourceFiles(data),
      technology: ['database', 'orm', 'cache'].flatMap(key => safeArray(techStack[key])).slice(0, 4).join(', '),
      count: data.length,
      confidence: data.length ? 'high' : 'medium'
    });
  }

  if (config.length) {
    containers.push({
      id: 'container:platform',
      label: 'Delivery / Runtime Config',
      architectureType: 'Container',
      layer: 'platform',
      description: 'Deployment, CI, Docker, runtime configuration, and environment scaffolding.',
      evidence: [`${config.length} config/platform files`],
      sourceFiles: sourceFiles(config),
      count: config.length,
      confidence: 'high'
    });
  }

  if (tests.length || docs.length) {
    containers.push({
      id: 'container:quality',
      label: 'Quality and Knowledge Base',
      architectureType: 'Supporting Container',
      layer: 'test',
      description: 'Tests, docs, examples, and onboarding material that support delivery.',
      evidence: [tests.length ? `${tests.length} test files` : null, docs.length ? `${docs.length} documentation files` : null],
      sourceFiles: sourceFiles([...tests, ...docs]),
      count: tests.length + docs.length,
      confidence: 'medium'
    });
  }

  if (externals.length) {
    containers.push({
      id: 'container:external',
      label: 'External Integrations',
      architectureType: 'External Boundary',
      layer: 'external',
      description: 'Services and APIs detected through dependencies, environment names, or file paths.',
      evidence: externals.flatMap(service => service.evidence.map(item => `${service.label}: ${item}`)).slice(0, 6),
      sourceFiles: [],
      count: externals.length,
      confidence: 'medium',
      externalBoundary: true
    });
  }

  return containers;
}

function buildCommonContext(repoData, detailedArchitecture, codeAnalysis) {
  const records = buildFileRecords(repoData, codeAnalysis);
  const dependencies = buildDependencyRecords(repoData);
  const techStack = normalizeTechStack(repoData?.techStack || {});
  const externals = detectExternalServices({ records, dependencies, techStack, repoData });
  const containers = detectContainers({ records, dependencies, techStack, repoData });

  return {
    repoName: getRepoName(repoData),
    repoDescription: getRepoDescription(repoData),
    records,
    dependencies,
    techStack,
    externals,
    containers,
    totalFiles: records.length,
    securityIssues: countSecurityIssues(codeAnalysis),
    componentCount: safeArray(detailedArchitecture?.components).length,
    endpointCount: safeArray(detailedArchitecture?.apiEndpoints).length,
    architecturePattern: detailedArchitecture?.patterns?.architecture || codeAnalysis?.summary?.patterns?.[0] || 'Inferred from repository structure',
    analyzedFiles: codeAnalysis?.summary?.analyzedFiles || 0
  };
}

function buildStats(context, viewMode, nodes, edges) {
  return {
    totalFiles: context.totalFiles,
    visibleNodes: nodes.length,
    visibleEdges: edges.length,
    dependencies: context.dependencies.length,
    components: context.componentCount || context.containers.length,
    endpoints: context.endpointCount,
    securityIssues: context.securityIssues,
    analyzedFiles: context.analyzedFiles,
    externalServices: context.externals.length,
    architecturePattern: context.architecturePattern,
    viewTitle: VIEW_TITLES[viewMode] || 'Architecture map'
  };
}

function buildOverview(context) {
  const nodes = [
    makeNode('system:repo', {
      label: context.repoName,
      architectureType: 'Software System',
      layer: 'entry',
      description: context.repoDescription,
      confidence: 'high',
      evidence: [
        `${context.totalFiles} repository files`,
        context.dependencies.length ? `${context.dependencies.length} package dependencies` : null,
        context.architecturePattern
      ],
      sourceFiles: sourceFiles(context.records, 8),
      count: context.totalFiles,
      importance: 100
    })
  ];
  const edges = [];

  context.containers.slice(0, 6).forEach((container) => {
    nodes.push(makeNode(container.id, container));
    edges.push(edge(`overview:${container.id}`, 'system:repo', container.id, 'contains', 2, false));
  });

  return { nodes, edges };
}

function buildSystemContext(context) {
  const nodes = [
    makeNode('actor:developer', {
      label: 'Developers / Operators',
      architectureType: 'Actor',
      layer: 'entry',
      description: 'People using, running, or maintaining this repository.',
      confidence: 'medium',
      evidence: ['standard system-context actor'],
      importance: 70
    }),
    makeNode('system:repo', {
      label: context.repoName,
      architectureType: 'Software System',
      layer: 'api',
      description: context.repoDescription,
      confidence: 'high',
      evidence: [`${context.totalFiles} files analyzed`, context.architecturePattern],
      sourceFiles: sourceFiles(context.records, 8),
      count: context.totalFiles,
      importance: 100
    })
  ];
  const edges = [edge('context:actor-system', 'actor:developer', 'system:repo', 'uses / maintains', 3, true)];

  const dataContainer = context.containers.find(container => container.id === 'container:data');
  if (dataContainer) {
    nodes.push(makeNode('boundary:data', {
      ...dataContainer,
      id: undefined,
      label: 'Data Boundary',
      architectureType: 'Internal Boundary'
    }));
    edges.push(edge('context:system-data', 'system:repo', 'boundary:data', 'reads / writes', 2, true));
  }

  context.externals.slice(0, 7).forEach((service) => {
    const id = `context:${service.id}`;
    nodes.push(makeNode(id, {
      label: service.label,
      architectureType: 'External System',
      layer: service.layer,
      description: service.category,
      confidence: 'medium',
      evidence: service.evidence,
      externalBoundary: true,
      importance: 60
    }));
    edges.push(edge(`context:system-${service.id}`, 'system:repo', id, service.layer === 'data' ? 'stores data' : 'integrates with', 2, true));
  });

  if (nodes.length === 2) {
    const platform = context.containers.find(container => container.id === 'container:platform');
    if (platform) {
      nodes.push(makeNode('context:platform', platform));
      edges.push(edge('context:system-platform', 'system:repo', 'context:platform', 'runs on', 2, true));
    }
  }

  return { nodes, edges };
}

function buildContainers(context) {
  const nodes = context.containers.map(container => makeNode(container.id, container));
  const ids = new Set(nodes.map(node => node.id));
  const edges = [];
  const connect = (source, target, label, strength = 2) => {
    if (ids.has(source) && ids.has(target)) {
      edges.push(edge(`container:${source}:${target}`, source, target, label, strength, true));
    }
  };

  connect('container:interface', 'container:application', 'requests', 3);
  connect('container:application', 'container:services', 'delegates', 3);
  connect('container:services', 'container:data', 'reads / writes', 2);
  connect('container:application', 'container:data', 'persists', 2);
  connect('container:services', 'container:external', 'calls', 2);
  connect('container:application', 'container:external', 'integrates', 2);
  connect('container:platform', 'container:application', 'deploys', 1);
  connect('container:quality', 'container:application', 'validates', 1);

  return { nodes, edges };
}

function buildModules(context, repoData) {
  const folderGroups = new Map();
  context.records.forEach((record) => {
    if (!folderGroups.has(record.folder)) folderGroups.set(record.folder, []);
    folderGroups.get(record.folder).push(record);
  });

  const groups = Array.from(folderGroups.entries())
    .map(([folder, records]) => ({
      folder,
      records: records.sort((a, b) => b.importance - a.importance),
      importance: records.reduce((sum, record) => sum + record.importance, 0)
    }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 14);

  const nodes = groups.map((group) => {
    const primaryLayer = group.records
      .map(record => record.layer)
      .sort((a, b) => safeArray(group.records.filter(record => record.layer === b)).length - safeArray(group.records.filter(record => record.layer === a)).length)[0] || 'service';
    return makeNode(`module:${sanitizeId(group.folder)}`, {
      type: 'cluster',
      label: group.folder,
      architectureType: 'Module Cluster',
      layer: primaryLayer,
      description: `Top-level code area with ${group.records.length} files. Representative files are shown as evidence, not as a raw dependency graph.`,
      confidence: 'high',
      evidence: [`${group.records.length} files in ${group.folder}`, `${LAYER_META[primaryLayer]?.label || primaryLayer} dominant layer`],
      sourceFiles: sourceFiles(group.records, 8),
      count: group.records.length,
      importance: group.importance
    });
  });

  const moduleIds = new Set(nodes.map(node => node.id));
  const pathToFolder = new Map(context.records.map(record => [record.path, record.folder]));
  const graphNodes = new Map(safeArray(repoData?.dependencyGraph?.nodes).map(node => [node.id, node.path || node.id.replace(/^file:/, '')]));
  const aggregate = new Map();

  safeArray(repoData?.dependencyGraph?.edges).forEach((item) => {
    const sourcePath = graphNodes.get(item.source) || item.source?.replace(/^file:/, '');
    const targetPath = graphNodes.get(item.target) || item.target?.replace(/^file:/, '');
    const sourceFolder = pathToFolder.get(sourcePath);
    const targetFolder = pathToFolder.get(targetPath);
    if (!sourceFolder || !targetFolder || sourceFolder === targetFolder) return;
    const sourceId = `module:${sanitizeId(sourceFolder)}`;
    const targetId = `module:${sanitizeId(targetFolder)}`;
    if (!moduleIds.has(sourceId) || !moduleIds.has(targetId)) return;
    const key = `${sourceId}->${targetId}`;
    aggregate.set(key, (aggregate.get(key) || 0) + 1);
  });

  const edges = Array.from(aggregate.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 26)
    .map(([key, count]) => {
      const [source, target] = key.split('->');
      return edge(`module:${source}:${target}`, source, target, `${count} imports`, Math.min(4, 1 + count / 4), false);
    });

  if (edges.length === 0) {
    const ordered = nodes
      .slice()
      .sort((a, b) => (LAYER_META[a.data.layer]?.rank || 99) - (LAYER_META[b.data.layer]?.rank || 99));
    for (let index = 0; index < ordered.length - 1 && index < 8; index += 1) {
      edges.push(edge(`module:inferred:${ordered[index].id}:${ordered[index + 1].id}`, ordered[index].id, ordered[index + 1].id, 'likely flow', 1, true));
    }
  }

  return { nodes, edges };
}

function buildRuntimeFlow(context) {
  const stages = [
    {
      id: 'flow:request',
      label: 'Request / Command',
      architectureType: 'Flow Start',
      layer: 'entry',
      description: 'External user, developer action, scheduled job, or command entering the system.',
      evidence: ['inferred runtime boundary'],
      confidence: 'medium'
    },
    {
      id: 'flow:entry',
      label: 'Entrypoint',
      architectureType: 'Runtime Stage',
      layer: 'entry',
      records: recordsForLayer(context.records, 'entry'),
      description: 'Application start file, CLI, server bootstrap, or primary route entrypoint.'
    },
    {
      id: 'flow:api',
      label: 'API / Route Boundary',
      architectureType: 'Runtime Stage',
      layer: 'api',
      records: recordsForLayer(context.records, 'api'),
      description: 'Request handling layer that maps inputs to application behavior.'
    },
    {
      id: 'flow:services',
      label: 'Service Orchestration',
      architectureType: 'Runtime Stage',
      layer: 'service',
      records: recordsForLayer(context.records, 'service'),
      description: 'Business logic and integration handlers coordinate the operation.'
    },
    {
      id: 'flow:data',
      label: 'Data / Model Boundary',
      architectureType: 'Runtime Stage',
      layer: 'data',
      records: recordsForLayer(context.records, 'data'),
      description: 'Models, persistence, cache, or database adapter layer.'
    },
    {
      id: 'flow:external',
      label: 'External Integrations',
      architectureType: 'Runtime Stage',
      layer: 'external',
      records: [],
      description: 'Detected external API calls or managed services.',
      evidence: context.externals.map(service => service.label),
      confidence: context.externals.length ? 'medium' : 'low',
      includeWhenEmpty: context.externals.length > 0,
      externalBoundary: true
    },
    {
      id: 'flow:response',
      label: 'Result / Side Effect',
      architectureType: 'Flow End',
      layer: 'platform',
      description: 'The system returns output, writes state, or triggers a downstream effect.',
      evidence: ['inferred runtime boundary'],
      confidence: 'medium'
    }
  ];

  const activeStages = stages.filter(stage => (
    stage.id === 'flow:request' ||
    stage.id === 'flow:response' ||
    stage.includeWhenEmpty ||
    safeArray(stage.records).length > 0
  ));

  const nodes = activeStages.map((stage) => {
    const records = safeArray(stage.records).sort((a, b) => b.importance - a.importance);
    return makeNode(stage.id, {
      label: stage.label,
      architectureType: stage.architectureType,
      layer: stage.layer,
      description: records[0]?.path ? `${stage.description} Primary evidence: ${records[0].path}` : stage.description,
      confidence: stage.confidence || (records.length ? 'high' : 'medium'),
      evidence: stage.evidence || (records.length ? [`${records.length} ${LAYER_META[stage.layer]?.label || stage.layer} files`] : ['inferred from repository structure']),
      sourceFiles: sourceFiles(records, 5),
      count: records.length,
      externalBoundary: stage.externalBoundary,
      importance: records.reduce((sum, record) => sum + record.importance, 0)
    });
  });

  const edges = [];
  for (let index = 0; index < nodes.length - 1; index += 1) {
    const source = nodes[index];
    const target = nodes[index + 1];
    const label = index === 0 ? 'enters' : target.id === 'flow:response' ? 'returns' : 'passes to';
    edges.push(edge(`flow:${source.id}:${target.id}`, source.id, target.id, label, 3, true));
  }

  return { nodes, edges };
}

function buildTechStack(context, expandedGroups = []) {
  const categoryLabels = {
    ai: 'AI',
    aiProviders: 'AI Providers',
    authentication: 'Authentication',
    backend: 'Backend',
    cache: 'Cache',
    database: 'Database',
    dependencies: 'Dependencies',
    deployment: 'Deployment',
    devops: 'DevOps',
    frontend: 'Frontend',
    llm: 'LLM',
    messageQueue: 'Message Queue',
    orm: 'ORM',
    storage: 'Storage',
    testing: 'Testing',
    tooling: 'Tooling'
  };
  const orderedKeys = [
    'frontend',
    'backend',
    'database',
    'storage',
    'orm',
    'cache',
    'messageQueue',
    'authentication',
    'ai',
    'aiProviders',
    'llm',
    'testing',
    'devops',
    'deployment',
    'tooling',
    'dependencies'
  ];

  const expandedSet = new Set(safeArray(expandedGroups).map(group => sanitizeId(group)));
  const dependencies = context.dependencies.map(dep => dep.name);
  const categories = {
    ...context.techStack,
    dependencies
  };
  const keys = unique([...orderedKeys.filter(key => safeArray(categories[key]).length), ...Object.keys(categories)]);
  const nodes = [];
  const edges = [];
  const categoryIdByKey = new Map();
  const containsEdge = (id, source, target, inferred = false) => {
    const item = edge(id, source, target, 'contains', 1, inferred);
    return {
      ...item,
      sourceHandle: 'bottom',
      targetHandle: 'top',
      data: {
        ...item.data,
        containment: true,
        showLabel: false
      }
    };
  };

  keys.forEach((key) => {
    const allItems = unique(categories[key] || []);
    const groupKey = sanitizeId(key);
    const isExpanded = expandedSet.has(groupKey);
    const visibleLimit = isExpanded ? 12 : 4;
    const hasOverflow = allItems.length > visibleLimit;
    const items = hasOverflow
      ? allItems.slice(0, Math.max(1, visibleLimit - 1))
      : allItems.slice(0, visibleLimit);
    if (!items.length) return;

    const clusterId = `tech:${groupKey}`;
    categoryIdByKey.set(key, clusterId);
    nodes.push(makeNode(clusterId, {
      type: 'cluster',
      label: categoryLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase()),
      architectureType: 'Technology Category',
      layer: 'technology',
      description: key === 'dependencies'
        ? 'Representative package dependencies from the manifest.'
        : 'Technology category detected from repository analysis.',
      evidence: [key === 'dependencies' ? `${context.dependencies.length} package dependencies indexed` : `${allItems.length} detected technologies`],
      count: key === 'dependencies' ? context.dependencies.length : allItems.length,
      confidence: key === 'dependencies' ? 'high' : 'medium',
      group: groupKey,
      expanded: isExpanded,
      hiddenCount: Math.max(0, allItems.length - items.length),
      totalItems: allItems.length
    }));

    const stackNodeIds = [];
    items.forEach((item, index) => {
      const dep = context.dependencies.find(candidate => candidate.name === item);
      const nodeId = `tech:${sanitizeId(key)}:${sanitizeId(item)}:${index}`;
      stackNodeIds.push(nodeId);
      nodes.push(makeNode(nodeId, {
        label: item,
        architectureType: key === 'dependencies' ? 'Package' : 'Technology',
        layer: 'technology',
        description: dep?.version ? `Package version ${dep.version}` : `Detected in ${key}`,
        evidence: [key === 'dependencies' ? `${dep?.kind || 'package'} dependency` : 'technology detection'],
        technology: key,
        group: groupKey,
        confidence: key === 'dependencies' ? 'high' : 'medium',
        compact: true
      }));
    });

    const hiddenCount = allItems.length - items.length;
    if (hiddenCount > 0) {
      const moreNodeId = `tech:${sanitizeId(key)}:more`;
      stackNodeIds.push(moreNodeId);
      nodes.push(makeNode(moreNodeId, {
        label: `+${hiddenCount} more`,
        architectureType: 'Technology',
        layer: 'technology',
        description: `Additional ${key === 'dependencies' ? 'packages' : 'technologies'} detected in this category.`,
        evidence: [`${hiddenCount} additional signals hidden for readability`],
        technology: key,
        group: groupKey,
        action: 'toggle-tech-group',
        hiddenCount,
        confidence: 'medium',
        compact: true
      }));
    }

    [clusterId, ...stackNodeIds].forEach((sourceId, index, stackIds) => {
      const targetId = stackIds[index + 1];
      if (!targetId) return;
      edges.push(containsEdge(`tech:${sourceId}:${targetId}`, sourceId, targetId, targetId.endsWith(':more')));
    });
  });

  const firstCategoryId = (...candidates) => {
    const key = candidates.find(candidate => categoryIdByKey.has(candidate));
    return key ? categoryIdByKey.get(key) : null;
  };
  const connect = (sourceKeys, targetKeys, relationship, strength = 2) => {
    const source = firstCategoryId(...sourceKeys);
    const target = firstCategoryId(...targetKeys);
    if (!source || !target || source === target) return;
    edges.push(edge(`tech:relationship:${source}:${target}:${sanitizeId(relationship)}`, source, target, relationship, strength, true));
  };

  connect(['frontend'], ['backend'], 'calls API', 3);
  connect(['backend'], ['database', 'storage', 'orm', 'cache'], 'persists state', 3);
  connect(['backend'], ['authentication'], 'uses auth', 2);
  connect(['backend'], ['ai', 'aiProviders', 'llm'], 'calls models', 2);
  connect(['testing'], ['frontend'], 'validates UI', 1);
  connect(['testing'], ['backend'], 'validates API', 1);
  connect(['devops', 'deployment', 'tooling'], ['frontend'], 'builds', 1);
  connect(['devops', 'deployment', 'tooling'], ['backend'], 'deploys', 1);

  return { nodes, edges };
}

function nodeMatches(node, query) {
  if (!query) return true;
  const data = node.data || {};
  const haystack = [
    data.label,
    data.path,
    data.description,
    data.architectureType,
    data.layer,
    data.technology,
    ...safeArray(data.evidence),
    ...safeArray(data.sourceFiles)
  ].join(' ').toLowerCase();
  return haystack.includes(query);
}

function applySearch(nodes, edges, searchQuery) {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return { nodes, edges };

  const matchingIds = new Set(nodes.filter(node => nodeMatches(node, query)).map(node => node.id));
  edges.forEach((item) => {
    if (matchingIds.has(item.source)) matchingIds.add(item.target);
    if (matchingIds.has(item.target)) matchingIds.add(item.source);
  });

  return {
    nodes: nodes.filter(node => matchingIds.has(node.id)),
    edges: edges.filter(item => matchingIds.has(item.source) && matchingIds.has(item.target))
  };
}

function capTechStackGraph(nodes, edges, maxNodes) {
  const limit = Math.max(12, maxNodes || 96);
  if (nodes.length <= limit) return { nodes, edges };

  const categoryNodes = nodes.filter(node => node.data?.architectureType === 'Technology Category');
  if (!categoryNodes.length) return capGraph(nodes, edges, maxNodes);

  const keptIds = new Set();
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const categoryOrder = categoryNodes
    .slice()
    .sort((a, b) => (b.data?.totalItems || b.data?.count || 0) - (a.data?.totalItems || a.data?.count || 0));

  categoryOrder.slice(0, limit).forEach(node => keptIds.add(node.id));

  const childrenByGroup = new Map();
  nodes.forEach((node) => {
    const group = node.data?.group;
    if (!group || node.data?.architectureType === 'Technology Category') return;
    if (!childrenByGroup.has(group)) childrenByGroup.set(group, []);
    childrenByGroup.get(group).push(node);
  });

  let round = 0;
  while (keptIds.size < limit) {
    let addedThisRound = false;

    for (const category of categoryOrder) {
      if (keptIds.size >= limit) break;
      if (!keptIds.has(category.id)) continue;
      const group = category.data?.group || sanitizeId(category.id.replace(/^tech:/, ''));
      const children = childrenByGroup.get(group) || [];
      const child = children[round];
      if (child && !keptIds.has(child.id)) {
        keptIds.add(child.id);
        addedThisRound = true;
      }
    }

    if (!addedThisRound) break;
    round += 1;
  }

  const kept = nodes.filter(node => keptIds.has(node.id));
  return {
    nodes: kept,
    edges: edges.filter(item => keptIds.has(item.source) && keptIds.has(item.target) && nodeById.has(item.source) && nodeById.has(item.target))
  };
}

function capGraph(nodes, edges, maxNodes, viewMode) {
  if (viewMode === 'tech-stack') {
    return capTechStackGraph(nodes, edges, maxNodes);
  }

  const limit = Math.max(12, maxNodes || 96);
  if (nodes.length <= limit) return { nodes, edges };
  const kept = nodes
    .slice()
    .sort((a, b) => (b.data?.importance || b.data?.count || 0) - (a.data?.importance || a.data?.count || 0))
    .slice(0, limit);
  const keptIds = new Set(kept.map(node => node.id));
  return {
    nodes: kept,
    edges: edges.filter(item => keptIds.has(item.source) && keptIds.has(item.target))
  };
}

export function buildArchitectureV2Graph({
  repoData,
  detailedArchitecture,
  codeAnalysis,
  viewMode = 'overview',
  expandedGroups = [],
  searchQuery = '',
  maxNodes = 96
}) {
  if (!repoData) {
    return { nodes: [], edges: [], stats: null };
  }

  const context = buildCommonContext(repoData, detailedArchitecture, codeAnalysis);
  let graph;

  switch (viewMode) {
    case 'system-context':
      graph = buildSystemContext(context);
      break;
    case 'containers':
      graph = buildContainers(context);
      break;
    case 'modules':
      graph = buildModules(context, repoData);
      break;
    case 'runtime-flow':
      graph = buildRuntimeFlow(context);
      break;
    case 'tech-stack':
      graph = buildTechStack(context, expandedGroups);
      break;
    case 'overview':
    default:
      graph = buildOverview(context);
      break;
  }

  const searched = applySearch(graph.nodes, graph.edges, searchQuery);
  const capped = capGraph(searched.nodes, searched.edges, maxNodes, viewMode);

  return {
    nodes: capped.nodes,
    edges: capped.edges,
    stats: buildStats(context, viewMode, capped.nodes, capped.edges)
  };
}

export { LAYER_META };
