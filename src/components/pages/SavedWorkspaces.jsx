import React from 'react';
import { FolderOpen } from 'lucide-react';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';

function SavedWorkspaces() {
  return (
    <Card>
      <EmptyState
        icon={FolderOpen}
        title="No saved workspaces yet"
        description="Save your current repository analysis to quickly return to this session later."
        action={
          <button type="button" className="sidebar-action-btn" disabled title="Coming soon">
            Save current analysis
          </button>
        }
      />
    </Card>
  );
}

export default SavedWorkspaces;
