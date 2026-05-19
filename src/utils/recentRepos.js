import { parseGitHubUrl } from '../services/githubService';

const STORAGE_KEY = 'codeatlas_recent_repos';
const MAX_RECENT = 8;

export function normalizeRepoUrl(url) {
  const parsed = parseGitHubUrl(url);
  if (!parsed) return null;
  return `https://github.com/${parsed.owner}/${parsed.repo}`;
}

export function formatRepoLabel(url) {
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    return String(url || '')
      .replace(/^https?:\/\/github\.com\//, '')
      .replace(/\/$/, '')
      .replace(/\.git$/, '');
  }
  return `${parsed.owner}/${parsed.repo}`;
}

export function urlsMatch(a, b) {
  if (!a || !b) return false;
  const na = normalizeRepoUrl(a);
  const nb = normalizeRepoUrl(b);
  return Boolean(na && nb && na === nb);
}

export function getRecentRepos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item?.url && item?.label)
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function addRecentRepo(url) {
  const normalized = normalizeRepoUrl(url);
  if (!normalized) return getRecentRepos();

  const label = formatRepoLabel(normalized);
  const entry = { url: normalized, label, analyzedAt: Date.now() };
  const existing = getRecentRepos().filter((r) => r.url !== normalized);
  const next = [entry, ...existing].slice(0, MAX_RECENT);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota errors */
  }
  return next;
}

export function clearRecentRepos() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function formatRelativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
