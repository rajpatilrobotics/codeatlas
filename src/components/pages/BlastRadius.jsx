import React, { useMemo, useState, useEffect } from 'react';
import { Target, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import { calculateBlastRadius } from '../../utils/repository/blastRadiusAnalysis.js';

const IMPACTED_FILE_DISPLAY_LIMIT = 80;
const SERVICE_DISPLAY_LIMIT = 18;
const IMPACT_REASON_DISPLAY_LIMIT = 10;

const IMPACT_DIRECTIONS = [
  { id: 'both', label: 'Both' },
  { id: 'upstream', label: 'Upstream' },
  { id: 'downstream', label: 'Downstream' }
];

const getFilePath = (file) => {
  if (typeof file === 'string') {
    return file.trim();
  }
  if (typeof file?.path === 'string') {
    return file.path.trim();
  }
  return '';
};

const getFileName = (path) => path.split('/').pop() || path;

const getDirectoryName = (path) => {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || 'root';
};

const normalizeSearch = (value) => value.trim().toLowerCase();

const getDirectionLabel = (direction) => (
  IMPACT_DIRECTIONS.find(item => item.id === direction)?.label || 'Both'
);

const formatAnalysisMode = (mode) => (mode === 'dependency-graph' ? 'Graph' : 'Fallback');

const formatRole = (role) => {
  switch (role) {
    case 'source':
      return 'Source';
    case 'dependency':
      return 'Dependency';
    case 'dependent':
      return 'Dependent';
    case 'related':
      return 'Related';
    default:
      return 'Impacted';
  }
};

const fileMatchesSearch = (path, query) => {
  if (!query) {
    return true;
  }

  const fileName = getFileName(path).toLowerCase();
  const directory = getDirectoryName(path).toLowerCase();
  const fullPath = path.toLowerCase();

  return fullPath.includes(query) || fileName.includes(query) || directory.includes(query);
};

const getSeverityIcon = (severity) => {
  switch (severity) {
    case 'critical':
      return <XCircle className="ca-blast-severity-icon ca-blast-severity-critical" />;
    case 'high':
      return <AlertTriangle className="ca-blast-severity-icon ca-blast-severity-high" />;
    case 'medium':
      return <AlertTriangle className="ca-blast-severity-icon ca-blast-severity-medium" />;
    case 'low':
    default:
      return <CheckCircle className="ca-blast-severity-icon ca-blast-severity-low" />;
  }
};

function ImpactPathList({ title, files, emptyText }) {
  return (
    <div className="ca-blast-path-card">
      <div className="ca-blast-path-card-header">
        <h4>{title}</h4>
        <span>{files.length}</span>
      </div>
      {files.length > 0 ? (
        <div className="ca-blast-path-list">
          {files.slice(0, 12).map(file => (
            <code key={file} title={file} className="ca-blast-path-pill">
              {file}
            </code>
          ))}
          {files.length > 12 && (
            <span className="ca-blast-muted">+{files.length - 12} more</span>
          )}
        </div>
      ) : (
        <p className="ca-blast-empty-note">{emptyText}</p>
      )}
    </div>
  );
}

function ImpactedFilesTable({ result, selectedFile }) {
  const impactedFiles = result?.impactedFiles || [];
  const rankedFiles = Array.isArray(result?.rankedImpactedFiles)
    ? result.rankedImpactedFiles
    : [];
  const upstreamSet = new Set(result?.upstreamFiles || []);
  const downstreamSet = new Set(result?.downstreamFiles || []);

  const getImpactLabel = (file) => {
    if (file === selectedFile) return 'Source';
    if (upstreamSet.has(file)) return 'Dependency';
    if (downstreamSet.has(file)) {
      return result.analysisMode === 'dependency-graph' ? 'Dependent' : 'Related';
    }
    return 'Impacted';
  };

  const rows = rankedFiles.length > 0
    ? rankedFiles
    : impactedFiles.map(file => ({
        path: file,
        role: getImpactLabel(file).toLowerCase(),
        confidence: 'low',
        distance: file === selectedFile ? 0 : 1,
        reason: 'Legacy impact result.',
        riskScore: 0
      }));
  const displayedRows = rows.slice(0, IMPACTED_FILE_DISPLAY_LIMIT);

  return (
    <div className="ca-blast-table-card">
      <div className="ca-blast-section-heading">
        <h4>Impacted Files</h4>
        <span>{rows.length}</span>
      </div>
      <div className="ca-blast-file-table">
        {displayedRows.map(row => {
          const label = formatRole(row.role);
          return (
            <div key={row.path} className="ca-blast-file-row" title={row.path}>
              <div className="ca-blast-file-main">
                <strong>{getFileName(row.path)}</strong>
                <span>{getDirectoryName(row.path)}</span>
                <small>{row.reason}</small>
              </div>
              <div className="ca-blast-file-meta">
                <span className={`ca-blast-file-badge ca-blast-file-badge-${label.toLowerCase()}`}>
                  {label}
                </span>
                <span className={`ca-blast-confidence ca-blast-confidence-${row.confidence}`}>
                  {row.confidence}
                </span>
                <span className="ca-blast-depth">d{row.distance}</span>
              </div>
            </div>
          );
        })}
      </div>
      {rows.length > IMPACTED_FILE_DISPLAY_LIMIT && (
        <p className="ca-blast-table-footnote">
          Showing {IMPACTED_FILE_DISPLAY_LIMIT} of {rows.length} ranked impacted files.
        </p>
      )}
    </div>
  );
}

function CoveragePanel({ coverage }) {
  if (!coverage) {
    return null;
  }

  return (
    <div className="ca-blast-coverage-panel">
      <div className="ca-blast-section-heading">
        <h4>Graph Coverage</h4>
        <span>{coverage.selectedIsGraphBacked ? 'Graph backed' : 'Fallback only'}</span>
      </div>
      <div className="ca-blast-coverage-grid">
        <div className="ca-blast-coverage-stat">
          <span>Total repo files</span>
          <strong>{coverage.totalFiles}</strong>
        </div>
        <div className="ca-blast-coverage-stat">
          <span>Graph-backed</span>
          <strong>{coverage.graphFiles}</strong>
        </div>
        <div className="ca-blast-coverage-stat">
          <span>Fallback-only</span>
          <strong>{coverage.fallbackFiles}</strong>
        </div>
        <div className="ca-blast-coverage-stat">
          <span>Selected mode</span>
          <strong>{formatAnalysisMode(coverage.selectedMode)}</strong>
        </div>
      </div>
      {coverage.candidateFiles && (
        <p className="ca-blast-table-footnote">
          Dependency pass fetched {coverage.fetchedFiles || 0} of {coverage.candidateFiles} candidates
          {typeof coverage.coverageRatio === 'number' ? ` · ${Math.round(coverage.coverageRatio * 100)}% graph coverage` : ''}.
        </p>
      )}
    </div>
  );
}

function RiskFactorsPanel({ factors }) {
  const riskFactors = Array.isArray(factors) ? factors : [];

  return (
    <div className="ca-blast-insight-card">
      <div className="ca-blast-section-heading">
        <h4>Risk Factors</h4>
        <span>{riskFactors.length}</span>
      </div>
      {riskFactors.length > 0 ? (
        <div className="ca-blast-risk-list">
          {riskFactors.map(factor => (
            <div key={factor.id} className="ca-blast-risk-chip" title={factor.description}>
              <strong>{factor.label}</strong>
              <span>{factor.source === 'selected' ? 'selected' : 'related'} +{factor.weight}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="ca-blast-empty-note">No elevated path or file-type risk signals.</p>
      )}
    </div>
  );
}

function ImpactReasonsPanel({ reasons }) {
  const impactReasons = Array.isArray(reasons) ? reasons.slice(0, IMPACT_REASON_DISPLAY_LIMIT) : [];

  return (
    <div className="ca-blast-insight-card ca-blast-reason-card">
      <div className="ca-blast-section-heading">
        <h4>Why Impacted?</h4>
        <span>{Array.isArray(reasons) ? reasons.length : 0}</span>
      </div>
      {impactReasons.length > 0 ? (
        <div className="ca-blast-reason-list">
          {impactReasons.map(reason => (
            <div key={`${reason.type}-${reason.file}`} className="ca-blast-reason-row">
              <div>
                <strong>{reason.label}</strong>
                <span>{reason.description}</span>
              </div>
              <code title={(reason.chain || []).join(' -> ')}>
                {(reason.chain || []).join(' -> ')}
              </code>
            </div>
          ))}
          {Array.isArray(reasons) && reasons.length > IMPACT_REASON_DISPLAY_LIMIT && (
            <p className="ca-blast-table-footnote">
              Showing {IMPACT_REASON_DISPLAY_LIMIT} of {reasons.length} explanations.
            </p>
          )}
        </div>
      ) : (
        <p className="ca-blast-empty-note">No additional impact reasons found.</p>
      )}
    </div>
  );
}

function TestingRecommendationsPanel({ recommendations }) {
  const items = Array.isArray(recommendations) ? recommendations : [];

  return (
    <div className="ca-blast-insight-card">
      <div className="ca-blast-section-heading">
        <h4>Testing Recommendations</h4>
        <span>{items.length}</span>
      </div>
      {items.length > 0 ? (
        <div className="ca-blast-recommendation-list">
          {items.map(item => (
            <div key={item.id} className="ca-blast-recommendation-row">
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="ca-blast-empty-note">No targeted testing recommendations generated.</p>
      )}
    </div>
  );
}

function BlastRadius({ repoData }) {
  const [selectedFile, setSelectedFile] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [impactDirection, setImpactDirection] = useState('both');
  const [blastRadius, setBlastRadius] = useState(null);
  const [reasoning, setReasoning] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const repositoryFiles = useMemo(() => {
    const sourceFiles = Array.isArray(repoData?.fileTree) && repoData.fileTree.length > 0
      ? repoData.fileTree
      : Array.isArray(repoData?.fileStructure) && repoData.fileStructure.length > 0
        ? repoData.fileStructure
        : [];

    return Array.from(new Set(sourceFiles.map(getFilePath).filter(Boolean)));
  }, [repoData]);

  const filteredRepositoryFiles = useMemo(() => {
    const query = normalizeSearch(fileSearch);
    return repositoryFiles.filter(path => fileMatchesSearch(path, query));
  }, [fileSearch, repositoryFiles]);

  const graphFileSet = useMemo(() => new Set(
    (repoData?.dependencyGraph?.nodes || [])
      .map(node => getFilePath(node?.path || String(node?.id || '').replace(/^file:/, '')))
      .filter(Boolean)
  ), [repoData]);

  const selectedIsGraphBacked = graphFileSet.has(selectedFile);

  const coverageSummary = useMemo(() => ({
    totalFiles: repositoryFiles.length,
    graphFiles: graphFileSet.size,
    fallbackFiles: Math.max(repositoryFiles.length - graphFileSet.size, 0),
    selectedFile,
    selectedMode: selectedIsGraphBacked ? 'dependency-graph' : 'fallback',
    selectedIsGraphBacked
  }), [graphFileSet.size, repositoryFiles.length, selectedFile, selectedIsGraphBacked]);

  useEffect(() => {
    if (repositoryFiles.length > 0) {
      setSelectedFile(repositoryFiles[0]);
    } else {
      setSelectedFile('');
    }
    setFileSearch('');
    setBlastRadius(null);
    setReasoning('');
  }, [repositoryFiles]);

  useEffect(() => {
    if (filteredRepositoryFiles.length === 0) {
      setSelectedFile('');
      return;
    }

    if (!filteredRepositoryFiles.includes(selectedFile)) {
      setSelectedFile(filteredRepositoryFiles[0]);
    }
  }, [filteredRepositoryFiles, selectedFile]);

  const handleFileSearchChange = (event) => {
    setFileSearch(event.target.value);
    setBlastRadius(null);
    setReasoning('');
  };

  const clearFileSearch = () => {
    setFileSearch('');
    setBlastRadius(null);
    setReasoning('');
  };

  const handleSelectedFileChange = (event) => {
    setSelectedFile(event.target.value);
    setBlastRadius(null);
    setReasoning('');
  };

  const handleDirectionChange = (direction) => {
    setImpactDirection(direction);
    setBlastRadius(null);
    setReasoning('');
  };

  const analyzeBlastRadius = async () => {
    if (!selectedFile || !repoData) {
      return;
    }

    setIsAnalyzing(true);
    setReasoning('');

    try {
      const result = calculateBlastRadius(
        selectedFile,
        repositoryFiles,
        [],
        repoData?.dependencyGraph,
        { direction: impactDirection }
      );

      setBlastRadius(result);

      const response = await fetch('/api/ai/blast-radius', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blastRadius: result, repoData })
      });
      const apiResult = await response.json();

      if (apiResult.success) {
        setReasoning(apiResult.reasoning);
      } else {
        console.error('Failed to get AI reasoning:', apiResult.error);
      }
    } catch (error) {
      console.error('Error analyzing blast radius:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!repoData) {
    return (
      <Card title="Blast Radius Analysis">
        <EmptyState
          icon={Target}
          title="Impact visualization"
          description="See how changes propagate across modules, services, and dependencies. Connect your repository for live blast radius mapping."
        />
      </Card>
    );
  }

  const impactedServices = blastRadius?.impactedServices || [];
  const upstreamFiles = blastRadius?.upstreamFiles || [];
  const downstreamFiles = blastRadius?.downstreamFiles || [];
  const displayedDirection = blastRadius?.direction || impactDirection;
  const showUpstreamPanel = displayedDirection !== 'downstream';
  const showDownstreamPanel = displayedDirection !== 'upstream';
  const activeCoverage = blastRadius?.coverage || coverageSummary;
  const downstreamTitle = blastRadius?.analysisMode === 'dependency-graph'
    ? 'Downstream dependents'
    : 'Related files';
  const downstreamEmpty = blastRadius?.analysisMode === 'dependency-graph'
    ? 'No direct dependents found.'
    : 'No nearby files found.';
  const hasFileSearch = normalizeSearch(fileSearch).length > 0;
  const fileSearchSummary = hasFileSearch
    ? `${filteredRepositoryFiles.length} of ${repositoryFiles.length} files`
    : `${repositoryFiles.length} files`;

  return (
    <Card title="Blast Radius Analysis" className="ca-blast-card">
      <div className="ca-blast-controls">
        <div className="ca-blast-control-row">
          <label htmlFor="blast-radius-file-select">Select file to analyze</label>
          <span className={`ca-blast-mode-pill ${selectedIsGraphBacked ? 'is-graph' : ''}`}>
            {selectedIsGraphBacked ? 'Dependency graph' : 'File list'}
          </span>
        </div>
        <div className="ca-blast-search-row">
          <input
            id="blast-radius-file-search"
            type="search"
            value={fileSearch}
            onChange={handleFileSearchChange}
            placeholder="Search by path, filename, or directory"
            className="ca-blast-search-input"
          />
          <span className="ca-blast-search-count">{fileSearchSummary}</span>
          {hasFileSearch && (
            <button
              type="button"
              className="ca-blast-clear-search"
              onClick={clearFileSearch}
            >
              Clear
            </button>
          )}
        </div>
        <div className="ca-blast-direction-row">
          <span>Impact direction</span>
          <div className="ca-blast-direction-group" role="group" aria-label="Impact direction">
            {IMPACT_DIRECTIONS.map(direction => (
              <button
                key={direction.id}
                type="button"
                className={`ca-blast-direction-button ${impactDirection === direction.id ? 'is-active' : ''}`}
                onClick={() => handleDirectionChange(direction.id)}
              >
                {direction.label}
              </button>
            ))}
          </div>
        </div>
        <div className="ca-blast-input-row">
          <select
            id="blast-radius-file-select"
            value={selectedFile}
            onChange={handleSelectedFileChange}
            className="ca-blast-select"
            disabled={filteredRepositoryFiles.length === 0}
          >
            {filteredRepositoryFiles.length > 0 ? filteredRepositoryFiles.map((path, index) => (
              <option key={path || index} value={path}>
                {path}
              </option>
            )) : (
              <option value="">No matching files</option>
            )}
          </select>
          <button
            className="ca-blast-action"
            onClick={analyzeBlastRadius}
            disabled={isAnalyzing || !selectedFile || filteredRepositoryFiles.length === 0}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Impact'}
          </button>
        </div>
      </div>

      <CoveragePanel coverage={activeCoverage} />

      {blastRadius && (
        <div className="ca-blast-results">
          <div className={`ca-blast-summary ca-blast-summary-${blastRadius.severity}`}>
            <div className="ca-blast-summary-item ca-blast-summary-primary">
              {getSeverityIcon(blastRadius.severity)}
              <div>
                <span>Severity</span>
                <strong>{blastRadius.severity.toUpperCase()}</strong>
              </div>
            </div>
            <div className="ca-blast-summary-item">
              <span>Impact Score</span>
              <strong>{blastRadius.totalImpact}</strong>
            </div>
            <div className="ca-blast-summary-item">
              <span>Files</span>
              <strong>{blastRadius.impactedFiles.length}</strong>
            </div>
            <div className="ca-blast-summary-item">
              <span>Confidence</span>
              <strong>{(blastRadius.confidence || 'low').toUpperCase()}</strong>
            </div>
          </div>

          <div className="ca-blast-selected-panel">
            <span>Selected file</span>
            <code title={selectedFile}>{selectedFile}</code>
            <strong className="ca-blast-limit-note">
              {formatAnalysisMode(blastRadius.analysisMode)} / {getDirectionLabel(blastRadius.direction)}
              {blastRadius.isLimited ? ' / capped' : ''}
            </strong>
          </div>

          {blastRadius.impactSummary && (
            <div className="ca-blast-output-summary">
              <strong>Output summary</strong>
              <span>{blastRadius.impactSummary}</span>
            </div>
          )}

          <div className="ca-blast-path-grid">
            {showUpstreamPanel && (
              <ImpactPathList
                title="Upstream dependencies"
                files={upstreamFiles}
                emptyText="No imported dependencies found."
              />
            )}
            {showDownstreamPanel && (
              <ImpactPathList
                title={downstreamTitle}
                files={downstreamFiles}
                emptyText={downstreamEmpty}
              />
            )}
          </div>

          <ImpactedFilesTable result={blastRadius} selectedFile={selectedFile} />

          <div className="ca-blast-insight-grid">
            <RiskFactorsPanel factors={blastRadius.riskFactors} />
            <ImpactReasonsPanel reasons={blastRadius.impactReasons} />
            <TestingRecommendationsPanel recommendations={blastRadius.testRecommendations} />
          </div>

          {impactedServices.length > 0 && (
            <div className="ca-blast-services">
              <div className="ca-blast-section-heading">
                <h4>Impacted Services</h4>
                <span>{impactedServices.length}</span>
              </div>
              <div className="ca-blast-service-list">
                {impactedServices.slice(0, SERVICE_DISPLAY_LIMIT).map(service => (
                  <span key={service} className="ca-blast-service-chip">
                    {service}
                  </span>
                ))}
                {impactedServices.length > SERVICE_DISPLAY_LIMIT && (
                  <span className="ca-blast-muted">+{impactedServices.length - SERVICE_DISPLAY_LIMIT} more</span>
                )}
              </div>
            </div>
          )}

          {reasoning && (
            <div className="ca-blast-reasoning">
              <h4>AI Analysis</h4>
              <p>{reasoning}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default BlastRadius;
