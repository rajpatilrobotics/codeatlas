import { calculateBlastRadius } from '../repository/blastRadiusAnalysis.js';

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];
const CONFIDENCE = ['high', 'medium', 'low'];
const SOURCE_TYPES = new Set([
  'local-code-rule',
  'local-secret-scanner',
  'dependency-vulnerability',
  'config-rule',
  'external-sarif',
  'ai-explanation'
]);

const SEVERITY_WEIGHT = {
  critical: 28,
  high: 20,
  medium: 12,
  low: 6,
  info: 2
};

const CONFIDENCE_WEIGHT = {
  high: 1,
  medium: 0.75,
  low: 0.3
};

const SOURCE_LIMITS = {
  files: 180,
  findings: 250,
  riskyFiles: 20,
  riskyModules: 12,
  checklist: 18
};

const SOURCE_TOOL_LABELS = {
  'local-code-rule': 'CodeAtlas SAST rule pack',
  'local-secret-scanner': 'CodeAtlas secret detector',
  'dependency-vulnerability': 'OSV dependency advisory',
  'config-rule': 'CodeAtlas config and supply-chain rule',
  'external-sarif': 'External SARIF scanner',
  'ai-explanation': 'AI explanation'
};

const RULE_METADATA = {
  'js.eval.unsafe': {
    cwe: ['CWE-95'],
    owasp: 'A03 Injection',
    tags: ['sast', 'code-execution']
  },
  'js.function-constructor.unsafe': {
    cwe: ['CWE-94'],
    owasp: 'A03 Injection',
    tags: ['sast', 'code-execution']
  },
  'js.react.dangerously-set-html': {
    cwe: ['CWE-79'],
    owasp: 'A03 Injection',
    tags: ['sast', 'xss']
  },
  'sql.dynamic-query': {
    cwe: ['CWE-89'],
    owasp: 'A03 Injection',
    tags: ['sast', 'sql-injection']
  },
  'crypto.weak-hash': {
    cwe: ['CWE-327'],
    owasp: 'A02 Cryptographic Failures',
    tags: ['sast', 'crypto']
  },
  'crypto.insecure-random': {
    cwe: ['CWE-338'],
    owasp: 'A02 Cryptographic Failures',
    tags: ['sast', 'crypto']
  },
  'web.cors.wildcard': {
    cwe: ['CWE-942'],
    owasp: 'A05 Security Misconfiguration',
    tags: ['config', 'cors']
  },
  'web.token-browser-storage': {
    cwe: ['CWE-922'],
    owasp: 'A02 Cryptographic Failures / Secret Management',
    tags: ['sast', 'auth']
  },
  'web.api-error-handling.missing': {
    cwe: ['CWE-703'],
    owasp: 'A09 Security Logging and Monitoring',
    tags: ['sast', 'resilience']
  },
  'config.local-url.hardcoded': {
    cwe: ['CWE-16'],
    owasp: 'A05 Security Misconfiguration',
    tags: ['config']
  },
  'config.client-secret-env': {
    cwe: ['CWE-798'],
    owasp: 'A02 Cryptographic Failures / Secret Management',
    tags: ['config', 'secret']
  },
  'config.debug.enabled': {
    cwe: ['CWE-489'],
    owasp: 'A05 Security Misconfiguration',
    tags: ['config', 'debug']
  },
  'web.ssrf.untrusted-url': {
    cwe: ['CWE-918'],
    owasp: 'A10 Server-Side Request Forgery',
    tags: ['sast', 'ssrf']
  },
  'fs.path-traversal.untrusted-path': {
    cwe: ['CWE-22'],
    owasp: 'A01 Broken Access Control',
    tags: ['sast', 'path-traversal']
  },
  'os.command-injection.untrusted-input': {
    cwe: ['CWE-78'],
    owasp: 'A03 Injection',
    tags: ['sast', 'command-injection']
  },
  'deserialize.unsafe': {
    cwe: ['CWE-502'],
    owasp: 'A08 Software and Data Integrity Failures',
    tags: ['sast', 'deserialization']
  },
  'auth.cookie-missing-httponly': {
    cwe: ['CWE-1004'],
    owasp: 'A07 Identification and Authentication Failures',
    tags: ['sast', 'auth']
  },
  'auth.jwt-decode-without-verify': {
    cwe: ['CWE-347'],
    owasp: 'A07 Identification and Authentication Failures',
    tags: ['sast', 'auth']
  },
  'transport.tls-verification-disabled': {
    cwe: ['CWE-295'],
    owasp: 'A02 Cryptographic Failures',
    tags: ['sast', 'transport']
  },
  'secret.provider-token': {
    cwe: ['CWE-798'],
    owasp: 'A02 Cryptographic Failures / Secret Management',
    tags: ['secret', 'credential']
  },
  'secret.private-key': {
    cwe: ['CWE-798'],
    owasp: 'A02 Cryptographic Failures / Secret Management',
    tags: ['secret', 'private-key']
  },
  'secret.database-url': {
    cwe: ['CWE-798'],
    owasp: 'A02 Cryptographic Failures / Secret Management',
    tags: ['secret', 'database']
  },
  'secret.authorization-header': {
    cwe: ['CWE-798'],
    owasp: 'A02 Cryptographic Failures / Secret Management',
    tags: ['secret', 'auth-header']
  },
  'secret.generic-assignment': {
    cwe: ['CWE-798'],
    owasp: 'A02 Cryptographic Failures / Secret Management',
    tags: ['secret', 'credential']
  },
  'sca.osv.vulnerability': {
    cwe: ['CWE-1104'],
    owasp: 'A06 Vulnerable and Outdated Components',
    tags: ['sca', 'dependency']
  },
  'supply-chain.github-actions.unpinned': {
    cwe: ['CWE-829'],
    owasp: 'A08 Software and Data Integrity Failures',
    tags: ['supply-chain', 'github-actions']
  },
  'supply-chain.github-actions.broad-permissions': {
    cwe: ['CWE-266'],
    owasp: 'A05 Security Misconfiguration',
    tags: ['supply-chain', 'github-actions']
  },
  'supply-chain.docker.root-user': {
    cwe: ['CWE-250'],
    owasp: 'A05 Security Misconfiguration',
    tags: ['supply-chain', 'docker']
  },
  'supply-chain.security-policy.missing': {
    cwe: ['CWE-1059'],
    owasp: 'General Secure Coding',
    tags: ['posture', 'repository']
  },
  'supply-chain.license.missing': {
    cwe: [],
    owasp: 'General Secure Coding',
    tags: ['posture', 'repository']
  },
  'supply-chain.dependency-updates.missing': {
    cwe: ['CWE-1104'],
    owasp: 'A06 Vulnerable and Outdated Components',
    tags: ['posture', 'dependencies']
  }
};

const DOCUMENTATION_PATH_RE = /(^|\/)(docs?|documentation|readme|changelog|license|contributing|threat[_-]?model|notes?)(\/|\.|$)|\.(md|mdx|rst|txt)$/i;
const EXAMPLE_PATH_RE = /(^|\/)(examples?|samples?|fixtures?|mocks?|__tests__|tests?)(\/|$)|(\.example|example\.|sample\.|\.template|\.dist|\.sample)/i;
const SOURCE_PATH_RE = /\.(js|jsx|ts|tsx|mjs|cjs|py|go|rb|php|java|kt|kts|cs|rs|swift|scala|sh|bash|zsh|sql)$/i;
const CONFIG_PATH_RE = /(^|\/)(dockerfile|docker-compose|package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|requirements\.txt|pyproject\.toml|poetry\.lock|go\.mod|go\.sum|cargo\.toml|cargo\.lock|pom\.xml|build\.gradle|gradle\.lockfile)|(^|\/)\.github\/workflows\/.*\.ya?ml$|\.env(\.|$)|\.(ya?ml|json|toml|ini|cfg|conf)$/i;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeString(value, fallback = '') {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function normalizeSeverity(value, fallback = 'medium') {
  const normalized = safeString(value).toLowerCase();
  if (normalized === 'error') return 'high';
  if (normalized === 'warning') return 'medium';
  return SEVERITIES.includes(normalized) ? normalized : fallback;
}

function normalizeConfidence(value, fallback = 'medium') {
  const normalized = safeString(value).toLowerCase();
  return CONFIDENCE.includes(normalized) ? normalized : fallback;
}

function normalizeSource(value, fallback = 'local-code-rule') {
  const normalized = safeString(value).toLowerCase();
  return SOURCE_TYPES.has(normalized) ? normalized : fallback;
}

function getPath(entry) {
  if (typeof entry === 'string') return entry.trim();
  if (typeof entry?.path === 'string') return entry.path.trim();
  if (typeof entry?.file === 'string') return entry.file.trim();
  return '';
}

function normalizePath(path) {
  return safeString(path)
    .replace(/^\.\/+/, '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/');
}

function getModuleName(path) {
  const parts = normalizePath(path).split('/').filter(Boolean);
  if (parts.length <= 1) return 'root';
  if (parts[0] === 'src' && parts[1]) return parts[1];
  if (['api', 'pages', 'app', 'routes', 'services', 'core', 'static', 'lib', 'utils', 'components'].includes(parts[0])) {
    return parts[0];
  }
  return parts[0] || 'root';
}

function makeHash(value) {
  const input = safeString(value);
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}

function slug(value) {
  return safeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'finding';
}

function getRuleMeta(ruleId) {
  return RULE_METADATA[ruleId] || {
    cwe: [],
    owasp: '',
    tags: []
  };
}

function deriveRuleId(source, category, title) {
  if (source === 'dependency-vulnerability') return 'sca.osv.vulnerability';
  if (source === 'local-secret-scanner') return 'secret.generic-assignment';
  if (source === 'external-sarif') return 'external.sarif.finding';
  return `${slug(category || source)}.${slug(title)}`.slice(0, 90);
}

function buildFingerprint({ source, ruleId, file, line, redactedEvidence, title }) {
  return makeHash([
    source,
    ruleId,
    normalizePath(file),
    line || '',
    redactedEvidence || '',
    title || ''
  ].join('|'));
}

function buildLocation(file, line) {
  const numericLine = Number(line);
  const hasLine = line !== null && line !== undefined && line !== '' && Number.isFinite(numericLine) && numericLine > 0;
  return {
    file,
    startLine: hasLine ? numericLine : null,
    endLine: hasLine ? numericLine : null
  };
}

function buildDefaultWhyMatched({ source, ruleId, file, line, confidence, category }) {
  const notes = [];
  if (source === 'local-secret-scanner') notes.push('Matched a secret detector pattern with redacted evidence.');
  if (source === 'dependency-vulnerability') notes.push('Matched an OSV advisory for an exact package/version query.');
  if (source === 'config-rule') notes.push('Matched a repository, deployment, or configuration posture rule.');
  if (source === 'external-sarif') notes.push('Imported from a SARIF-compatible external scanner result.');
  if (source === 'local-code-rule') notes.push(`Matched deterministic rule ${ruleId}.`);
  if (file) notes.push(`Evidence is tied to ${file}${line ? `:${line}` : ''}.`);
  if (confidence === 'low') notes.push('Low confidence: treat as a review prompt unless confirmed in context.');
  if (category) notes.push(`Category: ${category}.`);
  return notes;
}

function buildDefaultFalsePositiveNotes({ file, source, confidence, ruleId }) {
  const notes = [];
  if (isDocumentationPath(file) || isExampleOrTemplatePath(file)) {
    notes.push('Documentation, example, fixture, and template paths are normally filtered or downgraded.');
  }
  if (source === 'local-secret-scanner') {
    notes.push('Provider validity is not checked locally; rotate only after confirming the value is real.');
  }
  if (confidence === 'low') {
    notes.push('Low-confidence rule; verify data flow and runtime context before filing as a vulnerability.');
  }
  if (/web\.api-error-handling|config\.local-url/.test(ruleId)) {
    notes.push('Often informational in development-only code; confirm this reaches production behavior.');
  }
  return notes;
}

export function redactEvidence(value) {
  return safeString(value)
    .replace(/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g, '[redacted-private-key]')
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, '[redacted-github-token]')
    .replace(/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g, '[redacted-openai-key]')
    .replace(/\bgsk_[A-Za-z0-9_-]{20,}\b/g, '[redacted-groq-key]')
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[redacted-google-api-key]')
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, '[redacted-aws-access-key]')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, '[redacted-jwt]')
    .replace(/\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[^'"\s)]+/gi, '[redacted-database-url]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi, 'Bearer [redacted]')
    .replace(/\bBasic\s+[A-Za-z0-9+/=]{16,}/gi, 'Basic [redacted]')
    .replace(/((?:api[_-]?key|apikey|secret|token|password|client[_-]?secret)\s*[:=]\s*['"`]?)[^'"`\s,;)}]{8,}/gi, '$1[redacted]');
}

function isProbablyPlaceholder(value) {
  const text = safeString(value).toLowerCase();
  return (
    !text ||
    text === 'null' ||
    text === 'none' ||
    text === 'true' ||
    text === 'false' ||
    text.includes('your_') ||
    text.includes('your-') ||
    text.includes('your ') ||
    text.includes('replace_me') ||
    text.includes('replace-me') ||
    text.includes('example') ||
    text.includes('sample') ||
    text.includes('dummy') ||
    text.includes('fake') ||
    text.includes('test-key') ||
    text.includes('test_key') ||
    text.includes('placeholder') ||
    text.includes('changeme') ||
    text.includes('change_me') ||
    text.includes('[redacted]') ||
    text.includes('redacted') ||
    text.includes('xxxx') ||
    text.includes('****') ||
    text.includes('...') ||
    text.includes('user:password') ||
    text.includes('username:password') ||
    text.includes('<') ||
    text.includes('${') ||
    text.includes('process.env') ||
    text.includes('import.meta.env') ||
    text.includes('os.environ') ||
    text.includes('getenv')
  );
}

function isDocumentationPath(path) {
  return DOCUMENTATION_PATH_RE.test(normalizePath(path));
}

function isExampleOrTemplatePath(path) {
  return EXAMPLE_PATH_RE.test(normalizePath(path));
}

function isSourceLikePath(path) {
  const normalized = normalizePath(path);
  return SOURCE_PATH_RE.test(normalized) || CONFIG_PATH_RE.test(normalized);
}

function isCommentOnlyLine(line) {
  const trimmed = safeString(line);
  return /^(\/\/|#|--|\*|\/\*|\*\/)/.test(trimmed);
}

function hasMeaningfulSecretEntropy(value) {
  const text = safeString(value).replace(/^['"`]|['"`]$/g, '');
  if (isProbablyPlaceholder(text) || text.length < 20) return false;
  const classes = [
    /[a-z]/.test(text),
    /[A-Z]/.test(text),
    /\d/.test(text),
    /[_+/=.-]/.test(text)
  ].filter(Boolean).length;
  const uniqueChars = new Set(text).size;
  return classes >= 2 && uniqueChars >= 8;
}

function entropyScore(value) {
  const text = safeString(value).replace(/^['"`]|['"`]$/g, '');
  if (!text) return 0;
  const uniqueChars = new Set(text).size;
  const classes = [
    /[a-z]/.test(text),
    /[A-Z]/.test(text),
    /\d/.test(text),
    /[_+/=.-]/.test(text)
  ].filter(Boolean).length;
  return Math.min(100, Math.round((uniqueChars / Math.max(text.length, 1)) * 55 + classes * 12 + Math.min(text.length, 64) * 0.25));
}

function getAssignedSecret(line) {
  const text = safeString(line);
  const quoted = text.match(/(?:^|[\s{,;])['"`]?(api[_-]?key|apikey|secret|token|password|client[_-]?secret|auth[_-]?token|access[_-]?token|refresh[_-]?token)['"`]?\s*[:=]\s*(['"`])([^'"`\n]{8,})\2/i);
  if (quoted) {
    return {
      key: quoted[1],
      value: quoted[3],
      literal: true,
      highEntropy: hasMeaningfulSecretEntropy(quoted[3])
    };
  }

  const unquoted = text.match(/(?:^|[\s{,;])(?:api[_-]?key|apikey|secret|token|password|client[_-]?secret|auth[_-]?token|access[_-]?token|refresh[_-]?token)\s*[:=]\s*([A-Za-z0-9._~+/=-]{20,})/i);
  if (unquoted) {
    return {
      key: unquoted[0].split(/[:=]/)[0].trim(),
      value: unquoted[1],
      literal: false,
      highEntropy: hasMeaningfulSecretEntropy(unquoted[1])
    };
  }

  return null;
}

function isSqlCompositionLine(line) {
  const text = safeString(line);
  if (!/(?:query|execute|executemany|exec|raw|rawQuery|cursor\.execute|connection\.execute)\s*\(/i.test(text)) return false;
  if (!/\b(select|insert|update|delete|drop|alter|create|replace|from|where|join|into|values)\b/i.test(text)) return false;
  return /(\$\{|`[^`]*\$\{|f['"][^'"]*\{|\.format\s*\(|%\s*\(|['"][^'"]*\b(select|insert|update|delete|drop|alter|create|replace)\b[^'"]*['"]\s*\+|\+\s*(req|request|params|body|query|user|input|id|name|email|token|\w+))/i.test(text);
}

function getSqlCompositionRisk(line) {
  if (!isSqlCompositionLine(line)) return null;
  const text = safeString(line);
  const interpolation = text.match(/\{([^}]+)\}|\$\{([^}]+)\}|\+\s*([A-Za-z_$][\w$.]*)/g) || [];
  const interpolationText = interpolation.join(' ').toLowerCase();
  const directUserInput = /(req|request|params|body|query|form|input|user_input|userid|user_id|email|username|token|payload)/i.test(interpolationText);
  const identifierOnlyInterpolation = interpolation.length > 0 && interpolation.every(item => (
    /^\{?\$?\{?\s*(table|table_name|index_name|index|col|column|col_name|col_def|spec|sets|owner_clause)\s*\}?$/i.test(item.replace(/^\+\s*/, '').trim())
  ));
  const structuralSql = /\b(alter\s+table|create\s+index|drop\s+table|rename\s+to|add\s+column|pragma)\b/i.test(text);
  const hasBoundValues = /(:[A-Za-z_]\w*|\?|%\([^)]+\)s|,\s*\(|params|updates|owner_params)/i.test(text);

  if (structuralSql || identifierOnlyInterpolation || (hasBoundValues && !directUserInput)) {
    return {
      title: 'Dynamic SQL identifier composition',
      severity: 'medium',
      confidence: 'medium',
      impact: 'Dynamic table or column identifiers cannot be parameter-bound and should be restricted to trusted allowlists.',
      recommendation: 'Verify interpolated identifiers come from constants or allowlists; keep all values bound as parameters.'
    };
  }

  return {
    title: 'SQL query string composition',
    severity: directUserInput ? 'critical' : 'high',
    confidence: directUserInput ? 'high' : 'medium',
    impact: 'Building SQL with string interpolation can allow injection when user-controlled values reach the query.',
    recommendation: 'Use parameterized queries for values and allowlist any unavoidable dynamic identifiers.'
  };
}

function lineWindow(lines, index, radius = 2) {
  return lines.slice(Math.max(index - radius, 0), Math.min(index + radius + 1, lines.length)).join('\n');
}

function getPathSensitivity(path) {
  const lower = normalizePath(path).toLowerCase();
  let score = 0;
  const tags = [];

  const add = (condition, weight, tag) => {
    if (condition) {
      score += weight;
      tags.push(tag);
    }
  };

  add(/(^|\/)(auth|oauth|session|token|security|permissions?)(\/|\.|_|-)/.test(lower), 14, 'auth/security');
  add(/(^|\/)(api|apis|routes?|controllers?|handlers?|middleware)(\/|\.|_|-)/.test(lower), 10, 'api boundary');
  add(/(^|\/)(database|db|models?|schemas?|migrations?)(\/|\.|_|-)/.test(lower), 10, 'data layer');
  add(/(^|\/)(config|settings|env)(\/|\.|_|-)|\.env|docker|compose|workflow|package\.json|package-lock\.json/.test(lower), 10, 'config/deploy');
  add(/(^|\/)(index|main|app|server|manage|cli)\.(js|jsx|ts|tsx|py|go|rb|php)$/.test(lower), 8, 'entrypoint');

  return { score: Math.min(score, 25), tags };
}

function getGraphMeta(path, dependencyGraph) {
  const normalizedPath = normalizePath(path);
  const node = safeArray(dependencyGraph?.nodes).find(item => (
    normalizePath(item?.path) === normalizedPath ||
    normalizePath(String(item?.id || '').replace(/^file:/, '')) === normalizedPath
  ));

  const imports = safeArray(dependencyGraph?.importsMap?.[normalizedPath]).length ||
    safeArray(dependencyGraph?.adjacencyList?.[`file:${normalizedPath}`]).length ||
    Number(node?.importCount || node?.imports || 0);
  const dependents = safeArray(dependencyGraph?.dependentsMap?.[normalizedPath]).length ||
    Number(node?.dependentCount || node?.dependents || 0);
  const importance = Number(node?.importance || 0);

  return {
    graphBacked: Boolean(node),
    imports,
    dependents,
    importance
  };
}

function classifyOwasp(finding) {
  const text = `${finding.category} ${finding.title} ${finding.recommendation}`.toLowerCase();
  if (/secret|token|credential|password|key|env/.test(text)) return 'A02 Cryptographic Failures / Secret Management';
  if (/auth|session|jwt|cors|permission|authorization/.test(text)) return 'A01 Broken Access Control';
  if (/sql|injection|query|eval|function|xss|innerhtml/.test(text)) return 'A03 Injection';
  if (/dependency|vulnerability|cve|package|component/.test(text)) return 'A06 Vulnerable and Outdated Components';
  if (/config|debug|cors|headers|exposure/.test(text)) return 'A05 Security Misconfiguration';
  if (/logging|monitor|error handling/.test(text)) return 'A09 Security Logging and Monitoring';
  return 'General Secure Coding';
}

function makeFinding(input) {
  const file = normalizePath(input.file || '');
  const severity = normalizeSeverity(input.severity, 'medium');
  const confidence = normalizeConfidence(input.confidence, 'medium');
  const source = normalizeSource(input.source, 'local-code-rule');
  const category = safeString(input.category, 'general');
  const title = safeString(input.title, 'Security finding');
  const rawEvidence = safeString(input.evidence || input.redactedEvidence || '');
  const redactedEvidence = redactEvidence(input.redactedEvidence || rawEvidence);
  const ruleId = safeString(input.ruleId || deriveRuleId(source, category, title));
  const ruleMeta = getRuleMeta(ruleId);
  const owasp = input.owasp || ruleMeta.owasp || classifyOwasp({ category, title, recommendation: input.recommendation });
  const fingerprint = safeString(input.fingerprint || buildFingerprint({
    source,
    ruleId,
    file,
    line: input.line,
    redactedEvidence,
    title
  }));

  return {
    id: input.id || `${source}:${slug(title)}:${fingerprint}`,
    title,
    severity,
    confidence,
    category,
    source,
    sourceTool: safeString(input.sourceTool || SOURCE_TOOL_LABELS[source] || source),
    ruleId,
    cwe: safeArray(input.cwe).length ? safeArray(input.cwe).map(safeString).filter(Boolean) : ruleMeta.cwe,
    owasp,
    fingerprint,
    locations: safeArray(input.locations).length ? safeArray(input.locations) : [buildLocation(file, input.line)],
    dataFlow: safeArray(input.dataFlow).slice(0, 6),
    fix: input.fix || {
      summary: safeString(input.recommendation, 'Review the affected code and apply a safer implementation.'),
      effort: input.fixEffort || (['critical', 'high'].includes(severity) ? 'medium' : 'low')
    },
    tags: Array.from(new Set([
      ...safeArray(input.tags),
      ...ruleMeta.tags,
      category,
      source
    ].map(safeString).filter(Boolean))).slice(0, 12),
    verification: input.verification || null,
    whyMatched: (safeArray(input.whyMatched).length
      ? safeArray(input.whyMatched)
      : buildDefaultWhyMatched({ source, ruleId, file, line: input.line, confidence, category }))
      .map(safeString)
      .filter(Boolean)
      .slice(0, 8),
    falsePositiveNotes: (safeArray(input.falsePositiveNotes).length
      ? safeArray(input.falsePositiveNotes)
      : buildDefaultFalsePositiveNotes({ file, source, confidence, ruleId }))
      .map(safeString)
      .filter(Boolean)
      .slice(0, 8),
    secret: input.secret || null,
    advisory: input.advisory || null,
    package: input.package || null,
    file,
    line: input.line !== null && input.line !== undefined && input.line !== '' && Number.isFinite(Number(input.line)) && Number(input.line) > 0
      ? Number(input.line)
      : null,
    evidence: source === 'local-secret-scanner' ? redactedEvidence : redactEvidence(rawEvidence),
    redactedEvidence,
    impact: safeString(input.impact, 'Review this issue before changing or deploying the affected code.'),
    recommendation: safeString(input.recommendation, 'Review the affected code and apply a safer implementation.'),
    relatedFiles: safeArray(input.relatedFiles).map(getPath).filter(Boolean).slice(0, 8),
    blastRadius: input.blastRadius || null
  };
}

function addFinding(findings, input) {
  const finding = makeFinding(input);
  if (!finding.file && finding.source !== 'dependency-vulnerability') return;
  findings.push(finding);
}

function normalizeCodeAnalysisFindings(codeAnalysis) {
  const findings = [];
  Object.entries(codeAnalysis?.security || {}).forEach(([severity, issues]) => {
    safeArray(issues).forEach((issue, index) => {
      const title = safeString(issue.title || issue.type, 'Static analysis finding');
      const file = normalizePath(issue.file || issue.path);
      const evidence = safeString(issue.code || issue.evidence || issue.message);
      const isDocOrExample = isDocumentationPath(file) || isExampleOrTemplatePath(file);
      const commentOnly = isCommentOnlyLine(evidence);
      const category = /sql/i.test(title) ? 'injection'
        : /secret|api key|password/i.test(title) ? 'secret-management'
          : /eval|dangerous/i.test(title) ? 'unsafe-code-execution'
            : /crypto|md5|sha1/i.test(title) ? 'cryptography'
              : 'static-analysis';

      // Legacy codeAnalysis.security is intentionally broad. The Security Scanner
      // keeps it as a signal, but filters/downgrades the noisy cases so docs,
      // placeholders, and variable names do not become "real" vulnerabilities.
      if (!file || !evidence || commentOnly) return;
      if (category === 'secret-management') {
        const assigned = getAssignedSecret(evidence);
        if (isDocOrExample || !assigned || !assigned.highEntropy || (!assigned.literal && !CONFIG_PATH_RE.test(file))) return;
      }
      if (category === 'injection' && !isSqlCompositionLine(evidence)) return;
      if (category === 'unsafe-code-execution' && (isDocOrExample || !isSourceLikePath(file) || !/(\beval\s*\(|\bnew\s+Function\s*\()/.test(evidence))) return;
      if (category === 'cryptography' && (isDocOrExample || /sha1sum|checksum|etag|fingerprint|hash id/i.test(evidence))) return;

      addFinding(findings, {
        id: `legacy:${slug(title)}:${makeHash(`${file}:${issue.line}:${index}:${title}`)}`,
        title,
        severity,
        confidence: category === 'secret-management' ? 'high' : 'medium',
        category,
        source: category === 'secret-management' ? 'local-secret-scanner' : 'local-code-rule',
        file,
        line: issue.line,
        evidence,
        impact: issue.message || 'Static analysis found a security-sensitive pattern.',
        recommendation: issue.suggestion || issue.fix || issue.recommendation || 'Review this finding and replace it with a safe pattern.'
      });
    });
  });
  return findings;
}

function collectFileRecords(repoData, codeAnalysis, extraFiles = []) {
  const byPath = new Map();
  const add = (file, source) => {
    const path = normalizePath(getPath(file));
    if (!path) return;
    const content = typeof file?.content === 'string'
      ? file.content
      : typeof file === 'string'
        ? ''
        : '';
    const existing = byPath.get(path) || {};
    byPath.set(path, {
      ...existing,
      ...file,
      path,
      content: content || existing.content || '',
      size: Number(file?.size || existing.size || content.length || 0),
      lines: Number(file?.lines || existing.lines || (content ? content.split('\n').length : 0)),
      sources: Array.from(new Set([...(existing.sources || []), source]))
    });
  };

  safeArray(repoData?.importantFiles).forEach(file => add(file, 'importantFiles'));
  safeArray(extraFiles).forEach(file => add(file, 'securityScanApi'));

  Object.entries(repoData?.fileContents || {}).forEach(([path, content]) => {
    add({ path, content, size: safeString(content).length }, 'fileContents');
  });

  safeArray(codeAnalysis?.files).forEach(file => add(file, 'codeAnalysis'));

  return Array.from(byPath.values())
    .filter(file => file.path)
    .sort((a, b) => {
      const aSensitive = getPathSensitivity(a.path).score;
      const bSensitive = getPathSensitivity(b.path).score;
      if (bSensitive !== aSensitive) return bSensitive - aSensitive;
      return a.path.localeCompare(b.path);
    })
    .slice(0, SOURCE_LIMITS.files);
}

function isClientFacingPath(path) {
  const lower = normalizePath(path).toLowerCase();
  return /(^|\/)(src|app|pages|components|static|public|client|frontend)(\/|$)/.test(lower) ||
    /\.(jsx|tsx|vue|svelte)$/.test(lower);
}

function scanSourceRules(file) {
  const findings = [];
  if (!file.content) return findings;
  if (isDocumentationPath(file.path) || !isSourceLikePath(file.path)) return findings;

  const lines = file.content.split('\n');
  const lowerPath = file.path.toLowerCase();

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const lineNumber = index + 1;
    if (!trimmed || isCommentOnlyLine(trimmed)) return;

    if (/\beval\s*\(/.test(trimmed)) {
      addFinding(findings, {
        ruleId: 'js.eval.unsafe',
        title: 'Unsafe eval usage',
        severity: 'high',
        confidence: 'high',
        category: 'unsafe-code-execution',
        source: 'local-code-rule',
        file: file.path,
        line: lineNumber,
        evidence: trimmed,
        impact: 'Dynamic code execution can turn user-controlled input into code execution.',
        recommendation: 'Remove eval and replace it with explicit parsing or a safe dispatch table.'
      });
    }

    if (/\bnew\s+Function\s*\(/.test(trimmed)) {
      addFinding(findings, {
        ruleId: 'js.function-constructor.unsafe',
        title: 'Dynamic Function constructor',
        severity: 'high',
        confidence: 'high',
        category: 'unsafe-code-execution',
        source: 'local-code-rule',
        file: file.path,
        line: lineNumber,
        evidence: trimmed,
        impact: 'The Function constructor evaluates strings as code and can create injection paths.',
        recommendation: 'Replace dynamic code generation with explicit functions or validated mappings.'
      });
    }

    if (/dangerouslysetinnerhtml/i.test(trimmed)) {
      addFinding(findings, {
        ruleId: 'js.react.dangerously-set-html',
        title: 'Unsafe HTML injection surface',
        severity: 'medium',
        confidence: 'medium',
        category: 'xss',
        source: 'local-code-rule',
        file: file.path,
        line: lineNumber,
        evidence: trimmed,
        impact: 'Rendering raw HTML can introduce XSS if the content is not sanitized.',
        recommendation: 'Avoid raw HTML or sanitize with a reviewed allowlist sanitizer before rendering.'
      });
    }

    const sqlRisk = getSqlCompositionRisk(trimmed);
    if (sqlRisk) {
      addFinding(findings, {
        ruleId: 'sql.dynamic-query',
        title: sqlRisk.title,
        severity: sqlRisk.severity,
        confidence: sqlRisk.confidence,
        category: 'injection',
        source: 'local-code-rule',
        file: file.path,
        line: lineNumber,
        evidence: trimmed,
        impact: sqlRisk.impact,
        recommendation: sqlRisk.recommendation
      });
    }

    if (/\bmd5\b|\bsha1\b/i.test(trimmed) && !/sha1sum|checksum|etag|fingerprint/i.test(trimmed)) {
      addFinding(findings, {
        ruleId: 'crypto.weak-hash',
        title: 'Weak cryptographic primitive',
        severity: 'medium',
        confidence: 'medium',
        category: 'cryptography',
        source: 'local-code-rule',
        file: file.path,
        line: lineNumber,
        evidence: trimmed,
        impact: 'MD5 and SHA1 are collision-prone and unsafe for password, token, or integrity security.',
        recommendation: 'Use modern password hashing or SHA-256+ depending on the security use case.'
      });
    }

    if (/Math\.random\s*\(/.test(trimmed) && /(token|secret|password|session|jwt|csrf|reset|otp)/i.test(lineWindow(lines, index))) {
      addFinding(findings, {
        ruleId: 'crypto.insecure-random',
        title: 'Insecure random value for sensitive flow',
        severity: 'high',
        confidence: 'medium',
        category: 'cryptography',
        source: 'local-code-rule',
        file: file.path,
        line: lineNumber,
        evidence: trimmed,
        impact: 'Math.random is predictable and not suitable for tokens, sessions, resets, or OTP values.',
        recommendation: 'Use a cryptographically secure random API such as crypto.randomBytes or crypto.getRandomValues.'
      });
    }

    if (/access-control-allow-origin/i.test(trimmed) && /['"`]\*['"`]/.test(trimmed)) {
      addFinding(findings, {
        ruleId: 'web.cors.wildcard',
        title: 'Wildcard CORS origin',
        severity: 'medium',
        confidence: 'high',
        category: 'web-api-security',
        source: 'config-rule',
        file: file.path,
        line: lineNumber,
        evidence: trimmed,
        impact: 'Wildcard CORS can expose APIs to unexpected browser origins.',
        recommendation: 'Restrict CORS origins to reviewed production domains and environment-specific allowlists.'
      });
    }

    if (/\bcors\s*\(\s*\)/i.test(trimmed) || /\bcors\s*\(\s*\{[^}]*origin\s*:\s*['"`]\*['"`]/i.test(trimmed)) {
      addFinding(findings, {
        ruleId: 'web.cors.wildcard',
        title: 'Permissive CORS configuration',
        severity: 'medium',
        confidence: 'medium',
        category: 'web-api-security',
        source: 'config-rule',
        file: file.path,
        line: lineNumber,
        evidence: trimmed,
        impact: 'Permissive CORS can allow untrusted origins to call browser-accessible APIs.',
        recommendation: 'Configure explicit allowed origins and verify credentials are not allowed with wildcard origins.'
      });
    }

    if (/(localStorage|sessionStorage)\s*\./.test(trimmed) && /(token|jwt|auth|session|credential)/i.test(trimmed)) {
      addFinding(findings, {
        ruleId: 'web.token-browser-storage',
        title: 'Sensitive token stored in browser storage',
        severity: 'medium',
        confidence: 'medium',
        category: 'auth-session',
        source: 'local-code-rule',
        file: file.path,
        line: lineNumber,
        evidence: trimmed,
        impact: 'Tokens in localStorage/sessionStorage are exposed to XSS and browser extension access.',
        recommendation: 'Prefer httpOnly secure cookies or short-lived tokens with strict XSS controls.'
      });
    }

    if (/https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(trimmed) && !/(test|spec|mock|fixture|example|readme|docs)/i.test(lowerPath)) {
      addFinding(findings, {
        ruleId: 'config.local-url.hardcoded',
        title: 'Hardcoded local service URL',
        severity: 'low',
        confidence: 'medium',
        category: 'config-exposure',
        source: 'config-rule',
        file: file.path,
        line: lineNumber,
        evidence: trimmed,
        impact: 'Hardcoded local URLs can break production routing or accidentally bypass environment controls.',
        recommendation: 'Move service URLs into environment-specific configuration with safe defaults.'
      });
    }

    if (isClientFacingPath(file.path) && /(secret|private|token|password|api[_-]?key)/i.test(trimmed) && /(process\.env|import\.meta\.env|REACT_APP_|VITE_|NEXT_PUBLIC_)/.test(trimmed)) {
      addFinding(findings, {
        ruleId: 'config.client-secret-env',
        title: 'Security-sensitive environment value in client path',
        severity: 'high',
        confidence: 'medium',
        category: 'config-exposure',
        source: 'config-rule',
        file: file.path,
        line: lineNumber,
        evidence: trimmed,
        impact: 'Client-bundled environment variables can expose secrets to browser users.',
        recommendation: 'Keep secrets server-side and expose only non-sensitive public configuration to clients.'
      });
    }

    if (/\b(fetch|axios\.(get|post|put|patch|delete)|axios\s*\()\b/.test(trimmed)) {
      const nearby = lineWindow(lines, index, 8).toLowerCase();
      if (!nearby.includes('catch') && !nearby.includes('response.ok') && !nearby.includes('try') && !nearby.includes('error')) {
        addFinding(findings, {
          ruleId: 'web.api-error-handling.missing',
          title: 'API call without nearby error handling',
          severity: 'info',
          confidence: 'low',
          category: 'web-api-security',
          source: 'local-code-rule',
          file: file.path,
          line: lineNumber,
          evidence: trimmed,
          impact: 'Unchecked API failures can leak raw errors or create inconsistent security state.',
          recommendation: 'Add explicit error handling and avoid exposing raw backend error details to users.'
        });
      }
    }

    const context = lineWindow(lines, index, 4);
    const contextLower = context.toLowerCase();
    const untrustedInput = /(req\.|request\.|params|query|body|headers|cookies|userinput|user_input|input|urlparam|searchparams|location\.search)/i;

    if (/\b(fetch|axios\(|axios\.(get|post|put|patch|delete)|requests\.(get|post|put|delete)|httpx\.(get|post)|urllib\.request\.urlopen|request\s*\()\b/i.test(trimmed) && untrustedInput.test(context)) {
      addFinding(findings, {
        ruleId: 'web.ssrf.untrusted-url',
        title: 'Outbound request may use untrusted URL input',
        severity: 'high',
        confidence: /req\.|request\.|params|query|body|headers/i.test(context) ? 'medium' : 'low',
        category: 'ssrf',
        source: 'local-code-rule',
        file: file.path,
        line: lineNumber,
        evidence: trimmed,
        dataFlow: [
          { kind: 'source', detail: 'request/user-controlled input near outbound request' },
          { kind: 'sink', detail: 'HTTP client call' }
        ],
        impact: 'Server-side requests built from user input can reach internal services or metadata endpoints.',
        recommendation: 'Use an allowlist of target hosts, normalize URLs, block private networks, and avoid passing raw user input to HTTP clients.'
      });
    }

    if (/(readFile|readFileSync|createReadStream|writeFile|sendFile|open\s*\(|fs\.|path\.join|Path\()/i.test(trimmed) && untrustedInput.test(context)) {
      addFinding(findings, {
        ruleId: 'fs.path-traversal.untrusted-path',
        title: 'File path may include untrusted input',
        severity: 'high',
        confidence: /normalize|resolve|basename|allowlist|whitelist/i.test(contextLower) ? 'low' : 'medium',
        category: 'path-traversal',
        source: 'local-code-rule',
        file: file.path,
        line: lineNumber,
        evidence: trimmed,
        dataFlow: [
          { kind: 'source', detail: 'request/user-controlled path input' },
          { kind: 'sink', detail: 'filesystem path operation' }
        ],
        impact: 'Untrusted path input can allow reading or writing files outside the intended directory.',
        recommendation: 'Resolve paths against a fixed base directory, reject traversal segments, and use allowlisted file IDs instead of raw paths.'
      });
    }

    if (/(child_process|exec\s*\(|execFile\s*\(|spawn\s*\(|system\s*\(|popen\s*\(|subprocess\.(run|call|Popen)|shell\s*:\s*true)/i.test(trimmed) && (untrustedInput.test(context) || /shell\s*:\s*true|shell\s*=\s*True/i.test(context))) {
      addFinding(findings, {
        ruleId: 'os.command-injection.untrusted-input',
        title: 'Command execution may use unsafe input',
        severity: 'critical',
        confidence: untrustedInput.test(context) ? 'medium' : 'low',
        category: 'command-injection',
        source: 'local-code-rule',
        file: file.path,
        line: lineNumber,
        evidence: trimmed,
        dataFlow: [
          { kind: 'source', detail: 'request/user-controlled command argument nearby' },
          { kind: 'sink', detail: 'process execution API' }
        ],
        impact: 'Unsafe command construction can allow attackers to execute arbitrary shell commands.',
        recommendation: 'Avoid shell execution, pass fixed command arrays, validate arguments, and do not concatenate request input into commands.'
      });
    }

    if (/(pickle\.loads|pickle\.load|yaml\.load\s*\(|marshal\.loads|unserialize\s*\(|ObjectInputStream|BinaryFormatter|JSON\.parse\s*\()/i.test(trimmed) && !/(safe_load|SafeLoader|trusted|schema|zod|joi|validate)/i.test(context)) {
      addFinding(findings, {
        ruleId: 'deserialize.unsafe',
        title: 'Unsafe deserialization surface',
        severity: /pickle|unserialize|ObjectInputStream|BinaryFormatter/i.test(trimmed) ? 'high' : 'medium',
        confidence: /JSON\.parse/i.test(trimmed) ? 'low' : 'medium',
        category: 'unsafe-deserialization',
        source: 'local-code-rule',
        file: file.path,
        line: lineNumber,
        evidence: trimmed,
        impact: 'Deserializing untrusted data without schema validation can lead to code execution or object injection in vulnerable runtimes.',
        recommendation: 'Use safe loaders, strict schemas, and parse only trusted formats from trusted sources.'
      });
    }

    if (/(res\.cookie|setCookie|cookies\.set|Set-Cookie|session_cookie)/i.test(trimmed) && /(token|jwt|session|auth)/i.test(context) && !/httponly\s*[:=]\s*true|HttpOnly/i.test(context)) {
      addFinding(findings, {
        ruleId: 'auth.cookie-missing-httponly',
        title: 'Session cookie may miss HttpOnly protection',
        severity: 'medium',
        confidence: 'medium',
        category: 'auth-session',
        source: 'local-code-rule',
        file: file.path,
        line: lineNumber,
        evidence: trimmed,
        impact: 'Session or token cookies without HttpOnly can be read by injected JavaScript during XSS.',
        recommendation: 'Set HttpOnly, Secure, SameSite, and short expiration on authentication cookies.'
      });
    }

    if (/\bjwt\.decode\s*\(|decodeJwt\s*\(/i.test(trimmed) && !/verify|validate|signature/i.test(contextLower)) {
      addFinding(findings, {
        ruleId: 'auth.jwt-decode-without-verify',
        title: 'JWT decoded without nearby signature verification',
        severity: 'high',
        confidence: 'medium',
        category: 'auth-session',
        source: 'local-code-rule',
        file: file.path,
        line: lineNumber,
        evidence: trimmed,
        impact: 'Decoded JWT claims are untrusted unless the signature, issuer, audience, and expiration are verified.',
        recommendation: 'Use a verified JWT validation function before trusting claims and reject unsigned or unexpected algorithms.'
      });
    }

    if (/rejectUnauthorized\s*:\s*false|verify\s*=\s*False|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"`]?0/i.test(trimmed)) {
      addFinding(findings, {
        ruleId: 'transport.tls-verification-disabled',
        title: 'TLS certificate verification disabled',
        severity: 'high',
        confidence: 'high',
        category: 'transport-security',
        source: 'config-rule',
        file: file.path,
        line: lineNumber,
        evidence: trimmed,
        impact: 'Disabling TLS verification allows man-in-the-middle interception of sensitive traffic.',
        recommendation: 'Remove disabled verification and install trusted certificates for development or production endpoints.'
      });
    }
  });

  return findings;
}

function scanConfigAndSupplyChainRules(file) {
  const findings = [];
  if (!file.content) return findings;
  const normalized = normalizePath(file.path);
  const lowerPath = normalized.toLowerCase();
  const lines = file.content.split('\n');

  if (/(^|\/)dockerfile$/i.test(normalized) || /(^|\/)dockerfile\./i.test(normalized)) {
    const hasUser = lines.some(line => /^\s*USER\s+\S+/i.test(line));
    if (!hasUser) {
      addFinding(findings, {
        ruleId: 'supply-chain.docker.root-user',
        title: 'Dockerfile does not set a non-root user',
        severity: 'medium',
        confidence: 'medium',
        category: 'container-hardening',
        source: 'config-rule',
        sourceTool: 'CodeAtlas Dockerfile posture rule',
        file: file.path,
        line: null,
        evidence: 'No USER directive found in Dockerfile.',
        impact: 'Containers running as root increase the impact of container breakout or application compromise.',
        recommendation: 'Create and switch to a least-privileged runtime user before the final CMD/ENTRYPOINT.'
      });
    }
  }

  if (/(^|\/)\.github\/workflows\/.*\.ya?ml$/i.test(normalized)) {
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const lineNumber = index + 1;

      const usesMatch = trimmed.match(/^(?:-\s*)?uses:\s*([^@\s]+)(?:@([^\s#]+))?/i);
      if (usesMatch) {
        const ref = safeString(usesMatch[2]);
        const pinnedToSha = /^[a-f0-9]{40}$/i.test(ref);
        if (!ref || /^(main|master|latest|HEAD|v?\d+)$/i.test(ref) || !pinnedToSha) {
          addFinding(findings, {
            ruleId: 'supply-chain.github-actions.unpinned',
            title: 'GitHub Action is not pinned to a commit SHA',
            severity: /^(main|master|latest|HEAD)$/i.test(ref) ? 'medium' : 'low',
            confidence: 'high',
            category: 'supply-chain',
            source: 'config-rule',
            sourceTool: 'CodeAtlas GitHub Actions posture rule',
            file: file.path,
            line: lineNumber,
            evidence: trimmed,
            impact: 'Tag or branch based Actions can change over time and introduce unreviewed code into CI.',
            recommendation: 'Pin third-party Actions to a reviewed full-length commit SHA and update through dependency automation.'
          });
        }
      }

      if (/^\s*permissions\s*:\s*write-all\s*$/i.test(line) || /^\s*contents\s*:\s*write\s*$/i.test(line)) {
        addFinding(findings, {
          ruleId: 'supply-chain.github-actions.broad-permissions',
          title: 'GitHub Actions workflow grants broad write permissions',
          severity: 'medium',
          confidence: 'high',
          category: 'supply-chain',
          source: 'config-rule',
          sourceTool: 'CodeAtlas GitHub Actions posture rule',
          file: file.path,
          line: lineNumber,
          evidence: trimmed,
          impact: 'Broad workflow token permissions increase impact if a workflow or dependency is compromised.',
          recommendation: 'Set least-privilege permissions per job and prefer read-only defaults.'
        });
      }
    });
  }

  if (/(\.env|config|settings)/i.test(lowerPath)) {
    lines.forEach((line, index) => {
      if (/DEBUG\s*=\s*(true|1)|FLASK_DEBUG\s*=\s*(true|1)|NODE_ENV\s*=\s*development/i.test(line) && !isExampleOrTemplatePath(file.path)) {
        addFinding(findings, {
          ruleId: 'config.debug.enabled',
          title: 'Debug mode appears enabled in configuration',
          severity: 'medium',
          confidence: 'medium',
          category: 'security-misconfiguration',
          source: 'config-rule',
          file: file.path,
          line: index + 1,
          evidence: line.trim(),
          impact: 'Debug mode can expose stack traces, secrets, or development-only behavior.',
          recommendation: 'Ensure production config disables debug mode and separates local defaults from deployable configuration.'
        });
      }
    });
  }

  return findings;
}

function scanRepositoryPosture(repoData) {
  const findings = [];
  const files = safeArray(repoData?.fileTree).length
    ? safeArray(repoData.fileTree).map(getPath).map(normalizePath)
    : safeArray(repoData?.fileStructure).map(getPath).map(normalizePath);
  const lowerFiles = files.map(path => path.toLowerCase());
  const hasPackageManifest = lowerFiles.some(path => /(^|\/)(package\.json|requirements\.txt|pyproject\.toml|go\.mod|cargo\.toml|pom\.xml|build\.gradle)$/.test(path));

  if (files.length === 0) return findings;

  if (!lowerFiles.some(path => /(^|\/)(security\.md|\.github\/security\.md)$/i.test(path))) {
    addFinding(findings, {
      ruleId: 'supply-chain.security-policy.missing',
      title: 'Repository security policy not found',
      severity: 'info',
      confidence: 'medium',
      category: 'supply-chain',
      source: 'config-rule',
      sourceTool: 'OpenSSF-inspired repository posture rule',
      file: 'repository',
      line: null,
      evidence: 'No SECURITY.md or .github/SECURITY.md path was found in the analyzed file tree.',
      impact: 'Without a security policy, maintainers and users may not know how to report vulnerabilities safely.',
      recommendation: 'Add SECURITY.md with supported versions, disclosure contact, and vulnerability reporting expectations.'
    });
  }

  if (!lowerFiles.some(path => /(^|\/)(license|license\.md|copying|copying\.md)$/i.test(path))) {
    addFinding(findings, {
      ruleId: 'supply-chain.license.missing',
      title: 'Repository license file not found',
      severity: 'info',
      confidence: 'medium',
      category: 'supply-chain',
      source: 'config-rule',
      sourceTool: 'OpenSSF-inspired repository posture rule',
      file: 'repository',
      line: null,
      evidence: 'No LICENSE/COPYING file was found in the analyzed file tree.',
      impact: 'Missing license metadata can block safe reuse and enterprise adoption.',
      recommendation: 'Add an explicit license file and keep package metadata aligned.'
    });
  }

  if (hasPackageManifest && !lowerFiles.some(path => /(^|\/)(\.github\/dependabot\.ya?ml|renovate\.json|\.renovaterc|dependabot\.ya?ml)$/i.test(path))) {
    addFinding(findings, {
      ruleId: 'supply-chain.dependency-updates.missing',
      title: 'Automated dependency update configuration not found',
      severity: 'low',
      confidence: 'medium',
      category: 'supply-chain',
      source: 'config-rule',
      sourceTool: 'OpenSSF-inspired repository posture rule',
      file: 'repository',
      line: null,
      evidence: 'Dependency manifests exist, but no Dependabot/Renovate configuration was found.',
      impact: 'Projects without automated update checks are more likely to accumulate vulnerable dependencies.',
      recommendation: 'Configure Dependabot or Renovate for supported package ecosystems.'
    });
  }

  return findings;
}

function scanSecretRules(file) {
  const findings = [];
  if (!file.content) return findings;
  const docOrExample = isDocumentationPath(file.path) || isExampleOrTemplatePath(file.path);

  const privateKeyBlock = file.content.match(/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]{80,}?-----END [A-Z0-9 ]*PRIVATE KEY-----/);
  if (privateKeyBlock && !isProbablyPlaceholder(privateKeyBlock[0])) {
    const before = file.content.slice(0, privateKeyBlock.index || 0);
    addFinding(findings, {
      ruleId: 'secret.private-key',
      title: 'Private key material in source',
      severity: 'critical',
      confidence: docOrExample ? 'medium' : 'high',
      category: 'secret-management',
      source: 'local-secret-scanner',
      file: file.path,
      line: before.split('\n').length,
      evidence: privateKeyBlock[0],
      redactedEvidence: redactEvidence(privateKeyBlock[0]),
      secret: {
        detector: 'private-key-block',
        family: 'asymmetric-private-key',
        verified: 'unverified',
        entropy: entropyScore(privateKeyBlock[0])
      },
      verification: {
        state: 'unverified',
        detail: 'Pattern matched locally; CodeAtlas does not test secret validity.'
      },
      impact: 'Private keys in source can compromise signing, SSH, TLS, or service identity.',
      recommendation: 'Revoke/rotate the key pair and replace committed material with secret-manager references.'
    });
  }

  const patterns = [
    {
      title: 'GitHub token pattern',
      regex: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
      detector: 'github-token',
      severity: 'critical',
      confidence: 'high',
      category: 'secret-management',
      impact: 'A GitHub token can grant repository or organization access if active.',
      recommendation: 'Revoke the token, rotate credentials, and move it to a server-side secret manager.'
    },
    {
      title: 'OpenAI API key pattern',
      regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
      detector: 'openai-api-key',
      severity: 'critical',
      confidence: 'high',
      category: 'secret-management',
      impact: 'An OpenAI API key can allow unauthorized API usage and billing exposure.',
      recommendation: 'Revoke and rotate the key, then load it from server-side environment variables only.'
    },
    {
      title: 'Groq API key pattern',
      regex: /\bgsk_[A-Za-z0-9_-]{20,}\b/g,
      detector: 'groq-api-key',
      severity: 'critical',
      confidence: 'high',
      category: 'secret-management',
      impact: 'A Groq API key can allow unauthorized model usage.',
      recommendation: 'Revoke and rotate the key, then store it outside source control.'
    },
    {
      title: 'Google/Gemini API key pattern',
      regex: /\bAIza[0-9A-Za-z_-]{20,}\b/g,
      detector: 'google-api-key',
      severity: 'critical',
      confidence: 'high',
      category: 'secret-management',
      impact: 'A Google API key can expose cloud/API access depending on its restrictions.',
      recommendation: 'Rotate the key and enforce API, referrer, and server-side restrictions.'
    },
    {
      title: 'AWS access key pattern',
      regex: /\bAKIA[0-9A-Z]{16}\b/g,
      detector: 'aws-access-key',
      severity: 'critical',
      confidence: 'high',
      category: 'secret-management',
      impact: 'An AWS access key can grant cloud account access if paired with its secret.',
      recommendation: 'Deactivate the key, rotate credentials, and audit recent IAM activity.'
    },
    {
      title: 'JWT-like token in source',
      regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
      detector: 'jwt-token',
      severity: 'high',
      confidence: 'medium',
      category: 'secret-management',
      impact: 'Committed JWTs can expose session or service identity data.',
      recommendation: 'Remove committed tokens and ensure examples use placeholders.'
    },
    {
      title: 'Database connection URL in source',
      regex: /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[^'"\s)]+/gi,
      detector: 'database-url',
      severity: 'critical',
      confidence: 'high',
      category: 'secret-management',
      impact: 'Database URLs often contain credentials and network location details.',
      recommendation: 'Rotate credentials if real, move connection strings to protected environment variables, and keep examples redacted.'
    }
  ];

  const lines = file.content.split('\n');
  lines.forEach((line, index) => {
    patterns.forEach(pattern => {
      pattern.regex.lastIndex = 0;
      const matches = [...line.matchAll(pattern.regex)];
      matches.forEach(match => {
        if (isProbablyPlaceholder(match[0]) || isProbablyPlaceholder(line)) return;
        if (docOrExample && /placeholder|example|sample|dummy|fake|test|redacted|xxxx|your[_ -]/i.test(line)) return;
        addFinding(findings, {
          title: pattern.title,
          ruleId: pattern.detector === 'database-url' ? 'secret.database-url' : 'secret.provider-token',
          severity: pattern.severity,
          confidence: docOrExample ? 'medium' : pattern.confidence,
          category: pattern.category,
          source: 'local-secret-scanner',
          file: file.path,
          line: index + 1,
          evidence: line.trim(),
          redactedEvidence: redactEvidence(line.trim()),
          secret: {
            detector: pattern.detector,
            family: pattern.category,
            verified: 'unverified',
            entropy: entropyScore(match[0])
          },
          verification: {
            state: 'unverified',
            detail: 'Pattern matched locally; CodeAtlas does not call provider APIs to verify secret validity.'
          },
          impact: pattern.impact,
          recommendation: pattern.recommendation
        });
      });
    });

    if (docOrExample || isCommentOnlyLine(line)) return;

    const assignment = getAssignedSecret(line);
    if (assignment && assignment.highEntropy && (assignment.literal || CONFIG_PATH_RE.test(file.path)) && !/process\.env|import\.meta\.env|os\.environ|getenv/i.test(line)) {
      addFinding(findings, {
        ruleId: 'secret.generic-assignment',
        title: 'Generic hardcoded secret assignment',
        severity: /password|secret|token/i.test(assignment.key) ? 'high' : 'medium',
        confidence: assignment.value.length >= 32 ? 'high' : 'medium',
        category: 'secret-management',
        source: 'local-secret-scanner',
        file: file.path,
        line: index + 1,
        evidence: line.trim(),
        redactedEvidence: redactEvidence(line.trim()),
        secret: {
          detector: 'generic-assignment',
          family: assignment.key,
          verified: 'unverified',
          entropy: entropyScore(assignment.value)
        },
        verification: {
          state: 'unverified',
          detail: 'Generic assignment matched entropy and context checks; review to confirm whether the value is active.'
        },
        impact: 'Secret-like values committed to source can be copied, leaked, or abused.',
        recommendation: 'Replace the value with an environment variable or secret-manager lookup and rotate it if real.'
      });
    }

    if (/\bAuthorization\b\s*[:=]\s*['"`]?\s*(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{16,}/i.test(line) && !isProbablyPlaceholder(line)) {
      addFinding(findings, {
        ruleId: 'secret.authorization-header',
        title: 'Hardcoded authorization header',
        severity: 'high',
        confidence: 'medium',
        category: 'secret-management',
        source: 'local-secret-scanner',
        file: file.path,
        line: index + 1,
        evidence: line.trim(),
        redactedEvidence: redactEvidence(line.trim()),
        secret: {
          detector: 'authorization-header',
          family: 'http-authorization',
          verified: 'unverified',
          entropy: entropyScore(line)
        },
        verification: {
          state: 'unverified',
          detail: 'Authorization header pattern matched locally; value is redacted and not verified.'
        },
        impact: 'Committed authorization headers can expose service or user credentials.',
        recommendation: 'Remove hardcoded headers and construct them at runtime from protected server-side secrets.'
      });
    }
  });

  return findings;
}

function normalizeDependencyFindings(items) {
  return safeArray(items).map(item => makeFinding({
    ...item,
    ruleId: item.ruleId || 'sca.osv.vulnerability',
    sourceTool: item.sourceTool || 'OSV dependency advisory',
    source: 'dependency-vulnerability',
    severity: normalizeSeverity(item.severity || item.database_specific?.severity || 'high', 'high'),
    confidence: normalizeConfidence(item.confidence, 'high'),
    category: item.category || 'vulnerable-dependency',
    file: item.file || 'package.json',
    line: item.line || null,
    evidence: item.redactedEvidence || item.evidence || item.title,
    redactedEvidence: item.redactedEvidence || item.evidence || item.title,
    impact: item.impact || 'A declared dependency has a known vulnerability.',
    recommendation: item.recommendation || 'Review the advisory and upgrade to a patched version when available.'
  }));
}

function dedupeFindings(findings) {
  const seen = new Map();
  findings.forEach(finding => {
    const key = [
      finding.source,
      finding.title,
      finding.file,
      finding.line || '',
      finding.redactedEvidence
    ].join('|');
    const existing = seen.get(key);
    if (!existing || SEVERITY_WEIGHT[finding.severity] > SEVERITY_WEIGHT[existing.severity]) {
      seen.set(key, finding);
    }
  });
  return Array.from(seen.values()).slice(0, SOURCE_LIMITS.findings);
}

function getRepositoryFiles(repoData, fileRecords) {
  const paths = [
    ...safeArray(repoData?.fileTree).map(getPath),
    ...safeArray(repoData?.fileStructure).map(getPath),
    ...fileRecords.map(file => file.path)
  ].map(normalizePath).filter(Boolean);
  return Array.from(new Set(paths));
}

function addBlastRadius(findings, repoData, repositoryFiles) {
  const graph = repoData?.dependencyGraph;
  if (!graph || !repositoryFiles.length) return findings;

  const uniqueFiles = Array.from(new Set(findings.map(finding => finding.file).filter(Boolean))).slice(0, 12);
  const blastByFile = new Map();

  uniqueFiles.forEach(path => {
    try {
      const result = calculateBlastRadius(path, repositoryFiles, [], graph, { direction: 'both' });
      blastByFile.set(path, {
        severity: result.severity,
        impactedFilesCount: safeArray(result.impactedFiles).length,
        confidence: result.confidence || 'low',
        analysisMode: result.analysisMode || 'fallback',
        summary: result.impactSummary || ''
      });
    } catch (error) {
      blastByFile.set(path, {
        severity: 'unknown',
        impactedFilesCount: 0,
        confidence: 'low',
        analysisMode: 'unavailable',
        summary: 'Blast radius calculation unavailable for this file.'
      });
    }
  });

  return findings.map(finding => ({
    ...finding,
    blastRadius: blastByFile.get(finding.file) || finding.blastRadius || null
  }));
}

function scoreFindings(findings, repoData) {
  const fileScores = new Map();
  const moduleScores = new Map();
  const categoryMap = new Map();

  findings.forEach(finding => {
    const base = SEVERITY_WEIGHT[finding.severity] * CONFIDENCE_WEIGHT[finding.confidence];
    const sensitivity = getPathSensitivity(finding.file);
    const graph = getGraphMeta(finding.file, repoData?.dependencyGraph);
    const blast = Number(finding.blastRadius?.impactedFilesCount || 0);
    const graphBonus = Math.min(15, graph.dependents * 1.5 + graph.importance * 6);
    const blastBonus = Math.min(18, blast * 0.4);
    const points = Math.round(base + sensitivity.score * 0.35 + graphBonus * 0.25 + blastBonus * 0.35);
    const module = getModuleName(finding.file);

    const existing = fileScores.get(finding.file) || {
      path: finding.file,
      module,
      score: 0,
      maxSeverity: finding.severity,
      findings: [],
      drivers: [],
      graphBacked: graph.graphBacked,
      dependents: graph.dependents,
      imports: graph.imports,
      blastRadius: finding.blastRadius
    };

    existing.score = Math.min(100, existing.score + points);
    existing.findings.push(finding);
    existing.drivers.push({
      label: finding.title,
      points,
      source: finding.source,
      severity: finding.severity
    });
    if (SEVERITY_WEIGHT[finding.severity] > SEVERITY_WEIGHT[existing.maxSeverity]) {
      existing.maxSeverity = finding.severity;
    }
    fileScores.set(finding.file, existing);

    const moduleEntry = moduleScores.get(module) || {
      module,
      score: 0,
      files: new Set(),
      findings: 0,
      critical: 0,
      high: 0,
      drivers: new Map()
    };
    moduleEntry.score = Math.max(moduleEntry.score, existing.score);
    moduleEntry.files.add(finding.file);
    moduleEntry.findings += 1;
    if (finding.severity === 'critical') moduleEntry.critical += 1;
    if (finding.severity === 'high') moduleEntry.high += 1;
    moduleEntry.drivers.set(finding.category, (moduleEntry.drivers.get(finding.category) || 0) + 1);
    moduleScores.set(module, moduleEntry);

    const owasp = classifyOwasp(finding);
    const categoryEntry = categoryMap.get(owasp) || { category: owasp, count: 0, critical: 0, high: 0, findings: [] };
    categoryEntry.count += 1;
    if (finding.severity === 'critical') categoryEntry.critical += 1;
    if (finding.severity === 'high') categoryEntry.high += 1;
    categoryEntry.findings.push(finding.id);
    categoryMap.set(owasp, categoryEntry);
  });

  const riskyFiles = Array.from(fileScores.values())
    .map(record => ({
      ...record,
      score: Math.min(100, Math.round(record.score)),
      findingCount: record.findings.length,
      topDrivers: record.drivers.sort((a, b) => b.points - a.points).slice(0, 4)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, SOURCE_LIMITS.riskyFiles);

  const riskyModules = Array.from(moduleScores.values())
    .map(record => ({
      module: record.module,
      score: Math.min(100, Math.round(record.score)),
      fileCount: record.files.size,
      findingCount: record.findings,
      critical: record.critical,
      high: record.high,
      dominantDrivers: Array.from(record.drivers.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, SOURCE_LIMITS.riskyModules);

  const owaspCategories = Array.from(categoryMap.values())
    .map(category => ({
      ...category,
      findings: category.findings.slice(0, 8)
    }))
    .sort((a, b) => b.count - a.count);

  return { riskyFiles, riskyModules, owaspCategories };
}

function buildFixChecklist(findings) {
  return findings
    .filter(finding => ['critical', 'high', 'medium'].includes(finding.severity))
    .sort((a, b) => {
      const severityDiff = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return a.file.localeCompare(b.file);
    })
    .slice(0, SOURCE_LIMITS.checklist)
    .map((finding, index) => ({
      id: `fix-${finding.id}`,
      order: index + 1,
      findingId: finding.id,
      title: finding.title,
      file: finding.file,
      severity: finding.severity,
      action: finding.recommendation
    }));
}

function buildScore(findings) {
  const severityTotals = SEVERITIES.reduce((acc, severity) => ({ ...acc, [severity]: 0 }), {});
  findings.forEach(finding => {
    severityTotals[finding.severity] += 1;
  });

  const confidenceCount = severity => findings.filter(finding => finding.severity === severity)
    .reduce((sum, finding) => sum + CONFIDENCE_WEIGHT[finding.confidence], 0);

  // Score should communicate verified severity, not punish every bounded
  // review note linearly. Log-scaled buckets keep large repos readable while
  // still making true critical/high findings dominate the posture.
  const criticalPenalty = Math.min(60, confidenceCount('critical') * 35);
  const highPenalty = Math.min(38, Math.log2(confidenceCount('high') + 1) * 14);
  const mediumPenalty = Math.min(28, Math.log2(confidenceCount('medium') + 1) * 5);
  const lowPenalty = Math.min(8, Math.log2(confidenceCount('low') + 1) * 1.7);
  const infoPenalty = Math.min(3, Math.log2(confidenceCount('info') + 1));
  const penalty = criticalPenalty + highPenalty + mediumPenalty + lowPenalty + infoPenalty;
  const overall = findings.length === 0 ? 96 : Math.max(5, Math.round(100 - Math.min(95, penalty)));
  const level = severityTotals.critical > 0 ? 'critical'
    : severityTotals.high > 0 ? 'high'
      : severityTotals.medium > 0 || overall < 82 ? 'medium'
        : 'low';

  return {
    overall,
    level,
    formula: '100 minus log-scaled confidence-weighted severity buckets; critical/high findings dominate the level.',
    severityTotals
  };
}

function buildVerificationSummary(findings) {
  const actionable = findings.filter(finding => (
    ['critical', 'high', 'medium'].includes(finding.severity) &&
    ['high', 'medium'].includes(finding.confidence)
  ));
  const highConfidence = findings.filter(finding => finding.confidence === 'high');
  const needsReview = findings.filter(finding => finding.confidence === 'low' || finding.severity === 'info');
  const byConfidence = CONFIDENCE.reduce((acc, confidence) => ({
    ...acc,
    [confidence]: findings.filter(finding => finding.confidence === confidence).length
  }), {});

  return {
    actionableCount: actionable.length,
    highConfidenceCount: highConfidence.length,
    needsReviewCount: needsReview.length,
    byConfidence,
    noiseControls: [
      'documentation and example placeholders filtered',
      'generic secrets require literal high-entropy values',
      'SQL findings require raw SQL plus interpolation/concatenation',
      'secrets are redacted and never verified by provider APIs',
      'SARIF-style metadata uses stable local fingerprints',
      'AI cannot create findings'
    ]
  };
}

function buildToolSummary(findings) {
  const byTool = new Map();
  findings.forEach(finding => {
    const key = finding.sourceTool || SOURCE_TOOL_LABELS[finding.source] || finding.source;
    const current = byTool.get(key) || {
      tool: key,
      findings: 0,
      critical: 0,
      high: 0,
      sources: new Set()
    };
    current.findings += 1;
    current.sources.add(finding.source);
    if (finding.severity === 'critical') current.critical += 1;
    if (finding.severity === 'high') current.high += 1;
    byTool.set(key, current);
  });

  return Array.from(byTool.values()).map(item => ({
    ...item,
    sources: Array.from(item.sources)
  })).sort((a, b) => b.findings - a.findings);
}

function buildSarifPreview(findings) {
  const rules = new Map();
  findings.forEach(finding => {
    if (!rules.has(finding.ruleId)) {
      rules.set(finding.ruleId, {
        id: finding.ruleId,
        name: finding.title,
        shortDescription: { text: finding.title },
        help: { text: finding.recommendation },
        properties: {
          tags: finding.tags,
          cwe: finding.cwe,
          owasp: finding.owasp,
          sourceTool: finding.sourceTool
        }
      });
    }
  });

  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [{
      tool: {
        driver: {
          name: 'CodeAtlas Security Scanner',
          informationUri: 'https://github.com',
          rules: Array.from(rules.values()).slice(0, 80)
        }
      },
      results: findings.slice(0, SOURCE_LIMITS.findings).map(finding => ({
        ruleId: finding.ruleId,
        level: finding.severity === 'critical' || finding.severity === 'high' ? 'error'
          : finding.severity === 'medium' ? 'warning'
            : 'note',
        message: { text: `${finding.title}: ${finding.impact}` },
        locations: finding.locations.map(location => ({
          physicalLocation: {
            artifactLocation: { uri: location.file },
            region: location.startLine ? { startLine: location.startLine } : undefined
          }
        })),
        partialFingerprints: {
          codeatlasFingerprint: finding.fingerprint
        },
        properties: {
          id: finding.id,
          severity: finding.severity,
          confidence: finding.confidence,
          cwe: finding.cwe,
          owasp: finding.owasp,
          source: finding.source,
          sourceTool: finding.sourceTool
        }
      }))
    }]
  };
}

function buildCycloneDxPreview(dependencyScan, dependencyFindings) {
  const components = safeArray(dependencyScan?.components).map(component => ({
    type: 'library',
    name: component.name,
    version: component.version,
    purl: component.purl,
    scope: component.type || component.scope || 'required',
    properties: [
      { name: 'codeatlas:ecosystem', value: component.ecosystem || '' },
      { name: 'codeatlas:source', value: component.source || '' }
    ].filter(item => item.value)
  })).filter(component => component.name && component.version).slice(0, 200);

  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${makeHash(JSON.stringify(components))}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ vendor: 'CodeAtlas', name: 'Security Scanner', version: 'local' }]
    },
    components,
    vulnerabilities: safeArray(dependencyFindings).map(finding => ({
      id: finding.advisory?.id || finding.id,
      source: { name: 'OSV' },
      ratings: [{ severity: finding.severity }],
      affects: [{ ref: finding.advisory?.package || finding.file || finding.title }],
      detail: finding.impact,
      recommendation: finding.recommendation
    })).slice(0, 100)
  };
}

function severityFromSarif(result) {
  const level = safeString(result?.level).toLowerCase();
  const securitySeverity = Number(result?.properties?.['security-severity'] || result?.properties?.securitySeverity || result?.properties?.severity);
  if (Number.isFinite(securitySeverity) && securitySeverity >= 9) return 'critical';
  if (Number.isFinite(securitySeverity) && securitySeverity >= 7) return 'high';
  if (Number.isFinite(securitySeverity) && securitySeverity >= 4) return 'medium';
  if (level === 'error') return 'high';
  if (level === 'warning') return 'medium';
  if (level === 'note') return 'low';
  return 'medium';
}

function confidenceFromSarif(result, rule) {
  const precision = safeString(result?.properties?.precision || rule?.properties?.precision).toLowerCase();
  if (['very-high', 'high'].includes(precision)) return 'high';
  if (precision === 'low') return 'low';
  return 'medium';
}

function tagsFromSarif(rule, result) {
  return Array.from(new Set([
    ...safeArray(rule?.properties?.tags),
    ...safeArray(result?.properties?.tags)
  ].map(safeString).filter(Boolean)));
}

function sarifRuleLookups(run) {
  const rules = new Map();
  safeArray(run?.tool?.driver?.rules).forEach(rule => {
    if (rule?.id) rules.set(rule.id, rule);
  });
  safeArray(run?.tool?.extensions).forEach(extension => {
    safeArray(extension?.rules).forEach(rule => {
      if (rule?.id) rules.set(rule.id, rule);
    });
  });
  return rules;
}

function sarifLocation(result) {
  const location = safeArray(result?.locations)[0]?.physicalLocation || {};
  const uri = normalizePath(location?.artifactLocation?.uri || location?.artifactLocation?.uriBaseId || '');
  const line = Number(location?.region?.startLine || location?.contextRegion?.startLine || 0) || null;
  return { uri, line };
}

function cweFromSarifTags(tags) {
  return tags
    .filter(tag => /^CWE-\d+$/i.test(tag))
    .map(tag => tag.toUpperCase());
}

function owaspFromSarifTags(tags) {
  const tag = tags.find(item => /^A\d{2}\b/i.test(item) || /owasp/i.test(item));
  return tag || '';
}

export function importExternalSecurityScan(payload, options = {}) {
  const sarif = payload?.version === '2.1.0' ? payload : payload?.sarif;
  if (!sarif || !Array.isArray(sarif.runs)) {
    return {
      available: false,
      reason: 'No SARIF 2.1.0 runs found.',
      findings: [],
      summary: { tools: [], count: 0 }
    };
  }

  const repoKey = safeString(options.repoKey || 'external');
  const findings = [];
  const tools = new Map();

  sarif.runs.forEach((run, runIndex) => {
    const driver = run?.tool?.driver || {};
    const sourceTool = safeString(driver.name || 'External SARIF scanner');
    const rules = sarifRuleLookups(run);
    tools.set(sourceTool, (tools.get(sourceTool) || 0) + safeArray(run.results).length);

    safeArray(run.results).forEach((result, resultIndex) => {
      const ruleId = safeString(result.ruleId || result.rule?.id || 'external.sarif.finding');
      const rule = rules.get(ruleId) || {};
      const location = sarifLocation(result);
      const tags = tagsFromSarif(rule, result);
      const title = safeString(
        result.message?.text ||
        result.message?.markdown ||
        rule.shortDescription?.text ||
        rule.name ||
        ruleId,
        'External scanner finding'
      );
      const help = safeString(rule.help?.text || rule.fullDescription?.text || rule.helpUri || 'Review this external scanner finding.');
      const fingerprint = safeString(
        result.partialFingerprints?.primaryLocationLineHash ||
        result.partialFingerprints?.codeatlasFingerprint ||
        result.fingerprints?.primaryLocationLineHash ||
        buildFingerprint({
          source: 'external-sarif',
          ruleId,
          file: location.uri,
          line: location.line,
          redactedEvidence: title,
          title
        })
      );

      findings.push(makeFinding({
        id: `external-sarif:${slug(sourceTool)}:${fingerprint}`,
        title,
        severity: severityFromSarif(result),
        confidence: confidenceFromSarif(result, rule),
        category: 'external-sarif',
        source: 'external-sarif',
        sourceTool,
        ruleId,
        cwe: cweFromSarifTags(tags),
        owasp: owaspFromSarifTags(tags),
        fingerprint,
        file: location.uri || 'external-sarif',
        line: location.line,
        evidence: title,
        redactedEvidence: redactEvidence(title),
        impact: safeString(rule.fullDescription?.text || result.message?.text || title),
        recommendation: help,
        locations: location.uri ? [buildLocation(location.uri, location.line)] : [],
        tags: ['external-sarif', ...tags],
        verification: {
          state: 'imported',
          detail: `Imported from ${sourceTool}; CodeAtlas did not execute this scanner locally.`
        },
        whyMatched: [
          `Imported from SARIF run ${runIndex + 1}, result ${resultIndex + 1}.`,
          ruleId ? `External rule ID: ${ruleId}.` : '',
          location.uri ? `External result points to ${location.uri}${location.line ? `:${location.line}` : ''}.` : ''
        ].filter(Boolean),
        falsePositiveNotes: [
          'Validate against the external scanner configuration and repository revision used to produce this SARIF file.',
          'Imported results may be stale if generated from a different commit.'
        ]
      }));
    });
  });

  return {
    available: true,
    reason: '',
    repoKey,
    findings: dedupeFindings(findings),
    summary: {
      count: findings.length,
      tools: Array.from(tools.entries()).map(([tool, count]) => ({ tool, count }))
    }
  };
}

function buildCoverage(repoData, codeAnalysis, fileRecords, extraFiles, dependencyScan) {
  const repositoryFiles = safeArray(repoData?.fileTree).length || safeArray(repoData?.fileStructure).length || fileRecords.length;
  const filesWithContent = fileRecords.filter(file => file.content).length;
  return {
    repositoryFiles,
    scannedFiles: fileRecords.length,
    filesWithContent,
    importantFiles: safeArray(repoData?.importantFiles).length,
    extraFetchedFiles: safeArray(extraFiles).length,
    codeAnalysisFiles: safeArray(codeAnalysis?.files).length,
    graphFiles: safeArray(repoData?.dependencyGraph?.nodes).length,
    dependencyScan: dependencyScan?.available === false ? 'unavailable' : (dependencyScan?.available ? 'available' : 'not-run'),
    dependencyScanReason: dependencyScan?.reason || '',
    secretRedaction: 'enabled',
    bounded: true
  };
}

export function buildSecurityScan({
  repoData,
  codeAnalysis,
  extraFiles = [],
  dependencyFindings = [],
  dependencyScan = null
} = {}) {
  const fileRecords = collectFileRecords(repoData, codeAnalysis, extraFiles);
  const repositoryFiles = getRepositoryFiles(repoData, fileRecords);
  const localFindings = [
    ...normalizeCodeAnalysisFindings(codeAnalysis),
    ...fileRecords.flatMap(scanSourceRules),
    ...fileRecords.flatMap(scanConfigAndSupplyChainRules),
    ...fileRecords.flatMap(scanSecretRules),
    ...scanRepositoryPosture(repoData),
    ...normalizeDependencyFindings(dependencyFindings)
  ];

  const findings = addBlastRadius(dedupeFindings(localFindings), repoData, repositoryFiles);
  const score = buildScore(findings);
  const scored = scoreFindings(findings, repoData);
  const coverage = buildCoverage(repoData, codeAnalysis, fileRecords, extraFiles, dependencyScan);
  const generatedAt = new Date().toISOString();
  const repoKey = [
    repoData?.repoInfo?.url,
    repoData?.repoInfo?.updatedAt,
    repoData?.fileCount || repoData?.fileTree?.length,
    codeAnalysis?.summary?.analyzedFiles
  ].filter(Boolean).join(':') || 'unknown-repo';

  const secrets = findings.filter(finding => finding.source === 'local-secret-scanner');
  const dependencyVulnerabilities = findings.filter(finding => finding.source === 'dependency-vulnerability');
  const supplyChainFindings = findings.filter(finding => finding.category === 'supply-chain' || safeArray(finding.tags).includes('supply-chain') || safeArray(finding.tags).includes('posture'));
  const sarif = buildSarifPreview(findings);
  const sbom = buildCycloneDxPreview(dependencyScan, dependencyVulnerabilities);

  return {
    schemaVersion: 2,
    repoKey,
    generatedAt,
    source: 'deterministic-security-scan',
    score,
    findings,
    sections: {
      secretsExposure: {
        count: secrets.length,
        critical: secrets.filter(finding => finding.severity === 'critical').length,
        findings: secrets.map(finding => finding.id)
      },
      dependencyVulnerabilities: {
        available: dependencyScan?.available !== false,
        reason: dependencyScan?.reason || '',
        count: dependencyVulnerabilities.length,
        findings: dependencyVulnerabilities.map(finding => finding.id)
      },
      riskyFiles: scored.riskyFiles,
      riskyModules: scored.riskyModules,
      owaspCategories: scored.owaspCategories,
      fixChecklist: buildFixChecklist(findings),
      verification: buildVerificationSummary(findings),
      sourceTools: buildToolSummary(findings),
      supplyChain: {
        count: supplyChainFindings.length,
        findings: supplyChainFindings.map(finding => finding.id)
      },
      exports: {
        sarif,
        cyclonedx: sbom
      },
      coverage
    },
    aiExplanation: null
  };
}

export default buildSecurityScan;
