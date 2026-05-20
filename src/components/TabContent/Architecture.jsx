import React from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FunctionCallFlowDiagram, FileStructureDiagram } from './CodeAnalysisDiagrams';
import DynamicDataFlowDiagram from './DynamicDataFlowDiagram';
import { cleanMarkdown } from '../../utils/textFormatting';
import DownloadDiagramButton from '../DownloadDiagramButton';
import { Building2, Layers, Package, FolderTree, FileText, Cpu, Database, Shield, Globe, Zap, Code, GitBranch, Info } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import MetricCard from '../ui/MetricCard';

// Architecture Analysis Display Component with Enhanced Typography
function ArchitectureAnalysisDisplay({ analysis }) {
  // Clean markdown from analysis before parsing
  const cleanedAnalysis = cleanMarkdown(analysis);
  
  // Parse the cleaned AI response into structured sections
  const parseAnalysis = (text) => {
    const sections = [];
    const lines = text.split('\n');
    let currentSection = null;
    let currentContent = [];

    const sectionIcons = {
      'component': <Package size={20} />,
      'technology': <Cpu size={20} />,
      'tech': <Cpu size={20} />,
      'data flow': <Layers size={20} />,
      'flow': <Layers size={20} />,
      'dependencies': <GitBranch size={20} />,
      'dependency': <GitBranch size={20} />,
      'folder': <FolderTree size={20} />,
      'structure': <FolderTree size={20} />,
      'architecture': <Building2 size={20} />,
      'overview': <FileText size={20} />,
      'summary': <FileText size={20} />
    };

    const getSectionIcon = (title) => {
      const lowerTitle = title.toLowerCase();
      for (const [key, icon] of Object.entries(sectionIcons)) {
        if (lowerTitle.includes(key)) return icon;
      }
      return <FileText size={20} />;
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
            icon: <FileText size={20} />
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
      icon: <Building2 size={20} />
    }];
  };

  const sections = parseAnalysis(cleanedAnalysis);

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
            <span style={{ color: '#667eea', fontSize: '14px', lineHeight: '1.6' }}>•</span>
            <span style={{ flex: 1, lineHeight: '1.6', fontSize: '1rem' }}>{text}</span>
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
            fontSize: '1rem',
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
      gap: 'var(--spacing-md)',
      marginTop: 'var(--spacing-md)'
    }}>
      {sections.map((section, index) => (
        <Card
          key={index}
          title={section.title}
          icon={() => section.icon}
          className="ca-card"
        >
          {formatContent(section.content)}
        </Card>
      ))}
    </div>
  );
}

// Unified Comprehensive Technology Stack Diagram - Combines Flow + Details
function UnifiedTechStackDiagram({ techStack }) {
  const createUnifiedNodes = () => {
    const nodes = [];
    const categories = [
      { key: 'frontend', label: 'Frontend Technologies', icon: <Code size={32} />, color: '#61dafb', desc: 'UI & Client-Side' },
      { key: 'backend', label: 'Backend Technologies', icon: <Cpu size={32} />, color: '#68a063', desc: 'Server & Logic' },
      { key: 'database', label: 'Database & Storage', icon: <Database size={32} />, color: '#f29111', desc: 'Data Persistence' },
      { key: 'testing', label: 'Testing & QA', icon: <Shield size={32} />, color: '#c678dd', desc: 'Quality Assurance' },
      { key: 'devops', label: 'DevOps & Tools', icon: <Zap size={32} />, color: '#56b6c2', desc: 'CI/CD & Deployment' }
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
                <div style={{ marginBottom: '12px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))', display: 'flex', justifyContent: 'center' }}>{cat.icon}</div>
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
  const totalTechs = techStack ? Object.values(techStack).reduce((sum, arr) => sum + arr.length, 0) : 0;

  return (
    <Card title="Comprehensive Technology Stack & Architecture" icon={Building2}>
      {/* Summary Stats */}
      <div className="ca-metrics-grid">
        {Object.entries(techStack).map(([key, techs]) => techs.length > 0 && (
          <MetricCard
            key={key}
            label={key}
            value={techs.length}
          />
        ))}
        <MetricCard
          label="Total Technologies"
          value={totalTechs}
        />
      </div>

        {/* Interactive Diagram */}
        <div className="reactflow-wrapper" style={{
          position: 'relative',
          height: '1000px',
          background: '#0f1419',
          borderRadius: '16px',
          border: '2px solid rgba(102, 126, 234, 0.3)',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <DownloadDiagramButton
            containerId="tech-stack-diagram"
            fileName="technology-stack"
          />
          <div id="tech-stack-diagram" style={{ width: '100%', height: '100%' }}>
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
    </Card>
  );
}

// Technology Flow Diagram Component - COMPREHENSIVE VERSION
function TechnologyFlowDiagram({ techStack, mainTechnologies }) {
  const createTechFlowNodes = () => {
    const nodes = [];
    const categories = [
      { key: 'frontend', label: 'Frontend', icon: <Code size={28} />, color: '#61dafb', y: 50 },
      { key: 'backend', label: 'Backend', icon: <Cpu size={28} />, color: '#68a063', y: 250 },
      { key: 'database', label: 'Database', icon: <Database size={28} />, color: '#f29111', y: 450 },
      { key: 'testing', label: 'Testing', icon: <Shield size={28} />, color: '#c678dd', y: 650 },
      { key: 'devops', label: 'DevOps', icon: <Zap size={28} />, color: '#56b6c2', y: 850 }
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
                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>{cat.icon}</div>
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
    <Card title="Comprehensive Technology Flow" icon={Layers}>
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
    </Card>
  );
}

// Tech Stack Diagram Component - COMPREHENSIVE VERSION
function TechStackDiagram({ techStack }) {
  const createTechStackNodes = () => {
    const nodes = [];
    const categories = [
      { key: 'frontend', label: 'Frontend Technologies', icon: <Code size={32} />, color: '#61dafb', desc: 'UI & Client-Side' },
      { key: 'backend', label: 'Backend Technologies', icon: <Cpu size={32} />, color: '#68a063', desc: 'Server & Logic' },
      { key: 'database', label: 'Database & Storage', icon: <Database size={32} />, color: '#f29111', desc: 'Data Persistence' },
      { key: 'testing', label: 'Testing & QA', icon: <Shield size={32} />, color: '#c678dd', desc: 'Quality Assurance' },
      { key: 'devops', label: 'DevOps & Tools', icon: <Zap size={32} />, color: '#56b6c2', desc: 'CI/CD & Deployment' }
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
                <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>{cat.icon}</div>
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
  const totalTechs = techStack ? Object.values(techStack).reduce((sum, arr) => sum + arr.length, 0) : 0;

  return (
    <Card title="Comprehensive Technology Stack" icon={Package}>
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
            Organized into {techStack ? Object.values(techStack).filter(arr => arr.length > 0).length : 0} categories •
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
    </Card>
  );
}

// ULTRA-COMPREHENSIVE Data Flow Diagram with Custom React Flow Nodes
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
    const xCenter = 600;
    const yGap = 350;

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
            icon={<Globe size={24} />}
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
              topItemsLabel: 'Top Components',
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
              icon={<Code size={24} />}
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
                topItemsLabel: 'Key Components & Functions'
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
              icon={<Shield size={24} />}
              color="#10b981"
              data={{
                subtitle: "Security & Access Control",
                technologies: techStack.authentication,
                metrics: {
                  'Middleware': detailedArchitecture?.middleware?.length || 0,
                  'Guards': allFunctions.filter(f => f.name.includes('auth') || f.name.includes('guard')).length
                },
                topItems: techStack.authentication.slice(0, 4),
                topItemsLabel: 'Auth Technologies',
                additionalInfo: 'Handles authentication, authorization, and session management'
              }}
            />
          )
        },
        position: { x: xCenter, y: yPos },
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
              icon={<Cpu size={24} />}
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
                topItemsLabel: 'API Endpoints',
                additionalInfo: `Ports: ${configuration.ports?.map(p => p.port).join(', ') || 'N/A'}`
              }}
            />
          )
        },
        position: { x: xCenter, y: hasAuth ? yPos + 350 : yPos },
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
              icon={<Zap size={24} />}
              color="#f59e0b"
              data={{
                subtitle: "Performance & Speed Optimization",
                technologies: techStack.cache,
                metrics: {
                  'Systems': techStack.cache.length
                },
                topItems: techStack.cache,
                topItemsLabel: 'Cache Systems',
                additionalInfo: 'Reduces database load and improves response times'
              }}
            />
          )
        },
        position: { x: xCenter, y: yPos + 175 },
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
              icon={<Database size={24} />}
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
                topItemsLabel: 'Database Models',
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
    <Card title="Data Flow Architecture" icon={Layers} headerAction={
      <Badge variant="info">{nodes.length} Layers Detected</Badge>
    }>

      <div style={{
        height: '1400px',
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
    </Card>
  );
}


// Modern Styled Architecture Diagram Component
function ModernArchitectureDiagram({ techStack, detailedArchitecture }) {
  const categories = [
    { key: 'frontend', label: 'Frontend', icon: <Code size={24} />, color: '#667eea', desc: 'User Interface & Experience' },
    { key: 'backend', label: 'Backend', icon: <Cpu size={24} />, color: '#10b981', desc: 'Server & API Logic' },
    { key: 'database', label: 'Database', icon: <Database size={24} />, color: '#f59e0b', desc: 'Data Storage & Management' },
    { key: 'testing', label: 'Testing', icon: <Shield size={24} />, color: '#ef4444', desc: 'Quality Assurance' },
    { key: 'devops', label: 'DevOps', icon: <Zap size={24} />, color: '#8b5cf6', desc: 'Deployment & CI/CD' }
  ];

  const totalTechs = techStack ? Object.values(techStack).reduce((sum, arr) => sum + arr.length, 0) : 0;

  return (
    <Card 
      title="Modern Architecture Overview" 
      icon={Building2}
      headerAction={<Badge variant="info">New Design</Badge>}
    >
      {/* Summary Metrics */}
      <div className="ca-metrics-grid" style={{ marginBottom: '24px' }}>
        {Object.entries(techStack || {}).map(([key, techs]) => techs.length > 0 && (
          <MetricCard key={key} label={key} value={techs.length} />
        ))}
        <MetricCard label="Total Technologies" value={totalTechs} />
      </div>

      {/* Modern Grid Layout */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '16px' 
      }}>
        {categories.map((cat) => {
          const techs = techStack?.[cat.key] || [];
          if (techs.length === 0) return null;

          return (
            <div
              key={cat.key}
              style={{
                padding: '20px',
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.05) 100%)',
                borderRadius: '12px',
                border: '2px solid rgba(102, 126, 234, 0.2)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.3)';
                e.currentTarget.style.borderColor = cat.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.2)';
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ 
                  padding: '12px', 
                  background: `${cat.color}20`, 
                  borderRadius: '10px',
                  color: cat.color 
                }}>
                  {cat.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--text-primary)' }}>
                    {cat.label}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {cat.desc}
                  </div>
                </div>
              </div>

              {/* Count Badge */}
              <Badge 
                variant="info" 
                style={{ 
                  marginBottom: '12px', 
                  display: 'inline-block',
                  background: `${cat.color}30`,
                  color: cat.color,
                  border: `1px solid ${cat.color}50`
                }}
              >
                {techs.length} {techs.length === 1 ? 'Technology' : 'Technologies'}
              </Badge>

              {/* Tech List */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {techs.map((tech, idx) => (
                  <Pill 
                    key={idx} 
                    variant="default"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      fontSize: '12px'
                    }}
                  >
                    {tech}
                  </Pill>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: 'rgba(102, 126, 234, 0.08)',
        borderRadius: '8px',
        border: '1px solid rgba(102, 126, 234, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Info size={16} style={{ color: '#667eea' }} />
          <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>
            Modern Design Features
          </span>
        </div>
        <ul style={{ 
          margin: 0, 
          paddingLeft: '20px', 
          color: 'var(--text-secondary)', 
          fontSize: '13px',
          lineHeight: '1.8'
        }}>
          <li>Clean card-based layout with hover effects</li>
          <li>Consistent color scheme matching app theme</li>
          <li>Responsive grid that adapts to screen size</li>
          <li>Modern badges and pills for visual hierarchy</li>
        </ul>
      </div>
    </Card>
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
          position: 'relative',
          height: '500px',
          background: '#0f1419',
          borderRadius: '12px',
          border: '1px solid rgba(102, 126, 234, 0.2)',
          overflow: 'hidden'
        }}>
          <DownloadDiagramButton
            containerId="folder-structure-diagram"
            fileName="folder-structure"
          />
          <div id="folder-structure-diagram" style={{ width: '100%', height: '100%' }}>
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


function Architecture({ repoData, architectureAnalysis, isArchitectureLoading, architectureError, detailedArchitecture, codeAnalysis, isCodeAnalysisLoading }) {
  // Extract data with defaults (must be before any hooks or returns)
  const techStack = repoData?.techStack || { frontend: [], backend: [], database: [], testing: [], devops: [], cache: [], messageQueue: [], authentication: [], orm: [] };
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

  // Create React Flow nodes for System Architecture - HYBRID LAYOUT (Hub & Spoke + Layered Tiers)
  const createArchitectureNodes = () => {
    const nodes = [];
    const edges = [];

    // Helper function to create tech badges
    const createTechBadges = (technologies) => {
      return technologies.map((tech, idx) => (
        <span key={idx} style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px', margin: '2px' }}>
          {tech}
        </span>
      ));
    };

    // Dynamic positioning algorithm
    const calculateDynamicPositions = (nodesInTier, tierY) => {
      const NODE_WIDTH = 220; // Reduced from 260px
      const MIN_GAP = 60; // Minimum gap between nodes
      const MIN_SPACING = NODE_WIDTH + MIN_GAP; // 280px total spacing
      const CENTER_X = 400; // Center of the canvas
      
      const count = nodesInTier.length;
      const positions = [];
      
      if (count === 1) {
        // Single node: centered
        positions.push({ x: CENTER_X, y: tierY });
      } else if (count === 2) {
        // Two nodes: spread 400px apart (200px from center each)
        positions.push({ x: CENTER_X - 200, y: tierY });
        positions.push({ x: CENTER_X + 200, y: tierY });
      } else if (count === 3) {
        // Three nodes: spread 300px apart
        positions.push({ x: CENTER_X - 300, y: tierY });
        positions.push({ x: CENTER_X, y: tierY });
        positions.push({ x: CENTER_X + 300, y: tierY });
      } else {
        // Four or more nodes: calculate even spacing
        const totalWidth = (count - 1) * MIN_SPACING;
        const startX = CENTER_X - (totalWidth / 2);
        
        for (let i = 0; i < count; i++) {
          positions.push({ x: startX + (i * MIN_SPACING), y: tierY });
        }
      }
      
      return positions;
    };

    // Define ALL layer configurations with tier groupings
    const layerConfigs = [
      // PRESENTATION TIER
      {
        id: 'frontend',
        icon: '🎨',
        title: 'Frontend Layer',
        tier: 'presentation',
        tierLabel: '🎨 Presentation Tier',
        tierY: 50,
        technologies: techStack.frontend,
        color: { gradient: 'rgba(97, 218, 251, 0.15)', border: '#61dafb' }
      },
      
      // APPLICATION TIER (Hub - Backend is central)
      {
        id: 'backend',
        icon: '⚙️',
        title: 'Backend Layer',
        tier: 'application',
        tierLabel: '⚙️ Application Tier',
        tierY: 250,
        technologies: techStack.backend,
        color: { gradient: 'rgba(104, 160, 99, 0.15)', border: '#68a063' },
        isHub: true // Backend is the central hub
      },
      {
        id: 'authentication',
        icon: '🔐',
        title: 'Authentication Layer',
        tier: 'application',
        tierLabel: '⚙️ Application Tier',
        tierY: 250,
        technologies: techStack.authentication,
        color: { gradient: 'rgba(255, 107, 107, 0.15)', border: '#ff6b6b' }
      },
      
      // DATA ACCESS TIER
      {
        id: 'orm',
        icon: '🔗',
        title: 'ORM Layer',
        tier: 'dataAccess',
        tierLabel: '🔗 Data Access Tier',
        tierY: 450,
        technologies: techStack.orm,
        color: { gradient: 'rgba(78, 205, 196, 0.15)', border: '#4ecdc4' }
      },
      
      // PERSISTENCE TIER
      {
        id: 'database',
        icon: '💾',
        title: 'Database Layer',
        tier: 'persistence',
        tierLabel: '💾 Persistence Tier',
        tierY: 650,
        technologies: techStack.database,
        color: { gradient: 'rgba(242, 145, 17, 0.15)', border: '#f29111' }
      },
      {
        id: 'cache',
        icon: '🗄️',
        title: 'Cache Layer',
        tier: 'persistence',
        tierLabel: '💾 Persistence Tier',
        tierY: 650,
        technologies: techStack.cache,
        color: { gradient: 'rgba(255, 133, 27, 0.15)', border: '#ff851b' }
      },
      {
        id: 'messageQueue',
        icon: '📨',
        title: 'Message Queue Layer',
        tier: 'persistence',
        tierLabel: '💾 Persistence Tier',
        tierY: 650,
        technologies: techStack.messageQueue,
        color: { gradient: 'rgba(177, 13, 201, 0.15)', border: '#b10dc9' }
      },
      
      // INFRASTRUCTURE TIER
      {
        id: 'testing',
        icon: '🧪',
        title: 'Testing Layer',
        tier: 'infrastructure',
        tierLabel: '🚀 Infrastructure Tier',
        tierY: 850,
        technologies: techStack.testing,
        color: { gradient: 'rgba(153, 102, 255, 0.15)', border: '#9966ff' }
      },
      {
        id: 'devops',
        icon: '🚀',
        title: 'DevOps Layer',
        tier: 'infrastructure',
        tierLabel: '🚀 Infrastructure Tier',
        tierY: 850,
        technologies: techStack.devops,
        color: { gradient: 'rgba(0, 212, 255, 0.15)', border: '#00d4ff' }
      }
    ];

    // Track which layers are added and their tiers
    const addedLayers = [];
    const tierGroups = {};

    // First pass: collect layers with technologies and group by tier
    layerConfigs.forEach((layer) => {
      if (layer.technologies && layer.technologies.length > 0) {
        addedLayers.push(layer);
        
        // Group by tier
        if (!tierGroups[layer.tier]) {
          tierGroups[layer.tier] = [];
        }
        tierGroups[layer.tier].push(layer);
      }
    });

    // Second pass: calculate dynamic positions and create nodes
    addedLayers.forEach((layer) => {
      const nodesInTier = tierGroups[layer.tier];
      const tierIndex = nodesInTier.findIndex(n => n.id === layer.id);
      const positions = calculateDynamicPositions(nodesInTier, layer.tierY);
      const position = positions[tierIndex];

      nodes.push({
        id: layer.id,
        type: 'default',
        data: {
          label: (
            <div style={{ textAlign: 'center', padding: '8px' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>{layer.icon}</div>
              <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' }}>{layer.title}</div>
              <div style={{ fontSize: '11px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '200px' }}>
                {createTechBadges(layer.technologies)}
              </div>
            </div>
          )
        },
        position: position,
        style: {
          background: `linear-gradient(135deg, ${layer.color.gradient} 0%, #1e2530 100%)`,
          border: `2px solid ${layer.color.border}`,
          borderRadius: '12px',
          width: 220,
          color: '#fff',
          fontSize: '13px',
          boxShadow: layer.isHub ? '0 0 20px rgba(104, 160, 99, 0.4)' : '0 4px 6px rgba(0,0,0,0.3)'
        }
      });
    });

    // Create intelligent connections based on architecture patterns
    if (addedLayers.length > 0) {
      const layerMap = {};
      addedLayers.forEach(layer => {
        layerMap[layer.id] = layer;
      });

      // PRESENTATION → APPLICATION connections
      if (layerMap['frontend'] && layerMap['backend']) {
        edges.push({
          id: 'e-frontend-backend',
          source: 'frontend',
          target: 'backend',
          animated: true,
          label: 'HTTP/REST',
          style: { stroke: '#61dafb', strokeWidth: 3 },
          labelStyle: { fill: '#61dafb', fontSize: 10 }
        });
      }

      // APPLICATION TIER - Hub connections (Backend as central hub)
      if (layerMap['backend']) {
        // Backend → Authentication
        if (layerMap['authentication']) {
          edges.push({
            id: 'e-backend-auth',
            source: 'backend',
            target: 'authentication',
            animated: true,
            label: 'Auth Flow',
            style: { stroke: '#ff6b6b', strokeWidth: 2 },
            labelStyle: { fill: '#ff6b6b', fontSize: 10 }
          });
        }

        // Backend → ORM
        if (layerMap['orm']) {
          edges.push({
            id: 'e-backend-orm',
            source: 'backend',
            target: 'orm',
            animated: true,
            label: 'Data Access',
            style: { stroke: '#4ecdc4', strokeWidth: 3 },
            labelStyle: { fill: '#4ecdc4', fontSize: 10 }
          });
        }

        // Backend → Database (if no ORM)
        if (!layerMap['orm'] && layerMap['database']) {
          edges.push({
            id: 'e-backend-database',
            source: 'backend',
            target: 'database',
            animated: true,
            label: 'Direct DB',
            style: { stroke: '#f29111', strokeWidth: 2 },
            labelStyle: { fill: '#f29111', fontSize: 10 }
          });
        }

        // Backend → Cache
        if (layerMap['cache']) {
          edges.push({
            id: 'e-backend-cache',
            source: 'backend',
            target: 'cache',
            animated: false,
            label: 'Caching',
            style: { stroke: '#ff851b', strokeWidth: 2, strokeDasharray: '5,5' },
            labelStyle: { fill: '#ff851b', fontSize: 10 }
          });
        }

        // Backend → Message Queue
        if (layerMap['messageQueue']) {
          edges.push({
            id: 'e-backend-queue',
            source: 'backend',
            target: 'messageQueue',
            animated: false,
            label: 'Async Jobs',
            style: { stroke: '#b10dc9', strokeWidth: 2, strokeDasharray: '5,5' },
            labelStyle: { fill: '#b10dc9', fontSize: 10 }
          });
        }
      }

      // DATA ACCESS → PERSISTENCE connections
      if (layerMap['orm'] && layerMap['database']) {
        edges.push({
          id: 'e-orm-database',
          source: 'orm',
          target: 'database',
          animated: true,
          label: 'Query',
          style: { stroke: '#f29111', strokeWidth: 3 },
          labelStyle: { fill: '#f29111', fontSize: 10 }
        });
      }

      // PERSISTENCE TIER - Horizontal connections
      if (layerMap['database'] && layerMap['cache']) {
        edges.push({
          id: 'e-database-cache',
          source: 'database',
          target: 'cache',
          animated: false,
          label: 'Cache Sync',
          style: { stroke: '#ff851b', strokeWidth: 1, strokeDasharray: '3,3' },
          labelStyle: { fill: '#ff851b', fontSize: 9 }
        });
      }

      // INFRASTRUCTURE connections (Testing & DevOps)
      if (layerMap['testing'] && layerMap['devops']) {
        edges.push({
          id: 'e-testing-devops',
          source: 'testing',
          target: 'devops',
          animated: false,
          label: 'CI/CD',
          style: { stroke: '#00d4ff', strokeWidth: 2 },
          labelStyle: { fill: '#00d4ff', fontSize: 10 }
        });
      }

      // Testing connects to Backend
      if (layerMap['testing'] && layerMap['backend']) {
        edges.push({
          id: 'e-testing-backend',
          source: 'testing',
          target: 'backend',
          animated: false,
          label: 'Tests',
          style: { stroke: '#9966ff', strokeWidth: 1, strokeDasharray: '5,5' },
          labelStyle: { fill: '#9966ff', fontSize: 9 }
        });
      }
    }

    // If no technologies detected, show placeholder
    if (nodes.length === 0) {
      nodes.push({
        id: 'placeholder',
        type: 'default',
        data: {
          label: (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>No Architecture Detected</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                Analyze a repository to see its architecture
              </div>
            </div>
          )
        },
        position: { x: 400, y: 400 },
        style: {
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, #1e2530 100%)',
          border: '2px solid #667eea',
          borderRadius: '12px',
          width: 280,
          color: '#fff'
        }
      });
    }

    return { nodes, edges };
  };

  const { nodes: initialArchNodes, edges: initialArchEdges } = createArchitectureNodes();
  const [archNodes, , onArchNodesChange] = useNodesState(initialArchNodes);
  const [archEdges, , onArchEdgesChange] = useEdgesState(initialArchEdges);
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
          <div className="reactflow-wrapper" style={{ position: 'relative', height: '1400px', background: '#0f1419', borderRadius: '8px' }}>
            <DownloadDiagramButton
              containerId="system-architecture-diagram"
              fileName="system-architecture"
            />
            <div id="system-architecture-diagram" style={{ width: '100%', height: '100%' }}>
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
          </div>
          <div className="flow-description-box" style={{ marginTop: '1rem' }}>
            <p className="flow-description">
              <strong>🏗️ Hybrid Architecture Layout:</strong><br/>
              This diagram combines <strong>Hub & Spoke</strong> (Backend as central hub) with <strong>Layered Tiers</strong> (organized by function).<br/>
              <br/>
              <strong>📊 Architecture Tiers:</strong><br/>
              • <strong>🎨 Presentation Tier:</strong> Frontend Layer<br/>
              • <strong>⚙️ Application Tier:</strong> Backend (Hub) + Authentication<br/>
              • <strong>🔗 Data Access Tier:</strong> ORM Layer<br/>
              • <strong>💾 Persistence Tier:</strong> Database + Cache + Message Queue<br/>
              • <strong>🚀 Infrastructure Tier:</strong> Testing + DevOps<br/>
              <br/>
              <strong>💡 Interactive Features:</strong><br/>
              • <strong>Drag</strong> nodes to rearrange • <strong>Zoom</strong> with mouse wheel • <strong>Pan</strong> by dragging background<br/>
              <br/>
              <strong>🔵 Solid arrows:</strong> Primary data flow • <strong>⚪ Dashed lines:</strong> Async/Cache connections
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

      {/* Dynamic Data Flow Diagram - Shows REAL data flow extracted from code */}
      {codeAnalysis && codeAnalysis.files && codeAnalysis.files.length > 0 && (
        <DynamicDataFlowDiagram codeAnalysis={codeAnalysis} />
      )}

      {/* Unified Comprehensive Technology Stack Visualization */}
      {techStack && Object.keys(techStack).length > 0 && Object.values(techStack).some(arr => Array.isArray(arr) && arr.length > 0) && <UnifiedTechStackDiagram techStack={techStack} />}

      {/* Code Analysis - Detected Patterns & Structure */}
      {codeAnalysis && codeAnalysis.summary && (
        <div className="content-card">
          <h2 className="card-title">🔬 Code Analysis Insights</h2>
          <div className="card-content">
            {isCodeAnalysisLoading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Analyzing code structure...</p>
              </div>
            ) : (
              <>
                {/* Architecture Patterns */}
                {codeAnalysis?.summary?.patterns && Array.isArray(codeAnalysis.summary.patterns) && codeAnalysis.summary.patterns.length > 0 && (
                  <div style={{ marginBottom: '25px' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--text-primary)' }}>
                      🏗️ Detected Architecture Patterns
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {(codeAnalysis.summary.patterns || []).map((pattern, index) => (
                        <span
                          key={index}
                          style={{
                            backgroundColor: '#e8f5e9',
                            color: '#2e7d32',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: '500',
                            border: '1px solid #4caf50'
                          }}
                        >
                          {pattern}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Code Structure Statistics */}
                <div style={{ marginBottom: '25px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--text-primary)' }}>
                    📊 Code Structure Statistics
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '15px'
                  }}>
                    <div style={{
                      padding: '15px',
                      background: 'rgba(102, 126, 234, 0.08)',
                      borderRadius: '8px',
                      border: '1px solid rgba(102, 126, 234, 0.2)'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                        {codeAnalysis.summary.totalFiles || 0}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Files Analyzed
                      </div>
                    </div>
                    <div style={{
                      padding: '15px',
                      background: 'rgba(102, 126, 234, 0.08)',
                      borderRadius: '8px',
                      border: '1px solid rgba(102, 126, 234, 0.2)'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                        {codeAnalysis.summary.totalLines || 0}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Lines of Code
                      </div>
                    </div>
                    {codeAnalysis.definitions && codeAnalysis.definitions.functions && (
                      <div style={{
                        padding: '15px',
                        background: 'rgba(102, 126, 234, 0.08)',
                        borderRadius: '8px',
                        border: '1px solid rgba(102, 126, 234, 0.2)'
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                          {codeAnalysis.definitions.functions.length}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Functions Detected
                        </div>
                      </div>
                    )}
                    {codeAnalysis.definitions && codeAnalysis.definitions.classes && (
                      <div style={{
                        padding: '15px',
                        background: 'rgba(102, 126, 234, 0.08)',
                        borderRadius: '8px',
                        border: '1px solid rgba(102, 126, 234, 0.2)'
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                          {codeAnalysis.definitions.classes.length}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Classes Detected
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Key Functions & Classes */}
                {codeAnalysis.definitions && (
                  <div style={{ marginBottom: '25px' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--text-primary)' }}>
                      🔧 Key Code Definitions
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      {/* Functions */}
                      {codeAnalysis?.definitions?.functions && Array.isArray(codeAnalysis.definitions.functions) && codeAnalysis.definitions.functions.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: '14px', marginBottom: '10px', color: 'var(--text-secondary)' }}>
                            Functions ({codeAnalysis.definitions.functions.length})
                          </h4>
                          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {(codeAnalysis.definitions.functions || []).slice(0, 10).map((func, index) => (
                              <div
                                key={index}
                                style={{
                                  padding: '8px 12px',
                                  marginBottom: '6px',
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  borderLeft: '3px solid #667eea'
                                }}
                              >
                                <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                                  {func?.name || 'Unknown'}
                                  {func?.params && Array.isArray(func.params) && func.params.length > 0 && (
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                                      ({func.params.join(', ')})
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  📄 {func?.file || 'unknown'}:{func?.line || 0}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Classes */}
                      {codeAnalysis?.definitions?.classes && Array.isArray(codeAnalysis.definitions.classes) && codeAnalysis.definitions.classes.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: '14px', marginBottom: '10px', color: 'var(--text-secondary)' }}>
                            Classes ({codeAnalysis.definitions.classes.length})
                          </h4>
                          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {(codeAnalysis.definitions.classes || []).slice(0, 10).map((cls, index) => (
                              <div
                                key={index}
                                style={{
                                  padding: '8px 12px',
                                  marginBottom: '6px',
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  borderLeft: '3px solid #ff6b9d'
                                }}
                              >
                                <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                                  {cls?.name || 'Unknown'}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  📄 {cls?.file || 'unknown'}:{cls?.line || 0}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Language Distribution */}
                {codeAnalysis?.summary?.languages && Object.keys(codeAnalysis.summary.languages || {}).length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--text-primary)' }}>
                      📝 Language Distribution
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {Object.entries(codeAnalysis.summary.languages || {}).map(([lang, percentage], index) => (
                        <div
                          key={index}
                          style={{
                            padding: '8px 16px',
                            background: 'rgba(102, 126, 234, 0.08)',
                            borderRadius: '8px',
                            border: '1px solid rgba(102, 126, 234, 0.2)',
                            fontSize: '13px'
                          }}
                        >
                          <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{lang}</span>
                          <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* NEW: Data-Driven Diagrams from Code Analysis */}
      {isCodeAnalysisLoading ? (
        <div className="content-card">
          <h2 className="card-title">🔬 Intelligent Diagrams</h2>
          <div className="card-content">
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Analyzing code to generate intelligent diagrams...</p>
            </div>
          </div>
        </div>
      ) : codeAnalysis && codeAnalysis.definitions && codeAnalysis.files ? (
        <>
          {/* Function Call Flow */}
          <FunctionCallFlowDiagram codeAnalysis={codeAnalysis} />
          
          {/* File Structure from Analysis */}
          <FileStructureDiagram codeAnalysis={codeAnalysis} />
        </>
      ) : (
        <div className="content-card">
          <h2 className="card-title">🔬 Intelligent Diagrams</h2>
          <div className="card-content">
            <p className="text-secondary">
              Intelligent diagrams will be generated from code analysis once the repository is analyzed.
              These diagrams will show real functions, files, and data flow from your actual codebase.
            </p>
          </div>
        </div>
      )}

      {/* NEW: Modern Styled Architecture Diagram for Comparison */}
      {techStack && Object.keys(techStack).length > 0 && Object.values(techStack).some(arr => Array.isArray(arr) && arr.length > 0) && (
        <ModernArchitectureDiagram techStack={techStack} detailedArchitecture={detailedArchitecture} />
      )}

      {/* Interactive Folder Structure with React Flow */}
      {topLevelFolders.length > 0 && <FolderStructureDiagram folders={topLevelFolders} />}

      {/* Key Files & Components - Moved to bottom after all diagrams */}
      {importantFiles && Array.isArray(importantFiles) && importantFiles.length > 0 && (
        <div className="content-card">
          <h2 className="card-title">📦 Key Components</h2>
          <div className="card-content">
            <div className="key-files-list">
              {(importantFiles || []).map((file, index) => (
                <div key={index} className="key-file-item">
                  <span className="file-icon">📄</span>
                  <span className="file-name">{file?.path || 'Unknown file'}</span>
                  <span className="file-badge">
                    {file?.path?.includes('package.json') && 'Dependencies'}
                    {file?.path?.includes('README') && 'Documentation'}
                    {file?.path?.includes('index') && 'Entry Point'}
                    {file?.path?.includes('App') && 'Main Component'}
                    {file?.path?.includes('.env') && 'Configuration'}
                    {!file?.path?.includes('package.json') &&
                     !file?.path?.includes('README') &&
                     !file?.path?.includes('index') &&
                     !file?.path?.includes('App') &&
                     !file?.path?.includes('.env') && 'Core File'}
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
