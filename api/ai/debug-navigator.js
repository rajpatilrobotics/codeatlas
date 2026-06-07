/**
 * AI Debug Navigator Enhancement API
 * Enhances deterministic Debug Navigator context with Groq/Gemini structured JSON.
 */

import { generateStructuredJSON } from '../../src/services/ai/aiService.js';

const MAX_CONTEXT_CHARS = 12000;
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);
const VALID_PRIORITY = new Set(['high', 'medium', 'low']);

const DEBUG_SCHEMA = {
  summary: '',
  probableRootCause: '',
  confidence: 'high | medium | low',
  reasoning: [''],
  suggestedFixes: [''],
  filesToInspect: [{ path: '', reason: '', priority: 'high | medium | low' }],
  validationPlan: [{ label: '', command: '', detail: '' }],
  risks: [''],
  missingContext: [''],
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

function normalizePriority(value, fallback = 'medium') {
  const normalized = safeString(value).toLowerCase();
  return VALID_PRIORITY.has(normalized) ? normalized : fallback;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizePath(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value?.path === 'string') return value.path.trim();
  return '';
}

function redactText(value) {
  return safeString(value)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi, 'Bearer [redacted]')
    .replace(/\b(GITHUB_TOKEN|GROQ_API_KEY|GEMINI_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|[A-Z0-9_]*API[_-]?KEY|[A-Z0-9_]*TOKEN|[A-Z0-9_]*SECRET)\s*[:=]\s*['"]?[^'"\s]+/gi, '$1=[redacted]')
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, '[redacted-github-token]')
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[redacted-gemini-key]')
    .replace(/\bgsk_[0-9A-Za-z_-]{20,}\b/g, '[redacted-groq-key]')
    .replace(/\b[A-Za-z0-9_-]{36,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g, '[redacted-token]')
    .replace(/\b[A-Fa-f0-9]{48,}\b/g, '[redacted-secret]');
}

function compactJson(value, limit = MAX_CONTEXT_CHARS) {
  const json = redactText(JSON.stringify(value, null, 2));
  return json.length > limit ? `${json.slice(0, limit)}\n...truncated` : json;
}

function buildAllowedPathSet(input) {
  const paths = [
    ...safeArray(input?.matchedFiles).map(normalizePath),
    ...safeArray(input?.rootCauseCandidates).map(normalizePath),
    ...safeArray(input?.dependencyTrace?.seedFiles).map(normalizePath),
    ...safeArray(input?.dependencyTrace?.relatedFiles).map(normalizePath),
    ...safeArray(input?.localDebugAnalysis?.filesToInspect).map(normalizePath),
  ];

  return new Set(unique(paths));
}

function buildAllowedCommandSet(input) {
  const commands = [
    ...safeArray(input?.packageScripts).map(script => (
      script?.name ? `npm run ${script.name}` : safeString(script?.command)
    )),
    ...safeArray(input?.validationChecklist).map(item => safeString(item?.command)),
    ...safeArray(input?.localDebugAnalysis?.validationPlan).map(item => safeString(item?.command)),
  ];

  return new Set(unique(commands));
}

function normalizeStringArray(value, limit = 8) {
  return safeArray(value)
    .map(item => safeString(item?.detail || item?.reason || item?.text || item))
    .filter(Boolean)
    .slice(0, limit);
}

function buildLocalDebugAnalysis(input) {
  const local = input?.localDebugAnalysis;
  if (local && typeof local === 'object' && !Array.isArray(local)) {
    return {
      summary: redactText(local.summary || ''),
      probableRootCause: redactText(local.probableRootCause || ''),
      confidence: normalizeConfidence(local.confidence, 'medium'),
      reasoning: normalizeStringArray(local.reasoning, 8),
      suggestedFixes: normalizeStringArray(local.suggestedFixes, 8),
      filesToInspect: safeArray(local.filesToInspect).map(item => ({
        path: normalizePath(item),
        reason: redactText(item?.reason || 'Selected by deterministic local debug context.'),
        priority: normalizePriority(item?.priority || item?.confidence, 'medium'),
      })).filter(item => item.path).slice(0, 8),
      validationPlan: safeArray(local.validationPlan).map(item => ({
        label: redactText(item?.label || 'Validate locally'),
        command: redactText(item?.command || ''),
        detail: redactText(item?.detail || ''),
      })).filter(item => item.label || item.command || item.detail).slice(0, 8),
      risks: normalizeStringArray(local.risks, 8),
      missingContext: normalizeStringArray(local.missingContext, 8),
    };
  }

  const errorSummary = input?.errorSummary || {};
  const candidates = safeArray(input?.rootCauseCandidates);
  const topCandidate = candidates[0];
  const matchedFiles = safeArray(input?.matchedFiles);
  const fallbackFiles = candidates.length > 0 ? candidates : matchedFiles;

  return {
    summary: redactText(
      `${safeString(errorSummary.type, 'Unknown error')}: ${safeString(errorSummary.message, 'No message detected.')}`
    ),
    probableRootCause: topCandidate?.path
      ? `${topCandidate.path}: ${topCandidate.reason || topCandidate.hypothesis?.label || 'Inspect this deterministic candidate first.'}`
      : 'No repository-backed root cause identified yet.',
    confidence: normalizeConfidence(topCandidate?.confidence, matchedFiles.length > 0 ? 'medium' : 'low'),
    reasoning: unique([
      topCandidate?.reason,
      topCandidate?.hypothesis?.rationale,
      ...safeArray(topCandidate?.evidence).map(item => `${item.label}: ${item.detail}`),
    ].map(redactText)).slice(0, 8),
    suggestedFixes: normalizeStringArray(topCandidate?.safeFixHints, 8),
    filesToInspect: fallbackFiles.slice(0, 8).map((file, index) => ({
      path: normalizePath(file),
      reason: redactText(file?.reason || file?.reasons?.[0] || 'Matched by deterministic local debug context.'),
      priority: index === 0 ? 'high' : normalizePriority(file?.confidence, 'medium'),
    })).filter(item => item.path),
    validationPlan: safeArray(input?.validationChecklist).map(item => ({
      label: redactText(item?.label || 'Validate locally'),
      command: redactText(item?.command || ''),
      detail: redactText(item?.detail || ''),
    })).filter(item => item.label || item.command || item.detail).slice(0, 8),
    risks: topCandidate?.confidence === 'low'
      ? ['Local confidence is low; inspect matched evidence before changing code.']
      : [],
    missingContext: unique([
      ...safeArray(topCandidate?.missingContext),
      ...safeArray(input?.warnings),
    ].map(redactText)).slice(0, 8),
  };
}

function normalizeFilesToInspect(value, allowedPaths, localFiles) {
  const normalized = safeArray(value).map(item => {
    const path = normalizePath(item);
    if (!path || !allowedPaths.has(path)) return null;
    return {
      path,
      reason: redactText(item?.reason || item?.detail || 'Selected from supplied deterministic context.'),
      priority: normalizePriority(item?.priority || item?.confidence, 'medium'),
    };
  }).filter(Boolean).slice(0, 8);

  return normalized.length > 0 ? normalized : safeArray(localFiles).slice(0, 8);
}

function normalizeValidationPlan(value, input, localPlan) {
  const allowedCommands = buildAllowedCommandSet(input);
  const normalized = safeArray(value).map(item => {
    const rawCommand = redactText(item?.command || '');
    const command = rawCommand && allowedCommands.has(rawCommand) ? rawCommand : '';
    return {
      label: redactText(item?.label || item?.title || 'Validate locally'),
      command,
      detail: redactText(item?.detail || item?.description || 'Validate the suspected fix with repository checks.'),
    };
  }).filter(item => item.label || item.command || item.detail).slice(0, 8);

  return normalized.length > 0 ? normalized : safeArray(localPlan.validationPlan).slice(0, 8);
}

function normalizeDebugAnalysis(raw, input) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('AI debug response was not a JSON object.');
  }

  const localPlan = buildLocalDebugAnalysis(input);
  const allowedPaths = buildAllowedPathSet(input);
  const filesToInspect = normalizeFilesToInspect(raw.filesToInspect, allowedPaths, localPlan.filesToInspect);
  const validationPlan = normalizeValidationPlan(raw.validationPlan, input, localPlan);
  const analysis = {
    summary: redactText(raw.summary || localPlan.summary),
    probableRootCause: redactText(raw.probableRootCause || localPlan.probableRootCause),
    confidence: normalizeConfidence(raw.confidence, localPlan.confidence),
    reasoning: normalizeStringArray(raw.reasoning, 8),
    suggestedFixes: normalizeStringArray(raw.suggestedFixes, 8),
    filesToInspect,
    validationPlan,
    risks: normalizeStringArray(raw.risks, 8),
    missingContext: normalizeStringArray(raw.missingContext, 8),
  };

  if (analysis.reasoning.length === 0) analysis.reasoning = localPlan.reasoning;
  if (analysis.suggestedFixes.length === 0) analysis.suggestedFixes = localPlan.suggestedFixes;
  if (analysis.risks.length === 0) analysis.risks = localPlan.risks;
  if (analysis.missingContext.length === 0) analysis.missingContext = localPlan.missingContext;

  if (!analysis.summary && !analysis.probableRootCause && analysis.filesToInspect.length === 0) {
    throw new Error('AI debug response did not include usable root-cause analysis.');
  }

  return analysis;
}

function buildPrompt(input) {
  return `You are CodeAtlas Debug Navigator AI. Enhance the deterministic local root-cause analysis using only the supplied repository context.

Rules:
- Return valid JSON only.
- Do not invent files, scripts, APIs, dependencies, env var values, or secret values.
- filesToInspect.path must be one of the supplied matched/root-cause/dependency paths.
- Validation commands must come from supplied package scripts or validation checklist commands.
- Keep fixes safe, manual, and specific to the supplied context.
- Preserve uncertainty in missingContext when evidence is incomplete.

Required JSON shape:
${JSON.stringify(DEBUG_SCHEMA, null, 2)}

Deterministic debug context:
${compactJson(input)}`;
}

function getFallbackMessage(error) {
  const message = safeString(error?.message || error).toLowerCase();

  if (message.includes('quota') || message.includes('429') || message.includes('rate limit')) {
    return 'AI provider quota or rate limit reached; deterministic local debug analysis is still ready.';
  }
  if (message.includes('not configured') || message.includes('no ai providers configured')) {
    return 'AI provider is not configured for this server; deterministic local debug analysis is still ready.';
  }
  if (message.includes('invalid json') || message.includes('json object') || message.includes('usable root-cause')) {
    return 'AI debug response was not usable JSON; deterministic local debug analysis is still ready.';
  }

  return 'AI debug enhancement unavailable; deterministic local debug analysis is still ready.';
}

function fallbackResponse(res, input, error) {
  return res.status(200).json({
    success: true,
    mode: 'local-fallback',
    analysis: buildLocalDebugAnalysis(input),
    error: getFallbackMessage(error),
  });
}

function compactInput(body) {
  const dependencyTrace = body?.dependencyTrace || {};

  return {
    rawError: redactText(body?.rawError || '').slice(0, 6000),
    errorSummary: body?.errorSummary || {},
    parsedFrames: safeArray(body?.parsedFrames).slice(0, 10),
    matchedFiles: safeArray(body?.matchedFiles).slice(0, 8),
    dependencyTrace: {
      available: Boolean(dependencyTrace.available),
      reason: redactText(dependencyTrace.reason || ''),
      seedFiles: safeArray(dependencyTrace.seedFiles).slice(0, 12),
      relatedFiles: safeArray(dependencyTrace.relatedFiles).slice(0, 12),
      tracePaths: safeArray(dependencyTrace.tracePaths).slice(0, 12),
      coverage: dependencyTrace.coverage || {},
    },
    rootCauseCandidates: safeArray(body?.rootCauseCandidates).slice(0, 5),
    validationChecklist: safeArray(body?.validationChecklist).slice(0, 8),
    packageScripts: safeArray(body?.packageScripts).slice(0, 8),
    warnings: safeArray(body?.warnings).slice(0, 8),
    localDebugAnalysis: body?.localDebugAnalysis || null,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const input = compactInput(req.body || {});

  if (!safeString(input.rawError) && !safeString(input.errorSummary?.message)) {
    return res.status(400).json({ error: 'Debug error input or parsed summary is required' });
  }

  if (!input.localDebugAnalysis || typeof input.localDebugAnalysis !== 'object') {
    return res.status(400).json({ error: 'Local deterministic debug analysis is required' });
  }

  try {
    const rawAnalysis = await generateStructuredJSON(buildPrompt(input), DEBUG_SCHEMA, {
      temperature: 0.25,
      maxTokens: 1400,
    });
    const analysis = normalizeDebugAnalysis(rawAnalysis, input);

    return res.status(200).json({
      success: true,
      mode: 'ai-enhanced',
      analysis,
    });
  } catch (error) {
    console.error('AI Debug Navigator enhancement failed:', error);
    return fallbackResponse(res, input, error);
  }
}
