import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Layout
import Layout from './components/layout/Layout';

// Features
import CommandPalette from './components/features/CommandPalette';

// Pages
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Architecture from './pages/Architecture';
import Summary from './pages/Summary';
import SecurityScanner from './pages/SecurityScanner';
import Documentation from './pages/Documentation';
import OnboardingGuide from './pages/OnboardingGuide';
import RepositoryGraph from './pages/RepositoryGraph';
import BlastRadius from './pages/BlastRadius';
import Planner from './pages/Planner';
import DebugNavigator from './pages/DebugNavigator';
import Heatmap from './pages/Heatmap';
import Workspaces from './pages/Workspaces';

// 404 Page Component
const NotFound = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: 'var(--spacing-4)',
    textAlign: 'center'
  }}>
    <div style={{ fontSize: '72px' }}>404</div>
    <h1 style={{ 
      fontSize: 'var(--font-size-2xl)', 
      color: 'var(--text-primary)',
      margin: 0 
    }}>
      Page Not Found
    </h1>
    <p style={{ 
      fontSize: 'var(--font-size-base)', 
      color: 'var(--text-secondary)',
      margin: 0 
    }}>
      The page you're looking for doesn't exist.
    </p>
    <a 
      href="/" 
      style={{
        marginTop: 'var(--spacing-4)',
        padding: '10px 20px',
        background: 'var(--accent-cyan)',
        color: 'var(--bg-primary)',
        borderRadius: 'var(--radius-md)',
        textDecoration: 'none',
        fontWeight: 'var(--font-weight-medium)'
      }}
    >
      Go Home
    </a>
  </div>
);

function App() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global keyboard shortcut for Command Palette (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Router>
      {/* Command Palette - Global */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      <Routes>
        {/* Landing Page (No Layout) */}
        <Route path="/" element={<Landing />} />
        
        {/* App Routes (With Layout) */}
        <Route element={<Layout />}>
          {/* Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Overview Section */}
          <Route path="/architecture" element={<Architecture />} />
          <Route path="/summary" element={<Summary />} />
          
          {/* Intelligence Section */}
          <Route path="/repository-graph" element={<RepositoryGraph />} />
          <Route path="/blast-radius" element={<BlastRadius />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/debug-navigator" element={<DebugNavigator />} />
          <Route path="/heatmap" element={<Heatmap />} />
          
          {/* Security Section */}
          <Route path="/security" element={<SecurityScanner />} />
          
          {/* AI Workspace Section */}
          <Route path="/chat" element={<Chat />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/onboarding" element={<OnboardingGuide />} />
          
          {/* Workspaces Section */}
          <Route path="/workspaces" element={<Workspaces />} />
        </Route>
        
        {/* 404 Page */}
        <Route path="/404" element={<Layout><NotFound /></Layout>} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

// Made with Bob