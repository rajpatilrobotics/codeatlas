import { calculateBlastRadius } from '../repository/blastRadiusAnalysis.js';

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];
const CONFIDENCE = ['high', 'medium', 'low'];
const SOURCE_TYPES = new Set([
  'local-code-rule',
  'local-secret-scanner',
  'dependency-vulnerability',
  'config-rule',
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
  low: 0.5
};

const SOURCE_LIMITS = {
  files: 180,
  findings: 250,
  riskyFiles: 20,
  riskyModules: 12,
  checklist: 18
};

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
    text.includes('your_') ||
    text.includes('replace_me') ||
    text.includes('example') ||
    text.includes('placeholder') ||
    text.includes('changeme') ||
    text.includes('<') ||
    text.includes('${') ||
    text.includes('process.env') ||
    text.includes('import.meta.env') ||
    text.includes('os.environ') ||
    text.includes('getenv')
  );
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
  const title = safeString(input.title, 'Security finding');
  const rawEvidence = safeString(input.evidence || input.redactedEvidence || '');
  const redactedEvidence = redactEvidence(input.redactedEvidence || rawEvidence);

  return {
    id: input.id || `${source}:${slug(title)}:${makeHash(`${file}:${input.line || ''}:${redactedEvidence}:${title}`)}`,
    title,
    severity,
    confidence,
    category: safeString(input.category, 'general'),
    source,
    file,
    line: Number.isFinite(Number(input.line)) ? Number(input.line) : null,
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
      const category = /sql/i.test(title) ? 'injection'
        : /secret|api key|password/i.test(title) ? 'secret-management'
          : /eval|dangerous/i.test(title) ? 'unsafe-code-execution'
            : /crypto|md5|sha1/i.test(title) ? 'cryptography'
              : 'static-analysis';

      addFinding(findings, {
        id: `legacy:${slug(title)}:${makeHash(`${issue.file || issue.path}:${issue.line}:${index}:${title}`)}`,
        title,
        severity,
        confidence: 'medium',
        category,
        source: category === 'secret-management' ? 'local-secret-scanner' : 'local-code-rule',
        file: issue.file || issue.path,
        line: issue.line,
        evidence: issue.code || issue.evidence || issue.message,
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

  const lines = file.content.split('\n');
  const lowerPath = file.path.toLowerCase();

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const lineNumber = index + 1;

    if (/\beval\s*\(/.test(trimmed)) {
      addFinding(findings, {
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

    if (/(?:query|execute|raw)\s*\(/i.test(trimmed) && /(\+|\$\{|`)/.test(trimmed)) {
      addFinding(findings, {
        title: 'SQL query string composition',
        severity: 'critical',
        confidence: 'medium',
        category: 'injection',
        source: 'local-code-rule',
        file: file.path,
        line: lineNumber,
        evidence: trimmed,
        impact: 'Building SQL with string interpolation can allow injection when inputs reach the query.',
        recommendation: 'Use parameterized queries or ORM query builders with bound parameters.'
      });
    }

    if (/\bmd5\b|\bsha1\b/i.test(trimmed) && !/sha1sum|checksum|etag|fingerprint/i.test(trimmed)) {
      addFinding(findings, {
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
  });

  return findings;
}

function scanSecretRules(file) {
  const findings = [];
  if (!file.content) return findings;

  const patterns = [
    {
      title: 'GitHub token pattern',
      regex: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
      severity: 'critical',
      confidence: 'high',
      category: 'secret-management',
      impact: 'A GitHub token can grant repository or organization access if active.',
      recommendation: 'Revoke the token, rotate credentials, and move it to a server-side secret manager.'
    },
    {
      title: 'OpenAI API key pattern',
      regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
      severity: 'critical',
      confidence: 'high',
      category: 'secret-management',
      impact: 'An OpenAI API key can allow unauthorized API usage and billing exposure.',
      recommendation: 'Revoke and rotate the key, then load it from server-side environment variables only.'
    },
    {
      title: 'Groq API key pattern',
      regex: /\bgsk_[A-Za-z0-9_-]{20,}\b/g,
      severity: 'critical',
      confidence: 'high',
      category: 'secret-management',
      impact: 'A Groq API key can allow unauthorized model usage.',
      recommendation: 'Revoke and rotate the key, then store it outside source control.'
    },
    {
      title: 'Google/Gemini API key pattern',
      regex: /\bAIza[0-9A-Za-z_-]{20,}\b/g,
      severity: 'critical',
      confidence: 'high',
      category: 'secret-management',
      impact: 'A Google API key can expose cloud/API access depending on its restrictions.',
      recommendation: 'Rotate the key and enforce API, referrer, and server-side restrictions.'
    },
    {
      title: 'AWS access key pattern',
      regex: /\bAKIA[0-9A-Z]{16}\b/g,
      severity: 'critical',
      confidence: 'high',
      category: 'secret-management',
      impact: 'An AWS access key can grant cloud account access if paired with its secret.',
      recommendation: 'Deactivate the key, rotate credentials, and audit recent IAM activity.'
    },
    {
      title: 'JWT-like token in source',
      regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
      severity: 'high',
      confidence: 'medium',
      category: 'secret-management',
      impact: 'Committed JWTs can expose session or service identity data.',
      recommendation: 'Remove committed tokens and ensure examples use placeholders.'
    },
    {
      title: 'Database connection URL in source',
      regex: /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[^'"\s)]+/gi,
      severity: 'critical',
      confidence: 'high',
      category: 'secret-management',
      impact: 'Database URLs often contain credentials and network location details.',
      recommendation: 'Rotate credentials if real, move connection strings to protected environment variables, and keep examples redacted.'
    },
    {
      title: 'Private key material in source',
      regex: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/g,
      severity: 'critical',
      confidence: 'high',
      category: 'secret-management',
      impact: 'Private keys in source can compromise signing, SSH, TLS, or service identity.',
      recommendation: 'Revoke/rotate the key pair and replace committed material with secret-manager references.'
    }
  ];

  const lines = file.content.split('\n');
  lines.forEach((line, index) => {
    patterns.forEach(pattern => {
      pattern.regex.lastIndex = 0;
      const matches = [...line.matchAll(pattern.regex)];
      matches.forEach(match => {
        if (isProbablyPlaceholder(match[0]) || isProbablyPlaceholder(line)) return;
        addFinding(findings, {
          title: pattern.title,
          severity: pattern.severity,
          confidence: pattern.confidence,
          category: pattern.category,
          source: 'local-secret-scanner',
          file: file.path,
          line: index + 1,
          evidence: line.trim(),
          redactedEvidence: redactEvidence(line.trim()),
          impact: pattern.impact,
          recommendation: pattern.recommendation
        });
      });
    });

    const assignment = line.match(/\b(api[_-]?key|apikey|secret|token|password|client[_-]?secret|auth[_-]?token)\b\s*[:=]\s*['"`]?([^'"`\s,;)}]{12,})/i);
    if (assignment && !isProbablyPlaceholder(assignment[2]) && !/process\.env|import\.meta\.env|os\.environ|getenv/i.test(line)) {
      addFinding(findings, {
        title: 'Generic hardcoded secret assignment',
        severity: /password|secret|token/i.test(assignment[1]) ? 'high' : 'medium',
        confidence: assignment[2].length >= 24 ? 'medium' : 'low',
        category: 'secret-management',
        source: 'local-secret-scanner',
        file: file.path,
        line: index + 1,
        evidence: line.trim(),
        redactedEvidence: redactEvidence(line.trim()),
        impact: 'Secret-like values committed to source can be copied, leaked, or abused.',
        recommendation: 'Replace the value with an environment variable or secret-manager lookup and rotate it if real.'
      });
    }

    if (/\bAuthorization\b\s*[:=]\s*['"`]?\s*(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{16,}/i.test(line)) {
      addFinding(findings, {
        title: 'Hardcoded authorization header',
        severity: 'high',
        confidence: 'medium',
        category: 'secret-management',
        source: 'local-secret-scanner',
        file: file.path,
        line: index + 1,
        evidence: line.trim(),
        redactedEvidence: redactEvidence(line.trim()),
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

  const riskPoints = findings.reduce((sum, finding) => (
    sum + SEVERITY_WEIGHT[finding.severity] * CONFIDENCE_WEIGHT[finding.confidence]
  ), 0);

  const overall = findings.length === 0 ? 96 : Math.max(0, Math.round(100 - Math.min(100, riskPoints)));
  const level = severityTotals.critical > 0 || overall < 45 ? 'critical'
    : severityTotals.high > 0 || overall < 65 ? 'high'
      : severityTotals.medium > 0 || overall < 82 ? 'medium'
        : 'low';

  return {
    overall,
    level,
    formula: '100 minus weighted finding severity, adjusted by confidence.',
    severityTotals
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
    ...fileRecords.flatMap(scanSecretRules),
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

  return {
    schemaVersion: 1,
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
      coverage
    },
    aiExplanation: null
  };
}

export default buildSecurityScan;
