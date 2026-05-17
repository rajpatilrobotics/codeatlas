'use client';
/**
 * Layout Component
 * Main application layout wrapper
 * Combines Sidebar, Topbar, and MainWorkspace
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MainWorkspace from './MainWorkspace';
import './Layout.css';

const Layout = ({ rightPanel }) => {
  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-main">
        <Topbar />
        <main className="layout-content">
          <MainWorkspace rightPanel={rightPanel}>
            <Outlet />
          </MainWorkspace>
        </main>
      </div>
    </div>
  );
};

export default Layout;

// Made with Bob
