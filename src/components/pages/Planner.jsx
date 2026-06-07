import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
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

function MatchedFilesCard({ plannerContext }) {
  const { hasTask, matchedFiles } = plannerContext;

  return (
    <Card className="ca-planner-placeholder-card ca-planner-context-card">
      <div className="ca-planner-placeholder-header">
        <span className="ca-planner-placeholder-icon">
          <FileSearch size={18} />
        </span>
        <div>
          <h3>Matched Files</h3>
          <small>{hasTask ? `${matchedFiles.length} real file matches` : 'Waiting for task input'}</small>
        </div>
      </div>

      {matchedFiles.length === 0 ? (
        <MatchEmptyState
          hasTask={hasTask}
          message="No strong file matches found from the current repository data."
        />
      ) : (
        <div className="ca-planner-match-list">
          {matchedFiles.map(file => (
            <div className="ca-planner-file-match" key={file.path}>
              <div className="ca-planner-match-main">
                <span className="ca-planner-file-path" title={file.path}>{file.path}</span>
                <Badge variant={CONFIDENCE_VARIANT[file.confidence] || 'info'}>
                  {file.score}%
                </Badge>
              </div>
              <ConfidenceMeter score={file.score} />
              <div className="ca-planner-match-meta">
                {file.layer && <Pill>{file.layer}</Pill>}
                {file.language && <Pill>{file.language}</Pill>}
                {file.isGraphBacked && <Pill>graph-backed</Pill>}
              </div>
              {file.reasons.length > 0 && (
                <ul className="ca-planner-reason-list">
                  {file.reasons.map(reason => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AffectedSystemsCard({ plannerContext }) {
  const { hasTask, modules, services, entryPoints, dependencySignals } = plannerContext;
  const hasContext = modules.length > 0 || services.length > 0 || entryPoints.length > 0 || dependencySignals.length > 0;

  return (
    <Card className="ca-planner-placeholder-card ca-planner-context-card">
      <div className="ca-planner-placeholder-header">
        <span className="ca-planner-placeholder-icon">
          <Network size={18} />
        </span>
        <div>
          <h3>Affected Systems</h3>
          <small>{hasTask ? 'Modules, services, entry points, and dependency signals' : 'Waiting for task input'}</small>
        </div>
      </div>

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
                    {module.layers.length > 0 && (
                      <div className="ca-planner-mini-pill-row">
                        {module.layers.map(layer => <Pill key={layer}>{layer}</Pill>)}
                      </div>
                    )}
                    <p>{module.reasons[0]}</p>
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
    </Card>
  );
}

function DeferredPlannerCard({ title, icon: Icon, description, children }) {
  return (
    <Card className="ca-planner-placeholder-card">
      <div className="ca-planner-placeholder-header">
        <span className="ca-planner-placeholder-icon">
          <Icon size={18} />
        </span>
        <h3>{title}</h3>
      </div>
      <p>{description}</p>
      {children}
    </Card>
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
              Planner P2
            </div>
            <h2 className="ca-planner-title">AI Engineering Change Planner</h2>
            <p className="ca-planner-subtitle">
              Enter a feature request, bug, migration, or refactor goal. CodeAtlas now
              matches it against real repository files, modules, services, and entry points.
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
          <Pill>AI disabled in P2</Pill>
          <Pill>No backend planner API yet</Pill>
          <Pill>Local repo matcher active</Pill>
        </div>
      </Card>

      <div className="ca-planner-output-grid" aria-label="Future planner output sections">
        <MatchedFilesCard plannerContext={plannerContext} />
        <AffectedSystemsCard plannerContext={plannerContext} />

        <DeferredPlannerCard
          title="Implementation Roadmap"
          icon={Route}
          description="Roadmap generation starts in P3. P2 only retrieves and ranks repository context."
        >
          <div className="ca-planner-placeholder-surface">
            <SearchCode size={18} />
            <span>
              {plannerContext.hasTask
                ? `${plannerContext.matchedFiles.length} matched files ready for future planning.`
                : 'Enter a task before roadmap generation is enabled.'}
            </span>
          </div>
        </DeferredPlannerCard>

        <DeferredPlannerCard
          title="Risks"
          icon={AlertTriangle}
          description="P2 reports matcher confidence and missing-data warnings only, not final delivery risk."
        >
          <div className="ca-planner-warning-list">
            {plannerContext.warnings.map(warning => (
              <div className="ca-planner-warning-row" key={warning}>
                <AlertTriangle size={15} />
                <span>{warning}</span>
              </div>
            ))}
            {plannerContext.warnings.length === 0 && (
              <div className="ca-planner-warning-row">
                <CheckCircle2 size={15} />
                <span>Matcher has repository files, graph data, and code-analysis metadata available.</span>
              </div>
            )}
          </div>
        </DeferredPlannerCard>

        <DeferredPlannerCard
          title="Validation Checklist"
          icon={CheckCircle2}
          description="Checklist generation starts in P3. Available package scripts are shown as real validation signals."
        >
          {plannerContext.packageScripts.length > 0 ? (
            <div className="ca-planner-script-grid">
              {plannerContext.packageScripts.slice(0, 8).map(script => (
                <Pill key={script.name}>{script.name}</Pill>
              ))}
            </div>
          ) : (
            <div className="ca-planner-placeholder-surface">
              <SearchCode size={18} />
              <span>No package scripts were available in the analyzed repository data.</span>
            </div>
          )}
        </DeferredPlannerCard>
      </div>
    </div>
  );
}

export default Planner;
