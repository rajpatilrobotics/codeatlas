import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, RefreshCw, Lock, FileText, XCircle, Info } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import MetricCard from '../ui/MetricCard';

function SecurityScanner({ repoData, codeAnalysis, isCodeAnalysisLoading }) {
  const [securityData, setSecurityData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [cachedData, setCachedData] = useState(null);

  // Load cached data on mount
  useEffect(() => {
    const cached = sessionStorage.getItem('securityScanCache');
    if (cached) {
      try {
        const parsedCache = JSON.parse(cached);
        setCachedData(parsedCache);
        setSecurityData(parsedCache);
      } catch (err) {
        console.error('Failed to parse cached security data:', err);
      }
    }
  }, []);

  // Auto-scan when repoData is available and no cached data
  useEffect(() => {
    if (repoData && !cachedData && !isScanning) {
      performSecurityScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoData, cachedData]);

  const performSecurityScan = async () => {
    if (!repoData) {
      setError('No repository data available. Please analyze a repository first.');
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      // Generate security analysis using API endpoint
      const response = await fetch('/api/ai/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoData, codeAnalysis })
      });
      const result = await response.json();
      
      if (result.success) {
        const parsedData = result.security;
        
        // Cache the result
        sessionStorage.setItem('securityScanCache', JSON.stringify(parsedData));
        setCachedData(parsedData);
        setSecurityData(parsedData);
      } else {
        throw new Error(result.error || 'Failed to perform security scan');
      }
      
    } catch (err) {
      console.error('Security scan failed:', err);
      setError(err.message || 'Failed to perform security scan');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRescan = () => {
    // Clear cache and rescan
    sessionStorage.removeItem('securityScanCache');
    setCachedData(null);
    setSecurityData(null);
    performSecurityScan();
  };

  const prepareRepoContext = (data) => {
    const { repoInfo, techStack, importantFiles, fileTree, envVariables } = data;
    
    // Get key file names
    const keyFiles = importantFiles?.slice(0, 10).map(f => f.path).join(', ') || 'None';
    
    // Get tech stack with null safety
    const allTech = techStack && typeof techStack === 'object'
      ? Object.values(techStack).flat().join(', ')
      : 'Not detected';
    
    // Check for sensitive patterns in file tree
    const hasDotEnv = fileTree?.some(f => f.includes('.env')) || false;
    const hasSecrets = fileTree?.some(f => f.includes('secret') || f.includes('key')) || false;
    
    return `
Repository: ${repoInfo?.name || 'Unknown'}
Description: ${repoInfo?.description || 'No description'}
Language: ${repoInfo?.language || 'Unknown'}
Tech Stack: ${allTech}
Key Files: ${keyFiles}
Has .env files: ${hasDotEnv ? 'Yes' : 'No'}
Has potential secret files: ${hasSecrets ? 'Yes' : 'No'}
Environment Variables: ${envVariables?.length || 0} detected
Total Files: ${fileTree?.length || 0}
    `.trim();
  };

  const parseSecurityResponse = (response) => {
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = response.trim();
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      cleanedResponse = cleanedResponse.trim();
      
      // Find JSON object
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      const parsed = JSON.parse(cleanedResponse);
      
      // Validate and normalize the response
      return {
        overall_score: Math.min(100, Math.max(0, parsed.overall_score || 75)),
        risk_level: ['Low', 'Medium', 'High'].includes(parsed.risk_level) ? parsed.risk_level : 'Medium',
        issues: (parsed.issues || []).slice(0, 5).map(issue => ({
          severity: ['High', 'Medium', 'Low'].includes(issue.severity) ? issue.severity : 'Medium',
          title: issue.title || 'Security Issue',
          description: issue.description || 'No description provided',
          file: issue.file || 'Unknown',
          fix: issue.fix || 'Review and address this issue'
        })),
        passed_checks: (parsed.passed_checks || []).slice(0, 5),
        recommendations: (parsed.recommendations || []).slice(0, 5)
      };
    } catch (err) {
      console.error('Failed to parse security response:', err);
      // Return default safe data
      return {
        overall_score: 70,
        risk_level: 'Medium',
        issues: [],
        passed_checks: ['Repository structure analyzed'],
        recommendations: ['Continue following security best practices']
      };
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'High': return '#ef4444';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'High': return '#ef4444';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  if (!repoData) {
    return (
      <div className="tab-content security-tab">
        <Card title="Security Scanner" icon={Shield}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Shield size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Please analyze a repository first to view security insights.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (isScanning) {
    return (
      <div className="tab-content security-tab">
        <Card title="Security Scanner" icon={Shield}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid var(--border-color)',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '16px' }}>Scanning for vulnerabilities...</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Analyzing repository security...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-content security-tab">
        <Card title="Security Scanner" icon={Shield}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <XCircle size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '16px' }}>Security Scan Failed</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>{error}</p>
            <button
              onClick={performSecurityScan}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              Try Again
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (!securityData) {
    return (
      <div className="tab-content security-tab">
        <Card title="Security Scanner" icon={Shield}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Lock size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>Click "Scan Repository" to analyze security</p>
            <button
              onClick={performSecurityScan}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              Scan Repository
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="tab-content security-tab fade-in">
      {/* Overall Score Section */}
      <Card 
        title="Security Score" 
        icon={Shield}
        headerAction={
          <button 
            onClick={handleRescan} 
            disabled={isScanning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(102, 126, 234, 0.1)',
              color: '#667eea',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isScanning ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s'
            }}
          >
            <RefreshCw size={16} />
            Rescan
          </button>
        }
      >
        <div style={{ display: 'flex', gap: 'var(--spacing-lg)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
            <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%' }}>
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={getRiskColor(securityData.risk_level)}
                strokeWidth="8"
                strokeDasharray={`${(securityData.overall_score / 100) * 339.292} 339.292`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
              <text
                x="60"
                y="60"
                textAnchor="middle"
                dy="0.3em"
                fill={getRiskColor(securityData.risk_level)}
                style={{ fontSize: '28px', fontWeight: 'bold' }}
              >
                {securityData.overall_score}
              </text>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <Badge 
              variant={securityData.risk_level === 'Low' ? 'success' : securityData.risk_level === 'Medium' ? 'warning' : 'danger'}
              style={{ marginBottom: '12px' }}
            >
              {securityData.risk_level} Risk
            </Badge>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              {securityData.overall_score >= 80 && 'Excellent security posture. Keep up the good work!'}
              {securityData.overall_score >= 60 && securityData.overall_score < 80 && 'Good security practices. Address findings to improve.'}
              {securityData.overall_score < 60 && 'Security needs attention. Review and fix critical issues.'}
            </p>
          </div>
        </div>
      </Card>

      {/* Issues Section */}
      {securityData.issues && securityData.issues.length > 0 && (
        <Card 
          title={`Security Issues (${securityData.issues.length})`} 
          icon={AlertTriangle}
          headerAction={<Badge variant="danger">Found</Badge>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {securityData.issues.map((issue, index) => (
              <div 
                key={index} 
                style={{
                  padding: '16px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <Badge 
                    variant={issue.severity === 'High' ? 'danger' : issue.severity === 'Medium' ? 'warning' : 'info'}
                  >
                    {issue.severity}
                  </Badge>
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '600', margin: 0 }}>
                    {issue.title}
                  </h4>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '8px' }}>
                  {issue.description}
                </p>
                {issue.file && issue.file !== 'Unknown' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <FileText size={14} style={{ color: 'var(--text-secondary)' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{issue.file}</span>
                  </div>
                )}
                <div style={{ 
                  padding: '12px', 
                  background: 'rgba(102, 126, 234, 0.1)', 
                  borderRadius: '6px',
                  borderLeft: '3px solid #667eea'
                }}>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>Fix:</strong>{' '}
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{issue.fix}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Real Code Analysis Vulnerabilities */}
      {codeAnalysis && codeAnalysis.security && (
        <Card 
          title="Code Analysis - Detected Vulnerabilities" 
          icon={AlertTriangle}
        >
          {isCodeAnalysisLoading && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid var(--border-color)',
                borderTop: '4px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}></div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Analyzing code for vulnerabilities...</p>
            </div>
          )}
          
          {!isCodeAnalysisLoading && (
            <>
              {/* Critical Issues */}
              {codeAnalysis.security.critical && codeAnalysis.security.critical.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ 
                    color: '#ef4444', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertTriangle size={16} />
                    Critical ({codeAnalysis.security.critical.length})
                  </h4>
                  {codeAnalysis.security.critical.map((vuln, index) => (
                    <div 
                      key={`critical-${index}`} 
                      style={{
                        padding: '12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '6px',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        marginBottom: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <Badge variant="danger">{vuln.type}</Badge>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          <FileText size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          {vuln.file}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>{vuln.message}</p>
                      {vuln.line && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Line {vuln.line}</span>
                      )}
                      {vuln.code && (
                        <pre style={{ 
                          background: 'rgba(0,0,0,0.3)', 
                          padding: '8px', 
                          borderRadius: '4px', 
                          fontSize: '11px',
                          marginTop: '8px',
                          overflow: 'auto'
                        }}>
                          <code>{vuln.code}</code>
                        </pre>
                      )}
                      {vuln.suggestion && (
                        <div style={{ 
                          marginTop: '8px', 
                          padding: '8px', 
                          background: 'rgba(102, 126, 234, 0.1)', 
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          <strong style={{ color: 'var(--text-primary)' }}>💡 Fix:</strong> {vuln.suggestion}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* High Issues */}
              {codeAnalysis.security.high && codeAnalysis.security.high.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ 
                    color: '#f59e0b', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertTriangle size={16} />
                    High ({codeAnalysis.security.high.length})
                  </h4>
                  {codeAnalysis.security.high.map((vuln, index) => (
                    <div 
                      key={`high-${index}`} 
                      style={{
                        padding: '12px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        borderRadius: '6px',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        marginBottom: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <Badge variant="warning">{vuln.type}</Badge>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          <FileText size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          {vuln.file}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>{vuln.message}</p>
                      {vuln.line && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Line {vuln.line}</span>
                      )}
                      {vuln.code && (
                        <pre style={{ 
                          background: 'rgba(0,0,0,0.3)', 
                          padding: '8px', 
                          borderRadius: '4px', 
                          fontSize: '11px',
                          marginTop: '8px',
                          overflow: 'auto'
                        }}>
                          <code>{vuln.code}</code>
                        </pre>
                      )}
                      {vuln.suggestion && (
                        <div style={{ 
                          marginTop: '8px', 
                          padding: '8px', 
                          background: 'rgba(102, 126, 234, 0.1)', 
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          <strong style={{ color: 'var(--text-primary)' }}>💡 Fix:</strong> {vuln.suggestion}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Medium Issues */}
              {codeAnalysis.security.medium && codeAnalysis.security.medium.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ 
                    color: '#f59e0b', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Info size={16} />
                    Medium ({codeAnalysis.security.medium.length})
                  </h4>
                  {codeAnalysis.security.medium.map((vuln, index) => (
                    <div 
                      key={`medium-${index}`} 
                      style={{
                        padding: '12px',
                        background: 'rgba(245, 158, 11, 0.08)',
                        borderRadius: '6px',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        marginBottom: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <Badge variant="warning">{vuln.type}</Badge>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          <FileText size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          {vuln.file}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>{vuln.message}</p>
                      {vuln.line && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Line {vuln.line}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Low Issues */}
              {codeAnalysis.security.low && codeAnalysis.security.low.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ 
                    color: '#3b82f6', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Info size={16} />
                    Low ({codeAnalysis.security.low.length})
                  </h4>
                  {codeAnalysis.security.low.map((vuln, index) => (
                    <div 
                      key={`low-${index}`} 
                      style={{
                        padding: '12px',
                        background: 'rgba(59, 130, 246, 0.08)',
                        borderRadius: '6px',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        marginBottom: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <Badge variant="info">{vuln.type}</Badge>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          <FileText size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          {vuln.file}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{vuln.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* No vulnerabilities found */}
              {(!codeAnalysis.security.critical || codeAnalysis.security.critical.length === 0) &&
               (!codeAnalysis.security.high || codeAnalysis.security.high.length === 0) &&
               (!codeAnalysis.security.medium || codeAnalysis.security.medium.length === 0) &&
               (!codeAnalysis.security.low || codeAnalysis.security.low.length === 0) && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  <CheckCircle size={48} style={{ color: '#10b981', marginBottom: '12px' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>No vulnerabilities detected in analyzed code!</p>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* Passed Checks Section */}
      {securityData.passed_checks && securityData.passed_checks.length > 0 && (
        <Card 
          title="Passed Security Checks" 
          icon={CheckCircle}
          headerAction={<Badge variant="success">{securityData.passed_checks.length} Passed</Badge>}
        >
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {securityData.passed_checks.map((check, index) => (
              <li 
                key={index} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  border: '1px solid rgba(16, 185, 129, 0.15)'
                }}
              >
                <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{check}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Recommendations Section */}
      {securityData.recommendations && securityData.recommendations.length > 0 && (
        <Card 
          title="Recommendations" 
          icon={Info}
          headerAction={<Badge variant="info">{securityData.recommendations.length} Tips</Badge>}
        >
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {securityData.recommendations.map((rec, index) => (
              <li 
                key={index} 
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px',
                  background: 'rgba(102, 126, 234, 0.08)',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  border: '1px solid rgba(102, 126, 234, 0.15)'
                }}
              >
                <Info size={16} style={{ color: '#667eea', flexShrink: 0, marginTop: '2px' }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>{rec}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export default SecurityScanner;

// Made with Bob