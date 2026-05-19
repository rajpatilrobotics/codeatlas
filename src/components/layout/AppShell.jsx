import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandCenter from '../command/CommandCenter';

function AppShell({
  children,
  activeTab,
  onNavigate,
  onLogoClick,
  repoLabel,
  repoUrl,
  recentRepos,
  isAnalyzing,
  lastAnalyzedRepoUrl,
  onSelectRecentRepo,
  onAnalyze,
  onClearRecentRepos,
  onNewAnalysis,
  onDownloadPDF,
  isGeneratingPDF,
  pdfProgress,
  repoData,
  codeAnalysis,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const openCommandCenter = useCallback(() => setCommandOpen(true), []);
  const closeCommandCenter = useCallback(() => setCommandOpen(false), []);

  useEffect(() => {
    const onGlobalKeyDown = (e) => {
      const isK = e.key === 'k' || e.key === 'K';
      const meta = e.metaKey || e.ctrlKey;
      if (meta && isK) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        onNavigate={onNavigate}
        onLogoClick={onLogoClick}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="app-shell-main">
        <TopBar
          repoLabel={repoLabel}
          repoUrl={repoUrl}
          recentRepos={recentRepos}
          isAnalyzing={isAnalyzing}
          lastAnalyzedRepoUrl={lastAnalyzedRepoUrl}
          onMenuClick={() => setSidebarOpen(true)}
          onOpenCommandCenter={openCommandCenter}
          onNewAnalysis={onNewAnalysis}
          onDownloadPDF={onDownloadPDF}
          onSelectRecentRepo={onSelectRecentRepo}
          onAnalyze={onAnalyze}
          onClearRecentRepos={onClearRecentRepos}
          isGeneratingPDF={isGeneratingPDF}
          pdfProgress={pdfProgress}
        />
        <main className="app-shell-content">
          <div className="app-shell-content-inner">{children}</div>
        </main>
      </div>

      <CommandCenter
        isOpen={commandOpen}
        onClose={closeCommandCenter}
        onNavigate={onNavigate}
        onNewAnalysis={onNewAnalysis}
        repoData={repoData}
        codeAnalysis={codeAnalysis}
      />
    </div>
  );
}

export default AppShell;
