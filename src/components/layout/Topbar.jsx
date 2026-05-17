'use client';

/**
 * Topbar Component
 * Global header with search, actions, and user menu
 */

import React from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Dropdown, { DropdownItem, DropdownSeparator } from '../ui/Dropdown';
import './Topbar.css';

const Topbar = () => {
  const handleSearch = (e) => {
    e.preventDefault();
    // Command palette will handle this
    console.log('Search triggered');
  };

  return (
    <header className="topbar">
      {/* Left: Breadcrumb */}
      <div className="topbar-left">
        <nav className="topbar-breadcrumb">
          <span className="topbar-breadcrumb-item">CodeAtlas</span>
          <span className="topbar-breadcrumb-separator">/</span>
          <span className="topbar-breadcrumb-item topbar-breadcrumb-current">Dashboard</span>
        </nav>
      </div>

      {/* Center: Search */}
      <div className="topbar-center">
        <form onSubmit={handleSearch} className="topbar-search">
          <Input
            type="search"
            placeholder="Search or jump to... (⌘K)"
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            }
          />
        </form>
      </div>

      {/* Right: Actions */}
      <div className="topbar-right">
        {/* LLM Selector */}
        <Dropdown
          trigger={
            <Button variant="ghost" size="sm">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path 
                  d="M8 2L10 6H14L11 9L12 13L8 10L4 13L5 9L2 6H6L8 2Z" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinejoin="round"
                />
              </svg>
              <span>Watsonx</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path 
                  d="M3 4.5L6 7.5L9 4.5" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          }
          align="right"
        >
          <DropdownItem icon="⚡">Watsonx</DropdownItem>
          <DropdownItem icon="🤖">OpenAI GPT-4</DropdownItem>
          <DropdownItem icon="🧠">Claude 3</DropdownItem>
          <DropdownItem icon="✨">Gemini Pro</DropdownItem>
        </Dropdown>

        {/* Notifications */}
        <button className="topbar-icon-button" title="Notifications">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path 
              d="M10 2C7.5 2 5.5 4 5.5 6.5V10L3.5 12V13H16.5V12L14.5 10V6.5C14.5 4 12.5 2 10 2Z" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinejoin="round"
            />
            <path 
              d="M8.5 13V14C8.5 15.1 9.4 16 10.5 16C11.6 16 12.5 15.1 12.5 14V13" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round"
            />
          </svg>
          <span className="topbar-notification-badge">3</span>
        </button>

        {/* Settings */}
        <button className="topbar-icon-button" title="Settings">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
            <path 
              d="M10 2V4M10 16V18M18 10H16M4 10H2M15.5 4.5L14 6M6 14L4.5 15.5M15.5 15.5L14 14M6 6L4.5 4.5" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* User Menu */}
        <Dropdown
          trigger={
            <button className="topbar-user-button">
              <div className="topbar-user-avatar">U</div>
            </button>
          }
          align="right"
        >
          <DropdownItem icon="👤">Profile</DropdownItem>
          <DropdownItem icon="⚙️">Settings</DropdownItem>
          <DropdownItem icon="📚">Documentation</DropdownItem>
          <DropdownSeparator />
          <DropdownItem icon="🚪" variant="danger">Sign Out</DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
};

export default Topbar;

// Made with Bob
