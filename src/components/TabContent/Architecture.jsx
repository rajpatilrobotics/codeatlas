import React from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
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

// Unified Comprehensive Technology Stack Diagram - Combines Flow + Details
function UnifiedTechStackDiagram({ techStack }) {
  const createUnifiedNodes = () => {
    const nodes = [];
    const categories = [
      { key: 'frontend', label: 'Frontend Technologies', icon: '🎨', color: '#61dafb', desc: 'UI & Client-Side' },
      { key: 'backend', label: 'Backend Technologies', icon: '⚙️', color: '#68a063', desc: 'Server & Logic' },
      { key: 'database', label: 'Database & Storage', icon: '💾', color: '#f29111', desc: 'Data Persistence' },
      { key: 'testing', label: 'Testing & QA', icon: '🧪', color: '#c678dd', desc: 'Quality Assurance' },
      { key: 'devops', label: 'DevOps & Tools', icon: '🚀', color: '#56b6c2', desc: 'CI/CD & Deployment' }
    ];

    let yOffset = 50;

    categories.forEach((cat) => {
      if (techStack[cat.key] && techStack[cat.key].length > 0) {
        const allTechs = techStack[cat.key];
        
        // Category header node with enhanced styling
        nodes.push({
          id: `unified-cat-${cat.key}`,
          type: 'input',
          data: {
            label: (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{cat.icon}</div>
                <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '6px', letterSpacing: '-0.02em' }}>{cat.label}</div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '10px', color: '#a0aec0' }}>{cat.desc}</div>
                <div style={{
                  background: `${cat.color}40`,
                  padding: '6px 14px',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  border: `2px solid ${cat.color}`,
                  boxShadow: `0 2px 8px ${cat.color}30`
                }}>
                  {allTechs.length} {allTechs.length === 1 ? 'Technology' : 'Technologies'}
                </div>
              </div>
            )
          },
          position: { x: 50, y: yOffset },
          style: {
            background: `linear-gradient(135deg, ${cat.color}25 0%, #1e2530 100%)`,
            border: `3px solid ${cat.color}`,
            borderRadius: '20px',
            width: 280,
            color: '#fff',
            boxShadow: `0 8px 24px ${cat.color}40`
          }
        });

        // Individual technology nodes in grid layout (5 per row)
        const techsPerRow = 5;
        allTechs.forEach((tech, techIndex) => {
          const row = Math.floor(techIndex / techsPerRow);
          const col = techIndex % techsPerRow;
          
          nodes.push({
            id: `unified-tech-${cat.key}-${techIndex}`,
            type: 'default',
            data: {
              label: (
                <div style={{ textAlign: 'center', padding: '14px 10px' }}>
                  <div style={{
                    fontWeight: 'bold',
                    fontSize: '14px',
                    marginBottom: '6px',
                    color: cat.color,
                    textShadow: `0 0 10px ${cat.color}50`
                  }}>
                    {tech}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    opacity: 0.6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#718096'
                  }}>
                    {cat.key}
                  </div>
                </div>
              )
            },
            position: {
              x: 380 + (col * 190),
              y: yOffset + (row * 100)
            },
            style: {
              background: `linear-gradient(135deg, #1e2530 0%, ${cat.color}08 100%)`,
              border: `2px solid ${cat.color}`,
              borderRadius: '14px',
              width: 170,
              color: '#fff',
              boxShadow: `0 4px 12px ${cat.color}25`,
              transition: 'all 0.3s ease'
            }
          });
        });

        // Calculate next category position based on rows needed
        const rowsNeeded = Math.ceil(allTechs.length / techsPerRow);
        yOffset += Math.max(220, rowsNeeded * 100 + 80);
      }
    });

    return nodes;
  };

  const createUnifiedEdges = () => {
    const edges = [];
    const categories = ['frontend', 'backend', 'database', 'testing', 'devops'];

    categories.forEach(cat => {
      if (techStack[cat] && techStack[cat].length > 0) {
        // Connect category to each technology with animated edges
        techStack[cat].forEach((tech, techIndex) => {
          edges.push({
            id: `e-unified-${cat}-${techIndex}`,
            source: `unified-cat-${cat}`,
            target: `unified-tech-${cat}-${techIndex}`,
            animated: true,
            style: {
              stroke: '#667eea',
              strokeWidth: 2,
              opacity: 0.6
            },
            type: 'smoothstep'
          });
        });
      }
    });

    // Connect categories vertically with flow arrows
    const activeCategories = categories.filter(cat => techStack[cat] && techStack[cat].length > 0);
    for (let i = 0; i < activeCategories.length - 1; i++) {
      edges.push({
        id: `e-unified-cat-${i}`,
        source: `unified-cat-${activeCategories[i]}`,
        target: `unified-cat-${activeCategories[i + 1]}`,
        animated: true,
        style: {
          stroke: '#667eea',
          strokeWidth: 4,
          strokeDasharray: '10,5'
        },
        label: '⬇ Stack Flow',
        labelStyle: {
          fill: '#fff',
          fontSize: 13,
          fontWeight: 'bold',
          background: '#667eea',
          padding: '4px 8px',
          borderRadius: '8px'
        },
        labelBgStyle: { fill: '#667eea', fillOpacity: 0.9 }
      });
    }

    return edges;
  };

  const [nodes, , onNodesChange] = useNodesState(createUnifiedNodes());
  const [edges, , onEdgesChange] = useEdgesState(createUnifiedEdges());

  // Calculate total technologies
  const totalTechs = Object.values(techStack).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="content-card">
      <h2 className="card-title">🏗️ Comprehensive Technology Stack & Architecture</h2>
      <div className="card-content">
        {/* Summary Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          {Object.entries(techStack).map(([key, techs]) => techs.length > 0 && (
            <div key={key} style={{
              background: 'rgba(102, 126, 234, 0.08)',
              border: '1px solid rgba(102, 126, 234, 0.2)',
              borderRadius: '12px',
              padding: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '4px', fontWeight: 'bold', color: '#667eea' }}>
                {techs.length}
              </div>
              <div style={{ fontSize: '12px', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                {key}
              </div>
            </div>
          ))}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            padding: '12px',
            textAlign: 'center',
            color: '#fff'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '4px', fontWeight: 'bold' }}>
              {totalTechs}
            </div>
            <div style={{ fontSize: '12px' }}>
              Total Technologies
            </div>
          </div>
        </div>

        {/* Interactive Diagram */}
        <div className="reactflow-wrapper" style={{
          height: '1000px',
          background: '#0f1419',
          borderRadius: '16px',
          border: '2px solid rgba(102, 126, 234, 0.3)',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            attributionPosition="bottom-left"
          >
            <Controls style={{ bottom: 20, left: 20 }} />
            <MiniMap
              style={{ bottom: 20, right: 20, border: '2px solid #667eea' }}
              nodeColor={(node) => node.style?.border?.split(' ')[2] || '#667eea'}
              maskColor="rgba(0, 0, 0, 0.7)"
            />
            <Background variant="dots" gap={20} size={1.5} color="#373e47" />
          </ReactFlow>
        </div>

        {/* Enhanced Info Box */}
        <div style={{
          marginTop: '20px',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
          borderRadius: '12px',
          border: '1px solid rgba(102, 126, 234, 0.3)'
        }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.8' }}>
            <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>💡 Interactive Features:</strong><br/>
            • <strong>Drag</strong> any node to rearrange the layout<br/>
            • <strong>Zoom</strong> with mouse wheel or use controls<br/>
            • <strong>Pan</strong> by dragging the background<br/>
            • <strong>Mini-map</strong> in bottom-right for quick navigation<br/>
            <br/>
            <strong style={{ color: 'var(--text-primary)' }}>🎨 Visual Guide:</strong><br/>
            🔵 <strong>Solid arrows:</strong> Technology connections •
            ⚪ <strong>Dashed arrows:</strong> Category flow •
            📊 <strong>Grid layout:</strong> 5 technologies per row
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

// Professional Data Flow Diagram Component - Detailed and accurate for all repos
function DataFlowDiagram({ techStack }) {
  const createDetailedDataFlowNodes = () => {
    const nodes = [];
    let yPos = 50;
    const xCenter = 500;
    const yGap = 200;
    const nodeWidth = 320;

    // Detect layers
    const hasFrontend = techStack.frontend && techStack.frontend.length > 0;
    const hasBackend = techStack.backend && techStack.backend.length > 0;
    const hasDatabase = techStack.database && techStack.database.length > 0;
    const hasCache = techStack.cache && techStack.cache.length > 0;
    const hasMessageQueue = techStack.messageQueue && techStack.messageQueue.length > 0;
    const hasAuth = techStack.authentication && techStack.authentication.length > 0;
    const hasOrm = techStack.orm && techStack.orm.length > 0;

    // Layer 1: Client Layer (Always present)
    nodes.push({
      id: 'client',
      type: 'input',
      data: {
        label: (
          <div style={{ padding: '16px', textAlign: 'left' }}>
            <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '10px', borderBottom: '2px solid rgba(255,255,255,0.2)', paddingBottom: '8px' }}>
              CLIENT LAYER
            </div>
            <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
              <div style={{ marginBottom: '4px' }}>• Browser Application</div>
              <div style={{ marginBottom: '4px' }}>• Mobile Application</div>
              <div>• Desktop Client</div>
            </div>
          </div>
        )
      },
      position: { x: xCenter, y: yPos },
      style: {
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        width: nodeWidth,
        color: '#fff',
        boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)'
      }
    });
    yPos += yGap;

    // Layer 2: Frontend Layer (if detected)
    if (hasFrontend) {
      const frameworks = techStack.frontend.filter(t =>
        ['React', 'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js'].includes(t)
      ).slice(0, 2);
      const uiLibs = techStack.frontend.filter(t =>
        ['Material-UI', 'Ant Design', 'Tailwind CSS', 'Bootstrap', 'Chakra UI'].includes(t)
      ).slice(0, 2);
      const stateManagement = techStack.frontend.filter(t =>
        ['Redux', 'Vuex/Pinia', 'React Query'].includes(t)
      ).slice(0, 1);

      nodes.push({
        id: 'frontend',
        type: 'default',
        data: {
          label: (
            <div style={{ padding: '16px', textAlign: 'left' }}>
              <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '10px', borderBottom: '2px solid rgba(255,255,255,0.2)', paddingBottom: '8px' }}>
                FRONTEND LAYER
              </div>
              <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
                {frameworks.length > 0 && <div style={{ marginBottom: '4px' }}>• UI Framework: {frameworks.join(', ')}</div>}
                {stateManagement.length > 0 && <div style={{ marginBottom: '4px' }}>• State: {stateManagement.join(', ')}</div>}
                {uiLibs.length > 0 && <div style={{ marginBottom: '4px' }}>• Styling: {uiLibs.join(', ')}</div>}
                <div>• Component Rendering</div>
              </div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {techStack.frontend.slice(0, 4).map((tech, i) => (
                  <span key={i} style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '600' }}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )
        },
        position: { x: xCenter, y: yPos },
        style: {
          background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
          border: '2px solid #a78bfa',
          borderRadius: '8px',
          width: nodeWidth,
          color: '#fff',
          boxShadow: '0 4px 16px rgba(167, 139, 250, 0.4)'
        }
      });
      yPos += yGap;
    }

    // Layer 3: Authentication Layer (if detected)
    if (hasAuth) {
      nodes.push({
        id: 'auth',
        type: 'default',
        data: {
          label: (
            <div style={{ padding: '16px', textAlign: 'left' }}>
              <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '10px', borderBottom: '2px solid rgba(255,255,255,0.2)', paddingBottom: '8px' }}>
                AUTHENTICATION LAYER
              </div>
              <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
                <div style={{ marginBottom: '4px' }}>• User Authentication</div>
                <div style={{ marginBottom: '4px' }}>• Session Management</div>
                <div>• Authorization & Access Control</div>
              </div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {techStack.authentication.slice(0, 3).map((tech, i) => (
                  <span key={i} style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '600' }}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )
        },
        position: { x: xCenter, y: yPos },
        style: {
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          border: '2px solid #34d399',
          borderRadius: '8px',
          width: nodeWidth,
          color: '#fff',
          boxShadow: '0 4px 16px rgba(52, 211, 153, 0.4)'
        }
      });
      yPos += yGap;
    }

    // Layer 4: Backend/API Layer (if detected)
    if (hasBackend) {
      const frameworks = techStack.backend.filter(t =>
        ['Express.js', 'NestJS', 'Fastify', 'Django', 'FastAPI', 'Flask'].includes(t)
      ).slice(0, 2);
      const apis = techStack.backend.filter(t =>
        ['GraphQL', 'Apollo Server', 'tRPC', 'Socket.IO'].includes(t)
      ).slice(0, 2);

      nodes.push({
        id: 'backend',
        type: 'default',
        data: {
          label: (
            <div style={{ padding: '16px', textAlign: 'left' }}>
              <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '10px', borderBottom: '2px solid rgba(255,255,255,0.2)', paddingBottom: '8px' }}>
                BACKEND / API LAYER
              </div>
              <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
                {frameworks.length > 0 && <div style={{ marginBottom: '4px' }}>• Framework: {frameworks.join(', ')}</div>}
                {apis.length > 0 && <div style={{ marginBottom: '4px' }}>• API: {apis.join(', ')}</div>}
                <div style={{ marginBottom: '4px' }}>• Business Logic</div>
                <div>• Request Processing</div>
              </div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {techStack.backend.slice(0, 4).map((tech, i) => (
                  <span key={i} style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '600' }}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )
        },
        position: { x: xCenter, y: yPos },
        style: {
          background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
          border: '2px solid #22d3ee',
          borderRadius: '8px',
          width: nodeWidth,
          color: '#fff',
          boxShadow: '0 4px 16px rgba(34, 211, 238, 0.4)'
        }
      });
      yPos += yGap;
    }

    // Layer 5: Message Queue Layer (if detected)
    if (hasMessageQueue) {
      nodes.push({
        id: 'queue',
        type: 'default',
        data: {
          label: (
            <div style={{ padding: '16px', textAlign: 'left' }}>
              <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '10px', borderBottom: '2px solid rgba(255,255,255,0.2)', paddingBottom: '8px' }}>
                MESSAGE QUEUE LAYER
              </div>
              <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
                <div style={{ marginBottom: '4px' }}>• Asynchronous Processing</div>
                <div style={{ marginBottom: '4px' }}>• Background Jobs</div>
                <div>• Event-Driven Architecture</div>
              </div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {techStack.messageQueue.map((tech, i) => (
                  <span key={i} style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '600' }}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )
        },
        position: { x: xCenter, y: yPos },
        style: {
          background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
          border: '2px solid #fb923c',
          borderRadius: '8px',
          width: nodeWidth,
          color: '#fff',
          boxShadow: '0 4px 16px rgba(251, 146, 60, 0.4)'
        }
      });
      yPos += yGap;
    }

    // Layer 6: Cache Layer (if detected)
    if (hasCache) {
      nodes.push({
        id: 'cache',
        type: 'default',
        data: {
          label: (
            <div style={{ padding: '16px', textAlign: 'left' }}>
              <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '10px', borderBottom: '2px solid rgba(255,255,255,0.2)', paddingBottom: '8px' }}>
                CACHE LAYER
              </div>
              <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
                <div style={{ marginBottom: '4px' }}>• Data Caching</div>
                <div style={{ marginBottom: '4px' }}>• Session Storage</div>
                <div>• Performance Optimization</div>
              </div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {techStack.cache.map((tech, i) => (
                  <span key={i} style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '600' }}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )
        },
        position: { x: xCenter, y: yPos },
        style: {
          background: 'linear-gradient(135deg, #ca8a04 0%, #eab308 100%)',
          border: '2px solid #facc15',
          borderRadius: '8px',
          width: nodeWidth,
          color: '#fff',
          boxShadow: '0 4px 16px rgba(250, 204, 21, 0.4)'
        }
      });
      yPos += yGap;
    }

    // Layer 7: Database Layer (if detected)
    if (hasDatabase) {
      const databases = techStack.database.filter(t =>
        !['Redis'].includes(t) // Redis already shown in cache
      );
      
      nodes.push({
        id: 'database',
        type: 'output',
        data: {
          label: (
            <div style={{ padding: '16px', textAlign: 'left' }}>
              <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '10px', borderBottom: '2px solid rgba(255,255,255,0.2)', paddingBottom: '8px' }}>
                DATABASE LAYER
              </div>
              <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
                {hasOrm && <div style={{ marginBottom: '4px' }}>• ORM: {techStack.orm.slice(0, 2).join(', ')}</div>}
                <div style={{ marginBottom: '4px' }}>• Data Persistence</div>
                <div style={{ marginBottom: '4px' }}>• Query Processing</div>
                <div>• Transaction Management</div>
              </div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {databases.slice(0, 4).map((tech, i) => (
                  <span key={i} style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '600' }}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )
        },
        position: { x: xCenter, y: yPos },
        style: {
          background: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
          border: '2px solid #f43f5e',
          borderRadius: '8px',
          width: nodeWidth,
          color: '#fff',
          boxShadow: '0 4px 16px rgba(244, 63, 94, 0.4)'
        }
      });
    }

    return nodes;
  };

  const createDetailedDataFlowEdges = () => {
    const edges = [];
    const hasFrontend = techStack.frontend && techStack.frontend.length > 0;
    const hasBackend = techStack.backend && techStack.backend.length > 0;
    const hasDatabase = techStack.database && techStack.database.length > 0;
    const hasCache = techStack.cache && techStack.cache.length > 0;
    const hasMessageQueue = techStack.messageQueue && techStack.messageQueue.length > 0;
    const hasAuth = techStack.authentication && techStack.authentication.length > 0;

    let currentSource = 'client';

    // Client to Frontend or Backend
    if (hasFrontend) {
      edges.push({
        id: 'e-client-frontend',
        source: currentSource,
        target: 'frontend',
        animated: true,
        label: 'HTTP/HTTPS Request',
        style: { stroke: '#3b82f6', strokeWidth: 2.5 },
        labelStyle: { fill: '#3b82f6', fontWeight: 600, fontSize: 11 },
        labelBgStyle: { fill: '#0f1419', fillOpacity: 0.95 }
      });
      currentSource = 'frontend';
    }

    // Frontend/Client to Auth
    if (hasAuth) {
      edges.push({
        id: `e-${currentSource}-auth`,
        source: currentSource,
        target: 'auth',
        animated: true,
        label: 'Authentication',
        style: { stroke: '#34d399', strokeWidth: 2.5 },
        labelStyle: { fill: '#34d399', fontWeight: 600, fontSize: 11 },
        labelBgStyle: { fill: '#0f1419', fillOpacity: 0.95 }
      });
      currentSource = 'auth';
    }

    // Auth/Frontend to Backend
    if (hasBackend) {
      edges.push({
        id: `e-${currentSource}-backend`,
        source: currentSource,
        target: 'backend',
        animated: true,
        label: hasFrontend ? 'REST/GraphQL API' : 'Direct API Call',
        style: { stroke: '#22d3ee', strokeWidth: 2.5 },
        labelStyle: { fill: '#22d3ee', fontWeight: 600, fontSize: 11 },
        labelBgStyle: { fill: '#0f1419', fillOpacity: 0.95 }
      });
      currentSource = 'backend';
    }

    // Backend to Message Queue
    if (hasMessageQueue && hasBackend) {
      edges.push({
        id: 'e-backend-queue',
        source: 'backend',
        target: 'queue',
        animated: true,
        label: 'Async Jobs',
        style: { stroke: '#fb923c', strokeWidth: 2.5, strokeDasharray: '5,5' },
        labelStyle: { fill: '#fb923c', fontWeight: 600, fontSize: 11 },
        labelBgStyle: { fill: '#0f1419', fillOpacity: 0.95 }
      });
    }

    // Backend to Cache
    if (hasCache && hasBackend) {
      edges.push({
        id: 'e-backend-cache',
        source: 'backend',
        target: 'cache',
        animated: true,
        label: 'Cache Lookup',
        style: { stroke: '#facc15', strokeWidth: 2.5 },
        labelStyle: { fill: '#facc15', fontWeight: 600, fontSize: 11 },
        labelBgStyle: { fill: '#0f1419', fillOpacity: 0.95 }
      });
    }

    // Cache to Database or Backend to Database
    if (hasDatabase) {
      if (hasCache && hasBackend) {
        edges.push({
          id: 'e-cache-database',
          source: 'cache',
          target: 'database',
          animated: true,
          label: 'Cache Miss → DB Query',
          style: { stroke: '#f43f5e', strokeWidth: 2.5 },
          labelStyle: { fill: '#f43f5e', fontWeight: 600, fontSize: 11 },
          labelBgStyle: { fill: '#0f1419', fillOpacity: 0.95 }
        });
      } else if (hasBackend) {
        edges.push({
          id: 'e-backend-database',
          source: 'backend',
          target: 'database',
          animated: true,
          label: 'Database Query',
          style: { stroke: '#f43f5e', strokeWidth: 2.5 },
          labelStyle: { fill: '#f43f5e', fontWeight: 600, fontSize: 11 },
          labelBgStyle: { fill: '#0f1419', fillOpacity: 0.95 }
        });
      } else if (hasFrontend) {
        // Direct frontend to database (serverless)
        edges.push({
          id: 'e-frontend-database',
          source: 'frontend',
          target: 'database',
          animated: true,
          label: 'Direct DB Access',
          style: { stroke: '#f43f5e', strokeWidth: 2.5 },
          labelStyle: { fill: '#f43f5e', fontWeight: 600, fontSize: 11 },
          labelBgStyle: { fill: '#0f1419', fillOpacity: 0.95 }
        });
      }
    }

    // Message Queue to Database
    if (hasMessageQueue && hasDatabase && !hasCache) {
      edges.push({
        id: 'e-queue-database',
        source: 'queue',
        target: 'database',
        animated: true,
        label: 'Background Write',
        style: { stroke: '#fb923c', strokeWidth: 2.5, strokeDasharray: '5,5' },
        labelStyle: { fill: '#fb923c', fontWeight: 600, fontSize: 11 },
        labelBgStyle: { fill: '#0f1419', fillOpacity: 0.95 }
      });
    }

    return edges;
  };

  const [nodes, , onNodesChange] = useNodesState(createDetailedDataFlowNodes());
  const [edges, , onEdgesChange] = useEdgesState(createDetailedDataFlowEdges());

  // Calculate height dynamically
  const layerCount = 1 +
    (techStack.frontend?.length > 0 ? 1 : 0) +
    (techStack.authentication?.length > 0 ? 1 : 0) +
    (techStack.backend?.length > 0 ? 1 : 0) +
    (techStack.messageQueue?.length > 0 ? 1 : 0) +
    (techStack.cache?.length > 0 ? 1 : 0) +
    (techStack.database?.length > 0 ? 1 : 0);
  
  const diagramHeight = Math.max(600, layerCount * 200 + 100);

  return (
    <div className="content-card">
      <h2 className="card-title">📊 Data Flow Architecture</h2>
      <div className="card-content">
        <div className="reactflow-wrapper" style={{ height: `${diagramHeight}px`, background: '#0f1419', borderRadius: '8px', border: '1px solid #2d3748' }}>
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
                if (node.style?.border) {
                  return node.style.border.split(' ')[2];
                }
                return '#3b82f6';
              }}
              maskColor="rgba(0, 0, 0, 0.7)"
            />
            <Background variant="dots" gap={12} size={1} color="#373e47" />
          </ReactFlow>
        </div>
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'rgba(59, 130, 246, 0.08)',
          borderRadius: '8px',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <div style={{ fontSize: '13px', lineHeight: '1.8', color: '#e2e8f0' }}>
            <strong style={{ color: '#3b82f6' }}>📊 Architecture Layers:</strong> {layerCount} layers detected
            <br/>
            <strong style={{ color: '#3b82f6' }}>🔄 Data Flow:</strong> {
              [
                techStack.frontend?.length > 0 && 'Frontend',
                techStack.authentication?.length > 0 && 'Auth',
                techStack.backend?.length > 0 && 'Backend',
                techStack.messageQueue?.length > 0 && 'Queue',
                techStack.cache?.length > 0 && 'Cache',
                techStack.database?.length > 0 && 'Database'
              ].filter(Boolean).join(' → ')
            }
            <br/>
            <strong style={{ color: '#3b82f6' }}>💡 Interactive:</strong> Drag nodes • Zoom with mouse wheel • Pan background • View mini-map
          </div>
        </div>
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

      {/* Data Flow Diagram - Shows actual data flow through detected technologies */}
      {techStack && (Object.values(techStack).some(arr => arr.length > 0)) && <DataFlowDiagram techStack={techStack} />}

      {/* Unified Comprehensive Technology Stack Visualization */}
      {techStack && (Object.values(techStack).some(arr => arr.length > 0)) && <UnifiedTechStackDiagram techStack={techStack} />}

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
