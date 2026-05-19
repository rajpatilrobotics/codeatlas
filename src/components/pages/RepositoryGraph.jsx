import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import Card from '../ui/Card';
import ComingSoon from '../ui/ComingSoon';

const MOCK_NODES = [
  { id: '1', position: { x: 250, y: 0 }, data: { label: 'API Gateway' }, style: { background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, padding: 10 } },
  { id: '2', position: { x: 100, y: 120 }, data: { label: 'Auth Service' }, style: { background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, padding: 10 } },
  { id: '3', position: { x: 400, y: 120 }, data: { label: 'User Service' }, style: { background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, padding: 10 } },
  { id: '4', position: { x: 250, y: 240 }, data: { label: 'Database' }, style: { background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, padding: 10 } },
  { id: '5', position: { x: 100, y: 360 }, data: { label: 'Cache' }, style: { background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, padding: 10 } },
];

const MOCK_EDGES = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#00d1ff' } },
  { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: '#00d1ff' } },
  { id: 'e2-4', source: '2', target: '4' },
  { id: 'e3-4', source: '3', target: '4' },
  { id: 'e4-5', source: '4', target: '5' },
];

function RepositoryGraph({ onOpenArchitecture }) {
  const nodes = useMemo(() => MOCK_NODES, []);
  const edges = useMemo(() => MOCK_EDGES, []);

  return (
    <ComingSoon>
      <Card title="Repository Dependency Graph">
        <p className="ca-page-desc">
          Sample visualization of module relationships. Full graph integration coming soon.
        </p>
        <div className="ca-graph-container" style={{ height: 420 }}>
          <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
            <Background color="#333" gap={16} />
            <Controls />
            <MiniMap nodeColor="#00d1ff" maskColor="rgba(0,0,0,0.8)" />
          </ReactFlow>
        </div>
        {onOpenArchitecture && (
          <button type="button" className="ca-cta-link" onClick={onOpenArchitecture}>
            View full Architecture diagrams →
          </button>
        )}
      </Card>
    </ComingSoon>
  );
}

export default RepositoryGraph;
