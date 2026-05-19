import React, { useState, useEffect } from 'react';

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
        <div className="content-card">
          <div className="empty-state-message">
            <span className="empty-icon">🔒</span>
            <p>Please analyze a repository first to view security insights.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isScanning) {
    return (
      <div className="tab-content security-tab">
        <div className="content-card">
          <div className="scanning-state">
            <div className="scanning-spinner"></div>
            <h3>Scanning for vulnerabilities...</h3>
            <p>Analyzing repository security...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-content security-tab">
        <div className="content-card">
          <div className="error-state">
            <span className="error-icon">⚠️</span>
            <h3>Security Scan Failed</h3>
            <p>{error}</p>
            <button className="retry-button" onClick={performSecurityScan}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!securityData) {
    return (
      <div className="tab-content security-tab">
        <div className="content-card">
          <div className="empty-state-message">
            <span className="empty-icon">🔒</span>
            <p>Click "Scan Repository" to analyze security</p>
            <button className="scan-button" onClick={performSecurityScan}>
              Scan Repository
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content security-tab fade-in">
      {/* Header with Rescan Button */}
      <div className="security-header">
        <h2 className="section-title">🔒 Security Analysis</h2>
        <button className="rescan-button" onClick={handleRescan} disabled={isScanning}>
          <span className="rescan-icon">🔄</span>
          Rescan Repository
        </button>
      </div>

      {/* Overall Score Section */}
      <div className="content-card score-card fade-in">
        <div className="score-container">
          <div className="score-circle-wrapper">
            <svg className="score-circle" viewBox="0 0 120 120">
              <circle
                className="score-circle-bg"
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                className="score-circle-progress"
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
                className="score-text"
                fill={getRiskColor(securityData.risk_level)}
              >
                {securityData.overall_score}
              </text>
            </svg>
          </div>
          <div className="score-details">
            <div className="risk-badge" style={{ backgroundColor: getRiskColor(securityData.risk_level) }}>
              {securityData.risk_level} Risk
            </div>
            <h3 className="score-title">Security Score</h3>
            <p className="score-description">
              {securityData.overall_score >= 80 && 'Excellent security posture. Keep up the good work!'}
              {securityData.overall_score >= 60 && securityData.overall_score < 80 && 'Good security practices. Address findings to improve.'}
              {securityData.overall_score < 60 && 'Security needs attention. Review and fix critical issues.'}
            </p>
          </div>
        </div>
      </div>

      {/* Issues Section */}
      {securityData.issues && securityData.issues.length > 0 && (
        <div className="content-card issues-card fade-in">
          <h3 className="card-title">⚠️ Security Issues ({securityData.issues.length})</h3>
          <div className="issues-list">
            {securityData.issues.map((issue, index) => (
              <div key={index} className="issue-item fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="issue-header">
                  <span
                    className="severity-badge"
                    style={{ backgroundColor: getSeverityColor(issue.severity) }}
                  >
                    {issue.severity}
                  </span>
                  <h4 className="issue-title">{issue.title}</h4>
                </div>
                <p className="issue-description">{issue.description}</p>
                {issue.file && issue.file !== 'Unknown' && (
                  <p className="issue-file">
                    <span className="file-icon">📄</span>
                    {issue.file}
                  </p>
                )}
                <div className="issue-fix">
                  <strong>Fix:</strong> {issue.fix}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real Code Analysis Vulnerabilities */}
      {codeAnalysis && codeAnalysis.security && (
        <div className="content-card code-analysis-card fade-in">
          <h3 className="card-title">🔬 Code Analysis - Detected Vulnerabilities</h3>
          
          {isCodeAnalysisLoading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Analyzing code for vulnerabilities...</p>
            </div>
          )}
          
          {!isCodeAnalysisLoading && (
            <>
              {/* Critical Issues */}
              {codeAnalysis.security.critical && codeAnalysis.security.critical.length > 0 && (
                <div className="vulnerability-section">
                  <h4 className="vulnerability-section-title critical">
                    🔴 Critical ({codeAnalysis.security.critical.length})
                  </h4>
                  {codeAnalysis.security.critical.map((vuln, index) => (
                    <div key={`critical-${index}`} className="vulnerability-item critical">
                      <div className="vulnerability-header">
                        <span className="vulnerability-type">{vuln.type}</span>
                        <span className="vulnerability-file">📄 {vuln.file}</span>
                      </div>
                      <p className="vulnerability-message">{vuln.message}</p>
                      {vuln.line && (
                        <p className="vulnerability-location">Line {vuln.line}</p>
                      )}
                      {vuln.code && (
                        <pre className="vulnerability-code">
                          <code>{vuln.code}</code>
                        </pre>
                      )}
                      {vuln.suggestion && (
                        <div className="vulnerability-fix">
                          <strong>💡 Fix:</strong> {vuln.suggestion}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* High Issues */}
              {codeAnalysis.security.high && codeAnalysis.security.high.length > 0 && (
                <div className="vulnerability-section">
                  <h4 className="vulnerability-section-title high">
                    🟠 High ({codeAnalysis.security.high.length})
                  </h4>
                  {codeAnalysis.security.high.map((vuln, index) => (
                    <div key={`high-${index}`} className="vulnerability-item high">
                      <div className="vulnerability-header">
                        <span className="vulnerability-type">{vuln.type}</span>
                        <span className="vulnerability-file">📄 {vuln.file}</span>
                      </div>
                      <p className="vulnerability-message">{vuln.message}</p>
                      {vuln.line && (
                        <p className="vulnerability-location">Line {vuln.line}</p>
                      )}
                      {vuln.code && (
                        <pre className="vulnerability-code">
                          <code>{vuln.code}</code>
                        </pre>
                      )}
                      {vuln.suggestion && (
                        <div className="vulnerability-fix">
                          <strong>💡 Fix:</strong> {vuln.suggestion}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Medium Issues */}
              {codeAnalysis.security.medium && codeAnalysis.security.medium.length > 0 && (
                <div className="vulnerability-section">
                  <h4 className="vulnerability-section-title medium">
                    🟡 Medium ({codeAnalysis.security.medium.length})
                  </h4>
                  {codeAnalysis.security.medium.map((vuln, index) => (
                    <div key={`medium-${index}`} className="vulnerability-item medium">
                      <div className="vulnerability-header">
                        <span className="vulnerability-type">{vuln.type}</span>
                        <span className="vulnerability-file">📄 {vuln.file}</span>
                      </div>
                      <p className="vulnerability-message">{vuln.message}</p>
                      {vuln.line && (
                        <p className="vulnerability-location">Line {vuln.line}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Low Issues */}
              {codeAnalysis.security.low && codeAnalysis.security.low.length > 0 && (
                <div className="vulnerability-section">
                  <h4 className="vulnerability-section-title low">
                    🔵 Low ({codeAnalysis.security.low.length})
                  </h4>
                  {codeAnalysis.security.low.map((vuln, index) => (
                    <div key={`low-${index}`} className="vulnerability-item low">
                      <div className="vulnerability-header">
                        <span className="vulnerability-type">{vuln.type}</span>
                        <span className="vulnerability-file">📄 {vuln.file}</span>
                      </div>
                      <p className="vulnerability-message">{vuln.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* No vulnerabilities found */}
              {(!codeAnalysis.security.critical || codeAnalysis.security.critical.length === 0) &&
               (!codeAnalysis.security.high || codeAnalysis.security.high.length === 0) &&
               (!codeAnalysis.security.medium || codeAnalysis.security.medium.length === 0) &&
               (!codeAnalysis.security.low || codeAnalysis.security.low.length === 0) && (
                <div className="no-vulnerabilities">
                  <span className="success-icon">✅</span>
                  <p>No vulnerabilities detected in analyzed code!</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Passed Checks Section */}
      {securityData.passed_checks && securityData.passed_checks.length > 0 && (
        <div className="content-card passed-checks-card fade-in">
          <h3 className="card-title">✅ Passed Security Checks</h3>
          <ul className="passed-checks-list">
            {securityData.passed_checks.map((check, index) => (
              <li key={index} className="check-item fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <span className="check-icon">✓</span>
                <span className="check-text">{check}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations Section */}
      {securityData.recommendations && securityData.recommendations.length > 0 && (
        <div className="content-card recommendations-card fade-in">
          <h3 className="card-title">💡 Recommendations</h3>
          <ul className="recommendations-list">
            {securityData.recommendations.map((rec, index) => (
              <li key={index} className="recommendation-item fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SecurityScanner;

// Made with Bob