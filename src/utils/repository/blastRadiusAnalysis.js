/**
 * Blast Radius Analysis
 * Calculates impact of changes based on dependency graph
 */

import { calculateBlastRadius as calculateGraphBlastRadius } from './calculateBlastRadius.js';

const EMPTY_BLAST_RADIUS = {
  severity: 'low',
  impactedFiles: [],
  impactedServices: [],
  dependencyChains: [],
  totalImpact: 0,
  upstreamFiles: [],
  downstreamFiles: [],
  analysisMode: 'fallback',
  isLimited: false,
  coverage: null,
  direction: 'both',
  riskFactors: [],
  impactReasons: [],
  testRecommendations: [],
  rankedImpactedFiles: [],
  impactSummary: '',
  confidence: 'low',
  graphEvidence: null
};

const GRAPH_TRAVERSAL_OPTIONS = {
  maxDepth: 6,
  maxNodes: 120
};

const FALLBACK_RELATED_FILE_LIMIT = 25;
const VALID_DIRECTIONS = new Set(['both', 'upstream', 'downstream']);

function normalizeDirection(direction) {
  const normalized = typeof direction === 'string' ? direction.toLowerCase() : 'both';
  return VALID_DIRECTIONS.has(normalized) ? normalized : 'both';
}

function getPath(entry) {
  if (typeof entry === 'string') {
    return entry.trim();
  }
  if (typeof entry?.path === 'string') {
    return entry.path.trim();
  }
  return '';
}

function getEmptyBlastRadius(options = {}) {
  const direction = normalizeDirection(options.direction);
  return {
    ...EMPTY_BLAST_RADIUS,
    impactedFiles: [],
    impactedServices: [],
    dependencyChains: [],
    upstreamFiles: [],
    downstreamFiles: [],
    direction,
    riskFactors: [],
    impactReasons: [],
    testRecommendations: [],
    rankedImpactedFiles: [],
    impactSummary: 'No file selected or no repository files available.',
    confidence: 'low',
    graphEvidence: null
  };
}

function uniquePaths(paths) {
  return Array.from(new Set(paths.map(getPath).filter(Boolean)));
}

function getGraphNodeForPath(dependencyGraph, filePath) {
  if (!dependencyGraph || !Array.isArray(dependencyGraph.nodes)) {
    return null;
  }

  return dependencyGraph.nodes.find(node => (
    node?.path === filePath ||
    node?.id === filePath ||
    node?.id === `file:${filePath}`
  )) || null;
}

function getPathForGraphNode(dependencyGraph, nodeId) {
  const node = dependencyGraph?.nodes?.find(item => item?.id === nodeId);
  return getPath(node?.path || String(nodeId || '').replace(/^file:/, ''));
}

function getGraphTraversalFiles(result, dependencyGraph, changedPath) {
  const orderedFiles = Array.isArray(result?.traversalOrder)
    ? result.traversalOrder.map(item => getPath(item?.file))
    : [];
  const nodeFiles = Array.isArray(result?.affectedNodes)
    ? result.affectedNodes.map(nodeId => getPathForGraphNode(dependencyGraph, nodeId))
    : [];

  return uniquePaths([...orderedFiles, ...nodeFiles]).filter(file => file !== changedPath);
}

function getGraphTraversalEntries(result, dependencyGraph, changedPath, direction) {
  const entriesByPath = new Map();

  if (Array.isArray(result?.traversalOrder)) {
    result.traversalOrder.forEach(item => {
      const path = getPath(item?.file);
      if (path && path !== changedPath) {
        entriesByPath.set(path, {
          path,
          direction,
          distance: Number.isFinite(item?.depth) ? item.depth : 1
        });
      }
    });
  }

  if (Array.isArray(result?.affectedNodes)) {
    result.affectedNodes.forEach(nodeId => {
      const path = getPathForGraphNode(dependencyGraph, nodeId);
      if (path && path !== changedPath && !entriesByPath.has(path)) {
        entriesByPath.set(path, {
          path,
          direction,
          distance: 1
        });
      }
    });
  }

  return Array.from(entriesByPath.values());
}

function getGraphNodeMeta(dependencyGraph, filePath) {
  const node = getGraphNodeForPath(dependencyGraph, filePath);
  return node || {};
}

function getGraphEdgeMeta(dependencyGraph, sourcePath, targetPath) {
  const edgeId = `edge:${sourcePath}->${targetPath}`;
  const edge = dependencyGraph?.edges?.find(item => (
    item?.id === edgeId ||
    (item?.source === `file:${sourcePath}` && item?.target === `file:${targetPath}`)
  ));

  return edge || dependencyGraph?.edgeMetadata?.[`${sourcePath}->${targetPath}`] || null;
}

function getSeverity(totalImpact) {
  if (totalImpact > 25) return 'critical';
  if (totalImpact > 10) return 'high';
  if (totalImpact > 5) return 'medium';
  return 'low';
}

function getGraphFilePaths(dependencyGraph) {
  if (!dependencyGraph || !Array.isArray(dependencyGraph.nodes)) {
    return [];
  }

  return uniquePaths(dependencyGraph.nodes.map(node => (
    node?.path || String(node?.id || '').replace(/^file:/, '')
  )));
}

function getCoverage(repositoryFiles, dependencyGraph, changedPath, selectedMode) {
  const files = uniquePaths(repositoryFiles);
  const graphFiles = getGraphFilePaths(dependencyGraph);
  const metadata = dependencyGraph?.metadata || {};
  const repositoryFileSet = new Set(files);
  const graphBackedFiles = graphFiles.filter(file => (
    repositoryFileSet.size === 0 || repositoryFileSet.has(file)
  ));
  const selectedIsGraphBacked = Boolean(getGraphNodeForPath(dependencyGraph, changedPath));
  const graphBackedCount = graphBackedFiles.length || graphFiles.length;

  return {
    totalFiles: files.length,
    graphFiles: graphBackedCount,
    fallbackFiles: Math.max(files.length - graphBackedCount, 0),
    selectedFile: changedPath,
    selectedMode,
    selectedIsGraphBacked,
    candidateFiles: metadata.candidateCount || null,
    fetchedFiles: metadata.fetchedCount || null,
    skippedFiles: metadata.skippedCount || null,
    coverageRatio: typeof metadata.coverageRatio === 'number'
      ? metadata.coverageRatio
      : files.length > 0
        ? Number((graphBackedCount / files.length).toFixed(3))
        : 0,
    supportedExtensions: metadata.supportedExtensions || []
  };
}

function getServiceName(filePath) {
  const parts = filePath.split('/').filter(Boolean);
  const serviceSegmentIndex = parts.findIndex(part => (
    part === 'api' ||
    part === 'apis' ||
    part === 'service' ||
    part === 'services' ||
    part === 'routes' ||
    part === 'controllers' ||
    part === 'handlers'
  ));

  if (serviceSegmentIndex === -1) {
    return '';
  }

  return parts[serviceSegmentIndex + 1] || parts[parts.length - 1] || '';
}

function getImpactedServices(files) {
  return Array.from(new Set(
    uniquePaths(files)
      .map(getServiceName)
      .filter(Boolean)
  ));
}

function buildDependencyChains(changedPath, upstreamFiles, downstreamFiles, relatedFiles = []) {
  const chains = [];
  const seenChains = new Set();
  const addChain = (chain) => {
    const key = chain.join('>');
    if (!seenChains.has(key)) {
      seenChains.add(key);
      chains.push(chain);
    }
  };

  upstreamFiles.forEach(file => addChain([changedPath, file]));
  downstreamFiles.forEach(file => addChain([changedPath, file]));
  relatedFiles.forEach(file => addChain([changedPath, file]));

  return chains;
}

function addRiskFactor(factors, id, label, weight, source, description) {
  factors.push({ id, label, weight, source, description });
}

function hasPathSignal(lowerPath, signals) {
  return signals.some(signal => lowerPath.includes(signal));
}

function getRiskFactorsForPath(filePath, source) {
  const lowerPath = filePath.toLowerCase();
  const fileName = lowerPath.split('/').pop() || lowerPath;
  const factors = [];

  if (
    /(^|\/)(index|main|app|server|manage|cli)\.(js|jsx|ts|tsx|py|rb|go|java)$/.test(lowerPath) ||
    /(^|\/)(app|server|main)\.(mjs|cjs)$/.test(lowerPath)
  ) {
    addRiskFactor(
      factors,
      'entrypoint',
      'Entrypoint',
      4,
      source,
      'Primary startup or application entry files can affect broad runtime behavior.'
    );
  }

  if (
    /(^|\/)(api|apis|routes|controllers|handlers|service|services)(\/|$)/.test(lowerPath) ||
    /(^|[_-])(api|route|handler|service|controller)([_-]|\.|$)/.test(fileName)
  ) {
    addRiskFactor(
      factors,
      'api-service',
      'API or service path',
      3,
      source,
      'API, route, handler, and service files often sit on user-facing execution paths.'
    );
  }

  if (hasPathSignal(lowerPath, ['auth', 'token', 'secret', 'credential', 'permission', 'jwt', 'oauth', 'security', 'session'])) {
    addRiskFactor(
      factors,
      'auth-security',
      'Auth or security sensitive',
      5,
      source,
      'Authentication, token, and security paths need a higher review threshold.'
    );
  }

  if (hasPathSignal(lowerPath, ['database', 'migration', 'schema', 'prisma', 'sql', 'models', 'query', 'repository', '/db/', '_db'])) {
    addRiskFactor(
      factors,
      'database',
      'Database or model layer',
      3,
      source,
      'Database, model, and query changes can alter persistence contracts.'
    );
  }

  if (
    fileName === 'dockerfile' ||
    lowerPath.includes('docker-compose') ||
    fileName === '.dockerignore' ||
    hasPathSignal(lowerPath, ['.github/workflows/', '/.github/workflows/', '.gitlab-ci', '/ci.', '/deploy', '/terraform', '/k8s/', '/helm/'])
  ) {
    addRiskFactor(
      factors,
      'infra-ci',
      'Infrastructure or CI',
      3,
      source,
      'Build, container, and workflow files can affect release reliability.'
    );
  }

  if (
    fileName === '.env.example' ||
    fileName === 'package.json' ||
    fileName === 'package-lock.json' ||
    fileName === 'pnpm-lock.yaml' ||
    fileName === 'yarn.lock' ||
    fileName === 'requirements.txt' ||
    fileName === 'pyproject.toml' ||
    fileName === 'go.mod' ||
    fileName === 'cargo.toml' ||
    fileName === 'pom.xml' ||
    fileName === 'build.gradle' ||
    fileName === 'composer.json' ||
    fileName === 'gemfile' ||
    hasPathSignal(lowerPath, ['config', 'settings'])
  ) {
    addRiskFactor(
      factors,
      'config-dependency',
      'Config or dependency manifest',
      2,
      source,
      'Configuration and dependency manifests can change install, build, or runtime setup.'
    );
  }

  if (
    /(^|\/)(static|public|assets|components|pages|views)\//.test(lowerPath) &&
    /\.(js|jsx|ts|tsx|css|scss|html)$/.test(lowerPath)
  ) {
    addRiskFactor(
      factors,
      'ui-surface',
      'UI surface',
      2,
      source,
      'Static UI and view files should get a focused smoke test after changes.'
    );
  }

  if (/(^|\/)(test|tests|spec|__tests__)\//.test(lowerPath) || /\.(test|spec)\.(js|jsx|ts|tsx|py)$/.test(lowerPath)) {
    addRiskFactor(
      factors,
      'test-coverage',
      'Test coverage',
      1,
      source,
      'Test changes usually have low runtime blast radius but still affect confidence signals.'
    );
  }

  if (/(^|\/)(docs?|readme|changelog|license)(\/|\.|$)/.test(lowerPath) || /\.(md|mdx|rst)$/.test(lowerPath)) {
    addRiskFactor(
      factors,
      'docs',
      'Docs or metadata',
      1,
      source,
      'Documentation and metadata changes should be reviewed for correctness.'
    );
  }

  return factors;
}

function getRiskFactors(changedPath, impactedFiles) {
  const selectedFactors = getRiskFactorsForPath(changedPath, 'selected');
  const impactedFactors = impactedFiles
    .filter(file => file !== changedPath)
    .flatMap(file => getRiskFactorsForPath(file, 'impacted'));
  const factorsById = new Map();

  [...selectedFactors, ...impactedFactors].forEach(factor => {
    const existing = factorsById.get(factor.id);
    if (!existing || existing.source !== 'selected') {
      factorsById.set(factor.id, factor);
    }
  });

  return Array.from(factorsById.values()).slice(0, 8);
}

function getWeightedImpact(impactedFiles, impactedServices, riskFactors) {
  const baseImpact = impactedFiles.length + (impactedServices.length * 2);
  const selectedRisk = riskFactors
    .filter(factor => factor.source === 'selected')
    .reduce((sum, factor) => sum + factor.weight, 0);
  const contextualRisk = riskFactors
    .filter(factor => factor.source !== 'selected')
    .reduce((sum, factor) => sum + Math.max(1, Math.ceil(factor.weight / 2)), 0);

  return Math.round(baseImpact + selectedRisk + Math.min(contextualRisk, 8));
}

function getPathRiskScore(filePath, dependencyGraph) {
  const factorScore = getRiskFactorsForPath(filePath, 'impacted')
    .reduce((sum, factor) => sum + factor.weight, 0);
  const node = getGraphNodeMeta(dependencyGraph, filePath);
  const nodeScore = Math.min(10, Math.round((node.importance || 0) / 10));

  return factorScore + nodeScore;
}

function getConfidenceRank(confidence) {
  if (confidence === 'high') return 3;
  if (confidence === 'medium') return 2;
  return 1;
}

function getOverallConfidence(analysisMode, rankedFiles) {
  if (analysisMode !== 'dependency-graph') {
    return 'low';
  }

  const nonSourceFiles = rankedFiles.filter(file => file.role !== 'source');
  if (nonSourceFiles.some(file => file.confidence === 'high')) {
    return 'high';
  }

  if (nonSourceFiles.length > 0) {
    return 'medium';
  }

  return 'medium';
}

function getEvidenceReason(entry, analysisMode, edgeMeta) {
  if (entry.role === 'source') {
    return analysisMode === 'dependency-graph'
      ? 'Selected graph-backed source file.'
      : 'Selected file analyzed with fallback evidence.';
  }

  if (analysisMode === 'dependency-graph') {
    const importType = edgeMeta?.importType || edgeMeta?.importTypes?.[0] || 'import';
    if (entry.direction === 'upstream') {
      return entry.distance <= 1
        ? `Direct ${importType} dependency of the selected file.`
        : `Transitive upstream dependency at depth ${entry.distance}.`;
    }

    return entry.distance <= 1
      ? `Direct dependent reached through a ${importType} edge.`
      : `Transitive downstream dependent at depth ${entry.distance}.`;
  }

  if (entry.reasonType === 'import-match') {
    return 'Fallback import string match involving the selected file.';
  }

  return 'Fallback same-directory relationship; lower confidence than graph evidence.';
}

function buildRankedImpactedFiles({
  changedPath,
  impactedFiles,
  upstreamEntries = [],
  downstreamEntries = [],
  relatedFiles = [],
  importMatchedFiles = [],
  dependencyGraph,
  analysisMode
}) {
  const relatedSet = new Set(relatedFiles);
  const importMatchSet = new Set(importMatchedFiles);
  const evidenceByPath = new Map();

  upstreamEntries.forEach(entry => evidenceByPath.set(entry.path, {
    ...entry,
    role: 'dependency',
    reasonType: 'graph-upstream'
  }));

  downstreamEntries.forEach(entry => evidenceByPath.set(entry.path, {
    ...entry,
    role: analysisMode === 'dependency-graph' ? 'dependent' : 'related',
    reasonType: analysisMode === 'dependency-graph' ? 'graph-downstream' : 'fallback-related'
  }));

  relatedFiles.forEach(file => {
    if (!evidenceByPath.has(file)) {
      evidenceByPath.set(file, {
        path: file,
        role: 'related',
        direction: 'fallback',
        distance: 1,
        reasonType: 'same-directory'
      });
    }
  });

  importMatchedFiles.forEach(file => {
    if (!evidenceByPath.has(file)) {
      evidenceByPath.set(file, {
        path: file,
        role: 'impacted',
        direction: 'fallback',
        distance: 1,
        reasonType: 'import-match'
      });
    }
  });

  const rows = uniquePaths(impactedFiles).map(file => {
    const evidence = evidenceByPath.get(file) || {};
    const role = file === changedPath ? 'source' : evidence.role || 'impacted';
    const distance = file === changedPath ? 0 : Math.max(1, Number(evidence.distance || 1));
    const direction = file === changedPath ? 'source' : evidence.direction || 'fallback';
    const isGraphEvidence = analysisMode === 'dependency-graph' && direction !== 'fallback';
    const confidence = file === changedPath
      ? analysisMode === 'dependency-graph' ? 'high' : 'low'
      : isGraphEvidence
        ? distance <= 1 ? 'high' : 'medium'
        : 'low';
    const edgeMeta = direction === 'upstream'
      ? getGraphEdgeMeta(dependencyGraph, changedPath, file)
      : direction === 'downstream'
        ? getGraphEdgeMeta(dependencyGraph, file, changedPath) || getGraphEdgeMeta(dependencyGraph, changedPath, file)
        : null;
    const riskScore = getPathRiskScore(file, dependencyGraph);

    return {
      path: file,
      role,
      direction,
      distance,
      confidence,
      reason: getEvidenceReason({
        ...evidence,
        role,
        direction,
        distance,
        reasonType: evidence.reasonType || (relatedSet.has(file) ? 'same-directory' : importMatchSet.has(file) ? 'import-match' : '')
      }, analysisMode, edgeMeta),
      riskScore,
      layer: getGraphNodeMeta(dependencyGraph, file)?.layer || '',
      language: getGraphNodeMeta(dependencyGraph, file)?.language || ''
    };
  });

  return rows.sort((a, b) => {
    if (a.role === 'source' && b.role !== 'source') return -1;
    if (b.role === 'source' && a.role !== 'source') return 1;
    if (getConfidenceRank(b.confidence) !== getConfidenceRank(a.confidence)) {
      return getConfidenceRank(b.confidence) - getConfidenceRank(a.confidence);
    }
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
    return a.path.localeCompare(b.path);
  });
}

function buildGraphEvidence({
  analysisMode,
  upstreamEntries,
  downstreamEntries,
  relatedFiles,
  importMatchedFiles,
  rankedFiles
}) {
  if (analysisMode === 'dependency-graph') {
    const graphRows = rankedFiles.filter(file => file.direction === 'upstream' || file.direction === 'downstream');
    return {
      directEdges: graphRows.filter(file => file.distance <= 1).length,
      transitiveFiles: graphRows.filter(file => file.distance > 1).length,
      maxDepth: graphRows.reduce((max, file) => Math.max(max, file.distance), 0),
      upstreamFiles: upstreamEntries.length,
      downstreamFiles: downstreamEntries.length,
      fallbackReason: null
    };
  }

  return {
    directEdges: 0,
    transitiveFiles: 0,
    maxDepth: 0,
    upstreamFiles: 0,
    downstreamFiles: 0,
    fallbackReason: relatedFiles.length > 0
      ? 'same-directory'
      : importMatchedFiles.length > 0
        ? 'import-match'
        : 'selected-file-only'
  };
}

function buildImpactSummary({ analysisMode, rankedFiles, confidence, graphEvidence, direction }) {
  const impactedCount = rankedFiles.length;
  if (analysisMode === 'dependency-graph') {
    return `${impactedCount} file${impactedCount === 1 ? '' : 's'} ranked from graph evidence (${graphEvidence.directEdges} direct, ${graphEvidence.transitiveFiles} transitive) with ${confidence} confidence in ${direction} mode.`;
  }

  return `${impactedCount} file${impactedCount === 1 ? '' : 's'} ranked from fallback evidence (${graphEvidence.fallbackReason}) with ${confidence} confidence in ${direction} mode.`;
}

function buildImpactReasons(changedPath, upstreamFiles, downstreamFiles, relatedFiles, analysisMode, rankedFiles = []) {
  if (rankedFiles.length > 0) {
    return rankedFiles.slice(0, 12).map(file => ({
      file: file.path,
      type: file.role,
      label: file.role === 'source'
        ? 'Selected source file'
        : file.confidence === 'high'
          ? 'Graph-proven impact'
          : file.confidence === 'medium'
            ? 'Transitive impact'
            : 'Fallback impact',
      description: file.reason,
      chain: file.role === 'source' ? [file.path] : [changedPath, file.path],
      confidence: file.confidence,
      distance: file.distance
    }));
  }

  const relatedFileSet = new Set(relatedFiles);
  const reasons = [{
    file: changedPath,
    type: 'source',
    label: 'Selected source file',
    description: 'This is the file being analyzed.',
    chain: [changedPath]
  }];

  upstreamFiles.slice(0, 10).forEach(file => {
    reasons.push({
      file,
      type: 'upstream',
      label: analysisMode === 'dependency-graph' ? 'Imported dependency' : 'Upstream dependency',
      description: analysisMode === 'dependency-graph'
        ? 'The selected file imports this dependency in the repository graph.'
        : 'This file is treated as an upstream dependency.',
      chain: [changedPath, file]
    });
  });

  downstreamFiles.slice(0, 10).forEach(file => {
    const isRelated = relatedFileSet.has(file);
    reasons.push({
      file,
      type: isRelated ? 'related' : 'downstream',
      label: analysisMode === 'dependency-graph'
        ? 'Downstream dependent'
        : isRelated
          ? 'Same directory'
          : 'Import match',
      description: analysisMode === 'dependency-graph'
        ? 'A change can flow to this file through dependency graph traversal.'
        : isRelated
          ? 'Fallback mode links this file because it shares the selected file directory.'
          : 'Fallback mode found an import relationship involving the selected file.',
      chain: [changedPath, file]
    });
  });

  return reasons;
}

function addRecommendation(recommendations, id, title, detail) {
  if (!recommendations.some(item => item.id === id)) {
    recommendations.push({ id, title, detail });
  }
}

function getTestRecommendations(changedPath, riskFactors, analysisMode) {
  const recommendations = [];
  const riskIds = new Set(riskFactors.map(factor => factor.id));
  const lowerPath = changedPath.toLowerCase();

  if (riskIds.has('infra-ci')) {
    addRecommendation(
      recommendations,
      'infra-ci',
      'Run build and workflow checks',
      'Validate Docker, CI, deployment, or release workflow behavior touched by this file.'
    );
  }

  if (riskIds.has('api-service')) {
    addRecommendation(
      recommendations,
      'api-service',
      'Run API and service tests',
      'Exercise the route, handler, or service contracts that depend on this path.'
    );
  }

  if (riskIds.has('auth-security')) {
    addRecommendation(
      recommendations,
      'auth-security',
      'Review auth and security flows',
      'Check token handling, permissions, session behavior, and failure paths.'
    );
  }

  if (riskIds.has('database')) {
    addRecommendation(
      recommendations,
      'database',
      'Run database regression checks',
      'Validate migrations, model contracts, query behavior, and rollback safety.'
    );
  }

  if (riskIds.has('entrypoint') || riskIds.has('ui-surface')) {
    addRecommendation(
      recommendations,
      'ui-smoke',
      'Run a UI smoke test',
      'Open the affected screen or app entrypoint and verify the core happy path.'
    );
  }

  if (riskIds.has('config-dependency')) {
    addRecommendation(
      recommendations,
      'config-dependency',
      'Validate config and install path',
      'Re-run install/build or config parsing checks affected by dependency and settings changes.'
    );
  }

  if (analysisMode === 'dependency-graph') {
    addRecommendation(
      recommendations,
      'dependency-regression',
      'Check dependency regressions',
      'Review upstream dependencies and downstream dependents shown in the graph result.'
    );
  } else {
    addRecommendation(
      recommendations,
      'targeted-fallback',
      'Run targeted local checks',
      'Fallback mode is conservative, so verify the selected file and nearby related files directly.'
    );
  }

  if (riskIds.has('docs') || /\.(md|mdx|rst)$/.test(lowerPath)) {
    addRecommendation(
      recommendations,
      'docs-review',
      'Review docs and metadata',
      'Confirm names, commands, links, and examples still match current project behavior.'
    );
  }

  if (recommendations.length === 0) {
    addRecommendation(
      recommendations,
      'basic-check',
      'Run a focused sanity check',
      'Validate the selected file behavior and any obvious neighboring integration points.'
    );
  }

  return recommendations.slice(0, 6);
}

function buildResult({
  changedPath,
  repositoryFiles,
  dependencyGraph,
  impactedFiles,
  upstreamFiles,
  downstreamFiles,
  upstreamEntries = [],
  downstreamEntries = [],
  relatedFiles = [],
  importMatchedFiles = [],
  analysisMode,
  direction,
  isLimited
}) {
  const impactedFileList = uniquePaths(impactedFiles);
  const impactedServices = getImpactedServices(impactedFileList);
  const dependencyChains = buildDependencyChains(changedPath, upstreamFiles, downstreamFiles, relatedFiles);
  const riskFactors = getRiskFactors(changedPath, impactedFileList);
  const totalImpact = getWeightedImpact(impactedFileList, impactedServices, riskFactors);
  const rankedImpactedFiles = buildRankedImpactedFiles({
    changedPath,
    impactedFiles: impactedFileList,
    upstreamEntries,
    downstreamEntries,
    relatedFiles,
    importMatchedFiles,
    dependencyGraph,
    analysisMode
  });
  const confidence = getOverallConfidence(analysisMode, rankedImpactedFiles);
  const graphEvidence = buildGraphEvidence({
    analysisMode,
    upstreamEntries,
    downstreamEntries,
    relatedFiles,
    importMatchedFiles,
    rankedFiles: rankedImpactedFiles
  });
  const impactSummary = buildImpactSummary({
    analysisMode,
    rankedFiles: rankedImpactedFiles,
    confidence,
    graphEvidence,
    direction
  });

  return {
    severity: getSeverity(totalImpact),
    impactedFiles: impactedFileList,
    impactedServices,
    dependencyChains,
    totalImpact,
    upstreamFiles: uniquePaths(upstreamFiles),
    downstreamFiles: uniquePaths(downstreamFiles),
    analysisMode,
    isLimited,
    coverage: getCoverage(repositoryFiles, dependencyGraph, changedPath, analysisMode),
    direction,
    riskFactors,
    impactReasons: buildImpactReasons(changedPath, upstreamFiles, downstreamFiles, relatedFiles, analysisMode, rankedImpactedFiles),
    testRecommendations: getTestRecommendations(changedPath, riskFactors, analysisMode),
    rankedImpactedFiles,
    impactSummary,
    confidence,
    graphEvidence
  };
}

function calculateFromDependencyGraph(changedPath, dependencyGraph, repositoryFiles, direction) {
  const sourceNode = getGraphNodeForPath(dependencyGraph, changedPath);
  if (!sourceNode) {
    return null;
  }

  const sourceNodeId = sourceNode.id || `file:${changedPath}`;
  const includeDownstream = direction !== 'upstream';
  const includeUpstream = direction !== 'downstream';
  const downstream = includeDownstream
    ? calculateGraphBlastRadius(sourceNodeId, dependencyGraph, {
        ...GRAPH_TRAVERSAL_OPTIONS,
        direction: 'downstream'
      })
    : null;
  const upstream = includeUpstream
    ? calculateGraphBlastRadius(sourceNodeId, dependencyGraph, {
        ...GRAPH_TRAVERSAL_OPTIONS,
        direction: 'upstream'
      })
    : null;

  const upstreamFiles = getGraphTraversalFiles(upstream, dependencyGraph, changedPath);
  const downstreamFiles = getGraphTraversalFiles(downstream, dependencyGraph, changedPath);
  const upstreamEntries = getGraphTraversalEntries(upstream, dependencyGraph, changedPath, 'upstream');
  const downstreamEntries = getGraphTraversalEntries(downstream, dependencyGraph, changedPath, 'downstream');

  return buildResult({
    changedPath,
    repositoryFiles,
    dependencyGraph,
    impactedFiles: [changedPath, ...downstreamFiles, ...upstreamFiles],
    upstreamFiles,
    downstreamFiles,
    upstreamEntries,
    downstreamEntries,
    analysisMode: 'dependency-graph',
    direction,
    isLimited: Boolean(upstream?.stats?.traversalLimited || downstream?.stats?.traversalLimited)
  });
}

/**
 * Calculate blast radius for a given file change
 */
export function calculateBlastRadius(changedFile, fileStructure, imports, dependencyGraph, options = {}) {
  const direction = normalizeDirection(options.direction);
  const changedPath = getPath(changedFile);
  const repositoryFiles = Array.isArray(fileStructure)
    ? fileStructure.map(getPath).filter(Boolean)
    : [];

  if (!changedPath || repositoryFiles.length === 0) {
    return getEmptyBlastRadius({ direction });
  }

  const graphResult = calculateFromDependencyGraph(changedPath, dependencyGraph, repositoryFiles, direction);
  if (graphResult) {
    return graphResult;
  }

  const impactedFiles = new Set();
  const importMatchedFiles = [];
  const includeDownstream = direction !== 'upstream';

  // Add the changed file itself
  impactedFiles.add(changedPath);

  // Find files that import the changed file
  if (includeDownstream && Array.isArray(imports)) {
    imports.forEach(imp => {
      const source = typeof imp?.source === 'string' ? imp.source.trim() : '';
      if (!source) {
        return;
      }

      if (source.includes(changedPath) || changedPath.includes(source)) {
        impactedFiles.add(source);
        importMatchedFiles.push(source);
      }
    });
  }

  // Find a small set of related files based on directory structure.
  // Root-level files are intentionally not treated as siblings of the whole repo.
  const changedDir = changedPath.split('/').slice(0, -1).join('/');
  const relatedFiles = includeDownstream && changedDir
    ? repositoryFiles
        .filter(path => path !== changedPath && path.split('/').slice(0, -1).join('/') === changedDir)
        .slice(0, FALLBACK_RELATED_FILE_LIMIT)
    : [];

  relatedFiles.forEach(path => impactedFiles.add(path));

  return buildResult({
    changedPath,
    repositoryFiles,
    dependencyGraph,
    impactedFiles: Array.from(impactedFiles),
    upstreamFiles: [],
    downstreamFiles: uniquePaths([...importMatchedFiles, ...relatedFiles]),
    relatedFiles,
    importMatchedFiles,
    analysisMode: 'fallback',
    direction,
    isLimited: relatedFiles.length >= FALLBACK_RELATED_FILE_LIMIT
  });
}

/**
 * Calculate blast radius for multiple file changes
 */
export function calculateMultiFileBlastRadius(changedFiles, fileStructure, imports, dependencyGraph, options = {}) {
  const direction = normalizeDirection(options.direction);
  if (!Array.isArray(changedFiles)) {
    return getEmptyBlastRadius({ direction });
  }

  const normalizedChangedFiles = changedFiles.map(getPath).filter(Boolean);
  if (normalizedChangedFiles.length === 0) {
    return getEmptyBlastRadius({ direction });
  }

  const allImpactedFiles = new Set();
  const allImpactedServices = new Set();
  const allChains = [];

  normalizedChangedFiles.forEach(file => {
    const result = calculateBlastRadius(file, fileStructure, imports, dependencyGraph, { direction });
    result.impactedFiles.forEach(f => allImpactedFiles.add(f));
    result.impactedServices.forEach(s => allImpactedServices.add(s));
    allChains.push(...result.dependencyChains);
  });

  const impactedFiles = Array.from(allImpactedFiles);
  const impactedServices = Array.from(allImpactedServices);
  const riskFactors = getRiskFactors(normalizedChangedFiles[0], impactedFiles);
  const totalImpact = getWeightedImpact(impactedFiles, impactedServices, riskFactors);
  const rankedImpactedFiles = impactedFiles.map(file => ({
    path: file,
    role: normalizedChangedFiles.includes(file) ? 'source' : 'impacted',
    direction: 'multi-file',
    distance: normalizedChangedFiles.includes(file) ? 0 : 1,
    confidence: 'medium',
    reason: normalizedChangedFiles.includes(file)
      ? 'Selected source file in multi-file analysis.'
      : 'Impacted by at least one selected file.',
    riskScore: getPathRiskScore(file, dependencyGraph),
    layer: getGraphNodeMeta(dependencyGraph, file)?.layer || '',
    language: getGraphNodeMeta(dependencyGraph, file)?.language || ''
  }));
  const confidence = rankedImpactedFiles.some(file => file.confidence === 'high') ? 'high' : 'medium';
  return {
    severity: getSeverity(totalImpact),
    impactedFiles,
    impactedServices,
    dependencyChains: allChains,
    totalImpact,
    upstreamFiles: [],
    downstreamFiles: [],
    analysisMode: 'multi-file',
    isLimited: false,
    coverage: getCoverage(fileStructure || [], dependencyGraph, normalizedChangedFiles[0], 'multi-file'),
    direction,
    riskFactors,
    impactReasons: normalizedChangedFiles.map(file => ({
      file,
      type: 'source',
      label: 'Selected source file',
      description: 'This file is included in the multi-file blast radius.',
      chain: [file]
    })),
    testRecommendations: getTestRecommendations(normalizedChangedFiles[0], riskFactors, 'multi-file'),
    rankedImpactedFiles,
    impactSummary: `${impactedFiles.length} files ranked from multi-file analysis with ${confidence} confidence.`,
    confidence,
    graphEvidence: {
      directEdges: 0,
      transitiveFiles: 0,
      maxDepth: 0,
      upstreamFiles: 0,
      downstreamFiles: 0,
      fallbackReason: null
    }
  };
}

/**
 * Get blast radius visualization data
 */
export function getBlastRadiusVisualization(blastRadius) {
  const severity = blastRadius?.severity || 'low';
  const impactedFiles = Array.isArray(blastRadius?.impactedFiles) ? blastRadius.impactedFiles : [];
  const impactedServices = Array.isArray(blastRadius?.impactedServices) ? blastRadius.impactedServices : [];

  const severityColors = {
    low: '#4CAF50',
    medium: '#FF9800',
    high: '#F44336',
    critical: '#9C27B0'
  };

  const rings = [];

  // Center ring (changed files)
  rings.push({
    radius: 1,
    items: impactedFiles.slice(0, 5),
    color: severityColors[severity]
  });

  // Second ring (services)
  if (impactedServices.length > 0) {
    rings.push({
      radius: 2,
      items: impactedServices,
      color: severityColors[severity]
    });
  }

  // Third ring (other files)
  if (impactedFiles.length > 5) {
    rings.push({
      radius: 3,
      items: impactedFiles.slice(5, 15),
      color: severityColors[severity]
    });
  }

  return {
    rings,
    severityColor: severityColors[severity],
    totalItems: impactedFiles.length + impactedServices.length
  };
}

/**
 * Get AI-enhanced blast radius reasoning
 */
export async function getBlastRadiusReasoning(blastRadius, repoData) {
  if (!blastRadius || !repoData) {
    return '';
  }

  const { severity, impactedFiles, impactedServices, totalImpact, confidence, impactSummary } = blastRadius;

  const prompt = `You are a software architect. Analyze the blast radius of a code change.

Repository: ${repoData.repoInfo?.name || 'Unknown'}
Changed Files: ${impactedFiles.slice(0, 10).join(', ')}
Impacted Services: ${impactedServices.join(', ')}
Severity Level: ${severity}
Total Impact Score: ${totalImpact}
Confidence: ${confidence || 'unknown'}
Deterministic Summary: ${impactSummary || 'No local summary available.'}

Provide a brief analysis (max 150 words) covering:
1. Why this change has ${severity} impact
2. Which services are most at risk
3. Recommended testing approach
4. Potential rollback strategy

Be specific and actionable.`;

  try {
    const { generateText } = await import('../../services/ai/aiService.js');
    const reasoning = await generateText(prompt, {
      temperature: 0.6,
      maxTokens: 300
    });
    return reasoning;
  } catch (error) {
    console.error('Error generating blast radius reasoning:', error);
    return '';
  }
}

export default {
  calculateBlastRadius,
  calculateMultiFileBlastRadius,
  getBlastRadiusVisualization,
  getBlastRadiusReasoning
};
