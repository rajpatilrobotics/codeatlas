'use client';
import React, { useState } from 'react';
import './DebugNavigator.css';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import Separator from '../components/ui/Separator';

// Mock error data
const MOCK_ERRORS = [
  {
    id: 1,
    type: 'TypeError',
    message: 'Cannot read property "map" of undefined',
    file: 'src/components/Dashboard.jsx',
    line: 45,
    column: 12,
    severity: 'error',
    timestamp: '2 hours ago',
    stackTrace: [
      { file: 'src/components/Dashboard.jsx', line: 45, function: 'Dashboard.render' },
      { file: 'src/App.jsx', line: 23, function: 'App' },
      { file: 'src/index.js', line: 7, function: 'render' }
    ],
    context: {
      before: '  const stats = data.analytics;',
      error: '  const items = stats.items.map(item => ({',
      after: '    id: item.id,'
    },
    suggestion: 'Add null check before accessing stats.items',
    occurrences: 12,
    firstSeen: '3 days ago',
    lastSeen: '2 hours ago'
  },
  {
    id: 2,
    type: 'ReferenceError',
    message: 'authToken is not defined',
    file: 'src/services/apiClient.js',
    line: 78,
    column: 5,
    severity: 'error',
    timestamp: '5 hours ago',
    stackTrace: [
      { file: 'src/services/apiClient.js', line: 78, function: 'makeRequest' },
      { file: 'src/services/userService.js', line: 34, function: 'fetchUser' },
      { file: 'src/pages/Profile.jsx', line: 12, function: 'Profile.useEffect' }
    ],
    context: {
      before: '  headers: {',
      error: '    Authorization: `Bearer ${authToken}`,',
      after: '    "Content-Type": "application/json"'
    },
    suggestion: 'Import authToken from auth service or use getAuthToken()',
    occurrences: 8,
    firstSeen: '2 days ago',
    lastSeen: '5 hours ago'
  },
  {
    id: 3,
    type: 'Warning',
    message: 'React Hook useEffect has a missing dependency',
    file: 'src/hooks/useFetch.js',
    line: 23,
    column: 6,
    severity: 'warning',
    timestamp: '1 day ago',
    stackTrace: [],
    context: {
      before: '  useEffect(() => {',
      error: '    fetchData(url);',
      after: '  }, []);'
    },
    suggestion: 'Add "url" to the dependency array or remove it if not needed',
    occurrences: 15,
    firstSeen: '5 days ago',
    lastSeen: '1 day ago'
  },
  {
    id: 4,
    type: 'NetworkError',
    message: 'Failed to fetch: 500 Internal Server Error',
    file: 'src/api/routes/users.js',
    line: 156,
    column: 8,
    severity: 'error',
    timestamp: '30 minutes ago',
    stackTrace: [
      { file: 'src/api/routes/users.js', line: 156, function: 'getUsers' },
      { file: 'src/middleware/errorHandler.js', line: 12, function: 'handleError' }
    ],
    context: {
      before: '  const users = await User.findAll({',
      error: '    where: { status: "active" }',
      after: '  });'
    },
    suggestion: 'Check database connection and query syntax',
    occurrences: 3,
    firstSeen: '6 hours ago',
    lastSeen: '30 minutes ago'
  }
];

const SEVERITY_COLORS = {
  error: 'danger',
  warning: 'warning',
  info: 'secondary'
};

function DebugNavigator() {
  const [errors, setErrors] = useState(MOCK_ERRORS);
  const [selectedError, setSelectedError] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const hasRepository = true;

  const filteredErrors = errors.filter(error => {
    const matchesSeverity = filterSeverity === 'all' || error.severity === filterSeverity;
    const matchesSearch = error.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         error.file.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         error.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const stats = {
    total: errors.length,
    errors: errors.filter(e => e.severity === 'error').length,
    warnings: errors.filter(e => e.severity === 'warning').length,
    totalOccurrences: errors.reduce((sum, e) => sum + e.occurrences, 0)
  };

  if (!hasRepository) {
    return (
      <div className="debug-navigator-page">
        <EmptyState
          icon="🐛"
          title="No Repository Analyzed"
          description="Analyze a repository to track and debug errors"
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
    <div className="debug-navigator-page">
      {/* Header */}
      <div className="debug-header">
        <div>
          <h1 className="debug-title">Debug Navigator</h1>
          <p className="debug-subtitle">Track and resolve errors efficiently</p>
        </div>
        <div className="debug-actions">
          <Button variant="secondary" size="small">
            Clear All
          </Button>
          <Button variant="primary" size="small">
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="debug-stats">
        <Card className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Issues</div>
          </div>
        </Card>
        <Card className="stat-card error">
          <div className="stat-icon">🔴</div>
          <div className="stat-content">
            <div className="stat-value">{stats.errors}</div>
            <div className="stat-label">Errors</div>
          </div>
        </Card>
        <Card className="stat-card warning">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{stats.warnings}</div>
            <div className="stat-label">Warnings</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalOccurrences}</div>
            <div className="stat-label">Occurrences</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="filters-card">
        <div className="filters-row">
          <Input
            type="search"
            placeholder="Search errors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon="🔍"
          />
          <div className="severity-filters">
            {['all', 'error', 'warning', 'info'].map(severity => (
              <button
                key={severity}
                className={`filter-button ${filterSeverity === severity ? 'active' : ''}`}
                onClick={() => setFilterSeverity(severity)}
              >
                {severity === 'all' ? 'All' : severity.charAt(0).toUpperCase() + severity.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Errors List */}
      <div className="errors-container">
        {filteredErrors.map(error => (
          <Card 
            key={error.id}
            className={`error-card ${error.severity} ${selectedError?.id === error.id ? 'selected' : ''}`}
            onClick={() => setSelectedError(selectedError?.id === error.id ? null : error)}
          >
            <div className="error-header">
              <div className="error-header-left">
                <div className="error-type-line">
                  <Badge variant={SEVERITY_COLORS[error.severity]} size="small">
                    {error.severity}
                  </Badge>
                  <span className="error-type">{error.type}</span>
                  <span className="error-timestamp">{error.timestamp}</span>
                </div>
                <h3 className="error-message">{error.message}</h3>
                <div className="error-location">
                  <code className="error-file">{error.file}</code>
                  <span className="error-line-col">:{error.line}:{error.column}</span>
                </div>
              </div>
              <div className="error-occurrences">
                <span className="occurrences-count">{error.occurrences}</span>
                <span className="occurrences-label">times</span>
              </div>
            </div>

            {selectedError?.id === error.id && (
              <div className="error-details">
                <Separator />

                {/* Code Context */}
                <div className="code-context-section">
                  <h4 className="section-title">Code Context</h4>
                  <div className="code-context">
                    <div className="code-line before">{error.context.before}</div>
                    <div className="code-line error-line">
                      <span className="line-indicator">→</span>
                      {error.context.error}
                    </div>
                    <div className="code-line after">{error.context.after}</div>
                  </div>
                </div>

                {/* AI Suggestion */}
                <div className="suggestion-section">
                  <h4 className="section-title">💡 AI Suggestion</h4>
                  <div className="suggestion-box">
                    <p className="suggestion-text">{error.suggestion}</p>
                    <Button variant="ghost" size="small">
                      Apply Fix →
                    </Button>
                  </div>
                </div>

                {/* Stack Trace */}
                {error.stackTrace.length > 0 && (
                  <div className="stack-trace-section">
                    <h4 className="section-title">Stack Trace</h4>
                    <div className="stack-trace">
                      {error.stackTrace.map((frame, idx) => (
                        <div key={idx} className="stack-frame">
                          <span className="frame-number">{idx + 1}</span>
                          <div className="frame-details">
                            <span className="frame-function">{frame.function}</span>
                            <span className="frame-location">
                              {frame.file}:{frame.line}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="timeline-section">
                  <h4 className="section-title">Timeline</h4>
                  <div className="timeline-info">
                    <div className="timeline-item">
                      <span className="timeline-label">First Seen:</span>
                      <span className="timeline-value">{error.firstSeen}</span>
                    </div>
                    <div className="timeline-item">
                      <span className="timeline-label">Last Seen:</span>
                      <span className="timeline-value">{error.lastSeen}</span>
                    </div>
                    <div className="timeline-item">
                      <span className="timeline-label">Occurrences:</span>
                      <span className="timeline-value">{error.occurrences} times</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="error-actions">
                  <Button variant="primary" size="small">
                    Open in Editor
                  </Button>
                  <Button variant="secondary" size="small">
                    Mark as Resolved
                  </Button>
                  <Button variant="ghost" size="small">
                    Ignore
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {filteredErrors.length === 0 && (
        <EmptyState
          icon="✨"
          title="No Errors Found"
          description="Your code is looking clean! Try adjusting filters to see more."
        />
      )}
    </div>
  );
}

export default DebugNavigator;

// Made with Bob
