'use client';
/**
 * Architecture Page
 * Visualize codebase architecture with AI-powered diagrams
 * Redesigned for CodeAtlas V2
 */

import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import { Select } from '../components/ui/Dropdown';
import './Architecture.css';

const Architecture = ({ 
  architectureData,
  isLoading,
  error 
}) => {
  const [selectedDiagram, setSelectedDiagram] = useState('overview');

  const diagramOptions = [
    { value: 'overview', label: 'Architecture Overview' },
    { value: 'techstack', label: 'Tech Stack' },
    { value: 'dataflow', label: 'Data Flow' },
    { value: 'folder', label: 'Folder Structure' },
    { value: 'dependencies', label: 'Dependencies' }
  ];

  if (isLoading) {
    return (
      <div className="architecture-page">
        <LoadingState variant="graph" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="architecture-page">
        <EmptyState
          icon="⚠️"
          title="Failed to Load Architecture"
          message={error}
          action={{ label: 'Retry', onClick: () => window.location.reload() }}
        />
      </div>
    );
  }

  if (!architectureData) {
    return (
      <div className="architecture-page">
        <EmptyState
          icon="◈"
          title="No Architecture Data"
          message="Analyze a repository to see architecture diagrams"
          action={{ label: 'Start Analysis', onClick: () => {} }}
        />
      </div>
    );
  }

  return (
    <div className="architecture-page">
      {/* Header */}
      <div className="architecture-header">
        <div>
          <h1 className="architecture-title">Architecture Analysis</h1>
          <p className="architecture-subtitle">
            AI-powered visualization of your codebase structure
          </p>
        </div>
        
        <div className="architecture-header-actions">
          <Select
            value={selectedDiagram}
            onChange={setSelectedDiagram}
            options={diagramOptions}
          />
          <Button variant="secondary" size="md">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Export
          </Button>
        </div>
      </div>

      {/* AI Analysis Summary */}
      {architectureData.analysis && (
        <Card className="architecture-card">
          <div className="architecture-card-header">
            <h2 className="architecture-card-title">AI Analysis</h2>
            <Badge variant="safe">Watsonx</Badge>
          </div>
          <div className="architecture-card-body">
            <div className="architecture-analysis">
              {architectureData.analysis.sections?.map((section, idx) => (
                <div key={idx} className="analysis-section">
                  <h3 className="analysis-section-title">{section.title}</h3>
                  <p className="analysis-section-content">{section.content}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Main Diagram */}
      <Card className="architecture-card architecture-diagram-card">
        <div className="architecture-card-header">
          <h2 className="architecture-card-title">
            {diagramOptions.find(opt => opt.value === selectedDiagram)?.label}
          </h2>
          <div className="architecture-diagram-controls">
            <Button variant="ghost" size="sm">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </Button>
            <Button variant="ghost" size="sm">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M8 8L8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Button>
          </div>
        </div>
        <div className="architecture-card-body">
          <div className="architecture-diagram-container">
            {/* Placeholder for React Flow diagram */}
            <DiagramPlaceholder type={selectedDiagram} data={architectureData} />
          </div>
        </div>
      </Card>

      {/* Tech Stack Grid */}
      {architectureData.techStack && (
        <Card className="architecture-card">
          <div className="architecture-card-header">
            <h2 className="architecture-card-title">Technology Stack</h2>
          </div>
          <div className="architecture-card-body">
            <div className="tech-stack-grid">
              {Object.entries(architectureData.techStack).map(([category, technologies]) => (
                technologies.length > 0 && (
                  <div key={category} className="tech-stack-category">
                    <h3 className="tech-stack-category-title">{category}</h3>
                    <div className="tech-stack-items">
                      {technologies.map((tech, idx) => (
                        <div key={idx} className="tech-stack-item">
                          <span className="tech-stack-item-icon">◆</span>
                          <span className="tech-stack-item-name">{tech}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Architecture Patterns */}
      {architectureData.patterns && architectureData.patterns.length > 0 && (
        <Card className="architecture-card">
          <div className="architecture-card-header">
            <h2 className="architecture-card-title">Architecture Patterns</h2>
          </div>
          <div className="architecture-card-body">
            <div className="patterns-grid">
              {architectureData.patterns.map((pattern, idx) => (
                <div key={idx} className="pattern-card">
                  <div className="pattern-header">
                    <span className="pattern-icon">◉</span>
                    <h3 className="pattern-name">{pattern.name}</h3>
                  </div>
                  <p className="pattern-description">{pattern.description}</p>
                  {pattern.files && (
                    <div className="pattern-files">
                      <span className="pattern-files-label">Used in:</span>
                      <span className="pattern-files-count">{pattern.files.length} files</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Key Components */}
      {architectureData.components && architectureData.components.length > 0 && (
        <Card className="architecture-card">
          <div className="architecture-card-header">
            <h2 className="architecture-card-title">Key Components</h2>
          </div>
          <div className="architecture-card-body">
            <div className="components-list">
              {architectureData.components.map((component, idx) => (
                <div key={idx} className="component-item">
                  <div className="component-header">
                    <span className="component-icon">📦</span>
                    <h3 className="component-name">{component.name}</h3>
                    <Badge variant={component.complexity || 'safe'}>
                      {component.complexity || 'Simple'}
                    </Badge>
                  </div>
                  <p className="component-description">{component.description}</p>
                  <div className="component-meta">
                    <span className="component-meta-item">
                      📄 {component.files || 0} files
                    </span>
                    <span className="component-meta-item">
                      🔗 {component.dependencies || 0} dependencies
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Folder Structure */}
      {architectureData.folderStructure && (
        <Card className="architecture-card">
          <div className="architecture-card-header">
            <h2 className="architecture-card-title">Project Structure</h2>
          </div>
          <div className="architecture-card-body">
            <div className="folder-structure">
              <FolderTree structure={architectureData.folderStructure} />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

// Placeholder component for diagrams (will be replaced with React Flow)
const DiagramPlaceholder = ({ type, data }) => {
  return (
    <div className="diagram-placeholder">
      <div className="diagram-placeholder-content">
        <div className="diagram-placeholder-icon">◈</div>
        <h3 className="diagram-placeholder-title">
          {type === 'overview' && 'Architecture Overview Diagram'}
          {type === 'techstack' && 'Technology Stack Diagram'}
          {type === 'dataflow' && 'Data Flow Diagram'}
          {type === 'folder' && 'Folder Structure Diagram'}
          {type === 'dependencies' && 'Dependency Graph'}
        </h3>
        <p className="diagram-placeholder-description">
          Interactive diagram visualization will be rendered here
        </p>
        <div className="diagram-placeholder-nodes">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="diagram-placeholder-node" />
          ))}
        </div>
      </div>
    </div>
  );
};

// Folder tree component
const FolderTree = ({ structure, level = 0 }) => {
  const [expanded, setExpanded] = useState(true);

  if (!structure) return null;

  return (
    <div className="folder-tree" style={{ paddingLeft: level * 20 }}>
      <div 
        className="folder-tree-item"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="folder-tree-icon">
          {structure.type === 'folder' ? (expanded ? '📂' : '📁') : '📄'}
        </span>
        <span className="folder-tree-name">{structure.name}</span>
      </div>
      {expanded && structure.children && (
        <div className="folder-tree-children">
          {structure.children.map((child, idx) => (
            <FolderTree key={idx} structure={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Architecture;

// Made with Bob
