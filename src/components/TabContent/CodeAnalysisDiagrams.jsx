import React from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Component for Function Call Flow Diagram
function FunctionCallFlowDiagram({ codeAnalysis }) {
  const functions = codeAnalysis?.definitions?.functions?.slice(0, 15) || [];
  
  // Create nodes from actual functions
  const createFunctionNodes = () => {
    if (functions.length === 0) return [];
    const nodes = [];
    const columns = 3;
    const xGap = 300;
    const yGap = 150;
    
    functions.forEach((func, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      
      // Determine node color based on file type
      let borderColor = '#667eea';
      let bgGradient = 'rgba(102, 126, 234, 0.15)';
      
      if (func.file.includes('api') || func.file.includes('route')) {
        borderColor = '#9966ff';
        bgGradient = 'rgba(153, 102, 255, 0.15)';
      } else if (func.file.includes('component') || func.file.includes('view')) {
        borderColor = '#61dafb';
        bgGradient = 'rgba(97, 218, 251, 0.15)';
      } else if (func.file.includes('service') || func.file.includes('util')) {
        borderColor = '#68a063';
        bgGradient = 'rgba(104, 160, 99, 0.15)';
      } else if (func.file.includes('model') || func.file.includes('schema')) {
        borderColor = '#ff6b9d';
        bgGradient = 'rgba(255, 107, 157, 0.15)';
      }
      
      nodes.push({
        id: `func-${index}`,
        type: 'default',
        data: {
          label: (
            <div style={{ padding: '8px', textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px', color: '#fff' }}>
                {func.name}
              </div>
              {func.params && func.params.length > 0 && (
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                  ({func.params.slice(0, 3).join(', ')}{func.params.length > 3 ? '...' : ''})
                </div>
              )}
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>
                📄 {func.file.split('/').pop()}:{func.line}
              </div>
            </div>
          )
        },
        position: { x: 50 + col * xGap, y: 50 + row * yGap },
        style: {
          background: `linear-gradient(135deg, ${bgGradient} 0%, #1e2530 100%)`,
          border: `2px solid ${borderColor}`,
          borderRadius: '10px',
          width: 250,
          color: '#fff',
          fontSize: '12px'
        }
      });
    });
    
    return nodes;
  };

  // Create edges based on function relationships (simplified - connects functions in same file)
  const createFunctionEdges = () => {
    const edges = [];
    const fileGroups = {};
    
    // Group functions by file
    functions.forEach((func, index) => {
      if (!fileGroups[func.file]) {
        fileGroups[func.file] = [];
      }
      fileGroups[func.file].push(index);
    });
    
    // Connect functions in the same file
    Object.values(fileGroups).forEach(group => {
      for (let i = 0; i < group.length - 1; i++) {
        edges.push({
          id: `e-${group[i]}-${group[i + 1]}`,
          source: `func-${group[i]}`,
          target: `func-${group[i + 1]}`,
          animated: true,
          style: { stroke: '#667eea', strokeWidth: 1.5 },
          type: 'smoothstep'
        });
      }
    });
    
    return edges;
  };

  const [nodes] = useNodesState(createFunctionNodes());
  const [edges] = useEdgesState(createFunctionEdges());

  if (!codeAnalysis || !codeAnalysis.definitions || !codeAnalysis.definitions.functions || functions.length === 0) {
    return null;
  }

  return (
    <div className="content-card">
      <h2 className="card-title">🔄 Function Call Flow (From Code Analysis)</h2>
      <div className="card-content">
        <p style={{ marginBottom: '15px', color: 'var(--text-secondary)', fontSize: '14px' }}>
          Real functions detected in the codebase. Functions in the same file are connected.
        </p>
        <div style={{ height: '600px', background: '#0f1419', borderRadius: '12px', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            attributionPosition="bottom-left"
          >
            <Controls style={{ bottom: 20, left: 20 }} />
            <MiniMap
              style={{ bottom: 20, right: 20 }}
              nodeColor={(node) => node.style?.border?.split(' ')[2] || '#667eea'}
              maskColor="rgba(0, 0, 0, 0.6)"
            />
            <Background variant="dots" gap={16} size={1} color="#373e47" />
          </ReactFlow>
        </div>
        <div style={{
          marginTop: '1rem',
          padding: '12px 16px',
          background: 'rgba(102, 126, 234, 0.08)',
          borderRadius: '8px',
          border: '1px solid rgba(102, 126, 234, 0.2)'
        }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Legend:</strong><br/>
            🔵 <span style={{ color: '#61dafb' }}>Components/Views</span> • 
            🟣 <span style={{ color: '#9966ff' }}>API/Routes</span> • 
            🟢 <span style={{ color: '#68a063' }}>Services/Utils</span> • 
            🔴 <span style={{ color: '#ff6b9d' }}>Models/Schema</span> • 
            ⚪ <span style={{ color: '#667eea' }}>Other</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// Component for File Structure Diagram
function FileStructureDiagram({ codeAnalysis }) {
  const files = codeAnalysis?.files?.slice(0, 20) || [];
  
  // Group files by directory
  const groupFilesByDirectory = () => {
    const dirGroups = {};
    
    files.forEach(file => {
      const parts = file.path.split('/');
      const dir = parts.length > 1 ? parts[0] : 'root';
      
      if (!dirGroups[dir]) {
        dirGroups[dir] = [];
      }
      dirGroups[dir].push(file);
    });
    
    return dirGroups;
  };

  const dirGroups = groupFilesByDirectory();
  
  // Create nodes for directories and files
  const createFileNodes = () => {
    const nodes = [];
    let yPos = 50;
    const xGap = 350;
    
    // Root node
    nodes.push({
      id: 'root',
      type: 'default',
      data: {
        label: (
          <div style={{ textAlign: 'center', padding: '12px' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>📁</div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Repository Root</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
              {files.length} files analyzed
            </div>
          </div>
        )
      },
      position: { x: 400, y: yPos },
      style: {
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, #1e2530 100%)',
        border: '3px solid #667eea',
        borderRadius: '12px',
        width: 200,
        color: '#fff'
      }
    });
    yPos += 150;
    
    // Directory nodes
    Object.keys(dirGroups).forEach((dir, dirIndex) => {
      const xPos = 100 + (dirIndex % 3) * xGap;
      const yOffset = Math.floor(dirIndex / 3) * 200;
      
      nodes.push({
        id: `dir-${dir}`,
        type: 'default',
        data: {
          label: (
            <div style={{ textAlign: 'center', padding: '10px' }}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>📂</div>
              <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>{dir}</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                {dirGroups[dir].length} files
              </div>
            </div>
          )
        },
        position: { x: xPos, y: yPos + yOffset },
        style: {
          background: 'linear-gradient(135deg, rgba(97, 218, 251, 0.15) 0%, #1e2530 100%)',
          border: '2px solid #61dafb',
          borderRadius: '10px',
          width: 180,
          color: '#fff'
        }
      });
      
      // File nodes under each directory (show first 3 files)
      dirGroups[dir].slice(0, 3).forEach((file, fileIndex) => {
        const fileName = file.path.split('/').pop();
        nodes.push({
          id: `file-${dir}-${fileIndex}`,
          type: 'default',
          data: {
            label: (
              <div style={{ padding: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', marginBottom: '2px' }}>📄</div>
                <div style={{ fontSize: '10px', fontWeight: '500' }}>{fileName}</div>
                <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.5)' }}>
                  {file.size ? `${Math.round(file.size / 1024)}KB` : ''}
                </div>
              </div>
            )
          },
          position: { x: xPos - 60 + fileIndex * 60, y: yPos + yOffset + 120 },
          style: {
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            width: 100,
            color: '#fff',
            fontSize: '10px'
          }
        });
      });
    });
    
    return nodes;
  };

  // Create edges
  const createFileEdges = () => {
    const edges = [];
    
    // Connect root to directories
    Object.keys(dirGroups).forEach(dir => {
      edges.push({
        id: `e-root-${dir}`,
        source: 'root',
        target: `dir-${dir}`,
        animated: true,
        style: { stroke: '#667eea', strokeWidth: 2 },
        type: 'smoothstep'
      });
      
      // Connect directories to files
      dirGroups[dir].slice(0, 3).forEach((file, fileIndex) => {
        edges.push({
          id: `e-${dir}-file-${fileIndex}`,
          source: `dir-${dir}`,
          target: `file-${dir}-${fileIndex}`,
          style: { stroke: '#61dafb', strokeWidth: 1 },
          type: 'smoothstep'
        });
      });
    });
    
    return edges;
  };

  const [nodes] = useNodesState(createFileNodes());
  const [edges] = useEdgesState(createFileEdges());

  if (!codeAnalysis || !codeAnalysis.files || files.length === 0) {
    return null;
  }

  return (
    <div className="content-card">
      <h2 className="card-title">📁 Analyzed File Structure</h2>
      <div className="card-content">
        <p style={{ marginBottom: '15px', color: 'var(--text-secondary)', fontSize: '14px' }}>
          Real file structure from code analysis showing directories and analyzed files.
        </p>
        <div style={{ height: '700px', background: '#0f1419', borderRadius: '12px', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            attributionPosition="bottom-left"
          >
            <Controls style={{ bottom: 20, left: 20 }} />
            <MiniMap
              style={{ bottom: 20, right: 20 }}
              nodeColor={(node) => node.style?.border?.split(' ')[2] || '#667eea'}
              maskColor="rgba(0, 0, 0, 0.6)"
            />
            <Background variant="dots" gap={16} size={1} color="#373e47" />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

// Component for Data Flow Diagram based on actual code
function DataFlowFromCodeDiagram({ codeAnalysis }) {
  const functions = codeAnalysis?.definitions?.functions || [];
  
  // Detect data flow patterns from function names and file locations
  const detectDataFlowLayers = () => {
    const layers = {
      controllers: [],
      services: [],
      models: [],
      utils: []
    };
    
    functions.forEach((func, index) => {
      const fileName = func.file.toLowerCase();
      const funcName = func.name.toLowerCase();
      
      if (fileName.includes('controller') || fileName.includes('route') || fileName.includes('api')) {
        layers.controllers.push({ ...func, index });
      } else if (fileName.includes('service') || funcName.includes('service')) {
        layers.services.push({ ...func, index });
      } else if (fileName.includes('model') || fileName.includes('schema') || fileName.includes('entity')) {
        layers.models.push({ ...func, index });
      } else if (fileName.includes('util') || fileName.includes('helper')) {
        layers.utils.push({ ...func, index });
      }
    });
    
    return layers;
  };

  const layers = detectDataFlowLayers();
  
  // Create nodes for data flow
  const createDataFlowNodes = () => {
    const nodes = [];
    let nodeId = 0;
    
    // Client Layer
    nodes.push({
      id: 'client',
      type: 'default',
      data: {
        label: (
          <div style={{ textAlign: 'center', padding: '12px' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>👤</div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Client</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>User Interface</div>
          </div>
        )
      },
      position: { x: 400, y: 50 },
      style: {
        background: 'linear-gradient(135deg, rgba(255, 107, 157, 0.15) 0%, #1e2530 100%)',
        border: '2px solid #ff6b9d',
        borderRadius: '12px',
        width: 200,
        color: '#fff'
      }
    });
    
    // Controller Layer
    if (layers.controllers.length > 0) {
      layers.controllers.slice(0, 4).forEach((func, index) => {
        nodes.push({
          id: `controller-${nodeId++}`,
          type: 'default',
          data: {
            label: (
              <div style={{ padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>🎯</div>
                <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{func.name}</div>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>
                  {func.file.split('/').pop()}
                </div>
              </div>
            )
          },
          position: { x: 150 + index * 200, y: 200 },
          style: {
            background: 'linear-gradient(135deg, rgba(153, 102, 255, 0.15) 0%, #1e2530 100%)',
            border: '2px solid #9966ff',
            borderRadius: '10px',
            width: 160,
            color: '#fff'
          }
        });
      });
    }
    
    // Service Layer
    if (layers.services.length > 0) {
      layers.services.slice(0, 4).forEach((func, index) => {
        nodes.push({
          id: `service-${nodeId++}`,
          type: 'default',
          data: {
            label: (
              <div style={{ padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>⚙️</div>
                <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{func.name}</div>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>
                  {func.file.split('/').pop()}
                </div>
              </div>
            )
          },
          position: { x: 150 + index * 200, y: 380 },
          style: {
            background: 'linear-gradient(135deg, rgba(104, 160, 99, 0.15) 0%, #1e2530 100%)',
            border: '2px solid #68a063',
            borderRadius: '10px',
            width: 160,
            color: '#fff'
          }
        });
      });
    }
    
    // Model/Data Layer
    if (layers.models.length > 0) {
      layers.models.slice(0, 4).forEach((func, index) => {
        nodes.push({
          id: `model-${nodeId++}`,
          type: 'default',
          data: {
            label: (
              <div style={{ padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>💾</div>
                <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{func.name}</div>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>
                  {func.file.split('/').pop()}
                </div>
              </div>
            )
          },
          position: { x: 150 + index * 200, y: 560 },
          style: {
            background: 'linear-gradient(135deg, rgba(97, 218, 251, 0.15) 0%, #1e2530 100%)',
            border: '2px solid #61dafb',
            borderRadius: '10px',
            width: 160,
            color: '#fff'
          }
        });
      });
    }
    
    // Database
    nodes.push({
      id: 'database',
      type: 'default',
      data: {
        label: (
          <div style={{ textAlign: 'center', padding: '12px' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>🗄️</div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Database</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Data Storage</div>
          </div>
        )
      },
      position: { x: 400, y: 720 },
      style: {
        background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, #1e2530 100%)',
        border: '2px solid #ffc107',
        borderRadius: '12px',
        width: 200,
        color: '#fff'
      }
    });
    
    return nodes;
  };

  // Create edges for data flow
  const createDataFlowEdges = () => {
    const edges = [];
    
    // Connect client to controllers
    const controllerCount = Math.min(layers.controllers.length, 4);
    for (let i = 0; i < controllerCount; i++) {
      edges.push({
        id: `e-client-controller-${i}`,
        source: 'client',
        target: `controller-${i}`,
        animated: true,
        label: 'HTTP Request',
        style: { stroke: '#ff6b9d', strokeWidth: 2 },
        type: 'smoothstep',
        labelStyle: { fill: '#ff6b9d', fontSize: 10 }
      });
    }
    
    // Connect controllers to services
    const serviceCount = Math.min(layers.services.length, 4);
    for (let i = 0; i < Math.min(controllerCount, serviceCount); i++) {
      edges.push({
        id: `e-controller-service-${i}`,
        source: `controller-${i}`,
        target: `service-${i}`,
        animated: true,
        label: 'Business Logic',
        style: { stroke: '#9966ff', strokeWidth: 2 },
        type: 'smoothstep',
        labelStyle: { fill: '#9966ff', fontSize: 10 }
      });
    }
    
    // Connect services to models
    const modelCount = Math.min(layers.models.length, 4);
    for (let i = 0; i < Math.min(serviceCount, modelCount); i++) {
      edges.push({
        id: `e-service-model-${i}`,
        source: `service-${i}`,
        target: `model-${i}`,
        animated: true,
        label: 'Data Access',
        style: { stroke: '#68a063', strokeWidth: 2 },
        type: 'smoothstep',
        labelStyle: { fill: '#68a063', fontSize: 10 }
      });
    }
    
    // Connect models to database
    for (let i = 0; i < modelCount; i++) {
      edges.push({
        id: `e-model-db-${i}`,
        source: `model-${i}`,
        target: 'database',
        animated: true,
        label: 'Query',
        style: { stroke: '#61dafb', strokeWidth: 2 },
        type: 'smoothstep',
        labelStyle: { fill: '#61dafb', fontSize: 10 }
      });
    }
    
    return edges;
  };

  const [nodes] = useNodesState(createDataFlowNodes());
  const [edges] = useEdgesState(createDataFlowEdges());

  if (!codeAnalysis || !codeAnalysis.definitions || functions.length === 0) {
    return null;
  }

  return (
    <div className="content-card">
      <h2 className="card-title">🔄 Data Flow Architecture (From Real Code)</h2>
      <div className="card-content">
        <p style={{ marginBottom: '15px', color: 'var(--text-secondary)', fontSize: '14px' }}>
          Data flow diagram generated from actual functions detected in the codebase.
        </p>
        <div style={{ height: '850px', background: '#0f1419', borderRadius: '12px', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            attributionPosition="bottom-left"
          >
            <Controls style={{ bottom: 20, left: 20 }} />
            <MiniMap
              style={{ bottom: 20, right: 20 }}
              nodeColor={(node) => node.style?.border?.split(' ')[2] || '#667eea'}
              maskColor="rgba(0, 0, 0, 0.6)"
            />
            <Background variant="dots" gap={16} size={1} color="#373e47" />
          </ReactFlow>
        </div>
        <div style={{
          marginTop: '1rem',
          padding: '12px 16px',
          background: 'rgba(102, 126, 234, 0.08)',
          borderRadius: '8px',
          border: '1px solid rgba(102, 126, 234, 0.2)'
        }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Real Functions Detected:</strong><br/>
            🎯 Controllers: {layers.controllers.length} • 
            ⚙️ Services: {layers.services.length} • 
            💾 Models: {layers.models.length} • 
            🔧 Utils: {layers.utils.length}
          </p>
        </div>
      </div>
    </div>
  );
}

export { FunctionCallFlowDiagram, FileStructureDiagram, DataFlowFromCodeDiagram };

// Made with Bob
