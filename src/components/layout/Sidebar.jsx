import React from 'react';
import { NAV_SECTIONS } from '../../config/navigation';

function Sidebar({ activeTab, onNavigate, onLogoClick, isOpen, onClose }) {
  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <header className="sidebar-header">
          <button type="button" className="sidebar-brand" onClick={onLogoClick} title="Return to home">
            <div className="sidebar-logo" aria-hidden="true" />
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">CodeAtlas</span>
              <span className="sidebar-brand-tagline">Understand Systems. Predict Impact.</span>
            </div>
          </button>
        </header>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {NAV_SECTIONS.map((section) => (
            <div key={section.id} className="sidebar-section">
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                    onClick={() => {
                      onNavigate(item.id);
                      onClose?.();
                    }}
                    aria-current={activeTab === item.id ? 'page' : undefined}
                  >
                    <Icon size={18} className="sidebar-item-icon" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
