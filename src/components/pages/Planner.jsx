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

const EXAMPLE_PROMPTS = [
  'Add OAuth login',
  'Add rate limiting',
  'Fix database connection issue',
  'Migrate API service',
  'Improve security scanner',
];

const PLACEHOLDER_SECTIONS = [
  {
    id: 'matched-files',
    title: 'Matched Files',
    icon: FileSearch,
    description: 'P2 will match the task against real repository files and entry points.',
  },
  {
    id: 'affected-systems',
    title: 'Affected Systems',
    icon: Network,
    description: 'P2 will identify systems and modules touched by the requested change.',
  },
  {
    id: 'implementation-roadmap',
    title: 'Implementation Roadmap',
    icon: Route,
    description: 'P2 will assemble ordered engineering steps after repo context retrieval.',
  },
  {
    id: 'risks',
    title: 'Risks',
    icon: AlertTriangle,
    description: 'P2 will estimate risk from dependencies, security signals, and likely blast radius.',
  },
  {
    id: 'validation-checklist',
    title: 'Validation Checklist',
    icon: CheckCircle2,
    description: 'P2 will recommend checks based on package scripts and affected code paths.',
  },
];

function getRepositoryFileCount(repoData) {
  if (Array.isArray(repoData?.fileTree)) return repoData.fileTree.length;
  if (Array.isArray(repoData?.fileStructure)) return repoData.fileStructure.length;
  return 0;
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
              Planner P1
            </div>
            <h2 className="ca-planner-title">AI Engineering Change Planner</h2>
            <p className="ca-planner-subtitle">
              Enter a feature request, bug, migration, or refactor goal. Plan generation
              starts in P2; this shell is wired to real repository availability now.
            </p>
          </div>
          <Badge variant="info">Repo context ready</Badge>
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
          <Pill>AI disabled in P1</Pill>
          <Pill>No backend planner API yet</Pill>
          <Pill>No fake analysis output</Pill>
        </div>
      </Card>

      <div className="ca-planner-output-grid" aria-label="Future planner output sections">
        {PLACEHOLDER_SECTIONS.map(section => {
          const Icon = section.icon;
          return (
            <Card className="ca-planner-placeholder-card" key={section.id}>
              <div className="ca-planner-placeholder-header">
                <span className="ca-planner-placeholder-icon">
                  <Icon size={18} />
                </span>
                <h3>{section.title}</h3>
              </div>
              <p>{section.description}</p>
              <div className="ca-planner-placeholder-surface">
                <SearchCode size={18} />
                <span>Waiting for P2 planning logic</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default Planner;
