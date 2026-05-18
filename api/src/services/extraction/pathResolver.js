/**
 * Resolve relative import paths to file entity IDs.
 */

function normalizePath(p) {
  return String(p).replace(/\\/g, '/');
}

/**
 * @param {string} importPath - e.g. './types' or '../utils'
 * @param {string} currentFilePath - e.g. 'source/index.ts'
 * @param {Array<{ id: string, path: string }>} files - file entities
 * @returns {string|null} file entity id
 */
export function resolveImportPath(importPath, currentFilePath, files) {
  if (!importPath || !currentFilePath || !files?.length) return null;

  if (importPath.startsWith('file:')) {
    return files.some((f) => f.id === importPath) ? importPath : null;
  }

  const normalizedImport = normalizePath(importPath);
  const sourceParts = normalizePath(currentFilePath).split('/');
  sourceParts.pop();
  const importParts = normalizedImport.split('/');

  const resolved = [];
  for (const part of [...sourceParts, ...importParts]) {
    if (!part || part === '.') continue;
    if (part === '..') {
      resolved.pop();
      continue;
    }
    resolved.push(part);
  }

  const base = resolved.join('/');
  const candidates = new Set([
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.jsx`,
  ]);

  for (const candidate of candidates) {
    const match = files.find(
      (f) =>
        f.path === candidate ||
        f.path.endsWith(`/${candidate}`) ||
        f.path.replace(/\.(tsx?|jsx?)$/, '') === candidate.replace(/\.(tsx?|jsx?)$/, '')
    );
    if (match) return match.id;
  }

  const filename = normalizedImport.split('/').pop();
  if (filename) {
    const byName = files.find(
      (f) =>
        f.path === filename ||
        f.path.endsWith(`/${filename}`) ||
        f.path.split('/').pop() === filename
    );
    if (byName) return byName.id;
  }

  return null;
}

export function buildFileIdForRepository(repositoryId, filePath) {
  return `${repositoryId}_${filePath}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}
