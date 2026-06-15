const GUIDE_VERSION = 'v2';

const SECURITY_ORDER = ['critical', 'high', 'medium', 'low'];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function unique(values) {
  return Array.from(
    new Set(
      values
        .filter(Boolean)
        .map(value => String(value).trim())
        .filter(Boolean)
    )
  );
}

function limitText(value, maxLength = 420) {
  const text = cleanText(value);
  if (!text || text === 'No README found') return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function getPath(file) {
  return typeof file === 'string' ? file : file?.path;
}

function topFolder(path = '') {
  const parts = path.split('/').filter(Boolean);
  return parts.length > 1 ? parts[0] : 'root';
}

function parseGitHubIdentity(url = '') {
  const match = String(url).match(/github\.com\/([^/\s]+)\/([^/#?\s]+)/i);
  if (!match) return '';
  return `${match[1]}/${match[2].replace(/\.git$/i, '')}`;
}

export function getOnboardingRepositoryKey(repoData) {
  const repoInfo = repoData?.repoInfo || {};
  return (
    cleanText(repoInfo.full_name) ||
    parseGitHubIdentity(repoInfo.url || repoInfo.html_url) ||
    cleanText(repoInfo.name) ||
    'unknown-repository'
  );
}

function collectRepositoryPaths(repoData, codeAnalysis) {
  return unique([
    ...safeArray(repoData?.fileTree).map(getPath),
    ...safeArray(repoData?.fileStructure).map(getPath),
    ...safeArray(repoData?.importantFiles).map(getPath),
    ...safeArray(codeAnalysis?.files).map(getPath)
  ]);
}

function normalizeTechStack(techStack) {
  if (!techStack || typeof techStack !== 'object') return [];

  return Object.entries(techStack)
    .map(([category, items]) => ({
      category,
      items: unique(Array.isArray(items) ? items : [items])
    }))
    .filter(group => group.items.length > 0);
}

function buildTopFolders(paths, limit = 5) {
  const counts = new Map();
  paths.forEach((path) => {
    const folder = topFolder(path);
    counts.set(folder, (counts.get(folder) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([folder, count]) => ({ folder, count }))
    .sort((a, b) => b.count - a.count || a.folder.localeCompare(b.folder))
    .slice(0, limit);
}

function findDocs(paths) {
  return paths
    .filter(path => /(^|\/)(readme|contributing|docs|architecture|getting-started|setup).*\.md$/i.test(path))
    .slice(0, 5);
}

function pickEntryPoints(paths, importantFiles) {
  const importantPaths = safeArray(importantFiles).map(getPath).filter(Boolean);
  const candidates = unique([...importantPaths, ...paths]);

  return candidates
    .filter(path => (
      /(^|\/)(index|main|app|server|cli)\.(js|jsx|ts|tsx|py|go|java)$/i.test(path) ||
      /(^|\/)(package\.json|vite\.config|next\.config|src\/App\.(js|jsx|ts|tsx)|public\/index\.html)$/i.test(path) ||
      /(^|\/)(api|pages|app)\//i.test(path)
    ))
    .slice(0, 6);
}

function pickPackageManager(paths) {
  if (paths.some(path => /(^|\/)pnpm-lock\.yaml$/i.test(path))) return 'pnpm';
  if (paths.some(path => /(^|\/)yarn\.lock$/i.test(path))) return 'yarn';
  return 'npm';
}

function scriptCommand(packageManager, scriptName) {
  if (packageManager === 'yarn') {
    return scriptName === 'start' ? 'yarn start' : `yarn ${scriptName}`;
  }
  if (packageManager === 'pnpm') {
    return scriptName === 'start' ? 'pnpm start' : `pnpm run ${scriptName}`;
  }
  return scriptName === 'start' ? 'npm start' : `npm run ${scriptName}`;
}

function buildSetup(repoData, paths) {
  const packageJson = repoData?.packageJson && typeof repoData.packageJson === 'object'
    ? repoData.packageJson
    : null;
  const packageManager = pickPackageManager(paths);
  const scripts = Object.entries(packageJson?.scripts || {}).map(([name, command]) => ({
    name,
    command: scriptCommand(packageManager, name),
    rawCommand: command
  }));

  const preferredScriptNames = ['dev', 'start', 'build', 'test', 'lint'];
  const recommendedCommands = [];

  if (packageJson) {
    recommendedCommands.push({
      label: 'Install dependencies',
      command: packageManager === 'yarn' ? 'yarn install' : `${packageManager} install`,
      source: 'package.json'
    });
  }

  preferredScriptNames.forEach((name) => {
    const script = scripts.find(item => item.name === name);
    if (script) {
      recommendedCommands.push({
        label: `${name.charAt(0).toUpperCase()}${name.slice(1)} script`,
        command: script.command,
        source: `package.json scripts.${name}`
      });
    }
  });

  const envVariables = safeArray(repoData?.envVariables)
    .map((item) => ({
      key: cleanText(item?.key || item?.name || item),
      example: cleanText(item?.example || item?.value),
      description: cleanText(item?.description || item?.source)
    }))
    .filter(item => item.key);

  return {
    packageManager,
    hasPackageJson: Boolean(packageJson),
    scripts,
    recommendedCommands,
    envVariables
  };
}

function normalizeRisk(issue, severity) {
  return {
    id: `${severity}:${issue.file || issue.path || issue.title || issue.type || issue.message || 'issue'}:${issue.line || ''}`,
    severity,
    title: cleanText(issue.title || issue.type || issue.message, 'Static analysis finding'),
    description: cleanText(issue.description || issue.message || issue.fix || issue.recommendation),
    file: cleanText(issue.file || issue.path),
    line: issue.line || issue.lineNumber || null,
    code: cleanText(issue.code)
  };
}

function collectRiskHighlights(codeAnalysis) {
  const security = codeAnalysis?.security || {};
  const directIssues = SECURITY_ORDER.flatMap(severity =>
    safeArray(security[severity]).map(issue => normalizeRisk(issue, severity))
  );
  const nestedIssues = SECURITY_ORDER.flatMap(severity =>
    safeArray(security.vulnerabilities?.[severity]).map(issue => normalizeRisk(issue, severity))
  );
  const issues = unique([...directIssues, ...nestedIssues].map(issue => JSON.stringify(issue)))
    .map(serialized => JSON.parse(serialized));

  if (issues.length > 0) {
    return issues.slice(0, 6);
  }

  if (codeAnalysis?.summary?.analyzedFiles) {
    return [{
      id: 'analysis:no-security-findings',
      severity: 'low',
      title: 'No security findings in analyzed files',
      description: `${codeAnalysis.summary.analyzedFiles} analyzed files did not produce static security findings.`,
      file: '',
      line: null,
      code: ''
    }];
  }

  return [];
}

function landmarkScore(item) {
  let score = 0;
  if (item.kind === 'export') score += 5;
  if (item.kind === 'class') score += 4;
  if (/app|index|main|server|route|controller|service|api/i.test(item.file || '')) score += 3;
  if (item.line) score += 1;
  return score;
}

function collectCodeLandmarks(codeAnalysis, importantFiles) {
  const importantPaths = new Set(safeArray(importantFiles).map(getPath).filter(Boolean));
  const definitions = [
    ...safeArray(codeAnalysis?.definitions?.exports).map(item => ({ ...item, kind: 'export' })),
    ...safeArray(codeAnalysis?.definitions?.classes).map(item => ({ ...item, kind: 'class' })),
    ...safeArray(codeAnalysis?.definitions?.functions).map(item => ({ ...item, kind: 'function' }))
  ];

  return definitions
    .map((item) => ({
      id: `${item.kind}:${item.file || 'unknown'}:${item.name || 'anonymous'}:${item.line || ''}`,
      name: cleanText(item.name, 'Unnamed symbol'),
      kind: item.kind,
      file: cleanText(item.file),
      line: item.line || null,
      async: Boolean(item.async),
      important: importantPaths.has(item.file)
    }))
    .filter(item => item.file)
    .sort((a, b) => {
      if (a.important !== b.important) return a.important ? -1 : 1;
      return landmarkScore(b) - landmarkScore(a);
    })
    .slice(0, 8);
}

function buildArchitectureBrief({ repoData, codeAnalysis, detailedArchitecture, paths, techStack }) {
  const folders = buildTopFolders(paths);
  const frameworks = unique([
    ...safeArray(detailedArchitecture?.frameworks),
    ...safeArray(codeAnalysis?.summary?.frameworks),
    ...techStack.flatMap(group => group.items)
  ]).slice(0, 8);

  const architectureType = (
    cleanText(detailedArchitecture?.architecture?.type) ||
    cleanText(repoData?.architecture?.pattern) ||
    cleanText(codeAnalysis?.summary?.patterns?.[0])
  );

  return {
    type: architectureType,
    patterns: unique([
      ...safeArray(codeAnalysis?.summary?.patterns),
      ...Object.entries(detailedArchitecture?.architecture?.patterns || {})
        .filter(([, detected]) => Boolean(detected))
        .map(([name]) => name)
    ]).slice(0, 8),
    frameworks,
    folders,
    totalFiles: paths.length
  };
}

function buildReadingPath({ repoData, paths, entryPoints, topFolders }) {
  const docs = findDocs(paths);
  const packageFile = paths.find(path => /(^|\/)package\.json$/i.test(path));
  const envExample = paths.find(path => /(^|\/)\.env\.example$/i.test(path));
  const readmeAvailable = cleanText(repoData?.readme) && repoData?.readme !== 'No README found';

  return unique([
    readmeAvailable ? 'README.md' : null,
    ...docs,
    packageFile,
    ...entryPoints,
    ...topFolders.map(item => `${item.folder}/`),
    envExample
  ]).slice(0, 7);
}

function normalizeContributions(firstContributions) {
  return safeArray(firstContributions)
    .map((item, index) => ({
      id: `contribution:${cleanText(item?.file, 'repo')}:${index}`,
      task: cleanText(item?.task || item?.title, `Contribution ${index + 1}`),
      file: cleanText(item?.file || item?.path),
      difficulty: cleanText(item?.difficulty),
      impact: cleanText(item?.impact || item?.description)
    }))
    .filter(item => item.task)
    .slice(0, 6);
}

function addChecklistItem(items, item) {
  items.push({
    id: item.id,
    title: item.title,
    description: item.description,
    actions: unique(item.actions || []).slice(0, 5),
    evidence: unique(item.evidence || []).slice(0, 5),
    status: item.status || 'ready'
  });
}

function buildChecklist({ overview, setup, architectureBrief, readingPath, codeLandmarks, riskHighlights, firstContributions }) {
  const items = [];

  addChecklistItem(items, {
    id: 'understand-repository',
    title: 'Understand the project mission',
    description: 'Start with the repository purpose, owner-facing README, and the primary technology signals.',
    actions: [
      overview.description ? `Read the repository description: ${overview.description}` : 'Read the README or repository overview.',
      overview.language ? `Note the primary language: ${overview.language}` : null,
      overview.techStack.length > 0 ? `Review detected tech: ${overview.techStack.slice(0, 5).join(', ')}` : null
    ],
    evidence: [
      overview.name,
      overview.language ? `Language: ${overview.language}` : null,
      overview.techStack.length > 0 ? `${overview.techStack.length} technology signals` : null
    ]
  });

  addChecklistItem(items, {
    id: 'prepare-local-environment',
    title: 'Prepare the local environment',
    description: 'Use the repository manifest and environment hints before changing source code.',
    actions: setup.recommendedCommands.length > 0
      ? setup.recommendedCommands.map(item => `${item.command} (${item.source})`)
      : ['Use the README and config files to identify the local setup command.'],
    evidence: [
      setup.hasPackageJson ? 'package.json detected' : null,
      setup.scripts.length > 0 ? `${setup.scripts.length} package scripts detected` : null,
      setup.envVariables.length > 0 ? `${setup.envVariables.length} environment variables detected` : null
    ]
  });

  addChecklistItem(items, {
    id: 'follow-reading-path',
    title: 'Follow the repository reading path',
    description: 'Read the most useful files and folders in an order that builds context quickly.',
    actions: readingPath.length > 0
      ? readingPath.map((path, index) => `${index + 1}. Open ${path}`)
      : ['Open the main README, manifest, and top-level source folders.'],
    evidence: readingPath
  });

  addChecklistItem(items, {
    id: 'map-architecture',
    title: 'Map the architecture before editing',
    description: 'Connect the high-level project shape to the source folders and framework signals.',
    actions: [
      architectureBrief.type ? `Confirm the detected architecture type: ${architectureBrief.type}` : null,
      architectureBrief.folders.length > 0 ? `Inspect major folders: ${architectureBrief.folders.map(item => `${item.folder}/`).join(', ')}` : null,
      architectureBrief.patterns.length > 0 ? `Review detected patterns: ${architectureBrief.patterns.join(', ')}` : null
    ],
    evidence: [
      architectureBrief.type,
      architectureBrief.frameworks.length > 0 ? architectureBrief.frameworks.join(', ') : null,
      architectureBrief.folders.length > 0 ? `${architectureBrief.folders.length} top folders ranked` : null
    ]
  });

  addChecklistItem(items, {
    id: 'inspect-code-landmarks',
    title: 'Inspect code landmarks',
    description: 'Use extracted functions, classes, and exports to find important implementation touchpoints.',
    actions: codeLandmarks.length > 0
      ? codeLandmarks.slice(0, 5).map(item => `${item.name} in ${item.file}${item.line ? `:${item.line}` : ''}`)
      : ['Wait for code analysis or inspect important source files manually.'],
    evidence: codeLandmarks.slice(0, 5).map(item => `${item.kind}: ${item.name}`)
  });

  addChecklistItem(items, {
    id: 'review-risks-and-quality',
    title: 'Review risks and quality signals',
    description: 'Check read-only findings from the existing code analysis before picking a first change.',
    actions: [
      riskHighlights.length > 0 ? `Review ${riskHighlights.length} risk or quality signals shown below.` : 'Run code analysis to populate risk and quality signals.',
      setup.scripts.some(script => script.name === 'test') ? `Run ${scriptCommand(setup.packageManager, 'test')}` : null,
      setup.scripts.some(script => script.name === 'build') ? `Run ${scriptCommand(setup.packageManager, 'build')}` : null
    ],
    evidence: riskHighlights.slice(0, 4).map(item => `${item.severity}: ${item.title}`)
  });

  addChecklistItem(items, {
    id: 'choose-first-contribution',
    title: 'Choose a first contribution',
    description: 'Start with a focused task that has a clear file target and visible project impact.',
    actions: firstContributions.length > 0
      ? firstContributions.slice(0, 4).map(item => item.file ? `${item.task} (${item.file})` : item.task)
      : ['Use the reading path and code landmarks to choose a small documentation, test, or bug-fix task.'],
    evidence: firstContributions.slice(0, 4).map(item => item.file || item.task)
  });

  return items;
}

export function buildOnboardingGuideModel({
  repoData,
  codeAnalysis,
  detailedArchitecture,
  aiSummary,
  quickStartGuide,
  commonIssues,
  firstContributions
} = {}) {
  if (!repoData) return null;

  const paths = collectRepositoryPaths(repoData, codeAnalysis);
  const repositoryKey = getOnboardingRepositoryKey(repoData);
  const techStackGroups = normalizeTechStack(repoData?.techStack);
  const techStack = unique(techStackGroups.flatMap(group => group.items));
  const setup = buildSetup(repoData, paths);
  const topFolders = buildTopFolders(paths);
  const entryPoints = pickEntryPoints(paths, repoData?.importantFiles);
  const architectureBrief = buildArchitectureBrief({
    repoData,
    codeAnalysis,
    detailedArchitecture,
    paths,
    techStack: techStackGroups
  });
  const readingPath = buildReadingPath({ repoData, paths, entryPoints, topFolders });
  const codeLandmarks = collectCodeLandmarks(codeAnalysis, repoData?.importantFiles);
  const riskHighlights = collectRiskHighlights(codeAnalysis);
  const contributionItems = normalizeContributions(firstContributions);

  const overview = {
    name: cleanText(repoData?.repoInfo?.name || repoData?.repoInfo?.full_name, 'Repository'),
    fullName: cleanText(repoData?.repoInfo?.full_name),
    url: cleanText(repoData?.repoInfo?.url || repoData?.repoInfo?.html_url),
    description: cleanText(repoData?.repoInfo?.description),
    language: cleanText(repoData?.repoInfo?.language),
    license: cleanText(repoData?.repoInfo?.license),
    lastUpdated: cleanText(repoData?.repoInfo?.updatedAt || repoData?.repoInfo?.pushed_at),
    totalFiles: paths.length || repoData?.fileTree?.length || 0,
    analyzedFiles: codeAnalysis?.summary?.analyzedFiles || 0,
    totalLines: codeAnalysis?.summary?.totalLines || 0,
    techStack,
    complexity: repoData?.complexity || null
  };

  const checklist = buildChecklist({
    overview,
    setup,
    architectureBrief,
    readingPath,
    codeLandmarks,
    riskHighlights,
    firstContributions: contributionItems
  });

  return {
    version: GUIDE_VERSION,
    repositoryKey,
    overview,
    checklist,
    setup,
    architectureBrief,
    readingPath,
    entryPoints,
    codeLandmarks,
    riskHighlights,
    firstContributions: contributionItems,
    aiContext: {
      summary: limitText(aiSummary),
      quickStart: limitText(quickStartGuide),
      commonIssues: limitText(commonIssues)
    }
  };
}

export function buildLegacyOnboardingSteps(model) {
  if (!model) return [];

  return model.checklist.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    actions: item.actions,
    evidence: item.evidence,
    icon: '',
    duration: 'Repository-dependent',
    difficulty: item.id === 'choose-first-contribution' ? 'Intermediate' : 'Beginner'
  }));
}
