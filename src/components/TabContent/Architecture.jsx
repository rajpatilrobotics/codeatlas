import React from 'react';

function Architecture({ repoData, architectureAnalysis, isArchitectureLoading, architectureError }) {
  // If no repoData, show placeholder
  if (!repoData) {
    return (
      <div className="tab-content architecture-tab">
        <div className="content-card">
          <h2 className="card-title">System Architecture</h2>
          <div className="card-content">
            <p className="placeholder-text">Architecture analysis will appear here after repository analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  const { techStack, importantFiles, fileTree } = repoData;

  // Extract main technologies for dependency graph
  const getMainTechnologies = () => {
    const technologies = [];
    
    // Frontend
    if (techStack.frontend.length > 0) {
      technologies.push({ name: techStack.frontend[0], category: 'frontend' });
    }
    
    // Backend
    if (techStack.backend.length > 0) {
      technologies.push({ name: techStack.backend[0], category: 'backend' });
    }
    
    // Database
    if (techStack.database.length > 0) {
      technologies.push({ name: techStack.database[0], category: 'database' });
    }
    
    return technologies;
  };

  const mainTechnologies = getMainTechnologies();

  // Get folder structure (top-level folders only)
  const getTopLevelFolders = () => {
    const folders = new Set();
    fileTree.forEach(path => {
      const parts = path.split('/');
      if (parts.length > 1) {
        folders.add(parts[0]);
      }
    });
    return Array.from(folders).slice(0, 10); // Limit to 10 folders
  };

  const topLevelFolders = getTopLevelFolders();

  return (
    <div className="tab-content architecture-tab">
      {/* System Architecture Diagram */}
      <div className="content-card">
        <h2 className="card-title">🏗️ System Architecture Diagram</h2>
        <div className="card-content">
          <div className="architecture-diagram">
            <div className="arch-layer">
              <div className="arch-box frontend-layer">
                <div className="layer-icon">🎨</div>
                <div className="layer-title">Frontend Layer</div>
                <div className="layer-tech">
                  {techStack.frontend.length > 0
                    ? techStack.frontend.join(', ')
                    : 'User Interface'}
                </div>
              </div>
            </div>
            <div className="arch-arrow">↓</div>
            <div className="arch-layer">
              <div className="arch-box api-layer">
                <div className="layer-icon">🔌</div>
                <div className="layer-title">API Layer</div>
                <div className="layer-tech">REST API / GraphQL</div>
              </div>
            </div>
            <div className="arch-arrow">↓</div>
            <div className="arch-layer">
              <div className="arch-box backend-layer">
                <div className="layer-icon">⚙️</div>
                <div className="layer-title">Business Logic</div>
                <div className="layer-tech">
                  {techStack.backend.length > 0
                    ? techStack.backend.join(', ')
                    : 'Application Server'}
                </div>
              </div>
            </div>
            <div className="arch-arrow">↓</div>
            <div className="arch-layer">
              <div className="arch-box data-layer">
                <div className="layer-icon">💾</div>
                <div className="layer-title">Data Layer</div>
                <div className="layer-tech">
                  {techStack.database.length > 0
                    ? techStack.database.join(', ')
                    : 'Database / Storage'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI-Generated Architecture Analysis */}
      <div className="content-card">
        <h2 className="card-title">📋 Architecture Analysis</h2>
        <div className="card-content">
          {isArchitectureLoading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Generating architecture analysis...</p>
            </div>
          )}
          
          {architectureError && !isArchitectureLoading && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>Failed to generate architecture analysis: {architectureError}</span>
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                Showing basic structure below based on detected files.
              </p>
            </div>
          )}
          
          {architectureAnalysis && !isArchitectureLoading && (
            <div className="architecture-analysis-content">
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: '1.8' }}>
                {architectureAnalysis}
              </pre>
            </div>
          )}
          
          {!architectureAnalysis && !isArchitectureLoading && !architectureError && (
            <p className="placeholder-text">Architecture analysis will appear here...</p>
          )}
        </div>
      </div>

      {/* Visual Dependency Graph */}
      {mainTechnologies.length > 0 && (
        <div className="content-card">
          <h2 className="card-title">📊 Technology Flow</h2>
          <div className="card-content">
            <div className="dependency-graph">
              {mainTechnologies.map((tech, index) => (
                <React.Fragment key={index}>
                  <div className={`tech-node ${tech.category}`}>
                    <div className="tech-node-icon">
                      {tech.category === 'frontend' && '🎨'}
                      {tech.category === 'backend' && '⚙️'}
                      {tech.category === 'database' && '💾'}
                    </div>
                    <div className="tech-node-name">{tech.name}</div>
                    <div className="tech-node-label">{tech.category}</div>
                  </div>
                  {index < mainTechnologies.length - 1 && (
                    <div className="tech-arrow">→</div>
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className="graph-description">
              Data flows from {mainTechnologies[0]?.name} through the system to {mainTechnologies[mainTechnologies.length - 1]?.name}
            </p>
          </div>
        </div>
      )}

      {/* Technology Stack Breakdown */}
      {techStack && (Object.values(techStack).some(arr => arr.length > 0)) && (
        <div className="content-card">
          <h2 className="card-title">🛠️ Technology Stack</h2>
          <div className="card-content">
            <div className="tech-stack-grid">
              {techStack.frontend.length > 0 && (
                <div className="tech-category-section">
                  <h3 className="tech-category-title">Frontend</h3>
                  <div className="tech-badges">
                    {techStack.frontend.map((tech, idx) => (
                      <span key={idx} className="tech-badge frontend">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
              {techStack.backend.length > 0 && (
                <div className="tech-category-section">
                  <h3 className="tech-category-title">Backend</h3>
                  <div className="tech-badges">
                    {techStack.backend.map((tech, idx) => (
                      <span key={idx} className="tech-badge backend">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
              {techStack.database.length > 0 && (
                <div className="tech-category-section">
                  <h3 className="tech-category-title">Database</h3>
                  <div className="tech-badges">
                    {techStack.database.map((tech, idx) => (
                      <span key={idx} className="tech-badge database">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
              {techStack.testing.length > 0 && (
                <div className="tech-category-section">
                  <h3 className="tech-category-title">Testing</h3>
                  <div className="tech-badges">
                    {techStack.testing.map((tech, idx) => (
                      <span key={idx} className="tech-badge testing">{tech}</span>
                    ))}
                  </div>
                </div>
              )}
              {techStack.devops.length > 0 && (
                <div className="tech-category-section">
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

      {/* Key Files & Components */}
      {importantFiles && importantFiles.length > 0 && (
        <div className="content-card">
          <h2 className="card-title">📦 Key Components</h2>
          <div className="card-content">
            <div className="key-files-list">
              {importantFiles.map((file, index) => (
                <div key={index} className="key-file-item">
                  <span className="file-icon">📄</span>
                  <span className="file-name">{file.path}</span>
                  <span className="file-badge">
                    {file.path.includes('package.json') && 'Dependencies'}
                    {file.path.includes('README') && 'Documentation'}
                    {file.path.includes('index') && 'Entry Point'}
                    {file.path.includes('App') && 'Main Component'}
                    {file.path.includes('.env') && 'Configuration'}
                    {!file.path.includes('package.json') && 
                     !file.path.includes('README') && 
                     !file.path.includes('index') && 
                     !file.path.includes('App') && 
                     !file.path.includes('.env') && 'Core File'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Folder Structure */}
      {topLevelFolders.length > 0 && (
        <div className="content-card">
          <h2 className="card-title">📁 Folder Structure</h2>
          <div className="card-content">
            <div className="folder-structure">
              {topLevelFolders.map((folder, index) => (
                <div key={index} className="folder-item">
                  <span className="folder-icon">📂</span>
                  <span className="folder-name">{folder}/</span>
                  <span className="folder-description">
                    {folder === 'src' && 'Source code'}
                    {folder === 'public' && 'Static assets'}
                    {folder === 'components' && 'React components'}
                    {folder === 'pages' && 'Page components'}
                    {folder === 'styles' && 'CSS/styling files'}
                    {folder === 'utils' && 'Utility functions'}
                    {folder === 'services' && 'API services'}
                    {folder === 'tests' && 'Test files'}
                    {folder === 'docs' && 'Documentation'}
                    {folder === 'config' && 'Configuration files'}
                    {folder === 'build' && 'Build output'}
                    {folder === 'dist' && 'Distribution files'}
                    {folder === 'node_modules' && 'Dependencies'}
                    {!['src', 'public', 'components', 'pages', 'styles', 'utils', 'services', 'tests', 'docs', 'config', 'build', 'dist', 'node_modules'].includes(folder) && 'Project folder'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Architecture;

// Made with Bob
