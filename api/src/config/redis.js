/**
 * Shared Redis connection for BullMQ (Upstash-compatible).
 */

import Redis from 'ioredis';

const PLACEHOLDER = /your[-_]|changeme|placeholder|example|your-redis\.upstash/i;

function isReal(value) {
  if (!value || typeof value !== 'string') return false;
  return !PLACEHOLDER.test(value);
}

/**
 * Resolve Redis URL: real UPSTASH_REDIS_URL, or build from REDIS_HOST + REDIS_PASSWORD.
 */
export function resolveRedisUrl() {
  const direct = process.env.UPSTASH_REDIS_URL?.trim();
  if (isReal(direct)) return direct;

  const host = process.env.REDIS_HOST?.trim();
  const password = process.env.REDIS_PASSWORD?.trim();
  const port = process.env.REDIS_PORT || '6379';

  if (isReal(host) && isReal(password)) {
    return `rediss://default:${encodeURIComponent(password)}@${host}:${port}`;
  }

  return null;
}

export function createRedisConnection() {
  const url = resolveRedisUrl();

  if (url) {
    return new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: url.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    });
  }

  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
