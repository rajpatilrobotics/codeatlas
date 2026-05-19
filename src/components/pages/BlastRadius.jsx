import React from 'react';
import { Target } from 'lucide-react';
import Card from '../ui/Card';
import ComingSoon from '../ui/ComingSoon';
import EmptyState from '../ui/EmptyState';

function BlastRadius() {
  return (
    <ComingSoon>
      <Card title="Blast Radius Analysis">
        <EmptyState
          icon={Target}
          title="Impact visualization"
          description="See how changes propagate across modules, services, and dependencies. Connect your repository for live blast radius mapping."
        />
        <div className="ca-blast-mock">
          <div className="ca-blast-center">auth/middleware.ts</div>
          <div className="ca-blast-ring ca-blast-ring-1">
            <span>API</span>
            <span>Session</span>
            <span>Routes</span>
          </div>
          <div className="ca-blast-ring ca-blast-ring-2">
            <span>User Service</span>
            <span>Gateway</span>
            <span>Cache</span>
            <span>DB Pool</span>
          </div>
        </div>
      </Card>
    </ComingSoon>
  );
}

export default BlastRadius;
