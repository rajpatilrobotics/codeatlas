'use client';
/**
 * Security Scanner Page
 * Automated vulnerability detection and security analysis
 * Redesigned for CodeAtlas V2
 */

import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import './SecurityScanner.css';

const SecurityScanner = ({ 
  repoData, 
  codeAnalysis, 
  isCodeAnalysisLoading 
}) => {
  const [securityData, setSecurityData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);

  // Auto-scan when repoData is available
  useEffect(() => {
    if (repoData && !securityData && !isScanning) {
      performSecurityScan();
    }
  }, [repoData]);

  const performSecurityScan = async () => {
    if (!repoData) {
      setError('No repository data available');
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      // Simulate security scan (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock security data
      const mockData = {
        overall_score: 75,
        risk_level: 'Medium',
        issues: [
          {
            severity: 'High',
            title: 'Hardcoded API Keys Detected',
            description: 'Found potential API keys in source code',
            file: 'src/config.js',
            fix: 'Move sensitive data to environment variables'
          },
          {
            severity: 'Medium',
            title: 'Outdated Dependencies',
            description: '3 packages have known vulnerabilities',
            file: 'package.json',
            fix: 'Run npm audit fix to update packages'
          }
        ],
        passed_checks: [
          'No SQL injection vulnerabilities found',
          'HTTPS enforced for all connections',
          'Input validation implemented',
          'Authentication properly configured'
        ],
        recommendations: [
          'Enable Content Security Policy headers',
          'Implement rate limiting on API endpoints',
          'Add security headers to responses',
          'Regular dependency updates recommended'
        ]
      };
      
      setSecurityData(mockData);
    } catch (err) {
      setError(err.message || 'Failed to perform security scan');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRescan = () => {
    setSecurityData(null);
    performSecurityScan();
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'High': return 'critical';
      case 'Medium': return 'high';
      case 'Low': return 'safe';
      default: return 'medium';
    }
  };

  if (!repoData) {
    return (
      <div className="security-page">
        <EmptyState
          icon="🔒"
          title="No Repository Data"
          message="Analyze a repository to scan for security vulnerabilities"
          action={{ label: 'Start Analysis', onClick: () => {} }}
        />
      </div>
    );
  }

  if (isScanning) {
    return (
      <div className="security-page">
        <Card className="security-card">
          <div className="security-card-body">
            <LoadingState variant="default" lines={5} />
            <div className="scanning-message">
              <h3>Scanning for vulnerabilities...</h3>
              <p>Analyzing repository security</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="security-page">
        <ErrorState
          title="Security Scan Failed"
          message={error}
          action={{ label: 'Retry', onClick: performSecurityScan }}
        />
      </div>
    );
  }

  if (!securityData) {
    return (
      <div className="security-page">
        <EmptyState
          icon="🔒"
          title="Ready to Scan"
          message="Click below to analyze repository security"
          action={{ label: 'Scan Repository', onClick: performSecurityScan }}
        />
      </div>
    );
  }

  return (
    <div className="security-page">
      {/* Header */}
      <div className="security-header">
        <div>
          <h1 className="security-title">Security Analysis</h1>
          <p className="security-subtitle">
            Automated vulnerability detection and security insights
          </p>
        </div>
        
        <Button variant="secondary" size="md" onClick={handleRescan}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M13 3L3 13M3 3L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Rescan
        </Button>
      </div>

      {/* Security Score */}
      <Card className="security-card security-score-card">
        <div className="security-card-body">
          <div className="security-score-container">
            <div className="security-score-circle">
              <svg viewBox="0 0 120 120" className="score-svg">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="var(--border-subtle)"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="var(--accent-cyan)"
                  strokeWidth="8"
                  strokeDasharray={`${(securityData.overall_score / 100) * 339.292} 339.292`}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  className="score-progress"
                />
              </svg>
              <div className="score-value">{securityData.overall_score}</div>
            </div>
            
            <div className="security-score-details">
              <Badge variant={getRiskColor(securityData.risk_level)}>
                {securityData.risk_level} Risk
              </Badge>
              <h2 className="security-score-title">Security Score</h2>
              <p className="security-score-description">
                {securityData.overall_score >= 80 && 'Excellent security posture'}
                {securityData.overall_score >= 60 && securityData.overall_score < 80 && 'Good security practices'}
                {securityData.overall_score < 60 && 'Security needs attention'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Security Issues */}
      {securityData.issues && securityData.issues.length > 0 && (
        <Card className="security-card">
          <div className="security-card-header">
            <h2 className="security-card-title">
              Security Issues ({securityData.issues.length})
            </h2>
          </div>
          <div className="security-card-body">
            <div className="security-issues-list">
              {securityData.issues.map((issue, idx) => (
                <div key={idx} className="security-issue">
                  <div className="security-issue-header">
                    <Badge variant={getRiskColor(issue.severity)}>
                      {issue.severity}
                    </Badge>
                    <h3 className="security-issue-title">{issue.title}</h3>
                  </div>
                  <p className="security-issue-description">{issue.description}</p>
                  {issue.file && (
                    <div className="security-issue-file">
                      <span className="file-icon">📄</span>
                      <code>{issue.file}</code>
                    </div>
                  )}
                  <div className="security-issue-fix">
                    <strong>Fix:</strong> {issue.fix}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Code Analysis Vulnerabilities */}
      {codeAnalysis && codeAnalysis.security && (
        <Card className="security-card">
          <div className="security-card-header">
            <h2 className="security-card-title">Code Analysis Vulnerabilities</h2>
          </div>
          <div className="security-card-body">
            {isCodeAnalysisLoading ? (
              <LoadingState variant="list" lines={3} />
            ) : (
              <>
                {['critical', 'high', 'medium', 'low'].map(severity => {
                  const vulns = codeAnalysis.security[severity];
                  if (!vulns || vulns.length === 0) return null;
                  
                  return (
                    <div key={severity} className="vulnerability-section">
                      <h3 className={`vulnerability-section-title ${severity}`}>
                        {severity === 'critical' && '🔴'}
                        {severity === 'high' && '🟠'}
                        {severity === 'medium' && '🟡'}
                        {severity === 'low' && '🔵'}
                        {' '}
                        {severity.charAt(0).toUpperCase() + severity.slice(1)} ({vulns.length})
                      </h3>
                      {vulns.map((vuln, idx) => (
                        <div key={idx} className={`vulnerability-item ${severity}`}>
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
                  );
                })}
              </>
            )}
          </div>
        </Card>
      )}

      {/* Passed Checks */}
      {securityData.passed_checks && securityData.passed_checks.length > 0 && (
        <Card className="security-card">
          <div className="security-card-header">
            <h2 className="security-card-title">Passed Security Checks</h2>
          </div>
          <div className="security-card-body">
            <ul className="security-checks-list">
              {securityData.passed_checks.map((check, idx) => (
                <li key={idx} className="security-check-item">
                  <span className="check-icon">✓</span>
                  <span>{check}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {/* Recommendations */}
      {securityData.recommendations && securityData.recommendations.length > 0 && (
        <Card className="security-card">
          <div className="security-card-header">
            <h2 className="security-card-title">Recommendations</h2>
          </div>
          <div className="security-card-body">
            <ul className="security-recommendations-list">
              {securityData.recommendations.map((rec, idx) => (
                <li key={idx} className="security-recommendation-item">
                  💡 {rec}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SecurityScanner;

// Made with Bob
