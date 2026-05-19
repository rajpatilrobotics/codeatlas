/**
 * Extract Dependencies
 * Extracts dependencies from package.json files
 */

/**
 * Parse package.json and extract dependencies
 */
export function extractPackageDependencies(packageJson) {
  if (!packageJson) {
    return {
      dependencies: [],
      devDependencies: [],
      peerDependencies: [],
      scripts: []
    };
  }

  const dependencies = Object.entries(packageJson.dependencies || {}).map(([name, version]) => ({
    name,
    version,
    type: 'production'
  }));

  const devDependencies = Object.entries(packageJson.devDependencies || {}).map(([name, version]) => ({
    name,
    version,
    type: 'development'
  }));

  const peerDependencies = Object.entries(packageJson.peerDependencies || {}).map(([name, version]) => ({
    name,
    version,
    type: 'peer'
  }));

  const scripts = Object.entries(packageJson.scripts || {}).map(([name, command]) => ({
    name,
    command
  }));

  return {
    dependencies,
    devDependencies,
    peerDependencies,
    scripts
  };
}

/**
 * Categorize dependencies by type (frontend, backend, testing, etc.)
 */
export function categorizeDependencies(dependencies) {
  const categories = {
    frontend: [],
    backend: [],
    testing: [],
    build: [],
    linting: [],
    ui: [],
    state: [],
    routing: [],
    utilities: [],
    other: []
  };

  const frontendPatterns = /react|vue|angular|svelte|preact|solid|ember|backbone|jquery|d3|three/i;
  const backendPatterns = /express|koa|fastify|hapi|nest|django|flask|rails|laravel|spring/i;
  const testingPatterns = /jest|mocha|chai|jasmine|cypress|playwright|vitest|testing-library|enzyme/i;
  const buildPatterns = /webpack|vite|rollup|parcel|esbuild|babel|typescript|ts-node/i;
  const lintingPatterns = /eslint|prettier|stylelint|lint-staged|husky/i;
  const uiPatterns = /material|antd|bootstrap|tailwind|chakra|mui|radix|shadcn/i;
  const statePatterns = /redux|mobx|zustand|recoil|jotai|context|pinia|vuex/i;
  const routingPatterns = /react-router|vue-router|angular-router|next-router|reach-router/i;

  dependencies.forEach(dep => {
    const { name } = dep;
    
    if (frontendPatterns.test(name)) {
      categories.frontend.push(dep);
    } else if (backendPatterns.test(name)) {
      categories.backend.push(dep);
    } else if (testingPatterns.test(name)) {
      categories.testing.push(dep);
    } else if (buildPatterns.test(name)) {
      categories.build.push(dep);
    } else if (lintingPatterns.test(name)) {
      categories.linting.push(dep);
    } else if (uiPatterns.test(name)) {
      categories.ui.push(dep);
    } else if (statePatterns.test(name)) {
      categories.state.push(dep);
    } else if (routingPatterns.test(name)) {
      categories.routing.push(dep);
    } else {
      categories.other.push(dep);
    }
  });

  return categories;
}

/**
 * Get dependency tree (simplified - just direct dependencies)
 */
export function getDependencyTree(packageJson) {
  const { dependencies, devDependencies } = extractPackageDependencies(packageJson);
  
  return {
    production: dependencies,
    development: devDependencies,
    total: dependencies.length + devDependencies.length
  };
}

export default {
  extractPackageDependencies,
  categorizeDependencies,
  getDependencyTree
};
