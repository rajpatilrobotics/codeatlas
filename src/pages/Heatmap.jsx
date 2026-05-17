'use client';
import React, { useState } from 'react';
import './Heatmap.css';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Dropdown from '../components/ui/Dropdown';
import EmptyState from '../components/ui/EmptyState';

// Mock heatmap data
const MOCK_FILES = [
  { path: 'src/App.jsx', changes: 45, contributors: 5, lastModified: '2 hours ago', activity: 'high' },
  { path: 'src/components/Dashboard.jsx', changes: 32, contributors: 3, lastModified: '5 hours ago', activity: 'high' },
  { path: 'src/services/authService.js', changes: 28, contributors: 4, lastModified: '1 day ago', activity: 'medium' },
  { path: 'src/utils/apiClient.js', changes: 23, contributors: 3, lastModified: '3 days ago', activity: 'medium' },
  { path: 'src/components/Header.jsx', changes: 18, contributors: 2, lastModified: '1 week ago', activity: 'low' },
  { path: 'src/pages/Profile.jsx', changes: 15, contributors: 2, lastModified: '2 weeks ago', activity: 'low' },
  { path: 'src/config/database.js', changes: 12, contributors: 2, lastModified: '3 weeks ago', activity: 'low' },
  { path: 'README.md', changes: 8, contributors: 4, lastModified: '1 month ago', activity: 'low' },
];

const MOCK_CONTRIBUTORS = [
  { name: 'Alice Johnson', commits: 156, additions: 4523, deletions: 1234, avatar: '👩‍💻' },
  { name: 'Bob Smith', commits: 98, additions: 2890, deletions: 876, avatar: '👨‍💻' },
  { name: 'Carol Davis', commits: 67, additions: 1987, deletions: 543, avatar: '👩‍💼' },
  { name: 'David Wilson', commits: 45, additions: 1234, deletions: 432, avatar: '👨‍💼' },
];

const MOCK_ACTIVITY_DATA = [
  { day: 'Mon', commits: 12, additions: 345, deletions: 123 },
  { day: 'Tue', commits: 18, additions: 567, deletions: 234 },
  { day: 'Wed', commits: 15, additions: 432, deletions: 156 },
  { day: 'Thu', commits: 22, additions: 678, deletions: 289 },
  { day: 'Fri', commits: 19, additions: 543, deletions: 198 },
  { day: 'Sat', commits: 8, additions: 234, deletions: 87 },
  { day: 'Sun', commits: 5, additions: 156, deletions: 45 },
];

const TIME_RANGES = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
];

function Heatmap() {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedFile, setSelectedFile] = useState(null);
  const hasRepository = true;

  const getActivityColor = (activity) => {
    const colors = {
      high: 'var(--status-error)',
      medium: 'var(--status-warning)',
      low: 'var(--status-success)'
    };
    return colors[activity] || 'var(--text-tertiary)';
  };

  const getActivityIntensity = (changes) => {
    if (changes > 30) return 1;
    if (changes > 20) return 0.7;
    if (changes > 10) return 0.4;
    return 0.2;
  };

  const maxCommits = Math.max(...MOCK_ACTIVITY_DATA.map(d => d.commits));

  if (!hasRepository) {
    return (
      <div className="heatmap-page">
        <EmptyState
          icon="🔥"
          title="No Repository Analyzed"
          description="Analyze a repository to visualize code activity"
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
    <div className="heatmap-page">
      {/* Header */}
      <div className="heatmap-header">
        <div>
          <h1 className="heatmap-title">Activity Heatmap</h1>
          <p className="heatmap-subtitle">Visualize code changes and contributor activity</p>
        </div>
        <div className="heatmap-actions">
          <Dropdown
            options={TIME_RANGES}
            value={timeRange}
            onChange={setTimeRange}
            placeholder="Select time range"
          />
          <Button variant="primary" size="small">
            Export Data
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="heatmap-stats">
        <Card className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <div className="stat-value">
              {MOCK_ACTIVITY_DATA.reduce((sum, d) => sum + d.commits, 0)}
            </div>
            <div className="stat-label">Total Commits</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">➕</div>
          <div className="stat-content">
            <div className="stat-value">
              {MOCK_ACTIVITY_DATA.reduce((sum, d) => sum + d.additions, 0).toLocaleString()}
            </div>
            <div className="stat-label">Lines Added</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">➖</div>
          <div className="stat-content">
            <div className="stat-value">
              {MOCK_ACTIVITY_DATA.reduce((sum, d) => sum + d.deletions, 0).toLocaleString()}
            </div>
            <div className="stat-label">Lines Deleted</div>
          </div>
        </Card>
        <Card className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{MOCK_CONTRIBUTORS.length}</div>
            <div className="stat-label">Contributors</div>
          </div>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card>
        <h3 className="section-title">Weekly Activity</h3>
        <div className="activity-chart">
          {MOCK_ACTIVITY_DATA.map((data, idx) => (
            <div key={idx} className="activity-day">
              <div className="activity-bar-container">
                <div 
                  className="activity-bar"
                  style={{ 
                    height: `${(data.commits / maxCommits) * 100}%`,
                    background: `linear-gradient(180deg, var(--accent-cyan) 0%, #0891b2 100%)`
                  }}
                  title={`${data.commits} commits`}
                />
              </div>
              <div className="activity-day-label">{data.day}</div>
              <div className="activity-day-value">{data.commits}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* File Heatmap */}
      <Card>
        <h3 className="section-title">File Activity Heatmap</h3>
        <div className="file-heatmap">
          {MOCK_FILES.map((file, idx) => (
            <div
              key={idx}
              className={`heatmap-file ${selectedFile?.path === file.path ? 'selected' : ''}`}
              onClick={() => setSelectedFile(file)}
              style={{
                background: `rgba(6, 182, 212, ${getActivityIntensity(file.changes)})`
              }}
            >
              <div className="heatmap-file-path">{file.path}</div>
              <div className="heatmap-file-stats">
                <span className="file-changes">{file.changes} changes</span>
                <Badge variant="secondary" size="small">
                  {file.contributors} contributors
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Selected File Details */}
      {selectedFile && (
        <Card className="file-details-card">
          <h3 className="section-title">File Details</h3>
          <div className="file-details-content">
            <div className="detail-row">
              <span className="detail-label">File Path</span>
              <code className="detail-value">{selectedFile.path}</code>
            </div>
            <div className="detail-row">
              <span className="detail-label">Total Changes</span>
              <span className="detail-value">{selectedFile.changes}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Contributors</span>
              <span className="detail-value">{selectedFile.contributors}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Last Modified</span>
              <span className="detail-value">{selectedFile.lastModified}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Activity Level</span>
              <Badge 
                variant={selectedFile.activity === 'high' ? 'danger' : selectedFile.activity === 'medium' ? 'warning' : 'success'}
                size="small"
              >
                {selectedFile.activity}
              </Badge>
            </div>
          </div>
          <div className="file-details-actions">
            <Button variant="primary" size="small">
              View History
            </Button>
            <Button variant="secondary" size="small">
              View File
            </Button>
          </div>
        </Card>
      )}

      {/* Top Contributors */}
      <Card>
        <h3 className="section-title">Top Contributors</h3>
        <div className="contributors-list">
          {MOCK_CONTRIBUTORS.map((contributor, idx) => (
            <div key={idx} className="contributor-item">
              <div className="contributor-rank">{idx + 1}</div>
              <div className="contributor-avatar">{contributor.avatar}</div>
              <div className="contributor-info">
                <div className="contributor-name">{contributor.name}</div>
                <div className="contributor-stats">
                  <span className="contributor-stat">
                    {contributor.commits} commits
                  </span>
                  <span className="contributor-stat">
                    +{contributor.additions.toLocaleString()}
                  </span>
                  <span className="contributor-stat">
                    -{contributor.deletions.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="contributor-progress">
                <div 
                  className="contributor-progress-bar"
                  style={{ 
                    width: `${(contributor.commits / MOCK_CONTRIBUTORS[0].commits) * 100}%` 
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Activity Legend */}
      <Card className="legend-card">
        <h3 className="section-title">Activity Levels</h3>
        <div className="activity-legend">
          <div className="legend-item">
            <div className="legend-box high"></div>
            <span className="legend-label">High (30+ changes)</span>
          </div>
          <div className="legend-item">
            <div className="legend-box medium"></div>
            <span className="legend-label">Medium (10-30 changes)</span>
          </div>
          <div className="legend-item">
            <div className="legend-box low"></div>
            <span className="legend-label">Low (1-10 changes)</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default Heatmap;

// Made with Bob
