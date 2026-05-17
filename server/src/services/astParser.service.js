// ============================================
// CODEATLAS - AST Parsing Service
// ============================================

const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

/**
 * Parse JavaScript/TypeScript code to AST
 */
function parseCode(code, language = 'JavaScript') {
  try {
    const plugins = [];
    
    // Add plugins based on language
    if (language === 'TypeScript' || language.includes('TypeScript')) {
      plugins.push('typescript', 'jsx');
    } else {
      plugins.push('jsx', 'flow');
    }
    
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: [
        ...plugins,
        'classProperties',
        'decorators-legacy',
        'dynamicImport',
        'objectRestSpread',
        'asyncGenerators',
        'optionalChaining',
        'nullishCoalescingOperator'
      ],
      errorRecovery: true
    });
    
    return ast;
  } catch (error) {
    logger.error('Error parsing code:', error.message);
    return null;
  }
}

/**
 * Extract functions from AST
 */
function extractFunctions(ast, filePath) {
  const functions = [];
  
  if (!ast) return functions;
  
  try {
    traverse(ast, {
      FunctionDeclaration(path) {
        const node = path.node;
        functions.push({
          type: 'FUNCTION',
          name: node.id ? node.id.name : 'anonymous',
          startLine: node.loc?.start.line || 0,
          endLine: node.loc?.end.line || 0,
          startColumn: node.loc?.start.column || 0,
          endColumn: node.loc?.end.column || 0,
          isAsync: node.async || false,
          isExported: path.parent.type === 'ExportNamedDeclaration' || 
                     path.parent.type === 'ExportDefaultDeclaration',
          parameters: node.params.map(param => {
            if (param.type === 'Identifier') {
              return param.name;
            } else if (param.type === 'RestElement') {
              return `...${param.argument.name}`;
            }
            return 'unknown';
          }),
          filePath
        });
      },
      
      ArrowFunctionExpression(path) {
        const node = path.node;
        const parent = path.parent;
        
        let name = 'anonymous';
        if (parent.type === 'VariableDeclarator' && parent.id) {
          name = parent.id.name;
        } else if (parent.type === 'AssignmentExpression' && parent.left) {
          name = parent.left.name || 'anonymous';
        }
        
        functions.push({
          type: 'FUNCTION',
          name,
          startLine: node.loc?.start.line || 0,
          endLine: node.loc?.end.line || 0,
          startColumn: node.loc?.start.column || 0,
          endColumn: node.loc?.end.column || 0,
          isAsync: node.async || false,
          isExported: false,
          parameters: node.params.map(param => {
            if (param.type === 'Identifier') {
              return param.name;
            }
            return 'unknown';
          }),
          filePath
        });
      },
      
      FunctionExpression(path) {
        const node = path.node;
        const parent = path.parent;
        
        let name = node.id ? node.id.name : 'anonymous';
        if (parent.type === 'VariableDeclarator' && parent.id) {
          name = parent.id.name;
        }
        
        functions.push({
          type: 'FUNCTION',
          name,
          startLine: node.loc?.start.line || 0,
          endLine: node.loc?.end.line || 0,
          startColumn: node.loc?.start.column || 0,
          endColumn: node.loc?.end.column || 0,
          isAsync: node.async || false,
          isExported: false,
          parameters: node.params.map(param => {
            if (param.type === 'Identifier') {
              return param.name;
            }
            return 'unknown';
          }),
          filePath
        });
      }
    });
  } catch (error) {
    logger.error('Error extracting functions:', error.message);
  }
  
  return functions;
}

/**
 * Extract classes from AST
 */
function extractClasses(ast, filePath) {
  const classes = [];
  
  if (!ast) return classes;
  
  try {
    traverse(ast, {
      ClassDeclaration(path) {
        const node = path.node;
        const methods = [];
        
        // Extract methods
        if (node.body && node.body.body) {
          node.body.body.forEach(member => {
            if (member.type === 'ClassMethod') {
              methods.push({
                name: member.key.name || 'unknown',
                kind: member.kind, // 'constructor', 'method', 'get', 'set'
                isStatic: member.static || false,
                isAsync: member.async || false
              });
            }
          });
        }
        
        classes.push({
          type: 'CLASS',
          name: node.id ? node.id.name : 'anonymous',
          startLine: node.loc?.start.line || 0,
          endLine: node.loc?.end.line || 0,
          startColumn: node.loc?.start.column || 0,
          endColumn: node.loc?.end.column || 0,
          isExported: path.parent.type === 'ExportNamedDeclaration' || 
                     path.parent.type === 'ExportDefaultDeclaration',
          superClass: node.superClass ? node.superClass.name : null,
          methods,
          filePath
        });
      }
    });
  } catch (error) {
    logger.error('Error extracting classes:', error.message);
  }
  
  return classes;
}

/**
 * Extract imports from AST
 */
function extractImports(ast, filePath) {
  const imports = [];
  
  if (!ast) return imports;
  
  try {
    traverse(ast, {
      ImportDeclaration(path) {
        const node = path.node;
        
        const importedNames = node.specifiers.map(spec => {
          if (spec.type === 'ImportDefaultSpecifier') {
            return { name: spec.local.name, isDefault: true };
          } else if (spec.type === 'ImportSpecifier') {
            return { name: spec.local.name, isDefault: false };
          } else if (spec.type === 'ImportNamespaceSpecifier') {
            return { name: spec.local.name, isNamespace: true };
          }
          return { name: 'unknown', isDefault: false };
        });
        
        imports.push({
          source: node.source.value,
          importedNames,
          startLine: node.loc?.start.line || 0,
          filePath
        });
      },
      
      // Also handle require() calls
      CallExpression(path) {
        const node = path.node;
        if (node.callee.name === 'require' && node.arguments.length > 0) {
          const arg = node.arguments[0];
          if (arg.type === 'StringLiteral') {
            imports.push({
              source: arg.value,
              importedNames: [],
              isRequire: true,
              startLine: node.loc?.start.line || 0,
              filePath
            });
          }
        }
      }
    });
  } catch (error) {
    logger.error('Error extracting imports:', error.message);
  }
  
  return imports;
}

/**
 * Extract exports from AST
 */
function extractExports(ast, filePath) {
  const exports = [];
  
  if (!ast) return exports;
  
  try {
    traverse(ast, {
      ExportNamedDeclaration(path) {
        const node = path.node;
        
        if (node.declaration) {
          // export const/function/class
          if (node.declaration.type === 'VariableDeclaration') {
            node.declaration.declarations.forEach(decl => {
              exports.push({
                name: decl.id.name,
                type: 'named',
                startLine: node.loc?.start.line || 0,
                filePath
              });
            });
          } else if (node.declaration.id) {
            exports.push({
              name: node.declaration.id.name,
              type: 'named',
              startLine: node.loc?.start.line || 0,
              filePath
            });
          }
        } else if (node.specifiers) {
          // export { name }
          node.specifiers.forEach(spec => {
            exports.push({
              name: spec.exported.name,
              type: 'named',
              startLine: node.loc?.start.line || 0,
              filePath
            });
          });
        }
      },
      
      ExportDefaultDeclaration(path) {
        const node = path.node;
        let name = 'default';
        
        if (node.declaration.id) {
          name = node.declaration.id.name;
        }
        
        exports.push({
          name,
          type: 'default',
          startLine: node.loc?.start.line || 0,
          filePath
        });
      }
    });
  } catch (error) {
    logger.error('Error extracting exports:', error.message);
  }
  
  return exports;
}

/**
 * Extract React components from AST
 */
function extractComponents(ast, filePath) {
  const components = [];
  
  if (!ast) return components;
  
  try {
    traverse(ast, {
      // Function components
      FunctionDeclaration(path) {
        const node = path.node;
        const name = node.id ? node.id.name : 'anonymous';
        
        // Check if it returns JSX
        let returnsJSX = false;
        path.traverse({
          ReturnStatement(returnPath) {
            if (returnPath.node.argument && 
                returnPath.node.argument.type === 'JSXElement') {
              returnsJSX = true;
            }
          }
        });
        
        if (returnsJSX && /^[A-Z]/.test(name)) {
          components.push({
            type: 'COMPONENT',
            name,
            componentType: 'function',
            startLine: node.loc?.start.line || 0,
            endLine: node.loc?.end.line || 0,
            isExported: path.parent.type === 'ExportNamedDeclaration' || 
                       path.parent.type === 'ExportDefaultDeclaration',
            filePath
          });
        }
      },
      
      // Class components
      ClassDeclaration(path) {
        const node = path.node;
        const name = node.id ? node.id.name : 'anonymous';
        
        // Check if extends React.Component or Component
        const extendsReact = node.superClass && 
          (node.superClass.name === 'Component' || 
           node.superClass.name === 'PureComponent' ||
           (node.superClass.object && node.superClass.object.name === 'React'));
        
        if (extendsReact) {
          components.push({
            type: 'COMPONENT',
            name,
            componentType: 'class',
            startLine: node.loc?.start.line || 0,
            endLine: node.loc?.end.line || 0,
            isExported: path.parent.type === 'ExportNamedDeclaration' || 
                       path.parent.type === 'ExportDefaultDeclaration',
            filePath
          });
        }
      }
    });
  } catch (error) {
    logger.error('Error extracting components:', error.message);
  }
  
  return components;
}

/**
 * Calculate cyclomatic complexity (simplified)
 */
function calculateComplexity(ast) {
  let complexity = 1; // Base complexity
  
  if (!ast) return complexity;
  
  try {
    traverse(ast, {
      IfStatement() { complexity++; },
      ConditionalExpression() { complexity++; },
      ForStatement() { complexity++; },
      ForInStatement() { complexity++; },
      ForOfStatement() { complexity++; },
      WhileStatement() { complexity++; },
      DoWhileStatement() { complexity++; },
      SwitchCase(path) {
        if (path.node.test) complexity++; // Don't count default case
      },
      CatchClause() { complexity++; },
      LogicalExpression(path) {
        if (path.node.operator === '&&' || path.node.operator === '||') {
          complexity++;
        }
      }
    });
  } catch (error) {
    logger.error('Error calculating complexity:', error.message);
  }
  
  return complexity;
}

/**
 * Parse file and extract all entities
 */
async function parseFile(fileData) {
  try {
    const { content, relativePath, language } = fileData;
    
    // Only parse JavaScript/TypeScript files
    if (!['JavaScript', 'TypeScript'].includes(language)) {
      return {
        success: false,
        reason: 'Unsupported language for AST parsing'
      };
    }
    
    logger.info(`Parsing file: ${relativePath}`);
    
    // Parse code to AST
    const ast = parseCode(content, language);
    
    if (!ast) {
      return {
        success: false,
        reason: 'Failed to parse code'
      };
    }
    
    // Extract entities
    const functions = extractFunctions(ast, relativePath);
    const classes = extractClasses(ast, relativePath);
    const imports = extractImports(ast, relativePath);
    const exports = extractExports(ast, relativePath);
    const components = extractComponents(ast, relativePath);
    const complexity = calculateComplexity(ast);
    
    return {
      success: true,
      entities: {
        functions,
        classes,
        components,
        imports,
        exports
      },
      complexity,
      totalEntities: functions.length + classes.length + components.length
    };
  } catch (error) {
    logger.error(`Error parsing file ${fileData.relativePath}:`, error);
    return {
      success: false,
      reason: error.message
    };
  }
}

module.exports = {
  parseCode,
  parseFile,
  extractFunctions,
  extractClasses,
  extractImports,
  extractExports,
  extractComponents,
  calculateComplexity
};

// Made with Bob
