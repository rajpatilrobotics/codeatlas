/**
 * Relationship Extraction Service
 * Builds relationships between code entities
 */

import logger from '../../utils/logger.js';
import { resolveImportPath } from './pathResolver.js';

/**
 * Extract relationships from entities
 * @param {Object} entities - Extracted entities
 * @returns {Array} Relationships
 */
function extractRelationships(entities) {
  logger.info('[RelationshipExtractor] Starting relationship extraction', {
    entityCounts: {
      files: entities.files?.length || 0,
      functions: entities.functions?.length || 0,
      classes: entities.classes?.length || 0,
      variables: entities.variables?.length || 0,
      imports: entities.imports?.length || 0,
      exports: entities.exports?.length || 0,
    },
  });

  const relationships = [];

  relationships.push(...extractImportRelationships(entities));
  relationships.push(...extractInheritanceRelationships(entities));
  relationships.push(...extractCallRelationships(entities));
  relationships.push(...extractExportRelationships(entities));
  relationships.push(...extractFileDependencies(entities));

  const stats = getRelationshipStatistics(relationships);
  logger.info('[RelationshipExtractor] Relationship extraction completed', {
    total: stats.total,
    byType: stats.byType,
  });

  return relationships;
}

function extractImportRelationships(entities) {
  const relationships = [];

  entities.imports?.forEach((imp) => {
    const sourceFile = entities.files?.find((f) => f.path === imp.filePath);
    if (!sourceFile) return;

    const targetId = resolveImportPath(imp.source, imp.filePath, entities.files);
    if (!targetId) return;

    imp.specifiers?.forEach((spec) => {
      relationships.push({
        id: `import:${imp.filePath}:${imp.source}:${spec.name}`,
        type: 'IMPORTS',
        sourceId: sourceFile.id,
        targetId,
        metadata: {
          importType: spec.type,
          importedName: spec.imported || spec.name,
          localName: spec.name,
          filePath: imp.filePath,
          targetPath: imp.source,
        },
      });
    });
  });

  return relationships;
}

function extractInheritanceRelationships(entities) {
  const relationships = [];

  entities.classes?.forEach((cls) => {
    if (!cls.superClass) return;

    const parentClass = entities.classes?.find(
      (c) => c.name === cls.superClass && c.filePath === cls.filePath
    );
    if (!parentClass) return;

    relationships.push({
      id: `extends:${cls.id}:${cls.superClass}`,
      type: 'EXTENDS',
      sourceId: cls.id,
      targetId: parentClass.id,
      metadata: {
        childClass: cls.name,
        parentClass: cls.superClass,
        filePath: cls.filePath,
      },
    });
  });

  return relationships;
}

function extractCallRelationships(entities) {
  const relationships = [];

  entities.imports?.forEach((imp) => {
    const sourceFile = entities.files?.find((f) => f.path === imp.filePath);
    if (!sourceFile) return;

    const functionsInFile = entities.functions?.filter((f) => f.filePath === imp.filePath);
    if (!functionsInFile?.length) return;

    imp.specifiers?.forEach((spec) => {
      const targetEntity =
        entities.functions?.find(
          (f) => f.name === spec.name && f.filePath !== imp.filePath
        ) ||
        entities.variables?.find(
          (v) => v.name === spec.name && v.filePath !== imp.filePath
        );

      if (!targetEntity) return;

      functionsInFile.forEach((func) => {
        relationships.push({
          id: `uses:${func.id}:${targetEntity.id}`,
          type: 'USES',
          sourceId: func.id,
          targetId: targetEntity.id,
          metadata: {
            functionName: func.name,
            usedEntity: spec.name,
            importSource: imp.source,
            filePath: imp.filePath,
            confidence: 'potential',
          },
        });
      });
    });
  });

  return relationships;
}

function extractExportRelationships(entities) {
  const relationships = [];

  entities.exports?.forEach((exp) => {
    const sourceFile = entities.files?.find((f) => f.path === exp.filePath);
    if (!sourceFile) return;

    const entityName = exp.local || exp.name;
    let exportedEntity =
      entities.functions?.find((f) => f.name === entityName && f.filePath === exp.filePath) ||
      entities.classes?.find((c) => c.name === entityName && c.filePath === exp.filePath) ||
      entities.variables?.find((v) => v.name === entityName && v.filePath === exp.filePath);

    if (!exportedEntity) return;

    relationships.push({
      id: `exports:${sourceFile.id}:${exportedEntity.id}`,
      type: 'EXPORTS',
      sourceId: sourceFile.id,
      targetId: exportedEntity.id,
      metadata: {
        exportType: exp.type,
        exportedName: exp.name,
        localName: exp.local,
        filePath: exp.filePath,
      },
    });
  });

  return relationships;
}

function extractFileDependencies(entities) {
  const relationships = [];
  const fileDeps = new Map();

  entities.imports?.forEach((imp) => {
    if (!fileDeps.has(imp.filePath)) {
      fileDeps.set(imp.filePath, new Set());
    }
    fileDeps.get(imp.filePath).add(imp.source);
  });

  fileDeps.forEach((deps, filePath) => {
    const sourceFile = entities.files?.find((f) => f.path === filePath);
    if (!sourceFile) return;

    deps.forEach((depPath) => {
      const targetId = resolveImportPath(depPath, filePath, entities.files);
      if (!targetId) return;

      relationships.push({
        id: `depends:${filePath}:${depPath}`,
        type: 'DEPENDS_ON',
        sourceId: sourceFile.id,
        targetId,
        metadata: {
          sourceFile: filePath,
          targetFile: depPath,
          isExternal: false,
        },
      });
    });
  });

  return relationships;
}

function getEntityRelationships(relationships, entityId, direction = 'both') {
  if (direction === 'incoming') {
    return relationships.filter((r) => r.targetId === entityId);
  }
  if (direction === 'outgoing') {
    return relationships.filter((r) => r.sourceId === entityId);
  }
  return relationships.filter((r) => r.sourceId === entityId || r.targetId === entityId);
}

function getRelationshipsByType(relationships, type) {
  return relationships.filter((r) => r.type === type);
}

function getRelationshipStatistics(relationships) {
  const stats = { total: relationships.length, byType: {} };
  relationships.forEach((rel) => {
    stats.byType[rel.type] = (stats.byType[rel.type] || 0) + 1;
  });
  return stats;
}

function findCircularDependencies(relationships) {
  const graph = buildDependencyGraph(relationships);
  const visited = new Set();
  const recursionStack = new Set();
  const cycles = [];

  function dfs(node, path = []) {
    if (recursionStack.has(node)) {
      const cycleStart = path.indexOf(node);
      if (cycleStart !== -1) cycles.push(path.slice(cycleStart));
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    (graph.get(node) || []).forEach((neighbor) => dfs(neighbor, [...path]));
    recursionStack.delete(node);
  }

  graph.forEach((_, node) => {
    if (!visited.has(node)) dfs(node);
  });

  return cycles;
}

function buildDependencyGraph(relationships) {
  const graph = new Map();
  relationships.forEach((rel) => {
    if (rel.type === 'DEPENDS_ON' || rel.type === 'IMPORTS') {
      if (!graph.has(rel.sourceId)) graph.set(rel.sourceId, []);
      graph.get(rel.sourceId).push(rel.targetId);
    }
  });
  return graph;
}

function getDependencyChain(relationships, entityId, maxDepth = 5) {
  const graph = buildDependencyGraph(relationships);
  const chain = [];
  const visited = new Set();

  function traverse(node, depth = 0) {
    if (depth >= maxDepth || visited.has(node)) return;
    visited.add(node);
    chain.push({ node, depth });
    (graph.get(node) || []).forEach((neighbor) => traverse(neighbor, depth + 1));
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
  buildDependencyGraph,
};
