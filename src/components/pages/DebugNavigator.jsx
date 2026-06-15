import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, { Background, Controls, Handle, MiniMap, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  Clipboard,
  Download,
  FileSearch,
  GitBranch,
  Lightbulb,
  Loader2,
  Network,
  Route,
  SearchCode,
  Sparkles,
  Target,
} from 'lucide-react';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import { buildDebugTraceContext } from '../../utils/repository/buildDebugTraceContext';
import { buildDebugTraceGraph } from '../../utils/repository/buildDebugTraceGraph';
import { clearPdfState, savePdfState } from '../../services/pdf/pdfSessionBridge';

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

const INITIAL_AI_DEBUG_STATE = {
  status: 'idle',
  analysis: null,
  error: '',
};

const INITIAL_REPORT_FEEDBACK = {
  status: 'idle',
  message: '',
};

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

function formatListForMarkdown(items, formatter = item => item) {
  const list = safeArray(items).map(formatter).filter(Boolean);
  return list.length > 0 ? list.map(item => `- ${item}`).join('\n') : '- None detected';
}

function getDependencyMode(context) {
  const trace = context?.dependencyTrace;
  if (!context?.hasInput) return { label: 'Parser ready', variant: 'info', detail: 'Waiting for debug input.' };
  if (trace?.available) {
    return {
      label: 'Dependency-aware',
      variant: trace.coverage?.graphBackedSeeds > 0 ? 'success' : 'warning',
      detail: `${trace.coverage?.graphBackedSeeds || 0} graph-backed seed${trace.coverage?.graphBackedSeeds === 1 ? '' : 's'}`,
    };
  }
  return {
    label: 'Parser-only',
    variant: 'warning',
    detail: trace?.reason || 'Dependency graph unavailable.',
  };
}

function isLimitedParserContext(context) {
  return Boolean(
    context?.hasInput &&
    safeArray(context.parsedFrames).length === 0 &&
    safeArray(context.apiRoutes).length === 0 &&
    safeArray(context.matchedFiles).length === 0
  );
}

function redactDebugText(value) {
  return String(value || '')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi, 'Bearer [redacted]')
    .replace(/\b(GITHUB_TOKEN|GROQ_API_KEY|GEMINI_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|[A-Z0-9_]*API[_-]?KEY|[A-Z0-9_]*TOKEN|[A-Z0-9_]*SECRET)\s*[:=]\s*['"]?[^'"\s]+/gi, '$1=[redacted]')
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, '[redacted-github-token]')
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[redacted-gemini-key]')
    .replace(/\bgsk_[0-9A-Za-z_-]{20,}\b/g, '[redacted-groq-key]')
    .replace(/\b[A-Za-z0-9_-]{36,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g, '[redacted-token]')
    .replace(/\b[A-Fa-f0-9]{48,}\b/g, '[redacted-secret]');
}

function normalizePackageScripts(repoData) {
  return Object.entries(repoData?.packageJson?.scripts || {})
    .map(([name, command]) => ({ name, command }))
    .slice(0, 8);
}

function buildLocalDebugAnalysis(context) {
  const candidates = safeArray(context.rootCauseCandidates);
  const topCandidate = candidates[0];
  const fallbackFiles = candidates.length > 0 ? candidates : safeArray(context.matchedFiles);

  return {
    summary: `${context.errorSummary?.type || 'Unknown error'}: ${context.errorSummary?.message || 'No message detected.'}`,
    probableRootCause: topCandidate?.path
      ? `${topCandidate.path}: ${topCandidate.reason || topCandidate.hypothesis?.label || 'Inspect this deterministic candidate first.'}`
      : 'No repository-backed root cause identified yet.',
    confidence: topCandidate?.confidence || context.confidence || 'low',
    reasoning: [
      topCandidate?.reason,
      topCandidate?.hypothesis?.rationale,
      ...safeArray(topCandidate?.evidence).map(item => `${item.label}: ${item.detail}`),
    ].filter(Boolean).slice(0, 8),
    suggestedFixes: safeArray(topCandidate?.safeFixHints).slice(0, 8),
    filesToInspect: fallbackFiles.slice(0, 8).map((file, index) => ({
      path: file.path,
      reason: file.reason || file.reasons?.[0] || 'Matched by deterministic local debug context.',
      priority: index === 0 ? 'high' : (file.confidence || 'medium'),
    })).filter(item => item.path),
    validationPlan: safeArray(context.validationChecklist).slice(0, 8).map(item => ({
      label: item.label || 'Validate locally',
      command: item.command || '',
      detail: item.detail || '',
    })),
    risks: topCandidate?.confidence === 'low'
      ? ['Local confidence is low; inspect matched evidence before changing code.']
      : [],
    missingContext: [
      ...safeArray(topCandidate?.missingContext),
      ...safeArray(context.warnings),
    ].filter(Boolean).slice(0, 8),
  };
}

function compactMatchedFile(file) {
  return {
    path: file.path,
    confidence: file.confidence,
    score: file.score,
    matchType: file.matchType,
    reasons: safeArray(file.reasons).slice(0, 4),
    references: safeArray(file.references).slice(0, 3).map(reference => ({
      line: reference.line || null,
      column: reference.column || null,
      functionName: reference.functionName || '',
      stackPosition: reference.stackPosition || null,
    })),
  };
}

function compactRootCauseCandidate(candidate) {
  return {
    path: candidate.path,
    confidence: candidate.confidence,
    score: candidate.score,
    reason: candidate.reason,
    hypothesis: candidate.hypothesis,
    evidence: safeArray(candidate.evidence).slice(0, 6),
    inspectionSteps: safeArray(candidate.inspectionSteps).slice(0, 4),
    safeFixHints: safeArray(candidate.safeFixHints).slice(0, 4),
    validationChecks: safeArray(candidate.validationChecks).slice(0, 4),
    missingContext: safeArray(candidate.missingContext).slice(0, 4),
  };
}

function compactTraceFile(file) {
  return {
    path: file.path,
    direction: file.direction,
    relationship: file.relationship,
    reason: file.reason,
    depth: file.depth,
    confidence: file.confidence,
    graphBacked: Boolean(file.graphBacked),
  };
}

function buildDebugAIPayload(debugContext, errorText, repoData) {
  const localDebugAnalysis = buildLocalDebugAnalysis(debugContext);
  const trace = debugContext.dependencyTrace || {};

  return {
    rawError: redactDebugText(errorText).slice(0, 6000),
    errorSummary: debugContext.errorSummary,
    parsedFrames: safeArray(debugContext.parsedFrames).slice(0, 10).map(frame => ({
      fileReference: frame.fileReference,
      functionName: frame.functionName,
      line: frame.line,
      column: frame.column,
      sourceLine: frame.sourceLine,
      raw: redactDebugText(frame.raw || ''),
    })),
    matchedFiles: safeArray(debugContext.matchedFiles).slice(0, 8).map(compactMatchedFile),
    dependencyTrace: {
      available: Boolean(trace.available),
      reason: trace.reason || '',
      seedFiles: safeArray(trace.seedFiles).slice(0, 12).map(compactTraceFile),
      relatedFiles: safeArray(trace.relatedFiles).slice(0, 12).map(compactTraceFile),
      tracePaths: safeArray(trace.tracePaths).slice(0, 12).map(path => ({
        from: path.from,
        to: path.to,
        direction: path.direction,
        depth: path.depth,
        reason: path.reason,
        relationship: path.relationship,
      })),
      coverage: trace.coverage || {},
    },
    rootCauseCandidates: safeArray(debugContext.rootCauseCandidates).slice(0, 5).map(compactRootCauseCandidate),
    validationChecklist: safeArray(debugContext.validationChecklist).slice(0, 8),
    packageScripts: normalizePackageScripts(repoData),
    warnings: safeArray(debugContext.warnings).slice(0, 8),
    localDebugAnalysis,
  };
}

function buildDebugReportMarkdown(debugContext, errorText, aiDebugState) {
  const topCandidate = safeArray(debugContext.rootCauseCandidates)[0];
  const aiAnalysis = aiDebugState.analysis;
  const dependencyMode = getDependencyMode(debugContext);
  const redactedInput = redactDebugText(errorText).trim();

  return [
    '# CodeAtlas Debug Report',
    '',
    '## Status',
    `- Mode: ${aiDebugState.status === 'enhanced' ? 'AI enhanced' : aiDebugState.status === 'fallback' ? 'Local fallback' : 'Deterministic local'}`,
    `- Confidence: ${formatConfidence(debugContext.confidence)}`,
    `- Dependency context: ${dependencyMode.label} (${dependencyMode.detail})`,
    `- Parsed frames: ${debugContext.coverage.parsedFrames}`,
    `- Matched files: ${debugContext.coverage.matchedFiles}`,
    '',
    '## Error Summary',
    `- Type: ${debugContext.errorSummary.type}`,
    `- Message: ${debugContext.errorSummary.message}`,
    '',
    '## Redacted Input',
    redactedInput ? `\`\`\`text\n${redactedInput}\n\`\`\`` : '_No input provided._',
    '',
    '## Inspect First',
    topCandidate
      ? [
          `- File: ${topCandidate.path}`,
          `- Score: ${topCandidate.score}`,
          `- Confidence: ${topCandidate.confidence}`,
          `- Hypothesis: ${topCandidate.hypothesis?.label || 'General stack-frame failure'}`,
          `- Reason: ${topCandidate.reason}`,
        ].join('\n')
      : '- No repository-backed root-cause candidate yet.',
    '',
    '## AI Analysis',
    aiAnalysis
      ? [
          `- Summary: ${aiAnalysis.summary || 'Not provided'}`,
          `- Probable root cause: ${aiAnalysis.probableRootCause || 'Not provided'}`,
          `- Confidence: ${aiAnalysis.confidence || 'medium'}`,
          '',
          '### Suggested fixes',
          formatListForMarkdown(aiAnalysis.suggestedFixes),
        ].join('\n')
      : '- AI enhancement has not been run.',
    '',
    '## Matched Files',
    formatListForMarkdown(debugContext.matchedFiles, file => {
      const line = file.references?.[0]?.line ? ` line ${file.references[0].line}` : '';
      return `${file.path}${line} — ${file.reasons?.[0] || file.matchType || 'matched file'}`;
    }),
    '',
    '## Dependency Trace',
    debugContext.dependencyTrace?.available
      ? formatListForMarkdown(debugContext.dependencyTrace.relatedFiles?.slice(0, 12), file => (
          `${file.path} — ${file.reason || file.relationship || file.direction || 'related'}`
        ))
      : `- ${debugContext.dependencyTrace?.reason || 'Dependency graph unavailable.'}`,
    '',
    '## Inspection Order',
    formatListForMarkdown(debugContext.inspectionOrder, item => (
      `${item.path}${item.line ? ` line ${item.line}` : ''} — ${item.reason}`
    )),
    '',
    '## Validation Checklist',
    formatListForMarkdown(debugContext.validationChecklist, item => (
      `${item.label}${item.command ? ` (${item.command})` : ''} — ${item.detail}`
    )),
    '',
    '## Missing Context / Warnings',
    formatListForMarkdown(debugContext.warnings),
  ].join('\n');
}

function buildPdfDebugSnapshot(debugContext) {
  return {
    hasInput: Boolean(debugContext.hasInput),
    confidence: debugContext.confidence,
    coverage: debugContext.coverage,
    errorSummary: {
      type: redactDebugText(debugContext.errorSummary?.type || ''),
      message: redactDebugText(debugContext.errorSummary?.message || '')
    },
    parsedFrames: safeArray(debugContext.parsedFrames).slice(0, 10).map(frame => ({
      fileReference: frame.fileReference,
      functionName: frame.functionName,
      line: frame.line,
      column: frame.column,
      raw: redactDebugText(frame.raw || '')
    })),
    matchedFiles: safeArray(debugContext.matchedFiles).slice(0, 12),
    rootCauseCandidates: safeArray(debugContext.rootCauseCandidates).slice(0, 8),
    dependencyTrace: {
      available: Boolean(debugContext.dependencyTrace?.available),
      reason: debugContext.dependencyTrace?.reason || '',
      relatedFiles: safeArray(debugContext.dependencyTrace?.relatedFiles).slice(0, 12),
      tracePaths: safeArray(debugContext.dependencyTrace?.tracePaths).slice(0, 12),
      coverage: debugContext.dependencyTrace?.coverage || {}
    },
    inspectionOrder: safeArray(debugContext.inspectionOrder).slice(0, 10),
    validationChecklist: safeArray(debugContext.validationChecklist).slice(0, 10),
    warnings: safeArray(debugContext.warnings).slice(0, 10),
    apiRoutes: safeArray(debugContext.apiRoutes).slice(0, 10)
  };
}

function getDebugAIStatus(aiDebugState) {
  if (aiDebugState.status === 'loading') {
    return {
      label: 'Enhancing...',
      variant: 'medium',
      detail: 'AI is reviewing the trace; deterministic local analysis remains visible.',
    };
  }
  if (aiDebugState.status === 'enhanced') {
    return {
      label: 'AI enhanced',
      variant: 'success',
      detail: 'AI analysis is shown alongside the local deterministic result.',
    };
  }
  if (aiDebugState.status === 'fallback') {
    return {
      label: 'Local fallback',
      variant: 'warning',
      detail: aiDebugState.error || 'AI is unavailable or returned unusable output; deterministic local analysis is still ready.',
    };
  }

  return {
    label: 'Deterministic local',
    variant: 'info',
    detail: 'Local parsing, dependency tracing, and scoring are available before AI runs.',
  };
}

function DebugMetric({ label, value }) {
  return (
    <div className="ca-debug-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DebugInspectSummary({ context }) {
  const topCandidate = safeArray(context.rootCauseCandidates)[0];
  const dependencyMode = getDependencyMode(context);

  if (!context.hasInput) {
    return (
      <section className="ca-debug-inspect-summary ca-debug-inspect-summary--empty">
        <div>
          <span className="ca-debug-eyebrow">Inspect first</span>
          <strong>Paste an error to build a debug report.</strong>
          <p>Stack traces, API errors, browser console errors, and bug descriptions are parsed locally before AI enhancement.</p>
        </div>
        <Badge variant="info">Ready</Badge>
      </section>
    );
  }

  if (!topCandidate) {
    return (
      <section className="ca-debug-inspect-summary ca-debug-inspect-summary--limited">
        <div>
          <span className="ca-debug-eyebrow">Inspect first</span>
          <strong>Limited parser context</strong>
          <p>Add a file path, route, line number, function name, or stack frame to map this error to repository files.</p>
        </div>
        <div className="ca-debug-summary-badges">
          <Badge variant="warning">Low confidence</Badge>
          <Badge variant={dependencyMode.variant}>{dependencyMode.label}</Badge>
        </div>
      </section>
    );
  }

  return (
    <section className="ca-debug-inspect-summary">
      <div>
        <span className="ca-debug-eyebrow">Inspect first</span>
        <strong>{topCandidate.path}</strong>
        <p>{topCandidate.hypothesis?.label || topCandidate.reason || 'Review this matched file first.'}</p>
      </div>
      <div className="ca-debug-summary-badges">
        <Badge variant={getConfidenceVariant(topCandidate.confidence)}>
          {topCandidate.score} score
        </Badge>
        <Badge variant={getConfidenceVariant(context.confidence)}>
          {formatConfidence(context.confidence)}
        </Badge>
        <Badge variant={dependencyMode.variant}>{dependencyMode.label}</Badge>
        <span>{context.coverage.parsedFrames} frames</span>
        <span>{context.coverage.matchedFiles} matches</span>
      </div>
    </section>
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
          ? 'The local parser did not find a repository-backed file path. Add a file, function, route, line number, or stack frame for stronger matching.'
          : 'Debug Navigator parses stack traces, API errors, browser console errors, and bug descriptions locally before optional AI enhancement.'}
      </span>
    </div>
  );
}

function LimitedContextNotice({ context }) {
  if (!isLimitedParserContext(context)) return null;

  return (
    <div className="ca-debug-limited-notice">
      <AlertTriangle size={16} />
      <div>
        <strong>Limited parser context</strong>
        <span>Add a stack frame, repository path, API route, line number, or function name to unlock matched files, dependency-aware tracing, and stronger root-cause scoring.</span>
      </div>
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

function AIDebugAnalysisCard({ context, aiDebugState }) {
  const analysis = aiDebugState.analysis;

  return (
    <Card title="AI Root Cause Analysis" icon={Sparkles} className="ca-debug-ai-card">
      {!context.hasInput ? (
        <EmptyResult hasInput={context.hasInput} />
      ) : aiDebugState.status === 'idle' || !analysis ? (
        <div className="ca-debug-ai-empty">
          <Sparkles size={20} />
          <div>
            <strong>Optional second pass</strong>
            <p>Run AI enhancement when you want a concise explanation and fix plan based on the deterministic context above.</p>
          </div>
        </div>
      ) : (
        <div className="ca-debug-ai-content">
          <div className="ca-debug-ai-summary">
            <div>
              <span className="ca-debug-label">Summary</span>
              <strong>{analysis.summary || 'AI analysis returned without a summary.'}</strong>
            </div>
            <Badge variant={getConfidenceVariant(analysis.confidence)}>
              {analysis.confidence || 'medium'}
            </Badge>
          </div>

          <div className="ca-debug-ai-root">
            <span className="ca-debug-label">Probable root cause</span>
            <p>{analysis.probableRootCause || 'No AI root cause was provided.'}</p>
          </div>

          <div className="ca-debug-ai-sections">
            {safeArray(analysis.reasoning).length > 0 && (
              <div className="ca-debug-ai-section">
                <h3>Reasoning</h3>
                <ul>
                  {analysis.reasoning.slice(0, 6).map(item => (
                    <li key={`ai-reason-${item}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {safeArray(analysis.suggestedFixes).length > 0 && (
              <div className="ca-debug-ai-section">
                <h3>Suggested fixes</h3>
                <ul>
                  {analysis.suggestedFixes.slice(0, 6).map(item => (
                    <li key={`ai-fix-${item}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {safeArray(analysis.filesToInspect).length > 0 && (
              <div className="ca-debug-ai-section">
                <h3>Files to inspect</h3>
                <div className="ca-debug-ai-file-list">
                  {analysis.filesToInspect.slice(0, 6).map(file => (
                    <div key={`ai-file-${file.path}`} className="ca-debug-ai-file-row">
                      <strong>{file.path}</strong>
                      <span>{file.reason}</span>
                      <Badge variant={getConfidenceVariant(file.priority)}>{file.priority || 'medium'}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {safeArray(analysis.validationPlan).length > 0 && (
              <div className="ca-debug-ai-section">
                <h3>Validation plan</h3>
                <ul>
                  {analysis.validationPlan.slice(0, 6).map(item => (
                    <li key={`ai-validation-${item.label}-${item.command}`}>
                      <span>{item.label}</span>
                      {item.command && <code>{item.command}</code>}
                      {item.detail && <p>{item.detail}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {safeArray(analysis.risks).length > 0 && (
              <div className="ca-debug-ai-section ca-debug-ai-section--warning">
                <h3>Risks</h3>
                <ul>
                  {analysis.risks.slice(0, 5).map(item => (
                    <li key={`ai-risk-${item}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {safeArray(analysis.missingContext).length > 0 && (
              <div className="ca-debug-ai-section ca-debug-ai-section--muted">
                <h3>Missing context</h3>
                <ul>
                  {analysis.missingContext.slice(0, 5).map(item => (
                    <li key={`ai-missing-${item}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
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
  const [aiDebugState, setAIDebugState] = useState(INITIAL_AI_DEBUG_STATE);
  const [reportFeedback, setReportFeedback] = useState(INITIAL_REPORT_FEEDBACK);
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
  useEffect(() => {
    if (!repoData) return;

    if (!debugContext.hasInput) {
      clearPdfState('debug-navigator', repoData);
      return;
    }

    savePdfState('debug-navigator', repoData, {
      hasInput: true,
      redactedInput: redactDebugText(errorText),
      debugContext: buildPdfDebugSnapshot(debugContext),
      graphSummary: {
        nodes: safeArray(graphModel.nodes).map(node => ({
          id: node.id,
          label: node.data?.label || node.id,
          type: node.data?.type || node.type || ''
        })),
        edges: safeArray(graphModel.edges).map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label || edge.data?.label || ''
        }))
      },
      aiStatus: aiDebugState.status
    });
  }, [repoData, errorText, debugContext, graphModel, aiDebugState.status]);
  const aiStatus = getDebugAIStatus(aiDebugState);
  const dependencyMode = getDependencyMode(debugContext);
  const canEnhanceWithAI = Boolean(
    debugContext.hasInput &&
    (debugContext.parsedFrames.length > 0 || debugContext.matchedFiles.length > 0 || debugContext.rootCauseCandidates.length > 0)
  );
  const canExportReport = Boolean(debugContext.hasInput);

  const updateErrorText = useCallback((value) => {
    setErrorText(value);
    setAIDebugState(INITIAL_AI_DEBUG_STATE);
    setReportFeedback(INITIAL_REPORT_FEEDBACK);
  }, []);

  const showReportFeedback = useCallback((status, message) => {
    setReportFeedback({ status, message });
    window.setTimeout(() => {
      setReportFeedback(INITIAL_REPORT_FEEDBACK);
    }, 2400);
  }, []);

  const handleEnhanceWithAI = useCallback(async () => {
    if (!canEnhanceWithAI || aiDebugState.status === 'loading') return;

    setAIDebugState({ status: 'loading', analysis: null, error: '' });

    try {
      const response = await fetch('/api/ai/debug-navigator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildDebugAIPayload(debugContext, errorText, repoData)),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'AI Debug Navigator request failed.');
      }

      if (result.mode === 'ai-enhanced') {
        setAIDebugState({
          status: 'enhanced',
          analysis: result.analysis,
          error: '',
        });
        return;
      }

      setAIDebugState({
        status: 'fallback',
        analysis: result.analysis || buildLocalDebugAnalysis(debugContext),
        error: result.error || 'AI is unavailable right now; local deterministic analysis is still ready.',
      });
    } catch (error) {
      setAIDebugState({
        status: 'fallback',
        analysis: buildLocalDebugAnalysis(debugContext),
        error: error?.message || 'AI is unavailable right now; local deterministic analysis is still ready.',
      });
    }
  }, [aiDebugState.status, canEnhanceWithAI, debugContext, errorText, repoData]);

  const handleCopyReport = useCallback(async () => {
    if (!canExportReport) return;

    try {
      const markdown = buildDebugReportMarkdown(debugContext, errorText, aiDebugState);
      await navigator.clipboard.writeText(markdown);
      showReportFeedback('success', 'Debug report copied to clipboard.');
    } catch (error) {
      showReportFeedback('error', error?.message || 'Could not copy debug report.');
    }
  }, [aiDebugState, canExportReport, debugContext, errorText, showReportFeedback]);

  const handleExportReport = useCallback(() => {
    if (!canExportReport) return;

    try {
      const markdown = buildDebugReportMarkdown(debugContext, errorText, aiDebugState);
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'codeatlas-debug-report.md';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      showReportFeedback('success', 'Markdown report exported.');
    } catch (error) {
      showReportFeedback('error', error?.message || 'Could not export debug report.');
    }
  }, [aiDebugState, canExportReport, debugContext, errorText, showReportFeedback]);

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
            onChange={(event) => updateErrorText(event.target.value)}
            placeholder="Paste stack trace, browser console error, API response, or broken-feature description..."
            rows={8}
          />
          <div className="ca-debug-examples">
            {EXAMPLE_INPUTS.map(example => (
              <button
                key={example.label}
                type="button"
                onClick={() => updateErrorText(example.value)}
              >
                {example.label}
              </button>
            ))}
            <button type="button" onClick={() => updateErrorText('')} disabled={!errorText}>
              Clear
            </button>
          </div>
        </div>
      </Card>

      <div className="ca-debug-context-strip">
        <Badge variant={getConfidenceVariant(debugContext.confidence)}>
          {formatConfidence(debugContext.confidence)}
        </Badge>
        <Badge variant="info">Deterministic local</Badge>
        <Badge variant={dependencyMode.variant}>{dependencyMode.label}</Badge>
        <span>{debugContext.coverage.parsedFrames} parsed frames</span>
        <span>{debugContext.coverage.matchedFiles} matched files</span>
        <span>{debugContext.apiRoutes.length} API routes</span>
        <span>{hasArchitectureContext ? 'Architecture context available' : 'Architecture context unavailable'}</span>
        <span>{hasPlannerNotes ? 'Planner notes available' : 'Planner notes unavailable'}</span>
      </div>

      <div className={`ca-debug-ai-status ca-debug-ai-status--${aiDebugState.status}`}>
        <div className="ca-debug-ai-status-main">
          <Badge variant={aiStatus.variant}>{aiStatus.label}</Badge>
          {aiDebugState.status === 'loading' && <Loader2 size={15} className="ca-debug-loading-icon" />}
          <span>{aiStatus.detail}</span>
        </div>
        <div className="ca-debug-report-actions">
          <button
            type="button"
            onClick={handleEnhanceWithAI}
            disabled={!canEnhanceWithAI || aiDebugState.status === 'loading'}
          >
            <Sparkles size={15} />
            Enhance with AI
          </button>
          <button type="button" onClick={handleCopyReport} disabled={!canExportReport}>
            <Clipboard size={15} />
            Copy Report
          </button>
          <button type="button" onClick={handleExportReport} disabled={!canExportReport}>
            <Download size={15} />
            Export Markdown
          </button>
        </div>
      </div>

      {reportFeedback.message && (
        <div className={`ca-debug-report-feedback ca-debug-report-feedback--${reportFeedback.status}`}>
          {reportFeedback.message}
        </div>
      )}

      <WarningsCard warnings={debugContext.warnings} />
      <LimitedContextNotice context={debugContext} />

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

      <DebugInspectSummary context={debugContext} />

      <div className="ca-debug-grid">
        <ErrorSummaryCard context={debugContext} />
        <RootCauseCard context={debugContext} />
        <AIDebugAnalysisCard context={debugContext} aiDebugState={aiDebugState} />
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
