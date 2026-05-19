import React from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';

// Clean, Beautiful Data Flow Diagram with Comprehensive GitHub Repo Data
function DataFlowDiagram({ techStack, detailedArchitecture }) {
  
  // Clean Node Component - Shows all data directly, no expandable sections
  const CleanLayerNode = ({ title, icon, color, data }) => {
    return (
      <div style={{
        background: `linear-gradient(135deg, ${color}20 0%, ${color}08 100%)`,
        border: `2px solid ${color}`,
        borderRadius: '12px',
        padding: '16px',
        minWidth: '280px',
        maxWidth: '320px',
        boxShadow: `0 4px 20px ${color}40`,
        textAlign: 'left'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '14px',
          paddingBottom: '10px',
          borderBottom: `2px solid ${color}50`
        }}>
          <span style={{ fontSize: '24px' }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff' }}>{title}</div>
            {data.subtitle && (
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{data.subtitle}</div>
            )}
          </div>
        </div>

        {/* Technologies */}
        {data.technologies && data.technologies.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#fbbf24', marginBottom: '6px' }}>
              🔧 Technologies
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {data.technologies.slice(0, 5).map((tech, i) => (
                <span key={i} style={{
                  background: 'rgba(255,255,255,0.1)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '600',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#e5e7eb'
                }}>
                  {tech}
                </span>
              ))}
              {data.technologies.length > 5 && (
                <span style={{ padding: '3px 8px', fontSize: '10px', color: '#9ca3af' }}>
                  +{data.technologies.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        {data.metrics && Object.keys(data.metrics).length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            {Object.entries(data.metrics).map(([key, value]) => (
              <div key={key} style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '8px',
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: color }}>{value}</div>
                <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px', textTransform: 'uppercase' }}>
                  {key}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top Items List */}
        {data.topItems && data.topItems.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#60a5fa', marginBottom: '6px' }}>
              {data.topItemsLabel || '📋 Key Items'}
            </div>
            <div style={{ fontSize: '10px', lineHeight: '1.6', color: '#d1d5db' }}>
              {data.topItems.slice(0, 4).map((item, i) => (
                <div key={i} style={{ marginBottom: '3px', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  • {item}
                </div>
              ))}
              {data.topItems.length > 4 && (
                <div style={{ color: '#9ca3af', fontSize: '9px', marginTop: '4px' }}>
                  ... and {data.topItems.length - 4} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Info */}
        {data.additionalInfo && (
          <div style={{
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            fontSize: '10px',
            color: '#9ca3af',
            lineHeight: '1.5'
          }}>
            {data.additionalInfo}
          </div>
        )}
      </div>
    );
  };

  // Create nodes with comprehensive data
  const createNodes = () => {
    const nodes = [];
    const nodeWidth = 320;
    
    // Get all data
    const components = detailedArchitecture?.components || [];
    const apiEndpoints = detailedArchitecture?.apiEndpoints || [];
    const databaseModels = detailedArchitecture?.databaseModels || [];
    const allFunctions = detailedArchitecture?.allFunctions || [];
    const allClasses = detailedArchitecture?.allClasses || [];
    const detailedFiles = detailedArchitecture?.detailedFiles || [];
    const configuration = detailedArchitecture?.configuration || {};
    const metrics = detailedArchitecture?.metrics || {};

    // Detect what layers exist
    const hasFrontend = techStack.frontend && techStack.frontend.length > 0;
    const hasBackend = techStack.backend && techStack.backend.length > 0;
    const hasDatabase = techStack.database && techStack.database.length > 0;
    const hasCache = techStack.cache && techStack.cache.length > 0;
    const hasAuth = techStack.authentication && techStack.authentication.length > 0;

    let yPos = 50;
    const xCenter = 400;
    const yGap = 200;

    // CLIENT LAYER (always show)
    const frontendFiles = detailedFiles.filter(f => 
      f.path.includes('component') || f.path.includes('src/') || f.path.includes('pages/')
    );
    const frontendFunctions = allFunctions.filter(f => 
      f.file.includes('component') || f.file.includes('src/')
    );

    nodes.push({
      id: 'client',
      type: 'input',
      data: {
        label: (
          <CleanLayerNode
            title="CLIENT LAYER"
            icon="🌐"
            color="#3b82f6"
            data={{
              subtitle: "User Interface & Interaction",
              technologies: techStack.frontend || ['Browser', 'Web App'],
              metrics: {
                'Components': components.length || frontendFiles.length,
                'Functions': frontendFunctions.length,
                'Files': frontendFiles.length,
                'LOC': frontendFiles.reduce((sum, f) => sum + (f.loc || 0), 0)
              },
              topItems: components.slice(0, 5).map(c => c.name) || frontendFiles.slice(0, 5).map(f => f.path.split('/').pop()),
              topItemsLabel: '🧩 Top Components',
              additionalInfo: `Pattern: ${detailedArchitecture?.patterns?.architecture || 'Component-Based'}`
            }}
          />
        )
      },
      position: { x: xCenter, y: yPos },
      style: { background: 'transparent', border: 'none', width: nodeWidth }
    });

    yPos += yGap;

    // FRONTEND LAYER
    if (hasFrontend) {
      nodes.push({
        id: 'frontend',
        type: 'default',
        data: {
          label: (
            <CleanLayerNode
              title="FRONTEND LAYER"
              icon="🎨"
              color="#a78bfa"
              data={{
                subtitle: "UI Framework & State Management",
                technologies: techStack.frontend,
                metrics: {
                  'Components': components.length,
                  'Functions': frontendFunctions.length,
                  'Classes': allClasses.filter(c => c.file.includes('component')).length,
                  'Total LOC': metrics.totalLOC || 0
                },
                topItems: [
                  ...components.slice(0, 3).map(c => `${c.name} (${c.folder})`),
                  ...frontendFunctions.slice(0, 2).map(f => `${f.name}()`)
                ],
                topItemsLabel: '📦 Key Components & Functions'
              }}
            />
          )
        },
        position: { x: xCenter, y: yPos },
        style: { background: 'transparent', border: 'none', width: nodeWidth }
      });

      yPos += yGap;
    }

    // AUTHENTICATION LAYER (if exists)
    if (hasAuth) {
      nodes.push({
        id: 'auth',
        type: 'default',
        data: {
          label: (
            <CleanLayerNode
              title="AUTH LAYER"
              icon="🔐"
              color="#10b981"
              data={{
                subtitle: "Security & Access Control",
                technologies: techStack.authentication,
                metrics: {
                  'Middleware': detailedArchitecture?.middleware?.length || 0,
                  'Guards': allFunctions.filter(f => f.name.includes('auth') || f.name.includes('guard')).length
                },
                topItems: techStack.authentication.slice(0, 4),
                topItemsLabel: '🛡️ Auth Technologies',
                additionalInfo: 'Handles authentication, authorization, and session management'
              }}
            />
          )
        },
        position: { x: xCenter - 350, y: yPos },
        style: { background: 'transparent', border: 'none', width: nodeWidth }
      });
    }

    // BACKEND / API LAYER
    if (hasBackend) {
      const backendFiles = detailedFiles.filter(f =>
        f.path.includes('controller') || f.path.includes('route') || f.path.includes('api') || f.path.includes('service')
      );
      const backendFunctions = allFunctions.filter(f =>
        f.file.includes('controller') || f.file.includes('route') || f.file.includes('api') || f.file.includes('service')
      );

      nodes.push({
        id: 'backend',
        type: 'default',
        data: {
          label: (
            <CleanLayerNode
              title="BACKEND / API"
              icon="⚙️"
              color="#888888"
              data={{
                subtitle: "Business Logic & API Endpoints",
                technologies: techStack.backend,
                metrics: {
                  'Endpoints': apiEndpoints.length,
                  'Functions': backendFunctions.length,
                  'Files': backendFiles.length,
                  'LOC': backendFiles.reduce((sum, f) => sum + (f.loc || 0), 0)
                },
                topItems: [
                  ...apiEndpoints.slice(0, 4).map(ep => `${ep.method} ${ep.path}`)
                ],
                topItemsLabel: '🛣️ API Endpoints',
                additionalInfo: `Ports: ${configuration.ports?.map(p => p.port).join(', ') || 'N/A'}`
              }}
            />
          )
        },
        position: { x: hasAuth ? xCenter + 350 : xCenter, y: yPos },
        style: { background: 'transparent', border: 'none', width: nodeWidth }
      });

      yPos += yGap;
    }

    // CACHE LAYER (if exists)
    if (hasCache) {
      nodes.push({
        id: 'cache',
        type: 'default',
        data: {
          label: (
            <CleanLayerNode
              title="CACHE LAYER"
              icon="⚡"
              color="#f59e0b"
              data={{
                subtitle: "Performance & Speed Optimization",
                technologies: techStack.cache,
                metrics: {
                  'Systems': techStack.cache.length
                },
                topItems: techStack.cache,
                topItemsLabel: '💨 Cache Systems',
                additionalInfo: 'Reduces database load and improves response times'
              }}
            />
          )
        },
        position: { x: xCenter + 350, y: yPos - 100 },
        style: { background: 'transparent', border: 'none', width: nodeWidth }
      });
    }

    // DATABASE LAYER
    if (hasDatabase) {
      const dbFiles = detailedFiles.filter(f =>
        f.path.includes('model') || f.path.includes('schema') || f.path.includes('entity')
      );

      nodes.push({
        id: 'database',
        type: 'output',
        data: {
          label: (
            <CleanLayerNode
              title="DATABASE LAYER"
              icon="💾"
              color="#ec4899"
              data={{
                subtitle: "Data Persistence & Storage",
                technologies: [...(techStack.database || []), ...(techStack.orm || [])],
                metrics: {
                  'Models': databaseModels.length,
                  'Fields': databaseModels.reduce((sum, m) => sum + (m.fields?.length || 0), 0),
                  'Files': dbFiles.length
                },
                topItems: databaseModels.slice(0, 4).map(m => `${m.name} (${m.type})`),
                topItemsLabel: '🗄️ Database Models',
                additionalInfo: `Total Models: ${databaseModels.length} | ORM: ${techStack.orm?.join(', ') || 'None'}`
              }}
            />
          )
        },
        position: { x: xCenter, y: yPos },
        style: { background: 'transparent', border: 'none', width: nodeWidth }
      });
    }

    return nodes;
  };

  // Create edges (connections between nodes)
  const createEdges = () => {
    const edges = [];
    const hasFrontend = techStack.frontend && techStack.frontend.length > 0;
    const hasBackend = techStack.backend && techStack.backend.length > 0;
    const hasDatabase = techStack.database && techStack.database.length > 0;
    const hasCache = techStack.cache && techStack.cache.length > 0;
    const hasAuth = techStack.authentication && techStack.authentication.length > 0;

    // Client -> Frontend
    if (hasFrontend) {
      edges.push({
        id: 'e-client-frontend',
        source: 'client',
        target: 'frontend',
        label: 'HTTP/HTTPS',
        animated: true,
        style: { stroke: '#a78bfa', strokeWidth: 2 },
        labelStyle: { fill: '#a78bfa', fontWeight: 600, fontSize: 11 }
      });
    }

    // Frontend -> Auth
    if (hasFrontend && hasAuth) {
      edges.push({
        id: 'e-frontend-auth',
        source: 'frontend',
        target: 'auth',
        label: 'Auth Request',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 2 },
        labelStyle: { fill: '#10b981', fontWeight: 600, fontSize: 11 }
      });
    }

    // Frontend -> Backend (or Auth -> Backend)
    if (hasFrontend && hasBackend) {
      edges.push({
        id: hasAuth ? 'e-auth-backend' : 'e-frontend-backend',
        source: hasAuth ? 'auth' : 'frontend',
        target: 'backend',
        label: 'API Calls',
        animated: true,
        style: { stroke: '#888888', strokeWidth: 2 },
        labelStyle: { fill: '#888888', fontWeight: 600, fontSize: 11 }
      });
    }

    // Backend -> Cache
    if (hasBackend && hasCache) {
      edges.push({
        id: 'e-backend-cache',
        source: 'backend',
        target: 'cache',
        label: 'Cache Query',
        animated: true,
        style: { stroke: '#f59e0b', strokeWidth: 2 },
        labelStyle: { fill: '#f59e0b', fontWeight: 600, fontSize: 11 }
      });
    }

    // Backend -> Database (or Cache -> Database)
    if (hasBackend && hasDatabase) {
      edges.push({
        id: hasCache ? 'e-cache-database' : 'e-backend-database',
        source: hasCache ? 'cache' : 'backend',
        target: 'database',
        label: 'DB Query',
        animated: true,
        style: { stroke: '#ec4899', strokeWidth: 2 },
        labelStyle: { fill: '#ec4899', fontWeight: 600, fontSize: 11 }
      });
    }

    // If no backend but has database (direct connection)
    if (!hasBackend && hasDatabase && hasFrontend) {
      edges.push({
        id: 'e-frontend-database',
        source: 'frontend',
        target: 'database',
        label: 'Direct DB',
        animated: true,
        style: { stroke: '#ec4899', strokeWidth: 2 },
        labelStyle: { fill: '#ec4899', fontWeight: 600, fontSize: 11 }
      });
    }

    return edges;
  };

  const nodes = createNodes();
  const edges = createEdges();

  return (
    <div style={{ marginTop: '30px' }}>
      <h3 style={{
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '20px',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span style={{ fontSize: '24px' }}>🔄</span>
        Data Flow Architecture
        <span style={{
          fontSize: '12px',
          background: 'rgba(59, 130, 246, 0.2)',
          padding: '4px 12px',
          borderRadius: '6px',
          fontWeight: 'normal',
          color: '#60a5fa'
        }}>
          {nodes.length} Layers Detected
        </span>
      </h3>

      <div style={{
        height: '800px',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '12px',
        border: '2px solid rgba(255,255,255,0.1)',
        overflow: 'hidden'
      }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#334155" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.id === 'client') return '#3b82f6';
              if (node.id === 'frontend') return '#a78bfa';
              if (node.id === 'auth') return '#10b981';
              if (node.id === 'backend') return '#888888';
              if (node.id === 'cache') return '#f59e0b';
              if (node.id === 'database') return '#ec4899';
              return '#64748b';
            }}
            maskColor="rgba(0, 0, 0, 0.6)"
          />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af', marginBottom: '10px' }}>
          📊 LEGEND
        </div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px' }}></div>
            <span style={{ color: '#d1d5db' }}>Client Layer</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', background: '#a78bfa', borderRadius: '2px' }}></div>
            <span style={{ color: '#d1d5db' }}>Frontend</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }}></div>
            <span style={{ color: '#d1d5db' }}>Authentication</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', background: '#888888', borderRadius: '2px' }}></div>
            <span style={{ color: '#d1d5db' }}>Backend/API</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '2px' }}></div>
            <span style={{ color: '#d1d5db' }}>Cache</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', background: '#ec4899', borderRadius: '2px' }}></div>
            <span style={{ color: '#d1d5db' }}>Database</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataFlowDiagram;

// Made with Bob
