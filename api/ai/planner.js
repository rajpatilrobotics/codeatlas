/**
 * AI Planner Enhancement API
 * Enhances deterministic Planner context with Groq/Gemini structured JSON.
 */

import { generateStructuredJSON } from '../../src/services/ai/aiService.js';

const MAX_CONTEXT_CHARS = 12000;
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);
const VALID_RISK = new Set(['critical', 'high', 'medium', 'low']);

const PLANNER_SCHEMA = {
  taskTitle: '',
  intent: '',
  confidence: 'high | medium | low',
  riskLevel: 'critical | high | medium | low',
  affectedSystems: {
    modules: [{ name: '', reason: '', files: [''] }],
    services: [{ name: '', path: '', reason: '' }],
    dependencies: [{ name: '', reason: '' }],
  },
  entryPoints: [{ path: '', reason: '' }],
  suggestedFileChanges: [{ path: '', change: '', reason: '', confidence: 'high | medium | low' }],
  implementationRoadmap: [{ title: '', detail: '', files: [''] }],
  validationChecklist: [{ label: '', command: '', detail: '', source: '' }],
  rolloutSteps: [{ title: '', detail: '' }],
  risks: [{ level: 'critical | high | medium | low', title: '', detail: '' }],
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

function normalizeRisk(value, fallback = 'medium') {
  const normalized = safeString(value).toLowerCase();
  return VALID_RISK.has(normalized) ? normalized : fallback;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizePath(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value?.path === 'string') return value.path.trim();
  return '';
}

function compactJson(value, limit = MAX_CONTEXT_CHARS) {
  const json = JSON.stringify(value, null, 2);
  return json.length > limit ? `${json.slice(0, limit)}\n...truncated` : json;
}

function buildAllowedPathSet(input) {
  const paths = [
    ...safeArray(input?.matchedRepoContext?.matchedFiles).map(normalizePath),
    ...safeArray(input?.suggestedFiles).map(normalizePath),
    ...safeArray(input?.matchedRepoContext?.entryPoints).map(normalizePath),
    ...safeArray(input?.blastImpact?.items).map(normalizePath),
    ...safeArray(input?.localPlan?.suggestedFiles).map(normalizePath),
  ];

  return new Set(unique(paths));
}

function filterKnownFiles(files, allowedPaths) {
  return unique(safeArray(files).map(normalizePath)).filter(path => allowedPaths.has(path));
}

function normalizeAffectedSystems(value, allowedPaths) {
  const source = Array.isArray(value) ? { modules: value } : (value || {});

  return {
    modules: safeArray(source.modules).map(item => {
      const name = safeString(item?.name || item?.module || item?.system);
      if (!name) return null;
      return {
        name,
        reason: safeString(item?.reason || item?.description, 'Matched by AI using local Planner context.'),
        files: filterKnownFiles(item?.files || item?.matchedFiles, allowedPaths),
      };
    }).filter(Boolean).slice(0, 8),
    services: safeArray(source.services).map(item => {
      const path = normalizePath(item);
      const name = safeString(item?.name || path);
      if (!name && !path) return null;
      return {
        name: name || path,
        path,
        reason: safeString(item?.reason || item?.description, 'Service-like context selected by AI.'),
      };
    }).filter(Boolean).slice(0, 8),
    dependencies: safeArray(source.dependencies).map(item => {
      const name = safeString(item?.name || item);
      if (!name) return null;
      return {
        name,
        reason: safeString(item?.reason || item?.description, 'Dependency signal selected by AI.'),
      };
    }).filter(Boolean).slice(0, 8),
  };
}

function normalizePlannerResponse(raw, input) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('AI planner response was not a JSON object.');
  }

  const allowedPaths = buildAllowedPathSet(input);
  const localPlan = input.localPlan || {};
  const affectedSystems = normalizeAffectedSystems(raw.affectedSystems, allowedPaths);
  const entryPoints = safeArray(raw.entryPoints).map(item => {
    const path = normalizePath(item);
    if (!path || !allowedPaths.has(path)) return null;
    return {
      path,
      reason: safeString(item?.reason || item?.description, 'Entry point selected from local Planner context.'),
    };
  }).filter(Boolean).slice(0, 8);

  const suggestedFileChanges = safeArray(raw.suggestedFileChanges).map(item => {
    const path = normalizePath(item);
    if (!path || !allowedPaths.has(path)) return null;
    return {
      path,
      change: safeString(item?.change || item?.action, 'Review and update this matched file.'),
      reason: safeString(item?.reason, 'Selected from existing local Planner matches.'),
      confidence: normalizeConfidence(item?.confidence, localPlan.confidence || 'medium'),
    };
  }).filter(Boolean).slice(0, 8);

  const implementationRoadmap = safeArray(raw.implementationRoadmap).map((item, index) => ({
    title: safeString(item?.title, `Step ${index + 1}`),
    detail: safeString(item?.detail || item?.description, 'Follow this step using the matched repository context.'),
    files: filterKnownFiles(item?.files, allowedPaths).slice(0, 6),
  })).filter(item => item.title || item.detail).slice(0, 8);

  if (suggestedFileChanges.length === 0 && implementationRoadmap.length === 0) {
    throw new Error('AI planner response did not include usable file changes or roadmap steps.');
  }

  return {
    taskTitle: safeString(raw.taskTitle, localPlan.taskTitle || input.task || 'Engineering change'),
    intent: safeString(raw.intent, localPlan.intent?.label || 'Engineering change'),
    confidence: normalizeConfidence(raw.confidence, localPlan.confidence || 'medium'),
    riskLevel: normalizeRisk(raw.riskLevel, 'medium'),
    affectedSystems,
    entryPoints,
    suggestedFileChanges,
    implementationRoadmap,
    validationChecklist: safeArray(raw.validationChecklist).map(item => ({
      label: safeString(item?.label, 'Validate change'),
      command: safeString(item?.command),
      detail: safeString(item?.detail || item?.description, 'Validate the implementation using repository checks.'),
      source: safeString(item?.source, 'AI planner'),
    })).filter(item => item.label || item.command || item.detail).slice(0, 8),
    rolloutSteps: safeArray(raw.rolloutSteps).map((item, index) => ({
      title: safeString(item?.title, `Rollout step ${index + 1}`),
      detail: safeString(item?.detail || item?.description, 'Roll out carefully after validation.'),
    })).filter(item => item.title || item.detail).slice(0, 6),
    risks: safeArray(raw.risks).map(item => ({
      level: normalizeRisk(item?.level, 'medium'),
      title: safeString(item?.title, 'Implementation risk'),
      detail: safeString(item?.detail || item?.description, 'Review this risk before implementation.'),
    })).filter(item => item.title || item.detail).slice(0, 8),
    missingContext: safeArray(raw.missingContext)
      .map(item => safeString(item))
      .filter(Boolean)
      .slice(0, 8),
  };
}

function buildPrompt(input) {
  return `You are CodeAtlas Planner AI. Enhance the deterministic local implementation plan using only the supplied repository context.

Rules:
- Return valid JSON only.
- Do not invent files, modules, scripts, APIs, or dependencies.
- suggestedFileChanges.path and entryPoints.path must use only paths from the supplied context.
- Keep the plan practical for a developer who will implement the change manually.
- Preserve local uncertainty: if context is missing, put it in missingContext.

Required JSON shape:
${JSON.stringify(PLANNER_SCHEMA, null, 2)}

Planner context:
${compactJson(input)}`;
}

function getFallbackMessage(error) {
  const message = safeString(error?.message || error).toLowerCase();

  if (message.includes('quota') || message.includes('429') || message.includes('rate limit')) {
    return 'AI provider quota or rate limit reached; using deterministic local plan.';
  }
  if (message.includes('not configured') || message.includes('no ai providers configured')) {
    return 'AI provider is not configured for this server; using deterministic local plan.';
  }
  if (message.includes('invalid json') || message.includes('json object')) {
    return 'AI planner response was not usable JSON; using deterministic local plan.';
  }

  return 'AI planner enhancement unavailable; using deterministic local plan.';
}

function fallbackResponse(res, localPlan, error) {
  return res.status(200).json({
    success: true,
    mode: 'local-fallback',
    planner: localPlan,
    error: getFallbackMessage(error),
  });
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

  const {
    task,
    matchedRepoContext = {},
    suggestedFiles = [],
    blastImpact = {},
    packageScripts = [],
    risks = [],
    missingContext = [],
    localPlan,
  } = req.body || {};

  if (!safeString(task)) {
    return res.status(400).json({ error: 'Planner task is required' });
  }

  if (!localPlan || typeof localPlan !== 'object') {
    return res.status(400).json({ error: 'Local deterministic plan is required' });
  }

  const input = {
    task: safeString(task),
    matchedRepoContext,
    suggestedFiles,
    blastImpact,
    packageScripts,
    risks,
    missingContext,
    localPlan,
  };

  try {
    const rawPlanner = await generateStructuredJSON(buildPrompt(input), PLANNER_SCHEMA, {
      temperature: 0.35,
      maxTokens: 1600,
    });
    const planner = normalizePlannerResponse(rawPlanner, input);

    return res.status(200).json({
      success: true,
      mode: 'ai-enhanced',
      planner,
    });
  } catch (error) {
    console.error('AI planner enhancement failed:', error);
    return fallbackResponse(res, localPlan, error);
  }
}
