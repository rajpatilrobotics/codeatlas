import React from 'react';
import { cleanMarkdown, enhanceTextFormatting } from '../../utils/textFormatting';
import { Star, FileText, GitBranch, Users, Clock, Keyboard, AlertTriangle, Target, FolderTree, Shield, Zap, Tag } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Pill from '../ui/Pill';
import MetricCard from '../ui/MetricCard';

function Summary({ repoUrl, repoSize, repoData, aiSummary, isSummaryLoading, summaryError, quickStartGuide, isQuickStartLoading, commonIssues, isIssuesLoading, firstContributions, isContributionsLoading, codeAnalysis, isCodeAnalysisLoading }) {
  // If no repoData, show placeholder
  if (!repoData) {
    return (
      <div className="tab-content summary-tab">
        <Card title="Repository Overview" icon={FolderTree}>
          <div className="info-row">
            <span className="info-label">Repository URL:</span>
            <span className="info-value">{repoUrl || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Total Files:</span>
            <span className="info-value">{repoSize} files</span>
          </div>
          <div className="info-row">
            <span className="info-label">Analysis Status:</span>
            <Badge variant="success">Complete</Badge>
          </div>
        </Card>
      </div>
    );
  }

  const { repoInfo, importantFiles, readme, techStack, contributors, commitActivity, keyCommands, complexity, envVariables } = repoData;
  const contributionItems = Array.isArray(firstContributions) ? firstContributions : [];

  // Truncate README to first 500 characters
  const readmePreview = readme && readme !== 'No README found'
    ? readme.substring(0, 500) + (readme.length > 500 ? '...' : '')
    : 'No README found';

  return (
    <div className="tab-content summary-tab">
      {/* Repository Overview - Merged Section */}
      <Card title="Repository Overview" icon={FolderTree}>
        <div className="ca-metrics-grid">
          <MetricCard label="Stars" value={repoInfo.stars.toLocaleString()} icon={Star} />
          <MetricCard label="Files" value={repoSize.toLocaleString()} icon={FileText} />
          <MetricCard label="Language" value={repoInfo.language} icon={GitBranch} />
          <MetricCard label="Last Updated" value={new Date(repoInfo.updatedAt).toLocaleDateString()} icon={Clock} />
        </div>
        <div className="repo-stats-grid">
          <div className="stat-row">
            <span className="stat-label">Repository:</span>
            <span className="stat-value">
              <a href={repoInfo.url} target="_blank" rel="noopener noreferrer" className="repo-link">
                {repoInfo.name}
              </a>
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Description:</span>
            <span className="stat-value">{repoInfo.description}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">License:</span>
            <span className="stat-value">{repoInfo.license}</span>
          </div>
        </div>
      </Card>

      {/* Project Complexity Score */}
      {complexity && (
        <Card title="Project Complexity" icon={Zap}>
            <div className="complexity-container">
              <div className="complexity-score-wrapper">
                <div className="complexity-circle" style={{ borderColor: complexity.color }}>
                  <div className="complexity-level" style={{ color: complexity.color }}>
                    {complexity.level}
                  </div>
                  <div className="complexity-score">{complexity.score}/100</div>
                </div>
                <div className="time-comparison">
                  <div className="time-item traditional">
                    <span className="time-label">Without DevDock:</span>
                    <span className="time-value">{complexity.traditionalTime}</span>
                  </div>
                  <div className="time-arrow">→</div>
                  <div className="time-item devdock">
                    <span className="time-label">With DevDock:</span>
                    <span className="time-value highlight">{complexity.devDockTime}</span>
                  </div>
                </div>
                <div className="time-savings">
                  <span className="savings-icon">⚡</span>
                  <span className="savings-text">Save up to 95% onboarding time!</span>
                </div>
              </div>
              <div className="complexity-factors">
                <h3 className="factors-title">Complexity Factors:</h3>
                <ul className="factors-list">
                  {complexity.factors.map((factor, idx) => (
                    <li key={idx}>{factor}</li>
                  ))}
                </ul>
              </div>
            </div>
        </Card>
      )}

      {/* AI-Generated Summary */}
      <Card title="AI Generated Summary" icon={FileText}>
          {isSummaryLoading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Analyzing repository...</p>
            </div>
          )}
          
          {summaryError && !isSummaryLoading && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>Failed to generate AI summary: {summaryError}</span>
            </div>
          )}
          
          {aiSummary && !isSummaryLoading && (
            <div className="ai-summary-content">
              <pre
                style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}
                dangerouslySetInnerHTML={{ __html: enhanceTextFormatting(cleanMarkdown(aiSummary)) }}
              />
            </div>
          )}
          
          {!aiSummary && !isSummaryLoading && !summaryError && (
            <p className="placeholder-text">AI summary will appear here after analysis...</p>
          )}
      </Card>

      <div className="ca-summary-grid-2">
      {/* Tech Stack Detection */}
      {techStack && Object.values(techStack).some(arr => Array.isArray(arr) && arr.length > 0) && (
        <Card title="Tech Stack" icon={GitBranch}>
            <div className="tech-stack-inline">
              {techStack.frontend.length > 0 && (
                <div className="tech-category-row">
                  <span className="tech-category-label">FRONTEND:</span>
                  <div className="tech-badges-inline">
                    {techStack.frontend.map((tech, idx) => (
                      <span key={idx} className="tech-badge">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
              {techStack.backend.length > 0 && (
                <div className="tech-category-row">
                  <span className="tech-category-label">BACKEND:</span>
                  <div className="tech-badges-inline">
                    {techStack.backend.map((tech, idx) => (
                      <span key={idx} className="tech-badge">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
              {techStack.database.length > 0 && (
                <div className="tech-category-row">
                  <span className="tech-category-label">DATABASE:</span>
                  <div className="tech-badges-inline">
                    {techStack.database.map((tech, idx) => (
                      <span key={idx} className="tech-badge">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
              {techStack.testing.length > 0 && (
                <div className="tech-category-row">
                  <span className="tech-category-label">TESTING:</span>
                  <div className="tech-badges-inline">
                    {techStack.testing.map((tech, idx) => (
                      <span key={idx} className="tech-badge">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
              {techStack.devops.length > 0 && (
                <div className="tech-category-row">
                  <span className="tech-category-label">DEVOPS:</span>
                  <div className="tech-badges-inline">
                    {techStack.devops.map((tech, idx) => (
                      <span key={idx} className="tech-badge">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
        </Card>
      )}

      {/* Quick Start Guide */}
      <Card title="Quick Start Guide" icon={Zap}>
          {isQuickStartLoading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Generating quick start guide...</p>
            </div>
          )}
          
          {quickStartGuide && !isQuickStartLoading && (
            <div className="quick-start-content">
              <pre
                style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}
                dangerouslySetInnerHTML={{ __html: enhanceTextFormatting(cleanMarkdown(quickStartGuide)) }}
              />
            </div>
          )}
          
          {!quickStartGuide && !isQuickStartLoading && (
            <p className="placeholder-text">Quick start guide will appear here...</p>
          )}
      </Card>
      </div>

      {/* Contributor Insights */}
      {contributors && contributors.length > 0 && (
        <Card title="Top Contributors" icon={Users}>
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
              <div className="commit-activity">
                <h3 className="activity-title">Recent Activity</h3>
                <div className="activity-stats">
                  <div className="activity-stat">
                    <span className="stat-number">{commitActivity.totalCommits}</span>
                    <span className="stat-label">commits (last 12 weeks)</span>
                  </div>
                  <div className="activity-stat">
                    <span className="stat-number">{commitActivity.avgPerWeek}</span>
                    <span className="stat-label">avg commits/week</span>
                  </div>
                </div>
              </div>
            )}
        </Card>
      )}

      {/* Key Commands Cheatsheet */}
      {keyCommands && (
        <Card title="Key Commands Cheatsheet" icon={Keyboard}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {keyCommands.development.length > 0 && (
                <div>
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={16} />
                    Development
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {keyCommands.development.map((cmd, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px',
                        background: 'rgba(102, 126, 234, 0.08)',
                        borderRadius: '6px',
                        border: '1px solid rgba(102, 126, 234, 0.15)'
                      }}>
                        <code style={{ color: 'var(--text-primary)', fontSize: '13px' }}>npm run {cmd.name}</code>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{cmd.command}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {keyCommands.build.length > 0 && (
                <div>
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FolderTree size={16} />
                    Build
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {keyCommands.build.map((cmd, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px',
                        background: 'rgba(102, 126, 234, 0.08)',
                        borderRadius: '6px',
                        border: '1px solid rgba(102, 126, 234, 0.15)'
                      }}>
                        <code style={{ color: 'var(--text-primary)', fontSize: '13px' }}>npm run {cmd.name}</code>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{cmd.command}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {keyCommands.test.length > 0 && (
                <div>
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} />
                    Testing
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {keyCommands.test.map((cmd, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px',
                        background: 'rgba(102, 126, 234, 0.08)',
                        borderRadius: '6px',
                        border: '1px solid rgba(102, 126, 234, 0.15)'
                      }}>
                        <code style={{ color: 'var(--text-primary)', fontSize: '13px' }}>npm run {cmd.name}</code>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{cmd.command}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {keyCommands.deployment.length > 0 && (
                <div>
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <GitBranch size={16} />
                    Deployment
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {keyCommands.deployment.map((cmd, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px',
                        background: 'rgba(102, 126, 234, 0.08)',
                        borderRadius: '6px',
                        border: '1px solid rgba(102, 126, 234, 0.15)'
                      }}>
                        <code style={{ color: 'var(--text-primary)', fontSize: '13px' }}>npm run {cmd.name}</code>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{cmd.command}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
        </Card>
      )}

      {/* Common Issues & Solutions */}
      <Card title="Common Issues & Solutions" icon={AlertTriangle}>
          {isIssuesLoading && (
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
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Analyzing common issues...</p>
            </div>
          )}
          
          {commonIssues && !isIssuesLoading && (
            <div style={{
              padding: '16px',
              background: 'rgba(102, 126, 234, 0.08)',
              borderRadius: '8px',
              border: '1px solid rgba(102, 126, 234, 0.15)'
            }}>
              <pre
                style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, fontSize: '14px', lineHeight: '1.6' }}
                dangerouslySetInnerHTML={{ __html: enhanceTextFormatting(cleanMarkdown(commonIssues)) }}
              />
            </div>
          )}
          
          {!commonIssues && !isIssuesLoading && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>Common issues will appear here...</p>
          )}
      </Card>

      {/* First Contribution Suggestions */}
      <Card title="Your First Contribution" icon={Target}>
          {isContributionsLoading && (
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
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Analyzing codebase...</p>
            </div>
          )}
          
          {contributionItems.length > 0 && !isContributionsLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {contributionItems.map((contribution, idx) => (
                <div 
                  key={idx} 
                  style={{
                    padding: '16px',
                    background: 'rgba(102, 126, 234, 0.08)',
                    borderRadius: '8px',
                    border: '1px solid rgba(102, 126, 234, 0.15)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <Badge variant="info">#{idx + 1}</Badge>
                    <Badge 
                      variant={contribution.difficulty === 'Beginner' ? 'success' : contribution.difficulty === 'Intermediate' ? 'warning' : 'danger'}
                    >
                      {contribution.difficulty}
                    </Badge>
                  </div>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                    {contribution.task}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={14} style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{contribution.file}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Zap size={14} style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{contribution.impact}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {contributionItems.length === 0 && !isContributionsLoading && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>AI-powered task suggestions will appear here...</p>
          )}
          
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(102, 126, 234, 0.08)',
            borderRadius: '6px',
            border: '1px solid rgba(102, 126, 234, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Zap size={16} style={{ color: '#667eea' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              AI-powered insights help you make your first impact in minutes, not days!
            </span>
          </div>
      </Card>

      {/* Environment Variables Guide */}
      {envVariables && envVariables.length > 0 && (
        <Card title="Environment Variables" icon={Shield}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {envVariables.map((envVar, idx) => (
                <div 
                  key={idx} 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px',
                    background: 'rgba(102, 126, 234, 0.08)',
                    borderRadius: '6px',
                    border: '1px solid rgba(102, 126, 234, 0.15)'
                  }}
                >
                  <code style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{envVar.key}</code>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{envVar.example}</span>
                </div>
              ))}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '12px' }}>
              💡 Copy <code>.env.example</code> to <code>.env</code> and fill in your values
            </p>
        </Card>
      )}

      {/* README Preview */}
      <Card title="README Preview" icon={FileText}>
          <div className="readme-preview">
            {readmePreview}
          </div>
          {readme !== 'No README found' && (
            <a 
              href={`${repoInfo.url}#readme`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="view-full-link"
            >
              View Full README on GitHub →
            </a>
          )}
      </Card>

      {/* Code Analysis Summary */}
      {codeAnalysis && codeAnalysis.summary && (
        <Card title="Code Analysis Summary" icon={FileText}>
            {isCodeAnalysisLoading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Analyzing code structure...</p>
              </div>
            ) : (
              <div className="repo-stats-grid">
                <div className="stat-row">
                  <span className="stat-label">Files Analyzed:</span>
                  <span className="stat-value">{codeAnalysis.summary.analyzedFiles || 0} files</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Total Lines of Code:</span>
                  <span className="stat-value">{(codeAnalysis.summary.totalLines || 0).toLocaleString()} lines</span>
                </div>
                {codeAnalysis.definitions && codeAnalysis.definitions.functions && (
                  <div className="stat-row">
                    <span className="stat-label">Functions Detected:</span>
                    <span className="stat-value">{codeAnalysis.definitions.functions.length} functions</span>
                  </div>
                )}
                {codeAnalysis.definitions && codeAnalysis.definitions.classes && (
                  <div className="stat-row">
                    <span className="stat-label">Classes Detected:</span>
                    <span className="stat-value">{codeAnalysis.definitions.classes.length} classes</span>
                  </div>
                )}
                {codeAnalysis.security && (
                  <div className="stat-row">
                    <span className="stat-label">Security Issues:</span>
                    <span className="stat-value" style={{
                      color: (codeAnalysis.security.critical?.length || 0) > 0 ? '#dc3545' : '#28a745'
                    }}>
                      {(codeAnalysis.security.critical?.length || 0) +
                       (codeAnalysis.security.high?.length || 0) +
                       (codeAnalysis.security.medium?.length || 0) +
                       (codeAnalysis.security.low?.length || 0)} found
                    </span>
                  </div>
                )}
                {codeAnalysis.summary.frameworks && codeAnalysis.summary.frameworks.length > 0 && (
                  <div className="stat-row">
                    <span className="stat-label">Frameworks:</span>
                    <span className="stat-value">{codeAnalysis.summary.frameworks.join(', ')}</span>
                  </div>
                )}
                {codeAnalysis.summary.patterns && codeAnalysis.summary.patterns.length > 0 && (
                  <div className="stat-row">
                    <span className="stat-label">Architecture Patterns:</span>
                    <span className="stat-value">{codeAnalysis.summary.patterns.join(', ')}</span>
                  </div>
                )}
              </div>
            )}
        </Card>
      )}

      {/* Important Files Detected */}
      <Card title="Important Files" icon={FolderTree}>
          {importantFiles && importantFiles.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {importantFiles.map((file, index) => (
                <div 
                  key={index} 
                  style={{
                    padding: '12px',
                    background: 'rgba(102, 126, 234, 0.08)',
                    borderRadius: '6px',
                    border: '1px solid rgba(102, 126, 234, 0.15)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <FileText size={14} style={{ color: 'var(--text-secondary)' }} />
                    <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{file?.path || 'Unknown file'}</span>
                  </div>
                  {!file.error && file.content && (
                    <pre style={{ 
                      background: 'rgba(0,0,0,0.3)', 
                      padding: '8px', 
                      borderRadius: '4px', 
                      fontSize: '11px',
                      overflow: 'auto',
                      margin: 0
                    }}>
                      {file.content.substring(0, 200)}{file.content.length > 200 ? '...' : ''}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>No important files detected</p>
          )}
      </Card>

      {/* Repository Topics */}
      {repoInfo.topics && repoInfo.topics.length > 0 && (
        <Card title="Topics" icon={Tag}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {repoInfo.topics.map((topic, index) => (
                <Pill key={index} variant="info">{topic}</Pill>
              ))}
            </div>
        </Card>
      )}
    </div>
  );
}

export default Summary;

// Made with Bob
