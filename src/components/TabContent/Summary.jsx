import React from 'react';

function Summary({ repoUrl, repoSize, repoData, aiSummary, isSummaryLoading, summaryError, quickStartGuide, isQuickStartLoading, commonIssues, isIssuesLoading, firstContributions, isContributionsLoading, codeAnalysis, isCodeAnalysisLoading }) {
  // If no repoData, show placeholder
  if (!repoData) {
    return (
      <div className="tab-content summary-tab">
        <div className="content-card">
          <h2 className="card-title">Repository Overview</h2>
          <div className="card-content">
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
              <span className="info-value status-complete">✓ Complete</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { repoInfo, importantFiles, readme, techStack, contributors, commitActivity, keyCommands, complexity, envVariables } = repoData;

  // Truncate README to first 500 characters
  const readmePreview = readme && readme !== 'No README found'
    ? readme.substring(0, 500) + (readme.length > 500 ? '...' : '')
    : 'No README found';

  return (
    <div className="tab-content summary-tab">
      {/* Repository Overview - Merged Section */}
      <div className="content-card">
        <h2 className="card-title">📦 Repository Overview</h2>
        <div className="card-content">
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
              <span className="stat-label">Primary Language:</span>
              <span className="stat-value">
                <span className="language-badge-small">{repoInfo.language}</span>
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Stars:</span>
              <span className="stat-value">⭐ {repoInfo.stars.toLocaleString()}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">License:</span>
              <span className="stat-value">{repoInfo.license}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Files Detected:</span>
              <span className="stat-value">{repoSize.toLocaleString()} files</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Last Updated:</span>
              <span className="stat-value">{new Date(repoInfo.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Project Complexity Score */}
      {complexity && (
        <div className="content-card">
          <h2 className="card-title">📈 Project Complexity</h2>
          <div className="card-content">
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
          </div>
        </div>
      )}

      {/* AI-Generated Summary */}
      <div className="content-card">
        <h2 className="card-title">🤖 AI-Generated Summary</h2>
        <div className="card-content">
          {isSummaryLoading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Generating AI summary with watsonx.ai...</p>
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
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{aiSummary}</pre>
            </div>
          )}
          
          {!aiSummary && !isSummaryLoading && !summaryError && (
            <p className="placeholder-text">AI summary will appear here after analysis...</p>
          )}
        </div>
      </div>

      {/* Tech Stack Detection */}
      {techStack && (Object.values(techStack).some(arr => arr.length > 0)) && (
        <div className="content-card">
          <h2 className="card-title">🛠️ Tech Stack Detected</h2>
          <div className="card-content">
            <div className="tech-stack-grid">
              {techStack.frontend.length > 0 && (
                <div className="tech-category">
                  <h3 className="tech-category-title">Frontend</h3>
                  <div className="tech-badges">
                    {techStack.frontend.map((tech, idx) => (
                      <span key={idx} className="tech-badge frontend">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
              {techStack.backend.length > 0 && (
                <div className="tech-category">
                  <h3 className="tech-category-title">Backend</h3>
                  <div className="tech-badges">
                    {techStack.backend.map((tech, idx) => (
                      <span key={idx} className="tech-badge backend">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
              {techStack.database.length > 0 && (
                <div className="tech-category">
                  <h3 className="tech-category-title">Database</h3>
                  <div className="tech-badges">
                    {techStack.database.map((tech, idx) => (
                      <span key={idx} className="tech-badge database">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
              {techStack.testing.length > 0 && (
                <div className="tech-category">
                  <h3 className="tech-category-title">Testing</h3>
                  <div className="tech-badges">
                    {techStack.testing.map((tech, idx) => (
                      <span key={idx} className="tech-badge testing">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
              {techStack.devops.length > 0 && (
                <div className="tech-category">
                  <h3 className="tech-category-title">DevOps</h3>
                  <div className="tech-badges">
                    {techStack.devops.map((tech, idx) => (
                      <span key={idx} className="tech-badge devops">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Start Guide */}
      <div className="content-card">
        <h2 className="card-title">🚀 Quick Start Guide</h2>
        <div className="card-content">
          {isQuickStartLoading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Generating quick start guide...</p>
            </div>
          )}
          
          {quickStartGuide && !isQuickStartLoading && (
            <div className="quick-start-content">
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{quickStartGuide}</pre>
            </div>
          )}
          
          {!quickStartGuide && !isQuickStartLoading && (
            <p className="placeholder-text">Quick start guide will appear here...</p>
          )}
        </div>
      </div>

      {/* Contributor Insights */}
      {contributors && contributors.length > 0 && (
        <div className="content-card">
          <h2 className="card-title">👥 Top Contributors</h2>
          <div className="card-content">
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
          </div>
        </div>
      )}

      {/* Key Commands Cheatsheet */}
      {keyCommands && (
        <div className="content-card">
          <h2 className="card-title">⌨️ Key Commands Cheatsheet</h2>
          <div className="card-content">
            <div className="commands-grid">
              {keyCommands.development.length > 0 && (
                <div className="command-category">
                  <h3 className="command-category-title">🚀 Development</h3>
                  {keyCommands.development.map((cmd, idx) => (
                    <div key={idx} className="command-item">
                      <code className="command-name">npm run {cmd.name}</code>
                      <span className="command-desc">{cmd.command}</span>
                    </div>
                  ))}
                </div>
              )}
              {keyCommands.build.length > 0 && (
                <div className="command-category">
                  <h3 className="command-category-title">🔨 Build</h3>
                  {keyCommands.build.map((cmd, idx) => (
                    <div key={idx} className="command-item">
                      <code className="command-name">npm run {cmd.name}</code>
                      <span className="command-desc">{cmd.command}</span>
                    </div>
                  ))}
                </div>
              )}
              {keyCommands.test.length > 0 && (
                <div className="command-category">
                  <h3 className="command-category-title">🧪 Testing</h3>
                  {keyCommands.test.map((cmd, idx) => (
                    <div key={idx} className="command-item">
                      <code className="command-name">npm run {cmd.name}</code>
                      <span className="command-desc">{cmd.command}</span>
                    </div>
                  ))}
                </div>
              )}
              {keyCommands.deployment.length > 0 && (
                <div className="command-category">
                  <h3 className="command-category-title">🚢 Deployment</h3>
                  {keyCommands.deployment.map((cmd, idx) => (
                    <div key={idx} className="command-item">
                      <code className="command-name">npm run {cmd.name}</code>
                      <span className="command-desc">{cmd.command}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Common Issues & Solutions */}
      <div className="content-card">
        <h2 className="card-title">⚠️ Common Issues & Solutions</h2>
        <div className="card-content">
          {isIssuesLoading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Analyzing common issues...</p>
            </div>
          )}
          
          {commonIssues && !isIssuesLoading && (
            <div className="issues-content">
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{commonIssues}</pre>
            </div>
          )}
          
          {!commonIssues && !isIssuesLoading && (
            <p className="placeholder-text">Common issues will appear here...</p>
          )}
        </div>
      </div>

      {/* First Contribution Suggestions */}
      <div className="content-card">
        <h2 className="card-title">🎯 Your First Contribution</h2>
        <div className="card-content">
          {isContributionsLoading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Analyzing codebase for beginner-friendly tasks...</p>
            </div>
          )}
          
          {firstContributions && firstContributions.length > 0 && !isContributionsLoading && (
            <div className="contributions-grid">
              {firstContributions.map((contribution, idx) => (
                <div key={idx} className="contribution-card">
                  <div className="contribution-header">
                    <span className="contribution-number">#{idx + 1}</span>
                    <span className={`difficulty-badge ${contribution.difficulty.toLowerCase()}`}>
                      {contribution.difficulty}
                    </span>
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
                  <button className="start-task-btn">
                    Start This Task →
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {!firstContributions.length && !isContributionsLoading && (
            <p className="placeholder-text">AI-powered task suggestions will appear here...</p>
          )}
          
          <div className="contribution-note">
            <span className="note-icon">⚡</span>
            <span className="note-text">
              These AI-generated suggestions help you make your first impact in minutes, not days!
            </span>
          </div>
        </div>
      </div>

      {/* Environment Variables Guide */}
      {envVariables && envVariables.length > 0 && (
        <div className="content-card">
          <h2 className="card-title">🔐 Environment Variables</h2>
          <div className="card-content">
            <div className="env-vars-list">
              {envVariables.map((envVar, idx) => (
                <div key={idx} className="env-var-item">
                  <code className="env-var-key">{envVar.key}</code>
                  <span className="env-var-example">{envVar.example}</span>
                </div>
              ))}
            </div>
            <p className="env-note">
              💡 Copy <code>.env.example</code> to <code>.env</code> and fill in your values
            </p>
          </div>
        </div>
      )}

      {/* README Preview */}
      <div className="content-card">
        <h2 className="card-title">📄 README Preview</h2>
        <div className="card-content">
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
        </div>
      </div>

      {/* Important Files Detected */}
      <div className="content-card">
        <h2 className="card-title">🔍 Important Files Detected</h2>
        <div className="card-content">
          {importantFiles && importantFiles.length > 0 ? (
            <div className="files-list">
              {importantFiles.map((file, index) => (
                <div key={index} className="file-item">
                  <div className="file-header">
                    <span className="file-icon">📄</span>
                    <span className="file-path">{file.path}</span>
                  </div>
                  {!file.error && file.content && (
                    <div className="file-preview">
                      <pre>{file.content.substring(0, 200)}{file.content.length > 200 ? '...' : ''}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p>No important files detected</p>
          )}
        </div>
      </div>

      {/* Repository Topics */}
      {repoInfo.topics && repoInfo.topics.length > 0 && (
        <div className="content-card">
          <h2 className="card-title">🏷️ Topics</h2>
          <div className="card-content">
            <div className="topics-container">
              {repoInfo.topics.map((topic, index) => (
                <span key={index} className="topic-badge">{topic}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Summary;

// Made with Bob
