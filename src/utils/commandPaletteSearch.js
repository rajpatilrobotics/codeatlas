/**
 * Build and filter command palette items from repo analysis data.
 */

import { GRAPH_NODE_SAMPLES } from '../config/commandPalette';

function normalize(str) {
  return (str || '').toLowerCase().trim();
}

function scoreMatch(query, text, keywords = '') {
  const q = normalize(query);
  if (!q) return 1;
  const hay = `${normalize(text)} ${normalize(keywords)}`;
  if (hay === q) return 100;
  if (hay.startsWith(q)) return 80;
  if (hay.includes(q)) return 60;
  const parts = q.split(/\s+/).filter(Boolean);
  if (parts.every((p) => hay.includes(p))) return 40;
  return 0;
}

export function buildPaletteItems({ query, repoData, codeAnalysis, staticCommands }) {
  const items = [];
  const q = normalize(query);

  staticCommands.forEach((cmd) => {
    const score = scoreMatch(q, cmd.label, cmd.keywords);
    if (score > 0 || !q) {
      items.push({
        type: 'command',
        id: cmd.id,
        label: cmd.label,
        group: cmd.group,
        icon: cmd.icon || null,
        tabId: cmd.tabId,
        action: cmd.action,
        score: score || (q ? 0 : 50),
      });
    }
  });

  if (repoData?.fileTree?.length) {
    const files = repoData.fileTree
      .filter((path) => {
        if (!q) return path.split('/').pop().includes('.') && !path.includes('node_modules');
        return scoreMatch(q, path) > 0;
      })
      .map((path) => ({
        type: 'file',
        id: `file-${path}`,
        label: path,
        group: 'Files',
        path,
        score: q ? scoreMatch(q, path) : 10,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, q ? 12 : 6);

    items.push(...files);
  }

  if (codeAnalysis?.files?.length) {
    const routes = [];
    const routePatterns = [
      /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    ];

    codeAnalysis.files.forEach((file) => {
      if (!file.content) return;
      routePatterns.forEach((pattern) => {
        const matches = [...file.content.matchAll(pattern)];
        matches.forEach((match) => {
          const label = `${match[1].toUpperCase()} ${match[2]}`;
          const score = q ? scoreMatch(q, label, file.path) : 5;
          if (score > 0 || !q) {
            routes.push({
              type: 'api',
              id: `api-${file.path}-${match[2]}-${match[1]}`,
              label,
              sublabel: file.path,
              group: 'APIs',
              tabId: 'documentation',
              score,
            });
          }
        });
      });
    });

    items.push(
      ...routes
        .sort((a, b) => b.score - a.score)
        .slice(0, q ? 8 : 4)
    );
  }

  if (codeAnalysis?.definitions?.functions?.length) {
    const fns = codeAnalysis.definitions.functions
      .map((fn) => {
        const label = fn.name || 'anonymous';
        const sublabel = fn.file;
        const score = q ? scoreMatch(q, label, sublabel) : 3;
        return score > 0 || !q
          ? {
              type: 'graph-node',
              id: `fn-${fn.file}-${fn.line}-${label}`,
              label,
              sublabel,
              group: 'Graph nodes',
              tabId: 'repository-graph',
              score,
            }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, q ? 8 : 0);

    items.push(...fns);
  }

  GRAPH_NODE_SAMPLES.forEach((name) => {
    const score = q ? scoreMatch(q, name, 'graph node module') : 2;
    if (score > 0 || !q) {
      items.push({
        type: 'graph-node',
        id: `sample-node-${name}`,
        label: name,
        group: 'Graph nodes',
        tabId: 'repository-graph',
        score,
      });
    }
  });

  if (!repoData && q) {
    items.push({
      type: 'hint',
      id: 'hint-analyze',
      label: 'Analyze a repository to search files and APIs',
      group: 'Hints',
      score: 1,
      disabled: true,
    });
  }

  return items
    .sort((a, b) => b.score - a.score)
    .slice(0, 24);
}

export function groupPaletteItems(items) {
  const order = ['Workflows', 'Intelligence', 'AI', 'Workspaces', 'Actions', 'Files', 'APIs', 'Graph nodes', 'Hints'];
  const groups = {};

  items.forEach((item) => {
    const g = item.group || 'Other';
    if (!groups[g]) groups[g] = [];
    groups[g].push(item);
  });

  return order
    .filter((g) => groups[g]?.length)
    .concat(Object.keys(groups).filter((g) => !order.includes(g)))
    .map((g) => ({ name: g, items: groups[g] }));
}
