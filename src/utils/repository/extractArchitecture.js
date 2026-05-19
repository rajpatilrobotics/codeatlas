/**
 * Extract Architecture
 * Extracts architecture patterns from repository structure
 */

/**
 * Detect architecture pattern based on directory structure
 */
export function detectArchitecturePattern(fileStructure) {
  if (!fileStructure || !Array.isArray(fileStructure)) {
    return 'unknown';
  }

  const paths = fileStructure.map(f => f.path || f).join(' ').toLowerCase();

  // Detect patterns
  if (paths.includes('src/components') && paths.includes('src/pages')) {
    return 'component-based';
  }

  if (paths.includes('src/features') || paths.includes('src/modules')) {
    return 'feature-based';
  }

  if (paths.includes('src/store') || paths.includes('src/redux') || paths.includes('src/state')) {
    return 'state-managed';
  }

  if (paths.includes('src/services') && paths.includes('src/utils')) {
    return 'layered';
  }

  if (paths.includes('src/hooks') && paths.includes('src/context')) {
    return 'react-hooks';
  }

  if (paths.includes('app') && paths.includes('pages') && paths.includes('widgets')) {
    return 'atomic-design';
  }

  if (paths.includes('domain') || paths.includes('application') || paths.includes('infrastructure')) {
    return 'ddd'; // Domain-Driven Design
  }

  if (paths.includes('microservices') || paths.includes('services')) {
    return 'microservices';
  }

  return 'monolithic';
}

/**
 * Extract component hierarchy
 */
export function extractComponentHierarchy(fileStructure) {
  if (!fileStructure || !Array.isArray(fileStructure)) {
    return [];
  }

  const components = [];
  const componentRegex = /src\/components\/(.+?)\.(jsx?|tsx?)/i;

  fileStructure.forEach(file => {
    const path = file.path || file;
    const match = path.match(componentRegex);
    
    if (match) {
      const componentPath = match[1];
      const parts = componentPath.split('/');
      
      components.push({
        name: parts[parts.length - 1],
        path: componentPath,
        depth: parts.length,
        type: path.includes('.tsx') ? 'typescript' : 'javascript'
      });
    }
  });

  return components;
}

/**
 * Detect state management approach
 */
export function detectStateManagement(fileStructure, dependencies) {
  if (!fileStructure && !dependencies) {
    return 'unknown';
  }

  const paths = Array.isArray(fileStructure) 
    ? fileStructure.map(f => f.path || f).join(' ').toLowerCase()
    : '';

  const deps = dependencies || [];
  const depNames = deps.map(d => d.name || d).join(' ').toLowerCase();

  // Check for state management libraries
  if (depNames.includes('redux') || depNames.includes('@reduxjs')) {
    return 'redux';
  }

  if (depNames.includes('mobx')) {
    return 'mobx';
  }

  if (depNames.includes('zustand')) {
    return 'zustand';
  }

  if (depNames.includes('recoil')) {
    return 'recoil';
  }

  if (depNames.includes('jotai')) {
    return 'jotai';
  }

  if (depNames.includes('pinia')) {
    return 'pinia';
  }

  if (depNames.includes('vuex')) {
    return 'vuex';
  }

  // Check for Context API usage
  if (paths.includes('context') || paths.includes('provider')) {
    return 'context-api';
  }

  return 'local-state';
}

/**
 * Detect routing approach
 */
export function detectRouting(fileStructure, dependencies) {
  if (!fileStructure && !dependencies) {
    return 'unknown';
  }

  const paths = Array.isArray(fileStructure) 
    ? fileStructure.map(f => f.path || f).join(' ').toLowerCase()
    : '';

  const deps = dependencies || [];
  const depNames = deps.map(d => d.name || d).join(' ').toLowerCase();

  // Check for routing libraries
  if (depNames.includes('react-router') || depNames.includes('react-router-dom')) {
    return 'react-router';
  }

  if (depNames.includes('vue-router')) {
    return 'vue-router';
  }

  if (depNames.includes('@angular/router')) {
    return 'angular-router';
  }

  if (depNames.includes('next') || depNames.includes('nuxt')) {
    return 'file-based';
  }

  if (paths.includes('routes') || paths.includes('router')) {
    return 'custom';
  }

  return 'none';
}

/**
 * Extract service layer structure
 */
export function extractServiceLayer(fileStructure) {
  if (!fileStructure || !Array.isArray(fileStructure)) {
    return [];
  }

  const services = [];
  const serviceRegex = /src\/(services|api)\/(.+?)\.(js|ts|jsx|tsx)/i;

  fileStructure.forEach(file => {
    const path = file.path || file;
    const match = path.match(serviceRegex);
    
    if (match) {
      services.push({
        name: match[2],
        path: path,
        type: match[1]
      });
    }
  });

  return services;
}

/**
 * Analyze architecture complexity
 */
export function analyzeArchitectureComplexity(fileStructure, dependencies) {
  if (!fileStructure) {
    return { level: 'unknown', score: 0 };
  }

  const fileCount = Array.isArray(fileStructure) ? fileStructure.length : 0;
  const depCount = Array.isArray(dependencies) ? dependencies.length : 0;
  
  let score = 0;
  
  // File count contribution
  if (fileCount > 100) score += 3;
  else if (fileCount > 50) score += 2;
  else if (fileCount > 20) score += 1;
  
  // Dependency count contribution
  if (depCount > 50) score += 3;
  else if (depCount > 30) score += 2;
  else if (depCount > 10) score += 1;
  
  // Directory depth contribution
  const maxDepth = Math.max(...fileStructure.map(f => (f.path || f).split('/').length));
  if (maxDepth > 5) score += 2;
  else if (maxDepth > 3) score += 1;
  
  let level;
  if (score >= 6) level = 'high';
  else if (score >= 4) level = 'medium';
  else if (score >= 2) level = 'low';
  else level = 'simple';
  
  return { level, score };
}

export default {
  detectArchitecturePattern,
  extractComponentHierarchy,
  detectStateManagement,
  detectRouting,
  extractServiceLayer,
  analyzeArchitectureComplexity
};
