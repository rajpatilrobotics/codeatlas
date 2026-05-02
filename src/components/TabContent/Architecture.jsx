import React, { useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Data Flow Diagram Component
function DataFlowDiagram({ techStack }) {
  const frontendTech = techStack.frontend.length > 0 ? techStack.frontend[0] : 'React';
  const backendTech = techStack.backend.length > 0 ? techStack.backend[0] : 'Node.js';
  const databaseTech = techStack.database.length > 0 ? techStack.database[0] : 'Database';

  const initialNodes = [
    // Client Layer
    { id: '1', type: 'input', data: { label: '👤 User Browser' }, position: { x: 50, y: 50 }, style: { background: '#a78bfa', color: '#fff', border: '2px solid #8b5cf6', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
    { id: '2', data: { label: '🎨 UI Components' }, position: { x: 50, y: 150 }, style: { background: '#61dafb', color: '#000', border: '2px solid #4fa8c5', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
    { id: '3', data: { label: '📦 State Manager' }, position: { x: 50, y: 250 }, style: { background: '#61dafb', color: '#000', border: '2px solid #4fa8c5', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
    
    // Frontend Layer
    { id: '4', data: { label: `⚛️ ${frontendTech}` }, position: { x: 300, y: 50 }, style: { background: '#61dafb', color: '#000', border: '2px solid #4fa8c5', borderRadius: '8px', padding: '10px', fontWeight: 'bold', minWidth: '120px' } },
    { id: '5', data: { label: '🔄 Redux/State' }, position: { x: 300, y: 150 }, style: { background: '#764ba2', color: '#fff', border: '2px solid #5a3678', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
    { id: '6', data: { label: '📡 API Client' }, position: { x: 300, y: 250 }, style: { background: '#667eea', color: '#fff', border: '2px solid #4f5bd5', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
    { id: '7', data: { label: '💾 Local Cache' }, position: { x: 300, y: 350 }, style: { background: '#f5af19', color: '#000', border: '2px solid #d69516', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
    
    // API Gateway
    { id: '8', data: { label: '🔐 Authentication' }, position: { x: 550, y: 50 }, style: { background: '#9966ff', color: '#fff', border: '2px solid #7744cc', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
    { id: '9', data: { label: '⚡ Rate Limiter' }, position: { x: 550, y: 150 }, style: { background: '#9966ff', color: '#fff', border: '2px solid #7744cc', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
    { id: '10', data: { label: '⚖️ Load Balancer' }, position: { x: 550, y: 250 }, style: { background: '#9966ff', color: '#fff', border: '2px solid #7744cc', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
    
    // Backend Layer
    { id: '11', data: { label: `⚙️ ${backendTech}` }, position: { x: 800, y: 50 }, style: { background: '#68a063', color: '#fff', border: '2px solid #4d7c48', borderRadius: '8px', padding: '10px', fontWeight: 'bold', minWidth: '120px' } },
    { id: '12', data: { label: '🎯 Controllers' }, position: { x: 800, y: 150 }, style: { background: '#68a063', color: '#fff', border: '2px solid #4d7c48', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
    { id: '13', data: { label: '🔧 Services' }, position: { x: 800, y: 250 }, style: { background: '#68a063', color: '#fff', border: '2px solid #4d7c48', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
    { id: '14', data: { label: '✅ Validation' }, position: { x: 800, y: 350 }, style: { background: '#68a063', color: '#fff', border: '2px solid #4d7c48', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
    
    // Data Layer
    { id: '15', data: { label: '🔴 Redis Cache' }, position: { x: 1050, y: 50 }, style: { background: '#f29111', color: '#fff', border: '2px solid #d67d0a', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
    { id: '16', data: { label: `💾 ${databaseTech}` }, position: { x: 1050, y: 150 }, style: { background: '#f29111', color: '#fff', border: '2px solid #d67d0a', borderRadius: '8px', padding: '10px', fontWeight: 'bold', minWidth: '120px' } },
    { id: '17', data: { label: '📊 Analytics DB' }, position: { x: 1050, y: 250 }, style: { background: '#f29111', color: '#fff', border: '2px solid #d67d0a', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
    
    // External Services
    { id: '18', data: { label: '🤖 Watsonx.ai' }, position: { x: 1050, y: 400 }, style: { background: '#ff6b6b', color: '#fff', border: '2px solid #ee5a52', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
    { id: '19', data: { label: '🐙 GitHub API' }, position: { x: 1050, y: 500 }, style: { background: '#ff6b6b', color: '#fff', border: '2px solid #ee5a52', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
  ];

  const initialEdges = [
    // Client to Frontend
    { id: 'e1-2', source: '1', target: '2', label: 'User Action', animated: true, style: { stroke: '#2f81f7' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e2-3', source: '2', target: '3', label: 'Dispatch', animated: true, style: { stroke: '#2f81f7' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e3-4', source: '3', target: '4', label: 'Render', animated: true, style: { stroke: '#2f81f7' }, markerEnd: { type: MarkerType.ArrowClosed } },
    
    // Frontend Flow
    { id: 'e4-5', source: '4', target: '5', label: 'State Update', animated: true, style: { stroke: '#764ba2' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e5-6', source: '5', target: '6', label: 'API Request', animated: true, style: { stroke: '#667eea' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e6-7', source: '6', target: '7', label: 'Check Cache', style: { stroke: '#f5af19', strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed } },
    
    // API Gateway
    { id: 'e6-8', source: '6', target: '8', label: 'HTTP Request', animated: true, style: { stroke: '#9966ff' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e8-9', source: '8', target: '9', label: 'Validate', animated: true, style: { stroke: '#9966ff' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e9-10', source: '9', target: '10', label: 'Forward', animated: true, style: { stroke: '#9966ff' }, markerEnd: { type: MarkerType.ArrowClosed } },
    
    // Backend Flow
    { id: 'e10-11', source: '10', target: '11', label: 'Route', animated: true, style: { stroke: '#68a063' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e11-12', source: '11', target: '12', label: 'Handle', animated: true, style: { stroke: '#68a063' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e12-13', source: '12', target: '13', label: 'Process', animated: true, style: { stroke: '#68a063' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e13-14', source: '13', target: '14', label: 'Validate', animated: true, style: { stroke: '#68a063' }, markerEnd: { type: MarkerType.ArrowClosed } },
    
    // Data Layer
    { id: 'e14-15', source: '14', target: '15', label: 'Query Cache', style: { stroke: '#f29111', strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e14-16', source: '14', target: '16', label: 'DB Query', animated: true, style: { stroke: '#f29111' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e13-17', source: '13', target: '17', label: 'Log Analytics', style: { stroke: '#f29111', strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed } },
    
    // External Services
    { id: 'e13-18', source: '13', target: '18', label: 'AI Request', animated: true, style: { stroke: '#ff6b6b' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e13-19', source: '13', target: '19', label: 'Fetch Repo', animated: true, style: { stroke: '#ff6b6b' }, markerEnd: { type: MarkerType.ArrowClosed } },
    
    // Response Flow (back)
    { id: 'e16-14', source: '16', target: '14', label: 'Data', animated: true, style: { stroke: '#3fb950' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e14-6', source: '14', target: '6', label: 'Response', animated: true, style: { stroke: '#3fb950' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e6-5', source: '6', target: '5', label: 'Update State', animated: true, style: { stroke: '#3fb950' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e5-2', source: '5', target: '2', label: 'Re-render', animated: true, style: { stroke: '#3fb950' }, markerEnd: { type: MarkerType.ArrowClosed } },
  ];

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="content-card">
      <h2 className="card-title">🔄 Interactive Data Flow Diagram</h2>
      <div className="card-content">
        <div className="reactflow-wrapper" style={{ height: '700px', background: '#0f1419', borderRadius: '12px', border: '1px solid #373e47' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            attributionPosition="bottom-left"
          >
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                if (node.style?.background) return node.style.background;
                return '#667eea';
              }}
              maskColor="rgba(0, 0, 0, 0.6)"
            />
            <Background variant="dots" gap={12} size={1} color="#373e47" />
          </ReactFlow>
        </div>
        <div className="flow-description-box" style={{ marginTop: '1rem' }}>
          <p className="flow-description">
            <strong>💡 Interactive Features:</strong><br/>
            • <strong>Drag</strong> nodes to rearrange<br/>
            • <strong>Zoom</strong> with mouse wheel or controls<br/>
            • <strong>Pan</strong> by dragging the background<br/>
            • <strong>Mini-map</strong> in bottom-right for navigation<br/>
            <br/>
            <strong>🔵 Blue arrows:</strong> Request flow<br/>
            <strong>🟢 Green arrows:</strong> Response flow<br/>
            <strong>⚪ Dashed lines:</strong> Cache/conditional paths
          </p>
        </div>
      </div>
    </div>
  );
}

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

      {/* Interactive Data Flow Diagram with React Flow */}
      <DataFlowDiagram techStack={techStack} />

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
