/**
 * Security API — handlers aligned with `lib/api.js` (Next.js client).
 */

import logger from '../utils/logger.js';

/**
 * POST /api/security/scan
 * Body: { repoId }
 */
export async function runSecurityScan(req, res) {
  try {
    const { repoId } = req.body || {};
    if (!repoId) {
      return res.status(400).json({ error: 'repoId is required' });
    }
    logger.info('[SecurityController] Scan requested', { repoId });
    return res.status(202).json({
      repoId,
      message: 'Security scan accepted (baseline stub — extend with real scanning).',
      securityScore: null,
      vulnerabilities: [],
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[SecurityController] runSecurityScan', { error: error.message });
    return res.status(500).json({ error: 'Failed to run security scan', message: error.message });
  }
}

/**
 * GET /api/security/report/:repoId
 */
export async function getSecurityReport(req, res) {
  try {
    const { repoId } = req.params;
    return res.json({
      repoId,
      securityScore: 85,
      vulnerabilities: [],
      risks: [],
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[SecurityController] getSecurityReport', { error: error.message });
    return res.status(500).json({ error: 'Failed to get security report', message: error.message });
  }
}
