import { calculateBlastRadius } from './blastRadiusAnalysis.js';

const DEFAULT_MAX_BLAST_CANDIDATES = 28;
const DEFAULT_MAX_RANKED_FILES = 80;
const DEFAULT_MAX_CLUSTERS = 12;

const SECURITY_WEIGHTS = {
  critical: 18,
  high: 12,
  medium: 7,
  low: 3
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getPath(entry) {
  if (typeof entry === 'string') return entry.trim();
  if (typeof entry?.path === 'string') return entry.path.trim();
  return '';
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampScore(value) {
  return clamp(Math.round(value), 0, 100);
}

function getRiskLevel(score) {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function getConfidence({ isGraphBacked, hasCodeAnalysis, hasBlastData }) {
  if (isGraphBacked && hasCodeAnalysis && hasBlastData) return 'high';
  if (isGraphBacked || hasCodeAnalysis || hasBlastData) return 'medium';
  return 'low';
}

function getFilename(path) {
  return String(path || '').split('/').pop() || path || 'unknown';
}

function getDirectory(path) {
  const parts = String(path || '').split('/').filter(Boolean);
  if (parts.length <= 1) return 'root';
  return parts.slice(0, -1).join('/');
}

function getModule(path) {
  const parts = String(path || '').split('/').filter(Boolean);
  return parts.length > 1 ? parts[0] : 'root';
}

function getExtension(path) {
  const match = String(path || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

function inferLayer(path) {
  const lower = String(path || '').toLowerCase();
  const ext = getExtension(path);

  if (/(\b|\/)(index|main|app|server|manage|cli)\.(js|jsx|ts|tsx|py|mjs|cjs)$/i.test(path)) return 'entry';
  if (/(^|\/)(api|apis|routes|controllers|handlers)(\/|$)/.test(lower)) return 'api';
  if (/(^|\/)(service|services|lib)(\/|$)/.test(lower)) return 'service';
  if (/(^|\/)(models|schemas|database|db|migrations)(\/|$)/.test(lower) || lower.includes('database')) return 'data';
  if (/(^|\/)(utils|helpers|hooks)(\/|$)/.test(lower)) return 'utility';
  if (/(^|\/)(components|pages|views|static|public)(\/|$)/.test(lower) || ['jsx', 'tsx', 'css', 'scss', 'html'].includes(ext)) return 'ui';
  if (['json', 'yml', 'yaml', 'toml', 'ini', 'env', 'lock'].includes(ext)) return 'config';
  if (['md', 'mdx', 'rst', 'txt'].includes(ext)) return 'docs';
  return 'file';
}

function getLanguage(path) {
  const ext = getExtension(path);
  const languageByExtension = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    go: 'go',
    rb: 'ruby',
    php: 'php',
    css: 'css',
    scss: 'scss',
    json: 'json',
    yml: 'yaml',
    yaml: 'yaml',
    md: 'markdown'
  };
  return languageByExtension[ext] || ext || 'unknown';
}

function getDefinitionsCount(file) {
  const definitions = file?.definitions || {};
  return safeArray(definitions.functions).length +
    safeArray(definitions.classes).length +
    safeArray(definitions.exports).length;
}

function normalizeRepositoryFiles(repoData) {
  const fileTree = safeArray(repoData?.fileTree).map(getPath).filter(Boolean);
  if (fileTree.length > 0) return unique(fileTree);

  return unique(safeArray(repoData?.fileStructure).map(getPath).filter(Boolean));
}

function graphPathFromNode(node) {
  return getPath(node?.path || String(node?.id || '').replace(/^file:/, ''));
}

function buildGraphMaps(dependencyGraph) {
  const nodeByPath = new Map();
  const degreesByPath = new Map();

  safeArray(dependencyGraph?.nodes).forEach(node => {
    const path = graphPathFromNode(node);
    if (!path) return;
    nodeByPath.set(path, node);
    degreesByPath.set(path, {
      imports: Number(node.importCount || 0),
      dependents: Number(node.dependentCount || 0)
    });
  });

  safeArray(dependencyGraph?.edges).forEach(edge => {
    const sourcePath = String(edge?.source || '').replace(/^file:/, '');
    const targetPath = String(edge?.target || '').replace(/^file:/, '');

    if (sourcePath) {
      const current = degreesByPath.get(sourcePath) || { imports: 0, dependents: 0 };
      current.imports += 1;
      degreesByPath.set(sourcePath, current);
    }

    if (targetPath) {
      const current = degreesByPath.get(targetPath) || { imports: 0, dependents: 0 };
      current.dependents += 1;
      degreesByPath.set(targetPath, current);
    }
  });

  return { nodeByPath, degreesByPath };
}

function buildSecurityMap(codeAnalysis) {
  const issueMap = new Map();
  const totals = { critical: 0, high: 0, medium: 0, low: 0 };

  Object.entries(codeAnalysis?.security || {}).forEach(([severity, issues]) => {
    safeArray(issues).forEach(issue => {
      const path = getPath(issue?.file || issue?.path);
      if (!path) return;
      const normalizedSeverity = SECURITY_WEIGHTS[severity] ? severity : 'low';
      const current = issueMap.get(path) || {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        issues: []
      };

      current.total += 1;
      current[normalizedSeverity] += 1;
      current.issues.push({
        severity: normalizedSeverity,
        type: issue?.type || issue?.title || 'Security finding',
        line: issue?.line || null,
        message: issue?.message || issue?.description || ''
      });
      totals[normalizedSeverity] += 1;
      issueMap.set(path, current);
    });
  });

  return { issueMap, totals };
}

function addDriver(drivers, id, label, points, detail, source) {
  if (points <= 0) return;
  drivers.push({
    id,
    label,
    points: Math.round(points),
    detail,
    source
  });
}

function getDriverCategory(driver) {
  if (!driver) return '';
  if (driver.source === 'impact' || driver.id === 'blast-radius' || driver.id === 'estimated-impact') return 'blast-radius';
  if (driver.source === 'security' || driver.id === 'security-findings') return 'security';
  if (driver.id === 'auth-security') return 'auth';
  if (driver.id === 'database') return 'database';
  if (driver.id === 'api-service') return 'api-service';
  if (driver.id === 'config-dependency' || driver.id === 'infra-ci') return 'config-env';
  if (driver.id === 'entrypoint') return 'entrypoint';
  return driver.source || driver.id || '';
}

function buildRiskCategories(record, drivers) {
  return unique([
    ...drivers.map(getDriverCategory),
    record.isGraphBacked ? 'graph-backed' : '',
    record.level,
    record.module,
    record.layer,
    record.language
  ].map(value => String(value || '').toLowerCase()));
}

function buildInspectRecommendation(file) {
  const categories = new Set(file.riskCategories || []);

  if (categories.has('auth')) {
    return 'Inspect auth/session/token handling first, then validate permission and negative-path tests.';
  }

  if (categories.has('database')) {
    return 'Inspect data access, schema assumptions, and persistence callers before changing this file.';
  }

  if (categories.has('api-service')) {
    return 'Inspect request/response contracts and upstream callers before editing this service path.';
  }

  if (categories.has('config-env')) {
    return 'Inspect runtime configuration, deployment wiring, and local setup assumptions before changing it.';
  }

  if (categories.has('entrypoint')) {
    return 'Inspect startup order and app initialization flow because this file can affect broad runtime behavior.';
  }

  if (categories.has('blast-radius')) {
    return 'Inspect direct dependents first because impact evidence suggests changes can travel across files.';
  }

  return 'Inspect the top listed drivers and nearby module files before making a change.';
}

function getPathSensitivityDrivers(path, layer) {
  const lower = String(path || '').toLowerCase();
  const fileName = getFilename(lower);
  const drivers = [];

  if (layer === 'entry') {
    addDriver(drivers, 'entrypoint', 'Entrypoint', 8, 'Startup and app entry files can affect broad runtime behavior.', 'path');
  }

  if (/(^|\/)(api|apis|routes|controllers|handlers|service|services)(\/|$)/.test(lower) ||
    /(^|[_-])(api|route|handler|service|controller)([_-]|\.|$)/.test(fileName)) {
    addDriver(drivers, 'api-service', 'API or service path', 8, 'User-facing routes, handlers, and services sit on common execution paths.', 'path');
  }

  if (/auth|token|secret|credential|permission|jwt|oauth|security|session/.test(lower)) {
    addDriver(drivers, 'auth-security', 'Auth or security sensitive', 14, 'Authentication, session, token, and security files need a higher review threshold.', 'path');
  }

  if (/database|migration|schema|prisma|sql|models|query|repository|\/db\/|_db/.test(lower)) {
    addDriver(drivers, 'database', 'Database or model layer', 10, 'Persistence and schema files can change core data behavior.', 'path');
  }

  if (
    fileName === 'dockerfile' ||
    lower.includes('docker-compose') ||
    fileName === '.dockerignore' ||
    lower.includes('.github/workflows') ||
    lower.includes('.gitlab-ci') ||
    lower.includes('/deploy') ||
    lower.includes('/terraform') ||
    lower.includes('/k8s/')
  ) {
    addDriver(drivers, 'infra-ci', 'Infrastructure or CI', 7, 'Build, workflow, and deployment files affect release reliability.', 'path');
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
    lower.includes('config') ||
    lower.includes('settings')
  ) {
    addDriver(drivers, 'config-dependency', 'Config or dependency manifest', 8, 'Configuration and dependency manifests influence install, build, or runtime setup.', 'path');
  }

  if (layer === 'ui') {
    addDriver(drivers, 'ui-surface', 'UI surface', 4, 'UI files should get smoke testing because failures are visible to users.', 'path');
  }

  return drivers;
}

function scoreSecurity(securityInfo) {
  if (!securityInfo?.total) return { score: 0, drivers: [] };

  const raw =
    securityInfo.critical * SECURITY_WEIGHTS.critical +
    securityInfo.high * SECURITY_WEIGHTS.high +
    securityInfo.medium * SECURITY_WEIGHTS.medium +
    securityInfo.low * SECURITY_WEIGHTS.low;
  const score = clamp(raw, 0, 18);
  const drivers = [];
  const labels = [];

  ['critical', 'high', 'medium', 'low'].forEach(severity => {
    if (securityInfo[severity] > 0) {
      labels.push(`${securityInfo[severity]} ${severity}`);
    }
  });

  addDriver(
    drivers,
    'security-findings',
    'Security findings',
    score,
    `Static analysis found ${labels.join(', ')} issue${securityInfo.total === 1 ? '' : 's'} in this file.`,
    'security'
  );

  return { score, drivers };
}

function scoreCentrality(record) {
  const dependentsScore = clamp(record.dependents * 2.2, 0, 11);
  const importsScore = clamp(record.imports * 0.9, 0, 5);
  const importanceScore = clamp(Number(record.importance || 0) / 24, 0, 4);
  const hubScore = record.isHub ? 4 : 0;
  const score = clamp(dependentsScore + importsScore + importanceScore + hubScore, 0, 22);
  const drivers = [];

  addDriver(drivers, 'dependents', 'Highly depended on', dependentsScore, `${record.dependents} files import or depend on this file.`, 'graph');
  addDriver(drivers, 'imports', 'Many dependencies', importsScore, `${record.imports} outgoing dependency edges from this file.`, 'graph');
  addDriver(drivers, 'importance', 'Graph importance', importanceScore, 'Dependency graph metadata marks this file as structurally important.', 'graph');
  addDriver(drivers, 'hub', 'Graph hub', hubScore, 'This file is marked as a dependency hub.', 'graph');

  return { score, drivers };
}

function scoreComplexity(record) {
  const lineScore = clamp(Number(record.lines || 0) / 130, 0, 7);
  const sizeScore = clamp(Number(record.size || 0) / 14000, 0, 2);
  const definitionScore = clamp(Number(record.definitionCount || 0) * 0.75, 0, 3);
  const score = clamp(lineScore + sizeScore + definitionScore, 0, 12);
  const drivers = [];

  addDriver(drivers, 'loc', 'Large file', lineScore, `${record.lines || 0} lines increase review surface.`, 'complexity');
  addDriver(drivers, 'size', 'Large payload', sizeScore, `${record.size || 0} bytes of analyzed content.`, 'complexity');
  addDriver(drivers, 'definitions', 'Many definitions', definitionScore, `${record.definitionCount || 0} functions/classes/exports detected.`, 'complexity');

  return { score, drivers };
}

function scoreLocalContext(record) {
  const drivers = [];
  let score = 0;

  if (record.isImportant) {
    score += 2;
    addDriver(drivers, 'important-file', 'Important file', 2, 'Repository analysis selected this as an important file.', 'context');
  }

  if (['api', 'service', 'data', 'entry', 'config'].includes(record.layer)) {
    score += 2;
    addDriver(drivers, 'planner-layer', 'Planning-sensitive layer', 2, `The file sits in the ${record.layer} layer.`, 'context');
  }

  if (record.securityInfo?.total > 0 || /auth|security|token|secret|database|route|service/i.test(record.path)) {
    score += 2;
    addDriver(drivers, 'debug-sensitive', 'Debug-sensitive path', 2, 'Path or findings match areas commonly involved in debugging and planning.', 'context');
  }

  return { score: clamp(score, 0, 6), drivers };
}

function estimateImpactFromGraph(record) {
  const downstreamWeight = record.dependents * 3;
  const upstreamWeight = record.imports * 0.45;
  const importanceWeight = Number(record.importance || 0) / 18;
  return clamp(downstreamWeight + upstreamWeight + importanceWeight, 0, 18);
}

function scoreBlastImpact(record, blastResult) {
  if (!blastResult) {
    const score = estimateImpactFromGraph(record);
    const drivers = [];
    addDriver(
      drivers,
      'estimated-impact',
      'Estimated impact',
      score,
      `${record.dependents} dependents and ${record.imports} imports provide a graph-based impact estimate.`,
      'impact'
    );
    return {
      score,
      affectedFilesCount: 0,
      impactMode: record.isGraphBacked ? 'graph-estimate' : 'unavailable',
      confidence: record.isGraphBacked ? 'medium' : 'low',
      drivers
    };
  }

  const affectedFilesCount = safeArray(blastResult.impactedFiles).length;
  const maxDepth = Number(blastResult.graphEvidence?.maxDepth || 0);
  const rawScore = (affectedFilesCount * 1.05) + (Number(blastResult.totalImpact || 0) * 0.42) + (maxDepth * 2.5);
  const score = clamp(rawScore, 0, 30);
  const drivers = [];

  addDriver(
    drivers,
    'blast-radius',
    'Blast radius',
    score,
    `${affectedFilesCount} files appear in bounded impact analysis (${blastResult.analysisMode || 'local'} mode).`,
    'impact'
  );

  return {
    score,
    affectedFilesCount,
    impactMode: blastResult.analysisMode || 'local',
    confidence: blastResult.confidence || 'medium',
    drivers
  };
}

function buildFileRecords(repoData, codeAnalysis) {
  const repositoryFiles = normalizeRepositoryFiles(repoData);
  const codeFiles = new Map(safeArray(codeAnalysis?.files).map(file => [getPath(file), file]));
  const importantFiles = new Map(safeArray(repoData?.importantFiles).map(file => [getPath(file), file]));
  const { nodeByPath, degreesByPath } = buildGraphMaps(repoData?.dependencyGraph);
  const { issueMap, totals: securityTotals } = buildSecurityMap(codeAnalysis);

  const allPaths = unique([
    ...repositoryFiles,
    ...safeArray(codeAnalysis?.files).map(getPath),
    ...safeArray(repoData?.importantFiles).map(getPath),
    ...safeArray(repoData?.dependencyGraph?.nodes).map(graphPathFromNode)
  ]);

  const records = allPaths.map(path => {
    const codeFile = codeFiles.get(path) || {};
    const importantFile = importantFiles.get(path) || {};
    const graphNode = nodeByPath.get(path) || {};
    const degree = degreesByPath.get(path) || {
      imports: Number(graphNode.importCount || 0),
      dependents: Number(graphNode.dependentCount || 0)
    };
    const layer = graphNode.layer || inferLayer(path);
    const definitions = getDefinitionsCount(codeFile) || getDefinitionsCount(importantFile);

    return {
      path,
      name: getFilename(path),
      directory: getDirectory(path),
      module: getModule(path),
      language: graphNode.language || codeFile.language || importantFile.language || getLanguage(path),
      layer,
      imports: Number(degree.imports || graphNode.importCount || 0),
      dependents: Number(degree.dependents || graphNode.dependentCount || 0),
      importance: Number(graphNode.importance || 0),
      isHub: Boolean(graphNode.isHub),
      isGraphBacked: Boolean(nodeByPath.has(path)),
      isImportant: importantFiles.has(path),
      hasCodeAnalysis: codeFiles.has(path),
      lines: Number(codeFile.lines || importantFile.lines || 0),
      size: Number(codeFile.size || importantFile.size || 0),
      definitionCount: definitions,
      securityInfo: issueMap.get(path) || { total: 0, critical: 0, high: 0, medium: 0, low: 0, issues: [] }
    };
  });

  return { records, repositoryFiles, securityTotals };
}

function scoreRecord(record, blastResult = null) {
  const centrality = scoreCentrality(record);
  const security = scoreSecurity(record.securityInfo);
  const complexity = scoreComplexity(record);
  const pathDrivers = getPathSensitivityDrivers(record.path, record.layer);
  const pathScore = clamp(pathDrivers.reduce((sum, driver) => sum + driver.points, 0), 0, 14);
  const localContext = scoreLocalContext(record);
  const impact = scoreBlastImpact(record, blastResult);
  const score = clampScore(
    impact.score +
    centrality.score +
    security.score +
    complexity.score +
    pathScore +
    localContext.score
  );
  const drivers = [
    ...impact.drivers,
    ...centrality.drivers,
    ...security.drivers,
    ...complexity.drivers,
    ...pathDrivers,
    ...localContext.drivers
  ].sort((a, b) => b.points - a.points);
  const componentScores = {
    blastRadius: Math.round(impact.score),
    centrality: Math.round(centrality.score),
    security: Math.round(security.score),
    complexity: Math.round(complexity.score),
    pathSensitivity: Math.round(pathScore),
    localContext: Math.round(localContext.score)
  };
  const riskCategories = buildRiskCategories({ ...record, level: getRiskLevel(score) }, drivers);
  const scoredFile = {
    ...record,
    componentScores,
    riskCategories,
    score,
    level: getRiskLevel(score),
    affectedFilesCount: impact.affectedFilesCount,
    impactMode: impact.impactMode,
    confidence: getConfidence({
      isGraphBacked: record.isGraphBacked,
      hasCodeAnalysis: record.hasCodeAnalysis,
      hasBlastData: Boolean(blastResult)
    }),
    topDrivers: drivers.slice(0, 5),
    drivers,
    blastSummary: blastResult?.impactSummary || ''
  };

  return {
    ...scoredFile,
    inspectRecommendation: buildInspectRecommendation(scoredFile)
  };
}

function buildModuleClusters(scoredFiles, maxClusters) {
  const clusters = new Map();

  scoredFiles.forEach(file => {
    const current = clusters.get(file.module) || {
      module: file.module,
      files: [],
      totalScore: 0,
      maxScore: 0,
      criticalFiles: 0,
      highFiles: 0,
      graphBackedFiles: 0,
      securityFindings: 0,
      driverCounts: new Map()
    };

    current.files.push(file);
    current.totalScore += file.score;
    current.maxScore = Math.max(current.maxScore, file.score);
    current.securityFindings += file.securityInfo?.total || 0;
    if (file.level === 'critical') current.criticalFiles += 1;
    if (file.level === 'high') current.highFiles += 1;
    if (file.isGraphBacked) current.graphBackedFiles += 1;

    file.topDrivers.forEach(driver => {
      const currentDriver = current.driverCounts.get(driver.label) || {
        label: driver.label,
        source: driver.source,
        count: 0,
        examples: []
      };
      currentDriver.count += 1;
      if (currentDriver.examples.length < 3) currentDriver.examples.push(file.path);
      current.driverCounts.set(driver.label, currentDriver);
    });

    clusters.set(file.module, current);
  });

  return Array.from(clusters.values())
    .map(cluster => {
      const averageScore = cluster.files.length ? Math.round(cluster.totalScore / cluster.files.length) : 0;
      const dominantDriverDetails = Array.from(cluster.driverCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(driver => ({
          label: driver.label,
          count: driver.count,
          source: driver.source,
          examples: driver.examples
        }));
      const topFiles = cluster.files
        .slice()
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map(file => ({
          path: file.path,
          score: file.score,
          level: file.level,
          topDriver: file.topDrivers[0]?.label || 'Local risk evidence'
        }));

      return {
        module: cluster.module,
        filesCount: cluster.files.length,
        averageScore,
        maxScore: cluster.maxScore,
        level: getRiskLevel(Math.max(cluster.maxScore, averageScore)),
        criticalFiles: cluster.criticalFiles,
        highFiles: cluster.highFiles,
        graphBackedFiles: cluster.graphBackedFiles,
        graphCoverage: cluster.files.length
          ? Number((cluster.graphBackedFiles / cluster.files.length).toFixed(3))
          : 0,
        securityFindings: cluster.securityFindings,
        dominantDrivers: dominantDriverDetails.map(({ label, count }) => ({ label, count })),
        dominantDriverDetails,
        topFiles,
        inspectionOrder: topFiles.map(file => ({
          path: file.path,
          score: file.score,
          reason: file.topDriver
        }))
      };
    })
    .sort((a, b) => (
      (b.criticalFiles - a.criticalFiles) ||
      (b.highFiles - a.highFiles) ||
      (b.maxScore - a.maxScore) ||
      (b.averageScore - a.averageScore)
    ))
    .slice(0, maxClusters);
}

function buildGlobalRiskDrivers(scoredFiles) {
  const driverMap = new Map();

  scoredFiles.slice(0, 120).forEach(file => {
    file.topDrivers.forEach(driver => {
      const current = driverMap.get(driver.id) || {
        id: driver.id,
        label: driver.label,
        source: driver.source,
        count: 0,
        totalPoints: 0,
        examples: []
      };

      current.count += 1;
      current.totalPoints += driver.points;
      if (current.examples.length < 4) {
        current.examples.push(file.path);
      }

      driverMap.set(driver.id, current);
    });
  });

  return Array.from(driverMap.values())
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 8);
}

function summarize(scoredFiles, moduleClusters, coverage) {
  const criticalFiles = scoredFiles.filter(file => file.level === 'critical').length;
  const highFiles = scoredFiles.filter(file => file.level === 'high').length;
  const averageRisk = scoredFiles.length
    ? Math.round(scoredFiles.reduce((sum, file) => sum + file.score, 0) / scoredFiles.length)
    : 0;

  return {
    totalFiles: coverage.totalFiles,
    scoredFiles: scoredFiles.length,
    criticalFiles,
    highFiles,
    criticalModules: moduleClusters.filter(cluster => cluster.level === 'critical' || cluster.level === 'high').length,
    averageRisk,
    topRiskFile: scoredFiles[0] || null,
    securityFindings: coverage.securityFindings,
    graphCoverage: coverage.graphCoverage
  };
}

function buildWarnings({ repoData, codeAnalysis, coverage }) {
  const warnings = [];

  if (!coverage.dependencyGraphAvailable) {
    warnings.push('Dependency graph is unavailable, so graph impact uses path and code-analysis fallback signals.');
  }

  if (!codeAnalysis?.files?.length) {
    warnings.push('Deep code analysis is unavailable or limited, so complexity and definition signals have lower confidence.');
  }

  if (!codeAnalysis?.security) {
    warnings.push('Security analysis is unavailable, so security risk is not included.');
  }

  if (!repoData?.importantFiles?.length) {
    warnings.push('Important-file metadata is unavailable, so repository priority signals are limited.');
  }

  return warnings;
}

export function buildDangerZoneHeatmap(repoData, codeAnalysis, options = {}) {
  const maxBlastCandidates = options.maxBlastCandidates || DEFAULT_MAX_BLAST_CANDIDATES;
  const maxRankedFiles = options.maxRankedFiles || DEFAULT_MAX_RANKED_FILES;
  const maxClusters = options.maxClusters || DEFAULT_MAX_CLUSTERS;
  const { records, repositoryFiles, securityTotals } = buildFileRecords(repoData, codeAnalysis);
  const dependencyGraph = repoData?.dependencyGraph || null;
  const dependencyGraphAvailable = Boolean(
    dependencyGraph &&
    safeArray(dependencyGraph.nodes).length > 0 &&
    safeArray(dependencyGraph.edges).length > 0
  );

  if (records.length === 0) {
    return {
      summary: summarize([], [], {
        totalFiles: 0,
        securityFindings: 0,
        graphCoverage: 0
      }),
      rankedFiles: [],
      moduleClusters: [],
      riskDrivers: [],
      coverage: {
        totalFiles: 0,
        analyzedFiles: 0,
        graphFiles: 0,
        graphEdges: 0,
        graphCoverage: 0,
        securityFindings: 0,
        blastAnalyzedCandidates: 0,
        dependencyGraphAvailable: false
      },
      warnings: ['No repository files were available for Heatmap analysis.']
    };
  }

  const preliminary = records
    .map(record => scoreRecord(record, null))
    .sort((a, b) => b.score - a.score);
  const blastCandidatePaths = new Set(preliminary.slice(0, maxBlastCandidates).map(file => file.path));
  const blastResults = new Map();

  preliminary.forEach(file => {
    if (!blastCandidatePaths.has(file.path)) return;

    try {
      const result = calculateBlastRadius(file.path, repositoryFiles, [], dependencyGraph, { direction: 'both' });
      if (result?.impactedFiles?.length) {
        blastResults.set(file.path, result);
      }
    } catch (error) {
      // Keep Heatmap deterministic and resilient. The page will still show local fallback scoring.
    }
  });

  const scoredFiles = records
    .map(record => scoreRecord(record, blastResults.get(record.path) || null))
    .sort((a, b) => (
      (b.score - a.score) ||
      (b.dependents - a.dependents) ||
      a.path.localeCompare(b.path)
    ));

  const moduleClusters = buildModuleClusters(scoredFiles, maxClusters);
  const securityFindings = Object.values(securityTotals).reduce((sum, count) => sum + count, 0);
  const coverage = {
    totalFiles: repositoryFiles.length || records.length,
    analyzedFiles: safeArray(codeAnalysis?.files).length,
    graphFiles: safeArray(dependencyGraph?.nodes).length,
    graphEdges: safeArray(dependencyGraph?.edges).length,
    graphCoverage: records.length
      ? Number((safeArray(dependencyGraph?.nodes).length / records.length).toFixed(3))
      : 0,
    securityFindings,
    blastAnalyzedCandidates: blastResults.size,
    dependencyGraphAvailable,
    supportedExtensions: dependencyGraph?.metadata?.supportedExtensions || []
  };
  const rankedFiles = scoredFiles.slice(0, maxRankedFiles);

  return {
    summary: summarize(scoredFiles, moduleClusters, coverage),
    rankedFiles,
    moduleClusters,
    riskDrivers: buildGlobalRiskDrivers(scoredFiles),
    coverage,
    warnings: buildWarnings({ repoData, codeAnalysis, coverage })
  };
}

export default buildDangerZoneHeatmap;
