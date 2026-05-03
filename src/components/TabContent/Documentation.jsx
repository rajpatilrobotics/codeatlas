import React from 'react';

function Documentation({ repoData, codeAnalysis }) {
  // Helper function to extract API routes from code analysis
  const extractAPIRoutes = () => {
    if (!codeAnalysis || !codeAnalysis.files) return [];
    
    const routes = [];
    const routePatterns = [
      /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    ];
    
    codeAnalysis.files.forEach(file => {
      if (file.content && (file.path.includes('route') || file.path.includes('api') || file.path.includes('controller'))) {
        routePatterns.forEach(pattern => {
          const matches = [...file.content.matchAll(pattern)];
          matches.forEach(match => {
            routes.push({
              method: match[1].toUpperCase(),
              path: match[2],
              file: file.path
            });
          });
        });
      }
    });
    
    return routes.slice(0, 10); // Limit to 10 routes
  };

  // Helper function to extract environment variables
  const extractEnvVariables = () => {
    if (!codeAnalysis || !codeAnalysis.files) return [];
    
    const envVars = new Set();
    const envPattern = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
    
    codeAnalysis.files.forEach(file => {
      if (file.content) {
        const matches = [...file.content.matchAll(envPattern)];
        matches.forEach(match => {
          envVars.add(match[1]);
        });
      }
    });
    
    return Array.from(envVars).slice(0, 10);
  };

  // Helper function to get key functions for code examples
  const getKeyFunctions = () => {
    if (!codeAnalysis || !codeAnalysis.definitions || !codeAnalysis.definitions.functions) {
      return [];
    }
    
    return codeAnalysis.definitions.functions.slice(0, 5);
  };

  // Helper function to get code snippet for a function
  const getFunctionCode = (functionDef) => {
    if (!codeAnalysis || !codeAnalysis.files) return null;
    
    const file = codeAnalysis.files.find(f => f.path === functionDef.file);
    if (!file || !file.content) return null;
    
    const lines = file.content.split('\n');
    const startLine = Math.max(0, functionDef.line - 1);
    const endLine = Math.min(lines.length, startLine + 10); // Show 10 lines
    
    return lines.slice(startLine, endLine).join('\n');
  };

  const apiRoutes = extractAPIRoutes();
  const envVariables = extractEnvVariables();
  const keyFunctions = getKeyFunctions();

  if (!repoData) {
    return (
      <div className="tab-content documentation-tab">
        <div className="content-card">
          <h2 className="card-title">📚 Documentation</h2>
          <div className="card-content">
            <p className="text-secondary">Please analyze a repository first to view documentation.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content documentation-tab">
      {/* API Documentation Section */}
      {apiRoutes.length > 0 && (
        <div className="content-card">
          <h2 className="card-title">📚 API Endpoints</h2>
          <div className="card-content">
            <p className="text-secondary" style={{ marginBottom: '15px' }}>
              Detected API endpoints from code analysis:
            </p>
            {apiRoutes.map((route, index) => (
              <div key={index} className="api-section" style={{ marginBottom: '20px' }}>
                <h4 className="api-endpoint">
                  <span style={{ 
                    backgroundColor: route.method === 'GET' ? '#28a745' : 
                                   route.method === 'POST' ? '#007bff' : 
                                   route.method === 'PUT' ? '#ffc107' : 
                                   route.method === 'DELETE' ? '#dc3545' : '#6c757d',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    marginRight: '10px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {route.method}
                  </span>
                  {route.path}
                </h4>
                <p className="api-description" style={{ fontSize: '13px', color: '#6c757d' }}>
                  📄 Found in: <code>{route.file}</code>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code Analysis - Key Functions */}
      {codeAnalysis && keyFunctions.length > 0 && (
        <div className="content-card">
          <h2 className="card-title">💡 Key Functions</h2>
          <div className="card-content">
            <p className="text-secondary" style={{ marginBottom: '15px' }}>
              Important functions detected in the codebase:
            </p>
            {keyFunctions.map((func, index) => {
              const code = getFunctionCode(func);
              return (
                <div key={index} style={{ marginBottom: '25px' }}>
                  <h4 className="example-title">
                    {func.name}
                    {func.params && func.params.length > 0 && (
                      <span style={{ color: '#6c757d', fontWeight: 'normal', fontSize: '14px' }}>
                        ({func.params.join(', ')})
                      </span>
                    )}
                  </h4>
                  <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '8px' }}>
                    📄 {func.file}:{func.line}
                  </p>
                  {code && (
                    <div className="code-block">
                      <code>{code}</code>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Environment Variables Section */}
      {envVariables.length > 0 && (
        <div className="content-card">
          <h2 className="card-title">🔧 Environment Variables</h2>
          <div className="card-content">
            <p className="text-secondary" style={{ marginBottom: '15px' }}>
              Environment variables detected in the code:
            </p>
            <table className="config-table">
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Usage</th>
                </tr>
              </thead>
              <tbody>
                {envVariables.map((varName, index) => (
                  <tr key={index}>
                    <td><code>{varName}</code></td>
                    <td>Used in codebase</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tech Stack & Frameworks */}
      {codeAnalysis && codeAnalysis.summary && codeAnalysis.summary.frameworks && (
        <div className="content-card">
          <h2 className="card-title">🛠️ Tech Stack</h2>
          <div className="card-content">
            <p className="text-secondary" style={{ marginBottom: '15px' }}>
              Technologies and frameworks detected:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {codeAnalysis.summary.frameworks.map((framework, index) => (
                <span
                  key={index}
                  style={{
                    backgroundColor: '#e3f2fd',
                    color: '#1976d2',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {framework}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Best Practices from Code Analysis */}
      {codeAnalysis && codeAnalysis.summary && (
        <div className="content-card">
          <h2 className="card-title">📖 Codebase Insights</h2>
          <div className="card-content">
            <ul className="best-practices-list">
              <li>✓ Total Files Analyzed: <strong>{codeAnalysis.summary.totalFiles || 0}</strong></li>
              <li>✓ Total Lines of Code: <strong>{codeAnalysis.summary.totalLines || 0}</strong></li>
              {codeAnalysis.summary.patterns && codeAnalysis.summary.patterns.length > 0 && (
                <li>✓ Architecture Patterns: <strong>{codeAnalysis.summary.patterns.join(', ')}</strong></li>
              )}
              {codeAnalysis.definitions && codeAnalysis.definitions.functions && (
                <li>✓ Functions Detected: <strong>{codeAnalysis.definitions.functions.length}</strong></li>
              )}
              {codeAnalysis.definitions && codeAnalysis.definitions.classes && (
                <li>✓ Classes Detected: <strong>{codeAnalysis.definitions.classes.length}</strong></li>
              )}
              {codeAnalysis.security && (
                <li>
                  ✓ Security Issues: 
                  <strong style={{ color: codeAnalysis.security.critical?.length > 0 ? '#dc3545' : '#28a745', marginLeft: '5px' }}>
                    {(codeAnalysis.security.critical?.length || 0) + 
                     (codeAnalysis.security.high?.length || 0) + 
                     (codeAnalysis.security.medium?.length || 0) + 
                     (codeAnalysis.security.low?.length || 0)} found
                  </strong>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Fallback message if no code analysis */}
      {!codeAnalysis && (
        <div className="content-card">
          <h2 className="card-title">📚 Documentation</h2>
          <div className="card-content">
            <p className="text-secondary">
              Code analysis is in progress. Documentation will be generated from actual code analysis once complete.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Documentation;

// Made with Bob
