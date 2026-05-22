# Real Dependency Graph Implementation Plan

## Mission
Implement REAL file-to-file dependency graph generation from actual import/export statements in JavaScript/TypeScript repositories.

## Core Principles
- ✅ PRESERVE existing architecture
- ✅ ONE focused improvement at a time  
- ✅ Smart filtering from the start
- ✅ JS/TS/JSX/TSX only initially
- ✅ New view mode, don't modify existing ones

## What We're Building

### New File: `src/utils/repository/buildDependencyGraph.js`

Core engine that:
1. Filters relevant files (max 150, prioritize src/components/services)
2. Extracts imports from each file
3. Resolves import paths to actual files
4. Builds dependency maps (who imports whom)
5. Calculates edge strength (import frequency)
6. Detects hub nodes (highly imported files)

### Output Structure

```javascript
{
  nodes: [
    {
      id: 'file:src/App.jsx',
      path: 'src/App.jsx',
      name: 'App.jsx',
      type: 'file',
      layer: 'entry',
      importCount: 8,        // files this imports
      dependentCount: 0,     // files that import this
      isHub: false,
      importance: 95
    }
  ],
  edges: [
    {
      id: 'edge:src/App.jsx->src/components/Header.jsx',
      source: 'file:src/App.jsx',
      target: 'file:src/components/Header.jsx',
      strength: 3,           // imported 3 times
      importType: 'es6',
      relationship: 'imports'
    }
  ],
  metrics: {
    totalFiles: 147,
    totalEdges: 423,
    avgDependencies: 2.9,
    hubNodes: 8,
    isolatedNodes: 3
  },
  importsMap: {
    'src/App.jsx': ['src/components/Header.jsx', 'src/services/api.js']
  },
  dependentsMap: {
    'src/components/Header.jsx': ['src/App.jsx', 'src/pages/Home.jsx']
  }
}
```

## Implementation Steps

### Step 1: Create Core Engine (`buildDependencyGraph.js`)

**Key Functions:**

```javascript
// 1. Smart file filtering
function filterRelevantFiles(files, options)
  - Filter by extensions: .js, .jsx, .ts, .tsx
  - Prioritize: src/, app/, components/, services/, api/, hooks/, lib/, utils/
  - Ignore: node_modules/, dist/, build/, .next/, coverage/
  - Max 150 files
  - Return scored file list

// 2. Import extraction
function extractAllImports(fileContent, filePath)
  - ES6: import X from 'Y'
  - CommonJS: require('Y')
  - Dynamic: import('Y')
  - Return import array with metadata

// 3. Path resolution
function resolveImportPath(importPath, sourceFilePath, filePathSet)
  - Handle relative: ./file, ../folder/file
  - Handle absolute: @/components/X
  - Try extensions: .js, .jsx, .ts, .tsx, /index.js, /index.tsx
  - Return resolved path or null

// 4. Dependency mapping
function buildFileDependencyMap(files)
  - Extract imports from each file
  - Resolve to actual paths
  - Build adjacency: { filePath: [dependencies] }
  - Calculate import frequency
  - Return { importsMap, dependentsMap }

// 5. Strength calculation
function calculateDependencyStrength(sourceFile, targetFile, importsMap)
  - Count import occurrences
  - Consider import type
  - Return strength (1-10)

// 6. Main export
function buildDependencyGraph(files, options)
  - Filter files
  - Build maps
  - Calculate strengths
  - Detect hubs
  - Return complete graph
```

### Step 2: Enhance `extractImports.js`

Add new functions:

```javascript
// Export detection
export function extractJSExports(code)
  - export default X
  - export { X, Y }
  - export const X
  - module.exports = X

// Enhanced import extraction
export function extractJSImportsWithMetadata(code)
  - Include line numbers
  - Named vs default imports
  - Import specifiers
  - Return detailed objects

// Import type detection
export function getImportType(importStatement)
  - Return: 'es6-default', 'es6-named', 'commonjs', 'dynamic'
```

### Step 3: Integrate with Analysis Pipeline

**File:** `src/utils/repository/analyzeRepository.js`

```javascript
import { buildDependencyGraph } from './buildDependencyGraph.js';

export async function analyzeRepository(repoData, codeAnalysis) {
  // ... existing code ...

  // NEW: Build dependency graph
  const dependencyGraph = buildDependencyGraph(
    codeAnalysis?.files || [],
    {
      maxFiles: 150,
      priorityDirs: ['src', 'app', 'components', 'services', 'api'],
      ignoreDirs: ['node_modules', 'dist', 'build', '.next'],
      extensions: ['.js', '.jsx', '.ts', '.tsx']
    }
  );

  return {
    dependencies: { /* ... */ },
    imports: { /* ... */ },
    architecture: { /* ... */ },
    graph: { /* ... */ },
    dependencyGraph: dependencyGraph,  // NEW
    summary: { /* ... */ }
  };
}
```

### Step 4: Add New View Mode

**File:** `src/components/TabContent/ArchitectureV2.jsx`

1. Add to VIEW_MODES:

```javascript
const VIEW_MODES = [
  { id: 'system', label: 'System', description: 'Layered architecture overview' },
  { id: 'modules', label: 'Modules', description: 'Folder and module clusters' },
  { id: 'dependencies', label: 'Dependencies', description: 'Internal and package usage' },
  { id: 'filedeps', label: 'File Dependencies', description: 'Real import relationships' }, // NEW
  { id: 'flow', label: 'Flow', description: 'Entrypoint to data path' },
  { id: 'techstack', label: 'Tech Stack', description: 'Detected technologies' }
];
```

2. Update `buildArchitectureV2Graph.js`:

```javascript
if (viewMode === 'filedeps') {
  const depGraph = repoData?.dependencyGraph || { nodes: [], edges: [] };
  return {
    nodes: depGraph.nodes.map(node => makeFileNode(node)),
    edges: depGraph.edges.map(edge => makeDepEdge(edge)),
    stats: depGraph.metrics
  };
}
```

3. Add mode insights:

```javascript
if (viewMode === 'filedeps') {
  return {
    title: 'File Dependency Intelligence',
    description: 'Real import/export relationships from source code.',
    bullets: [
      `Files analyzed: ${metrics.totalFiles}`,
      `Import relationships: ${metrics.totalEdges}`,
      `Hub files: ${metrics.hubNodes}`,
      `Avg dependencies: ${metrics.avgDependencies.toFixed(1)}`,
      'Edge thickness = import frequency',
      'Hub nodes are highlighted'
    ]
  };
}
```

## File Changes Summary

```
CREATE:  src/utils/repository/buildDependencyGraph.js
ENHANCE: src/utils/repository/extractImports.js
MODIFY:  src/utils/repository/analyzeRepository.js
MODIFY:  src/utils/repository/buildArchitectureV2Graph.js
MODIFY:  src/components/TabContent/ArchitectureV2.jsx
```

## Configuration

```javascript
const DEFAULT_OPTIONS = {
  maxFiles: 150,
  priorityDirs: ['src', 'app', 'components', 'services', 'api', 'hooks', 'lib', 'utils'],
  ignoreDirs: ['node_modules', 'dist', 'build', '.next', 'coverage', '__tests__'],
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  aliasMap: { '@': 'src', '~': 'src' },
  hubThreshold: 5  // 5+ dependents = hub
};
```

## Success Criteria

✅ New "File Dependencies" view mode in Architecture V2
✅ Graph shows REAL file-to-file imports
✅ Import paths correctly resolved
✅ Edge thickness reflects frequency
✅ Hub nodes visually distinct
✅ Smart filtering keeps < 150 nodes
✅ No breaking changes to existing modes
✅ Interactive (zoom, pan, select)
✅ Performance < 3s for 150 files

## NOT in This Milestone

Future enhancements (implement later):
- BFS blast radius traversal
- Advanced hub/danger detection
- Incremental hashing/caching
- Multi-language support (Python, Go, Java)
- Circular dependency detection
- Dependency heatmap
- Smart caching

## Timeline

- Core engine + import enhancement: 2-3 hours
- Integration + new view mode: 2-3 hours
- Testing & validation: 1-2 hours
- Documentation: 1 hour

**Total: 6-9 hours**

## Next Actions

1. ✅ Review and approve this plan
2. Switch to Code mode
3. Create `buildDependencyGraph.js`
4. Enhance `extractImports.js`
5. Integrate with analysis pipeline
6. Add new view mode
7. Test with real repository
8. Document changes

---

**Remember:** ONE focused improvement. Build foundation for future graph intelligence but implement ONLY dependency graph generation now.