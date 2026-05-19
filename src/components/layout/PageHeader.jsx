import React from 'react';
import { getNavItem } from '../../config/navigation';

function PageHeader({ tabId }) {
  const item = getNavItem(tabId);

  return (
    <header className="page-header">
      <h1 className="page-header-title">{item.label}</h1>
      {item.subtitle && <p className="page-header-subtitle">{item.subtitle}</p>}
    </header>
  );
}

export default PageHeader;
