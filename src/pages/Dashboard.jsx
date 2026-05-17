'use client';
/**
 * Dashboard Page
 * Mission control - overview, stats, recent activity
 */

import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import './Dashboard.css';

const Dashboard = () => {
  // Mock data - will be replaced with real data
  const stats = [
    {
      label: 'Repositories Analyzed',
      value: '12',
      change: '+3 this week',
      trend: 'up'
    },
    {
      label: 'Security Issues Found',
      value: '47',
      change: '-12 resolved',
      trend: 'down'
    },
    {
      label: 'Time Saved',
      value: '156h',
      change: '+24h this week',
      trend: 'up'
    },
    {
      label: 'AI Insights Generated',
      value: '2.4k',
      change: '+340 this week',
      trend: 'up'
    }
  ];

  const recentAnalyses = [
    {
      id: 1,
      name: 'devdock-v2',
      type: 'Full Analysis',
      status: 'completed',
      timestamp: '2 hours ago',
      insights: 156,
      security: 'medium'
    },
    {
      id: 2,
      name: 'api-gateway',
      type: 'Security Scan',
      status: 'completed',
      timestamp: '5 hours ago',
      insights: 89,
      security: 'high'
    },
    {
      id: 3,
      name: 'frontend-app',
      type: 'Architecture',
      status: 'processing',
      timestamp: '1 day ago',
      insights: 234,
      security: 'safe'
    }
  ];

  const quickActions = [
    {
      icon: '◈',
      title: 'Analyze Repository',
      description: 'Start a new code analysis',
      action: '/dashboard?action=analyze'
    },
    {
      icon: '◓',
      title: 'Security Scan',
      description: 'Run vulnerability check',
      action: '/security-scanner'
    },
    {
      icon: '◔',
      title: 'Ask AI',
      description: 'Chat with code assistant',
      action: '/chat'
    },
    {
      icon: '◉',
      title: 'View Graph',
      description: 'Explore repository network',
      action: '/repository-graph'
    }
  ];

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">Welcome back! Here's your code intelligence overview.</p>
        </div>
        
        <div className="dashboard-header-actions">
          <Button variant="secondary" size="md">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            New Analysis
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-stats">
        {stats.map((stat, index) => (
          <Card key={index} className="dashboard-stat-card">
            <div className="dashboard-stat-label">{stat.label}</div>
            <div className="dashboard-stat-value">{stat.value}</div>
            <div className={`dashboard-stat-change dashboard-stat-change-${stat.trend}`}>
              {stat.trend === 'up' ? '↑' : '↓'} {stat.change}
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-content">
        {/* Recent Analyses */}
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">Recent Analyses</h2>
            <Link to="/workspaces" className="dashboard-section-link">
              View All →
            </Link>
          </div>

          <div className="dashboard-analyses">
            {recentAnalyses.map((analysis) => (
              <Card key={analysis.id} className="dashboard-analysis-card">
                <div className="dashboard-analysis-header">
                  <div className="dashboard-analysis-info">
                    <h3 className="dashboard-analysis-name">{analysis.name}</h3>
                    <span className="dashboard-analysis-type">{analysis.type}</span>
                  </div>
                  <Badge variant={analysis.security}>{analysis.security}</Badge>
                </div>

                <div className="dashboard-analysis-meta">
                  <span className="dashboard-analysis-meta-item">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    {analysis.timestamp}
                  </span>
                  <span className="dashboard-analysis-meta-item">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 2L9 5H12L9.5 7.5L10.5 11L7 8.5L3.5 11L4.5 7.5L2 5H5L7 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                    {analysis.insights} insights
                  </span>
                </div>

                <div className="dashboard-analysis-actions">
                  <Button variant="ghost" size="sm">View Details</Button>
                  {analysis.status === 'processing' && (
                    <span className="dashboard-analysis-status">Processing...</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-sidebar">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">Quick Actions</h2>
          </div>

          <div className="dashboard-quick-actions">
            {quickActions.map((action, index) => (
              <Link key={index} to={action.action} className="dashboard-quick-action">
                <div className="dashboard-quick-action-icon">{action.icon}</div>
                <div className="dashboard-quick-action-content">
                  <div className="dashboard-quick-action-title">{action.title}</div>
                  <div className="dashboard-quick-action-description">{action.description}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="dashboard-quick-action-arrow">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
          </div>

          {/* Repository Input */}
          <Card className="dashboard-repo-input">
            <h3 className="dashboard-repo-input-title">Analyze New Repository</h3>
            <p className="dashboard-repo-input-description">
              Enter a GitHub URL or repository name
            </p>
            <Input
              type="text"
              placeholder="https://github.com/user/repo"
              icon={
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2C4.5 2 2 4.5 2 8C2 10.8 3.8 13.2 6.3 14C6.6 14.1 6.7 13.9 6.7 13.7V12.5C4.9 12.9 4.5 11.6 4.5 11.6C4.2 10.9 3.8 10.7 3.8 10.7C3.2 10.3 3.8 10.3 3.8 10.3C4.4 10.4 4.8 10.9 4.8 10.9C5.4 11.8 6.3 11.5 6.7 11.3C6.8 10.9 6.9 10.6 7.1 10.4C5.6 10.2 4 9.6 4 7.2C4 6.5 4.2 5.9 4.8 5.5C4.7 5.3 4.5 4.6 4.9 3.7C4.9 3.7 5.5 3.5 6.7 4.3C7.2 4.1 7.8 4 8.4 4C9 4 9.6 4.1 10.1 4.3C11.3 3.5 11.9 3.7 11.9 3.7C12.3 4.6 12.1 5.3 12 5.5C12.6 5.9 12.8 6.5 12.8 7.2C12.8 9.6 11.2 10.2 9.7 10.4C9.9 10.6 10.1 11 10.1 11.6V13.7C10.1 13.9 10.2 14.1 10.5 14C13 13.2 14.8 10.8 14.8 8C14 4.5 11.5 2 8 2Z" fill="currentColor" />
                </svg>
              }
            />
            <Button variant="primary" size="md" className="dashboard-repo-input-button">
              Start Analysis
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

// Made with Bob
