import { buildArchitectureV2Graph } from '../../utils/repository/buildArchitectureV2Graph';
import { buildRepositoryGraphData, normalizeRepositoryFiles } from '../../utils/repository/buildGraphData';
import { calculateBlastRadius } from '../../utils/repository/blastRadiusAnalysis';
import { buildDangerZoneHeatmap } from '../../utils/repository/buildDangerZoneHeatmap';
import { buildPlannerContext } from '../../utils/repository/buildPlannerContext';
import { buildDebugTraceContext } from '../../utils/repository/buildDebugTraceContext';
import { buildDebugTraceGraph } from '../../utils/repository/buildDebugTraceGraph';
import { buildSecurityScan, redactEvidence } from '../../utils/security/buildSecurityScan';
import { readPdfState } from './pdfSessionBridge';

const MAX_TEXT_LENGTH = 1400;
const TOP_TABLE_LIMIT = 12;

const SEVERITY_RANK = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1
};

export const PDF_SECTION_ORDER = [
  'dashboard',
  'summary',
  'architecture',
  'onboarding',
  'documentation',
  'repository-graph',
  'blast-radius',
  'planner',
  'debug-navigator',
  'heatmap',
  'security'
];

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function sanitizePdfText(value, maxLength = MAX_TEXT_LENGTH) {
  if (value === null || value === undefined) return '';

  const text = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

export function redactSensitiveText(value) {
  return sanitizePdfText(value, 6000)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi, 'Bearer [redacted]')
    .replace(/\b(GITHUB_TOKEN|GROQ_API_KEY|GEMINI_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|[A-Z0-9_]*API[_-]?KEY|[A-Z0-9_]*TOKEN|[A-Z0-9_]*SECRET)\s*[:=]\s*['"]?[^'"\s]+/gi, '$1=[redacted]')
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, '[redacted-github-token]')
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[redacted-gemini-key]')
    .replace(/\bgsk_[0-9A-Za-z_-]{20,}\b/g, '[redacted-groq-key]')
    .replace(/\b[A-Za-z0-9_-]{36,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g, '[redacted-token]')
    .replace(/\b[A-Fa-f0-9]{48,}\b/g, '[redacted-secret]');
}

export function makePdfFileName(repoName, date = new Date()) {
  const safeName = sanitizePdfText(repoName || 'repository', 80)
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'repository';
  const day = date.toISOString().slice(0, 10);
  return `CodeAtlas_Report_${safeName}_${day}.pdf`;
}

function formatDate(value) {
  if (!value) return 'N/A';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString() : '0';
}

function formatPercent(value) {
  const number = Number(value || 0);
  return `${Math.round(number * 100)}%`;
}

function getRepoFiles(repoData) {
  return normalizeRepositoryFiles(
    Array.isArray(repoData?.fileTree) && repoData.fileTree.length > 0
      ? repoData.fileTree
      : repoData?.fileStructure
  );
}

function countDependencies(repoData, codeAnalysis) {
  const techCount = repoData?.techStack
    ? Object.values(repoData.techStack).flat().filter(Boolean).length
    : 0;
  const importCount = codeAnalysis?.imports ? Object.keys(codeAnalysis.imports).length : 0;
  const packageCount = repoData?.packageJson?.dependencies
    ? Object.keys(repoData.packageJson.dependencies).length
    : 0;

  return Math.max(techCount, importCount, packageCount);
}

function metric(label, value, detail = '') {
  return {
    label,
    value: value === null || value === undefined || value === '' ? 'N/A' : String(value),
    detail: sanitizePdfText(detail, 160)
  };
}

function table(title, headers, rows, note = '') {
  return {
    title,
    headers,
    rows: rows.map(row => row.map(cell => sanitizePdfText(cell, 240))),
    note: sanitizePdfText(note, 220)
  };
}

function list(title, items, note = '') {
  return {
    title,
    items: safeArray(items).map(item => sanitizePdfText(item, 360)).filter(Boolean),
    note: sanitizePdfText(note, 220)
  };
}

function sortFindings(findings) {
  return safeArray(findings).slice().sort((a, b) => (
    (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0) ||
    String(a.file || '').localeCompare(String(b.file || ''))
  ));
}

function getSeverityCounts(findings) {
  return safeArray(findings).reduce((acc, finding) => {
    const severity = finding?.severity || 'info';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, { critical: 0, high: 0, medium: 0, low: 0, info: 0 });
}

function getSecurityCacheKeys(repoData, codeAnalysis) {
  const repoInfo = repoData?.repoInfo || {};
  return [
    [
      'securityScan',
      'market-grade-v1',
      repoInfo.url || repoInfo.name || 'repo',
      repoInfo.updatedAt || 'unknown-update',
      repoData?.fileCount || repoData?.fileTree?.length || 0,
      codeAnalysis?.summary?.analyzedFiles || 0
    ].join(':'),
    [
      'securityScan',
      repoInfo.url || repoInfo.name || 'repo',
      repoInfo.updatedAt || 'unknown-update',
      repoData?.fileCount || repoData?.fileTree?.length || 0,
      codeAnalysis?.summary?.analyzedFiles || 0
    ].join(':'),
    'securityScanCache'
  ];
}

export function getSecurityExportData({ repoData, codeAnalysis, storage = window.sessionStorage }) {
  let scan = null;
  let source = 'deterministic fallback';

  if (storage) {
    for (const key of getSecurityCacheKeys(repoData, codeAnalysis)) {
      try {
        const cached = storage.getItem(key);
        if (cached) {
          scan = JSON.parse(cached);
          source = 'Security Scanner cache';
          break;
        }
      } catch {
        scan = null;
      }
    }
  }

  if (!scan && repoData) {
    try {
      scan = buildSecurityScan({ repoData, codeAnalysis });
    } catch (error) {
      scan = null;
    }
  }

  const findings = sortFindings(scan?.findings || scan?.issues || scan?.findingsBySeverity || []);
  const severityCounts = getSeverityCounts(findings);

  return {
    available: Boolean(scan),
    source,
    generatedAt: scan?.generatedAt || new Date().toISOString(),
    score: scan?.score || {
      overall: findings.length ? Math.max(35, 100 - findings.length * 5) : 92,
      level: findings.length ? 'review needed' : 'good'
    },
    coverage: scan?.sections?.coverage || {},
    findings,
    severityCounts,
    sourceCounts: findings.reduce((acc, finding) => {
      const itemSource = finding.source || 'unknown';
      acc[itemSource] = (acc[itemSource] || 0) + 1;
      return acc;
    }, {}),
    fixChecklist: safeArray(scan?.sections?.fixChecklist),
    supplyChain: scan?.sections?.supplyChain || null,
    dependencyVulnerabilities: scan?.sections?.dependencyVulnerabilities || null,
    aiExplanation: scan?.aiExplanation || null
  };
}

function buildDashboardSection({ repoData, repoSize, codeAnalysis, security }) {
  const repositoryFiles = getRepoFiles(repoData);
  const highRisk = (security.severityCounts.critical || 0) + (security.severityCounts.high || 0);
  const securityScore = security.available
    ? `${security.score?.overall ?? 'N/A'}/100`
    : 'Not scanned';

  return {
    id: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Repository mission-control summary',
    summary: 'A quick executive view of repository size, security posture, dependency signals, and highest-priority follow-up areas.',
    metrics: [
      metric('Total files', repoSize || repositoryFiles.length || repoData?.fileCount || 0),
      metric('Security score', securityScore, security.score?.level || ''),
      metric('High risk findings', highRisk),
      metric('Dependencies', countDependencies(repoData, codeAnalysis))
    ],
    lists: [
      list('Recommended focus', [
        highRisk > 0 ? 'Triage critical and high security findings first.' : 'Security posture has no critical or high deterministic findings in the available data.',
        repositoryFiles.length ? 'Use Repository Graph and Heatmap sections to inspect high-coupling files.' : 'Analyze repository files before relying on graph intelligence.',
        'Use Planner and Debug Navigator sections for task-specific or error-specific work.'
      ])
    ]
  };
}

function buildSummarySection({ repoData, repoSize, aiSummary, firstContributions }) {
  const repoInfo = repoData?.repoInfo || {};
  const techRows = Object.entries(repoData?.techStack || {})
    .filter(([, items]) => safeArray(items).length > 0)
    .map(([category, items]) => [category, safeArray(items).join(', ')]);
  const importantFiles = safeArray(repoData?.importantFiles).slice(0, TOP_TABLE_LIMIT);

  return {
    id: 'summary',
    title: 'Summary',
    subtitle: 'Repository overview and core analysis data',
    summary: sanitizePdfText(aiSummary || repoInfo.description || 'No AI summary is available yet.'),
    metrics: [
      metric('Repository', repoInfo.full_name || repoInfo.name || 'N/A'),
      metric('Language', repoInfo.language || 'N/A'),
      metric('Stars', formatNumber(repoInfo.stars)),
      metric('Files', formatNumber(repoSize || getRepoFiles(repoData).length)),
      metric('Last updated', formatDate(repoInfo.updatedAt)),
      metric('License', repoInfo.license || 'N/A')
    ],
    tables: [
      techRows.length ? table('Technology stack', ['Category', 'Detected technologies'], techRows) : null,
      importantFiles.length ? table(
        'Important files',
        ['Path', 'Type'],
        importantFiles.map(file => [file.path || file, file.type || file.category || 'important'])
      ) : null,
      safeArray(firstContributions).length ? table(
        'First contribution ideas',
        ['Task', 'File', 'Difficulty'],
        safeArray(firstContributions).slice(0, 8).map(item => [item.task, item.file, item.difficulty])
      ) : null
    ].filter(Boolean),
    lists: [
      repoData?.complexity ? list('Complexity factors', safeArray(repoData.complexity.factors), `${repoData.complexity.level} (${repoData.complexity.score}/100)`) : null,
      safeArray(repoData?.keyCommands).length ? list('Key commands', repoData.keyCommands.slice(0, 10)) : null,
      safeArray(repoData?.envVariables).length ? list('Environment variables', repoData.envVariables.slice(0, 12)) : null
    ].filter(Boolean)
  };
}

function buildArchitectureSection({ repoData, architectureAnalysis, detailedArchitecture, codeAnalysis }) {
  const modes = [
    ['overview', 'Overview'],
    ['system-context', 'System Context'],
    ['containers', 'Containers'],
    ['modules', 'Modules'],
    ['runtime-flow', 'Runtime Flow'],
    ['tech-stack', 'Tech Stack']
  ];
  const modeRows = modes.map(([viewMode, label]) => {
    const graph = buildArchitectureV2Graph({
      repoData,
      detailedArchitecture,
      codeAnalysis,
      viewMode,
      maxNodes: 80
    });
    return [
      label,
      graph.stats?.visibleNodes || graph.nodes?.length || 0,
      graph.stats?.visibleEdges || graph.edges?.length || 0,
      graph.stats?.architecturePattern || 'Inferred'
    ];
  });

  const overviewGraph = buildArchitectureV2Graph({ repoData, detailedArchitecture, codeAnalysis, viewMode: 'overview', maxNodes: 12 });
  const topElements = safeArray(overviewGraph.nodes).slice(0, 10).map(node => [
    node.data?.label || node.id,
    node.data?.layer || node.data?.architectureType || 'architecture',
    node.data?.description || node.data?.path || ''
  ]);

  return {
    id: 'architecture',
    title: 'Architecture',
    subtitle: 'Architecture V2 summaries and available diagram snapshots',
    summary: sanitizePdfText(architectureAnalysis || 'Architecture is inferred from repository structure, manifests, dependency graph evidence, and code analysis.'),
    metrics: [
      metric('Architecture modes', modes.length),
      metric('Analyzed files', codeAnalysis?.summary?.analyzedFiles || codeAnalysis?.files?.length || 0),
      metric('Patterns', safeArray(detailedArchitecture?.patterns).length || codeAnalysis?.summary?.patterns?.length || 0)
    ],
    tables: [
      table('Architecture diagram modes', ['Mode', 'Nodes', 'Edges', 'Pattern'], modeRows),
      topElements.length ? table('Key architecture elements', ['Element', 'Layer', 'Evidence'], topElements) : null
    ].filter(Boolean),
    diagramTypes: ['architecture']
  };
}

function buildOnboardingSection({ repoData, quickStartGuide, commonIssues, firstContributions }) {
  return {
    id: 'onboarding',
    title: 'Onboarding Guide',
    subtitle: 'Setup, common issues, and first contribution path',
    summary: sanitizePdfText(quickStartGuide || 'No AI quick-start guide is available yet. Use the repository commands and first contribution ideas below as a starting point.'),
    lists: [
      safeArray(repoData?.keyCommands).length ? list('Setup and run commands', repoData.keyCommands.slice(0, 10)) : null,
      commonIssues ? list('Common issues', String(commonIssues).split('\n').filter(Boolean).slice(0, 12)) : null,
      safeArray(firstContributions).length ? list('Suggested first contributions', safeArray(firstContributions).slice(0, 8).map(item => `${item.task} (${item.file || 'various files'})`)) : null,
      safeArray(repoData?.envVariables).length ? list('Environment variables to prepare', repoData.envVariables.slice(0, 12)) : null
    ].filter(Boolean)
  };
}

function extractApiRoutes(codeAnalysis) {
  const routes = [];
  const routePatterns = [
    /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi
  ];

  safeArray(codeAnalysis?.files).forEach(file => {
    if (!file?.content || !/(route|api|controller)/i.test(file.path || '')) return;
    routePatterns.forEach(pattern => {
      const matches = [...file.content.matchAll(pattern)];
      matches.forEach(match => routes.push({
        method: String(match[1] || '').toUpperCase(),
        path: match[2],
        file: file.path
      }));
    });
  });

  return routes.slice(0, TOP_TABLE_LIMIT);
}

function extractEnvVariables(codeAnalysis) {
  const envVars = new Set();
  const envPattern = /process\.env\.([A-Z_][A-Z0-9_]*)/g;

  safeArray(codeAnalysis?.files).forEach(file => {
    if (!file?.content) return;
    [...file.content.matchAll(envPattern)].forEach(match => envVars.add(match[1]));
  });

  return Array.from(envVars).slice(0, TOP_TABLE_LIMIT);
}

function buildDocumentationSection({ repoData, codeAnalysis }) {
  const apiRoutes = extractApiRoutes(codeAnalysis);
  const envVariables = extractEnvVariables(codeAnalysis);
  const keyFunctions = safeArray(codeAnalysis?.definitions?.functions).slice(0, 8);

  return {
    id: 'documentation',
    title: 'Documentation',
    subtitle: 'API routes, key functions, environment, README, and codebase insights',
    summary: sanitizePdfText(repoData?.readme && repoData.readme !== 'No README found' ? repoData.readme : 'No README content was available in the analysis.', 1100),
    metrics: [
      metric('API routes', apiRoutes.length),
      metric('Key functions', keyFunctions.length),
      metric('Env variables', envVariables.length),
      metric('Analyzed lines', codeAnalysis?.summary?.totalLines || 0)
    ],
    tables: [
      apiRoutes.length ? table('API endpoints', ['Method', 'Path', 'File'], apiRoutes.map(route => [route.method, route.path, route.file])) : null,
      keyFunctions.length ? table('Key functions', ['Function', 'File', 'Line'], keyFunctions.map(item => [item.name, item.file, item.line])) : null
    ].filter(Boolean),
    lists: [
      envVariables.length ? list('Environment variables found in code', envVariables) : null,
      safeArray(codeAnalysis?.summary?.frameworks).length ? list('Frameworks and libraries', codeAnalysis.summary.frameworks.slice(0, 12)) : null
    ].filter(Boolean)
  };
}

function buildRepositoryGraphSection({ repoData }) {
  const modes = [
    ['dependencies', 'Dependencies'],
    ['folders', 'Folders'],
    ['entry', 'Entry Points'],
    ['high-coupling', 'High Coupling']
  ];
  const graphs = modes.map(([viewMode, label]) => ({
    label,
    model: buildRepositoryGraphData(repoData, { viewMode, maxNodes: 42, maxEdges: 110 })
  }));
  const primary = graphs[0]?.model || {};
  const topFiles = safeArray(primary.fileIndex)
    .slice()
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, TOP_TABLE_LIMIT);

  return {
    id: 'repository-graph',
    title: 'Repository Graph',
    subtitle: 'Dependency graph coverage, important files, and available graph snapshots',
    summary: sanitizePdfText(primary.visibleSummary?.description || 'Repository graph summarizes file relationships from dependency analysis and file-structure fallback data.'),
    metrics: [
      metric('Graph-backed files', primary.stats ? `${primary.stats.graphFileCount}/${primary.stats.totalRepoFiles}` : 0),
      metric('Graph edges', primary.stats?.graphEdgeCount || 0),
      metric('Coverage', primary.stats ? formatPercent(primary.stats.coverageRatio) : '0%'),
      metric('Visible nodes', primary.stats?.shownNodeCount || primary.nodes?.length || 0)
    ],
    tables: [
      table('Graph modes', ['Mode', 'Nodes', 'Edges', 'Source'], graphs.map(({ label, model }) => [
        label,
        model.nodes?.length || 0,
        model.edges?.length || 0,
        model.stats?.sourceMode || model.visibleSummary?.mode || 'fallback'
      ])),
      topFiles.length ? table('Important graph files', ['Path', 'Layer', 'Imports', 'Imported by'], topFiles.map(item => [
        item.path,
        item.layer,
        item.importCount,
        item.dependentCount
      ])) : null
    ].filter(Boolean),
    diagramTypes: ['repository-graph']
  };
}

function buildBlastRadiusSection({ repoData, storage }) {
  const saved = readPdfState('blast-radius', repoData, storage);
  const repositoryFiles = getRepoFiles(repoData);
  let selectedFile = saved?.selectedFile || repositoryFiles[0] || '';
  let blastRadius = saved?.blastRadius || null;
  let source = saved?.blastRadius ? 'User-created Blast Radius analysis' : 'Default repository-derived analysis';

  if (!blastRadius && selectedFile) {
    try {
      blastRadius = calculateBlastRadius(selectedFile, repositoryFiles, [], repoData?.dependencyGraph, { direction: 'both' });
    } catch {
      blastRadius = null;
    }
  }

  const rankedFiles = safeArray(blastRadius?.rankedImpactedFiles).slice(0, TOP_TABLE_LIMIT);

  return {
    id: 'blast-radius',
    title: 'Blast Radius',
    subtitle: source,
    summary: sanitizePdfText(blastRadius?.impactSummary || 'No blast radius result is available yet. Analyze a file in Blast Radius to include user-selected impact details.'),
    metrics: [
      metric('Selected file', selectedFile || 'N/A'),
      metric('Severity', blastRadius?.severity || 'N/A'),
      metric('Impact score', blastRadius?.totalImpact ?? 0),
      metric('Impacted files', safeArray(blastRadius?.impactedFiles).length),
      metric('Confidence', blastRadius?.confidence || 'N/A')
    ],
    tables: [
      rankedFiles.length ? table('Ranked impacted files', ['Path', 'Role', 'Confidence', 'Reason'], rankedFiles.map(item => [
        item.path,
        item.role || item.direction || 'impacted',
        item.confidence || 'low',
        item.reason || ''
      ])) : null
    ].filter(Boolean),
    lists: [
      safeArray(blastRadius?.riskFactors).length ? list('Risk factors', blastRadius.riskFactors.map(item => `${item.label}: ${item.description || `+${item.weight}`}`)) : null,
      safeArray(blastRadius?.testRecommendations).length ? list('Testing recommendations', blastRadius.testRecommendations.map(item => `${item.title}: ${item.detail}`)) : null,
      saved?.reasoning ? list('AI reasoning', [saved.reasoning]) : null
    ].filter(Boolean)
  };
}

function buildPlannerSection({ repoData, codeAnalysis, firstContributions, storage }) {
  const saved = readPdfState('planner', repoData, storage);
  const fallbackTask = safeArray(firstContributions)[0]?.task || 'Plan the safest first improvement for this repository';
  const context = saved?.plan
    ? saved
    : {
        taskText: fallbackTask,
        plan: buildPlannerContext({ taskText: fallbackTask, repoData, codeAnalysis }).plan,
        mode: 'Default repository-derived plan',
        status: 'default'
      };
  const plan = context.plan || {};
  const affectedSystems = plan.affectedSystems || {};

  return {
    id: 'planner',
    title: 'Planner',
    subtitle: context.status === 'generated' ? 'User-created plan' : 'Default repository-derived plan',
    summary: sanitizePdfText(plan.intent?.rationale || plan.taskTitle || 'No user-created Planner task exists yet. This section includes a default planning summary.'),
    metrics: [
      metric('Task', plan.taskTitle || context.taskText || fallbackTask),
      metric('Mode', context.mode || plan.mode || 'Deterministic context'),
      metric('Confidence', plan.confidence || 'N/A'),
      metric('Risk level', plan.riskLevel || 'N/A')
    ],
    tables: [
      safeArray(plan.suggestedFiles).length ? table('Suggested files', ['Path', 'Action', 'Confidence'], safeArray(plan.suggestedFiles).slice(0, TOP_TABLE_LIMIT).map(file => [
        file.path,
        file.action || 'Review',
        file.confidence || file.score || 'N/A'
      ])) : null,
      safeArray(affectedSystems.modules).length ? table('Affected modules', ['Module', 'Files', 'Reason'], safeArray(affectedSystems.modules).slice(0, 8).map(module => [
        module.name,
        module.fileCount || 0,
        module.reason || safeArray(module.reasons).join('; ')
      ])) : null,
      safeArray(plan.roadmap).length ? table('Roadmap', ['Step', 'Title', 'Detail'], safeArray(plan.roadmap).slice(0, 8).map((step, index) => [
        index + 1,
        step.title,
        step.detail
      ])) : null
    ].filter(Boolean),
    lists: [
      safeArray(plan.risks).length ? list('Risks', plan.risks.map(item => item.title ? `${item.title}: ${item.detail}` : item)) : null,
      safeArray(plan.validationChecklist).length ? list('Validation checklist', plan.validationChecklist.map(item => item.command || item.label || item.detail)) : null,
      safeArray(plan.missingContext).length ? list('Missing context', plan.missingContext) : null
    ].filter(Boolean)
  };
}

function buildDebugNavigatorSection({ repoData, codeAnalysis, storage }) {
  const saved = readPdfState('debug-navigator', repoData, storage);
  const errorText = saved?.redactedInput || '';
  const debugContext = saved?.debugContext || buildDebugTraceContext({ errorText: '', repoData, codeAnalysis });
  const graphModel = saved?.graphSummary || buildDebugTraceGraph(debugContext);
  const hasUserDebugWork = Boolean(saved?.hasInput);

  return {
    id: 'debug-navigator',
    title: 'Debug Navigator',
    subtitle: hasUserDebugWork ? 'User-created debug report' : 'No debug session created yet',
    summary: hasUserDebugWork
      ? sanitizePdfText(debugContext.errorSummary?.message || errorText || 'Debug input was captured and redacted.')
      : 'No Debug Navigator input exists yet. Paste an error in the app to include root-cause candidates and trace details.',
    metrics: [
      metric('Confidence', debugContext.confidence || 'N/A'),
      metric('Parsed frames', debugContext.coverage?.parsedFrames || 0),
      metric('Matched files', debugContext.coverage?.matchedFiles || 0),
      metric('Trace nodes', graphModel.nodes?.length || 0),
      metric('Trace edges', graphModel.edges?.length || 0)
    ],
    tables: [
      safeArray(debugContext.rootCauseCandidates).length ? table('Root cause candidates', ['File', 'Confidence', 'Reason'], safeArray(debugContext.rootCauseCandidates).slice(0, 8).map(item => [
        item.path,
        item.confidence || 'low',
        item.reason || item.hypothesis?.label || ''
      ])) : null,
      safeArray(debugContext.matchedFiles).length ? table('Matched files', ['Path', 'Confidence', 'Reason'], safeArray(debugContext.matchedFiles).slice(0, 8).map(item => [
        item.path,
        item.confidence || 'low',
        safeArray(item.reasons).join('; ') || item.reason || ''
      ])) : null
    ].filter(Boolean),
    lists: [
      errorText ? list('Redacted debug input', [redactSensitiveText(errorText)]) : null,
      safeArray(debugContext.validationChecklist).length ? list('Validation steps', debugContext.validationChecklist.map(item => item.command || item.label || item.detail)) : null,
      safeArray(debugContext.warnings).length ? list('Warnings', debugContext.warnings) : null
    ].filter(Boolean),
    diagramTypes: ['debug-navigator']
  };
}

function buildHeatmapSection({ repoData, codeAnalysis }) {
  const heatmap = buildDangerZoneHeatmap(repoData, codeAnalysis);

  return {
    id: 'heatmap',
    title: 'Heatmap',
    subtitle: 'Danger Zone ranking across files and modules',
    summary: sanitizePdfText(heatmap.summary?.topRiskFile
      ? `Inspect first: ${heatmap.summary.topRiskFile.path} (${heatmap.summary.topRiskFile.score} risk).`
      : 'Heatmap ranks files by blast radius, graph centrality, security findings, complexity, and path sensitivity.'),
    metrics: [
      metric('Critical files', heatmap.summary?.criticalFiles || 0),
      metric('High-risk files', heatmap.summary?.highFiles || 0),
      metric('Risky modules', heatmap.summary?.criticalModules || 0),
      metric('Graph coverage', formatPercent(heatmap.coverage?.graphCoverage || 0)),
      metric('Average risk', heatmap.summary?.averageRisk || 0)
    ],
    tables: [
      safeArray(heatmap.moduleClusters).length ? table('Critical clusters', ['Module', 'Max risk', 'Files', 'Top drivers'], safeArray(heatmap.moduleClusters).slice(0, 8).map(cluster => [
        cluster.module,
        cluster.maxScore,
        cluster.filesCount,
        safeArray(cluster.dominantDrivers).map(driver => driver.label).join(', ')
      ])) : null,
      safeArray(heatmap.rankedFiles).length ? table('Ranked danger files', ['Path', 'Risk', 'Level', 'Reason'], safeArray(heatmap.rankedFiles).slice(0, TOP_TABLE_LIMIT).map(file => [
        file.path,
        file.score,
        file.level,
        file.inspectRecommendation || safeArray(file.topDrivers).map(driver => driver.label).join(', ')
      ])) : null
    ].filter(Boolean),
    lists: [
      safeArray(heatmap.riskDrivers).length ? list('Top risk drivers', heatmap.riskDrivers.map(driver => `${driver.label}: ${driver.count} files, ${driver.totalPoints} points`)) : null,
      safeArray(heatmap.warnings).length ? list('Heatmap warnings', heatmap.warnings) : null
    ].filter(Boolean)
  };
}

function buildSecuritySection({ security }) {
  const findings = sortFindings(security.findings);
  const topFindings = findings.slice(0, TOP_TABLE_LIMIT);

  return {
    id: 'security',
    title: 'Security Scanner',
    subtitle: `Source: ${security.source}`,
    summary: security.available
      ? `Security score is ${security.score?.overall ?? 'N/A'}/100 (${security.score?.level || 'unknown'}). ${findings.length} deterministic findings are included.`
      : 'No security scan was available. The PDF includes a fallback summary only.',
    metrics: [
      metric('Score', `${security.score?.overall ?? 'N/A'}/100`, security.score?.level || ''),
      metric('Critical', security.severityCounts.critical || 0),
      metric('High', security.severityCounts.high || 0),
      metric('Medium', security.severityCounts.medium || 0),
      metric('Total findings', findings.length),
      metric('Scanned files', security.coverage?.scannedFiles || security.coverage?.filesWithContent || 0)
    ],
    tables: [
      table('Severity breakdown', ['Severity', 'Count'], Object.entries(security.severityCounts).map(([severity, count]) => [severity, count])),
      topFindings.length ? table('Prioritized vulnerabilities', ['Severity', 'Title', 'File', 'Recommended fix'], topFindings.map(finding => [
        finding.severity,
        finding.title,
        `${finding.file || 'n/a'}${finding.line ? `:${finding.line}` : ''}`,
        finding.recommendation || finding.fix?.summary || 'Review finding'
      ]), findings.length > topFindings.length ? `Showing top ${topFindings.length} of ${findings.length} findings.` : '') : null
    ].filter(Boolean),
    lists: [
      topFindings.length ? list('Redacted evidence', topFindings.map(finding => `${finding.title}: ${redactEvidence(finding.redactedEvidence || finding.evidence || 'No evidence provided.')}`)) : null,
      safeArray(security.fixChecklist).length ? list('Fix checklist', security.fixChecklist.slice(0, 10).map(item => `${item.title} (${item.file}): ${item.action}`)) : null,
      security.aiExplanation?.summary ? list('AI security explanation', [security.aiExplanation.summary]) : null
    ].filter(Boolean)
  };
}

export function buildReportData({
  repoData,
  repoSize,
  aiSummary,
  quickStartGuide,
  commonIssues,
  firstContributions,
  architectureAnalysis,
  detailedArchitecture,
  codeAnalysis,
  storage = window.sessionStorage
}) {
  const repoInfo = repoData?.repoInfo || {};
  const security = getSecurityExportData({ repoData, codeAnalysis, storage });
  const generatedAt = new Date();
  const repositoryFiles = getRepoFiles(repoData);

  const sections = [
    buildDashboardSection({ repoData, repoSize, codeAnalysis, security }),
    buildSummarySection({ repoData, repoSize, aiSummary, firstContributions }),
    buildArchitectureSection({ repoData, architectureAnalysis, detailedArchitecture, codeAnalysis }),
    buildOnboardingSection({ repoData, quickStartGuide, commonIssues, firstContributions }),
    buildDocumentationSection({ repoData, codeAnalysis }),
    buildRepositoryGraphSection({ repoData }),
    buildBlastRadiusSection({ repoData, storage }),
    buildPlannerSection({ repoData, codeAnalysis, firstContributions, storage }),
    buildDebugNavigatorSection({ repoData, codeAnalysis, storage }),
    buildHeatmapSection({ repoData, codeAnalysis }),
    buildSecuritySection({ security })
  ];

  return {
    meta: {
      appName: 'CodeAtlas',
      title: 'CodeAtlas Repository Intelligence Report',
      repoName: repoInfo.full_name || repoInfo.name || 'Repository',
      repoUrl: repoInfo.url || '',
      primaryLanguage: repoInfo.language || 'N/A',
      generatedAt,
      generatedDateLabel: formatDate(generatedAt),
      fileCount: repoSize || repositoryFiles.length || repoData?.fileCount || 0,
      filename: makePdfFileName(repoInfo.full_name || repoInfo.name || 'repository', generatedAt)
    },
    sections
  };
}
