'use client';
import React, { useState } from 'react';
import './Workspaces.css';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Select } from '../components/ui/Dropdown';
import EmptyState from '../components/ui/EmptyState';
import Separator from '../components/ui/Separator';

// Mock saved workspaces data
const MOCK_WORKSPACES = [
  {
    id: 1,
    name: 'E-Commerce Platform',
    repository: 'github.com/company/ecommerce',
    lastAnalyzed: '2 hours ago',
    techStack: ['React', 'Node.js', 'PostgreSQL', 'Redis'],
    securityScore: 92,
    filesCount: 234,
    linesOfCode: 45678,
    status: 'healthy',
    starred: true
  },
  {
    id: 2,
    name: 'Mobile Banking App',
    repository: 'github.com/fintech/banking-app',
    lastAnalyzed: '1 day ago',
    techStack: ['React Native', 'Express', 'MongoDB'],
    securityScore: 78,
    filesCount: 156,
    linesOfCode: 28934,
    status: 'warning',
    starred: false
  },
  {
    id: 3,
    name: 'Analytics Dashboard',
    repository: 'github.com/analytics/dashboard',
    lastAnalyzed: '3 days ago',
    techStack: ['Vue.js', 'Python', 'MySQL'],
    securityScore: 85,
    filesCount: 89,
    linesOfCode: 15234,
    status: 'healthy',
    starred: true
  },
  {
    id: 4,
    name: 'Social Media API',
    repository: 'github.com/social/api-service',
    lastAnalyzed: '1 week ago',
    techStack: ['Node.js', 'GraphQL', 'PostgreSQL'],
    securityScore: 65,
    filesCount: 178,
    linesOfCode: 32456,
    status: 'critical',
    starred: false
  }
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently Analyzed' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'security', label: 'Security Score' },
  { value: 'size', label: 'Project Size' }
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Workspaces' },
  { value: 'starred', label: 'Starred Only' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'warning', label: 'Needs Attention' },
  { value: 'critical', label: 'Critical Issues' }
];

function Workspaces() {
  const [workspaces, setWorkspaces] = useState(MOCK_WORKSPACES);
  const [sortBy, setSortBy] = useState('recent');
  const [filterBy, setFilterBy] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusColor = (status) => {
    const colors = {
      healthy: 'success',
      warning: 'warning',
      critical: 'danger'
    };
    return colors[status] || 'secondary';
  };

  const getSecurityBadgeVariant = (score) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'danger';
  };

  const toggleStar = (id) => {
    setWorkspaces(workspaces.map(ws => 
      ws.id === id ? { ...ws, starred: !ws.starred } : ws
    ));
  };

  const filteredWorkspaces = workspaces.filter(ws => {
    // Search filter
    if (searchQuery && !ws.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !ws.repository.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Status filter
    if (filterBy === 'starred' && !ws.starred) return false;
    if (filterBy !== 'all' && filterBy !== 'starred' && ws.status !== filterBy) return false;

    return true;
  });

  if (workspaces.length === 0) {
    return (
      <div className="workspaces-page">
        <EmptyState
          icon="📁"
          title="No Saved Workspaces"
          description="Analyze your first repository to create a workspace"
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
    <div className="workspaces-page">
      {/* Header */}
      <div className="workspaces-header">
        <div>
          <h1 className="workspaces-title">Saved Workspaces</h1>
          <p className="workspaces-subtitle">
            {filteredWorkspaces.length} workspace{filteredWorkspaces.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" size="medium">
          + New Analysis
        </Button>
      </div>

      {/* Filters & Search */}
      <Card padding="md">
        <div className="workspaces-controls">
          <div className="search-box">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 14L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="controls-right">
            <Select
              value={filterBy}
              onChange={setFilterBy}
              options={FILTER_OPTIONS}
            />
            <Select
              value={sortBy}
              onChange={setSortBy}
              options={SORT_OPTIONS}
            />
          </div>
        </div>
      </Card>

      {/* Workspaces Grid */}
      <div className="workspaces-grid">
        {filteredWorkspaces.map((workspace) => (
          <Card key={workspace.id} hover className="workspace-card">
            <div className="workspace-card-header">
              <div className="workspace-title-row">
                <h3 className="workspace-name">{workspace.name}</h3>
                <button
                  className={`star-button ${workspace.starred ? 'starred' : ''}`}
                  onClick={() => toggleStar(workspace.id)}
                  aria-label={workspace.starred ? 'Unstar' : 'Star'}
                >
                  {workspace.starred ? '★' : '☆'}
                </button>
              </div>
              <p className="workspace-repository">{workspace.repository}</p>
            </div>

            <Separator />

            {/* Stats */}
            <div className="workspace-stats">
              <div className="stat-item">
                <span className="stat-label">Security</span>
                <Badge variant={getSecurityBadgeVariant(workspace.securityScore)}>
                  {workspace.securityScore}/100
                </Badge>
              </div>
              <div className="stat-item">
                <span className="stat-label">Status</span>
                <Badge variant={getStatusColor(workspace.status)}>
                  {workspace.status}
                </Badge>
              </div>
            </div>

            <div className="workspace-metrics">
              <div className="metric">
                <span className="metric-value">{workspace.filesCount}</span>
                <span className="metric-label">Files</span>
              </div>
              <div className="metric">
                <span className="metric-value">{(workspace.linesOfCode / 1000).toFixed(1)}k</span>
                <span className="metric-label">Lines</span>
              </div>
            </div>

            {/* Tech Stack */}
            <div className="workspace-tech-stack">
              {workspace.techStack.slice(0, 3).map((tech, idx) => (
                <span key={idx} className="tech-tag">{tech}</span>
              ))}
              {workspace.techStack.length > 3 && (
                <span className="tech-tag-more">+{workspace.techStack.length - 3}</span>
              )}
            </div>

            <Separator />

            {/* Footer */}
            <div className="workspace-card-footer">
              <span className="last-analyzed">
                Analyzed {workspace.lastAnalyzed}
              </span>
              <div className="workspace-actions">
                <Button variant="ghost" size="small">
                  View
                </Button>
                <Button variant="secondary" size="small">
                  Re-analyze
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State for Filtered Results */}
      {filteredWorkspaces.length === 0 && (
        <Card padding="xl">
          <EmptyState
            icon="🔍"
            title="No Workspaces Found"
            description="Try adjusting your filters or search query"
          />
        </Card>
      )}
    </div>
  );
}

export default Workspaces;

// Made with Bob