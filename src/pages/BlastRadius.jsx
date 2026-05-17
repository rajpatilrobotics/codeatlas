import React, { useState } from 'react';
import './BlastRadius.css';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Input from '../components/Input';
import EmptyState from '../components/EmptyState';
import Separator from '../components/Separator';

// Mock data for blast radius analysis
const MOCK_FILES = [
  { id: 1, name: 'authService.js', path: 'src/services/authService.js', type: 'service' },
  { id: 2, name: 'App.jsx', path: 'src/App.jsx', type: 'component' },
  { id: 3, name: 'apiClient.js', path: 'src/utils/apiClient.js', type: 'utility' },
  { id: 4, name: 'Dashboard.jsx', path: 'src/pages/Dashboard.jsx', type: 'component' },
  { id: 5, name: 'database.js', path: 'src/config/database.js', type: 'config' },
];

const MOCK_IMPACT = {
  direct: [
    { file: 'src/components/LoginForm.jsx', reason: 'Imports authService', risk: 'high' },
    { file: 'src/components/SignupForm.jsx', reason: 'Imports authService', risk: 'high' },
    { file: 'src/middleware/auth.js', reason: 'Uses authentication methods', risk: 'critical' },
  ],
  indirect: [
    { file: 'src/pages/Dashboard.jsx', reason: 'Protected route using auth', risk: 'medium' },
    { file: 'src/pages/Profile.jsx', reason: 'Requires authentication', risk: 'medium' },
    { file: 'src/components/Header.jsx', reason: 'Shows user status', risk: 'low' },
    { file: 'src/api/routes/users.js', reason: 'Validates tokens', risk: 'medium' },
  ],
  tests: [
    { file: 'tests/auth.test.js', reason: 'Unit tests for authService', risk: 'high' },
    { file: 'tests/integration/login.test.js', reason: 'Integration tests', risk: 'medium' },
  ]
};

const MOCK_RECOMMENDATIONS = [
  {
    id: 1,
    type: 'warning',
    title: 'Update Authentication Tests',
    description: 'Changes to authService will require updating 2 test files',
    action: 'Review test coverage'
  },
  {
    id: 2,
    type: 'info',
    title: 'Check API Endpoints',
    description: 'Verify that token validation still works correctly',
    action: 'Run integration tests'
  },
  {
    id: 3,
    type: 'critical',
    title: 'Breaking Change Detected',
    description: 'Middleware depends on specific method signatures',
    action: 'Update middleware code'
  }
];

function BlastRadius() {
  const [selectedFile, setSelectedFile] = useState(MOCK_FILES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTests, setShowTests] = useState(true);
  const hasRepository = true;

  const filteredFiles = MOCK_FILES.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalImpact = MOCK_IMPACT.direct.length + MOCK_IMPACT.indirect.length + 
    (showTests ? MOCK_IMPACT.tests.length : 0);

  const getRiskColor = (risk) => {
    const colors = {
      critical: 'var(--status-error)',
      high: 'var(--status-error)',
      medium: 'var(--status-warning)',
      low: 'var(--status-success)'
    };
    return colors[risk] || 'var(--text-tertiary)';
  };

  const getRiskBadgeVariant = (risk) => {
    if (risk === 'critical' || risk === 'high') return 'danger';
    if (risk === 'medium') return 'warning';
    return 'success';
  };

  if (!hasRepository) {
    return (
      <div className="blast-radius-page">
        <EmptyState
          icon="💥"
          title="No Repository Analyzed"
          description="Analyze a repository to see the blast radius of code changes"
          action={
            <Button variant="primary" size="medium">
              Analyze Repository
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="blast-radius-page">
      {/* Header */}
      <div className="blast-header">
        <div>
          <h1 className="blast-title">Blast Radius</h1>
          <p className="blast-subtitle">Analyze the impact of code changes</p>
        </div>
        <div className="blast-actions">
          <Button variant="secondary" size="small">
            Export Report
          </Button>
          <Button variant="primary" size="small">
            Analyze Impact
          </Button>
        </div>
      </div>

      {/* File Selector */}
      <Card>
        <h3 className="section-title">Select File to Analyze</h3>
        <Separator />
        <div className="file-selector">
          <Input
            type="search"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon="🔍"
          />
          <div className="files-list">
            {filteredFiles.map((file) => (
              <button
                key={file.id}
                className={`file-item ${selectedFile?.id === file.id ? 'selected' : ''}`}
                onClick={() => setSelectedFile(file)}
              >
                <div className="file-info">
                  <span className="file-icon">📄</span>
                  <div className="file-details">
                    <span className="file-name">{file.name}</span>
                    <span className="file-path">{file.path}</span>
                  </div>
                </div>
                <Badge variant="secondary" size="small">
                  {file.type}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {selectedFile && (
        <>
          {/* Impact Summary */}
          <Card className="impact-summary-card">
            <div className="impact-summary-header">
              <h3 className="section-title">Impact Summary</h3>
              <div className="summary-stats">
                <div className="summary-stat">
                  <span className="stat-value">{totalImpact}</span>
                  <span className="stat-label">Total Files</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-value critical">{MOCK_IMPACT.direct.length}</span>
                  <span className="stat-label">Direct</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-value warning">{MOCK_IMPACT.indirect.length}</span>
                  <span className="stat-label">Indirect</span>
                </div>
                {showTests && (
                  <div className="summary-stat">
                    <span className="stat-value info">{MOCK_IMPACT.tests.length}</span>
                    <span className="stat-label">Tests</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="impact-visualization">
              <div className="impact-center">
                <div className="center-file">
                  <span className="center-icon">🎯</span>
                  <span className="center-name">{selectedFile.name}</span>
                </div>
              </div>
              <div className="impact-rings">
                <div className="impact-ring direct"></div>
                <div className="impact-ring indirect"></div>
                <div className="impact-ring tests"></div>
              </div>
            </div>

            <div className="impact-legend">
              <div className="legend-item">
                <span className="legend-ring direct"></span>
                <span>Direct Impact</span>
              </div>
              <div className="legend-item">
                <span className="legend-ring indirect"></span>
                <span>Indirect Impact</span>
              </div>
              <div className="legend-item">
                <span className="legend-ring tests"></span>
                <span>Test Files</span>
              </div>
            </div>
          </Card>

          {/* Affected Files */}
          <div className="affected-sections">
            {/* Direct Impact */}
            <Card>
              <div className="section-header">
                <h3 className="section-title">Direct Impact</h3>
                <Badge variant="danger">{MOCK_IMPACT.direct.length} files</Badge>
              </div>
              <Separator />
              <div className="affected-files-list">
                {MOCK_IMPACT.direct.map((item, idx) => (
                  <div key={idx} className="affected-file-item">
                    <div className="affected-file-info">
                      <span 
                        className="risk-indicator"
                        style={{ background: getRiskColor(item.risk) }}
                      ></span>
                      <div className="affected-file-details">
                        <code className="affected-file-path">{item.file}</code>
                        <span className="affected-file-reason">{item.reason}</span>
                      </div>
                    </div>
                    <Badge variant={getRiskBadgeVariant(item.risk)} size="small">
                      {item.risk}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Indirect Impact */}
            <Card>
              <div className="section-header">
                <h3 className="section-title">Indirect Impact</h3>
                <Badge variant="warning">{MOCK_IMPACT.indirect.length} files</Badge>
              </div>
              <Separator />
              <div className="affected-files-list">
                {MOCK_IMPACT.indirect.map((item, idx) => (
                  <div key={idx} className="affected-file-item">
                    <div className="affected-file-info">
                      <span 
                        className="risk-indicator"
                        style={{ background: getRiskColor(item.risk) }}
                      ></span>
                      <div className="affected-file-details">
                        <code className="affected-file-path">{item.file}</code>
                        <span className="affected-file-reason">{item.reason}</span>
                      </div>
                    </div>
                    <Badge variant={getRiskBadgeVariant(item.risk)} size="small">
                      {item.risk}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Test Files */}
            {showTests && (
              <Card>
                <div className="section-header">
                  <h3 className="section-title">Test Files</h3>
                  <Badge variant="secondary">{MOCK_IMPACT.tests.length} files</Badge>
                </div>
                <Separator />
                <div className="affected-files-list">
                  {MOCK_IMPACT.tests.map((item, idx) => (
                    <div key={idx} className="affected-file-item">
                      <div className="affected-file-info">
                        <span 
                          className="risk-indicator"
                          style={{ background: getRiskColor(item.risk) }}
                        ></span>
                        <div className="affected-file-details">
                          <code className="affected-file-path">{item.file}</code>
                          <span className="affected-file-reason">{item.reason}</span>
                        </div>
                      </div>
                      <Badge variant={getRiskBadgeVariant(item.risk)} size="small">
                        {item.risk}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Recommendations */}
          <Card>
            <h3 className="section-title">Recommendations</h3>
            <Separator />
            <div className="recommendations-list">
              {MOCK_RECOMMENDATIONS.map((rec) => (
                <div key={rec.id} className={`recommendation-item ${rec.type}`}>
                  <div className="recommendation-icon">
                    {rec.type === 'critical' && '🚨'}
                    {rec.type === 'warning' && '⚠️'}
                    {rec.type === 'info' && 'ℹ️'}
                  </div>
                  <div className="recommendation-content">
                    <h4 className="recommendation-title">{rec.title}</h4>
                    <p className="recommendation-description">{rec.description}</p>
                    <Button variant="ghost" size="small">
                      {rec.action} →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default BlastRadius;

// Made with Bob
