import React, { useMemo, useCallback } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import DownloadDiagramButton from '../DownloadDiagramButton';

// ============================================================================
// FLOW EXTRACTION FROM CODE
// ============================================================================

// Detect entry points (index.js, main.js, App.jsx, etc.)
const detectEntryPoints = (codeAnalysis) => {
  if (!codeAnalysis?.files) return [];
  
  const entryFiles = codeAnalysis.files.filter(f => 
    f.path.match(/index\.(js|jsx|ts|tsx)$/i) ||
    f.path.match(/main\.(js|jsx|ts|tsx|py)$/i) ||
    f.path.match(/App\.(jsx|tsx)$/i) ||
    f.path.match(/app\.py$/i) ||
    f.path.match(/server\.(js|ts)$/i)
  );
  
  return entryFiles.map(f => ({
    id: `entry_${f.path}`,
    file: f.path,
    fileName: f.path.split('/').pop(),
    type: 'entry',
    layer: 'entry',
    importance: 50,
    functions: f.definitions?.functions?.length || 0,
    classes: f.definitions?.classes?.length || 0
  }));
};

// Detect UI components
const detectUIComponents = (codeAnalysis) => {
  if (!codeAnalysis?.files) return [];
  
  const uiFiles = codeAnalysis.files.filter(f =>
    (f.path.includes('component') || 
     f.path.includes('pages') || 
     f.path.includes('views') ||
     f.path.match(/\.(jsx|tsx|vue)$/)) &&
    !f.path.includes('test') &&
    !f.path.match(/index\.(jsx|tsx)$/i)
  );
  
  return uiFiles.map(f => ({
    id: `ui_${f.path}`,
    file: f.path,
    fileName: f.path.split('/').pop(),
    type: 'component',
    layer: 'ui',
    importance: (f.definitions?.functions?.length || 0) + (f.definitions?.classes?.length || 0),
    functions: f.definitions?.functions?.length || 0,
    classes: f.definitions?.classes?.length || 0,
    hasState: f.content?.includes('useState') || f.content?.includes('this.state')
  }));
};

// Detect API calls
const detectAPICalls = (codeAnalysis) => {
  if (!codeAnalysis?.files) return [];
  
  const apiFiles = codeAnalysis.files.filter(f =>
    (f.patterns?.apis?.length > 0 ||
    f.content?.includes('fetch(') ||
    f.content?.includes('axios.') ||
    f.content?.includes('http.')) &&
    !f.path.includes('test')
  );
  
  return apiFiles.map(f => ({
    id: `api_${f.path}`,
    file: f.path,
    fileName: f.path.split('/').pop(),
    type: 'api',
    layer: 'api',
    importance: (f.patterns?.apis?.length || 0) * 5,
    methods: f.patterns?.apis || [],
    functions: f.definitions?.functions?.length || 0
  }));
};

// Detect backend routes
const detectBackendRoutes = (codeAnalysis) => {
  if (!codeAnalysis?.files) return [];
  
  const routeFiles = codeAnalysis.files.filter(f =>
    f.path.includes('route') ||
    f.path.includes('controller') ||
    f.path.includes('api/') ||
    f.content?.includes('app.get(') ||
    f.content?.includes('app.post(') ||
    f.content?.includes('@app.route') ||
    f.content?.includes('router.')
  );
  
  return routeFiles.map(f => ({
    id: `route_${f.path}`,
    file: f.path,
    fileName: f.path.split('/').pop(),
    type: 'route',
    layer: 'backend',
    importance: (f.definitions?.functions?.length || 0) * 3,
    functions: f.definitions?.functions?.length || 0,
    endpoints: extractEndpointCount(f.content)
  }));
};

// Detect data access (models, schemas, database)
const detectDataAccess = (codeAnalysis) => {
  if (!codeAnalysis?.files) return [];
  
  const dataFiles = codeAnalysis.files.filter(f =>
    f.path.includes('model') ||
    f.path.includes('schema') ||
    f.path.includes('database') ||
    f.path.includes('db/') ||
    f.patterns?.databases?.length > 0 ||
    f.content?.includes('mongoose.') ||
    f.content?.includes('sequelize') ||
    f.content?.includes('prisma')
  );
  
  return dataFiles.map(f => ({
    id: `data_${f.path}`,
    file: f.path,
    fileName: f.path.split('/').pop(),
    type: 'model',
    layer: 'data',
    importance: (f.definitions?.classes?.length || 0) * 4,
    classes: f.definitions?.classes?.length || 0,
    database: f.patterns?.databases?.[0] || 'Database'
  }));
};

// Helper: Extract endpoint count from content
const extractEndpointCount = (content) => {
  if (!content) return 0;
  const matches = content.match(/\.(get|post|put|delete|patch)\(/gi);
  return matches ? matches.length : 0;
};

// Helper: Extract imports from file content
const extractImports = (content) => {
  if (!content) return [];
  
  const imports = [];
  
  // ES6 imports: import X from 'path'
  const es6Imports = content.match(/import\s+.*?\s+from\s+['"](.+?)['"]/g);
  if (es6Imports) {
    es6Imports.forEach(imp => {
      const match = imp.match(/from\s+['"](.+?)['"]/);
      if (match) imports.push(match[1]);
    });
  }
  
  // CommonJS: require('path')
  const requireImports = content.match(/require\(['"](.+?)['"]\)/g);
  if (requireImports) {
    requireImports.forEach(req => {
      const match = req.match(/require\(['"](.+?)['"]\)/);
      if (match) imports.push(match[1]);
    });
  }
  
  return imports;
};

// ============================================================================
// EDGE GENERATION
// ============================================================================

const generateEdges = (nodes, codeAnalysis) => {
  const edges = [];
  const edgeSet = new Set(); // Prevent duplicates
  
  if (!codeAnalysis?.files) return edges;
  
  codeAnalysis.files.forEach(file => {
    const sourceNode = nodes.find(n => n.file === file.path);
    if (!sourceNode) return;
    
    // Extract imports and create edges
    const imports = extractImports(file.content);
    
    imports.forEach(importPath => {
      // Find target node by matching import path
      const targetNode = nodes.find(n => 
        n.file.includes(importPath) || 
        importPath.includes(n.fileName?.replace(/\.(jsx?|tsx?)$/, ''))
      );
      
      if (targetNode && sourceNode.id !== targetNode.id) {
        const edgeId = `${sourceNode.id}-${targetNode.id}`;
        if (!edgeSet.has(edgeId)) {
          edges.push({
            id: edgeId,
            source: sourceNode.id,
            target: targetNode.id,
            type: 'smoothstep',
            animated: true,
            style: {
              stroke: '#64748b',
              strokeWidth: 4,
              strokeDasharray: '5,5'
            },
            markerEnd: {
              type: 'arrowclosed',
              color: '#64748b',
              width: 30,
              height: 30
            }
          });
          edgeSet.add(edgeId);
        }
      }
    });
    
    // Create edges from UI to API layer
    if (sourceNode.layer === 'ui' && file.patterns?.apis?.length > 0) {
      const apiNodes = nodes.filter(n => n.layer === 'api');
      apiNodes.forEach(apiNode => {
        const edgeId = `${sourceNode.id}-${apiNode.id}`;
        if (!edgeSet.has(edgeId)) {
          edges.push({
            id: edgeId,
            source: sourceNode.id,
            target: apiNode.id,
            type: 'smoothstep',
            animated: true,
            label: 'HTTP',
            labelStyle: { fill: '#3b82f6', fontWeight: 700, fontSize: 13 },
            labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
            style: { stroke: '#3b82f6', strokeWidth: 4 },
            markerEnd: {
              type: 'arrowclosed',
              color: '#3b82f6',
              width: 30,
              height: 30
            }
          });
          edgeSet.add(edgeId);
        }
      });
    }
    
    // Create edges from API to Backend
    if (sourceNode.layer === 'api') {
      const backendNodes = nodes.filter(n => n.layer === 'backend');
      backendNodes.slice(0, 2).forEach(backendNode => {
        const edgeId = `${sourceNode.id}-${backendNode.id}`;
        if (!edgeSet.has(edgeId)) {
          edges.push({
            id: edgeId,
            source: sourceNode.id,
            target: backendNode.id,
            type: 'smoothstep',
            animated: true,
            label: 'Process',
            labelStyle: { fill: '#8b5cf6', fontWeight: 700, fontSize: 13 },
            labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
            style: { stroke: '#8b5cf6', strokeWidth: 4 },
            markerEnd: {
              type: 'arrowclosed',
              color: '#8b5cf6',
              width: 30,
              height: 30
            }
          });
          edgeSet.add(edgeId);
        }
      });
    }
    
    // Create edges from Backend to Data
    if (sourceNode.layer === 'backend') {
      const dataNodes = nodes.filter(n => n.layer === 'data');
      dataNodes.slice(0, 2).forEach(dataNode => {
        const edgeId = `${sourceNode.id}-${dataNode.id}`;
        if (!edgeSet.has(edgeId)) {
          edges.push({
            id: edgeId,
            source: sourceNode.id,
            target: dataNode.id,
            type: 'smoothstep',
            animated: true,
            label: 'Store',
            labelStyle: { fill: '#10b981', fontWeight: 700, fontSize: 13 },
            labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
            style: { stroke: '#10b981', strokeWidth: 4 },
            markerEnd: {
              type: 'arrowclosed',
              color: '#10b981',
              width: 30,
              height: 30
            }
          });
          edgeSet.add(edgeId);
        }
      });
    }
  });
  
  return edges;
};

// ============================================================================
// IMPORTANCE SCORING & FILTERING
// ============================================================================

const calculateImportanceScore = (node) => {
  let score = node.importance || 0;
  
  // Boost entry points
  if (node.layer === 'entry') score += 50;
  
  // Boost files with many functions/classes
  if (node.functions > 5) score += 20;
  if (node.classes > 2) score += 15;
  
  // Boost API and route files
  if (node.layer === 'api') score += 25;
  if (node.layer === 'backend') score += 20;
  
  // Boost data models
  if (node.layer === 'data') score += 15;
  
  return score;
};

const scoreAndFilterNodes = (nodes, maxNodes = 15) => {
  // Calculate scores
  const scored = nodes.map(node => ({
    ...node,
    score: calculateImportanceScore(node)
  }));
  
  // Sort by score and take top N
  const sorted = scored.sort((a, b) => b.score - a.score);
  
  // Ensure we have at least one node from each layer if available
  const layerCounts = {};
  const selected = [];
  
  // First pass: ensure representation from each layer
  ['entry', 'ui', 'api', 'backend', 'data'].forEach(layer => {
    const layerNodes = sorted.filter(n => n.layer === layer);
    if (layerNodes.length > 0) {
      selected.push(layerNodes[0]);
      layerCounts[layer] = 1;
    }
  });
  
  // Second pass: fill remaining slots with highest scores
  sorted.forEach(node => {
    if (selected.length < maxNodes && !selected.find(n => n.id === node.id)) {
      selected.push(node);
    }
  });
  
  return selected.slice(0, maxNodes);
};

// ============================================================================
// DAGRE LAYOUT
// ============================================================================

const getLayoutedElements = (nodes, edges) => {
  // Group nodes by layer for adaptive grid layout
  const layerOrder = ['entry', 'ui', 'api', 'backend', 'data'];
  const nodesByLayer = {};
  
  // Initialize layers
  layerOrder.forEach(layer => {
    nodesByLayer[layer] = [];
  });
  
  // Group nodes by their layer
  nodes.forEach(node => {
    if (nodesByLayer[node.layer]) {
      nodesByLayer[node.layer].push(node);
    }
  });
  
  // Calculate grid dimensions based on node count
  const calculateGrid = (count) => {
    if (count === 1) return { cols: 1, rows: 1 };
    if (count === 2) return { cols: 2, rows: 1 };
    if (count <= 4) return { cols: 2, rows: 2 };
    if (count <= 6) return { cols: 3, rows: 2 };
    if (count <= 9) return { cols: 3, rows: 3 };
    return { cols: 4, rows: Math.ceil(count / 4) };
  };
  
  // Layout configuration
  const layoutedNodes = [];
  let currentY = 80;
  const layerSpacing = 280; // Vertical space between layers (increased to prevent overlap)
  const nodeWidth = 280;
  const nodeHeight = 140;
  const horizontalGap = 100; // Gap between nodes horizontally (increased for better separation)
  const verticalGap = 80;   // Gap between rows in same layer (increased to prevent name overlap)
  const containerWidth = 1400; // Approximate container width
  
  layerOrder.forEach(layer => {
    const layerNodes = nodesByLayer[layer];
    if (layerNodes.length === 0) return;
    
    const grid = calculateGrid(layerNodes.length);
    const totalGridWidth = (grid.cols * nodeWidth) + ((grid.cols - 1) * horizontalGap);
    const startX = (containerWidth - totalGridWidth) / 2; // Center the grid
    
    layerNodes.forEach((node, index) => {
      const row = Math.floor(index / grid.cols);
      const col = index % grid.cols;
      
      // Calculate position in grid
      const x = startX + (col * (nodeWidth + horizontalGap));
      const y = currentY + (row * (nodeHeight + verticalGap));
      
      layoutedNodes.push({
        ...node,
        position: { x, y }
      });
    });
    
    // Move to next layer (account for all rows in current layer)
    currentY += (grid.rows * (nodeHeight + verticalGap)) + layerSpacing;
  });
  
  return { nodes: layoutedNodes, edges };
};

// ============================================================================
// NODE COMPONENT
// ============================================================================

const FlowNode = ({ node }) => {
  const layerColors = {
    entry: '#3b82f6',    // Blue
    ui: '#8b5cf6',       // Purple
    api: '#888888',
    backend: '#10b981',  // Green
    data: '#f59e0b'      // Orange
  };
  
  const layerIcons = {
    entry: '🚀',
    ui: '🎨',
    api: '🔌',
    backend: '⚙️',
    data: '💾'
  };
  
  const color = layerColors[node.layer] || '#64748b';
  const icon = layerIcons[node.layer] || '📄';
  
  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}20 0%, ${color}08 100%)`,
      border: `2px solid ${color}`,
      borderRadius: '16px',
      padding: '18px',
      minWidth: '260px',
      maxWidth: '280px',
      boxShadow: `0 8px 32px ${color}50, 0 0 0 1px ${color}20`,
      transition: 'all 0.3s ease'
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
        <span style={{ fontSize: '28px' }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontWeight: 'bold',
            fontSize: '16px',
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: '1.4'
          }}>
            {node.fileName}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
            {node.layer} layer
          </div>
        </div>
      </div>
      
      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {node.functions > 0 && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '8px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: color }}>{node.functions}</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' }}>Functions</div>
          </div>
        )}
        {node.classes > 0 && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '8px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: color }}>{node.classes}</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' }}>Classes</div>
          </div>
        )}
        {node.endpoints > 0 && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '8px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: color }}>{node.endpoints}</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' }}>Endpoints</div>
          </div>
        )}
      </div>
      
      {/* File path */}
      <div style={{
        marginTop: '12px',
        paddingTop: '10px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        fontSize: '10px',
        color: '#9ca3af',
        fontFamily: 'monospace',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {node.file}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function DynamicDataFlowDiagram({ codeAnalysis }) {
  // Callback to handle React Flow initialization and auto-fit view
  const onInit = useCallback((reactFlowInstance) => {
    console.log('🎯 DynamicDataFlowDiagram: onInit called');
    // Delay to ensure nodes are fully rendered before fitting view
    setTimeout(() => {
      console.log('🎯 DynamicDataFlowDiagram: Calling fitView');
      reactFlowInstance.fitView({
        padding: 0.3,
        duration: 1000,
        includeHiddenNodes: false
      });
    }, 200);
  }, []);

  const { nodes, edges } = useMemo(() => {
    if (!codeAnalysis || !codeAnalysis.files || codeAnalysis.files.length === 0) {
      return { nodes: [], edges: [] };
    }
    
    console.log('🔍 Extracting flow from code analysis...');
    
    // 1. Extract flow from code
    const entryPoints = detectEntryPoints(codeAnalysis);
    const uiComponents = detectUIComponents(codeAnalysis);
    const apiCalls = detectAPICalls(codeAnalysis);
    const backendRoutes = detectBackendRoutes(codeAnalysis);
    const dataAccess = detectDataAccess(codeAnalysis);
    
    console.log('📊 Detected nodes:', {
      entry: entryPoints.length,
      ui: uiComponents.length,
      api: apiCalls.length,
      backend: backendRoutes.length,
      data: dataAccess.length
    });
    
    // 2. Combine all nodes
    const allNodes = [
      ...entryPoints,
      ...uiComponents,
      ...apiCalls,
      ...backendRoutes,
      ...dataAccess
    ];
    
    if (allNodes.length === 0) {
      return { nodes: [], edges: [] };
    }
    
    // 3. Filter to top 10-15 most important
    const importantNodes = scoreAndFilterNodes(allNodes, 15);
    console.log('⭐ Selected top nodes:', importantNodes.length);
    
    // 4. Generate edges based on relationships
    const generatedEdges = generateEdges(importantNodes, codeAnalysis);
    console.log('🔗 Generated edges:', generatedEdges.length);
    
    // 5. Apply dagre layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(importantNodes, generatedEdges);
    
    // 6. Convert to React Flow format
    const reactFlowNodes = layoutedNodes.map(node => ({
      id: node.id,
      type: 'default',
      data: {
        label: <FlowNode node={node} />
      },
      position: node.position,
      style: { 
        background: 'transparent', 
        border: 'none',
        width: 280
      }
    }));
    
    console.log('✅ Dynamic data flow diagram generated!');
    
    return { nodes: reactFlowNodes, edges: layoutedEdges };
  }, [codeAnalysis]);
  
  if (!codeAnalysis || !codeAnalysis.files || codeAnalysis.files.length === 0) {
    return (
      <div className="content-card">
        <h2 className="card-title">📊 Dynamic Data Flow Diagram</h2>
        <div className="card-content">
          <p className="text-secondary">
            No code analysis data available. The diagram will be generated from actual repository code once analysis is complete.
          </p>
        </div>
      </div>
    );
  }
  
  if (nodes.length === 0) {
    return (
      <div className="content-card">
        <h2 className="card-title">📊 Dynamic Data Flow Diagram</h2>
        <div className="card-content">
          <p className="text-secondary">
            No significant data flow detected in the repository. This could mean the repository is very small or doesn't follow common patterns.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="content-card">
      <h2 className="card-title">📊 Dynamic Data Flow Diagram</h2>
      <div className="card-content">
        <p className="text-secondary" style={{ marginBottom: '20px' }}>
          🔄 Real data flow extracted from repository code. Showing top {nodes.length} most important nodes with enhanced layout.
        </p>
        <div style={{ position: 'relative', height: '800px', background: '#1a1a2e', borderRadius: '8px', overflow: 'hidden' }}>
          <DownloadDiagramButton
            containerId="dynamic-flow-diagram"
            fileName="dynamic-data-flow-diagram"
          />
          <div id="dynamic-flow-diagram" style={{ width: '100%', height: '100%' }}>
            <ReactFlow
            nodes={nodes}
            edges={edges}
            onInit={onInit}
            fitView
            fitViewOptions={{
              padding: 0.3,
              includeHiddenNodes: false,
              minZoom: 0.8,
              maxZoom: 2
            }}
            defaultViewport={{ x: 0, y: 0, zoom: 1.2 }}
            attributionPosition="bottom-left"
            minZoom={0.1}
            maxZoom={2}
          >
            <Background color="#2a2a3e" gap={16} />
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                const layerColors = {
                  entry: '#3b82f6',
                  ui: '#8b5cf6',
                  api: '#888888',
                  backend: '#10b981',
                  data: '#f59e0b'
                };
                return layerColors[node.data?.label?.props?.node?.layer] || '#64748b';
              }}
              maskColor="rgba(0, 0, 0, 0.6)"
            />
          </ReactFlow>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DynamicDataFlowDiagram;

// Made with Bob
