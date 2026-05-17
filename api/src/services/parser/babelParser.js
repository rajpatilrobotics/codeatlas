import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

/**
 * Parse JavaScript/TypeScript code using Babel
 * @param {string} code - Source code to parse
 * @param {Object} options - Parser options
 * @returns {Object} AST and metadata
 */
function parseCode(code, options = {}) {
  const {
    sourceType = 'module',
    language = 'javascript',
    filePath = 'unknown'
  } = options;

  try {
    // Determine if TypeScript
    const isTypeScript = language === 'typescript' || 
                        filePath.endsWith('.ts') || 
                        filePath.endsWith('.tsx');

    // Babel parser options
    const parserOptions = {
      sourceType,
      plugins: [
        'jsx',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'decorators-legacy',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'dynamicImport',
        'nullishCoalescingOperator',
        'optionalChaining',
        'objectRestSpread',
        'asyncGenerators',
        'bigInt',
        'optionalCatchBinding',
        'numericSeparator'
      ]
    };

    // Add TypeScript plugin if needed
    if (isTypeScript) {
      parserOptions.plugins.push('typescript');
    }

    // Parse code
    const ast = parser.parse(code, parserOptions);

    return {
      success: true,
      ast,
      language: isTypeScript ? 'typescript' : 'javascript'
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error.message,
        line: error.loc?.line,
        column: error.loc?.column
      }
    };
  }
}

/**
 * Extract functions from AST
 * @param {Object} ast - Babel AST
 * @param {string} filePath - File path
 * @returns {Array} List of functions
 */
function extractFunctions(ast, filePath = 'unknown') {
  const functions = [];

  traverse(ast, {
    FunctionDeclaration(path) {
      const node = path.node;
      functions.push({
        type: 'function',
        name: node.id?.name || 'anonymous',
        params: node.params.map(p => getParamName(p)),
        async: node.async,
        generator: node.generator,
        loc: node.loc,
        filePath
      });
    },
    
    FunctionExpression(path) {
      const node = path.node;
      const parent = path.parent;
      
      let name = 'anonymous';
      if (t.isVariableDeclarator(parent)) {
        name = parent.id.name;
      } else if (t.isObjectProperty(parent)) {
        name = parent.key.name || parent.key.value;
      }

      functions.push({
        type: 'function',
        name,
        params: node.params.map(p => getParamName(p)),
        async: node.async,
        generator: node.generator,
        loc: node.loc,
        filePath
      });
    },

    ArrowFunctionExpression(path) {
      const node = path.node;
      const parent = path.parent;
      
      let name = 'anonymous';
      if (t.isVariableDeclarator(parent)) {
        name = parent.id.name;
      } else if (t.isObjectProperty(parent)) {
        name = parent.key.name || parent.key.value;
      }

      functions.push({
        type: 'arrow_function',
        name,
        params: node.params.map(p => getParamName(p)),
        async: node.async,
        loc: node.loc,
        filePath
      });
    },

    ClassMethod(path) {
      const node = path.node;
      functions.push({
        type: 'method',
        name: node.key.name || node.key.value,
        params: node.params.map(p => getParamName(p)),
        async: node.async,
        static: node.static,
        kind: node.kind, // 'constructor', 'method', 'get', 'set'
        loc: node.loc,
        filePath
      });
    }
  });

  return functions;
}

/**
 * Extract classes from AST
 * @param {Object} ast - Babel AST
 * @param {string} filePath - File path
 * @returns {Array} List of classes
 */
function extractClasses(ast, filePath = 'unknown') {
  const classes = [];

  traverse(ast, {
    ClassDeclaration(path) {
      const node = path.node;
      const methods = [];
      const properties = [];

      // Extract methods
      node.body.body.forEach(member => {
        if (t.isClassMethod(member)) {
          methods.push({
            name: member.key.name || member.key.value,
            kind: member.kind,
            static: member.static,
            async: member.async
          });
        } else if (t.isClassProperty(member)) {
          properties.push({
            name: member.key.name || member.key.value,
            static: member.static
          });
        }
      });

      classes.push({
        type: 'class',
        name: node.id?.name || 'anonymous',
        superClass: node.superClass?.name,
        methods,
        properties,
        loc: node.loc,
        filePath
      });
    },

    ClassExpression(path) {
      const node = path.node;
      const parent = path.parent;
      
      let name = 'anonymous';
      if (t.isVariableDeclarator(parent)) {
        name = parent.id.name;
      }

      const methods = [];
      const properties = [];

      node.body.body.forEach(member => {
        if (t.isClassMethod(member)) {
          methods.push({
            name: member.key.name || member.key.value,
            kind: member.kind,
            static: member.static,
            async: member.async
          });
        } else if (t.isClassProperty(member)) {
          properties.push({
            name: member.key.name || member.key.value,
            static: member.static
          });
        }
      });

      classes.push({
        type: 'class',
        name,
        superClass: node.superClass?.name,
        methods,
        properties,
        loc: node.loc,
        filePath
      });
    }
  });

  return classes;
}

/**
 * Extract imports from AST
 * @param {Object} ast - Babel AST
 * @param {string} filePath - File path
 * @returns {Array} List of imports
 */
function extractImports(ast, filePath = 'unknown') {
  const imports = [];

  traverse(ast, {
    ImportDeclaration(path) {
      const node = path.node;
      const specifiers = node.specifiers.map(spec => {
        if (t.isImportDefaultSpecifier(spec)) {
          return { type: 'default', name: spec.local.name };
        } else if (t.isImportNamespaceSpecifier(spec)) {
          return { type: 'namespace', name: spec.local.name };
        } else if (t.isImportSpecifier(spec)) {
          return {
            type: 'named',
            name: spec.local.name,
            imported: spec.imported.name
          };
        }
        return null;
      }).filter(Boolean);

      imports.push({
        source: node.source.value,
        specifiers,
        loc: node.loc,
        filePath
      });
    },

    // Handle require() calls
    CallExpression(path) {
      const node = path.node;
      if (t.isIdentifier(node.callee, { name: 'require' }) && 
          node.arguments.length > 0 &&
          t.isStringLiteral(node.arguments[0])) {
        
        const parent = path.parent;
        let name = 'unknown';
        
        if (t.isVariableDeclarator(parent)) {
          name = parent.id.name;
        }

        imports.push({
          source: node.arguments[0].value,
          specifiers: [{ type: 'require', name }],
          loc: node.loc,
          filePath
        });
      }
    }
  });

  return imports;
}

/**
 * Extract exports from AST
 * @param {Object} ast - Babel AST
 * @param {string} filePath - File path
 * @returns {Array} List of exports
 */
function extractExports(ast, filePath = 'unknown') {
  const exports = [];

  traverse(ast, {
    ExportNamedDeclaration(path) {
      const node = path.node;
      
      if (node.declaration) {
        // export const x = ...
        // export function foo() {}
        // export class Bar {}
        if (t.isVariableDeclaration(node.declaration)) {
          node.declaration.declarations.forEach(decl => {
            exports.push({
              type: 'named',
              name: decl.id.name,
              loc: node.loc,
              filePath
            });
          });
        } else if (t.isFunctionDeclaration(node.declaration) || 
                   t.isClassDeclaration(node.declaration)) {
          exports.push({
            type: 'named',
            name: node.declaration.id.name,
            loc: node.loc,
            filePath
          });
        }
      } else if (node.specifiers) {
        // export { x, y }
        node.specifiers.forEach(spec => {
          exports.push({
            type: 'named',
            name: spec.exported.name,
            local: spec.local.name,
            loc: node.loc,
            filePath
          });
        });
      }
    },

    ExportDefaultDeclaration(path) {
      const node = path.node;
      let name = 'default';

      if (t.isIdentifier(node.declaration)) {
        name = node.declaration.name;
      } else if (t.isFunctionDeclaration(node.declaration) || 
                 t.isClassDeclaration(node.declaration)) {
        name = node.declaration.id?.name || 'default';
      }

      exports.push({
        type: 'default',
        name,
        loc: node.loc,
        filePath
      });
    },

    ExportAllDeclaration(path) {
      const node = path.node;
      exports.push({
        type: 'all',
        source: node.source.value,
        loc: node.loc,
        filePath
      });
    }
  });

  return exports;
}

/**
 * Extract variables from AST
 * @param {Object} ast - Babel AST
 * @param {string} filePath - File path
 * @returns {Array} List of variables
 */
function extractVariables(ast, filePath = 'unknown') {
  const variables = [];

  traverse(ast, {
    VariableDeclaration(path) {
      const node = path.node;
      node.declarations.forEach(decl => {
        if (t.isIdentifier(decl.id)) {
          variables.push({
            type: 'variable',
            name: decl.id.name,
            kind: node.kind, // 'const', 'let', 'var'
            loc: node.loc,
            filePath
          });
        }
      });
    }
  });

  return variables;
}

/**
 * Get parameter name from AST node
 * @param {Object} param - Parameter node
 * @returns {string} Parameter name
 */
function getParamName(param) {
  if (t.isIdentifier(param)) {
    return param.name;
  } else if (t.isRestElement(param)) {
    return `...${param.argument.name}`;
  } else if (t.isAssignmentPattern(param)) {
    return param.left.name;
  } else if (t.isObjectPattern(param)) {
    return '{...}';
  } else if (t.isArrayPattern(param)) {
    return '[...]';
  }
  return 'unknown';
}

export {
  parseCode,
  extractFunctions,
  extractClasses,
  extractImports,
  extractExports,
  extractVariables
};

// Made with Bob
