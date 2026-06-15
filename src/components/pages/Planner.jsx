import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileSearch,
  GitBranch,
  Lightbulb,
  Loader2,
  Network,
  Route,
  SearchCode,
} from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import Pill from '../ui/Pill';
import { buildPlannerContext } from '../../utils/repository/buildPlannerContext';
import { clearPdfState, savePdfState } from '../../services/pdf/pdfSessionBridge';

const EXAMPLE_PROMPTS = [
  'Add OAuth login',
  'Add rate limiting',
  'Fix database connection issue',
  'Migrate API service',
  'Improve security scanner',
];

const PLANNER_VIEWS = [
  { id: 'overview', label: 'Overview' },
  { id: 'context', label: 'Context' },
  { id: 'impact', label: 'Impact' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'validate', label: 'Validate' },
];

const CONFIDENCE_VARIANT = {
  high: 'success',
  medium: 'medium',
  low: 'low',
  critical: 'critical',
  none: 'info',
};

const INITIAL_AI_STATE = {
  status: 'idle',
  planner: null,
  error: '',
};

function getRepositoryFileCount(repoData) {
  if (Array.isArray(repoData?.fileTree)) return repoData.fileTree.length;
  if (Array.isArray(repoData?.fileStructure)) return repoData.fileStructure.length;
  return 0;
}

function formatConfidence(confidence) {
  if (!confidence || confidence === 'none') return 'No match yet';
  return `${confidence.charAt(0).toUpperCase()}${confidence.slice(1)} confidence`;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function scoreFromConfidence(confidence) {
  if (confidence === 'high') return 86;
  if (confidence === 'medium') return 58;
  if (confidence === 'low') return 32;
  return 20;
}

function getPlannerAIStatus(aiPlannerState) {
  if (aiPlannerState.status === 'loading') {
    return {
      label: 'Enhancing...',
      variant: 'info',
      detail: 'Enhancing the current local plan. Deterministic output stays visible while AI works.',
    };
  }
  if (aiPlannerState.status === 'enhanced') {
    return {
      label: 'AI enhanced',
      variant: 'success',
      detail: 'Using structured AI output constrained to matched repo context.',
    };
  }
  if (aiPlannerState.status === 'fallback') {
    return {
      label: 'Local fallback',
      variant: 'warning',
      detail: aiPlannerState.error || 'AI is unavailable right now; your local deterministic plan is still ready.',
    };
  }
  return {
    label: 'Deterministic context',
    variant: 'info',
    detail: 'Local repo matching is ready. AI enhancement is optional.',
  };
}

function compactBlastImpact(blastImpact) {
  return {
    available: Boolean(blastImpact?.available),
    reason: blastImpact?.reason || '',
    items: safeArray(blastImpact?.items).slice(0, 5).map(item => ({
      path: item.path,
      riskLevel: item.riskLevel,
      affectedFilesCount: item.affectedFilesCount,
      affectedModules: item.affectedModules,
      traversalDepth: item.traversalDepth,
      confidence: item.confidence,
      analysisMode: item.analysisMode,
      whyImpact: item.whyImpact,
      impactedFiles: safeArray(item.impactedFiles).slice(0, 8),
    })),
  };
}

function compactLocalPlan(plan) {
  return {
    mode: plan?.mode,
    taskTitle: plan?.taskTitle,
    intent: plan?.intent,
    confidence: plan?.confidence,
    score: plan?.score,
    affectedSystems: {
      modules: safeArray(plan?.affectedSystems?.modules).slice(0, 6),
      services: safeArray(plan?.affectedSystems?.services).slice(0, 6),
      entryPoints: safeArray(plan?.affectedSystems?.entryPoints).slice(0, 6),
      dependencies: safeArray(plan?.affectedSystems?.dependencies).slice(0, 6),
    },
    suggestedFiles: safeArray(plan?.suggestedFiles).slice(0, 8),
    roadmap: safeArray(plan?.roadmap).slice(0, 6),
    risks: safeArray(plan?.risks).slice(0, 6),
    validationChecklist: safeArray(plan?.validationChecklist).slice(0, 6),
    missingContext: safeArray(plan?.missingContext).slice(0, 6),
    blastImpact: compactBlastImpact(plan?.blastImpact),
  };
}

function buildPlannerAIPayload(plannerContext) {
  const plan = plannerContext.plan || {};

  return {
    task: plannerContext.taskText,
    matchedRepoContext: {
      matchedFiles: safeArray(plannerContext.matchedFiles).slice(0, 12).map(file => ({
        path: file.path,
        score: file.score,
        confidence: file.confidence,
        module: file.module,
        layer: file.layer,
        language: file.language,
        reasons: file.reasons,
      })),
      modules: safeArray(plannerContext.modules).slice(0, 8).map(module => ({
        name: module.name,
        score: module.score,
        confidence: module.confidence,
        fileCount: module.fileCount,
        layers: module.layers,
        matchedFiles: module.matchedFiles,
        reasons: module.reasons,
      })),
      services: safeArray(plannerContext.services).slice(0, 8).map(service => ({
        name: service.name,
        path: service.path,
        layer: service.layer,
        score: service.score,
        confidence: service.confidence,
        reasons: service.reasons,
      })),
      entryPoints: safeArray(plannerContext.entryPoints).slice(0, 6).map(entry => ({
        path: entry.path,
        score: entry.score,
        confidence: entry.confidence,
        reason: safeArray(entry.reasons)[0] || '',
      })),
      dependencySignals: safeArray(plannerContext.dependencySignals).slice(0, 8),
    },
    suggestedFiles: safeArray(plan.suggestedFiles).slice(0, 8),
    blastImpact: compactBlastImpact(plan.blastImpact),
    packageScripts: safeArray(plannerContext.packageScripts).slice(0, 8),
    risks: safeArray(plan.risks).slice(0, 8),
    missingContext: safeArray(plan.missingContext).slice(0, 8),
    localPlan: compactLocalPlan(plan),
  };
}

function listOrNone(items, formatter) {
  const values = safeArray(items).map(formatter).filter(Boolean);
  return values.length > 0 ? values.join('\n') : '- None available';
}

function markdownBullet(value, detail) {
  if (!value && !detail) return '';
  return detail ? `- ${value}\n  - ${detail}` : `- ${value}`;
}

function getPlanModeLabel(plannerContext, aiPlannerState) {
  if (plannerContext?.plan?.mode === 'ai-enhanced') return 'AI enhanced';
  if (aiPlannerState.status === 'fallback') return 'Local fallback';
  return 'Deterministic context';
}

function buildPlannerMarkdown(plannerContext, aiPlannerState) {
  const plan = plannerContext?.plan || {};
  const affectedSystems = plan.affectedSystems || {};
  const blastImpact = plan.blastImpact || {};
  const mode = getPlanModeLabel(plannerContext, aiPlannerState);

  const sections = [
    `# CodeAtlas Planner: ${plan.taskTitle || plannerContext?.taskText || 'Engineering Change Plan'}`,
    `Mode: ${mode}`,
    `Intent: ${plan.intent?.label || 'Unknown'}`,
    `Confidence: ${formatConfidence(plan.confidence)}`,
    `Risk Level: ${plan.riskLevel || 'not classified'}`,
    '',
    '## Suggested Files',
    listOrNone(plan.suggestedFiles, file => markdownBullet(
      `${file.path} - ${file.action || 'Review and update'}`,
      safeArray(file.why).slice(0, 2).join('; ')
    )),
    '',
    '## Affected Systems',
    '### Modules',
    listOrNone(affectedSystems.modules, module => markdownBullet(
      `${module.name} (${module.fileCount || 0} files, ${module.score || 0}%)`,
      module.reason || safeArray(module.reasons).join('; ')
    )),
    '',
    '### Services And Entry Points',
    listOrNone([
      ...safeArray(affectedSystems.services).map(service => ({
        label: service.path || service.name,
        detail: service.reason || safeArray(service.reasons).join('; '),
      })),
      ...safeArray(affectedSystems.entryPoints).map(entry => ({
        label: entry.path,
        detail: entry.reason || safeArray(entry.reasons).join('; '),
      })),
    ], item => markdownBullet(item.label, item.detail)),
    '',
    '## Blast Impact',
    blastImpact.available
      ? listOrNone(blastImpact.items, item => markdownBullet(
          `${item.path} - ${item.riskLevel || 'unknown'} risk, ${item.affectedFilesCount || 0} affected files, depth ${item.traversalDepth ?? 'n/a'}, ${formatConfidence(item.confidence)}`,
          item.whyImpact || item.impactSummary
        ))
      : `- ${blastImpact.reason || 'Dependency graph or repository files unavailable.'}`,
    '',
    '## Implementation Roadmap',
    listOrNone(plan.roadmap, (step, index) => {
      const files = safeArray(step.files).length > 0 ? ` Files: ${step.files.join(', ')}` : '';
      return `${index + 1}. ${step.title || `Step ${index + 1}`}\n   ${step.detail || ''}${files}`;
    }),
    '',
    '## Rollout Steps',
    listOrNone(plan.rolloutSteps, (step, index) => `${index + 1}. ${step.title || `Step ${index + 1}`}\n   ${step.detail || ''}`),
    '',
    '## Risks',
    listOrNone(plan.risks, risk => markdownBullet(`${risk.title || 'Risk'} (${risk.level || 'medium'})`, risk.detail)),
    '',
    '## Validation Checklist',
    listOrNone(plan.validationChecklist, item => markdownBullet(item.command || item.label || 'Validate change', item.detail)),
    '',
    '## Missing Context',
    listOrNone(plan.missingContext, item => `- ${item}`),
  ];

  return sections.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function adaptAIAffectedSystems(aiPlanner, localAffectedSystems, fallbackConfidence) {
  const aiSystems = aiPlanner.affectedSystems || {};
  const localModules = new Map(safeArray(localAffectedSystems.modules).map(module => [module.name, module]));
  const localServices = new Map(safeArray(localAffectedSystems.services).map(service => [service.path || service.name, service]));
  const localDependencies = new Map(safeArray(localAffectedSystems.dependencies).map(dep => [dep.name, dep]));
  const confidence = aiPlanner.confidence || fallbackConfidence || 'medium';
  const score = scoreFromConfidence(confidence);

  const modules = safeArray(aiSystems.modules).map(module => {
    const local = localModules.get(module.name) || {};
    return {
      name: module.name,
      score: local.score || score,
      confidence: local.confidence || confidence,
      fileCount: local.fileCount ?? safeArray(module.files).length,
      layers: local.layers || [],
      matchedFiles: safeArray(module.files).length > 0 ? module.files : (local.matchedFiles || []),
      reason: module.reason || local.reason || 'AI selected this system from local Planner context.',
    };
  }).filter(module => module.name);

  const services = safeArray(aiSystems.services).map(service => {
    const key = service.path || service.name;
    const local = localServices.get(key) || {};
    return {
      name: service.name || local.name || service.path,
      path: service.path || local.path || service.name,
      layer: local.layer || '',
      score: local.score || score,
      confidence: local.confidence || confidence,
      reason: service.reason || local.reason || 'AI selected this service from local Planner context.',
    };
  }).filter(service => service.path || service.name);

  const entryPoints = safeArray(aiPlanner.entryPoints).map(entry => ({
    path: entry.path,
    score,
    confidence,
    reason: entry.reason || 'AI selected this entry point from local Planner context.',
  })).filter(entry => entry.path);

  const dependencies = safeArray(aiSystems.dependencies).map(dep => {
    const local = localDependencies.get(dep.name) || {};
    return {
      name: dep.name,
      type: local.type || 'dependency',
      category: local.category || 'AI planner',
      score: local.score || score,
      confidence: local.confidence || confidence,
      reason: dep.reason || local.reason || 'AI selected this dependency signal.',
    };
  }).filter(dep => dep.name);

  return {
    modules: modules.length > 0 ? modules : safeArray(localAffectedSystems.modules),
    services: services.length > 0 ? services : safeArray(localAffectedSystems.services),
    entryPoints: entryPoints.length > 0 ? entryPoints : safeArray(localAffectedSystems.entryPoints),
    dependencies: dependencies.length > 0 ? dependencies : safeArray(localAffectedSystems.dependencies),
  };
}

function adaptAIPlannerContext(plannerContext, aiPlannerState) {
  if (aiPlannerState.status !== 'enhanced' || !aiPlannerState.planner) {
    return plannerContext;
  }

  const aiPlanner = aiPlannerState.planner;
  const localPlan = plannerContext.plan || {};
  const localSuggestedFiles = safeArray(localPlan.suggestedFiles);
  const localSuggestedByPath = new Map(localSuggestedFiles.map(file => [file.path, file]));
  const confidence = aiPlanner.confidence || localPlan.confidence || 'medium';

  const suggestedFiles = safeArray(aiPlanner.suggestedFileChanges).map(change => {
    const local = localSuggestedByPath.get(change.path) || {};
    return {
      path: change.path,
      action: change.change || local.action || 'Review and update this matched file',
      confidence: change.confidence || local.confidence || confidence,
      score: Math.max(local.score || 0, scoreFromConfidence(change.confidence || confidence)),
      layer: local.layer || '',
      language: local.language || '',
      why: unique([
        change.reason,
        ...safeArray(local.why),
      ]).slice(0, 4),
    };
  }).filter(file => file.path);

  const roadmap = safeArray(aiPlanner.implementationRoadmap).map((step, index) => ({
    id: `ai-step-${index + 1}`,
    title: step.title || `Step ${index + 1}`,
    detail: step.detail || '',
    files: safeArray(step.files),
  })).filter(step => step.title || step.detail);

  const validationChecklist = safeArray(aiPlanner.validationChecklist).map((item, index) => ({
    type: item.command ? 'script' : `ai-validation-${index + 1}`,
    command: item.command || '',
    label: item.label || item.command || 'Validate change',
    detail: item.detail || '',
    source: item.source || 'AI planner',
  })).filter(item => item.label || item.command || item.detail);

  const risks = safeArray(aiPlanner.risks).map(risk => ({
    level: risk.level || 'medium',
    title: risk.title || 'Implementation risk',
    detail: risk.detail || '',
  })).filter(risk => risk.title || risk.detail);

  const displayPlan = {
    ...localPlan,
    mode: 'ai-enhanced',
    taskTitle: aiPlanner.taskTitle || localPlan.taskTitle,
    intent: {
      ...(localPlan.intent || {}),
      label: aiPlanner.intent || localPlan.intent?.label || 'Engineering change',
      rationale: 'AI-enhanced from the existing local Planner context and matched repository evidence.',
    },
    confidence,
    score: Math.max(localPlan.score || 0, scoreFromConfidence(confidence)),
    riskLevel: aiPlanner.riskLevel || 'medium',
    affectedSystems: adaptAIAffectedSystems(aiPlanner, localPlan.affectedSystems || {}, confidence),
    suggestedFiles: suggestedFiles.length > 0 ? suggestedFiles : localSuggestedFiles,
    roadmap: roadmap.length > 0 ? roadmap : safeArray(localPlan.roadmap),
    risks: risks.length > 0 ? risks : safeArray(localPlan.risks),
    validationChecklist: validationChecklist.length > 0 ? validationChecklist : safeArray(localPlan.validationChecklist),
    rolloutSteps: safeArray(aiPlanner.rolloutSteps),
    missingContext: safeArray(aiPlanner.missingContext).length > 0
      ? aiPlanner.missingContext
      : safeArray(localPlan.missingContext),
  };

  return {
    ...plannerContext,
    confidence,
    score: displayPlan.score,
    plan: displayPlan,
  };
}

function MatchEmptyState({ hasTask, message }) {
  return (
    <div className="ca-planner-match-empty">
      <SearchCode size={18} />
      <span>{hasTask ? message : 'Enter a task to match real repository context.'}</span>
    </div>
  );
}

function ConfidenceMeter({ score }) {
  return (
    <div className="ca-planner-confidence-meter" aria-label={`Confidence score ${score}`}>
      <span style={{ width: `${Math.max(4, Math.min(100, score))}%` }} />
    </div>
  );
}

function PlanEmptyState({ hasTask, message, idleMessage = 'Enter a task to generate a local deterministic plan.' }) {
  return (
    <div className="ca-planner-placeholder-surface">
      <SearchCode size={18} />
      <span>{hasTask ? message : idleMessage}</span>
    </div>
  );
}

function PlannerSectionCard({ title, icon: Icon, subtitle, children, className = '' }) {
  return (
    <Card className={`ca-planner-placeholder-card ${className}`}>
      <div className="ca-planner-placeholder-header">
        <span className="ca-planner-placeholder-icon">
          <Icon size={18} />
        </span>
        <div>
          <h3>{title}</h3>
          {subtitle && <small>{subtitle}</small>}
        </div>
      </div>
      {children}
    </Card>
  );
}

function SuggestedFilesCard({ plannerContext }) {
  const { hasTask, plan } = plannerContext;
  const suggestedFiles = plan?.suggestedFiles || [];

  return (
    <PlannerSectionCard
      title="Suggested Files"
      icon={FileSearch}
      subtitle={hasTask ? `${suggestedFiles.length} files selected from real repo context` : 'Waiting for task input'}
      className="ca-planner-context-card"
    >
      {suggestedFiles.length === 0 ? (
        <MatchEmptyState
          hasTask={hasTask}
          message="No strong file matches yet. Add a module, file, API, service, or technology keyword to improve deterministic context."
        />
      ) : (
        <div className="ca-planner-match-list">
          {suggestedFiles.map(file => (
            <div className="ca-planner-file-match" key={file.path}>
              <div className="ca-planner-match-main">
                <span className="ca-planner-file-path" title={file.path}>{file.path}</span>
                <Badge variant={CONFIDENCE_VARIANT[file.confidence] || 'info'}>
                  {file.score}%
                </Badge>
              </div>
              <div className="ca-planner-suggested-action">{file.action}</div>
              <ConfidenceMeter score={file.score} />
              <div className="ca-planner-match-meta">
                {file.layer && <Pill>{file.layer}</Pill>}
                {file.language && <Pill>{file.language}</Pill>}
              </div>
              {file.why.length > 0 && (
                <details className="ca-planner-reason-details">
                  <summary>{file.why.length} match reason{file.why.length === 1 ? '' : 's'}</summary>
                  <ul className="ca-planner-reason-list">
                    {file.why.map(reason => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </PlannerSectionCard>
  );
}

function AffectedSystemsCard({ plannerContext }) {
  const { hasTask, plan } = plannerContext;
  const affectedSystems = plan?.affectedSystems || {};
  const modules = affectedSystems.modules || [];
  const services = affectedSystems.services || [];
  const entryPoints = affectedSystems.entryPoints || [];
  const dependencySignals = affectedSystems.dependencies || [];
  const hasContext = modules.length > 0 || services.length > 0 || entryPoints.length > 0 || dependencySignals.length > 0;

  return (
    <PlannerSectionCard
      title="Affected Systems"
      icon={Network}
      subtitle={hasTask ? 'Modules, services, entry points, and dependency signals' : 'Waiting for task input'}
      className="ca-planner-context-card"
    >
      {!hasContext ? (
        <MatchEmptyState
          hasTask={hasTask}
          message="No affected systems matched yet. Add a module, file, API, service, or technology keyword to improve deterministic context."
        />
      ) : (
        <div className="ca-planner-system-groups">
          {modules.length > 0 && (
            <div className="ca-planner-system-group">
              <h4>Modules</h4>
              <div className="ca-planner-chip-grid">
                {modules.map(module => (
                  <div className="ca-planner-module-chip" key={module.name}>
                    <div>
                      <strong>{module.name}</strong>
                      <span>{module.fileCount} files · {module.score}%</span>
                    </div>
                    {(module.layers || []).length > 0 && (
                      <div className="ca-planner-mini-pill-row">
                        {module.layers.map(layer => <Pill key={layer}>{layer}</Pill>)}
                      </div>
                    )}
                    <p>{module.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {services.length > 0 && (
            <div className="ca-planner-system-group">
              <h4>Service-like Files</h4>
              <div className="ca-planner-compact-list">
                {services.map(service => (
                  <div className="ca-planner-compact-row" key={service.path}>
                    <span title={service.path}>{service.path}</span>
                    <Badge variant={CONFIDENCE_VARIANT[service.confidence] || 'info'}>
                      {service.score}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {entryPoints.length > 0 && (
            <div className="ca-planner-system-group">
              <h4>Likely Entry Points</h4>
              <div className="ca-planner-compact-list">
                {entryPoints.map(entry => (
                  <div className="ca-planner-compact-row" key={entry.path}>
                    <span title={entry.path}>{entry.path}</span>
                    <Badge variant={CONFIDENCE_VARIANT[entry.confidence] || 'info'}>
                      {entry.score}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dependencySignals.length > 0 && (
            <div className="ca-planner-system-group">
              <h4>Dependency Signals</h4>
              <div className="ca-planner-dependency-grid">
                {dependencySignals.map(dep => (
                  <Pill key={`${dep.type}-${dep.name}`}>{dep.name}</Pill>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PlannerSectionCard>
  );
}

function formatMode(mode) {
  if (mode === 'dependency-graph') return 'graph';
  if (!mode) return 'unknown';
  return mode.replace(/-/g, ' ');
}

function BlastImpactCard({ plannerContext, onNavigate }) {
  const { hasTask, plan } = plannerContext;
  const blastImpact = plan?.blastImpact || {};
  const items = blastImpact.items || [];

  return (
    <PlannerSectionCard
      title="Blast Impact"
      icon={GitBranch}
      subtitle="Impact evidence from existing dependency graph and blast-radius utility"
      className="ca-planner-wide-card ca-planner-impact-card"
    >
      {!hasTask ? (
        <PlanEmptyState
          hasTask={hasTask}
          idleMessage="Enter a task to calculate impact."
        />
      ) : !blastImpact.available ? (
        <PlanEmptyState
          hasTask={hasTask}
          message={blastImpact.reason || 'Dependency graph or repository files unavailable.'}
        />
      ) : items.length === 0 ? (
        <PlanEmptyState
          hasTask={hasTask}
          message="No top matched files were available for blast-impact calculation."
        />
      ) : (
        <div className="ca-planner-impact-list">
          {items.map(item => (
            <div className="ca-planner-impact-row" key={item.path}>
              <div className="ca-planner-impact-row-top">
                <span className="ca-planner-file-path" title={item.path}>{item.path}</span>
                <Badge variant={CONFIDENCE_VARIANT[item.riskLevel] || 'info'}>
                  {item.riskLevel}
                </Badge>
              </div>
              <div className="ca-planner-impact-stats">
                <Pill>{item.affectedFilesCount} affected files</Pill>
                <Pill>{item.affectedModules.length} modules</Pill>
                <Pill>d{item.traversalDepth}</Pill>
                <Pill>{formatConfidence(item.confidence)}</Pill>
                <Pill>{formatMode(item.analysisMode)}</Pill>
                {item.isLimited && <Pill>capped</Pill>}
              </div>
              <p className="ca-planner-impact-why">{item.whyImpact}</p>
              {item.impactSummary && (
                <p className="ca-planner-impact-summary">{item.impactSummary}</p>
              )}
              {item.affectedModules.length > 0 && (
                <div className="ca-planner-impact-modules">
                  {item.affectedModules.map(module => <Pill key={module}>{module}</Pill>)}
                </div>
              )}
              {item.impactedFiles.length > 0 && (
                <div className="ca-planner-impact-files">
                  {item.impactedFiles.map(file => (
                    <code key={file} title={file}>{file}</code>
                  ))}
                  {item.impactedFilesOverflow > 0 && (
                    <span>+{item.impactedFilesOverflow} more</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="ca-planner-impact-actions">
        <button type="button" onClick={() => onNavigate?.('blast-radius')}>
          Open Blast Radius
        </button>
        <button type="button" onClick={() => onNavigate?.('repository-graph')}>
          Open Repository Graph
        </button>
      </div>
    </PlannerSectionCard>
  );
}

function RoadmapCard({ plannerContext }) {
  const { hasTask, plan } = plannerContext;
  const roadmap = plan?.roadmap || [];
  const rolloutSteps = plan?.rolloutSteps || [];

  return (
    <PlannerSectionCard
      title="Implementation Roadmap"
      icon={Route}
      subtitle="Deterministic steps from matched files and repo metadata"
      className="ca-planner-wide-card"
    >
      {roadmap.length === 0 ? (
        <PlanEmptyState
          hasTask={hasTask}
          message="No roadmap was generated because the matcher did not find enough repository context."
        />
      ) : (
        <div className="ca-planner-roadmap-list">
          {roadmap.map((step, index) => (
            <div className="ca-planner-roadmap-step" key={step.id}>
              <span className="ca-planner-step-index">{index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
                {step.files.length > 0 && (
                  <div className="ca-planner-step-files">
                    {step.files.map(file => <Pill key={file}>{file}</Pill>)}
                  </div>
                )}
              </div>
            </div>
          ))}
          {rolloutSteps.length > 0 && (
            <div className="ca-planner-rollout-block">
              <h4>Rollout Steps</h4>
              {rolloutSteps.map((step, index) => (
                <div className="ca-planner-roadmap-step" key={`${step.title}-${index}`}>
                  <span className="ca-planner-step-index">{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PlannerSectionCard>
  );
}

function RisksCard({ plannerContext }) {
  const { hasTask, plan } = plannerContext;
  const risks = plan?.risks || [];

  return (
    <PlannerSectionCard
      title="Risks"
      icon={AlertTriangle}
      subtitle="Local risk signals from confidence, layers, and coverage"
    >
      {risks.length === 0 ? (
        <PlanEmptyState
          hasTask={hasTask}
          message="No risk summary was generated because there were no matched files."
        />
      ) : (
        <div className="ca-planner-warning-list">
          {risks.map(risk => (
            <div className={`ca-planner-warning-row ca-planner-risk-${risk.level}`} key={`${risk.level}-${risk.title}`}>
              <AlertTriangle size={15} />
              <div>
                <strong>{risk.title}</strong>
                <span>{risk.detail}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PlannerSectionCard>
  );
}

function ValidationCard({ plannerContext }) {
  const { hasTask, plan } = plannerContext;
  const checklist = plan?.validationChecklist || [];

  return (
    <PlannerSectionCard
      title="Validation Checklist"
      icon={CheckCircle2}
      subtitle="Uses real package.json scripts when available"
    >
      {checklist.length === 0 ? (
        <PlanEmptyState
          hasTask={hasTask}
          message="No validation checklist was generated because no task context was matched."
        />
      ) : (
        <div className="ca-planner-checklist">
          {checklist.map(item => (
            <div className="ca-planner-check-row" key={`${item.type}-${item.label}`}>
              <CheckCircle2 size={15} />
              <div>
                <strong>{item.command || item.label}</strong>
                {item.command && <span>{item.label}</span>}
                <p>{item.detail}</p>
                <small>{item.source}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </PlannerSectionCard>
  );
}

function MissingContextCard({ plannerContext }) {
  const { hasTask, plan } = plannerContext;
  const missingContext = plan?.missingContext || [];

  return (
    <PlannerSectionCard
      title="Missing Context"
      icon={SearchCode}
      subtitle="What still needs developer confirmation"
      className="ca-planner-wide-card"
    >
      {!hasTask ? (
        <PlanEmptyState hasTask={hasTask} />
      ) : missingContext.length === 0 ? (
        <div className="ca-planner-warning-row ca-planner-risk-low">
          <CheckCircle2 size={15} />
          <span>Planner has task text, repository files, analysis metadata, and validation signals for this local plan.</span>
        </div>
      ) : (
        <div className="ca-planner-warning-list">
          {missingContext.map(item => (
            <div className="ca-planner-warning-row" key={item}>
              <SearchCode size={15} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </PlannerSectionCard>
  );
}

function PlannerActionSummary({ plannerContext, aiStatus, planModeLabel }) {
  const { hasTask, plan } = plannerContext;
  const suggestedCount = safeArray(plan?.suggestedFiles).length;
  const blastImpact = plan?.blastImpact || {};
  const impactLabel = blastImpact.available
    ? `${safeArray(blastImpact.items).length} impact checks`
    : 'Impact unavailable';

  const summaryItems = hasTask ? [
    { label: 'Mode', value: planModeLabel },
    { label: 'Confidence', value: formatConfidence(plan?.confidence) },
    { label: 'Risk', value: plan?.riskLevel ? `${plan.riskLevel} risk` : 'Not classified' },
    { label: 'Files', value: `${suggestedCount} suggested` },
    { label: 'Impact', value: impactLabel },
  ] : [
    { label: 'Status', value: aiStatus.label },
    { label: 'Next step', value: 'Enter a task' },
  ];

  return (
    <div className="ca-planner-action-summary" aria-label="Planner action summary">
      {summaryItems.map(item => (
        <div className="ca-planner-action-summary-item" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function PlannerMiniFileList({ files, emptyText = 'No files matched yet.' }) {
  if (files.length === 0) {
    return <p className="ca-planner-mini-empty">{emptyText}</p>;
  }

  return (
    <div className="ca-planner-mini-list">
      {files.map(file => (
        <div className="ca-planner-mini-row" key={file.path}>
          <span title={file.path}>{file.path}</span>
          <Badge variant={CONFIDENCE_VARIANT[file.confidence] || 'info'}>
            {file.score || 0}%
          </Badge>
        </div>
      ))}
    </div>
  );
}

function PlannerOverviewPanel({ plannerContext, onSelectView }) {
  const { hasTask, plan } = plannerContext;

  if (!hasTask) {
    return (
      <PlannerSectionCard
        title="Overview"
        icon={Lightbulb}
        subtitle="Your first-screen execution summary will appear here"
        className="ca-planner-wide-card"
      >
        <PlanEmptyState hasTask={hasTask} />
      </PlannerSectionCard>
    );
  }

  const affectedSystems = plan?.affectedSystems || {};
  const topModules = safeArray(affectedSystems.modules).slice(0, 3);
  const topServices = safeArray(affectedSystems.services).slice(0, 3);
  const topEntryPoints = safeArray(affectedSystems.entryPoints).slice(0, 2);
  const roadmap = safeArray(plan?.roadmap).slice(0, 3);
  const checklist = safeArray(plan?.validationChecklist);
  const blastItems = safeArray(plan?.blastImpact?.items);
  const affectedPreviewItems = unique([
    ...topModules.map(module => module.name),
    ...topServices.map(service => service.path || service.name),
    ...topEntryPoints.map(entry => entry.path),
  ]).slice(0, 7);
  const riskRank = { critical: 4, high: 3, medium: 2, low: 1 };
  const highestImpact = blastItems
    .slice()
    .sort((a, b) => (riskRank[b.riskLevel] || 0) - (riskRank[a.riskLevel] || 0) || (b.affectedFilesCount || 0) - (a.affectedFilesCount || 0))[0];

  return (
    <div className="ca-planner-overview-grid">
      <Card className="ca-planner-overview-primary">
        <div className="ca-planner-overview-heading">
          <div>
            <span>Plan Summary</span>
            <h3>{plan?.taskTitle || 'Engineering change'}</h3>
          </div>
          <Badge variant={CONFIDENCE_VARIANT[plan?.confidence] || 'info'}>
            {formatConfidence(plan?.confidence)}
          </Badge>
        </div>
        <p>{plan?.intent?.rationale || 'Planner will summarize the selected task once repository context is matched.'}</p>
        <div className="ca-planner-overview-metrics">
          <Pill>{plan?.intent?.label || 'Unknown intent'}</Pill>
          {plan?.riskLevel && <Pill>{plan.riskLevel} risk</Pill>}
          <Pill>{safeArray(plan?.suggestedFiles).length} files</Pill>
        </div>
      </Card>

      <Card className="ca-planner-overview-card">
        <div className="ca-planner-overview-card-header">
          <h3>Priority Files</h3>
          <button type="button" onClick={() => onSelectView('context')}>View all</button>
        </div>
        <PlannerMiniFileList files={safeArray(plan?.suggestedFiles).slice(0, 3)} />
      </Card>

      <Card className="ca-planner-overview-card">
        <div className="ca-planner-overview-card-header">
          <h3>Affected Systems</h3>
          <button type="button" onClick={() => onSelectView('context')}>Open context</button>
        </div>
        <div className="ca-planner-overview-chip-list">
          {affectedPreviewItems.map(item => <Pill key={item}>{item}</Pill>)}
          {affectedPreviewItems.length === 0 && (
            <p className="ca-planner-mini-empty">No affected systems matched yet.</p>
          )}
        </div>
      </Card>

      <Card className="ca-planner-overview-card">
        <div className="ca-planner-overview-card-header">
          <h3>Highest Impact</h3>
          <button type="button" onClick={() => onSelectView('impact')}>Open impact</button>
        </div>
        {highestImpact ? (
          <div className="ca-planner-overview-impact">
            <span title={highestImpact.path}>{highestImpact.path}</span>
            <div>
              <Badge variant={CONFIDENCE_VARIANT[highestImpact.riskLevel] || 'info'}>
                {highestImpact.riskLevel}
              </Badge>
              <Pill>{highestImpact.affectedFilesCount} files</Pill>
              <Pill>d{highestImpact.traversalDepth}</Pill>
            </div>
            <p>{highestImpact.whyImpact || highestImpact.impactSummary}</p>
          </div>
        ) : (
          <p className="ca-planner-mini-empty">{plan?.blastImpact?.reason || 'Impact evidence is unavailable for this task.'}</p>
        )}
      </Card>

      <Card className="ca-planner-overview-card ca-planner-overview-card-wide">
        <div className="ca-planner-overview-card-header">
          <h3>Next Steps</h3>
          <button type="button" onClick={() => onSelectView('roadmap')}>Full roadmap</button>
        </div>
        {roadmap.length === 0 ? (
          <p className="ca-planner-mini-empty">No roadmap generated yet.</p>
        ) : (
          <div className="ca-planner-overview-steps">
            {roadmap.map((step, index) => (
              <div className="ca-planner-overview-step" key={step.id || `${step.title}-${index}`}>
                <span>{index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="ca-planner-overview-card">
        <div className="ca-planner-overview-card-header">
          <h3>Validation Preview</h3>
          <button type="button" onClick={() => onSelectView('validate')}>Validate</button>
        </div>
        {checklist.length === 0 ? (
          <p className="ca-planner-mini-empty">No validation command found yet.</p>
        ) : (
          <div className="ca-planner-validation-preview">
            <strong>{checklist[0].command || checklist[0].label}</strong>
            <p>{checklist[0].detail}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function PlannerWorkbench({ activeView, onSelectView, plannerContext, displayPlannerContext, onNavigate }) {
  const tabLabel = PLANNER_VIEWS.find(view => view.id === activeView)?.label || 'Overview';

  return (
    <Card className="ca-planner-workbench">
      <div className="ca-planner-workbench-header">
        <div>
          <span>Planner Workspace</span>
          <strong>{tabLabel}</strong>
        </div>
        <div className="ca-planner-tabs" role="tablist" aria-label="Planner views">
          {PLANNER_VIEWS.map(view => (
            <button
              key={view.id}
              type="button"
              className={activeView === view.id ? 'active' : ''}
              onClick={() => onSelectView(view.id)}
              role="tab"
              aria-selected={activeView === view.id}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ca-planner-workbench-body">
        {activeView === 'overview' && (
          <PlannerOverviewPanel plannerContext={displayPlannerContext} onSelectView={onSelectView} />
        )}
        {activeView === 'context' && (
          <div className="ca-planner-output-grid ca-planner-output-grid-compact" aria-label="Planner context">
            <SuggestedFilesCard plannerContext={displayPlannerContext} />
            <AffectedSystemsCard plannerContext={displayPlannerContext} />
          </div>
        )}
        {activeView === 'impact' && (
          <div className="ca-planner-output-grid ca-planner-output-grid-compact" aria-label="Planner impact">
            <BlastImpactCard plannerContext={plannerContext} onNavigate={onNavigate} />
          </div>
        )}
        {activeView === 'roadmap' && (
          <div className="ca-planner-output-grid ca-planner-output-grid-compact" aria-label="Planner roadmap">
            <RoadmapCard plannerContext={displayPlannerContext} />
            <RisksCard plannerContext={displayPlannerContext} />
          </div>
        )}
        {activeView === 'validate' && (
          <div className="ca-planner-output-grid ca-planner-output-grid-compact" aria-label="Planner validation">
            <ValidationCard plannerContext={displayPlannerContext} />
            <MissingContextCard plannerContext={displayPlannerContext} />
          </div>
        )}
      </div>
    </Card>
  );
}

function Planner({ repoData, codeAnalysis, firstContributions = [], onNavigate }) {
  const [taskText, setTaskText] = useState('');
  const [aiPlannerState, setAIPlannerState] = useState(INITIAL_AI_STATE);
  const [planActionFeedback, setPlanActionFeedback] = useState('');
  const [activePlannerView, setActivePlannerView] = useState('overview');
  const hasRepository = Boolean(repoData?.repoInfo || getRepositoryFileCount(repoData) > 0);

  const contextStats = useMemo(() => {
    const fileCount = getRepositoryFileCount(repoData);
    const graphNodes = repoData?.dependencyGraph?.nodes?.length || 0;
    const analyzedFiles = codeAnalysis?.summary?.analyzedFiles || codeAnalysis?.files?.length || 0;
    const contributionCount = Array.isArray(firstContributions) ? firstContributions.length : 0;

    return [
      { label: 'Repo files', value: fileCount },
      { label: 'Graph nodes', value: graphNodes },
      { label: 'Analyzed files', value: analyzedFiles },
      { label: 'Starter ideas', value: contributionCount },
    ].filter(item => item.value > 0);
  }, [repoData, codeAnalysis, firstContributions]);

  const plannerContext = useMemo(() => (
    buildPlannerContext({ taskText, repoData, codeAnalysis })
  ), [taskText, repoData, codeAnalysis]);

  useEffect(() => {
    setAIPlannerState(INITIAL_AI_STATE);
    setPlanActionFeedback('');
    setActivePlannerView('overview');
  }, [taskText, repoData, codeAnalysis]);

  const displayPlannerContext = useMemo(() => (
    adaptAIPlannerContext(plannerContext, aiPlannerState)
  ), [plannerContext, aiPlannerState]);

  const aiStatus = getPlannerAIStatus(aiPlannerState);
  const hasGeneratedPlan = Boolean(
    displayPlannerContext.hasTask &&
    displayPlannerContext.plan?.isGenerated &&
    safeArray(displayPlannerContext.plan?.suggestedFiles).length > 0
  );
  const canEnhanceWithAI = Boolean(plannerContext.hasTask && plannerContext.plan?.isGenerated);
  const planModeLabel = getPlanModeLabel(displayPlannerContext, aiPlannerState);

  useEffect(() => {
    if (!repoData) return;

    if (!hasGeneratedPlan) {
      clearPdfState('planner', repoData);
      return;
    }

    savePdfState('planner', repoData, {
      status: 'generated',
      taskText,
      mode: planModeLabel,
      plan: displayPlannerContext.plan,
      aiStatus: aiPlannerState.status,
      aiError: aiPlannerState.error || ''
    });
  }, [repoData, hasGeneratedPlan, taskText, planModeLabel, displayPlannerContext, aiPlannerState]);

  const handleEnhanceWithAI = useCallback(async () => {
    if (!canEnhanceWithAI || aiPlannerState.status === 'loading') return;

    setAIPlannerState({
      status: 'loading',
      planner: null,
      error: '',
    });

    try {
      const response = await fetch('/api/ai/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPlannerAIPayload(plannerContext)),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'AI planner enhancement failed');
      }

      if (result.mode === 'ai-enhanced' && result.planner) {
        setAIPlannerState({
          status: 'enhanced',
          planner: result.planner,
          error: '',
        });
        return;
      }

      setAIPlannerState({
        status: 'fallback',
        planner: null,
        error: result.error || 'AI enhancement unavailable; using deterministic local plan.',
      });
    } catch (error) {
      console.error('Planner AI enhancement failed:', error);
      setAIPlannerState({
        status: 'fallback',
        planner: null,
        error: error.message || 'AI enhancement unavailable; using deterministic local plan.',
      });
    }
  }, [plannerContext, aiPlannerState.status, canEnhanceWithAI]);

  const handleCopyPlan = useCallback(async () => {
    if (!hasGeneratedPlan) {
      setPlanActionFeedback('Enter a task with enough repo context to generate a plan first.');
      return;
    }

    const markdown = buildPlannerMarkdown(displayPlannerContext, aiPlannerState);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(markdown);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = markdown;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setPlanActionFeedback('Plan copied as Markdown.');
    } catch (error) {
      console.error('Planner copy failed:', error);
      setPlanActionFeedback('Copy failed. Export Markdown is still available.');
    }
  }, [displayPlannerContext, aiPlannerState, hasGeneratedPlan]);

  const handleExportPlan = useCallback(() => {
    if (!hasGeneratedPlan) {
      setPlanActionFeedback('Enter a task with enough repo context to export a plan first.');
      return;
    }

    try {
      const markdown = buildPlannerMarkdown(displayPlannerContext, aiPlannerState);
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'codeatlas-planner-plan.md';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setPlanActionFeedback('Markdown export started.');
    } catch (error) {
      console.error('Planner export failed:', error);
      setPlanActionFeedback('Export failed. Try Copy Plan instead.');
    }
  }, [displayPlannerContext, aiPlannerState, hasGeneratedPlan]);

  if (!hasRepository) {
    return (
      <div className="ca-planner">
        <Card className="ca-planner-empty-card">
          <EmptyState
            icon={Lightbulb}
            title="Analyze a repository to start planning"
            description="Planner needs repository analysis first so it can match real files, modules, dependency impact, and validation context before drafting a change plan."
            action={
              <button
                className="ca-planner-secondary-action"
                type="button"
                onClick={() => onNavigate?.('dashboard')}
              >
                Go to Dashboard
              </button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="ca-planner">
      <Card className="ca-planner-hero">
        <div className="ca-planner-hero-top">
          <div>
            <div className="ca-planner-kicker">
              <Lightbulb size={16} />
              Planner P6
            </div>
            <h2 className="ca-planner-title">AI Engineering Change Planner</h2>
            <p className="ca-planner-subtitle">
              Turn a feature request, bug, migration, or refactor goal into a repo-aware execution plan.
            </p>
          </div>
          <Badge variant={CONFIDENCE_VARIANT[displayPlannerContext.confidence] || 'info'}>
            {formatConfidence(displayPlannerContext.confidence)}
          </Badge>
        </div>

        {contextStats.length > 0 && (
          <div className="ca-planner-context-row" aria-label="Available repository context">
            {contextStats.map(item => (
              <div className="ca-planner-context-stat" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="ca-planner-input-card">
        <label className="ca-planner-input-label" htmlFor="planner-task-input">
          What do you want to change?
        </label>
        <textarea
          id="planner-task-input"
          className="ca-planner-task-input"
          value={taskText}
          onChange={(event) => setTaskText(event.target.value)}
          placeholder="Paste a ticket, bug report, migration goal, or feature request..."
          rows={4}
        />
        <div className="ca-planner-example-row" aria-label="Example planner prompts">
          {EXAMPLE_PROMPTS.map(prompt => (
            <button
              className="ca-planner-example"
              key={prompt}
              type="button"
              onClick={() => setTaskText(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
        <PlannerActionSummary
          plannerContext={displayPlannerContext}
          aiStatus={aiStatus}
          planModeLabel={planModeLabel}
        />
        <div className="ca-planner-ai-controls">
          <div className={`ca-planner-status-panel ca-planner-status-${aiPlannerState.status}`}>
            <div className="ca-planner-status-main">
              <Badge variant={aiStatus.variant}>{aiStatus.label}</Badge>
              {aiPlannerState.status === 'loading' && <Loader2 size={15} className="ca-planner-loading-icon" />}
              <span>{aiStatus.detail}</span>
            </div>
            <div className="ca-planner-status-badges">
              <Pill>Deterministic context</Pill>
              {aiPlannerState.status === 'enhanced' && <Pill>AI enhanced</Pill>}
              {aiPlannerState.status === 'fallback' && <Pill>Local fallback</Pill>}
              {!hasGeneratedPlan && plannerContext.hasTask && <Pill>Context limited</Pill>}
            </div>
          </div>
          <div className="ca-planner-control-actions">
            <button
              className="ca-planner-ai-action"
              type="button"
              disabled={!canEnhanceWithAI || aiPlannerState.status === 'loading'}
              onClick={handleEnhanceWithAI}
              title={canEnhanceWithAI ? 'Enhance this local deterministic plan with AI' : 'Enter a task that matches repo context before AI enhancement'}
            >
              {aiPlannerState.status === 'loading' ? 'Enhancing...' : 'Enhance with AI'}
            </button>
            <button
              className="ca-planner-action-button"
              type="button"
              disabled={!hasGeneratedPlan}
              onClick={handleCopyPlan}
              title={hasGeneratedPlan ? 'Copy the current plan as Markdown' : 'Enter a task to generate a plan first'}
            >
              <Copy size={15} />
              Copy Plan
            </button>
            <button
              className="ca-planner-action-button"
              type="button"
              disabled={!hasGeneratedPlan}
              onClick={handleExportPlan}
              title={hasGeneratedPlan ? 'Download the current plan as Markdown' : 'Enter a task to generate a plan first'}
            >
              <Download size={15} />
              Export Markdown
            </button>
          </div>
        </div>
        <div className="ca-planner-quick-actions" aria-label="Planner navigation shortcuts">
          <span>Open related views</span>
          <button type="button" onClick={() => onNavigate?.('repository-graph')}>
            <ExternalLink size={14} />
            Repository Graph
          </button>
          <button type="button" onClick={() => onNavigate?.('blast-radius')}>
            <ExternalLink size={14} />
            Blast Radius
          </button>
          <button type="button" onClick={() => onNavigate?.('architecture-v2')}>
            <ExternalLink size={14} />
            Architecture V2
          </button>
        </div>
        {planActionFeedback && (
          <div className="ca-planner-action-feedback" role="status">
            {planActionFeedback}
          </div>
        )}
        {!displayPlannerContext.hasTask && (
          <div className="ca-planner-action-hint">
            Enter a task to generate a deterministic local plan before copying, exporting, or enhancing with AI.
          </div>
        )}
        {displayPlannerContext.hasTask && !hasGeneratedPlan && (
          <div className="ca-planner-action-hint">
            Deterministic context is limited. Add a module, file, API, service, or technology keyword to improve matching.
          </div>
        )}
        <div className="ca-planner-input-footer">
          <Pill>AI optional in P6</Pill>
          <Pill>Groq/Gemini only</Pill>
          <Pill>{planModeLabel}</Pill>
          <Pill>Blast impact enabled</Pill>
        </div>
      </Card>

      <PlannerWorkbench
        activeView={activePlannerView}
        onSelectView={setActivePlannerView}
        plannerContext={plannerContext}
        displayPlannerContext={displayPlannerContext}
        onNavigate={onNavigate}
      />
    </div>
  );
}

export default Planner;
