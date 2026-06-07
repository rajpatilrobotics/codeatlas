import React, { useCallback, useMemo, useRef, useState } from 'react';
import ReactFlow, { Background, Controls, Handle, MiniMap, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  FileSearch,
  GitBranch,
  Lightbulb,
  Network,
  Route,
  SearchCode,
  Target,
} from 'lucide-react';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import { buildDebugTraceContext } from '../../utils/repository/buildDebugTraceContext';
import { buildDebugTraceGraph } from '../../utils/repository/buildDebugTraceGraph';

const EXAMPLE_INPUTS = [
  {
    label: 'TypeError stack',
    value: `TypeError: Cannot read property 'map' of undefined
    at Dashboard.jsx:42:18
    at RepoService.js:88:10
    at api/github/analyze.js:31:5`,
  },
  {
    label: 'API failure',
    value: `POST /api/github/analyze returned 500
Error: GitHub token not configured on server
    at api/github/analyze.js:31:5`,
  },
  {
    label: 'Python traceback',
    value: `Traceback (most recent call last):
  File "core/auth.py", line 88, in authenticate
  File "app.py", line 42, in handle_request
ValueError: invalid token payload`,
  },
];

function getRepositoryFileCount(repoData) {
  if (Array.isArray(repoData?.fileTree)) return repoData.fileTree.length;
  if (Array.isArray(repoData?.fileStructure)) return repoData.fileStructure.length;
  return 0;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getConfidenceVariant(confidence) {
  if (confidence === 'high') return 'success';
  if (confidence === 'medium') return 'medium';
  if (confidence === 'low') return 'warning';
  return 'info';
}

function formatConfidence(confidence) {
  if (!confidence || confidence === 'none') return 'No trace yet';
  return `${confidence.charAt(0).toUpperCase()}${confidence.slice(1)} confidence`;
}

function DebugMetric({ label, value }) {
  return (
    <div className="ca-debug-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DebugTraceNode({ data }) {
  const type = data?.type || 'related';
  const label = data?.label || 'Unknown';
  const path = data?.path || '';
  const reason = data?.reason || '';

  return (
    <div className={`ca-debug-flow-node ca-debug-flow-node--${type}`}>
      <Handle type="target" position={Position.Left} className="ca-debug-flow-handle" />
      <Handle type="source" position={Position.Right} className="ca-debug-flow-handle" />
      <div className="ca-debug-flow-node-kicker">{type.replace(/-/g, ' ')}</div>
      <strong title={label}>{label}</strong>
      {path && <span title={path}>{path}</span>}
      <div className="ca-debug-flow-node-meta">
        {data?.confidence && <em>{data.confidence}</em>}
        {data?.depth !== null && data?.depth !== undefined && <em>depth {data.depth}</em>}
      </div>
      {reason && <p title={reason}>{reason}</p>}
    </div>
  );
}

const DEBUG_TRACE_NODE_TYPES = {
  debugTrace: DebugTraceNode,
};

function EmptyResult({ hasInput }) {
  return (
    <div className="ca-debug-empty-result">
      <SearchCode size={22} />
      <strong>{hasInput ? 'No repository match yet' : 'Paste an error to start'}</strong>
      <span>
        {hasInput
          ? 'The local parser did not find a repository-backed file path. Add a file, function, route, or stack frame for stronger matching.'
          : 'Debug Navigator will parse stack frames, routes, status codes, and file references locally.'}
      </span>
    </div>
  );
}

function ErrorSummaryCard({ context }) {
  const { errorSummary, parsedFrames, apiRoutes, urls, httpStatuses, confidence, coverage } = context;

  return (
    <Card title="Parsed Error Summary" icon={Bug}>
      <div className="ca-debug-summary">
        <div>
          <span className="ca-debug-label">Error type</span>
          <strong>{errorSummary.type}</strong>
        </div>
        <div>
          <span className="ca-debug-label">Message</span>
          <p>{errorSummary.message}</p>
        </div>
        <div className="ca-debug-summary-chips">
          <Badge variant={getConfidenceVariant(confidence)}>{formatConfidence(confidence)}</Badge>
          <span>{parsedFrames.length} stack frames</span>
          <span>{coverage.matchedFiles} matched files</span>
          {httpStatuses.length > 0 && <span>{httpStatuses.join(', ')} status</span>}
        </div>
        {(apiRoutes.length > 0 || urls.length > 0) && (
          <div className="ca-debug-route-list">
            {apiRoutes.map(route => (
              <span key={`${route.method}-${route.path}`}>
                {route.method ? `${route.method} ` : ''}
                {route.path}
              </span>
            ))}
            {urls.map(url => (
              <span key={url}>{url}</span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function MatchedFilesCard({ context }) {
  const { matchedFiles, unmatchedReferences, parsedFrames, hasInput } = context;

  return (
    <Card title="Matched Repository Files" icon={FileSearch}>
      {matchedFiles.length === 0 ? (
        <EmptyResult hasInput={hasInput} />
      ) : (
        <div className="ca-debug-file-list">
          {matchedFiles.map(file => (
            <div key={file.path} className="ca-debug-file-row">
              <div>
                <strong>{file.path}</strong>
                <p>{file.reasons.slice(0, 2).join(' · ')}</p>
                {file.alternatives.length > 0 && (
                  <span className="ca-debug-muted">Also possible: {file.alternatives.join(', ')}</span>
                )}
              </div>
              <div className="ca-debug-file-meta">
                <Badge variant={getConfidenceVariant(file.confidence)}>{file.confidence}</Badge>
                <span>{file.matchType.replace(/-/g, ' ')}</span>
                {file.references[0]?.line && <span>line {file.references[0].line}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ca-debug-subsection">
        <h3>Mentioned References</h3>
        {parsedFrames.length === 0 ? (
          <p className="ca-debug-muted">No stack-frame file references detected yet.</p>
        ) : (
          <div className="ca-debug-reference-list">
            {parsedFrames.slice(0, 8).map((frame, index) => (
              <div key={`${frame.fileReference}-${frame.sourceLine}-${index}`} className="ca-debug-reference-row">
                <code>{frame.fileReference}</code>
                <span>
                  {frame.functionName || 'unknown function'}
                  {frame.line ? ` · line ${frame.line}` : ''}
                  {frame.column ? `:${frame.column}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {unmatchedReferences.length > 0 && (
        <div className="ca-debug-unmatched">
          <AlertTriangle size={15} />
          <span>
            {unmatchedReferences.length} reference{unmatchedReferences.length === 1 ? '' : 's'} did not match repository files.
          </span>
        </div>
      )}
    </Card>
  );
}

function RootCauseCard({ context }) {
  const candidates = safeArray(context.rootCauseCandidates);

  return (
    <Card title="Probable Local Root Cause" icon={Target}>
      {candidates.length === 0 ? (
        <EmptyResult hasInput={context.hasInput} />
      ) : (
        <div className="ca-debug-candidate-list">
          {candidates.map(candidate => (
            <div key={candidate.path} className="ca-debug-candidate">
              <div className="ca-debug-candidate-body">
                <span className="ca-debug-label">{candidate.title}</span>
                <strong>{candidate.path}</strong>
                <p>{candidate.reason}</p>
                {candidate.hypothesis && (
                  <div className="ca-debug-hypothesis">
                    <Badge variant={getConfidenceVariant(candidate.hypothesis.confidence)}>
                      {candidate.hypothesis.label}
                    </Badge>
                    <span>{candidate.hypothesis.rationale}</span>
                  </div>
                )}
                {safeArray(candidate.evidence).length > 0 && (
                  <div className="ca-debug-evidence-list" aria-label={`Evidence for ${candidate.path}`}>
                    {candidate.evidence.slice(0, 6).map(item => (
                      <span key={`${candidate.path}-${item.label}-${item.detail}`} className="ca-debug-evidence-chip">
                        {item.label}
                        {item.weight ? <em>{item.weight > 0 ? `+${item.weight}` : item.weight}</em> : null}
                      </span>
                    ))}
                  </div>
                )}
                <div className="ca-debug-candidate-panels">
                  {safeArray(candidate.inspectionSteps).length > 0 && (
                    <div className="ca-debug-candidate-panel">
                      <h4>Inspect</h4>
                      <ol>
                        {candidate.inspectionSteps.slice(0, 4).map(step => (
                          <li key={`${candidate.path}-inspect-${step}`}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {safeArray(candidate.safeFixHints).length > 0 && (
                    <div className="ca-debug-candidate-panel">
                      <h4>Safe fix hints</h4>
                      <ul>
                        {candidate.safeFixHints.slice(0, 3).map(hint => (
                          <li key={`${candidate.path}-fix-${hint}`}>{hint}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {safeArray(candidate.validationChecks).length > 0 && (
                    <div className="ca-debug-candidate-panel">
                      <h4>Validate</h4>
                      <ul>
                        {candidate.validationChecks.slice(0, 3).map(check => (
                          <li key={`${candidate.path}-validation-${check.label}`}>
                            <span>{check.label}</span>
                            {check.command && <code>{check.command}</code>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {safeArray(candidate.missingContext).length > 0 && (
                    <div className="ca-debug-candidate-panel ca-debug-candidate-panel--muted">
                      <h4>Missing context</h4>
                      <ul>
                        {candidate.missingContext.slice(0, 3).map(item => (
                          <li key={`${candidate.path}-missing-${item}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div className="ca-debug-score">
                <strong>{candidate.score}</strong>
                <span>{candidate.confidence}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function InspectionCard({ context }) {
  return (
    <Card title="Suggested Inspection Order" icon={SearchCode}>
      {context.inspectionOrder.length === 0 ? (
        <EmptyResult hasInput={context.hasInput} />
      ) : (
        <ol className="ca-debug-steps">
          {context.inspectionOrder.map(item => (
            <li key={`${item.step}-${item.path}`}>
              <strong>{item.path}</strong>
              <span>
                {item.line ? `Line ${item.line}` : 'Review matched path'}
                {item.functionName ? ` · ${item.functionName}` : ''}
              </span>
              <p>{item.reason}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function RelatedFilesCard({ context }) {
  return (
    <Card title="Related Files" icon={GitBranch}>
      {context.relatedRepoFiles.length === 0 ? (
        <p className="ca-debug-muted">Related file hints will appear after stack references match repository files.</p>
      ) : (
        <div className="ca-debug-related-list">
          {context.relatedRepoFiles.map(file => (
            <div key={file.path} className="ca-debug-related-row">
              <strong>{file.path}</strong>
              <span>{file.reason}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function DependencyTraceGroup({ title, files, emptyText }) {
  return (
    <div className="ca-debug-trace-group">
      <h3>{title}</h3>
      {files.length === 0 ? (
        <p className="ca-debug-muted">{emptyText}</p>
      ) : (
        <div className="ca-debug-trace-list">
          {files.map(file => (
            <div key={`${file.direction}-${file.path}`} className="ca-debug-trace-row">
              <div>
                <strong>{file.path}</strong>
                <span>{file.reason || file.relationship || 'Related dependency context'}</span>
              </div>
              <div className="ca-debug-trace-meta">
                <Badge variant={getConfidenceVariant(file.confidence)}>{file.confidence}</Badge>
                {file.depth !== null && file.depth !== undefined && <span>depth {file.depth}</span>}
                {file.graphBacked && <span>graph</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DependencyTraceCard({ context }) {
  const trace = context.dependencyTrace;
  const seedFiles = safeArray(trace?.seedFiles);
  const relatedFiles = safeArray(trace?.relatedFiles);
  const upstreamFiles = relatedFiles.filter(file => file.direction === 'upstream');
  const downstreamFiles = relatedFiles.filter(file => file.direction === 'downstream');
  const sameModuleFiles = relatedFiles.filter(file => file.direction === 'same-module');

  return (
    <Card title="Dependency-Aware Trace" icon={Network}>
      {!context.hasInput ? (
        <EmptyResult hasInput={context.hasInput} />
      ) : !trace?.available ? (
        <div className="ca-debug-dependency-unavailable">
          <AlertTriangle size={16} />
          <span>{trace?.reason || 'Dependency graph unavailable. Showing parser-only debug context.'}</span>
        </div>
      ) : (
        <div className="ca-debug-trace-panel">
          <div className="ca-debug-trace-summary">
            <Badge variant={trace.coverage.graphBackedSeeds > 0 ? 'success' : 'warning'}>
              {trace.coverage.graphBackedSeeds} graph-backed seed{trace.coverage.graphBackedSeeds === 1 ? '' : 's'}
            </Badge>
            <span>{trace.coverage.graphFiles} graph files</span>
            <span>{trace.coverage.graphEdges} graph edges</span>
            <span>{relatedFiles.length}/{trace.coverage.maxRelatedFiles} related</span>
            {trace.isLimited && <span>limited</span>}
          </div>

          {seedFiles.length === 0 ? (
            <p className="ca-debug-muted">{trace.reason}</p>
          ) : (
            <>
              <DependencyTraceGroup
                title="Mentioned stack files"
                files={seedFiles}
                emptyText="No stack files matched repository paths yet."
              />
              <DependencyTraceGroup
                title="Upstream dependencies"
                files={upstreamFiles}
                emptyText="No direct or transitive imports found for the matched stack files."
              />
              <DependencyTraceGroup
                title="Downstream impacted files"
                files={downstreamFiles}
                emptyText="No direct or transitive dependents found for the matched stack files."
              />
              <DependencyTraceGroup
                title="Same-module hints"
                files={sameModuleFiles}
                emptyText="No same-module fallback hints were needed."
              />
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function DebugTraceGraphCard({ context, graphModel }) {
  const reactFlowInstanceRef = useRef(null);
  const hasNodes = graphModel.available && graphModel.nodes.length > 0;

  const handleInit = useCallback((instance) => {
    reactFlowInstanceRef.current = instance;
    window.setTimeout(() => instance.fitView?.({ padding: 0.18, duration: 180 }), 80);
  }, []);

  const fitGraph = useCallback(() => {
    reactFlowInstanceRef.current?.fitView?.({ padding: 0.18, duration: 180 });
  }, []);

  return (
    <Card title="Debug Trace Graph" icon={Network} className="ca-debug-graph-card">
      {!context.hasInput ? (
        <EmptyResult hasInput={context.hasInput} />
      ) : !hasNodes ? (
        <div className="ca-debug-dependency-unavailable">
          <AlertTriangle size={16} />
          <span>{graphModel.reason || 'Dependency graph unavailable. Showing parser/list view only.'}</span>
        </div>
      ) : (
        <div className="ca-debug-flow-shell">
          <div className="ca-debug-flow-header">
            <div>
              <span className="ca-debug-label">Deterministic/probable trace</span>
              <strong>{graphModel.summary.nodeCount} nodes · {graphModel.summary.edgeCount} edges</strong>
            </div>
            <div className="ca-debug-flow-actions">
              {graphModel.summary.isLimited && <span>bounded view</span>}
              <button type="button" onClick={fitGraph}>Fit</button>
            </div>
          </div>
          <div className="ca-debug-flow-canvas">
            <ReactFlow
              nodes={graphModel.nodes}
              edges={graphModel.edges}
              nodeTypes={DEBUG_TRACE_NODE_TYPES}
              onInit={handleInit}
              fitView
              fitViewOptions={{ padding: 0.18, minZoom: 0.28, maxZoom: 1.25 }}
              minZoom={0.2}
              maxZoom={1.6}
              zoomOnScroll={false}
              panOnScroll={false}
              preventScrolling={false}
              zoomOnPinch
              panOnDrag
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
              proOptions={{ hideAttribution: true }}
            >
              <Background color="rgba(255,255,255,0.06)" gap={18} size={1} />
              <Controls showInteractive={false} />
              <MiniMap
                nodeColor={node => {
                  const type = node.data?.type;
                  if (type === 'error') return '#ef4444';
                  if (type === 'root-cause') return '#f59e0b';
                  if (type === 'stack') return '#8b5cf6';
                  if (type === 'upstream') return '#38bdf8';
                  if (type === 'downstream') return '#22c55e';
                  return '#737373';
                }}
                maskColor="rgba(0,0,0,0.78)"
              />
            </ReactFlow>
          </div>
          <div className="ca-debug-flow-legend">
            <span className="is-error">Error</span>
            <span className="is-stack">Stack file</span>
            <span className="is-root">Root cause</span>
            <span className="is-upstream">Upstream</span>
            <span className="is-downstream">Downstream</span>
          </div>
        </div>
      )}
    </Card>
  );
}

function ValidationCard({ context }) {
  return (
    <Card title="Validation Checklist" icon={CheckCircle2}>
      <div className="ca-debug-validation-list">
        {context.validationChecklist.map((item, index) => (
          <div key={`${item.label}-${index}`} className="ca-debug-validation-row">
            <Badge variant={item.type === 'script' ? 'success' : 'info'}>{item.type}</Badge>
            <div>
              <strong>{item.label}</strong>
              {item.command && <code>{item.command}</code>}
              <p>{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function WarningsCard({ warnings }) {
  if (!warnings.length) return null;

  return (
    <div className="ca-debug-warning-strip">
      <AlertTriangle size={16} />
      <div>
        {warnings.map(warning => (
          <span key={warning}>{warning}</span>
        ))}
      </div>
    </div>
  );
}

function DebugNavigator({
  repoData,
  codeAnalysis,
  detailedArchitecture,
  firstContributions,
  onNavigate,
}) {
  const [errorText, setErrorText] = useState('');
  const repositoryFileCount = getRepositoryFileCount(repoData);
  const hasRepository = repositoryFileCount > 0;
  const hasArchitectureContext = Boolean(detailedArchitecture || repoData?.techStack);
  const hasPlannerNotes = safeArray(firstContributions).length > 0;

  const debugContext = useMemo(() => buildDebugTraceContext({
    errorText,
    repoData,
    codeAnalysis,
  }), [errorText, repoData, codeAnalysis]);
  const graphModel = useMemo(() => buildDebugTraceGraph(debugContext), [debugContext]);

  if (!hasRepository) {
    return (
      <EmptyState
        icon={Bug}
        title="Analyze a repository first"
        description="Debug Navigator needs real repository files before it can map stack traces to code paths."
      />
    );
  }

  return (
    <div className="ca-debug-workspace">
      <section className="ca-debug-hero">
        <div>
          <span className="ca-debug-eyebrow">Debug Trace Navigator</span>
          <h2>Debug Intelligence Workspace</h2>
          <p>Paste an error, stack trace, API failure, or bug description. CodeAtlas will parse it locally and map it to real repository context.</p>
        </div>
        <div className="ca-debug-metrics">
          <DebugMetric label="Repo files" value={repositoryFileCount} />
          <DebugMetric label="Analyzed files" value={debugContext.coverage.codeAnalysisFiles} />
          <DebugMetric label="Graph files" value={repoData?.dependencyGraph?.nodes?.length || 0} />
        </div>
      </section>

      <Card title="Error or Stack Trace Input" icon={Route}>
        <div className="ca-debug-input-wrap">
          <textarea
            className="ca-debug-input"
            value={errorText}
            onChange={(event) => setErrorText(event.target.value)}
            placeholder="Paste stack trace, browser console error, API response, or broken-feature description..."
            rows={8}
          />
          <div className="ca-debug-examples">
            {EXAMPLE_INPUTS.map(example => (
              <button
                key={example.label}
                type="button"
                onClick={() => setErrorText(example.value)}
              >
                {example.label}
              </button>
            ))}
            <button type="button" onClick={() => setErrorText('')} disabled={!errorText}>
              Clear
            </button>
          </div>
        </div>
      </Card>

      <div className="ca-debug-context-strip">
        <Badge variant={getConfidenceVariant(debugContext.confidence)}>
          {formatConfidence(debugContext.confidence)}
        </Badge>
        <span>{debugContext.coverage.parsedFrames} parsed frames</span>
        <span>{debugContext.coverage.matchedFiles} matched files</span>
        <span>{debugContext.apiRoutes.length} API routes</span>
        <span>{hasArchitectureContext ? 'Architecture context available' : 'Architecture context unavailable'}</span>
        <span>{hasPlannerNotes ? 'Planner notes available' : 'Planner notes unavailable'}</span>
      </div>

      <WarningsCard warnings={debugContext.warnings} />

      <div className="ca-debug-quick-links" role="toolbar" aria-label="Debug Navigator quick links">
        <button type="button" onClick={() => onNavigate?.('repository-graph')}>
          <Network size={15} />
          Open Repository Graph
        </button>
        <button type="button" onClick={() => onNavigate?.('blast-radius')}>
          <Target size={15} />
          Open Blast Radius
        </button>
        <button type="button" onClick={() => onNavigate?.('planner')}>
          <Lightbulb size={15} />
          Open Planner
        </button>
        <button type="button" onClick={() => onNavigate?.('architecture-v2')}>
          <GitBranch size={15} />
          Open Architecture V2
        </button>
      </div>

      <div className="ca-debug-grid">
        <ErrorSummaryCard context={debugContext} />
        <RootCauseCard context={debugContext} />
        <MatchedFilesCard context={debugContext} />
        <DependencyTraceCard context={debugContext} />
        <DebugTraceGraphCard context={debugContext} graphModel={graphModel} />
        <InspectionCard context={debugContext} />
        <RelatedFilesCard context={debugContext} />
        <ValidationCard context={debugContext} />
      </div>
    </div>
  );
}

export default DebugNavigator;
