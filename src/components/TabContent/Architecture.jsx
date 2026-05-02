import React from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Architecture Analysis Display Component with Enhanced Typography
function ArchitectureAnalysisDisplay({ analysis }) {
  // Parse the AI response into structured sections
  const parseAnalysis = (text) => {
    const sections = [];
    const lines = text.split('\n');
    let currentSection = null;
    let currentContent = [];

    const sectionIcons = {
      'component': '🧩',
      'technology': '⚡',
      'tech': '⚡',
      'data flow': '🔄',
      'flow': '🔄',
      'dependencies': '📦',
      'dependency': '📦',
      'folder': '📁',
      'structure': '📁',
      'architecture': '🏗️',
      'overview': '📋',
      'summary': '📝'
    };

    const getSectionIcon = (title) => {
      const lowerTitle = title.toLowerCase();
      for (const [key, icon] of Object.entries(sectionIcons)) {
        if (lowerTitle.includes(key)) return icon;
      }
      return '📌';
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Detect section headers (numbered or with special formatting)
      const isHeader = /^(\d+\.|#{1,3}|\*\*|__)\s*(.+?)(\*\*|__)?:?\s*$/i.test(trimmedLine) ||
                      (trimmedLine.length > 0 && trimmedLine.length < 60 &&
                       (trimmedLine.endsWith(':') || /^[A-Z][^.!?]*$/.test(trimmedLine)));

      if (isHeader && trimmedLine.length > 0) {
        // Save previous section
        if (currentSection) {
          sections.push({
            title: currentSection,
            content: currentContent.join('\n').trim(),
            icon: getSectionIcon(currentSection)
          });
        }
        
        // Start new section
        currentSection = trimmedLine.replace(/^(\d+\.|#{1,3}|\*\*|__)\s*/, '').replace(/(\*\*|__|:)$/, '').trim();
        currentContent = [];
      } else if (trimmedLine.length > 0 && currentSection) {
        currentContent.push(trimmedLine);
      } else if (trimmedLine.length > 0 && !currentSection) {
        // Content before any section header
        if (!sections.length) {
          sections.push({
            title: 'Overview',
            content: trimmedLine,
            icon: '📋'
          });
        }
      }
    });

    // Add last section
    if (currentSection && currentContent.length > 0) {
      sections.push({
        title: currentSection,
        content: currentContent.join('\n').trim(),
        icon: getSectionIcon(currentSection)
      });
    }

    return sections.length > 0 ? sections : [{
      title: 'Architecture Analysis',
      content: text,
      icon: '🏗️'
    }];
  };

  const sections = parseAnalysis(analysis);

  // Format bullet points and content
  const formatContent = (content) => {
    return content.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      
      // Bullet points
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const text = trimmed.substring(1).trim();
        return (
          <div key={idx} style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '10px',
            paddingLeft: '8px'
          }}>
            <span style={{ color: '#667eea', fontSize: '18px', lineHeight: '1.6' }}>•</span>
            <span style={{ flex: 1, lineHeight: '1.6' }}>{text}</span>
          </div>
        );
      }
      
      // Sub-bullets (indented)
      if (trimmed.startsWith('  -') || trimmed.startsWith('  •')) {
        const text = trimmed.substring(3).trim();
        return (
          <div key={idx} style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '8px',
            paddingLeft: '32px'
          }}>
            <span style={{ color: '#a0aec0', fontSize: '14px', lineHeight: '1.6' }}>◦</span>
            <span style={{ flex: 1, lineHeight: '1.6', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{text}</span>
          </div>
        );
      }
      
      // Regular paragraphs
      if (trimmed.length > 0) {
        return (
          <p key={idx} style={{
            marginBottom: '12px',
            lineHeight: '1.7',
            color: 'var(--text-secondary)'
          }}>
            {trimmed}
          </p>
        );
      }
      
      return null;
    }).filter(Boolean);
  };

  return (
    <div style={{
      display: 'grid',
      gap: '1.5rem',
      marginTop: '1rem'
    }}>
      {sections.map((section, index) => (
        <div key={index} style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
          border: '1px solid rgba(102, 126, 234, 0.2)',
          borderRadius: '16px',
          padding: '24px',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.4)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.15)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.2)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}>
          {/* Section Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid rgba(102, 126, 234, 0.15)'
          }}>
            <span style={{
              fontSize: '32px',
              lineHeight: 1,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
            }}>
              {section.icon}
            </span>
            <h3 style={{
              margin: 0,
              fontSize: '1.4rem',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.02em'
            }}>
              {section.title}
            </h3>
          </div>

          {/* Section Content */}
          <div style={{
            fontSize: '0.95rem',
            color: 'var(--text-primary)'
          }}>
            {formatContent(section.content)}
          </div>
        </div>
      ))}
    </div>
  );
}

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
// Technology Flow Diagram Component - COMPREHENSIVE VERSION
function TechnologyFlowDiagram({ techStack, mainTechnologies }) {
  const createTechFlowNodes = () => {
    const nodes = [];
    const categories = [
      { key: 'frontend', label: 'Frontend', icon: '🎨', color: '#61dafb', y: 50 },
      { key: 'backend', label: 'Backend', icon: '⚙️', color: '#68a063', y: 250 },
      { key: 'database', label: 'Database', icon: '💾', color: '#f29111', y: 450 },
      { key: 'testing', label: 'Testing', icon: '🧪', color: '#c678dd', y: 650 },
      { key: 'devops', label: 'DevOps', icon: '🚀', color: '#56b6c2', y: 850 }
    ];

    categories.forEach((cat) => {
      if (techStack[cat.key] && techStack[cat.key].length > 0) {
        const allTechs = techStack[cat.key];
        
        // Category header node
        nodes.push({
          id: `flow-cat-${cat.key}`,
          type: 'input',
          data: {
            label: (
              <div style={{ textAlign: 'center', padding: '14px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{cat.icon}</div>
                <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '4px' }}>{cat.label}</div>
                <div style={{ fontSize: '11px', opacity: 0.7 }}>{allTechs.length} {allTechs.length === 1 ? 'Technology' : 'Technologies'}</div>
              </div>
            )
          },
          position: { x: 50, y: cat.y },
          style: {
            background: `linear-gradient(135deg, ${cat.color}25 0%, #1e2530 100%)`,
            border: `3px solid ${cat.color}`,
            borderRadius: '16px',
            width: 200,
            color: '#fff',
            boxShadow: `0 4px 12px ${cat.color}40`
          }
        });

        // Individual technology nodes
        allTechs.forEach((tech, techIndex) => {
          nodes.push({
            id: `flow-tech-${cat.key}-${techIndex}`,
            type: 'default',
            data: {
              label: (
                <div style={{ textAlign: 'center', padding: '10px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>{tech}</div>
                  <div style={{ fontSize: '10px', opacity: 0.6, textTransform: 'capitalize' }}>{cat.label}</div>
                </div>
              )
            },
            position: { x: 300 + (techIndex * 200), y: cat.y },
            style: {
              background: '#1e2530',
              border: `2px solid ${cat.color}`,
              borderRadius: '10px',
              width: 170,
              color: '#fff'
            }
          });
        });
      }
    });

    return nodes;
  };

  const createTechFlowEdges = () => {
    const edges = [];
    const categories = ['frontend', 'backend', 'database', 'testing', 'devops'];

    categories.forEach(cat => {
      if (techStack[cat] && techStack[cat].length > 0) {
        // Connect category to each technology
        techStack[cat].forEach((tech, techIndex) => {
          edges.push({
            id: `e-flow-${cat}-${techIndex}`,
            source: `flow-cat-${cat}`,
            target: `flow-tech-${cat}-${techIndex}`,
            animated: true,
            style: { stroke: '#667eea', strokeWidth: 2 },
            type: 'smoothstep'
          });
        });

        // Connect technologies within same category
        for (let i = 0; i < techStack[cat].length - 1; i++) {
          edges.push({
            id: `e-flow-connect-${cat}-${i}`,
            source: `flow-tech-${cat}-${i}`,
            target: `flow-tech-${cat}-${i + 1}`,
            style: { stroke: '#667eea50', strokeWidth: 1, strokeDasharray: '5,5' },
            type: 'smoothstep'
          });
        }
      }
    });

    // Connect categories vertically
    const activeCategories = categories.filter(cat => techStack[cat] && techStack[cat].length > 0);
    for (let i = 0; i < activeCategories.length - 1; i++) {
      edges.push({
        id: `e-flow-cat-${i}`,
        source: `flow-cat-${activeCategories[i]}`,
        target: `flow-cat-${activeCategories[i + 1]}`,
        animated: true,
        style: { stroke: '#667eea', strokeWidth: 3 },
        label: 'Flow',
        labelStyle: { fill: '#fff', fontSize: 12, fontWeight: 'bold' }
      });
    }

    return edges;
  };

  const [techNodes, , onTechNodesChange] = useNodesState(createTechFlowNodes());
  const [techEdges, , onTechEdgesChange] = useEdgesState(createTechFlowEdges());

  return (
    <div className="content-card">
      <h2 className="card-title">📊 Comprehensive Technology Flow</h2>
      <div className="card-content">
        <div className="reactflow-wrapper" style={{
          height: '800px',
          background: '#0f1419',
          borderRadius: '12px',
          border: '1px solid rgba(102, 126, 234, 0.2)',
          overflow: 'hidden'
        }}>
          <ReactFlow
            nodes={techNodes}
            edges={techEdges}
            onNodesChange={onTechNodesChange}
            onEdgesChange={onTechEdgesChange}
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
            💡 <strong style={{ color: 'var(--text-primary)' }}>Interactive Features:</strong> Drag nodes • Zoom with wheel • Pan background<br/>
            🔵 <strong>Solid arrows:</strong> Category flow • <strong>⚪ Dashed lines:</strong> Related technologies
          </p>
        </div>
      </div>
    </div>
  );
}

// Tech Stack Diagram Component - COMPREHENSIVE VERSION
function TechStackDiagram({ techStack }) {
  const createTechStackNodes = () => {
    const nodes = [];
    const categories = [
      { key: 'frontend', label: 'Frontend Technologies', icon: '🎨', color: '#61dafb', desc: 'UI & Client-Side' },
      { key: 'backend', label: 'Backend Technologies', icon: '⚙️', color: '#68a063', desc: 'Server & Logic' },
      { key: 'database', label: 'Database & Storage', icon: '💾', color: '#f29111', desc: 'Data Persistence' },
      { key: 'testing', label: 'Testing & QA', icon: '🧪', color: '#c678dd', desc: 'Quality Assurance' },
      { key: 'devops', label: 'DevOps & Tools', icon: '🚀', color: '#56b6c2', desc: 'CI/CD & Deployment' }
    ];

    let yOffset = 50;
    const yGap = 200;

    categories.forEach((cat) => {
      if (techStack[cat.key] && techStack[cat.key].length > 0) {
        const allTechs = techStack[cat.key];
        
        // Category header node with count
        nodes.push({
          id: `stack-cat-${cat.key}`,
          type: 'input',
          data: {
            label: (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>{cat.icon}</div>
                <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '6px' }}>{cat.label}</div>
                <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '8px' }}>{cat.desc}</div>
                <div style={{
                  background: `${cat.color}30`,
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  border: `1px solid ${cat.color}`
                }}>
                  {allTechs.length} {allTechs.length === 1 ? 'Technology' : 'Technologies'}
                </div>
              </div>
            )
          },
          position: { x: 50, y: yOffset },
          style: {
            background: `linear-gradient(135deg, ${cat.color}30 0%, #1e2530 100%)`,
            border: `3px solid ${cat.color}`,
            borderRadius: '16px',
            width: 240,
            color: '#fff',
            boxShadow: `0 6px 16px ${cat.color}50`
          }
        });

        // Individual technology nodes with enhanced styling
        allTechs.forEach((tech, techIndex) => {
          const row = Math.floor(techIndex / 4); // 4 techs per row
          const col = techIndex % 4;
          
          nodes.push({
            id: `stack-tech-${cat.key}-${techIndex}`,
            type: 'default',
            data: {
              label: (
                <div style={{ textAlign: 'center', padding: '12px' }}>
                  <div style={{
                    fontWeight: 'bold',
                    fontSize: '14px',
                    marginBottom: '6px',
                    color: cat.color
                  }}>
                    {tech}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    opacity: 0.6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {cat.key}
                  </div>
                </div>
              )
            },
            position: {
              x: 350 + (col * 200),
              y: yOffset + (row * 100)
            },
            style: {
              background: `linear-gradient(135deg, #1e2530 0%, ${cat.color}10 100%)`,
              border: `2px solid ${cat.color}`,
              borderRadius: '12px',
              width: 180,
              color: '#fff',
              boxShadow: `0 2px 8px ${cat.color}30`
            }
          });
        });

        // Calculate next category position based on number of rows needed
        const rowsNeeded = Math.ceil(allTechs.length / 4);
        yOffset += Math.max(yGap, rowsNeeded * 100 + 50);
      }
    });

    return nodes;
  };

  const createTechStackEdges = () => {
    const edges = [];
    const categories = ['frontend', 'backend', 'database', 'testing', 'devops'];
    const colors = {
      frontend: '#61dafb',
      backend: '#68a063',
      database: '#f29111',
      testing: '#c678dd',
      devops: '#56b6c2'
    };

    categories.forEach(cat => {
      if (techStack[cat] && techStack[cat].length > 0) {
        // Connect category to each technology
        techStack[cat].forEach((tech, techIndex) => {
          edges.push({
            id: `e-stack-${cat}-${techIndex}`,
            source: `stack-cat-${cat}`,
            target: `stack-tech-${cat}-${techIndex}`,
            animated: true,
            style: {
              stroke: colors[cat],
              strokeWidth: 2
            },
            type: 'smoothstep'
          });
        });

        // Connect technologies in same row
        const techsPerRow = 4;
        for (let i = 0; i < techStack[cat].length; i++) {
          if ((i + 1) % techsPerRow !== 0 && i + 1 < techStack[cat].length) {
            edges.push({
              id: `e-stack-row-${cat}-${i}`,
              source: `stack-tech-${cat}-${i}`,
              target: `stack-tech-${cat}-${i + 1}`,
              style: {
                stroke: `${colors[cat]}40`,
                strokeWidth: 1,
                strokeDasharray: '5,5'
              }
            });
          }
        }
      }
    });

    return edges;
  };

  const [stackNodes, , onStackNodesChange] = useNodesState(createTechStackNodes());
  const [stackEdges, , onStackEdgesChange] = useEdgesState(createTechStackEdges());

  // Count total technologies
  const totalTechs = Object.values(techStack).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="content-card">
      <h2 className="card-title">🛠️ Comprehensive Technology Stack</h2>
      <div className="card-content">
        <div style={{
          marginBottom: '1rem',
          padding: '14px 18px',
          background: 'rgba(102, 126, 234, 0.08)',
          borderRadius: '10px',
          border: '1px solid rgba(102, 126, 234, 0.2)'
        }}>
          <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600' }}>
            📊 Total Technologies Detected: <span style={{ color: '#667eea' }}>{totalTechs}</span>
          </p>
          <p style={{ margin: '10px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
            Organized into {Object.values(techStack).filter(arr => arr.length > 0).length} categories •
            Grid layout with 4 technologies per row •
            Interactive connections
          </p>
        </div>
        <div className="reactflow-wrapper" style={{
          height: '900px',
          background: '#0f1419',
          borderRadius: '12px',
          border: '1px solid rgba(102, 126, 234, 0.2)',
          overflow: 'hidden'
        }}>
          <ReactFlow
            nodes={stackNodes}
            edges={stackEdges}
            onNodesChange={onStackNodesChange}
            onEdgesChange={onStackEdgesChange}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            attributionPosition="bottom-left"
          >
            <Controls />
            <MiniMap maskColor="rgba(0, 0, 0, 0.6)" />
            <Background variant="dots" gap={12} size={1} color="#373e47" />
          </ReactFlow>
        </div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          💡 Each category connects to its technologies • Drag to explore • Zoom for details
        </p>
      </div>
    </div>
  );
}

// Folder Structure Diagram Component
function FolderStructureDiagram({ folders }) {
  const getFolderInfo = (folder) => {
    const info = {
      src: { icon: '📦', desc: 'Source code', color: '#61dafb' },
      public: { icon: '🌐', desc: 'Static assets', color: '#68a063' },
      components: { icon: '🧩', desc: 'React components', color: '#61dafb' },
      pages: { icon: '📄', desc: 'Page components', color: '#61dafb' },
      styles: { icon: '🎨', desc: 'CSS/styling', color: '#c678dd' },
      utils: { icon: '🔧', desc: 'Utilities', color: '#56b6c2' },
      services: { icon: '🔌', desc: 'API services', color: '#68a063' },
      tests: { icon: '🧪', desc: 'Test files', color: '#c678dd' },
      docs: { icon: '📚', desc: 'Documentation', color: '#e5c07b' },
      config: { icon: '⚙️', desc: 'Configuration', color: '#56b6c2' },
      build: { icon: '🏗️', desc: 'Build output', color: '#f29111' },
      dist: { icon: '📦', desc: 'Distribution', color: '#f29111' },
      node_modules: { icon: '📚', desc: 'Dependencies', color: '#98c379' }
    };
    return info[folder] || { icon: '📁', desc: 'Project folder', color: '#667eea' };
  };

  const createFolderNodes = () => {
    const nodes = [];
    const cols = 3;
    const xGap = 250;
    const yGap = 150;

    // Root node
    nodes.push({
      id: 'root',
      type: 'input',
      data: {
        label: (
          <div style={{ textAlign: 'center', padding: '12px' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>📂</div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Project Root</div>
          </div>
        )
      },
      position: { x: 400, y: 50 },
      style: {
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, #1e2530 100%)',
        border: '2px solid #667eea',
        borderRadius: '12px',
        width: 180,
        color: '#fff'
      }
    });

    // Folder nodes
    folders.forEach((folder, index) => {
      const info = getFolderInfo(folder);
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = 100 + (col * xGap);
      const y = 200 + (row * yGap);

      nodes.push({
        id: `folder-${index}`,
        type: 'default',
        data: {
          label: (
            <div style={{ textAlign: 'center', padding: '10px' }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>{info.icon}</div>
              <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>{folder}/</div>
              <div style={{ fontSize: '10px', opacity: 0.7 }}>{info.desc}</div>
            </div>
          )
        },
        position: { x, y },
        style: {
          background: `linear-gradient(135deg, ${info.color}15 0%, #1e2530 100%)`,
          border: `2px solid ${info.color}`,
          borderRadius: '12px',
          width: 180,
          color: '#fff'
        }
      });
    });

    return nodes;
  };

  const createFolderEdges = () => {
    return folders.map((folder, index) => ({
      id: `e-root-${index}`,
      source: 'root',
      target: `folder-${index}`,
      style: { stroke: '#667eea', strokeWidth: 1.5 },
      type: 'smoothstep'
    }));
  };

  const [folderNodes, , onFolderNodesChange] = useNodesState(createFolderNodes());
  const [folderEdges, , onFolderEdgesChange] = useEdgesState(createFolderEdges());

  return (
    <div className="content-card">
      <h2 className="card-title">📁 Interactive Folder Structure</h2>
      <div className="card-content">
        <div className="reactflow-wrapper" style={{
          height: '500px',
          background: '#0f1419',
          borderRadius: '12px',
          border: '1px solid rgba(102, 126, 234, 0.2)',
          overflow: 'hidden'
        }}>
          <ReactFlow
            nodes={folderNodes}
            edges={folderEdges}
            onNodesChange={onFolderNodesChange}
            onEdgesChange={onFolderEdgesChange}
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
            💡 <strong style={{ color: 'var(--text-primary)' }}>Project Structure:</strong> {folders.length} top-level folders •
            Star topology from root •
            Color-coded by folder type
          </p>
        </div>
      </div>
    </div>
  );
}


function Architecture({ repoData, architectureAnalysis, isArchitectureLoading, architectureError }) {
  // Extract data with defaults (must be before any hooks or returns)
  const techStack = repoData?.techStack || { frontend: [], backend: [], database: [], testing: [], devops: [] };
  const importantFiles = repoData?.importantFiles || [];
  const fileTree = repoData?.fileTree || [];

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

  // Create React Flow nodes for System Architecture
  const createArchitectureNodes = () => {
    const nodes = [];
    const xCenter = 400;
    let yPos = 50;
    const yGap = 180;

    // Layer 1: Client
    nodes.push({
      id: 'client',
      type: 'default',
      data: {
        label: (
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>👤</div>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Client Layer</div>
            <div style={{ fontSize: '11px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>Web</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>Mobile</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>Desktop</span>
            </div>
          </div>
        )
      },
      position: { x: xCenter, y: yPos },
      style: {
        background: 'linear-gradient(135deg, rgba(255, 107, 157, 0.15) 0%, #1e2530 100%)',
        border: '2px solid #ff6b9d',
        borderRadius: '12px',
        width: 280,
        color: '#fff',
        fontSize: '13px'
      }
    });
    yPos += yGap;

    // Layer 2: Frontend
    nodes.push({
      id: 'frontend',
      type: 'default',
      data: {
        label: (
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎨</div>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Frontend Layer</div>
            <div style={{ fontSize: '11px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>
                {techStack.frontend.length > 0 ? techStack.frontend[0] : 'React'}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>State</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>Router</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>Components</span>
            </div>
          </div>
        )
      },
      position: { x: xCenter, y: yPos },
      style: {
        background: 'linear-gradient(135deg, rgba(97, 218, 251, 0.15) 0%, #1e2530 100%)',
        border: '2px solid #61dafb',
        borderRadius: '12px',
        width: 280,
        color: '#fff',
        fontSize: '13px'
      }
    });
    yPos += yGap;

    // Layer 3: API Gateway
    nodes.push({
      id: 'api',
      type: 'default',
      data: {
        label: (
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔌</div>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>API Gateway</div>
            <div style={{ fontSize: '11px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>Auth</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>Rate Limit</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>Load Balancer</span>
            </div>
          </div>
        )
      },
      position: { x: xCenter, y: yPos },
      style: {
        background: 'linear-gradient(135deg, rgba(153, 102, 255, 0.15) 0%, #1e2530 100%)',
        border: '2px solid #9966ff',
        borderRadius: '12px',
        width: 280,
        color: '#fff',
        fontSize: '13px'
      }
    });
    yPos += yGap;

    // Layer 4: Backend
    nodes.push({
      id: 'backend',
      type: 'default',
      data: {
        label: (
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚙️</div>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Backend Layer</div>
            <div style={{ fontSize: '11px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>
                {techStack.backend.length > 0 ? techStack.backend[0] : 'Node.js'}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>Controllers</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>Services</span>
            </div>
          </div>
        )
      },
      position: { x: xCenter, y: yPos },
      style: {
        background: 'linear-gradient(135deg, rgba(104, 160, 99, 0.15) 0%, #1e2530 100%)',
        border: '2px solid #68a063',
        borderRadius: '12px',
        width: 280,
        color: '#fff',
        fontSize: '13px'
      }
    });
    yPos += yGap;

    // Layer 5: Cache
    nodes.push({
      id: 'cache',
      type: 'default',
      data: {
        label: (
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Cache Layer</div>
            <div style={{ fontSize: '11px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>Redis</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>Memcached</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>CDN</span>
            </div>
          </div>
        )
      },
      position: { x: xCenter, y: yPos },
      style: {
        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, #1e2530 100%)',
        border: '2px solid #ffd700',
        borderRadius: '12px',
        width: 280,
        color: '#fff',
        fontSize: '13px'
      }
    });
    yPos += yGap;

    // Layer 6: Database
    nodes.push({
      id: 'database',
      type: 'default',
      data: {
        label: (
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>💾</div>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Data Layer</div>
            <div style={{ fontSize: '11px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>
                {techStack.database.length > 0 ? techStack.database[0] : 'Database'}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>Storage</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>Backup</span>
            </div>
          </div>
        )
      },
      position: { x: xCenter, y: yPos },
      style: {
        background: 'linear-gradient(135deg, rgba(242, 145, 17, 0.15) 0%, #1e2530 100%)',
        border: '2px solid #f29111',
        borderRadius: '12px',
        width: 280,
        color: '#fff',
        fontSize: '13px'
      }
    });
    yPos += yGap;

    // Layer 7: External Services
    nodes.push({
      id: 'external',
      type: 'default',
      data: {
        label: (
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🌐</div>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>External Services</div>
            <div style={{ fontSize: '11px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>Watsonx.ai</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>GitHub</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px' }}>Analytics</span>
            </div>
          </div>
        )
      },
      position: { x: xCenter, y: yPos },
      style: {
        background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, #1e2530 100%)',
        border: '2px solid #00d4ff',
        borderRadius: '12px',
        width: 280,
        color: '#fff',
        fontSize: '13px'
      }
    });

    return nodes;
  };

  const createArchitectureEdges = () => {
    return [
      { id: 'e-client-frontend', source: 'client', target: 'frontend', animated: true, style: { stroke: '#667eea', strokeWidth: 2 } },
      { id: 'e-frontend-api', source: 'frontend', target: 'api', animated: true, style: { stroke: '#667eea', strokeWidth: 2 } },
      { id: 'e-api-backend', source: 'api', target: 'backend', animated: true, style: { stroke: '#667eea', strokeWidth: 2 } },
      { id: 'e-backend-cache', source: 'backend', target: 'cache', animated: true, style: { stroke: '#667eea', strokeWidth: 2 } },
      { id: 'e-cache-database', source: 'cache', target: 'database', animated: true, style: { stroke: '#667eea', strokeWidth: 2 } },
      { id: 'e-backend-external', source: 'backend', target: 'external', animated: true, style: { stroke: '#00d4ff', strokeWidth: 2, strokeDasharray: '5,5' } },
    ];
  };

  const [archNodes, , onArchNodesChange] = useNodesState(createArchitectureNodes());
  const [archEdges, , onArchEdgesChange] = useEdgesState(createArchitectureEdges());
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


  return (
    <div className="tab-content architecture-tab">
      {/* Interactive System Architecture with React Flow */}
      <div className="content-card">
        <h2 className="card-title">🏗️ Interactive System Architecture</h2>
        <div className="card-content">
          <div className="reactflow-wrapper" style={{ height: '1400px', background: '#0f1419', borderRadius: '8px' }}>
            <ReactFlow
              nodes={archNodes}
              edges={archEdges}
              onNodesChange={onArchNodesChange}
              onEdgesChange={onArchEdgesChange}
              fitView
              attributionPosition="bottom-left"
            >
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  if (node.style?.border) {
                    return node.style.border.split(' ')[2];
                  }
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
              • <strong>Drag</strong> nodes to rearrange the architecture<br/>
              • <strong>Zoom</strong> with mouse wheel or controls<br/>
              • <strong>Pan</strong> by dragging the background<br/>
              • <strong>Mini-map</strong> in bottom-right for navigation<br/>
              <br/>
              <strong>🔵 Solid arrows:</strong> Main data flow<br/>
              <strong>⚪ Dashed lines:</strong> External service connections
            </p>
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
              <ArchitectureAnalysisDisplay analysis={architectureAnalysis} />
            </div>
          )}
          
          {!architectureAnalysis && !isArchitectureLoading && !architectureError && (
            <p className="placeholder-text">Architecture analysis will appear here...</p>
          )}
        </div>
      </div>

      {/* Interactive Technology Flow with React Flow */}
      {mainTechnologies.length > 0 && <TechnologyFlowDiagram techStack={techStack} mainTechnologies={mainTechnologies} />}

      {/* Interactive Technology Stack with React Flow */}
      {techStack && (Object.values(techStack).some(arr => arr.length > 0)) && <TechStackDiagram techStack={techStack} />}

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

      {/* Interactive Folder Structure with React Flow */}
      {topLevelFolders.length > 0 && <FolderStructureDiagram folders={topLevelFolders} />}
    </div>
  );
}

export default Architecture;

// Made with Bob
