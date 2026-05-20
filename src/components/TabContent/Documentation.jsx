import React from 'react';
import { Book, FileCode, Database, Zap, Shield, Info, FileText } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Pill from '../ui/Pill';
import FileListRow from '../ui/FileListRow';

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
        <Card title="Documentation" icon={Book}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Book size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Please analyze a repository first to view documentation.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="tab-content documentation-tab">
      {/* API Documentation Section */}
      {apiRoutes.length > 0 && (
        <Card 
          title="API Endpoints" 
          icon={Zap}
          headerAction={<Badge variant="info">{apiRoutes.length} Found</Badge>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {apiRoutes.map((route, index) => (
              <div 
                key={index} 
                style={{
                  padding: '12px',
                  background: 'rgba(102, 126, 234, 0.08)',
                  borderRadius: '6px',
                  border: '1px solid rgba(102, 126, 234, 0.15)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <Badge 
                    variant={
                      route.method === 'GET' ? 'success' : 
                      route.method === 'POST' ? 'info' : 
                      route.method === 'PUT' ? 'warning' : 
                      route.method === 'DELETE' ? 'danger' : 'default'
                    }
                  >
                    {route.method}
                  </Badge>
                  <code style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{route.path}</code>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={12} style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{route.file}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Code Analysis - Key Functions */}
      {codeAnalysis && keyFunctions.length > 0 && (
        <Card 
          title="Key Functions" 
          icon={FileCode}
          headerAction={<Badge variant="info">{keyFunctions.length} Functions</Badge>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {keyFunctions.map((func, index) => {
              const code = getFunctionCode(func);
              return (
                <div key={index} style={{
                  padding: '12px',
                  background: 'rgba(102, 126, 234, 0.08)',
                  borderRadius: '6px',
                  border: '1px solid rgba(102, 126, 234, 0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <code style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>{func.name}</code>
                    {func.params && func.params.length > 0 && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        ({func.params.join(', ')})
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <FileText size={12} style={{ color: 'var(--text-secondary)' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{func.file}:{func.line}</span>
                  </div>
                  {code && (
                    <pre style={{ 
                      background: 'rgba(0,0,0,0.3)', 
                      padding: '8px', 
                      borderRadius: '4px', 
                      fontSize: '11px',
                      overflow: 'auto',
                      marginTop: '8px'
                    }}>
                      <code>{code}</code>
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Environment Variables Section */}
      {envVariables.length > 0 && (
        <Card 
          title="Environment Variables" 
          icon={Database}
          headerAction={<Badge variant="warning">{envVariables.length} Variables</Badge>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {envVariables.map((varName, index) => (
              <FileListRow
                key={index}
                name={varName}
                description="Used in codebase"
                icon={<Database size={14} />}
              />
            ))}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '12px' }}>
            💡 Copy <code>.env.example</code> to <code>.env</code> and fill in your values
          </p>
        </Card>
      )}

      {/* Tech Stack & Frameworks */}
      {codeAnalysis && codeAnalysis.summary && codeAnalysis.summary.frameworks && (
        <Card 
          title="Tech Stack" 
          icon={Zap}
          headerAction={<Badge variant="success">{codeAnalysis.summary.frameworks.length} Technologies</Badge>}
        >
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>
            Technologies and frameworks identified:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {codeAnalysis.summary.frameworks.map((framework, index) => (
              <Pill key={index} variant="info">{framework}</Pill>
            ))}
          </div>
        </Card>
      )}

      {/* Best Practices from Code Analysis */}
      {codeAnalysis && codeAnalysis.summary && (
        <Card 
          title="Codebase Insights" 
          icon={Info}
        >
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px',
              background: 'rgba(102, 126, 234, 0.08)',
              borderRadius: '6px',
              marginBottom: '8px',
              border: '1px solid rgba(102, 126, 234, 0.15)'
            }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Total Files Analyzed</span>
              <Badge variant="info">{codeAnalysis.summary.totalFiles || 0}</Badge>
            </li>
            <li style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px',
              background: 'rgba(102, 126, 234, 0.08)',
              borderRadius: '6px',
              marginBottom: '8px',
              border: '1px solid rgba(102, 126, 234, 0.15)'
            }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Total Lines of Code</span>
              <Badge variant="info">{codeAnalysis.summary.totalLines || 0}</Badge>
            </li>
            {codeAnalysis.summary.patterns && codeAnalysis.summary.patterns.length > 0 && (
              <li style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px',
                background: 'rgba(102, 126, 234, 0.08)',
                borderRadius: '6px',
                marginBottom: '8px',
                border: '1px solid rgba(102, 126, 234, 0.15)'
              }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Architecture Patterns</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {codeAnalysis.summary.patterns.map((pattern, idx) => (
                    <Pill key={idx} variant="success" style={{ fontSize: '11px' }}>{pattern}</Pill>
                  ))}
                </div>
              </li>
            )}
            {codeAnalysis.definitions && codeAnalysis.definitions.functions && (
              <li style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px',
                background: 'rgba(102, 126, 234, 0.08)',
                borderRadius: '6px',
                marginBottom: '8px',
                border: '1px solid rgba(102, 126, 234, 0.15)'
              }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Functions Detected</span>
                <Badge variant="info">{codeAnalysis.definitions.functions.length}</Badge>
              </li>
            )}
            {codeAnalysis.definitions && codeAnalysis.definitions.classes && (
              <li style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px',
                background: 'rgba(102, 126, 234, 0.08)',
                borderRadius: '6px',
                marginBottom: '8px',
                border: '1px solid rgba(102, 126, 234, 0.15)'
              }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Classes Detected</span>
                <Badge variant="info">{codeAnalysis.definitions.classes.length}</Badge>
              </li>
            )}
            {codeAnalysis.security && (
              <li style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px',
                background: 'rgba(102, 126, 234, 0.08)',
                borderRadius: '6px',
                marginBottom: '8px',
                border: '1px solid rgba(102, 126, 234, 0.15)'
              }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Security Issues</span>
                <Badge 
                  variant={(codeAnalysis.security.critical?.length || 0) > 0 ? 'danger' : 'success'}
                >
                  {(codeAnalysis.security.critical?.length || 0) + 
                   (codeAnalysis.security.high?.length || 0) + 
                   (codeAnalysis.security.medium?.length || 0) + 
                   (codeAnalysis.security.low?.length || 0)} found
                </Badge>
              </li>
            )}
          </ul>
        </Card>
      )}

      {/* Fallback message if no code analysis */}
      {!codeAnalysis && (
        <Card title="Documentation" icon={Book}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Info size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Documentation will be generated using AI once code analysis is complete.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

export default Documentation;

// Made with Bob
