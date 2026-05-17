const {
  extractEntities,
  normalizeEntities,
  getEntityById,
  findEntitiesByName,
  getEntitiesByFile,
  getEntityStatistics,
  getExportedEntities,
  getImportedEntities
} = require('./entityExtractor');

const {
  extractRelationships,
  getEntityRelationships,
  getRelationshipsByType,
  getRelationshipStatistics,
  findCircularDependencies,
  getDependencyChain
} = require('./relationshipExtractor');

/**
 * Main extraction service
 * Orchestrates entity and relationship extraction
 */
class ExtractionService {
  /**
   * Extract entities and relationships from parse results
   * @param {Array} parseResults - Results from parser service
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Extraction result
   */
  async extract(parseResults, onProgress = null) {
    try {
      // Step 1: Extract entities
      if (onProgress) {
        onProgress({
          stage: 'extraction',
          substage: 'entities',
          progress: 0,
          message: 'Extracting entities...'
        });
      }

      const entities = extractEntities(parseResults);
      const { entityMap } = normalizeEntities(entities);

      if (onProgress) {
        onProgress({
          stage: 'extraction',
          substage: 'entities',
          progress: 50,
          message: `Extracted ${Object.values(entities).flat().length} entities`
        });
      }

      // Step 2: Extract relationships
      if (onProgress) {
        onProgress({
          stage: 'extraction',
          substage: 'relationships',
          progress: 50,
          message: 'Extracting relationships...'
        });
      }

      const relationships = extractRelationships(entities);

      if (onProgress) {
        onProgress({
          stage: 'extraction',
          substage: 'relationships',
          progress: 75,
          message: `Extracted ${relationships.length} relationships`
        });
      }

      // Step 3: Analyze dependencies
      if (onProgress) {
        onProgress({
          stage: 'extraction',
          substage: 'analysis',
          progress: 75,
          message: 'Analyzing dependencies...'
        });
      }

      const circularDeps = findCircularDependencies(relationships);

      if (onProgress) {
        onProgress({
          stage: 'extraction',
          substage: 'analysis',
          progress: 100,
          message: 'Extraction complete'
        });
      }

      // Calculate statistics
      const entityStats = getEntityStatistics(entities);
      const relationshipStats = getRelationshipStatistics(relationships);

      return {
        success: true,
        entities,
        entityMap,
        relationships,
        statistics: {
          entities: entityStats,
          relationships: relationshipStats,
          circularDependencies: circularDeps.length
        },
        analysis: {
          circularDependencies: circularDeps,
          exportedEntities: getExportedEntities(entities),
          importedEntities: getImportedEntities(entities)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          stack: error.stack
        }
      };
    }
  }

  /**
   * Get entity by ID
   * @param {Map} entityMap - Entity map
   * @param {string} id - Entity ID
   * @returns {Object|null} Entity
   */
  getEntity(entityMap, id) {
    return getEntityById(entityMap, id);
  }

  /**
   * Find entities by name
   * @param {Object} entities - Extracted entities
   * @param {string} name - Entity name
   * @param {string} type - Entity type (optional)
   * @returns {Array} Matching entities
   */
  findEntities(entities, name, type = null) {
    return findEntitiesByName(entities, name, type);
  }

  /**
   * Get entities in a file
   * @param {Object} entities - Extracted entities
   * @param {string} filePath - File path
   * @returns {Object} Entities in file
   */
  getFileEntities(entities, filePath) {
    return getEntitiesByFile(entities, filePath);
  }

  /**
   * Get relationships for an entity
   * @param {Array} relationships - All relationships
   * @param {string} entityId - Entity ID
   * @param {string} direction - 'incoming', 'outgoing', or 'both'
   * @returns {Array} Filtered relationships
   */
  getEntityRelationships(relationships, entityId, direction = 'both') {
    return getEntityRelationships(relationships, entityId, direction);
  }

  /**
   * Get relationships by type
   * @param {Array} relationships - All relationships
   * @param {string} type - Relationship type
   * @returns {Array} Filtered relationships
   */
  getRelationshipsByType(relationships, type) {
    return getRelationshipsByType(relationships, type);
  }

  /**
   * Get dependency chain for an entity
   * @param {Array} relationships - All relationships
   * @param {string} entityId - Starting entity ID
   * @param {number} maxDepth - Maximum depth
   * @returns {Array} Dependency chain
   */
  getDependencyChain(relationships, entityId, maxDepth = 5) {
    return getDependencyChain(relationships, entityId, maxDepth);
  }

  /**
   * Find circular dependencies
   * @param {Array} relationships - All relationships
   * @returns {Array} Circular dependency chains
   */
  findCircularDependencies(relationships) {
    return findCircularDependencies(relationships);
  }

  /**
   * Get extraction statistics
   * @param {Object} entities - Extracted entities
   * @param {Array} relationships - Extracted relationships
   * @returns {Object} Statistics
   */
  getStatistics(entities, relationships) {
    return {
      entities: getEntityStatistics(entities),
      relationships: getRelationshipStatistics(relationships)
    };
  }

  /**
   * Build dependency graph for visualization
   * @param {Object} entities - Extracted entities
   * @param {Array} relationships - Extracted relationships
   * @param {Object} options - Graph options
   * @returns {Object} Graph data for React Flow
   */
  buildDependencyGraph(entities, relationships, options = {}) {
    const {
      includeTypes = ['file', 'function', 'class'],
      maxNodes = 100,
      layout = 'hierarchical'
    } = options;

    const nodes = [];
    const edges = [];

    // Filter entities by type
    const filteredEntities = [];
    includeTypes.forEach(type => {
      const entityList = entities[type + 's'] || [];
      filteredEntities.push(...entityList.slice(0, maxNodes));
    });

    // Create nodes
    filteredEntities.forEach((entity, index) => {
      nodes.push({
        id: entity.id,
        type: entity.entityType || entity.type,
        data: {
          label: entity.name || entity.path,
          ...entity
        },
        position: this.calculateNodePosition(index, filteredEntities.length, layout)
      });
    });

    // Create edges from relationships
    const nodeIds = new Set(nodes.map(n => n.id));
    relationships.forEach(rel => {
      if (nodeIds.has(rel.source) && nodeIds.has(rel.target)) {
        edges.push({
          id: rel.id,
          source: rel.source,
          target: rel.target,
          type: rel.type,
          label: rel.type,
          data: rel.metadata
        });
      }
    });

    return {
      nodes,
      edges,
      statistics: {
        nodeCount: nodes.length,
        edgeCount: edges.length
      }
    };
  }

  /**
   * Calculate node position for layout
   * @param {number} index - Node index
   * @param {number} total - Total nodes
   * @param {string} layout - Layout type
   * @returns {Object} Position {x, y}
   */
  calculateNodePosition(index, total, layout) {
    if (layout === 'hierarchical') {
      const level = Math.floor(index / 5);
      const posInLevel = index % 5;
      return {
        x: posInLevel * 250,
        y: level * 150
      };
    } else if (layout === 'circular') {
      const angle = (index / total) * 2 * Math.PI;
      const radius = 300;
      return {
        x: Math.cos(angle) * radius + 400,
        y: Math.sin(angle) * radius + 300
      };
    } else {
      // Grid layout
      const cols = Math.ceil(Math.sqrt(total));
      const row = Math.floor(index / cols);
      const col = index % cols;
      return {
        x: col * 200,
        y: row * 150
      };
    }
  }
}

// Export singleton instance
module.exports = new ExtractionService();

// Made with Bob
