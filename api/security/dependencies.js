const fetch = require('node-fetch');

const OSV_BATCH_URL = 'https://api.osv.dev/v1/querybatch';
const GITHUB_API_BASE = 'https://api.github.com';
const MAX_QUERIES = 120;
const MANIFEST_PATH_RE = /(^|\/)(package\.json|package-lock\.json|requirements\.txt|pyproject\.toml|poetry\.lock|go\.mod|cargo\.lock|cargo\.toml|pom\.xml|build\.gradle|gradle\.lockfile)$/i;

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

function isExactForEcosystem(dep) {
  const version = safeString(dep.version);
  if (!version) return false;
  if (dep.ecosystem === 'Go') return /^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version);
  if (dep.ecosystem === 'Maven') return /^\d+(?:\.\d+)+(?:[-.][0-9A-Za-z]+)?$/.test(version);
  return isExactVersion(version);
}

function packageUrl(dep) {
  const version = encodeURIComponent(dep.version || '');
  if (dep.ecosystem === 'npm') return `pkg:npm/${encodeURIComponent(dep.name)}@${version}`;
  if (dep.ecosystem === 'PyPI') return `pkg:pypi/${encodeURIComponent(dep.name)}@${version}`;
  if (dep.ecosystem === 'Go') return `pkg:golang/${encodeURIComponent(dep.name)}@${version}`;
  if (dep.ecosystem === 'crates.io') return `pkg:cargo/${encodeURIComponent(dep.name)}@${version}`;
  if (dep.ecosystem === 'Maven') {
    const [group, artifact] = safeString(dep.name).split(':');
    return `pkg:maven/${encodeURIComponent(group || '')}/${encodeURIComponent(artifact || dep.name)}@${version}`;
  }
  return `pkg:generic/${encodeURIComponent(dep.name)}@${version}`;
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
      source: 'package.json',
      ecosystem: 'npm'
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
        source: 'package-lock.json',
        ecosystem: 'npm'
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
          source: 'package-lock.json',
          ecosystem: 'npm'
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

function parseRequirementsTxt(content, source = 'requirements.txt') {
  return safeString(content).split('\n').flatMap(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) return [];
    const match = trimmed.match(/^([A-Za-z0-9_.-]+)==([A-Za-z0-9_.!+*-]+)(?:\s|;|$)/);
    if (!match) return [];
    return [{
      name: match[1],
      version: match[2],
      rawVersion: match[2],
      type: 'python',
      source,
      ecosystem: 'PyPI'
    }];
  });
}

function parsePyprojectToml(content, source = 'pyproject.toml') {
  const deps = [];
  const text = safeString(content);
  const dependencyStrings = [...text.matchAll(/["']([A-Za-z0-9_.-]+)==([A-Za-z0-9_.!+*-]+)["']/g)];
  dependencyStrings.forEach(match => {
    deps.push({
      name: match[1],
      version: match[2],
      rawVersion: match[2],
      type: 'python',
      source,
      ecosystem: 'PyPI'
    });
  });

  const assignmentMatches = [...text.matchAll(/^\s*([A-Za-z0-9_.-]+)\s*=\s*["']([0-9][^"'*<>=~^]+)["']/gm)];
  assignmentMatches.forEach(match => {
    if (/python|requires-python|version|requires/i.test(match[1])) return;
    deps.push({
      name: match[1],
      version: match[2].trim(),
      rawVersion: match[2].trim(),
      type: 'python',
      source,
      ecosystem: 'PyPI'
    });
  });

  return deps;
}

function parseGoMod(content, source = 'go.mod') {
  return safeString(content).split('\n').flatMap(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || /^module\s/.test(trimmed) || /^go\s/.test(trimmed)) return [];
    const match = trimmed.match(/^(?:require\s+)?([A-Za-z0-9_.\-\/]+)\s+(v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)/);
    if (!match) return [];
    return [{
      name: match[1],
      version: match[2],
      rawVersion: match[2],
      type: 'go',
      source,
      ecosystem: 'Go'
    }];
  });
}

function parseCargoLock(content, source = 'Cargo.lock') {
  const deps = [];
  safeString(content).split(/\n\s*\[\[package\]\]\s*\n/g).forEach(block => {
    const name = block.match(/^\s*name\s*=\s*"([^"]+)"/m)?.[1];
    const version = block.match(/^\s*version\s*=\s*"([^"]+)"/m)?.[1];
    if (name && version) {
      deps.push({
        name,
        version,
        rawVersion: version,
        type: 'rust',
        source,
        ecosystem: 'crates.io'
      });
    }
  });
  return deps;
}

function parsePomXml(content, source = 'pom.xml') {
  const deps = [];
  const blocks = safeString(content).match(/<dependency>[\s\S]*?<\/dependency>/g) || [];
  blocks.forEach(block => {
    const groupId = block.match(/<groupId>\s*([^<\s]+)\s*<\/groupId>/)?.[1];
    const artifactId = block.match(/<artifactId>\s*([^<\s]+)\s*<\/artifactId>/)?.[1];
    const version = block.match(/<version>\s*([^<\s$][^<\s]*)\s*<\/version>/)?.[1];
    if (groupId && artifactId && version) {
      deps.push({
        name: `${groupId}:${artifactId}`,
        version,
        rawVersion: version,
        type: 'maven',
        source,
        ecosystem: 'Maven'
      });
    }
  });
  return deps;
}

function parseGradle(content, source = 'build.gradle') {
  const deps = [];
  const matches = [...safeString(content).matchAll(/(?:implementation|api|compileOnly|runtimeOnly|testImplementation)\s+['"]([^:'"]+):([^:'"]+):([^'"]+)['"]/g)];
  matches.forEach(match => {
    deps.push({
      name: `${match[1]}:${match[2]}`,
      version: match[3],
      rawVersion: match[3],
      type: 'gradle',
      source,
      ecosystem: 'Maven'
    });
  });
  return deps;
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
    packageLockPath,
    contentByPath
  };
}

async function fetchManifestContentsIfAvailable(repoData, manifests) {
  const treePaths = Array.isArray(repoData?.fileTree) && repoData.fileTree.length > 0
    ? repoData.fileTree
    : repoData?.fileStructure || [];
  const parsed = parseGitHubUrl(repoData?.repoInfo?.url || repoData?.repoUrl || repoData?.url);
  const token = process.env.GITHUB_TOKEN;

  if (!parsed || !token) return manifests;

  const manifestPaths = safeArray(treePaths)
    .map(safeString)
    .filter(path => MANIFEST_PATH_RE.test(path))
    .filter(path => !manifests.contentByPath.has(path))
    .slice(0, 30);

  if (!manifestPaths.length) return manifests;

  try {
    const ref = repoData?.repoInfo?.defaultBranch
      ? `?ref=${encodeURIComponent(repoData.repoInfo.defaultBranch)}`
      : '';
    const headers = getHeaders(token);
    for (const manifestPath of manifestPaths) {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${parsed.owner}/${parsed.repo}/contents/${encodeURIComponent(manifestPath).replace(/%2F/g, '/')}${ref}`,
        { headers }
      );
      if (!response.ok) continue;
      const data = await response.json();
      if (!data.content || data.encoding !== 'base64') continue;
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      manifests.contentByPath.set(manifestPath, content);
      if (/(^|\/)package-lock\.json$/i.test(manifestPath) && !manifests.packageLock) {
        const packageLock = parseJsonContent(content);
        if (packageLock) {
          manifests.packageLock = packageLock;
          manifests.packageLockPath = manifestPath;
        }
      }
    }
    return manifests;
  } catch {
    return manifests;
  }
}

function collectManifestDependencies(manifests) {
  const deps = [];
  const seenContentPaths = Array.from(manifests.contentByPath.entries());

  deps.push(...collectPackageLockDeps(manifests.packageLock));
  if (!deps.some(dep => dep.ecosystem === 'npm')) {
    deps.push(...collectPackageJsonDeps(manifests.packageJson));
  }

  seenContentPaths.forEach(([path, content]) => {
    const lower = path.toLowerCase();
    if (/(^|\/)requirements\.txt$/.test(lower)) deps.push(...parseRequirementsTxt(content, path));
    if (/(^|\/)pyproject\.toml$/.test(lower) || /(^|\/)poetry\.lock$/.test(lower)) deps.push(...parsePyprojectToml(content, path));
    if (/(^|\/)go\.mod$/.test(lower)) deps.push(...parseGoMod(content, path));
    if (/(^|\/)cargo\.lock$/.test(lower) || /(^|\/)cargo\.toml$/.test(lower)) deps.push(...parseCargoLock(content, path));
    if (/(^|\/)pom\.xml$/.test(lower)) deps.push(...parsePomXml(content, path));
    if (/(^|\/)build\.gradle$/.test(lower) || /(^|\/)gradle\.lockfile$/.test(lower)) deps.push(...parseGradle(content, path));
  });

  const unique = new Map();
  deps.forEach(dep => {
    const key = `${dep.ecosystem}:${dep.name}:${dep.version}:${dep.source}`;
    if (!unique.has(key)) unique.set(key, {
      ...dep,
      purl: packageUrl(dep)
    });
  });
  return Array.from(unique.values());
}

function buildQueries(dependencies) {
  const seen = new Set();
  return dependencies
    .filter(dep => dep.name && isExactForEcosystem(dep))
    .filter(dep => {
      const key = `${dep.ecosystem}:${dep.name}@${dep.version}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_QUERIES)
    .map(dep => ({
      package: { ecosystem: dep.ecosystem || 'npm', name: dep.name },
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
    sourceTool: 'OSV dependency advisory',
    ruleId: 'sca.osv.vulnerability',
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
    package: {
      ecosystem: dep.ecosystem,
      name: dep.name,
      version: dep.version,
      purl: dep.purl || packageUrl(dep),
      type: dep.type
    },
    advisory: {
      id: advisoryId,
      package: dep.purl || packageUrl(dep),
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
    const manifests = await fetchManifestContentsIfAvailable(repoData, extractManifests(repoData));
    const dependencies = collectManifestDependencies(manifests);
    const ecosystemCounts = dependencies.reduce((acc, dep) => {
      acc[dep.ecosystem] = (acc[dep.ecosystem] || 0) + 1;
      return acc;
    }, {});
    const dependencySource = Array.from(new Set(dependencies.map(dep => dep.source).filter(Boolean))).join(', ') || 'none';
    const queries = buildQueries(dependencies);
    const skippedRangeOnly = dependencies.filter(dep => dep.name && !isExactForEcosystem(dep)).length;

    if (!dependencies.length) {
      return res.status(200).json({
        success: true,
        available: false,
        reason: 'No supported package manifest data was available for dependency vulnerability scanning.',
        findings: [],
        components: [],
        coverage: { dependencySource: 'none', queried: 0, skippedRangeOnly: 0, ecosystems: {} }
      });
    }

    if (!queries.length) {
      return res.status(200).json({
        success: true,
        available: false,
        reason: 'Dependency scan needs exact package versions. Only range-based or unsupported manifest versions were available.',
        findings: [],
        components: dependencies,
        coverage: {
          dependencySource,
          dependencies: dependencies.length,
          queried: 0,
          skippedRangeOnly,
          ecosystems: ecosystemCounts
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
        components: dependencies,
        coverage: {
          dependencySource,
          dependencies: dependencies.length,
          queried: queries.length,
          skippedRangeOnly,
          ecosystems: ecosystemCounts
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
      components: dependencies,
      coverage: {
        dependencySource,
        dependencies: dependencies.length,
        queried: queries.length,
        skippedRangeOnly,
        vulnerableDependencies: findings.length,
        maxQueries: MAX_QUERIES,
        ecosystems: ecosystemCounts
      }
    });
  } catch (error) {
    console.error('Dependency vulnerability scan API error:', error);
    return res.status(200).json({
      success: true,
      available: false,
      reason: error.message || 'Dependency vulnerability scan unavailable.',
      findings: [],
      components: [],
      coverage: { queried: 0 }
    });
  }
};
