import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Circle,
  Compass,
  FileCode2,
  Layers,
  ShieldAlert,
  Target,
  Terminal,
} from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Pill from '../ui/Pill';
import MetricCard from '../ui/MetricCard';
import { buildOnboardingGuideModel } from '../../utils/onboardingGuideModel';

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString();
}

function severityVariant(severity) {
  if (severity === 'critical' || severity === 'high') return 'critical';
  if (severity === 'medium') return 'warning';
  return 'success';
}

function makeStorageKey(model) {
  return model ? `onboarding:${model.version}:${model.repositoryKey}` : null;
}

function readStoredProgress(storageKey) {
  if (!storageKey) return new Set();
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (err) {
    console.warn('Unable to read onboarding progress:', err);
    return new Set();
  }
}

function OnboardingGuide({
  repoData,
  codeAnalysis,
  detailedArchitecture,
  aiSummary,
  quickStartGuide,
  commonIssues,
  firstContributions,
  isCodeAnalysisLoading,
  isQuickStartLoading,
  isIssuesLoading,
  isContributionsLoading,
}) {
  const model = useMemo(() => buildOnboardingGuideModel({
    repoData,
    codeAnalysis,
    detailedArchitecture,
    aiSummary,
    quickStartGuide,
    commonIssues,
    firstContributions,
  }), [
    repoData,
    codeAnalysis,
    detailedArchitecture,
    aiSummary,
    quickStartGuide,
    commonIssues,
    firstContributions,
  ]);

  const storageKey = makeStorageKey(model);
  const [progressState, setProgressState] = useState({
    storageKey: null,
    completedItems: new Set(),
  });
  const completedItems = progressState.storageKey === storageKey
    ? progressState.completedItems
    : new Set();

  useEffect(() => {
    setProgressState({
      storageKey,
      completedItems: readStoredProgress(storageKey),
    });
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || progressState.storageKey !== storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(progressState.completedItems)));
    } catch (err) {
      console.warn('Unable to save onboarding progress:', err);
    }
  }, [progressState, storageKey]);

  if (!repoData || !model) {
    return (
      <div className="tab-content onboarding-tab onboarding-v2">
        <Card title="Onboarding Guide" icon={Compass}>
          <div className="onboarding-v2-empty">
            <BookOpen size={36} />
            <h3>Analyze a repository to build the guide</h3>
            <p>
              The v2 guide uses repository metadata, setup scripts, architecture signals,
              code analysis, and contribution suggestions from the current analysis.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const completedCount = model.checklist.filter(item => completedItems.has(item.id)).length;
  const progressPercentage = model.checklist.length
    ? Math.round((completedCount / model.checklist.length) * 100)
    : 0;

  const toggleItem = (itemId) => {
    setProgressState((current) => {
      const next = new Set(
        current.storageKey === storageKey ? current.completedItems : readStoredProgress(storageKey)
      );
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return {
        storageKey,
        completedItems: next,
      };
    });
  };

  return (
    <div className="tab-content onboarding-tab onboarding-v2">
      <Card
        title="Onboarding Guide v2"
        icon={Compass}
        headerAction={<Badge variant="success">Evidence-backed</Badge>}
      >
        <div className="onboarding-v2-hero">
          <div className="onboarding-v2-hero-copy">
            <span className="onboarding-v2-kicker">New contributor path</span>
            <h3>{model.overview.name}</h3>
            <p>
              {model.overview.description ||
                'This guide is generated from the repository analysis available in CodeAtlas.'}
            </p>
            {model.aiContext.summary && (
              <p className="onboarding-v2-ai-summary">{model.aiContext.summary}</p>
            )}
          </div>

          <div className="onboarding-v2-progress">
            <div className="onboarding-v2-progress-top">
              <strong>{progressPercentage}% complete</strong>
              <span>{completedCount} of {model.checklist.length} steps</span>
            </div>
            <div className="onboarding-v2-progress-track" aria-hidden="true">
              <div
                className="onboarding-v2-progress-fill"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="ca-metrics-grid onboarding-v2-metrics">
          <MetricCard label="Repository files" value={formatNumber(model.overview.totalFiles)} />
          <MetricCard label="Analyzed files" value={formatNumber(model.overview.analyzedFiles)} />
          <MetricCard label="Language" value={model.overview.language || 'Unknown'} />
          <MetricCard label="Updated" value={formatDate(model.overview.lastUpdated)} />
        </div>
      </Card>

      <Card
        title="Guided Checklist"
        icon={CheckCircle2}
        headerAction={<Badge variant="info">Saved per repository</Badge>}
      >
        <div className="onboarding-v2-checklist">
          {model.checklist.map((item, index) => {
            const isComplete = completedItems.has(item.id);

            return (
              <section
                key={item.id}
                className={`onboarding-v2-step ${isComplete ? 'is-complete' : ''}`}
              >
                <button
                  type="button"
                  className="onboarding-v2-step-toggle"
                  onClick={() => toggleItem(item.id)}
                  aria-pressed={isComplete}
                  aria-label={`${isComplete ? 'Mark incomplete' : 'Mark complete'}: ${item.title}`}
                >
                  {isComplete ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </button>

                <div className="onboarding-v2-step-body">
                  <div className="onboarding-v2-step-heading">
                    <span>Step {index + 1}</span>
                    <h3>{item.title}</h3>
                  </div>
                  <p>{item.description}</p>

                  <div className="onboarding-v2-step-grid">
                    <div>
                      <h4>Actions</h4>
                      <ul>
                        {item.actions.map(action => (
                          <li key={action}>{action}</li>
                        ))}
                      </ul>
                    </div>

                    {item.evidence.length > 0 && (
                      <div>
                        <h4>Evidence</h4>
                        <ul>
                          {item.evidence.map(evidence => (
                            <li key={evidence}>{evidence}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </Card>

      <div className="onboarding-v2-grid">
        <Card
          title="Setup Commands"
          icon={Terminal}
          headerAction={
            model.setup.hasPackageJson ? <Badge variant="info">{model.setup.packageManager}</Badge> : null
          }
        >
          {model.setup.recommendedCommands.length > 0 ? (
            <div className="onboarding-v2-command-list">
              {model.setup.recommendedCommands.map(item => (
                <div key={`${item.label}-${item.command}`} className="onboarding-v2-command-row">
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.source}</span>
                  </div>
                  <code>{item.command}</code>
                </div>
              ))}
            </div>
          ) : (
            <p className="onboarding-v2-muted">
              No package scripts were detected. Use the README and config files to identify setup steps.
            </p>
          )}

          {model.setup.envVariables.length > 0 && (
            <div className="onboarding-v2-env">
              <h4>Environment variables</h4>
              {model.setup.envVariables.map(envVar => (
                <div key={envVar.key} className="onboarding-v2-env-row">
                  <code>{envVar.key}</code>
                  <span>{envVar.example || envVar.description || 'Value required at runtime'}</span>
                </div>
              ))}
            </div>
          )}

          {isQuickStartLoading && (
            <p className="onboarding-v2-muted">Quick start context is still generating.</p>
          )}
          {!isQuickStartLoading && model.aiContext.quickStart && (
            <div className="onboarding-v2-note">
              <strong>Quick start context</strong>
              <p>{model.aiContext.quickStart}</p>
            </div>
          )}
        </Card>

        <Card title="Reading Path" icon={BookOpen}>
          {model.readingPath.length > 0 ? (
            <ol className="onboarding-v2-reading-list">
              {model.readingPath.map((path, index) => (
                <li key={`${path}-${index}`}>
                  <span>{index + 1}</span>
                  <code>{path}</code>
                </li>
              ))}
            </ol>
          ) : (
            <p className="onboarding-v2-muted">Repository analysis did not expose a reading path yet.</p>
          )}
        </Card>
      </div>

      <div className="onboarding-v2-grid">
        <Card
          title="Architecture Brief"
          icon={Layers}
          headerAction={
            model.architectureBrief.type ? <Badge variant="info">{model.architectureBrief.type}</Badge> : null
          }
        >
          {model.architectureBrief.frameworks.length > 0 && (
            <div className="onboarding-v2-pill-section">
              <h4>Detected technologies</h4>
              <div>
                {model.architectureBrief.frameworks.map(item => (
                  <Pill key={item}>{item}</Pill>
                ))}
              </div>
            </div>
          )}

          {model.architectureBrief.patterns.length > 0 && (
            <div className="onboarding-v2-pill-section">
              <h4>Architecture signals</h4>
              <div>
                {model.architectureBrief.patterns.map(item => (
                  <Pill key={item}>{item}</Pill>
                ))}
              </div>
            </div>
          )}

          {model.architectureBrief.folders.length > 0 && (
            <div className="onboarding-v2-folder-list">
              <h4>Major folders</h4>
              {model.architectureBrief.folders.map(folder => (
                <div key={folder.folder} className="onboarding-v2-folder-row">
                  <code>{folder.folder}/</code>
                  <span>{folder.count} files</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Code Landmarks"
          icon={FileCode2}
          headerAction={
            isCodeAnalysisLoading ? <Badge variant="warning">Analyzing</Badge> : null
          }
        >
          {model.codeLandmarks.length > 0 ? (
            <div className="onboarding-v2-landmark-list">
              {model.codeLandmarks.map(item => (
                <div key={item.id} className="onboarding-v2-landmark-row">
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.kind}{item.async ? ' async' : ''}</span>
                  </div>
                  <code>{item.file}{item.line ? `:${item.line}` : ''}</code>
                </div>
              ))}
            </div>
          ) : (
            <p className="onboarding-v2-muted">
              {isCodeAnalysisLoading
                ? 'Code landmarks are still being extracted.'
                : 'No function, class, or export landmarks were available from code analysis.'}
            </p>
          )}
        </Card>
      </div>

      <div className="onboarding-v2-grid">
        <Card
          title="Risk and Quality Signals"
          icon={ShieldAlert}
          headerAction={<Badge variant="info">Read-only</Badge>}
        >
          {model.riskHighlights.length > 0 ? (
            <div className="onboarding-v2-risk-list">
              {model.riskHighlights.map(item => (
                <div key={item.id} className="onboarding-v2-risk-row">
                  <Badge variant={severityVariant(item.severity)}>
                    {item.severity}
                  </Badge>
                  <div>
                    <strong>{item.title}</strong>
                    {item.description && <p>{item.description}</p>}
                    {item.file && (
                      <code>{item.file}{item.line ? `:${item.line}` : ''}</code>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="onboarding-v2-muted">
              {isCodeAnalysisLoading
                ? 'Risk signals are still loading from code analysis.'
                : 'No risk signals were available from the current analysis.'}
            </p>
          )}

          {isIssuesLoading && (
            <p className="onboarding-v2-muted">Troubleshooting context is still generating.</p>
          )}
          {!isIssuesLoading && model.aiContext.commonIssues && (
            <div className="onboarding-v2-note">
              <strong>Troubleshooting context</strong>
              <p>{model.aiContext.commonIssues}</p>
            </div>
          )}
        </Card>

        <Card
          title="First Contribution Candidates"
          icon={Target}
          headerAction={
            isContributionsLoading ? <Badge variant="warning">Analyzing</Badge> : null
          }
        >
          {model.firstContributions.length > 0 ? (
            <div className="onboarding-v2-contribution-list">
              {model.firstContributions.map(item => (
                <div key={item.id} className="onboarding-v2-contribution-row">
                  <div className="onboarding-v2-contribution-main">
                    <strong>{item.task}</strong>
                    {item.impact && <p>{item.impact}</p>}
                    {item.file && <code>{item.file}</code>}
                  </div>
                  {item.difficulty && <Badge variant="info">{item.difficulty}</Badge>}
                </div>
              ))}
            </div>
          ) : (
            <div className="onboarding-v2-empty-inline">
              <AlertTriangle size={18} />
              <p>
                {isContributionsLoading
                  ? 'Contribution candidates are still being generated.'
                  : 'No contribution candidates were available yet. Use the checklist and reading path to pick a small first task.'}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default OnboardingGuide;
