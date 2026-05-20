import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Loader2, Circle, Terminal, Cpu, Shield, Layers, HelpCircle, Network } from 'lucide-react';

function LoadingSpinner({
  isVisible,
  repoData = null,
  isSummaryLoading = false,
  isQuickStartLoading = false,
  isIssuesLoading = false,
  isContributionsLoading = false,
  isArchitectureLoading = false,
  isCodeAnalysisLoading = false,
  codeAnalysis = null,
  repoUrl = '',
  isAnalyzing = false
}) {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const canvasRef = useRef(null);

  // Parse repo owner/name
  const getRepoLabel = () => {
    if (!repoUrl) return 'Repository';
    try {
      const cleanUrl = repoUrl.replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '');
      return cleanUrl;
    } catch {
      return repoUrl;
    }
  };

  // Determine stage statuses
  const getStatus = (index) => {
    if (!isVisible) return 'pending';

    switch (index) {
      case 0: // Cloning repository
        return repoData ? 'completed' : 'active';
      
      case 1: // Parsing file structure
        if (repoData) return 'completed';
        return 'pending';
      
      case 2: // Detecting architecture
        if (repoData) {
          if (isArchitectureLoading) return 'active';
          if (repoData.techStack) return 'completed';
          return 'completed';
        }
        return 'pending';
      
      case 3: // Building dependency graph
        if (codeAnalysis) return 'completed';
        if (repoData && isCodeAnalysisLoading) return 'active';
        return 'pending';
      
      case 4: // Running security analysis
        if (codeAnalysis) return 'completed';
        if (repoData && isCodeAnalysisLoading) return 'active';
        return 'pending';
      
      case 5: // Generating AI insights
        if (repoData && !isSummaryLoading && !isQuickStartLoading && !isIssuesLoading && !isContributionsLoading) {
          return 'completed';
        }
        if (repoData && (isSummaryLoading || isQuickStartLoading || isIssuesLoading || isContributionsLoading)) {
          return 'active';
        }
        return 'pending';
      
      case 6: // Preparing onboarding workspace
        if (codeAnalysis && !isAnalyzing) return 'completed';
        if (codeAnalysis && isAnalyzing) return 'active';
        return 'pending';
      
      default:
        return 'pending';
    }
  };

  const steps = [
    { label: 'Cloning repository', status: getStatus(0), icon: <Network size={16} /> },
    { label: 'Parsing file structure', status: getStatus(1), icon: <Terminal size={16} /> },
    { label: 'Detecting architecture', status: getStatus(2), icon: <Layers size={16} /> },
    { label: 'Building dependency graph', status: getStatus(3), icon: <Cpu size={16} /> },
    { label: 'Running security analysis', status: getStatus(4), icon: <Shield size={16} /> },
    { label: 'Generating AI insights', status: getStatus(5), icon: <HelpCircle size={16} /> },
    { label: 'Preparing onboarding workspace', status: getStatus(6), icon: <CheckCircle2 size={16} /> },
  ];

  // Calculate target progress percentage
  const getTargetProgress = () => {
    if (!isVisible) return 0;
    
    let completedCount = steps.filter(s => s.status === 'completed').length;
    let activeIndex = steps.findIndex(s => s.status === 'active');
    
    // Base progress from completed steps (approx 14% per step)
    let base = Math.min(95, Math.round((completedCount / steps.length) * 100));
    
    // Add sub-progress for the active step to make it feel alive
    if (activeIndex !== -1) {
      base += Math.round((1 / steps.length) * 40);
    }
    
    // If all completed and not analyzing anymore, hit 100%
    if (completedCount === steps.length || (!isAnalyzing && repoData && codeAnalysis)) {
      return 100;
    }
    
    return Math.min(98, base);
  };

  const targetProgress = getTargetProgress();

  // Smooth progress interpolation
  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev < targetProgress) {
          // Move towards target
          const diff = targetProgress - prev;
          const step = Math.max(0.2, diff * 0.08); // Easing factor
          return Math.min(targetProgress, prev + step);
        } else if (prev > targetProgress) {
          return targetProgress;
        }
        return prev;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [isVisible, targetProgress]);

  // Generate logs based on states
  useEffect(() => {
    if (!isVisible) {
      setLogs([]);
      return;
    }

    const newLogs = [];
    if (!repoData) {
      newLogs.push('Initializing cloning sequence...');
      newLogs.push('Connecting to GitHub API...');
      newLogs.push('Fetching repository commits and files...');
    } else {
      newLogs.push('✓ Repository successfully cloned.');
      newLogs.push(`✓ Identified ${repoData.fileTree?.length || 0} repository files.`);
      
      if (isArchitectureLoading) {
        newLogs.push('Running codebase heuristic scanners...');
        newLogs.push('Analyzing package files for dependencies...');
        newLogs.push('Mapping service and controller frameworks...');
      } else {
        newLogs.push('✓ Architecture mapping complete.');
        
        if (isCodeAnalysisLoading) {
          newLogs.push('Running AST syntax analyzer...');
          newLogs.push('Mapping module imports and function flow...');
          newLogs.push('Analyzing component hierarchies...');
          newLogs.push('Scanning security endpoints...');
        } else if (codeAnalysis) {
          newLogs.push('✓ Deep code dependency graph constructed.');
          newLogs.push('✓ Security scanner checks resolved.');
          
          if (isSummaryLoading || isQuickStartLoading || isIssuesLoading || isContributionsLoading) {
            newLogs.push('Synthesizing AI onboarding documentation...');
            newLogs.push('Generating quickstart environment guidelines...');
            newLogs.push('Generating code health diagnostics...');
          } else {
            newLogs.push('✓ AI Insights and Onboarding Workspace ready.');
            newLogs.push('Finalizing workspace setup...');
          }
        }
      }
    }

    // Keep only the latest 4 logs
    setLogs(newLogs.slice(-4));
  }, [isVisible, repoData, isArchitectureLoading, isCodeAnalysisLoading, codeAnalysis, isSummaryLoading, isQuickStartLoading, isIssuesLoading, isContributionsLoading]);

  // Canvas Network Animation (60 FPS)
  useEffect(() => {
    if (!isVisible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Resize canvas
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Setup network particles & nodes
    const nodeLabels = [
      { id: 'root', name: getRepoLabel().split('/').pop(), size: 28, x: 0, y: 0, color: '#4F8CFF', isRoot: true },
      { id: 'parser', name: 'AST Parser', size: 14, x: -140, y: -70, color: '#a78bfa', stage: 1 },
      { id: 'arch', name: 'Architecture', size: 14, x: 140, y: -70, color: '#10b981', stage: 2 },
      { id: 'deps', name: 'Dependencies', size: 14, x: -140, y: 70, color: '#ec4899', stage: 3 },
      { id: 'sec', name: 'Security', size: 14, x: 140, y: 70, color: '#ef4444', stage: 4 },
      { id: 'ai', name: 'AI Engine', size: 14, x: 0, y: -130, color: '#ffd700', stage: 5 },
      { id: 'workspace', name: 'Workspace', size: 14, x: 0, y: 130, color: '#00d4ff', stage: 6 }
    ];

    // Sub-particles connecting nodes
    const particles = [];
    const maxParticles = 40;

    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        source: nodeLabels[Math.floor(Math.random() * (nodeLabels.length - 1)) + 1],
        target: nodeLabels[0],
        progress: Math.random(),
        speed: 0.003 + Math.random() * 0.005,
        size: 1.5 + Math.random() * 2
      });
    }

    let angle = 0;

    const render = () => {
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Draw elegant grid background
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw subtle orbital rings
      ctx.strokeStyle = 'rgba(79, 140, 255, 0.05)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 150, 0, Math.PI * 2);
      ctx.stroke();

      angle += 0.002;

      // Draw links
      nodeLabels.forEach((node) => {
        if (node.isRoot) return;

        const currentStageStatus = getStatus(node.stage - 1);
        let strokeColor = 'rgba(255, 255, 255, 0.05)';
        let lineWidth = 1;
        
        if (currentStageStatus === 'completed') {
          strokeColor = `${node.color}35`;
          lineWidth = 1.5;
        } else if (currentStageStatus === 'active') {
          strokeColor = `${node.color}80`;
          lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = -angle * 100;
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + node.x, centerY + node.y);
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash
      });

      // Draw particles along links
      particles.forEach((p) => {
        const stageStatus = getStatus(p.source.stage - 1);
        if (stageStatus !== 'active' && stageStatus !== 'completed') return;

        p.progress += p.speed;
        if (p.progress >= 1) {
          p.progress = 0;
          p.speed = 0.003 + Math.random() * 0.005;
        }

        // Interpolate position
        const px = centerX + p.source.x * (1 - p.progress);
        const py = centerY + p.source.y * (1 - p.progress);

        ctx.fillStyle = p.source.color;
        ctx.shadowColor = p.source.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow
      });

      // Draw nodes
      nodeLabels.forEach((node) => {
        const nx = centerX + node.x;
        const ny = centerY + node.y;
        const stageStatus = node.isRoot ? 'completed' : getStatus(node.stage - 1);

        let glowSize = 0;

        if (stageStatus === 'completed') {
          glowSize = 10;
        } else if (stageStatus === 'active') {
          glowSize = 15 + Math.sin(angle * 30) * 5; // pulsing glow
        }

        // Draw node background glow
        if (glowSize > 0) {
          ctx.shadowColor = node.color;
          ctx.shadowBlur = glowSize;
        }
        
        ctx.fillStyle = node.isRoot 
          ? 'rgba(79, 140, 255, 0.15)'
          : `${node.color}${stageStatus === 'pending' ? '05' : '15'}`;
        ctx.strokeStyle = stageStatus === 'pending' 
          ? 'rgba(255, 255, 255, 0.1)' 
          : `${node.color}${stageStatus === 'active' ? 'b0' : 'ff'}`;
        ctx.lineWidth = stageStatus === 'active' ? 2 : 1.5;

        ctx.beginPath();
        ctx.arc(nx, ny, node.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.shadowBlur = 0; // Reset shadow

        // Inner core
        if (stageStatus !== 'pending') {
          ctx.fillStyle = node.color;
          ctx.beginPath();
          ctx.arc(nx, ny, node.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Text labels
        ctx.fillStyle = stageStatus === 'pending' ? 'rgba(255, 255, 255, 0.3)' : '#ffffff';
        ctx.font = node.isRoot ? '600 13px system-ui' : '500 11px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(node.name, nx, ny + node.size + 6);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, repoData, isArchitectureLoading, isCodeAnalysisLoading, codeAnalysis, isSummaryLoading, isQuickStartLoading, isIssuesLoading, isContributionsLoading, repoUrl]);

  if (!isVisible) return null;

  return (
    <div className="ca-loading-screen" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#0B0F19',
      padding: '24px',
      color: '#fff',
      fontFamily: 'Inter, system-ui, sans-serif',
      boxSizing: 'border-box',
      overflowY: 'auto'
    }}>
      {/* Top Title Section */}
      <div style={{
        textAlign: 'center',
        marginBottom: '32px',
        animation: 'fadeIn 0.6s ease'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(79, 140, 255, 0.1)',
          border: '1px solid rgba(79, 140, 255, 0.2)',
          padding: '6px 14px',
          borderRadius: '100px',
          fontSize: '12px',
          fontWeight: '600',
          color: '#4F8CFF',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: '16px'
        }}>
          <Loader2 size={12} className="ca-spin" />
          CodeAtlas Intelligence Engine
        </div>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          margin: '0 0 8px 0',
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Analyzing Repository
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#64748b',
          margin: 0
        }}>
          Scanning <code style={{
            color: '#a78bfa',
            fontFamily: 'monospace',
            background: 'rgba(255,255,255,0.05)',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>{getRepoLabel()}</code>. This may take a moment...
        </p>
      </div>

      {/* Grid Layout: Checklist & Graph Container */}
      <div className="ca-loading-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px',
        width: '100%',
        maxWidth: '960px',
        marginBottom: '24px',
        animation: 'fadeIn 0.8s ease'
      }}>
        {/* Left Side: Checklist */}
        <div style={{
          background: 'rgba(17, 24, 39, 0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              paddingBottom: '12px'
            }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pipeline Execution
              </span>
              <span style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#4F8CFF',
                fontFamily: 'monospace'
              }}>
                {Math.round(progress)}%
              </span>
            </div>

            {/* Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {steps.map((step, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  opacity: step.status === 'pending' ? 0.85 : 1,
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {step.status === 'completed' && (
                      <CheckCircle2 size={18} style={{ color: '#10b981', fill: 'rgba(16, 185, 129, 0.1)' }} />
                    )}
                    {step.status === 'active' && (
                      <Loader2 size={18} style={{ color: '#4F8CFF' }} className="ca-spin" />
                    )}
                    {step.status === 'pending' && (
                      <Circle size={18} style={{ color: '#475569' }} />
                    )}
                  </div>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: step.status === 'active' ? '600' : '500',
                    color: step.status === 'completed' ? '#f8fafc' : step.status === 'active' ? '#4F8CFF' : '#94a3b8',
                    transition: 'all 0.3s ease'
                  }}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Terminal Console Logs */}
          <div style={{
            marginTop: '24px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '12px 16px',
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#64748b',
            minHeight: '80px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: '4px'
          }}>
            {logs.map((log, idx) => (
              <div key={idx} style={{
                color: log.startsWith('✓') ? '#10b981' : '#38bdf8',
                opacity: idx === logs.length - 1 ? 1 : 0.6,
                transition: 'all 0.3s ease'
              }}>
                {log.startsWith('✓') ? '' : '> '}{log}
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Flow Graph Visualizer */}
        <div style={{
          background: 'rgba(17, 24, 39, 0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          minHeight: '380px',
          overflow: 'hidden'
        }}>
          {/* Header overlay for the visualization */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '24px',
            zIndex: 2,
            fontSize: '11px',
            fontWeight: '600',
            color: '#64748b',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#4F8CFF', animation: 'ca-pulse 1.5s infinite' }}></span>
            Live Intelligence Mapping
          </div>

          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '340px'
            }}
          />
        </div>
      </div>

      {/* Progress Bar Footer */}
      <div style={{
        width: '100%',
        maxWidth: '960px',
        animation: 'fadeIn 1s ease'
      }}>
        <div style={{
          width: '100%',
          height: '6px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.03)'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #4F8CFF 0%, #7A5CFF 50%, #00d4ff 100%)',
            borderRadius: '10px',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}></div>
        </div>
      </div>

      {/* Embedded CSS Animations */}
      <style>{`
        .ca-spin {
          animation: ca-spin-keyframes 1.5s linear infinite;
        }
        @keyframes ca-spin-keyframes {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ca-pulse {
          0% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.6; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default LoadingSpinner;
