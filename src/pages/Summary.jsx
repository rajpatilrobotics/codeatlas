'use client';
/**
 * Summary Page
 * Repository overview with AI insights
 * Redesigned for CodeAtlas V2
 */

import React from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Separator from '../components/ui/Separator';
import './Summary.css';

const Summary = ({ 
  repoUrl, 
  repoSize, 
  repoData, 
  aiSummary, 
  isSummaryLoading, 
  summaryError, 
  quickStartGuide, 
  isQuickStartLoading, 
  commonIssues, 
  isIssuesLoading, 
  firstContributions, 
  isContributionsLoading, 
  codeAnalysis, 
  isCodeAnalysisLoading 
}) => {
  // If no repoData, show empty state
  if (!repoData) {
    return (
      <div className="summary-page">
        <EmptyState
          icon="📦"
          title="No Repository Data"
          message="Analyze a repository to see comprehensive insights here."
          action={{ label: 'Start Analysis', onClick: () => {} }}
        />
      </div>
    );
  }

  const { 
    repoInfo, 
    importantFiles, 
    readme, 
    techStack, 
    contributors, 
    commitActivity, 
    keyCommands, 
    complexity, 
    envVariables 
  } = repoData;

  // Truncate README
  const readmePreview = readme && readme !== 'No README found'
    ? readme.substring(0, 500) + (readme.length > 500 ? '...' : '')
    : 'No README found';

  return (
    <div className="summary-page">
      {/* Page Header */}
      <div className="summary-header">
        <div>
          <h1 className="summary-title">Repository Summary</h1>
          <p className="summary-subtitle">Comprehensive analysis and insights</p>
        </div>
      </div>

      {/* Repository Overview */}
      <Card className="summary-card">
        <div className="summary-card-header">
          <h2 className="summary-card-title">Repository Overview</h2>
        </div>
        <div className="summary-card-body">
          <div className="summary-stats-grid">
            <div className="summary-stat">
              <span className="summary-stat-label">Repository</span>
              <a 
                href={repoInfo.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="summary-stat-link"
              >
                {repoInfo.name}
              </a>
            </div>
            <div className="summary-stat">
              <span className="summary-stat-label">Description</span>
              <span className="summary-stat-value">{repoInfo.description}</span>
            </div>
            <div className="summary-stat">
              <span className="summary-stat-label">Language</span>
              <span className="summary-stat-value">{repoInfo.language}</span>
            </div>
            <div className="summary-stat">
              <span className="summary-stat-label">Stars</span>
              <span className="summary-stat-value">⭐ {repoInfo.stars.toLocaleString()}</span>
            </div>
            <div className="summary-stat">
              <span className="summary-stat-label">License</span>
              <span className="summary-stat-value">{repoInfo.license}</span>
            </div>
            <div className="summary-stat">
              <span className="summary-stat-label">Files</span>
              <span className="summary-stat-value">{repoSize.toLocaleString()}</span>
            </div>
            <div className="summary-stat">
              <span className="summary-stat-label">Last Updated</span>
              <span className="summary-stat-value">
                {new Date(repoInfo.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Project Complexity */}
      {complexity && (
        <Card className="summary-card">
          <div className="summary-card-header">
            <h2 className="summary-card-title">Project Complexity</h2>
          </div>
          <div className="summary-card-body">
            <div className="complexity-grid">
              <div className="complexity-score-section">
                <div className="complexity-circle" style={{ borderColor: complexity.color }}>
                  <div className="complexity-level" style={{ color: complexity.color }}>
                    {complexity.level}
                  </div>
                  <div className="complexity-score">{complexity.score}/100</div>
                </div>
                <div className="time-comparison">
                  <div className="time-item">
                    <span className="time-label">Traditional</span>
                    <span className="time-value">{complexity.traditionalTime}</span>
                  </div>
                  <div className="time-arrow">→</div>
                  <div className="time-item">
                    <span className="time-label">CodeAtlas</span>
                    <span className="time-value highlight">{complexity.devDockTime}</span>
                  </div>
                </div>
                <div className="time-savings">
                  <span className="savings-icon">⚡</span>
                  <span>Save up to 95% onboarding time</span>
                </div>
              </div>
              <div className="complexity-factors">
                <h3 className="factors-title">Complexity Factors</h3>
                <ul className="factors-list">
                  {complexity.factors.map((factor, idx) => (
                    <li key={idx}>{factor}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* AI Summary */}
      <Card className="summary-card">
        <div className="summary-card-header">
          <h2 className="summary-card-title">AI-Generated Summary</h2>
          <Badge variant="safe">Watsonx</Badge>
        </div>
        <div className="summary-card-body">
          {isSummaryLoading && <LoadingState variant="default" lines={5} />}
          {summaryError && !isSummaryLoading && (
            <ErrorState
              title="Failed to Generate Summary"
              message={summaryError}
              action={{ label: 'Retry', onClick: () => {} }}
            />
          )}
          {aiSummary && !isSummaryLoading && (
            <div className="summary-content">
              <pre className="summary-text">{aiSummary}</pre>
            </div>
          )}
          {!aiSummary && !isSummaryLoading && !summaryError && (
            <EmptyState
              icon="🤖"
              title="No Summary Yet"
              message="AI summary will appear after analysis"
            />
          )}
        </div>
      </Card>

      {/* Tech Stack */}
      {techStack && Object.values(techStack).some(arr => Array.isArray(arr) && arr.length > 0) && (
        <Card className="summary-card">
          <div className="summary-card-header">
            <h2 className="summary-card-title">Tech Stack</h2>
          </div>
          <div className="summary-card-body">
            <div className="tech-stack-grid">
              {techStack.frontend?.length > 0 && (
                <div className="tech-category">
                  <span className="tech-category-label">Frontend</span>
                  <div className="tech-badges">
                    {techStack.frontend.map((tech, idx) => (
                      <Badge key={idx} variant="safe">{tech}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {techStack.backend?.length > 0 && (
                <div className="tech-category">
                  <span className="tech-category-label">Backend</span>
                  <div className="tech-badges">
                    {techStack.backend.map((tech, idx) => (
                      <Badge key={idx} variant="safe">{tech}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {techStack.database?.length > 0 && (
                <div className="tech-category">
                  <span className="tech-category-label">Database</span>
                  <div className="tech-badges">
                    {techStack.database.map((tech, idx) => (
                      <Badge key={idx} variant="safe">{tech}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {techStack.testing?.length > 0 && (
                <div className="tech-category">
                  <span className="tech-category-label">Testing</span>
                  <div className="tech-badges">
                    {techStack.testing.map((tech, idx) => (
                      <Badge key={idx} variant="safe">{tech}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {techStack.devops?.length > 0 && (
                <div className="tech-category">
                  <span className="tech-category-label">DevOps</span>
                  <div className="tech-badges">
                    {techStack.devops.map((tech, idx) => (
                      <Badge key={idx} variant="safe">{tech}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Quick Start Guide */}
      <Card className="summary-card">
        <div className="summary-card-header">
          <h2 className="summary-card-title">Quick Start Guide</h2>
        </div>
        <div className="summary-card-body">
          {isQuickStartLoading && <LoadingState variant="default" lines={8} />}
          {quickStartGuide && !isQuickStartLoading && (
            <div className="summary-content">
              <pre className="summary-text">{quickStartGuide}</pre>
            </div>
          )}
          {!quickStartGuide && !isQuickStartLoading && (
            <EmptyState
              icon="🚀"
              title="No Quick Start Guide"
              message="Guide will be generated during analysis"
            />
          )}
        </div>
      </Card>

      {/* Contributors */}
      {contributors && contributors.length > 0 && (
        <Card className="summary-card">
          <div className="summary-card-header">
            <h2 className="summary-card-title">Top Contributors</h2>
          </div>
          <div className="summary-card-body">
            <div className="contributors-grid">
              {contributors.map((contributor, idx) => (
                <a
                  key={idx}
                  href={contributor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contributor-card"
                >
                  <img
                    src={contributor.avatar}
                    alt={contributor.login}
                    className="contributor-avatar"
                  />
                  <div className="contributor-info">
                    <div className="contributor-name">{contributor.login}</div>
                    <div className="contributor-contributions">
                      {contributor.contributions} contributions
                    </div>
                  </div>
                </a>
              ))}
            </div>
            {commitActivity && (
              <>
                <Separator />
                <div className="commit-activity">
                  <h3 className="activity-title">Recent Activity</h3>
                  <div className="activity-stats">
                    <div className="activity-stat">
                      <span className="stat-number">{commitActivity.totalCommits}</span>
                      <span className="stat-label">commits (12 weeks)</span>
                    </div>
                    <div className="activity-stat">
                      <span className="stat-number">{commitActivity.avgPerWeek}</span>
                      <span className="stat-label">avg/week</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Key Commands */}
      {keyCommands && (
        <Card className="summary-card">
          <div className="summary-card-header">
            <h2 className="summary-card-title">Key Commands</h2>
          </div>
          <div className="summary-card-body">
            <div className="commands-grid">
              {keyCommands.development?.length > 0 && (
                <div className="command-category">
                  <h3 className="command-category-title">Development</h3>
                  {keyCommands.development.map((cmd, idx) => (
                    <div key={idx} className="command-item">
                      <code className="command-code">npm run {cmd.name}</code>
                      <span className="command-desc">{cmd.command}</span>
                    </div>
                  ))}
                </div>
              )}
              {keyCommands.build?.length > 0 && (
                <div className="command-category">
                  <h3 className="command-category-title">Build</h3>
                  {keyCommands.build.map((cmd, idx) => (
                    <div key={idx} className="command-item">
                      <code className="command-code">npm run {cmd.name}</code>
                      <span className="command-desc">{cmd.command}</span>
                    </div>
                  ))}
                </div>
              )}
              {keyCommands.test?.length > 0 && (
                <div className="command-category">
                  <h3 className="command-category-title">Testing</h3>
                  {keyCommands.test.map((cmd, idx) => (
                    <div key={idx} className="command-item">
                      <code className="command-code">npm run {cmd.name}</code>
                      <span className="command-desc">{cmd.command}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Common Issues */}
      <Card className="summary-card">
        <div className="summary-card-header">
          <h2 className="summary-card-title">Common Issues & Solutions</h2>
        </div>
        <div className="summary-card-body">
          {isIssuesLoading && <LoadingState variant="default" lines={6} />}
          {commonIssues && !isIssuesLoading && (
            <div className="summary-content">
              <pre className="summary-text">{commonIssues}</pre>
            </div>
          )}
          {!commonIssues && !isIssuesLoading && (
            <EmptyState
              icon="⚠️"
              title="No Issues Found"
              message="Common issues will appear after analysis"
            />
          )}
        </div>
      </Card>

      {/* First Contributions */}
      <Card className="summary-card">
        <div className="summary-card-header">
          <h2 className="summary-card-title">Your First Contribution</h2>
        </div>
        <div className="summary-card-body">
          {isContributionsLoading && <LoadingState variant="list" lines={3} />}
          {firstContributions && firstContributions.length > 0 && !isContributionsLoading && (
            <div className="contributions-grid">
              {firstContributions.map((contribution, idx) => (
                <div key={idx} className="contribution-card">
                  <div className="contribution-header">
                    <span className="contribution-number">#{idx + 1}</span>
                    <Badge variant={contribution.difficulty.toLowerCase()}>
                      {contribution.difficulty}
                    </Badge>
                  </div>
                  <h3 className="contribution-task">{contribution.task}</h3>
                  <div className="contribution-details">
                    <div className="contribution-detail">
                      <span className="detail-icon">📄</span>
                      <span className="detail-text">{contribution.file}</span>
                    </div>
                    <div className="contribution-detail">
                      <span className="detail-icon">💡</span>
                      <span className="detail-text">{contribution.impact}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!firstContributions?.length && !isContributionsLoading && (
            <EmptyState
              icon="🎯"
              title="No Suggestions Yet"
              message="AI will suggest tasks after analyzing the codebase"
            />
          )}
        </div>
      </Card>

      {/* Environment Variables */}
      {envVariables && envVariables.length > 0 && (
        <Card className="summary-card">
          <div className="summary-card-header">
            <h2 className="summary-card-title">Environment Variables</h2>
          </div>
          <div className="summary-card-body">
            <div className="env-vars-list">
              {envVariables.map((envVar, idx) => (
                <div key={idx} className="env-var-item">
                  <code className="env-var-key">{envVar.key}</code>
                  <span className="env-var-example">{envVar.example}</span>
                </div>
              ))}
            </div>
            <div className="env-note">
              💡 Copy <code>.env.example</code> to <code>.env</code> and configure
            </div>
          </div>
        </Card>
      )}

      {/* Code Analysis */}
      {codeAnalysis && codeAnalysis.summary && (
        <Card className="summary-card">
          <div className="summary-card-header">
            <h2 className="summary-card-title">Code Analysis</h2>
          </div>
          <div className="summary-card-body">
            {isCodeAnalysisLoading ? (
              <LoadingState variant="default" lines={4} />
            ) : (
              <div className="summary-stats-grid">
                <div className="summary-stat">
                  <span className="summary-stat-label">Files Analyzed</span>
                  <span className="summary-stat-value">
                    {codeAnalysis.summary.analyzedFiles || 0}
                  </span>
                </div>
                <div className="summary-stat">
                  <span className="summary-stat-label">Lines of Code</span>
                  <span className="summary-stat-value">
                    {(codeAnalysis.summary.totalLines || 0).toLocaleString()}
                  </span>
                </div>
                {codeAnalysis.definitions?.functions && (
                  <div className="summary-stat">
                    <span className="summary-stat-label">Functions</span>
                    <span className="summary-stat-value">
                      {codeAnalysis.definitions.functions.length}
                    </span>
                  </div>
                )}
                {codeAnalysis.definitions?.classes && (
                  <div className="summary-stat">
                    <span className="summary-stat-label">Classes</span>
                    <span className="summary-stat-value">
                      {codeAnalysis.definitions.classes.length}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Topics */}
      {repoInfo.topics && repoInfo.topics.length > 0 && (
        <Card className="summary-card">
          <div className="summary-card-header">
            <h2 className="summary-card-title">Topics</h2>
          </div>
          <div className="summary-card-body">
            <div className="topics-grid">
              {repoInfo.topics.map((topic, index) => (
                <Badge key={index} variant="safe">{topic}</Badge>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Summary;

// Made with Bob
