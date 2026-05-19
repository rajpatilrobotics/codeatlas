/**
 * Build Graph Data
 * Builds ReactFlow-compatible graph data from repository structure
 */

/**
 * Build nodes from file structure
 */
export function buildNodes(fileStructure, dependencies = []) {
  if (!fileStructure || !Array.isArray(fileStructure)) {
    return [];
  }

  const nodes = [];
  const nodeMap = new Map();

  fileStructure.forEach((file, index) => {
    const path = file.path || file;
    const parts = path.split('/');
    const name = parts[parts.length - 1];
    const extension = name.split('.').pop();
    
    // Determine node type based on extension and path
    let type = 'file';
    if (path.includes('components')) type = 'component';
    else if (path.includes('pages')) type = 'page';
    else if (path.includes('services') || path.includes('api')) type = 'service';
    else if (path.includes('utils') || path.includes('helpers')) type = 'utility';
    else if (path.includes('hooks')) type = 'hook';
    else if (path.includes('context')) type = 'context';
    else if (extension === 'css' || extension === 'scss' || extension === 'sass') type = 'style';
    else if (extension === 'json') type = 'config';
    else if (extension === 'md') type = 'documentation';

    const nodeId = `node-${index}`;
    
    nodes.push({
      id: nodeId,
      data: {
        label: name,
        path: path,
        type: type,
        size: file.size || 0
      },
      position: {
        x: (index % 5) * 200,
        y: Math.floor(index / 5) * 100
      },
      type: type === 'component' ? 'custom' : 'default'
    });

    nodeMap.set(path, nodeId);
  });

  // Add dependency nodes
  dependencies.forEach((dep, index) => {
    const depId = `dep-${index}`;
    nodes.push({
      id: depId,
      data: {
        label: dep.name,
        version: dep.version,
        type: 'dependency'
      },
      position: {
        x: 1200 + (index % 3) * 150,
        y: Math.floor(index / 3) * 100
      },
      type: 'dependency'
    });
  });

  return { nodes, nodeMap };
}

/**
 * Build edges from import relationships
 */
export function buildEdges(fileStructure, imports, nodeMap) {
  if (!imports || !nodeMap) {
    return [];
  }

  const edges = [];
  const edgeSet = new Set();

  imports.forEach(imp => {
    const { source } = imp;
    
    // Find source node
    const sourceNode = nodeMap.get(source);
    
    if (sourceNode) {
      // Create edge from file to dependency
      const edgeId = `edge-${sourceNode}-${source}`;
      if (!edgeSet.has(edgeId)) {
        edges.push({
          id: edgeId,
          source: sourceNode,
          target: `dep-${source.replace(/[^a-zA-Z0-9]/g, '')}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#888' }
        });
        edgeSet.add(edgeId);
      }
    }
  });

  return edges;
}

/**
 * Build complete graph data for ReactFlow
 */
export function buildGraphData(fileStructure, dependencies = [], imports = []) {
  const { nodes, nodeMap } = buildNodes(fileStructure, dependencies);
  const edges = buildEdges(fileStructure, imports, nodeMap);

  return {
    nodes,
    edges,
    nodeMap
  };
}

/**
 * Build simplified graph for large repositories
 */
export function buildSimplifiedGraph(fileStructure, maxNodes = 50) {
  if (!fileStructure || !Array.isArray(fileStructure)) {
    return { nodes: [], edges: [] };
  }

  // Filter to important files only
  const importantFiles = fileStructure
    .filter(f => {
      const path = f.path || f;
      return (
        path.includes('components') ||
        path.includes('pages') ||
        path.includes('services') ||
        path.includes('App') ||
        path.includes('index')
      );
    })
    .slice(0, maxNodes);

  const { nodes, nodeMap } = buildNodes(importantFiles);

  // Create edges based on directory structure
  const edges = [];
  const pathMap = new Map();

  importantFiles.forEach((file, index) => {
    const path = file.path || file;
    const parts = path.split('/');
    
    if (parts.length > 1) {
      const parentPath = parts.slice(0, -1).join('/');
      const parentNode = nodeMap.get(parentPath);
      const currentNode = nodeMap.get(path);

      if (parentNode && currentNode) {
        const edgeId = `edge-${parentNode}-${currentNode}`;
        if (!pathMap.has(edgeId)) {
          edges.push({
            id: edgeId,
            source: parentNode,
            target: currentNode,
            type: 'smoothstep'
          });
          pathMap.set(edgeId, true);
        }
      }
    }
  });

  return { nodes, edges };
}

/**
 * Calculate graph statistics
 */
export function calculateGraphStats(nodes, edges) {
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    componentCount: nodes.filter(n => n.data.type === 'component').length,
    serviceCount: nodes.filter(n => n.data.type === 'service').length,
    pageCount: nodes.filter(n => n.data.type === 'page').length,
    dependencyCount: nodes.filter(n => n.data.type === 'dependency').length
  };
}

export default {
  buildNodes,
  buildEdges,
  buildGraphData,
  buildSimplifiedGraph,
  calculateGraphStats
};
