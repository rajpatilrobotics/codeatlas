# Future-Ready Dependency Graph Structure

## Design Philosophy

The dependency graph structure is designed as a **stable foundation** for future graph intelligence features while implementing only basic dependency visualization now.

## Core Structure (Extensible Design)

```javascript
{
  // ============================================
  // CORE GRAPH DATA (Implemented Now)
  // ============================================
  
  nodes: [
    {
      id: 'file:src/App.jsx',
      path: 'src/App.jsx',
      name: 'App.jsx',
      type: 'file',
      layer: 'entry',
      
      // Current metrics (implemented)
      importCount: 8,        // files this imports
      dependentCount: 0,     // files that import this
      isHub: false,
      importance: 95,
      
      // Future-ready fields (null for now, populated later)
      centrality: null,      // for PageRank/betweenness centrality
      community: null,       // for community detection algorithms
      blastRadius: null,     // for impact analysis (BFS depth)
      changeFrequency: null, // for heatmap visualization
      riskScore: null        // for danger zone detection
    }
  ],
  
  edges: [
    {
      id: 'edge:src/App.jsx->src/components/Header.jsx',
      source: 'file:src/App.jsx',
      target: 'file:src/components/Header.jsx',
      strength: 3,           // imported 3 times
      importType: 'es6',     // 'es6' | 'commonjs' | 'dynamic'
      relationship: 'imports',
      
      // Future-ready fields
      weight: 3,             // normalized weight for algorithms
      bidirectional: false   // for circular dependency detection
    }
  ],
  
  // ============================================
  // BIDIRECTIONAL LOOKUP MAPS (Implemented Now)
  // ============================================
  
  // Forward lookup: file -> files it imports
  importsMap: {
    'src/App.jsx': [
      'src/components/Header.jsx',
      'src/services/api.js'
    ]
  },
  
  // Reverse lookup: file -> files that import it
  dependentsMap: {
    'src/components/Header.jsx': [
      'src/App.jsx',
      'src/pages/Home.jsx'
    ]
  },
  
  // ============================================
  // ADJACENCY LIST (Implemented Now)
  // Optimized for graph traversal algorithms
  // ============================================
  
  adjacencyList: {
    'src/App.jsx': {
      outgoing: ['src/components/Header.jsx', 'src/services/api.js'],
      incoming: [],
      outDegree: 2,   // number of files this imports
      inDegree: 0     // number of files that import this
    },
    'src/components/Header.jsx': {
      outgoing: ['src/utils/helpers.js'],
      incoming: ['src/App.jsx', 'src/pages/Home.jsx'],
      outDegree: 1,
      inDegree: 2
    }
  },
  
  // ============================================
  // METRICS (Partially Implemented)
  // ============================================
  
  metrics: {
    // Current metrics (implemented now)
    totalFiles: 147,
    totalEdges: 423,
    avgDependencies: 2.9,
    hubNodes: 8,
    isolatedNodes: 3,
    
    // Future metrics (null for now)
    maxBlastRadius: null,
    avgCentrality: null,
    circularDependencies: null,
    communityCount: null,
    criticalPathLength: null
  },
  
  // ============================================
  // ANALYSIS RESULTS (Empty Now, Populated Later)
  // ============================================
  
  analysis: {
    // Hub detection (future)
    hubs: [],  // [{ file, score, dependents }]
    
    // Danger zone analysis (future)
    dangerZones: [],  // [{ file, riskScore, reasons }]
    
    // Community clustering (future)
    communities: [],  // [{ id, files, connections }]
    
    // Circular dependency detection (future)
    circularPaths: [],  // [{ path: [files], length }]
    
    // Critical path analysis (future)
    criticalPaths: []  // [{ from, to, path, impact }]
  },
  
  // ============================================
  // METADATA (Implemented Now)
  // ============================================
  
  metadata: {
    generatedAt: '2026-05-22T08:00:00Z',
    version: '1.0.0',
    fileCount: 147,
    analysisLevel: 'basic',  // 'basic' | 'advanced' | 'full'
    
    // Future: for incremental hashing
    fileHashes: null,
    lastModified: null,
    cacheKey: null
  }
}
```

## Design Principles

### 1. Bidirectional Access (O(1) Lookup)

**Why:** Enable fast forward and reverse traversal

```javascript
// Forward: What does this file import?
const imports = graph.importsMap['src/App.jsx'];

// Reverse: What files import this?
const dependents = graph.dependentsMap['src/components/Header.jsx'];
```

**Future Use Cases:**
- Blast radius: Find all files affected by a change (BFS from dependentsMap)
- Impact analysis: Trace dependency chains
- Circular detection: Check if A imports B and B imports A

### 2. Adjacency List (Graph Algorithm Ready)

**Why:** Standard format for BFS, DFS, and graph algorithms

```javascript
const node = graph.adjacencyList['src/App.jsx'];
// node.outgoing: files this imports
// node.incoming: files that import this
// node.outDegree: count of imports
// node.inDegree: count of dependents
```

**Future Use Cases:**
- BFS traversal for blast radius
- DFS for circular dependency detection
- Degree centrality calculation
- Community detection algorithms

### 3. Extensible Node Properties

**Current:** Basic metrics (importCount, dependentCount, isHub)
**Future:** Advanced metrics without refactoring

```javascript
// Future enhancement (no structure change needed)
node.centrality = calculatePageRank(graph);
node.blastRadius = calculateBlastRadius(node, graph);
node.riskScore = calculateRiskScore(node, graph);
node.community = detectCommunity(node, graph);
```

### 4. Extensible Edge Properties

**Current:** Strength and type
**Future:** Advanced edge analysis

```javascript
// Future enhancement
edge.weight = normalizeWeight(edge.strength);
edge.bidirectional = checkBidirectional(edge, graph);
edge.criticality = calculateCriticality(edge, graph);
```

### 5. Analysis Section (Placeholder)

**Current:** Empty arrays
**Future:** Populated by analysis algorithms

```javascript
// Future: Hub detection
graph.analysis.hubs = detectHubs(graph, { threshold: 5 });

// Future: Danger zones
graph.analysis.dangerZones = analyzeDangerZones(graph);

// Future: Circular dependencies
graph.analysis.circularPaths = detectCircularDependencies(graph);
```

## Future Algorithm Integration

### Blast Radius Traversal (Future)

```javascript
function calculateBlastRadius(startFile, graph, maxDepth = 10) {
  const visited = new Set();
  const queue = [{ file: startFile, depth: 0 }];
  const affected = [];
  
  while (queue.length > 0) {
    const { file, depth } = queue.shift();
    if (visited.has(file) || depth > maxDepth) continue;
    
    visited.add(file);
    affected.push({ file, depth });
    
    // Use dependentsMap for reverse traversal
    const dependents = graph.dependentsMap[file] || [];
    dependents.forEach(dep => {
      queue.push({ file: dep, depth: depth + 1 });
    });
  }
  
  return affected;
}
```

### Hub Detection (Future)

```javascript
function detectHubs(graph, options = {}) {
  const threshold = options.threshold || 5;
  
  return graph.nodes
    .filter(node => node.dependentCount >= threshold)
    .map(node => ({
      file: node.path,
      score: node.dependentCount,
      dependents: graph.dependentsMap[node.path] || []
    }))
    .sort((a, b) => b.score - a.score);
}
```

### Centrality Analysis (Future)

```javascript
function calculateCentrality(graph) {
  // Use adjacencyList for efficient traversal
  const centrality = {};
  
  graph.nodes.forEach(node => {
    const adj = graph.adjacencyList[node.path];
    // Degree centrality = (inDegree + outDegree) / (totalNodes - 1)
    centrality[node.path] = 
      (adj.inDegree + adj.outDegree) / (graph.nodes.length - 1);
  });
  
  return centrality;
}
```

### Circular Dependency Detection (Future)

```javascript
function detectCircularDependencies(graph) {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();
  
  function dfs(file, path = []) {
    if (recursionStack.has(file)) {
      // Found cycle
      const cycleStart = path.indexOf(file);
      cycles.push({
        path: path.slice(cycleStart).concat(file),
        length: path.length - cycleStart + 1
      });
      return;
    }
    
    if (visited.has(file)) return;
    
    visited.add(file);
    recursionStack.add(file);
    path.push(file);
    
    // Use adjacencyList for traversal
    const adj = graph.adjacencyList[file];
    adj.outgoing.forEach(dep => dfs(dep, [...path]));
    
    recursionStack.delete(file);
  }
  
  graph.nodes.forEach(node => dfs(node.path));
  return cycles;
}
```

## Implementation Strategy

### Phase 1: Foundation (Current Milestone)

**Implement:**
- ✅ Basic nodes and edges
- ✅ importsMap and dependentsMap
- ✅ adjacencyList structure
- ✅ Basic metrics (counts, averages)
- ✅ Metadata tracking

**Skip:**
- ❌ Advanced metrics (centrality, risk, etc.)
- ❌ Analysis algorithms
- ❌ Incremental hashing

### Phase 2: Graph Intelligence (Future)

**Add without refactoring:**
- Populate node.centrality
- Populate node.blastRadius
- Populate node.riskScore
- Fill analysis.hubs
- Fill analysis.dangerZones
- Fill analysis.circularPaths

### Phase 3: Performance (Future)

**Optimize:**
- Add incremental hashing
- Implement caching
- Add parallel processing
- Optimize large graphs

## Benefits of This Design

1. **No Refactoring Needed**: Future features add data, don't change structure
2. **Algorithm Ready**: Adjacency list and bidirectional maps support all graph algorithms
3. **Performance Optimized**: O(1) lookups, efficient traversal
4. **Extensible**: New metrics/analysis can be added without breaking changes
5. **Clean Separation**: Current implementation vs future placeholders clearly marked

## Summary

This structure provides:
- ✅ Everything needed for current dependency visualization
- ✅ Foundation for future blast radius traversal
- ✅ Support for future hub/danger detection
- ✅ Ready for future centrality analysis
- ✅ Prepared for future community clustering
- ✅ No refactoring required for future enhancements

**Current Implementation = Stable Foundation**
**Future Implementation = Graph Intelligence Platform**