#!/usr/bin/env node
/**
 * Automated CommonJS to ES Module Converter
 * Converts all remaining .js files in the api/src directory
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src');

// Files to skip (already converted or special cases)
const skipFiles = new Set([
  'server.js', // Will handle separately
]);

function convertFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // Convert require() to import
  // Pattern: const X = require('Y');
  content = content.replace(
    /const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\);?/g,
    (match, varName, modulePath) => {
      modified = true;
      // Add .js extension if it's a relative path without extension
      if (modulePath.startsWith('.') && !modulePath.endsWith('.js')) {
        modulePath += '.js';
      }
      return `import ${varName} from '${modulePath}';`;
    }
  );

  // Pattern: const { X, Y } = require('Z');
  content = content.replace(
    /const\s+\{([^}]+)\}\s*=\s*require\(['"]([^'"]+)['"]\);?/g,
    (match, imports, modulePath) => {
      modified = true;
      if (modulePath.startsWith('.') && !modulePath.endsWith('.js')) {
        modulePath += '.js';
      }
      return `import {${imports}} from '${modulePath}';`;
    }
  );

  // Convert module.exports to export
  content = content.replace(
    /module\.exports\s*=\s*\{([^}]+)\};?/g,
    (match, exports) => {
      modified = true;
      return `export {${exports}};`;
    }
  );

  // Convert module.exports = X to export default X
  content = content.replace(
    /module\.exports\s*=\s*([^;]+);?/g,
    (match, exportValue) => {
      modified = true;
      // Check if it's a class instantiation
      if (exportValue.includes('new ')) {
        const varName = exportValue.match(/new\s+(\w+)/)?.[1];
        if (varName) {
          const camelCase = varName.charAt(0).toLowerCase() + varName.slice(1);
          return `const ${camelCase} = ${exportValue};\nexport default ${camelCase};`;
        }
      }
      return `export default ${exportValue};`;
    }
  );

  // Convert require('fs').promises to import fs and const fsPromises
  content = content.replace(
    /const\s+fs\s*=\s*require\(['"]fs['"]\)\.promises;?/g,
    () => {
      modified = true;
      return `import fs from 'fs';\nconst fsPromises = fs.promises;`;
    }
  );

  // Replace fs. with fsPromises. where appropriate
  if (content.includes('fsPromises')) {
    content = content.replace(/\bfs\.(readFile|writeFile|readdir|stat|mkdir|rm|access)\(/g, 'fsPromises.$1(');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Converted: ${path.relative(srcDir, filePath)}`);
    return true;
  }

  return false;
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let convertedCount = 0;

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      convertedCount += processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      if (!skipFiles.has(entry.name)) {
        if (convertFile(fullPath)) {
          convertedCount++;
        }
      }
    }
  }

  return convertedCount;
}

console.log('🔄 Starting ES Module conversion...\n');
const count = processDirectory(srcDir);
console.log(`\n✨ Conversion complete! ${count} files converted.`);

// Made with Bob
