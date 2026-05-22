/**
 * Analyze Repository
 * Main repository analyzer that combines all extraction utilities
 */

import { extractPackageDependencies, categorizeDependencies, getDependencyTree } from './extractDependencies.js';
import { extractJSImports, extractCSSImports, categorizeImports, getImportFrequency } from './extractImports.js';
import { detectArchitecturePattern, extractComponentHierarchy, detectStateManagement, detectRouting, extractServiceLayer, analyzeArchitectureComplexity } from './extractArchitecture.js';
import { buildGraphData, buildSimplifiedGraph, calculateGraphStats } from './buildGraphData.js';
import { buildDependencyGraph } from './buildDependencyGraph.js';

/**
 * Main repository analysis function
 */
export async function analyzeRepository(repoData, codeAnalysis) {
  if (!repoData) {
    throw new Error('Repository data is required');
  }

  const { packageJson, fileStructure, importantFiles } = repoData;

  // Extract dependencies
  const dependencyData = extractPackageDependencies(packageJson);
  const categorizedDeps = categorizeDependencies([
    ...dependencyData.dependencies,
    ...dependencyData.devDependencies
  ]);
  const dependencyTree = getDependencyTree(packageJson);

  // Extract imports from code analysis
  let imports = [];
  let importCategories = {};
  let importFrequency = {};

  if (codeAnalysis && codeAnalysis.files) {
    codeAnalysis.files.forEach(file => {
      if (file.content) {
        const jsImports = extractJSImports(file.content);
        const cssImports = extractCSSImports(file.content);
        imports = [...imports, ...jsImports, ...cssImports];
      }
    });

    importCategories = categorizeImports(imports);
    importFrequency = getImportFrequency(imports);
  }

  // Extract architecture patterns
  const architecturePattern = detectArchitecturePattern(fileStructure);
  const componentHierarchy = extractComponentHierarchy(fileStructure);
  const stateManagement = detectStateManagement(fileStructure, dependencyData.dependencies);
  const routing = detectRouting(fileStructure, dependencyData.dependencies);
  const serviceLayer = extractServiceLayer(fileStructure);
  const complexity = analyzeArchitectureComplexity(fileStructure, dependencyData.dependencies);

  // Build graph data
  const graphData = buildGraphData(fileStructure, dependencyData.dependencies, imports);
  const simplifiedGraph = buildSimplifiedGraph(fileStructure);
  const graphStats = calculateGraphStats(graphData.nodes, graphData.edges);

  // Build dependency graph (with graceful fallback)
  let dependencyGraph = null;
  try {
    if (codeAnalysis && codeAnalysis.files && Array.isArray(codeAnalysis.files)) {
      console.log('[DEBUG] analyzeRepository: Building dependency graph from', codeAnalysis.files.length, 'files');
      dependencyGraph = buildDependencyGraph(codeAnalysis.files, {
        maxFiles: 150,
        priorityDirs: ['src', 'app', 'components', 'services', 'api', 'hooks', 'lib', 'utils'],
        ignoreDirs: ['node_modules', 'dist', 'build', '.next', 'coverage', '__tests__'],
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      });
      console.log('[DEBUG] analyzeRepository: Dependency graph generated:', {
        nodes: dependencyGraph?.nodes?.length || 0,
        edges: dependencyGraph?.edges?.length || 0,
        hasAdjacencyList: !!dependencyGraph?.adjacencyList,
        sampleNode: dependencyGraph?.nodes?.[0],
        sampleEdge: dependencyGraph?.edges?.[0]
      });
    } else {
      console.log('[DEBUG] analyzeRepository: Skipping dependency graph - no code analysis files');
    }
  } catch (error) {
    console.warn('[DEBUG] analyzeRepository: Dependency graph generation failed:', error.message);
    dependencyGraph = null;
  }

  return {
    dependencies: {
      raw: dependencyData,
      categorized: categorizedDeps,
      tree: dependencyTree
    },
    imports: {
      raw: imports,
      categories: importCategories,
      frequency: importFrequency
    },
    architecture: {
      pattern: architecturePattern,
      components: componentHierarchy,
      stateManagement: stateManagement,
      routing: routing,
      services: serviceLayer,
      complexity: complexity
    },
    graph: {
      full: graphData,
      simplified: simplifiedGraph,
      stats: graphStats
    },
    dependencyGraph: dependencyGraph,
    summary: {
      totalFiles: fileStructure ? fileStructure.length : 0,
      totalDependencies: dependencyTree.total,
      totalComponents: componentHierarchy.length,
      totalServices: serviceLayer.length,
      architecturePattern: architecturePattern,
      complexityLevel: complexity.level
    }
  };
}

/**
 * Quick repository analysis (lightweight version)
 */
export function quickAnalyze(repoData) {
  if (!repoData) {
    throw new Error('Repository data is required');
  }

  const { packageJson, fileStructure } = repoData;

  const dependencyData = extractPackageDependencies(packageJson);
  const architecturePattern = detectArchitecturePattern(fileStructure);
  const complexity = analyzeArchitectureComplexity(fileStructure, dependencyData.dependencies);

  return {
    dependencies: dependencyData,
    architecture: {
      pattern: architecturePattern,
      complexity: complexity
    },
    summary: {
      totalFiles: fileStructure ? fileStructure.length : 0,
      totalDependencies: dependencyData.dependencies.length + dependencyData.devDependencies.length,
      architecturePattern: architecturePattern,
      complexityLevel: complexity.level
    }
  };
}

/**
 * Get repository health metrics
 */
export function getRepositoryHealthMetrics(repoData, codeAnalysis) {
  if (!repoData) {
    return null;
  }

  const { packageJson, fileStructure, repoInfo } = repoData;

  const dependencyData = extractPackageDependencies(packageJson);
  const complexity = analyzeArchitectureComplexity(fileStructure, dependencyData.dependencies);

  // Calculate health score (0-100)
  let healthScore = 100;

  // Deduct for high complexity
  if (complexity.level === 'high') healthScore -= 20;
  else if (complexity.level === 'medium') healthScore -= 10;

  // Deduct for too many dependencies
  const totalDeps = dependencyData.dependencies.length + dependencyData.devDependencies.length;
  if (totalDeps > 100) healthScore -= 15;
  else if (totalDeps > 50) healthScore -= 10;
  else if (totalDeps > 30) healthScore -= 5;

  // Add points for good practices
  if (packageJson.scripts && Object.keys(packageJson.scripts).length > 0) healthScore += 5;
  if (packageJson.devDependencies && packageJson.devDependencies.length > 0) healthScore += 5;

  // Cap at 100
  healthScore = Math.min(100, Math.max(0, healthScore));

  return {
    score: healthScore,
    complexity: complexity.level,
    dependencyCount: totalDeps,
    fileCount: fileStructure ? fileStructure.length : 0,
    stars: repoInfo?.stargazers_count || 0,
    forks: repoInfo?.forks_count || 0
  };
}

export default {
  analyzeRepository,
  quickAnalyze,
  getRepositoryHealthMetrics
};
