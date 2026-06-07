import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  GitBranch,
  Lightbulb,
  Network,
  Route,
  SearchCode,
} from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import Pill from '../ui/Pill';
import { buildPlannerContext } from '../../utils/repository/buildPlannerContext';

const EXAMPLE_PROMPTS = [
  'Add OAuth login',
  'Add rate limiting',
  'Fix database connection issue',
  'Migrate API service',
  'Improve security scanner',
];

const CONFIDENCE_VARIANT = {
  high: 'success',
  medium: 'medium',
  low: 'low',
  critical: 'critical',
  none: 'info',
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

function PlanSummaryCard({ plannerContext }) {
  const { hasTask, plan } = plannerContext;

  return (
    <PlannerSectionCard
      title="Plan Summary"
      icon={Lightbulb}
      subtitle="Local deterministic planning, not AI-generated"
      className="ca-planner-summary-card"
    >
      {!hasTask ? (
        <PlanEmptyState hasTask={hasTask} />
      ) : (
        <>
          <div className="ca-planner-plan-mode">
            <span>Local deterministic plan</span>
            <Pill>No AI call</Pill>
            <Pill>No backend planner API</Pill>
          </div>
          <div className="ca-planner-summary-grid">
            <div className="ca-planner-summary-item">
              <span>Task title</span>
              <strong>{plan.taskTitle}</strong>
            </div>
            <div className="ca-planner-summary-item">
              <span>Likely intent</span>
              <strong>{plan.intent.label}</strong>
            </div>
            <div className="ca-planner-summary-item">
              <span>Confidence</span>
              <strong>{formatConfidence(plan.confidence)}</strong>
              <ConfidenceMeter score={plan.score} />
            </div>
          </div>
          <p className="ca-planner-summary-rationale">{plan.intent.rationale}</p>
        </>
      )}
    </PlannerSectionCard>
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
          message="No strong file matches found from the current repository data."
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
                <ul className="ca-planner-reason-list">
                  {file.why.map(reason => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
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
          message="No affected modules or service-like files matched this task yet."
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

function Planner({ repoData, codeAnalysis, firstContributions = [], onNavigate }) {
  const [taskText, setTaskText] = useState('');
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

  if (!hasRepository) {
    return (
      <div className="ca-planner">
        <Card className="ca-planner-empty-card">
          <EmptyState
            icon={Lightbulb}
            title="Analyze a repository to start planning"
            description="Planner will use repository files, dependency context, and code analysis to prepare implementation roadmaps. Run a repository analysis first."
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
              Planner P4
            </div>
            <h2 className="ca-planner-title">AI Engineering Change Planner</h2>
            <p className="ca-planner-subtitle">
              Enter a feature request, bug, migration, or refactor goal. CodeAtlas builds
              a deterministic local implementation plan from matched repository context.
            </p>
          </div>
          <Badge variant={CONFIDENCE_VARIANT[plannerContext.confidence] || 'info'}>
            {formatConfidence(plannerContext.confidence)}
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
          rows={5}
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
        <div className="ca-planner-input-footer">
          <Pill>AI disabled in P4</Pill>
          <Pill>No backend planner API yet</Pill>
          <Pill>Local deterministic plan</Pill>
          <Pill>Blast impact enabled</Pill>
        </div>
      </Card>

      <div className="ca-planner-output-grid" aria-label="Local deterministic planner output">
        <PlanSummaryCard plannerContext={plannerContext} />
        <SuggestedFilesCard plannerContext={plannerContext} />
        <AffectedSystemsCard plannerContext={plannerContext} />
        <BlastImpactCard plannerContext={plannerContext} onNavigate={onNavigate} />
        <RoadmapCard plannerContext={plannerContext} />
        <RisksCard plannerContext={plannerContext} />
        <ValidationCard plannerContext={plannerContext} />
        <MissingContextCard plannerContext={plannerContext} />
      </div>
    </div>
  );
}

export default Planner;
