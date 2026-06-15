const PDF_STATE_PREFIX = 'codeatlasPdfState';

export function getRepoPdfKey(repoData) {
  const repoInfo = repoData?.repoInfo || {};
  return String(
    repoInfo.url ||
    repoInfo.full_name ||
    repoInfo.name ||
    'unknown-repository'
  )
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._/-]+/g, '-')
    .slice(0, 180);
}

export function getPdfStateStorageKey(section, repoData) {
  return `${PDF_STATE_PREFIX}:${section}:${getRepoPdfKey(repoData)}`;
}

export function savePdfState(section, repoData, payload, storage = window.sessionStorage) {
  if (!storage || !repoData) return;

  try {
    storage.setItem(
      getPdfStateStorageKey(section, repoData),
      JSON.stringify({
        ...payload,
        savedAt: new Date().toISOString()
      })
    );
  } catch (error) {
    console.warn(`Could not save PDF state for ${section}:`, error);
  }
}

export function clearPdfState(section, repoData, storage = window.sessionStorage) {
  if (!storage || !repoData) return;

  try {
    storage.removeItem(getPdfStateStorageKey(section, repoData));
  } catch (error) {
    console.warn(`Could not clear PDF state for ${section}:`, error);
  }
}

export function readPdfState(section, repoData, storage = window.sessionStorage) {
  if (!storage || !repoData) return null;

  try {
    const raw = storage.getItem(getPdfStateStorageKey(section, repoData));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn(`Could not read PDF state for ${section}:`, error);
    return null;
  }
}
