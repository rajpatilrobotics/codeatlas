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
  XCircle
} from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { buildSecurityScan, redactEvidence } from '../../utils/security/buildSecurityScan';

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];
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
  'ai-explanation': 'AI explanation'
};

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

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getRepoCacheKey(repoData, codeAnalysis) {
  if (!repoData?.repoInfo) return '';
  return [
    'securityScan',
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

function getPackageScripts(repoData) {
  return Object.entries(repoData?.packageJson?.scripts || {})
    .map(([name, command]) => ({ name, command }))
    .slice(0, 10);
}

function buildMarkdownReport(scan) {
  if (!scan) return '';
  const lines = [
    '# CodeAtlas Security Report',
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
  if (scan.findings.length === 0) {
    lines.push('No deterministic findings detected in the analyzed repository context.');
  } else {
    scan.findings.forEach(finding => {
      lines.push(`### ${finding.title}`);
      lines.push(`- ID: ${finding.id}`);
      lines.push(`- Severity: ${finding.severity}`);
      lines.push(`- Confidence: ${finding.confidence}`);
      lines.push(`- Source: ${finding.source}`);
      lines.push(`- File: ${finding.file}${finding.line ? `:${finding.line}` : ''}`);
      lines.push(`- Evidence: ${finding.redactedEvidence || finding.evidence || 'n/a'}`);
      lines.push(`- Impact: ${finding.impact}`);
      lines.push(`- Recommendation: ${finding.recommendation}`);
      lines.push('');
    });
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

function FindingRow({ finding }) {
  return (
    <div style={{
      padding: '14px',
      border: '1px solid rgba(255,255,255,0.08)',
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
          </div>
          <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '15px', fontWeight: 800 }}>{finding.title}</h4>
        </div>
        <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'monospace', alignSelf: 'flex-start' }}>
          {finding.file}{finding.line ? `:${finding.line}` : ''}
        </span>
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

  const cacheKey = useMemo(() => getRepoCacheKey(repoData, codeAnalysis), [repoData, codeAnalysis]);
  const findings = safeArray(securityScan?.findings);
  const severityCounts = useMemo(() => getSeverityCounts(findings), [findings]);
  const sourceCounts = useMemo(() => getSourceCounts(findings), [findings]);

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
        <>
          <div style={gridStyle}>
            <MetricTile label="Security Score" value={`${securityScan.score.overall}`} detail={`${securityScan.score.level} risk`} icon={Shield} />
            <MetricTile label="Critical" value={severityCounts.critical} detail={`${severityCounts.high} high findings`} icon={AlertTriangle} />
            <MetricTile label="Secrets" value={securityScan.sections.secretsExposure.count} detail="redacted evidence only" icon={Lock} />
            <MetricTile
              label="Dependencies"
              value={securityScan.sections.dependencyVulnerabilities.count}
              detail={securityScan.sections.dependencyVulnerabilities.available ? 'OSV checked' : 'partial/unavailable'}
              icon={Network}
            />
            <MetricTile label="Scanned Files" value={securityScan.sections.coverage.scannedFiles} detail={`${securityScan.sections.coverage.filesWithContent} with content`} icon={FileText} />
            <MetricTile label="AI Status" value={aiState === 'enhanced' ? 'On' : 'Off'} detail={aiState === 'fallback' ? 'local fallback' : 'optional explanation'} icon={Sparkles} />
          </div>

          <Card title="Cross-Feature Links" icon={GitBranch}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button style={actionButtonStyle} onClick={() => onNavigate?.('heatmap')}>Open Heatmap</button>
              <button style={actionButtonStyle} onClick={() => onNavigate?.('repository-graph')}>Open Repository Graph</button>
              <button style={actionButtonStyle} onClick={() => onNavigate?.('blast-radius')}>Open Blast Radius</button>
              <button style={actionButtonStyle} onClick={() => onNavigate?.('planner')}>Open Planner</button>
            </div>
          </Card>

          <Card title={`Detected Findings (${findings.length})`} icon={AlertTriangle}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {Object.entries(sourceCounts).map(([source, count]) => (
                <Badge key={source} variant="info">{SOURCE_LABELS[source] || source}: {count}</Badge>
              ))}
              {findings.length === 0 && <Badge variant="success">No deterministic findings</Badge>}
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {findings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-secondary)' }}>
                  <CheckCircle size={36} style={{ marginBottom: '10px', color: '#10b981' }} />
                  <p style={{ margin: 0 }}>No deterministic findings were detected in the analyzed repository context.</p>
                </div>
              ) : (
                findings
                  .slice()
                  .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
                  .map(finding => <FindingRow key={finding.id} finding={finding} />)
              )}
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
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
          </div>

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
    </div>
  );
}

export default SecurityScanner;

// Made with Bob
