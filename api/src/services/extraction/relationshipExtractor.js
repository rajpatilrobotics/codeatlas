/**
 * Relationship Extraction Service
 * Builds relationships between code entities
 */

/**
 * Extract relationships from entities
 * @param {Object} entities - Extracted entities
 * @returns {Array} Relationships
 */
function extractRelationships(entities) {
  const relationships = [];

  // 1. File imports relationships
  relationships.push(...extractImportRelationships(entities));

  // 2. Class inheritance relationships
  relationships.push(...extractInheritanceRelationships(entities));

  // 3. Function call relationships (basic - from imports)
  relationships.push(...extractCallRelationships(entities));

  // 4. Export relationships
  relationships.push(...extractExportRelationships(entities));

  // 5. File dependency relationships
  relationships.push(...extractFileDependencies(entities));

  return relationships;
}

/**
 * Extract import relationships
 * @param {Object} entities - Extracted entities
 * @returns {Array} Import relationships
 */
function extractImportRelationships(entities) {
  const relationships = [];

  entities.imports?.forEach(imp => {
    const sourceFile = entities.files?.find(f => f.path === imp.filePath);
    if (!sourceFile) return;

    // Create relationship for each import
    imp.specifiers?.forEach(spec => {
      relationships.push({
        id: `import:${imp.filePath}:${imp.source}:${spec.name}`,
        type: 'IMPORTS',
        source: sourceFile.id,
        target: imp.source,
        metadata: {
          importType: spec.type,
          importedName: spec.imported || spec.name,
          localName: spec.name,
          filePath: imp.filePath,
          targetPath: imp.source
        }
      });
    });
  });

  return relationships;
}

/**
 * Extract class inheritance relationships
 * @param {Object} entities - Extracted entities
 * @returns {Array} Inheritance relationships
 */
function extractInheritanceRelationships(entities) {
  const relationships = [];

  entities.classes?.forEach(cls => {
    if (cls.superClass) {
      // Find the parent class
      const parentClass = entities.classes?.find(c => 
        c.name === cls.superClass && c.filePath === cls.filePath
      );

      relationships.push({
        id: `extends:${cls.id}:${cls.superClass}`,
        type: 'EXTENDS',
        source: cls.id,
        target: parentClass?.id || `class:unknown:${cls.superClass}`,
        metadata: {
          childClass: cls.name,
          parentClass: cls.superClass,
          filePath: cls.filePath
        }
      });
    }
  });

  return relationships;
}

/**
 * Extract function call relationships (basic)
 * @param {Object} entities - Extracted entities
 * @returns {Array} Call relationships
 */
function extractCallRelationships(entities) {
  const relationships = [];

  // For now, we'll create potential call relationships based on imports
  // A more sophisticated version would analyze function bodies
  
  entities.imports?.forEach(imp => {
    const sourceFile = entities.files?.find(f => f.path === imp.filePath);
    if (!sourceFile) return;

    imp.specifiers?.forEach(spec => {
      // Find functions in the same file that might use this import
      const functionsInFile = entities.functions?.filter(f => 
        f.filePath === imp.filePath
      );

      functionsInFile?.forEach(func => {
        relationships.push({
          id: `uses:${func.id}:${spec.name}`,
          type: 'USES',
          source: func.id,
          target: spec.name,
          metadata: {
            functionName: func.name,
            usedEntity: spec.name,
            importSource: imp.source,
            filePath: imp.filePath,
            confidence: 'potential' // Indicates this is inferred
          }
        });
      });
    });
  });

  return relationships;
}

/**
 * Extract export relationships
 * @param {Object} entities - Extracted entities
 * @returns {Array} Export relationships
 */
function extractExportRelationships(entities) {
  const relationships = [];

  entities.exports?.forEach(exp => {
    const sourceFile = entities.files?.find(f => f.path === exp.filePath);
    if (!sourceFile) return;

    // Find the entity being exported
    let exportedEntity = null;

    if (exp.type === 'named' || exp.type === 'default') {
      const entityName = exp.local || exp.name;
      
      // Search in functions
      exportedEntity = entities.functions?.find(f => 
        f.name === entityName && f.filePath === exp.filePath
      );

      // Search in classes
      if (!exportedEntity) {
        exportedEntity = entities.classes?.find(c => 
          c.name === entityName && c.filePath === exp.filePath
        );
      }

      // Search in variables
      if (!exportedEntity) {
        exportedEntity = entities.variables?.find(v => 
          v.name === entityName && v.filePath === exp.filePath
        );
      }
    }

    if (exportedEntity) {
      relationships.push({
        id: `exports:${sourceFile.id}:${exportedEntity.id}`,
        type: 'EXPORTS',
        source: sourceFile.id,
        target: exportedEntity.id,
        metadata: {
          exportType: exp.type,
          exportedName: exp.name,
          localName: exp.local,
          filePath: exp.filePath
        }
      });
    }
  });

  return relationships;
}

/**
 * Extract file dependency relationships
 * @param {Object} entities - Extracted entities
 * @returns {Array} File dependency relationships
 */
function extractFileDependencies(entities) {
  const relationships = [];
  const fileDeps = new Map();

  // Group imports by file
  entities.imports?.forEach(imp => {
    if (!fileDeps.has(imp.filePath)) {
      fileDeps.set(imp.filePath, new Set());
    }
    fileDeps.get(imp.filePath).add(imp.source);
  });

  // Create file dependency relationships
  fileDeps.forEach((deps, filePath) => {
    const sourceFile = entities.files?.find(f => f.path === filePath);
    if (!sourceFile) return;

    deps.forEach(depPath => {
      // Try to find the target file
      const targetFile = entities.files?.find(f => 
        f.path === depPath || f.path.endsWith(depPath)
      );

      relationships.push({
        id: `depends:${filePath}:${depPath}`,
        type: 'DEPENDS_ON',
        source: sourceFile.id,
        target: targetFile?.id || `file:external:${depPath}`,
        metadata: {
          sourceFile: filePath,
          targetFile: depPath,
          isExternal: !targetFile
        }
      });
    });
  });

  return relationships;
}

/**
 * Get relationships for an entity
 * @param {Array} relationships - All relationships
 * @param {string} entityId - Entity ID
 * @param {string} direction - 'incoming', 'outgoing', or 'both'
 * @returns {Array} Filtered relationships
 */
function getEntityRelationships(relationships, entityId, direction = 'both') {
  if (direction === 'incoming') {
    return relationships.filter(r => r.target === entityId);
  } else if (direction === 'outgoing') {
    return relationships.filter(r => r.source === entityId);
  } else {
    return relationships.filter(r => 
      r.source === entityId || r.target === entityId
    );
  }
}

/**
 * Get relationships by type
 * @param {Array} relationships - All relationships
 * @param {string} type - Relationship type
 * @returns {Array} Filtered relationships
 */
function getRelationshipsByType(relationships, type) {
  return relationships.filter(r => r.type === type);
}

/**
 * Get relationship statistics
 * @param {Array} relationships - All relationships
 * @returns {Object} Statistics
 */
function getRelationshipStatistics(relationships) {
  const stats = {
    total: relationships.length,
    byType: {}
  };

  relationships.forEach(rel => {
    if (!stats.byType[rel.type]) {
      stats.byType[rel.type] = 0;
    }
    stats.byType[rel.type]++;
  });

  return stats;
}

/**
 * Find circular dependencies
 * @param {Array} relationships - All relationships
 * @returns {Array} Circular dependency chains
 */
function findCircularDependencies(relationships) {
  const graph = buildDependencyGraph(relationships);
  const visited = new Set();
  const recursionStack = new Set();
  const cycles = [];

  function dfs(node, path = []) {
    if (recursionStack.has(node)) {
      // Found a cycle
      const cycleStart = path.indexOf(node);
      if (cycleStart !== -1) {
        cycles.push(path.slice(cycleStart));
      }
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) || [];
    neighbors.forEach(neighbor => {
      dfs(neighbor, [...path]);
    });

    recursionStack.delete(node);
  }

  // Run DFS from each node
  graph.forEach((_, node) => {
    if (!visited.has(node)) {
      dfs(node);
    }
  });

  return cycles;
}

/**
 * Build dependency graph from relationships
 * @param {Array} relationships - All relationships
 * @returns {Map} Dependency graph
 */
function buildDependencyGraph(relationships) {
  const graph = new Map();

  relationships.forEach(rel => {
    if (rel.type === 'DEPENDS_ON' || rel.type === 'IMPORTS') {
      if (!graph.has(rel.source)) {
        graph.set(rel.source, []);
      }
      graph.get(rel.source).push(rel.target);
    }
  });

  return graph;
}

/**
 * Get dependency chain
 * @param {Array} relationships - All relationships
 * @param {string} entityId - Starting entity ID
 * @param {number} maxDepth - Maximum depth
 * @returns {Array} Dependency chain
 */
function getDependencyChain(relationships, entityId, maxDepth = 5) {
  const graph = buildDependencyGraph(relationships);
  const chain = [];
  const visited = new Set();

  function traverse(node, depth = 0) {
    if (depth >= maxDepth || visited.has(node)) {
      return;
    }

    visited.add(node);
    chain.push({ node, depth });

    const neighbors = graph.get(node) || [];
    neighbors.forEach(neighbor => {
      traverse(neighbor, depth + 1);
    });
  }

  traverse(entityId);
  return chain;
}

export {
  extractRelationships,
  extractImportRelationships,
  extractInheritanceRelationships,
  extractCallRelationships,
  extractExportRelationships,
  extractFileDependencies,
  getEntityRelationships,
  getRelationshipsByType,
  getRelationshipStatistics,
  findCircularDependencies,
  getDependencyChain,
  buildDependencyGraph
};

// Made with Bob
