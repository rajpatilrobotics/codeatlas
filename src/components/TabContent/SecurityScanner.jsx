import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  Download,
  FileText,
  GitBranch,
  Loader2,
  Lock,
  Network,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  Upload,
  XCircle
} from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { buildSecurityScan, importExternalSecurityScan, redactEvidence } from '../../utils/security/buildSecurityScan';

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];
const CONFIDENCE_ORDER = ['high', 'medium', 'low'];
const SEVERITY_VARIANT = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  info: 'info'
};

const SOURCE_LABELS = {
  'local-code-rule': 'Code rule',
  'local-secret-scanner': 'Secret scanner',
  'dependency-vulnerability': 'Dependency vuln',
  'config-rule': 'Config rule',
  'external-sarif': 'External SARIF',
  'ai-explanation': 'AI explanation'
};

const SECURITY_VIEWS = [
  { id: 'overview', label: 'Overview' },
  { id: 'findings', label: 'Findings' },
  { id: 'secrets', label: 'Secrets' },
  { id: 'dependencies', label: 'Dependencies' },
  { id: 'supply-chain', label: 'Supply Chain' },
  { id: 'external', label: 'External Scans' },
  { id: 'risky-files', label: 'Risky Files' },
  { id: 'ai', label: 'AI Explanation' },
  { id: 'export', label: 'Export' }
];

const pageStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '18px'
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: '12px'
};

const cardMetricStyle = {
  padding: '14px',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  background: 'rgba(255,255,255,0.03)'
};

const actionButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '9px 12px',
  borderRadius: '9px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.05)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer'
};

const disabledButtonStyle = {
  ...actionButtonStyle,
  opacity: 0.45,
  cursor: 'not-allowed'
};

const tabButtonStyle = isActive => ({
  ...actionButtonStyle,
  padding: '8px 11px',
  background: isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
  borderColor: isActive ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)'
});

const selectStyle = {
  minWidth: 0,
  padding: '10px 12px',
  borderRadius: '9px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.22)',
  color: 'var(--text-primary)',
  fontSize: '13px'
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getRepoCacheKey(repoData, codeAnalysis) {
  if (!repoData?.repoInfo) return '';
  return [
    'securityScan',
    'market-grade-v1',
    repoData.repoInfo.url || repoData.repoInfo.name || 'repo',
    repoData.repoInfo.updatedAt || 'unknown-update',
    repoData.fileCount || repoData.fileTree?.length || 0,
    codeAnalysis?.summary?.analyzedFiles || 0
  ].join(':');
}

function getSourceCounts(findings) {
  return findings.reduce((acc, finding) => {
    acc[finding.source] = (acc[finding.source] || 0) + 1;
    return acc;
  }, {});
}

function getSeverityCounts(findings) {
  return SEVERITY_ORDER.reduce((acc, severity) => {
    acc[severity] = findings.filter(finding => finding.severity === severity).length;
    return acc;
  }, {});
}

function getConfidenceCounts(findings) {
  return CONFIDENCE_ORDER.reduce((acc, confidence) => {
    acc[confidence] = findings.filter(finding => finding.confidence === confidence).length;
    return acc;
  }, {});
}

function getPackageScripts(repoData) {
  return Object.entries(repoData?.packageJson?.scripts || {})
    .map(([name, command]) => ({ name, command }))
    .slice(0, 10);
}

function findingToMarkdown(finding) {
  return [
    `### ${finding.title}`,
    `- ID: ${finding.id}`,
    `- Severity: ${finding.severity}`,
    `- Confidence: ${finding.confidence}`,
    `- Source: ${finding.source}`,
    `- Source tool: ${finding.sourceTool || 'n/a'}`,
    `- Rule: ${finding.ruleId || 'n/a'}`,
    `- CWE: ${safeArray(finding.cwe).join(', ') || 'n/a'}`,
    `- OWASP: ${finding.owasp || 'n/a'}`,
    `- File: ${finding.file}${finding.line ? `:${finding.line}` : ''}`,
    `- Evidence: ${finding.redactedEvidence || finding.evidence || 'n/a'}`,
    `- Impact: ${finding.impact}`,
    `- Recommendation: ${finding.recommendation}`,
    ''
  ].join('\n');
}

function buildMarkdownReport(scan, options = {}) {
  if (!scan) return '';
  const reportFindings = safeArray(options.findings).length ? safeArray(options.findings) : scan.findings;
  const lines = [
    `# ${options.title || 'CodeAtlas Security Report'}`,
    '',
    `Generated: ${scan.generatedAt}`,
    `Source: ${scan.source}`,
    `Score: ${scan.score?.overall}/100 (${scan.score?.level})`,
    '',
    '## Coverage',
    ''
  ];

  Object.entries(scan.sections?.coverage || {}).forEach(([key, value]) => {
    lines.push(`- ${key}: ${value}`);
  });

  lines.push('', '## Findings', '');
  if (reportFindings.length === 0) {
    lines.push('No deterministic findings detected in the analyzed repository context.');
  } else {
    reportFindings.forEach(finding => lines.push(findingToMarkdown(finding)));
  }

  lines.push('## Fix Checklist', '');
  safeArray(scan.sections?.fixChecklist).forEach(item => {
    lines.push(`- [ ] ${item.title} (${item.file}): ${item.action}`);
  });

  if (scan.aiExplanation) {
    lines.push('', '## AI Security Explanation', '');
    lines.push(scan.aiExplanation.summary || '');
    safeArray(scan.aiExplanation.fixStrategy).forEach(item => {
      lines.push(`- ${item.title}: ${item.detail}`);
    });
  }

  return lines.join('\n');
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildExternalScannerWorkflow() {
  return `name: CodeAtlas External Security Scans

on:
  workflow_dispatch:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  security-events: write

jobs:
  codeql:
    name: CodeQL SARIF
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
      - uses: github/codeql-action/analyze@v3
        with:
          output: codeql-results
          upload: false
      - uses: actions/upload-artifact@v4
        with:
          name: codeql-sarif
          path: codeql-results/*.sarif

  semgrep:
    name: Semgrep SARIF
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep:latest
    steps:
      - uses: actions/checkout@v4
      - run: semgrep scan --config p/owasp-top-ten --sarif --output semgrep-results.sarif
      - uses: actions/upload-artifact@v4
        with:
          name: semgrep-sarif
          path: semgrep-results.sarif
`;
}

function MetricTile({ label, value, detail, icon: Icon }) {
  return (
    <div style={cardMetricStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        {Icon && <Icon size={16} style={{ color: 'var(--text-secondary)' }} />}
        <span style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
          {label}
        </span>
      </div>
      <strong style={{ color: 'var(--text-primary)', fontSize: '28px', lineHeight: 1 }}>{value}</strong>
      {detail && <p style={{ color: 'var(--text-secondary)', margin: '7px 0 0', fontSize: '12px', lineHeight: 1.35 }}>{detail}</p>}
    </div>
  );
}

function FindingRow({ finding, reviewOnly = false, onCopy, onMarkReviewOnly }) {
  return (
    <div style={{
      padding: '14px',
      border: reviewOnly ? '1px solid rgba(245,158,11,0.28)' : '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px',
      background: 'rgba(255,255,255,0.03)',
      display: 'grid',
      gap: '10px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <Badge variant={SEVERITY_VARIANT[finding.severity] || 'info'}>{finding.severity}</Badge>
            <Badge variant="info">{SOURCE_LABELS[finding.source] || finding.source}</Badge>
            <Badge variant="low">{finding.confidence} confidence</Badge>
            {finding.ruleId && <Badge variant="info">{finding.ruleId}</Badge>}
            {finding.owasp && <Badge variant="warning">{finding.owasp.split('/')[0]}</Badge>}
            {(finding.confidence === 'low' || finding.severity === 'info') && <Badge variant="warning">review note</Badge>}
            {reviewOnly && <Badge variant="warning">marked review-only</Badge>}
          </div>
          <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '15px', fontWeight: 800 }}>{finding.title}</h4>
        </div>
        <div style={{ display: 'grid', gap: '8px', justifyItems: 'end' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'monospace', alignSelf: 'flex-start' }}>
            {finding.file}{finding.line ? `:${finding.line}` : ''}
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {onCopy && (
              <button type="button" style={{ ...actionButtonStyle, padding: '6px 8px', fontSize: '11px' }} onClick={() => onCopy(finding)}>
                <Copy size={13} /> Copy finding
              </button>
            )}
            {onMarkReviewOnly && (
              <button type="button" style={{ ...actionButtonStyle, padding: '6px 8px', fontSize: '11px' }} onClick={() => onMarkReviewOnly(finding.id)}>
                {reviewOnly ? 'Unmark review-only' : 'Mark review-only'}
              </button>
            )}
          </div>
        </div>
      </div>
      {(finding.redactedEvidence || finding.evidence) && (
        <pre style={{
          margin: 0,
          padding: '10px',
          borderRadius: '8px',
          background: 'rgba(0,0,0,0.28)',
          color: 'var(--text-secondary)',
          fontSize: '11px',
          overflowX: 'auto'
        }}>
          <code>{redactEvidence(finding.redactedEvidence || finding.evidence)}</code>
        </pre>
      )}
      <div style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.45 }}>
        <span><strong style={{ color: 'var(--text-primary)' }}>Impact:</strong> {finding.impact}</span>
        <span><strong style={{ color: 'var(--text-primary)' }}>Fix:</strong> {finding.recommendation}</span>
        {finding.blastRadius && (
          <span>
            <strong style={{ color: 'var(--text-primary)' }}>Blast radius:</strong>{' '}
            {finding.blastRadius.impactedFilesCount || 0} impacted files, {finding.blastRadius.confidence} confidence
          </span>
        )}
      </div>
      <details style={{
        borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingTop: '8px'
      }}>
        <summary style={{ color: 'var(--text-primary)', cursor: 'pointer', fontSize: '12px', fontWeight: 800 }}>
          Rule evidence and fix details
        </summary>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '8px',
          marginTop: '10px'
        }}>
          <div style={cardMetricStyle}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 800 }}>Source tool</span>
            <p style={{ color: 'var(--text-primary)', margin: '6px 0 0', fontSize: '12px' }}>{finding.sourceTool || finding.source}</p>
          </div>
          <div style={cardMetricStyle}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 800 }}>CWE / OWASP</span>
            <p style={{ color: 'var(--text-primary)', margin: '6px 0 0', fontSize: '12px' }}>
              {safeArray(finding.cwe).join(', ') || 'n/a'} · {finding.owasp || 'n/a'}
            </p>
          </div>
          <div style={cardMetricStyle}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 800 }}>Fingerprint</span>
            <p style={{ color: 'var(--text-primary)', margin: '6px 0 0', fontSize: '12px', fontFamily: 'monospace' }}>{finding.fingerprint || 'n/a'}</p>
          </div>
          {finding.secret && (
            <div style={cardMetricStyle}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 800 }}>Secret detector</span>
              <p style={{ color: 'var(--text-primary)', margin: '6px 0 0', fontSize: '12px' }}>
                {finding.secret.detector} · {finding.secret.verified || 'unverified'} · entropy {finding.secret.entropy || 0}
              </p>
            </div>
          )}
        </div>
        {safeArray(finding.dataFlow).length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 800 }}>Probable data flow</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {finding.dataFlow.map((step, index) => (
                <Badge key={`${step.kind}-${index}`} variant="info">{step.kind}: {step.detail}</Badge>
              ))}
            </div>
          </div>
        )}
        {safeArray(finding.whyMatched).length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 800 }}>Why it matched</span>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.5, margin: '6px 0 0', paddingLeft: '18px' }}>
              {safeArray(finding.whyMatched).map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
        )}
        {safeArray(finding.falsePositiveNotes).length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 800 }}>False-positive notes</span>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.5, margin: '6px 0 0', paddingLeft: '18px' }}>
              {safeArray(finding.falsePositiveNotes).map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
        )}
        <div style={{ marginTop: '10px', color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Fix summary:</strong> {finding.fix?.summary || finding.recommendation}
        </div>
      </details>
    </div>
  );
}

function SecurityScanner({ repoData, codeAnalysis, isCodeAnalysisLoading, onNavigate }) {
  const [securityScan, setSecurityScan] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [aiState, setAiState] = useState('idle');
  const [aiError, setAiError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [findingQuery, setFindingQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [toolFilter, setToolFilter] = useState('all');
  const [owaspFilter, setOwaspFilter] = useState('all');
  const [actionableOnly, setActionableOnly] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  const [externalScan, setExternalScan] = useState(null);
  const [reviewOnlyIds, setReviewOnlyIds] = useState(() => new Set());

  const cacheKey = useMemo(() => getRepoCacheKey(repoData, codeAnalysis), [repoData, codeAnalysis]);
  const findings = safeArray(securityScan?.findings);
  const severityCounts = useMemo(() => getSeverityCounts(findings), [findings]);
  const confidenceCounts = useMemo(() => getConfidenceCounts(findings), [findings]);
  const sourceCounts = useMemo(() => getSourceCounts(findings), [findings]);
  const sourceTools = useMemo(() => Array.from(new Set(findings.map(finding => finding.sourceTool).filter(Boolean))).sort(), [findings]);
  const owaspCategories = useMemo(() => Array.from(new Set(findings.map(finding => finding.owasp).filter(Boolean))).sort(), [findings]);
  const filteredFindings = useMemo(() => {
    const query = findingQuery.trim().toLowerCase();
    return findings.filter(finding => {
      if (severityFilter !== 'all' && finding.severity !== severityFilter) return false;
      if (confidenceFilter !== 'all' && finding.confidence !== confidenceFilter) return false;
      if (sourceFilter !== 'all' && finding.source !== sourceFilter) return false;
      if (toolFilter !== 'all' && finding.sourceTool !== toolFilter) return false;
      if (owaspFilter !== 'all' && finding.owasp !== owaspFilter) return false;
      if (reviewOnlyIds.has(finding.id) && actionableOnly) return false;
      if (actionableOnly && !(['critical', 'high', 'medium'].includes(finding.severity) && ['high', 'medium'].includes(finding.confidence))) return false;
      if (!query) return true;
      return [
        finding.title,
        finding.file,
        finding.category,
        finding.source,
        finding.sourceTool,
        finding.ruleId,
        safeArray(finding.cwe).join(' '),
        finding.owasp,
        finding.severity,
        finding.confidence,
        finding.impact,
        finding.recommendation,
        finding.redactedEvidence
      ].some(value => String(value || '').toLowerCase().includes(query));
    });
  }, [actionableOnly, confidenceFilter, findingQuery, findings, owaspFilter, reviewOnlyIds, severityFilter, sourceFilter, toolFilter]);

  const runDeterministicScan = useCallback(async ({ force = false } = {}) => {
    if (!repoData) {
      setScanError('Analyze a repository first.');
      return;
    }
    if (!force && cacheKey) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          setSecurityScan(JSON.parse(cached));
          setScanError('');
          return;
        } catch {
          sessionStorage.removeItem(cacheKey);
        }
      }
    }

    setIsScanning(true);
    setScanError('');
    setAiState('idle');
    setAiError('');

    try {
      const [sourceResponse, dependencyResponse] = await Promise.allSettled([
        fetch('/api/security/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoData })
        }).then(response => response.json()),
        fetch('/api/security/dependencies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoData })
        }).then(response => response.json())
      ]);

      const sourceResult = sourceResponse.status === 'fulfilled' ? sourceResponse.value : {
        available: false,
        reason: sourceResponse.reason?.message || 'Bounded source scan unavailable.',
        files: []
      };
      const dependencyResult = dependencyResponse.status === 'fulfilled' ? dependencyResponse.value : {
        available: false,
        reason: dependencyResponse.reason?.message || 'Dependency scan unavailable.',
        findings: []
      };

      const scan = buildSecurityScan({
        repoData,
        codeAnalysis,
        extraFiles: sourceResult.files || [],
        dependencyFindings: dependencyResult.findings || [],
        dependencyScan: {
          ...dependencyResult,
          sourceScan: {
            available: sourceResult.available !== false,
            reason: sourceResult.reason || '',
            coverage: sourceResult.coverage || null
          }
        }
      });

      const scanWithStatus = {
        ...scan,
        sections: {
          ...scan.sections,
          coverage: {
            ...scan.sections.coverage,
            sourceScan: sourceResult.available === false ? 'unavailable' : 'available',
            sourceScanReason: sourceResult.reason || '',
            dependencyCoverage: dependencyResult.coverage || null
          }
        }
      };

      setSecurityScan(scanWithStatus);
      if (cacheKey) {
        sessionStorage.setItem(cacheKey, JSON.stringify(scanWithStatus));
      }
    } catch (error) {
      console.error('Deterministic security scan failed:', error);
      setScanError(error.message || 'Deterministic security scan failed.');
    } finally {
      setIsScanning(false);
    }
  }, [cacheKey, codeAnalysis, repoData]);

  useEffect(() => {
    setSecurityScan(null);
    setScanError('');
    setAiState('idle');
    setAiError('');
    setExternalScan(null);
    setReviewOnlyIds(new Set());

    if (!cacheKey) return;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setSecurityScan(JSON.parse(cached));
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }
  }, [cacheKey]);

  useEffect(() => {
    if (repoData && !isCodeAnalysisLoading && !securityScan && !isScanning && cacheKey) {
      runDeterministicScan();
    }
  }, [cacheKey, isCodeAnalysisLoading, isScanning, repoData, runDeterministicScan, securityScan]);

  const handleRescan = () => {
    if (cacheKey) sessionStorage.removeItem(cacheKey);
    setSecurityScan(null);
    runDeterministicScan({ force: true });
  };

  const handleEnhanceAI = async () => {
    if (!securityScan) return;
    setAiState('loading');
    setAiError('');

    try {
      const response = await fetch('/api/ai/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          securityScan,
          repoContext: {
            name: repoData?.repoInfo?.name,
            language: repoData?.repoInfo?.language,
            packageScripts: getPackageScripts(repoData),
            packageManager: repoData?.packageJson ? 'npm' : ''
          }
        })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'AI explanation failed.');

      const nextScan = {
        ...securityScan,
        aiExplanation: result.explanation
      };
      setSecurityScan(nextScan);
      setAiState(result.mode === 'ai-enhanced' ? 'enhanced' : 'fallback');
      setAiError(result.error || '');
      if (cacheKey) sessionStorage.setItem(cacheKey, JSON.stringify(nextScan));
    } catch (error) {
      console.error('AI security explanation failed:', error);
      setAiState('fallback');
      setAiError(error.message || 'AI explanation unavailable. Deterministic scan remains ready.');
    }
  };

  const handleCopy = async () => {
    if (!securityScan) return;
    try {
      await navigator.clipboard.writeText(buildMarkdownReport(securityScan));
      setFeedback('Security report copied.');
    } catch {
      setFeedback('Copy failed.');
    }
    setTimeout(() => setFeedback(''), 2200);
  };

  const handleExport = () => {
    if (!securityScan) return;
    const blob = new Blob([buildMarkdownReport(securityScan)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'codeatlas-security-report.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setFeedback('Security report exported.');
    setTimeout(() => setFeedback(''), 2200);
  };

  const handleExportSarif = () => {
    if (!securityScan) return;
    downloadJson('codeatlas-security-results.sarif', securityScan.sections?.exports?.sarif || {});
    setFeedback('SARIF-style report exported.');
    setTimeout(() => setFeedback(''), 2200);
  };

  const handleExportSbom = () => {
    if (!securityScan) return;
    downloadJson('codeatlas-security-sbom.cdx.json', securityScan.sections?.exports?.cyclonedx || {});
    setFeedback('CycloneDX-style SBOM exported.');
    setTimeout(() => setFeedback(''), 2200);
  };

  const handleCopyFinding = async finding => {
    try {
      await navigator.clipboard.writeText(findingToMarkdown(finding));
      setFeedback('Finding copied with redacted evidence.');
    } catch {
      setFeedback('Copy finding failed.');
    }
    setTimeout(() => setFeedback(''), 2200);
  };

  const handleToggleReviewOnly = findingId => {
    setReviewOnlyIds(previous => {
      const next = new Set(previous);
      if (next.has(findingId)) next.delete(findingId);
      else next.add(findingId);
      return next;
    });
  };

  const handleExportFiltered = () => {
    if (!securityScan) return;
    const blob = new Blob([
      buildMarkdownReport(securityScan, {
        title: 'CodeAtlas Filtered Security Findings',
        findings: filteredFindings
      })
    ], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'codeatlas-filtered-security-findings.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setFeedback('Filtered findings exported.');
    setTimeout(() => setFeedback(''), 2200);
  };

  const handleImportExternalScan = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const payload = JSON.parse(raw);
      const imported = importExternalSecurityScan(payload, { repoKey: securityScan?.repoKey || cacheKey });
      if (!imported.available) throw new Error(imported.reason || 'Unsupported external scan file.');
      setExternalScan({
        ...imported,
        fileName: file.name,
        importedAt: new Date().toISOString()
      });
      setActiveView('external');
      setFeedback(`Imported ${imported.findings.length} external findings from ${file.name}.`);
    } catch (error) {
      setFeedback(error.message || 'External scan import failed.');
    } finally {
      event.target.value = '';
      setTimeout(() => setFeedback(''), 2600);
    }
  };

  const handleCopyExternalWorkflow = async () => {
    try {
      await navigator.clipboard.writeText(buildExternalScannerWorkflow());
      setFeedback('GitHub Actions SARIF workflow copied.');
    } catch {
      setFeedback('Copy workflow failed.');
    }
    setTimeout(() => setFeedback(''), 2200);
  };

  if (!repoData) {
    return (
      <div className="tab-content security-tab">
        <Card title="Security Scanner" icon={Shield}>
          <div style={{ textAlign: 'center', padding: '44px 20px' }}>
            <Shield size={44} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
            <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px', fontSize: '18px' }}>Analyze a repository first</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Security Scanner needs repository files, package manifests, and code analysis before it can run deterministic checks.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="tab-content security-tab fade-in" style={pageStyle}>
      <Card title="Security Overview" icon={Shield}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ maxWidth: '720px' }}>
            <Badge variant="success">Deterministic first</Badge>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '28px', margin: '12px 0 8px' }}>
              Real security findings for {repoData?.repoInfo?.name || 'this repository'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
              CodeAtlas now treats local code rules, redacted secret scanning, dependency vulnerability checks, and config rules as the source of truth. AI can explain findings, but cannot create new ones.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button style={isScanning ? disabledButtonStyle : actionButtonStyle} onClick={handleRescan} disabled={isScanning}>
              {isScanning ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
              {isScanning ? 'Scanning...' : 'Rescan'}
            </button>
            <button style={!securityScan || aiState === 'loading' ? disabledButtonStyle : actionButtonStyle} onClick={handleEnhanceAI} disabled={!securityScan || aiState === 'loading'}>
              {aiState === 'loading' ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />}
              {aiState === 'loading' ? 'Enhancing...' : 'Enhance with AI'}
            </button>
            <button style={!securityScan ? disabledButtonStyle : actionButtonStyle} onClick={handleCopy} disabled={!securityScan}>
              <Copy size={16} /> Copy
            </button>
            <button style={!securityScan ? disabledButtonStyle : actionButtonStyle} onClick={handleExport} disabled={!securityScan}>
              <Download size={16} /> Export
            </button>
            <label style={!securityScan ? disabledButtonStyle : actionButtonStyle}>
              <Upload size={16} /> Import SARIF
              <input
                type="file"
                accept=".sarif,.json,application/json"
                onChange={handleImportExternalScan}
                disabled={!securityScan}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>
        {feedback && <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '12px 0 0' }}>{feedback}</p>}
      </Card>

      {scanError && (
        <Card title="Security Scan Unavailable" icon={XCircle}>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{scanError}</p>
        </Card>
      )}

      {!securityScan && (
        <Card title={isScanning || isCodeAnalysisLoading ? 'Scanning Repository' : 'Security Scan'} icon={Lock}>
          <div style={{ textAlign: 'center', padding: '36px 20px' }}>
            {isScanning || isCodeAnalysisLoading ? (
              <>
                <Loader2 size={38} style={{ color: 'var(--text-secondary)', marginBottom: '14px', animation: 'spin 1s linear infinite' }} />
                <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', margin: '0 0 8px' }}>Running deterministic security checks</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                  Fetching bounded security-relevant files, checking secrets, evaluating code rules, and querying dependency advisories when possible.
                </p>
              </>
            ) : (
              <>
                <Shield size={38} style={{ color: 'var(--text-secondary)', marginBottom: '14px' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Run the scanner to detect real local findings.</p>
                <button style={actionButtonStyle} onClick={() => runDeterministicScan({ force: true })}>
                  <Target size={16} /> Scan Repository
                </button>
              </>
            )}
          </div>
        </Card>
      )}

      {securityScan && (
        <Card title="Security Workbench" icon={Shield}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {SECURITY_VIEWS.map(view => (
              <button
                key={view.id}
                type="button"
                style={tabButtonStyle(activeView === view.id)}
                onClick={() => setActiveView(view.id)}
              >
                {view.label}
              </button>
            ))}
          </div>
        </Card>
      )}

      {securityScan && (
        <>
          {activeView === 'overview' && (
            <>
              <div style={gridStyle}>
                <MetricTile label="Security Score" value={`${securityScan.score.overall}`} detail={`${securityScan.score.level} risk`} icon={Shield} />
                <MetricTile
                  label="Actionable"
                  value={securityScan.sections.verification?.actionableCount || 0}
                  detail={`${confidenceCounts.high || 0} high-confidence findings`}
                  icon={Target}
                />
                <MetricTile label="Critical" value={severityCounts.critical} detail={`${severityCounts.high} high findings`} icon={AlertTriangle} />
                <MetricTile label="Secrets" value={securityScan.sections.secretsExposure.count} detail="redacted evidence only" icon={Lock} />
                <MetricTile
                  label="Dependencies"
                  value={securityScan.sections.dependencyVulnerabilities.count}
                  detail={securityScan.sections.dependencyVulnerabilities.available ? 'OSV checked' : 'partial/unavailable'}
                  icon={Network}
                />
                <MetricTile label="Scanned Files" value={securityScan.sections.coverage.scannedFiles} detail={`${securityScan.sections.coverage.filesWithContent} with content`} icon={FileText} />
                <MetricTile label="Supply Chain" value={securityScan.sections.supplyChain?.count || 0} detail="posture findings" icon={GitBranch} />
                <MetricTile label="External Scans" value={externalScan?.findings?.length || 0} detail={externalScan ? externalScan.fileName : 'SARIF import ready'} icon={Upload} />
                <MetricTile label="AI Status" value={aiState === 'enhanced' ? 'On' : 'Off'} detail={aiState === 'fallback' ? 'local fallback' : 'optional explanation'} icon={Sparkles} />
              </div>

              <Card title="Scanner Reliability Guardrails" icon={CheckCircle}>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '13px', lineHeight: 1.55 }}>
                    Results are deterministic and evidence-backed. Low-confidence items are kept as review notes, while docs/examples/placeholders and generic variable names are filtered before they can affect the score.
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {safeArray(securityScan.sections.verification?.noiseControls).map(item => (
                      <Badge key={item} variant="info">{item}</Badge>
                    ))}
                  </div>
                </div>
              </Card>

              <Card title="Scanner Sources" icon={FileText}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' }}>
                  {safeArray(securityScan.sections.sourceTools).length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No source tools produced findings.</p>
                  ) : safeArray(securityScan.sections.sourceTools).map(tool => (
                    <div key={tool.tool} style={cardMetricStyle}>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{tool.tool}</strong>
                      <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0', fontSize: '12px' }}>
                        {tool.findings} findings · {tool.critical} critical · {tool.high} high
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Cross-Feature Links" icon={GitBranch}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button style={actionButtonStyle} onClick={() => onNavigate?.('heatmap')}>Open Heatmap</button>
                  <button style={actionButtonStyle} onClick={() => onNavigate?.('repository-graph')}>Open Repository Graph</button>
                  <button style={actionButtonStyle} onClick={() => onNavigate?.('blast-radius')}>Open Blast Radius</button>
                  <button style={actionButtonStyle} onClick={() => onNavigate?.('planner')}>Open Planner</button>
                </div>
              </Card>
            </>
          )}

          {activeView === 'findings' && (
          <Card title={`Detected Findings (${filteredFindings.length}/${findings.length})`} icon={AlertTriangle}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {Object.entries(sourceCounts).map(([source, count]) => (
                <Badge key={source} variant="info">{SOURCE_LABELS[source] || source}: {count}</Badge>
              ))}
              {CONFIDENCE_ORDER.map(confidence => (
                <Badge key={confidence} variant={confidence === 'high' ? 'success' : confidence === 'medium' ? 'info' : 'warning'}>
                  {confidence}: {confidenceCounts[confidence] || 0}
                </Badge>
              ))}
              {findings.length === 0 && <Badge variant="success">No deterministic findings</Badge>}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(5, minmax(130px, 0.45fr))',
              gap: '10px',
              marginBottom: '14px'
            }}>
              <input
                value={findingQuery}
                onChange={event => setFindingQuery(event.target.value)}
                placeholder="Search findings, files, evidence..."
                style={selectStyle}
              />
              <select
                value={severityFilter}
                onChange={event => setSeverityFilter(event.target.value)}
                style={selectStyle}
              >
                <option value="all">All severities</option>
                {SEVERITY_ORDER.map(severity => <option key={severity} value={severity}>{severity}</option>)}
              </select>
              <select
                value={confidenceFilter}
                onChange={event => setConfidenceFilter(event.target.value)}
                style={selectStyle}
              >
                <option value="all">All confidence</option>
                {CONFIDENCE_ORDER.map(confidence => <option key={confidence} value={confidence}>{confidence}</option>)}
              </select>
              <select
                value={sourceFilter}
                onChange={event => setSourceFilter(event.target.value)}
                style={selectStyle}
              >
                <option value="all">All sources</option>
                {Object.keys(SOURCE_LABELS).map(source => <option key={source} value={source}>{SOURCE_LABELS[source]}</option>)}
              </select>
              <select
                value={toolFilter}
                onChange={event => setToolFilter(event.target.value)}
                style={selectStyle}
              >
                <option value="all">All tools</option>
                {sourceTools.map(tool => <option key={tool} value={tool}>{tool}</option>)}
              </select>
              <select
                value={owaspFilter}
                onChange={event => setOwaspFilter(event.target.value)}
                style={selectStyle}
              >
                <option value="all">All OWASP/CWE</option>
                {owaspCategories.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <input type="checkbox" checked={actionableOnly} onChange={event => setActionableOnly(event.target.checked)} />
                Actionable only
              </label>
              <button style={actionButtonStyle} onClick={handleExportFiltered}>
                <Download size={16} /> Export filtered
              </button>
              {reviewOnlyIds.size > 0 && <Badge variant="warning">{reviewOnlyIds.size} marked review-only</Badge>}
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {findings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-secondary)' }}>
                  <CheckCircle size={36} style={{ marginBottom: '10px', color: '#10b981' }} />
                  <p style={{ margin: 0 }}>No deterministic findings were detected in the analyzed repository context.</p>
                </div>
              ) : filteredFindings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                  <p style={{ margin: '0 0 10px' }}>No findings match the current filters.</p>
                  <button
                    style={actionButtonStyle}
                    onClick={() => {
                      setFindingQuery('');
                    setSeverityFilter('all');
                    setConfidenceFilter('all');
                    setSourceFilter('all');
                    setToolFilter('all');
                    setOwaspFilter('all');
                    setActionableOnly(false);
                  }}
                >
                    Clear filters
                  </button>
                </div>
              ) : (
                filteredFindings
                  .slice()
                  .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
                  .map(finding => (
                    <FindingRow
                      key={finding.id}
                      finding={finding}
                      reviewOnly={reviewOnlyIds.has(finding.id)}
                      onCopy={handleCopyFinding}
                      onMarkReviewOnly={handleToggleReviewOnly}
                    />
                  ))
              )}
            </div>
          </Card>
          )}

          {['secrets', 'dependencies'].includes(activeView) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {activeView === 'secrets' && (
            <Card title="Secrets Exposure" icon={Lock}>
              {securityScan.sections.secretsExposure.count === 0 ? (
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No secret patterns detected. Secret redaction remains enabled for all reports.</p>
              ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {findings.filter(f => f.source === 'local-secret-scanner').slice(0, 8).map(finding => (
                    <div key={finding.id} style={cardMetricStyle}>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{finding.title}</strong>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '6px 0 0' }}>{finding.file}{finding.line ? `:${finding.line}` : ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            )}

            {activeView === 'dependencies' && (
            <Card title="Dependency Vulnerabilities" icon={Network}>
              {!securityScan.sections.dependencyVulnerabilities.available && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 12px' }}>
                  {securityScan.sections.dependencyVulnerabilities.reason || 'Dependency scan unavailable.'}
                </p>
              )}
              {securityScan.sections.dependencyVulnerabilities.count === 0 ? (
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                  No dependency vulnerabilities were returned by the available manifest/OSV scan.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {findings.filter(f => f.source === 'dependency-vulnerability').slice(0, 8).map(finding => (
                    <div key={finding.id} style={cardMetricStyle}>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{finding.title}</strong>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '6px 0 0' }}>{finding.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            )}
          </div>
          )}

          {activeView === 'supply-chain' && (
            <Card title="Supply Chain Posture" icon={GitBranch}>
              <div style={{ display: 'grid', gap: '10px' }}>
                {findings.filter(f => f.category === 'supply-chain' || safeArray(f.tags).includes('supply-chain') || safeArray(f.tags).includes('posture')).length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No deterministic supply-chain posture findings were detected.</p>
                ) : findings
                  .filter(f => f.category === 'supply-chain' || safeArray(f.tags).includes('supply-chain') || safeArray(f.tags).includes('posture'))
                  .map(finding => (
                    <FindingRow
                      key={finding.id}
                      finding={finding}
                      reviewOnly={reviewOnlyIds.has(finding.id)}
                      onCopy={handleCopyFinding}
                      onMarkReviewOnly={handleToggleReviewOnly}
                    />
                  ))}
              </div>
            </Card>
          )}

          {activeView === 'external' && (
            <Card
              title="External Scanner Imports"
              icon={Upload}
              headerAction={
                <label style={actionButtonStyle}>
                  <Upload size={16} /> Import SARIF JSON
                  <input
                    type="file"
                    accept=".sarif,.json,application/json"
                    onChange={handleImportExternalScan}
                    style={{ display: 'none' }}
                  />
                </label>
              }
            >
              <div style={{ display: 'grid', gap: '14px' }}>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '13px', lineHeight: 1.55 }}>
                  Run CodeQL, Semgrep, Trivy, or another SARIF-compatible scanner outside CodeAtlas, then import the SARIF file here. CodeAtlas normalizes the result for triage without executing heavy scanners in the web runtime.
                </p>
                <div>
                  <button style={actionButtonStyle} onClick={handleCopyExternalWorkflow}>
                    <Copy size={16} /> Copy GitHub Actions SARIF workflow
                  </button>
                </div>
                {externalScan ? (
                  <>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Badge variant="success">{externalScan.findings.length} imported findings</Badge>
                      <Badge variant="info">{externalScan.fileName}</Badge>
                      {safeArray(externalScan.summary?.tools).map(tool => (
                        <Badge key={tool.tool} variant="low">{tool.tool}: {tool.count}</Badge>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {externalScan.findings.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>The imported SARIF file contained no results.</p>
                      ) : externalScan.findings.map(finding => (
                        <FindingRow
                          key={finding.id}
                          finding={finding}
                          reviewOnly={reviewOnlyIds.has(finding.id)}
                          onCopy={handleCopyFinding}
                          onMarkReviewOnly={handleToggleReviewOnly}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ ...cardMetricStyle, textAlign: 'center', padding: '28px' }}>
                    <Upload size={34} style={{ color: 'var(--text-secondary)', marginBottom: '10px' }} />
                    <h4 style={{ color: 'var(--text-primary)', margin: '0 0 6px', fontSize: '15px' }}>No external scan imported</h4>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '13px' }}>
                      Use GitHub code scanning, CodeQL, Semgrep, or Trivy externally, export SARIF, then import it here.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeView === 'risky-files' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
            <Card title="Risky Files / Modules" icon={Target}>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <h4 style={{ color: 'var(--text-primary)', margin: '0 0 8px', fontSize: '13px' }}>Top risky files</h4>
                  {safeArray(securityScan.sections.riskyFiles).slice(0, 8).map(file => (
                    <div key={file.path} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'monospace' }}>{file.path}</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{file.score}</strong>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 style={{ color: 'var(--text-primary)', margin: '8px 0', fontSize: '13px' }}>Top risky modules</h4>
                  {safeArray(securityScan.sections.riskyModules).slice(0, 6).map(module => (
                    <div key={module.module} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{module.module} · {module.findingCount} findings</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{module.score}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card title="OWASP-Style Categories" icon={Shield}>
              <div style={{ display: 'grid', gap: '8px' }}>
                {safeArray(securityScan.sections.owaspCategories).length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No OWASP categories to show yet.</p>
                ) : safeArray(securityScan.sections.owaspCategories).map(category => (
                  <div key={category.category} style={cardMetricStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{category.category}</strong>
                      <Badge variant={category.critical > 0 ? 'critical' : category.high > 0 ? 'high' : 'info'}>{category.count}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          )}

          {activeView === 'ai' && (
          <Card
            title="AI Security Explanation"
            icon={Sparkles}
            headerAction={
              <Badge variant={aiState === 'enhanced' ? 'success' : aiState === 'fallback' ? 'warning' : 'info'}>
                {aiState === 'enhanced' ? 'AI enhanced' : aiState === 'fallback' ? 'Local fallback' : aiState === 'loading' ? 'Enhancing' : 'Optional'}
              </Badge>
            }
          >
            {aiState === 'loading' && (
              <p style={{ color: 'var(--text-secondary)', margin: '0 0 12px', fontSize: '13px' }}>
                AI is summarizing deterministic findings. Local findings remain visible and authoritative.
              </p>
            )}
            {aiError && (
              <p style={{ color: 'var(--text-secondary)', margin: '0 0 12px', fontSize: '13px' }}>
                {aiError}
              </p>
            )}
            {securityScan.aiExplanation ? (
              <div style={{ display: 'grid', gap: '14px' }}>
                <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{securityScan.aiExplanation.summary}</p>
                {safeArray(securityScan.aiExplanation.prioritizedFindings).length > 0 && (
                  <div>
                    <h4 style={{ color: 'var(--text-primary)', fontSize: '13px', margin: '0 0 8px' }}>Prioritized findings</h4>
                    {securityScan.aiExplanation.prioritizedFindings.map(item => (
                      <div key={item.findingId} style={{ ...cardMetricStyle, marginBottom: '8px' }}>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{item.findingId}</strong>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '6px 0 0' }}>{item.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
                {safeArray(securityScan.aiExplanation.fixStrategy).length > 0 && (
                  <div>
                    <h4 style={{ color: 'var(--text-primary)', fontSize: '13px', margin: '0 0 8px' }}>Fix strategy</h4>
                    {securityScan.aiExplanation.fixStrategy.map((item, index) => (
                      <div key={`${item.title}-${index}`} style={{ ...cardMetricStyle, marginBottom: '8px' }}>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{item.title}</strong>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '6px 0 0' }}>{item.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Click Enhance with AI to get a prioritized explanation based only on detected finding IDs.
              </p>
            )}
          </Card>
          )}

          {activeView === 'export' && (
            <>
          <Card title="Export Security Evidence" icon={Download}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <button style={actionButtonStyle} onClick={handleExport}><Download size={16} /> Export Markdown</button>
              <button style={actionButtonStyle} onClick={handleExportSarif}><Download size={16} /> Export SARIF JSON</button>
              <button style={actionButtonStyle} onClick={handleExportSbom}><Download size={16} /> Export CycloneDX SBOM</button>
              <button style={actionButtonStyle} onClick={handleCopyExternalWorkflow}><Copy size={16} /> Copy external scanner workflow</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
              Exports include deterministic finding IDs, rule metadata, CWE/OWASP tags, stable fingerprints, and redacted evidence only.
            </p>
          </Card>

          <Card title="Fix Checklist" icon={CheckCircle}>
            {safeArray(securityScan.sections.fixChecklist).length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No high-priority fixes are required from current deterministic findings.</p>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {securityScan.sections.fixChecklist.map(item => (
                  <div key={item.id} style={cardMetricStyle}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <Badge variant={SEVERITY_VARIANT[item.severity] || 'info'}>{item.order}</Badge>
                      <div>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{item.title}</strong>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '5px 0 0' }}>
                          {item.file}: {item.action}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default SecurityScanner;

// Made with Bob
