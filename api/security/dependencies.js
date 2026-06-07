const fetch = require('node-fetch');

const OSV_BATCH_URL = 'https://api.osv.dev/v1/querybatch';
const GITHUB_API_BASE = 'https://api.github.com';
const MAX_QUERIES = 120;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeString(value, fallback = '') {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function getHeaders(token) {
  const headers = { Accept: 'application/vnd.github.v3+json' };
  if (token) headers.Authorization = `token ${token}`;
  return headers;
}

function parseGitHubUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const normalized = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
  const patterns = [
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)/,
    /^github\.com\/([^/]+)\/([^/]+)/,
    /^([^/]+)\/([^/]+)$/
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) return { owner: match[1], repo: match[2] };
  }
  return null;
}

function stripVersionPrefix(version) {
  return safeString(version)
    .replace(/^npm:/, '')
    .replace(/^[=v]/, '')
    .trim();
}

function isExactVersion(version) {
  const normalized = stripVersionPrefix(version);
  return /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(normalized);
}

function severityFromVuln(vuln) {
  const value = safeString(vuln?.database_specific?.severity || vuln?.severity?.[0]?.score || '').toUpperCase();
  if (value.includes('CRITICAL')) return 'critical';
  if (value.includes('HIGH')) return 'high';
  if (value.includes('MEDIUM') || value.includes('MODERATE')) return 'medium';
  if (value.includes('LOW')) return 'low';

  const cvss = Number(value);
  if (Number.isFinite(cvss)) {
    if (cvss >= 9) return 'critical';
    if (cvss >= 7) return 'high';
    if (cvss >= 4) return 'medium';
    return 'low';
  }

  return 'high';
}

function collectPackageJsonDeps(packageJson) {
  const buckets = [
    ['dependencies', 'production'],
    ['devDependencies', 'development'],
    ['peerDependencies', 'peer'],
    ['optionalDependencies', 'optional']
  ];

  return buckets.flatMap(([key, type]) => (
    Object.entries(packageJson?.[key] || {}).map(([name, version]) => ({
      name,
      version: stripVersionPrefix(version),
      rawVersion: safeString(version),
      type,
      source: 'package.json'
    }))
  ));
}

function collectPackageLockDeps(packageLock) {
  if (!packageLock || typeof packageLock !== 'object') return [];

  const packageEntries = Object.entries(packageLock.packages || {})
    .filter(([path, value]) => path && value?.version)
    .map(([path, value]) => {
      const name = value.name || path.replace(/^node_modules\//, '').replace(/^.*\/node_modules\//, '');
      return {
        name,
        version: stripVersionPrefix(value.version),
        rawVersion: safeString(value.version),
        type: value.dev ? 'development' : 'production',
        source: 'package-lock.json'
      };
    });

  if (packageEntries.length > 0) {
    return packageEntries;
  }

  const nested = [];
  const visit = (dependencies = {}, type = 'production') => {
    Object.entries(dependencies).forEach(([name, value]) => {
      if (value?.version) {
        nested.push({
          name,
          version: stripVersionPrefix(value.version),
          rawVersion: safeString(value.version),
          type,
          source: 'package-lock.json'
        });
      }
      if (value?.dependencies) visit(value.dependencies, type);
    });
  };
  visit(packageLock.dependencies || {});
  return nested;
}

function parseJsonContent(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function extractManifests(repoData) {
  const fileContents = repoData?.fileContents || {};
  const importantFiles = repoData?.importantFiles || [];
  const contentByPath = new Map(Object.entries(fileContents));
  importantFiles.forEach(file => {
    if (file?.path && typeof file.content === 'string') {
      contentByPath.set(file.path, file.content);
    }
  });

  const packageLockPath = Array.from(contentByPath.keys()).find(path => /(^|\/)package-lock\.json$/i.test(path));
  const packageLock = packageLockPath ? parseJsonContent(contentByPath.get(packageLockPath)) : null;

  return {
    packageJson: repoData?.packageJson || null,
    packageJsonPath: repoData?.packageJsonPath || 'package.json',
    packageLock,
    packageLockPath
  };
}

async function fetchPackageLockIfAvailable(repoData, manifests) {
  if (manifests.packageLock) return manifests;

  const treePaths = Array.isArray(repoData?.fileTree) && repoData.fileTree.length > 0
    ? repoData.fileTree
    : repoData?.fileStructure || [];
  const lockPath = safeArray(treePaths)
    .find(path => /(^|\/)package-lock\.json$/i.test(path));
  const parsed = parseGitHubUrl(repoData?.repoInfo?.url || repoData?.repoUrl || repoData?.url);
  const token = process.env.GITHUB_TOKEN;

  if (!lockPath || !parsed || !token) return manifests;

  try {
    const ref = repoData?.repoInfo?.defaultBranch
      ? `?ref=${encodeURIComponent(repoData.repoInfo.defaultBranch)}`
      : '';
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${parsed.owner}/${parsed.repo}/contents/${encodeURIComponent(lockPath).replace(/%2F/g, '/')}${ref}`,
      { headers: getHeaders(token) }
    );
    if (!response.ok) return manifests;

    const data = await response.json();
    if (!data.content || data.encoding !== 'base64') return manifests;

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const packageLock = parseJsonContent(content);
    if (!packageLock) return manifests;

    return {
      ...manifests,
      packageLock,
      packageLockPath: lockPath
    };
  } catch {
    return manifests;
  }
}

function buildQueries(dependencies) {
  const seen = new Set();
  return dependencies
    .filter(dep => dep.name && isExactVersion(dep.version))
    .filter(dep => {
      const key = `${dep.name}@${dep.version}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_QUERIES)
    .map(dep => ({
      package: { ecosystem: 'npm', name: dep.name },
      version: dep.version,
      _dependency: dep
    }));
}

function findFixedVersions(vuln, packageName) {
  const affected = safeArray(vuln?.affected).filter(item => item?.package?.name === packageName || !item?.package?.name);
  return Array.from(new Set(affected.flatMap(item => (
    safeArray(item.ranges).flatMap(range => (
      safeArray(range.events)
        .map(event => event.fixed)
        .filter(Boolean)
    ))
  )))).slice(0, 5);
}

function buildFinding(dep, vuln, file) {
  const fixedVersions = findFixedVersions(vuln, dep.name);
  const advisoryId = vuln.id || safeArray(vuln.aliases)[0] || `${dep.name}-${dep.version}`;
  const severity = severityFromVuln(vuln);

  return {
    id: `dependency-vulnerability:${dep.name}:${dep.version}:${advisoryId}`,
    title: `${dep.name}@${dep.version} has known vulnerability ${advisoryId}`,
    severity,
    confidence: 'high',
    category: 'vulnerable-dependency',
    source: 'dependency-vulnerability',
    file,
    line: null,
    evidence: `${dep.name}@${dep.version} matched OSV advisory ${advisoryId}`,
    redactedEvidence: `${dep.name}@${dep.version} matched OSV advisory ${advisoryId}`,
    impact: safeString(vuln.summary || vuln.details, 'This dependency version is listed in a vulnerability advisory.').slice(0, 600),
    recommendation: fixedVersions.length > 0
      ? `Upgrade ${dep.name} to a fixed version such as ${fixedVersions.join(', ')}.`
      : `Review ${advisoryId} and upgrade ${dep.name} to a non-vulnerable version if available.`,
    relatedFiles: [file].filter(Boolean),
    blastRadius: null,
    advisory: {
      id: advisoryId,
      aliases: safeArray(vuln.aliases).slice(0, 5),
      references: safeArray(vuln.references).map(ref => ref.url).filter(Boolean).slice(0, 5)
    }
  };
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { repoData } = req.body || {};
    const manifests = await fetchPackageLockIfAvailable(repoData, extractManifests(repoData));
    const lockDeps = collectPackageLockDeps(manifests.packageLock);
    const packageDeps = collectPackageJsonDeps(manifests.packageJson);
    const dependencySource = lockDeps.length > 0 ? 'package-lock.json' : 'package.json';
    const dependencies = lockDeps.length > 0 ? lockDeps : packageDeps;
    const queries = buildQueries(dependencies);
    const skippedRangeOnly = dependencies.filter(dep => dep.name && !isExactVersion(dep.version)).length;

    if (!dependencies.length) {
      return res.status(200).json({
        success: true,
        available: false,
        reason: 'No npm package manifest data was available for dependency vulnerability scanning.',
        findings: [],
        coverage: { dependencySource: 'none', queried: 0, skippedRangeOnly: 0 }
      });
    }

    if (!queries.length) {
      return res.status(200).json({
        success: true,
        available: false,
        reason: 'Dependency scan needs exact package versions. Only range-based package.json versions were available.',
        findings: [],
        coverage: {
          dependencySource,
          dependencies: dependencies.length,
          queried: 0,
          skippedRangeOnly
        }
      });
    }

    const response = await fetch(OSV_BATCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queries: queries.map(query => ({
          package: query.package,
          version: query.version
        }))
      })
    });

    if (!response.ok) {
      return res.status(200).json({
        success: true,
        available: false,
        reason: `OSV API returned ${response.status}. Dependency vulnerability scan unavailable.`,
        findings: [],
        coverage: {
          dependencySource,
          dependencies: dependencies.length,
          queried: queries.length,
          skippedRangeOnly
        }
      });
    }

    const data = await response.json();
    const results = safeArray(data.results);
    const file = manifests.packageLockPath || manifests.packageJsonPath || 'package.json';
    const findings = results.flatMap((result, index) => {
      const dep = queries[index]?._dependency;
      if (!dep) return [];
      return safeArray(result.vulns).map(vuln => buildFinding(dep, vuln, file));
    });

    return res.status(200).json({
      success: true,
      available: true,
      reason: '',
      findings,
      coverage: {
        dependencySource,
        dependencies: dependencies.length,
        queried: queries.length,
        skippedRangeOnly,
        vulnerableDependencies: findings.length,
        maxQueries: MAX_QUERIES
      }
    });
  } catch (error) {
    console.error('Dependency vulnerability scan API error:', error);
    return res.status(200).json({
      success: true,
      available: false,
      reason: error.message || 'Dependency vulnerability scan unavailable.',
      findings: [],
      coverage: { queried: 0 }
    });
  }
};
