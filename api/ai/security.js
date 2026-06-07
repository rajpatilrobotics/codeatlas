/**
 * AI Security Explanation API
 * Explains deterministic security findings without inventing new findings.
 */

import { generateStructuredJSON, isAIProviderFailure } from '../../src/services/ai/aiService.js';

const MAX_CONTEXT_CHARS = 14000;
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);
const SECURITY_EXPLANATION_SCHEMA = {
  summary: '',
  prioritizedFindings: [{ findingId: '', reason: '', priority: 'high | medium | low' }],
  fixStrategy: [{ title: '', detail: '', findingIds: [''] }],
  validationPlan: [{ label: '', command: '', detail: '' }],
  warnings: [''],
  missingContext: ['']
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeString(value, fallback = '') {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function normalizeConfidence(value, fallback = 'medium') {
  const normalized = safeString(value).toLowerCase();
  return VALID_CONFIDENCE.has(normalized) ? normalized : fallback;
}

function redactText(value) {
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
    .replace(/((?:api[_-]?key|apikey|secret|token|password|client[_-]?secret)\s*[:=]\s*['"`]?)[^'"`\s,;)}]{8,}/gi, '$1[redacted]');
}

function compactJson(value, limit = MAX_CONTEXT_CHARS) {
  const json = redactText(JSON.stringify(value, null, 2));
  return json.length > limit ? `${json.slice(0, limit)}\n...truncated` : json;
}

function buildAllowedFindingIds(securityScan) {
  return new Set(safeArray(securityScan?.findings).map(finding => safeString(finding?.id)).filter(Boolean));
}

function buildLocalFallback(securityScan, error = '') {
  const findings = safeArray(securityScan?.findings);
  const topFindings = findings.slice(0, 5);

  return {
    mode: 'local-fallback',
    summary: findings.length > 0
      ? `Local deterministic scanner found ${findings.length} security finding${findings.length === 1 ? '' : 's'}.`
      : 'Local deterministic scanner did not find security findings in the analyzed repository context.',
    prioritizedFindings: topFindings.map(finding => ({
      findingId: finding.id,
      reason: `${finding.severity} severity ${finding.source} finding in ${finding.file || 'repository manifest'}.`,
      priority: ['critical', 'high'].includes(finding.severity) ? 'high' : finding.severity === 'medium' ? 'medium' : 'low'
    })),
    fixStrategy: topFindings.slice(0, 4).map(finding => ({
      title: finding.title,
      detail: finding.recommendation || 'Review this deterministic finding and apply a safer pattern.',
      findingIds: [finding.id]
    })),
    validationPlan: [
      { label: 'Run project tests', command: '', detail: 'Run the repository test command if one is available.' },
      { label: 'Review changed security paths', command: '', detail: 'Manually review affected auth, config, secret, and dependency files.' }
    ],
    warnings: error ? [`AI explanation unavailable: ${error}`] : [],
    missingContext: ['AI explanation is optional; deterministic findings remain the source of truth.']
  };
}

function normalizeExplanation(raw, securityScan) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('AI security explanation was not a JSON object.');
  }

  const allowedIds = buildAllowedFindingIds(securityScan);
  const filterIds = ids => safeArray(ids).map(safeString).filter(id => allowedIds.has(id)).slice(0, 8);

  const prioritizedFindings = safeArray(raw.prioritizedFindings).map(item => {
    const findingId = safeString(item?.findingId || item?.id);
    if (!allowedIds.has(findingId)) return null;
    return {
      findingId,
      reason: redactText(item?.reason || 'Prioritized from deterministic finding evidence.'),
      priority: normalizeConfidence(item?.priority, 'medium')
    };
  }).filter(Boolean).slice(0, 8);

  const fixStrategy = safeArray(raw.fixStrategy).map(item => {
    const findingIds = filterIds(item?.findingIds || item?.findings || item?.ids);
    if (findingIds.length === 0) return null;
    return {
      title: redactText(item?.title || 'Fix deterministic finding'),
      detail: redactText(item?.detail || item?.recommendation || 'Apply the deterministic recommendation.'),
      findingIds
    };
  }).filter(Boolean).slice(0, 8);

  const validationPlan = safeArray(raw.validationPlan).map(item => ({
    label: redactText(item?.label || 'Validate security fix'),
    command: redactText(item?.command || ''),
    detail: redactText(item?.detail || '')
  })).filter(item => item.label || item.command || item.detail).slice(0, 8);

  return {
    mode: 'ai-enhanced',
    summary: redactText(raw.summary || 'AI summarized the deterministic security findings.'),
    prioritizedFindings,
    fixStrategy,
    validationPlan,
    warnings: safeArray(raw.warnings).map(redactText).filter(Boolean).slice(0, 6),
    missingContext: safeArray(raw.missingContext).map(redactText).filter(Boolean).slice(0, 6)
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { securityScan, repoContext } = req.body || {};

  if (!securityScan || !Array.isArray(securityScan.findings)) {
    return res.status(400).json({ success: false, error: 'Deterministic securityScan with findings is required.' });
  }

  const deterministicContext = {
    score: securityScan.score,
    findings: safeArray(securityScan.findings).slice(0, 30).map(finding => ({
      id: finding.id,
      title: finding.title,
      severity: finding.severity,
      confidence: finding.confidence,
      category: finding.category,
      source: finding.source,
      file: finding.file,
      line: finding.line,
      redactedEvidence: finding.redactedEvidence,
      impact: finding.impact,
      recommendation: finding.recommendation,
      blastRadius: finding.blastRadius
    })),
    riskyFiles: safeArray(securityScan.sections?.riskyFiles).slice(0, 10),
    riskyModules: safeArray(securityScan.sections?.riskyModules).slice(0, 8),
    owaspCategories: safeArray(securityScan.sections?.owaspCategories).slice(0, 8),
    coverage: securityScan.sections?.coverage,
    repoContext: {
      name: repoContext?.name,
      language: repoContext?.language,
      packageScripts: repoContext?.packageScripts,
      packageManager: repoContext?.packageManager
    }
  };

  const prompt = `You are a security reviewer for CodeAtlas.

Explain ONLY the deterministic findings supplied below. Do not invent findings, files, dependencies, secrets, APIs, or environment variables.
Every prioritized finding and fix strategy item must reference existing finding IDs from the deterministic context.
If context is insufficient, preserve uncertainty in missingContext.
Never print secrets. Evidence is already redacted.

Deterministic context:
${compactJson(deterministicContext)}

Return JSON with this exact shape:
${JSON.stringify(SECURITY_EXPLANATION_SCHEMA, null, 2)}`;

  try {
    const raw = await generateStructuredJSON(prompt, SECURITY_EXPLANATION_SCHEMA, {
      temperature: 0.2,
      maxTokens: 1800
    });
    const explanation = normalizeExplanation(raw, securityScan);
    return res.status(200).json({ success: true, mode: 'ai-enhanced', explanation });
  } catch (error) {
    console.error('AI security explanation failed:', error);
    const fallback = buildLocalFallback(securityScan, error.message || 'AI provider unavailable');
    const status = isAIProviderFailure(error) ? 200 : 200;
    return res.status(status).json({
      success: true,
      mode: 'local-fallback',
      explanation: fallback,
      error: error.message || 'AI security explanation unavailable.'
    });
  }
}
