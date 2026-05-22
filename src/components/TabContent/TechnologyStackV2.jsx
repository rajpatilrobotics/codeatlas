import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, { Controls, MiniMap, Background, Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';

// TechnologyStackV2: builds a data-driven tech stack diagram from repoData
export default function TechnologyStackV2({ repoData }) {
  const wrapperRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver((entries) => {
      const w = entries?.[0]?.contentRect?.width;
      if (typeof w === 'number' && w > 0) setContainerWidth(w);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const techStack = useMemo(() => repoData?.techStack || {}, [repoData?.techStack]);
  const packageJson = useMemo(() => repoData?.packageJson || null, [repoData?.packageJson]);
  const pkgDeps = useMemo(() => Object.keys(packageJson?.dependencies || {}), [packageJson?.dependencies]);
  const pkgDev = useMemo(() => Object.keys(packageJson?.devDependencies || {}), [packageJson?.devDependencies]);

  const categoryLabels = useMemo(() => ({
    frontend: 'Frontend',
    backend: 'Backend',
    database: 'Databases',
    orm: 'ORM / Data Layer',
    cache: 'Cache',
    messageQueue: 'Messaging / Queues',
    authentication: 'Authentication',
    testing: 'Testing',
    devops: 'DevOps',
    dependencies: 'Dependencies'
  }), []);

  const categories = useMemo(() => {
    const keys = Object.keys(techStack || {}).filter((k) => Array.isArray(techStack[k]) && techStack[k].length > 0);
    const ordered = [
      'frontend',
      'backend',
      'database',
      'orm',
      'cache',
      'messageQueue',
      'authentication',
      'testing',
      'devops'
    ].filter((k) => keys.includes(k));
    const extras = keys.filter((k) => !ordered.includes(k));
    return [...ordered, ...extras, 'dependencies'];
  }, [techStack]);

  const nodeTypes = useMemo(() => ({
    techStackCluster: memo(function TechStackCluster({ data, selected }) {
      return (
        <div className={`arch-v2-cluster ${selected ? 'selected' : ''} arch-v2-techstack-cluster`}>
          <Handle type="target" position={Position.Left} className="arch-v2-handle" />
          <div className="arch-v2-cluster-orbit" />
          <div>
            <div className="arch-v2-cluster-eyebrow">Category</div>
            <div className="arch-v2-cluster-title">{data.label}</div>
            <div className="arch-v2-cluster-subtitle">{data.count || 0} items</div>
          </div>
          <Handle type="source" position={Position.Right} className="arch-v2-handle" />
        </div>
      );
    }),
    techStackItem: memo(function TechStackItem({ data, selected }) {
      return (
        <div className={`arch-v2-node ${selected ? 'selected' : ''} arch-v2-techstack-item`}>
          <Handle type="target" position={Position.Left} className="arch-v2-handle" />
          <div className="arch-v2-node-title" title={data.label}>{data.label}</div>
          {data.meta && <div className="arch-v2-node-path" title={data.meta}>{data.meta}</div>}
          <Handle type="source" position={Position.Right} className="arch-v2-handle" />
        </div>
      );
    })
  }), []);

  const { nodes, edges } = useMemo(() => {
    const nodes = [];
    const edges = [];

    const safeWidth = Math.max(820, containerWidth || 0);
    const clusterX = 36;
    const firstItemX = 340;
    const itemWidth = 220;
    const itemHeight = 110;
    const gutterX = 18;
    const gutterY = 14;
    const available = Math.max(1, safeWidth - firstItemX - 40);
    const cols = Math.max(2, Math.min(7, Math.floor(available / (itemWidth + gutterX))));

    let y = 34;

    categories.forEach((key) => {
      let items = Array.isArray(techStack[key]) ? techStack[key] : [];
      if (key === 'dependencies') items = [...pkgDeps, ...pkgDev];
      items = Array.from(new Set(items.filter(Boolean).map(String)));
      if (items.length === 0) return;

      const label = categoryLabels[key] || key;
      const clusterId = `tech-${key}`;
      nodes.push({
        id: clusterId,
        type: 'techStackCluster',
        data: { label, count: items.length },
        position: { x: clusterX, y }
      });

      const shown = items.slice(0, key === 'dependencies' ? 72 : 36);
      shown.forEach((t, i) => {
        const id = `${clusterId}-item-${i}`;
        const col = i % cols;
        const row = Math.floor(i / cols);
        nodes.push({
          id,
          type: 'techStackItem',
          data: { label: t, meta: key === 'dependencies' ? 'package' : undefined },
          position: {
            x: firstItemX + col * (itemWidth + gutterX),
            y: y + row * (itemHeight + gutterY)
          }
        });
        edges.push({
          id: `e-${clusterId}-${i}`,
          source: clusterId,
          target: id,
          animated: false,
          type: 'smoothstep',
          style: { stroke: 'rgba(255,255,255,0.22)', strokeWidth: 1 },
        });
      });

      const rows = Math.ceil(shown.length / cols);
      y += Math.max(190, rows * (itemHeight + gutterY) + 32);
    });

    return { nodes, edges };
  }, [techStack, pkgDeps, pkgDev, categories, categoryLabels, containerWidth]);

  return (
    <div ref={wrapperRef} style={{ height: '100%', width: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.14, includeHiddenNodes: false }}
        minZoom={0.08}
        maxZoom={1.8}
        proOptions={{ hideAttribution: false }}
      >
        <Background color="rgba(255,255,255,0.03)" gap={22} size={1} />
        <Controls />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(0,0,0,0.6)"
          nodeColor={() => 'rgba(255,255,255,0.8)'}
        />
      </ReactFlow>
    </div>
  );
}
