'use client';

/**
 * Sidebar Component
 * Main navigation for CodeAtlas V2
 * Flat structure with section labels
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { useActiveRepo } from '@/hooks/useActiveRepo';
import './Sidebar.css';

function SidebarLink({ path, label, icon, badge, isActive, repoId }) {
  const href = repoId
    ? `${path}${path.includes('?') ? '&' : '?'}repoId=${encodeURIComponent(repoId)}`
    : path;
  return (
    <Link
      href={href}
      className={`sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
    >
      <span className="sidebar-item-icon">{icon}</span>
      <span className="sidebar-item-label">{label}</span>
      {badge && <span className="sidebar-item-badge">{badge}</span>}
    </Link>
  );
}

function SidebarInner() {
  const pathname = usePathname();
  const { repoId } = useActiveRepo();

  const isActive = (path) => pathname === path;

  const navigation = [
    {
      id: 'overview',
      label: 'OVERVIEW',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: '◆' },
        { path: '/dashboard/summary', label: 'Summary', icon: '◇' },
        { path: '/dashboard/architecture', label: 'Architecture', icon: '◈' },
      ]
    },
    {
      id: 'intelligence',
      label: 'INTELLIGENCE',
      items: [
        { path: '/dashboard/repository-graph', label: 'Repository Graph', icon: '◉' },
        { path: '/dashboard/blast-radius', label: 'Blast Radius', icon: '◎' },
        { path: '/dashboard/planner', label: 'Planner', icon: '◐' },
        { path: '/dashboard/debug', label: 'Debug Navigator', icon: '◑' },
        { path: '/dashboard/heatmap', label: 'Heatmap', icon: '◒' },
      ]
    },
    {
      id: 'security',
      label: 'SECURITY',
      items: [
        { path: '/dashboard/security', label: 'Security Scanner', icon: '◓' },
      ]
    },
    {
      id: 'ai-workspace',
      label: 'AI WORKSPACE',
      items: [
        { path: '/dashboard/chat', label: 'Chat', icon: '◔' },
        { path: '/dashboard/documentation', label: 'Documentation', icon: '◕' },
        { path: '/dashboard/onboarding', label: 'Onboarding', icon: '◖' },
      ]
    },
    {
      id: 'workspaces',
      label: 'WORKSPACES',
      items: [
        { path: '/dashboard/workspaces', label: 'Saved Workspaces', icon: '◗' },
      ]
    }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link href="/" className="sidebar-logo">
          <div className="sidebar-logo-icon">CA</div>
          <span className="sidebar-logo-text">CodeAtlas</span>
        </Link>
      </div>

      <nav className="sidebar-nav">
        {navigation.map((section) => (
          <div key={section.id} className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="sidebar-section-label">{section.label}</span>
            </div>

            <div className="sidebar-section-items">
              {section.items.map((item) => (
                <SidebarLink
                  key={item.path}
                  path={item.path}
                  label={item.label}
                  icon={item.icon}
                  badge={item.badge}
                  isActive={isActive(item.path)}
                  repoId={repoId}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <Link href="/" className="sidebar-footer-item">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 2V14M2 8H14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span>New Analysis</span>
        </Link>

        <div className="sidebar-footer-divider" />

        <Link href="/dashboard" className="sidebar-footer-item">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5V8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>Recent</span>
        </Link>
      </div>
    </aside>
  );
}

const Sidebar = () => (
  <Suspense fallback={null}>
    <SidebarInner />
  </Suspense>
);

export default Sidebar;
