/**
 * Entity Extraction Service
 * Extracts and normalizes code entities from parsed AST data
 */

/**
 * Extract entities from parse results
 * @param {Array} parseResults - Results from parser service
 * @returns {Object} Extracted entities
 */
function extractEntities(parseResults) {
  const entities = {
    files: [],
    functions: [],
    classes: [],
    variables: [],
    imports: [],
    exports: []
  };

  parseResults.forEach(result => {
    if (!result.success || !result.entities) return;

    const filePath = result.path;

    // Extract file entity
    entities.files.push({
      id: generateId('file', filePath),
      path: filePath,
      language: result.language,
      type: 'file'
    });

    // Extract function entities
    result.entities.functions.forEach(func => {
      entities.functions.push({
        id: generateId('function', filePath, func.name),
        name: func.name,
        type: func.type,
        filePath: filePath,
        params: func.params,
        async: func.async,
        generator: func.generator,
        static: func.static,
        kind: func.kind,
        loc: func.loc,
        entityType: 'function'
      });
    });

    // Extract class entities
    result.entities.classes.forEach(cls => {
      const classId = generateId('class', filePath, cls.name);
      
      entities.classes.push({
        id: classId,
        name: cls.name,
        type: cls.type,
        filePath: filePath,
        superClass: cls.superClass,
        methods: cls.methods,
        properties: cls.properties,
        loc: cls.loc,
        entityType: 'class'
      });

      // Extract methods as function entities
      cls.methods.forEach(method => {
        entities.functions.push({
          id: generateId('method', filePath, cls.name, method.name),
          name: method.name,
          type: 'method',
          filePath: filePath,
          className: cls.name,
          classId: classId,
          kind: method.kind,
          static: method.static,
          async: method.async,
          entityType: 'function'
        });
      });
    });

    // Extract variable entities
    result.entities.variables.forEach(variable => {
      entities.variables.push({
        id: generateId('variable', filePath, variable.name),
        name: variable.name,
        type: variable.type,
        kind: variable.kind,
        filePath: filePath,
        loc: variable.loc,
        entityType: 'variable'
      });
    });

    // Extract import entities
    result.entities.imports.forEach(imp => {
      entities.imports.push({
        id: generateId('import', filePath, imp.source),
        source: imp.source,
        specifiers: imp.specifiers,
        filePath: filePath,
        loc: imp.loc,
        entityType: 'import'
      });
    });

    // Extract export entities
    result.entities.exports.forEach(exp => {
      entities.exports.push({
        id: generateId('export', filePath, exp.name),
        name: exp.name,
        type: exp.type,
        local: exp.local,
        source: exp.source,
        filePath: filePath,
        loc: exp.loc,
        entityType: 'export'
      });
    });
  });

  return entities;
}

/**
 * Generate unique entity ID
 * @param {string} type - Entity type
 * @param {...string} parts - ID parts
 * @returns {string} Unique ID
 */
function generateId(type, ...parts) {
  const cleanParts = parts.filter(Boolean).map(p => 
    String(p).replace(/[^a-zA-Z0-9_-]/g, '_')
  );
  return `${type}:${cleanParts.join(':')}`;
}

/**
 * Normalize entity names
 * @param {Object} entities - Extracted entities
 * @returns {Object} Normalized entities
 */
function normalizeEntities(entities) {
  // Create lookup maps
  const entityMap = new Map();

  // Index all entities by ID
  Object.values(entities).forEach(entityList => {
    if (Array.isArray(entityList)) {
      entityList.forEach(entity => {
        entityMap.set(entity.id, entity);
      });
    }
  });

  return {
    entities,
    entityMap
  };
}

/**
 * Get entity by ID
 * @param {Map} entityMap - Entity map
 * @param {string} id - Entity ID
 * @returns {Object|null} Entity or null
 */
function getEntityById(entityMap, id) {
  return entityMap.get(id) || null;
}

/**
 * Find entities by name
 * @param {Object} entities - Extracted entities
 * @param {string} name - Entity name
 * @param {string} type - Entity type (optional)
 * @returns {Array} Matching entities
 */
function findEntitiesByName(entities, name, type = null) {
  const matches = [];

  const searchIn = type ? [entities[type + 's']] : Object.values(entities);

  searchIn.forEach(entityList => {
    if (Array.isArray(entityList)) {
      entityList.forEach(entity => {
        if (entity.name === name) {
          matches.push(entity);
        }
      });
    }
  });

  return matches;
}

/**
 * Get entities by file
 * @param {Object} entities - Extracted entities
 * @param {string} filePath - File path
 * @returns {Object} Entities in file
 */
function getEntitiesByFile(entities, filePath) {
  const fileEntities = {
    functions: [],
    classes: [],
    variables: [],
    imports: [],
    exports: []
  };

  Object.keys(fileEntities).forEach(type => {
    if (entities[type]) {
      fileEntities[type] = entities[type].filter(e => e.filePath === filePath);
    }
  });

  return fileEntities;
}

/**
 * Get entity statistics
 * @param {Object} entities - Extracted entities
 * @returns {Object} Statistics
 */
function getEntityStatistics(entities) {
  return {
    totalFiles: entities.files?.length || 0,
    totalFunctions: entities.functions?.length || 0,
    totalClasses: entities.classes?.length || 0,
    totalVariables: entities.variables?.length || 0,
    totalImports: entities.imports?.length || 0,
    totalExports: entities.exports?.length || 0,
    byFile: groupEntitiesByFile(entities)
  };
}

/**
 * Group entities by file
 * @param {Object} entities - Extracted entities
 * @returns {Object} Entities grouped by file
 */
function groupEntitiesByFile(entities) {
  const byFile = {};

  entities.files?.forEach(file => {
    byFile[file.path] = {
      functions: 0,
      classes: 0,
      variables: 0,
      imports: 0,
      exports: 0
    };
  });

  ['functions', 'classes', 'variables', 'imports', 'exports'].forEach(type => {
    entities[type]?.forEach(entity => {
      if (byFile[entity.filePath]) {
        byFile[entity.filePath][type]++;
      }
    });
  });

  return byFile;
}

/**
 * Get exported entities
 * @param {Object} entities - Extracted entities
 * @returns {Array} Exported entities
 */
function getExportedEntities(entities) {
  const exported = [];

  entities.exports?.forEach(exp => {
    // Find the actual entity being exported
    const entity = findEntitiesByName(entities, exp.name || exp.local);
    
    if (entity.length > 0) {
      exported.push({
        export: exp,
        entity: entity[0]
      });
    } else {
      exported.push({
        export: exp,
        entity: null
      });
    }
  });

  return exported;
}

/**
 * Get imported entities
 * @param {Object} entities - Extracted entities
 * @returns {Array} Imported entities with sources
 */
function getImportedEntities(entities) {
  const imported = [];

  entities.imports?.forEach(imp => {
    imp.specifiers?.forEach(spec => {
      imported.push({
        name: spec.name,
        imported: spec.imported,
        type: spec.type,
        source: imp.source,
        filePath: imp.filePath
      });
    });
  });

  return imported;
}

export {
  extractEntities,
  normalizeEntities,
  getEntityById,
  findEntitiesByName,
  getEntitiesByFile,
  getEntityStatistics,
  getExportedEntities,
  getImportedEntities,
  generateId
};

// Made with Bob
