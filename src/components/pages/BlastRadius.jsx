import React, { useState, useEffect } from 'react';
import { Target, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import { calculateBlastRadius, getBlastRadiusVisualization } from '../../utils/repository/blastRadiusAnalysis.js';

function BlastRadius({ repoData, codeAnalysis }) {
  const [selectedFile, setSelectedFile] = useState('');
  const [blastRadius, setBlastRadius] = useState(null);
  const [visualization, setVisualization] = useState(null);
  const [reasoning, setReasoning] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (repoData && repoData.fileStructure && repoData.fileStructure.length > 0) {
      // Set default selected file
      setSelectedFile(repoData.fileStructure[0].path || '');
    }
  }, [repoData]);

  const analyzeBlastRadius = async () => {
    if (!selectedFile || !repoData) {
      return;
    }

    setIsAnalyzing(true);
    setReasoning('');

    try {
      // Calculate blast radius
      const result = calculateBlastRadius(
        selectedFile,
        repoData.fileStructure,
        codeAnalysis?.files?.map(f => ({ content: f.content, path: f.path })) || []
      );

      setBlastRadius(result);
      setVisualization(getBlastRadiusVisualization(result));

      // Get AI reasoning via API endpoint
      const response = await fetch('/api/ai/blast-radius', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blastRadius: result, repoData })
      });
      const apiResult = await response.json();
      
      if (apiResult.success) {
        setReasoning(apiResult.reasoning);
      } else {
        console.error('Failed to get AI reasoning:', apiResult.error);
      }
    } catch (error) {
      console.error('Error analyzing blast radius:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="severity-icon critical" />;
      case 'high':
        return <AlertTriangle className="severity-icon high" />;
      case 'medium':
        return <AlertTriangle className="severity-icon medium" />;
      case 'low':
        return <CheckCircle className="severity-icon low" />;
      default:
        return <CheckCircle className="severity-icon low" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#9C27B0';
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#4CAF50';
    }
  };

  if (!repoData) {
    return (
      <Card title="Blast Radius Analysis">
        <EmptyState
          icon={Target}
          title="Impact visualization"
          description="See how changes propagate across modules, services, and dependencies. Connect your repository for live blast radius mapping."
        />
      </Card>
    );
  }

  return (
    <Card title="Blast Radius Analysis">
      <div className="blast-radius-controls" style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Select file to analyze:
        </label>
        <select
          value={selectedFile}
          onChange={(e) => setSelectedFile(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            background: '#111',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            borderRadius: '8px',
            marginBottom: '12px'
          }}
        >
          {repoData.fileStructure?.slice(0, 50).map((file, index) => (
            <option key={index} value={file.path}>
              {file.path}
            </option>
          ))}
        </select>
        <button
          onClick={analyzeBlastRadius}
          disabled={isAnalyzing || !selectedFile}
          style={{
            padding: '10px 20px',
            background: '#4CAF50',
            border: 'none',
            color: '#fff',
            borderRadius: '8px',
            cursor: isAnalyzing || !selectedFile ? 'not-allowed' : 'pointer',
            opacity: isAnalyzing || !selectedFile ? 0.5 : 1
          }}
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Impact'}
        </button>
      </div>

      {blastRadius && visualization && (
        <div className="blast-radius-results">
          <div className="blast-severity" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '20px',
            padding: '16px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px'
          }}>
            {getSeverityIcon(blastRadius.severity)}
            <div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                Severity: {blastRadius.severity.toUpperCase()}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.7 }}>
                Impact Score: {blastRadius.totalImpact}
              </div>
            </div>
          </div>

          <div className="blast-visualization" style={{ marginBottom: '20px' }}>
            <div className="blast-center" style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: getSeverityColor(blastRadius.severity),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              position: 'relative'
            }}>
              <span style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center', padding: '10px' }}>
                {selectedFile.split('/').pop()}
              </span>
            </div>
            
            {visualization.rings.map((ring, index) => (
              <div key={index} className="blast-ring" style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%)`,
                width: `${120 + ring.radius * 80}px`,
                height: `${120 + ring.radius * 80}px`,
                borderRadius: '50%',
                border: `2px solid ${ring.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '20px'
              }}>
                {ring.items.map((item, i) => (
                  <span key={i} style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#fff'
                  }}>
                    {typeof item === 'string' ? item.split('/').pop() : item}
                  </span>
                ))}
              </div>
            ))}
          </div>

          <div className="blast-details" style={{ marginBottom: '20px' }}>
            <h4 style={{ marginBottom: '12px' }}>Impacted Files ({blastRadius.impactedFiles.length})</h4>
            <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
              {blastRadius.impactedFiles.slice(0, 20).map((file, index) => (
                <div key={index} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {file}
                </div>
              ))}
              {blastRadius.impactedFiles.length > 20 && (
                <div style={{ padding: '8px 0', opacity: 0.7 }}>
                  ... and {blastRadius.impactedFiles.length - 20} more
                </div>
              )}
            </div>
          </div>

          {blastRadius.impactedServices.length > 0 && (
            <div className="blast-services" style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '12px' }}>Impacted Services ({blastRadius.impactedServices.length})</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {blastRadius.impactedServices.map((service, index) => (
                  <span key={index} style={{
                    background: 'rgba(255,152,0,0.2)',
                    color: '#FF9800',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    fontSize: '14px'
                  }}>
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}

          {reasoning && (
            <div className="blast-reasoning" style={{
              padding: '16px',
              background: 'rgba(76,175,80,0.1)',
              border: '1px solid #4CAF50',
              borderRadius: '8px'
            }}>
              <h4 style={{ marginBottom: '8px', color: '#4CAF50' }}>AI Analysis</h4>
              <p style={{ lineHeight: '1.6' }}>{reasoning}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default BlastRadius;
