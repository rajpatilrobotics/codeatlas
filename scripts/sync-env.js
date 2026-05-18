#!/usr/bin/env node
/**
 * Merge backend env vars from repo root `.env` into `api/.env`.
 * Real values in either file are kept; api/.env wins on conflict.
 * Does not print secret values.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const rootEnvPath = path.join(root, '.env');
const apiEnvPath = path.join(root, 'api', '.env');

const BACKEND_KEYS = new Set([
  'NODE_ENV',
  'PORT',
  'FRONTEND_URL',
  'DATABASE_URL',
  'UPSTASH_REDIS_URL',
  'UPSTASH_REDIS_TOKEN',
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_PASSWORD',
  'REDIS_TLS',
  'QDRANT_URL',
  'QDRANT_API_KEY',
  'QDRANT_COLLECTION',
  'QDRANT_COLLECTION_NAME',
  'HUGGINGFACE_API_KEY',
  'HUGGINGFACE_API_TOKEN',
  'HUGGINGFACE_MODEL',
  'DEEPSEEK_API_KEY',
  'DEEPSEEK_BASE_URL',
  'DEEPSEEK_MODEL',
  'GITHUB_TOKEN',
  'GITHUB_API_URL',
  'SENTRY_DSN',
  'SENTRY_ENVIRONMENT',
  'JWT_SECRET',
  'API_KEY',
  'LOG_LEVEL',
  'QUEUE_CONCURRENCY',
  'QUEUE_MAX_RETRIES',
  'QUEUE_RETRY_DELAY',
  'MAX_FILE_SIZE_MB',
  'IGNORED_DIRECTORIES',
  'IGNORED_EXTENSIONS',
  'EMBEDDING_DIMENSION',
  'CHUNK_SIZE',
  'CHUNK_OVERLAP',
  'MAX_CHUNKS_PER_FILE',
  'MAX_CONTEXT_LENGTH',
  'TEMPERATURE',
  'MAX_TOKENS',
  'TOP_P',
  'ENABLE_BULL_BOARD',
]);

const PLACEHOLDER = /your[-_]|changeme|placeholder|example|password@host|sk-your|hf_your|ghp_your|username:password|user:password@host/i;

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    out[key] = value;
  }
  return out;
}

function isReal(value) {
  if (!value) return false;
  return !PLACEHOLDER.test(value);
}

function pick(merged, key) {
  return merged[key] ?? '';
}

const rootVars = parseEnv(rootEnvPath);
const apiVars = parseEnv(apiEnvPath);
const merged = { ...rootVars };

for (const [k, v] of Object.entries(apiVars)) {
  if (isReal(v) || !isReal(merged[k])) merged[k] = v;
}

if (!merged.HUGGINGFACE_API_KEY && merged.HUGGINGFACE_API_TOKEN) {
  merged.HUGGINGFACE_API_KEY = merged.HUGGINGFACE_API_TOKEN;
}
if (!merged.QDRANT_COLLECTION && merged.QDRANT_COLLECTION_NAME) {
  merged.QDRANT_COLLECTION = merged.QDRANT_COLLECTION_NAME;
}

const lines = [
  '# CodeAtlas API — auto-synced from root .env + api/.env',
  '# Run: npm run env:sync   |   API also loads ../.env at startup (see api/src/loadEnv.js)',
  '',
  '# Server',
  `NODE_ENV=${pick(merged, 'NODE_ENV') || 'development'}`,
  `API_PORT=${pick(merged, 'API_PORT') || pick(merged, 'PORT') || '3001'}`,
  `PORT=3001`,
  `FRONTEND_URL=${pick(merged, 'FRONTEND_URL') || 'http://localhost:3000'}`,
  '',
  '# Database (Neon PostgreSQL)',
  `DATABASE_URL=${pick(merged, 'DATABASE_URL')}`,
  '',
  '# Redis — prefer UPSTASH_REDIS_URL; or REDIS_HOST + REDIS_PASSWORD',
  `UPSTASH_REDIS_URL=${pick(merged, 'UPSTASH_REDIS_URL')}`,
  `UPSTASH_REDIS_TOKEN=${pick(merged, 'UPSTASH_REDIS_TOKEN')}`,
  `REDIS_HOST=${pick(merged, 'REDIS_HOST')}`,
  `REDIS_PORT=${pick(merged, 'REDIS_PORT') || '6379'}`,
  `REDIS_PASSWORD=${pick(merged, 'REDIS_PASSWORD')}`,
  `REDIS_TLS=${pick(merged, 'REDIS_TLS') || 'true'}`,
  '',
  '# Qdrant',
  `QDRANT_URL=${pick(merged, 'QDRANT_URL')}`,
  `QDRANT_API_KEY=${pick(merged, 'QDRANT_API_KEY')}`,
  `QDRANT_COLLECTION=${pick(merged, 'QDRANT_COLLECTION') || pick(merged, 'QDRANT_COLLECTION_NAME') || 'codeatlas'}`,
  '',
  '# AI',
  `HUGGINGFACE_API_KEY=${pick(merged, 'HUGGINGFACE_API_KEY')}`,
  `HUGGINGFACE_MODEL=${pick(merged, 'HUGGINGFACE_MODEL') || 'Alibaba-NLP/gte-Qwen2-7B-instruct'}`,
  `DEEPSEEK_API_KEY=${pick(merged, 'DEEPSEEK_API_KEY')}`,
  `DEEPSEEK_BASE_URL=${pick(merged, 'DEEPSEEK_BASE_URL') || 'https://api.deepseek.com'}`,
  `DEEPSEEK_MODEL=${pick(merged, 'DEEPSEEK_MODEL') || 'deepseek-chat'}`,
  '',
  '# GitHub',
  `GITHUB_TOKEN=${pick(merged, 'GITHUB_TOKEN')}`,
  '',
  '# Optional',
  `SENTRY_DSN=${pick(merged, 'SENTRY_DSN')}`,
  `SENTRY_ENVIRONMENT=${pick(merged, 'SENTRY_ENVIRONMENT') || 'development'}`,
  `JWT_SECRET=${pick(merged, 'JWT_SECRET')}`,
  `API_KEY=${pick(merged, 'API_KEY')}`,
  `LOG_LEVEL=${pick(merged, 'LOG_LEVEL') || 'info'}`,
  '',
];

fs.writeFileSync(apiEnvPath, lines.join('\n'));
console.log('Wrote', apiEnvPath);

let real = 0;
let missing = 0;
for (const k of ['DATABASE_URL', 'UPSTASH_REDIS_URL', 'REDIS_PASSWORD', 'QDRANT_URL', 'QDRANT_API_KEY', 'DEEPSEEK_API_KEY', 'HUGGINGFACE_API_KEY', 'GITHUB_TOKEN']) {
  const v = merged[k] || (k === 'HUGGINGFACE_API_KEY' ? merged.HUGGINGFACE_API_TOKEN : '');
  const redisOk = isReal(merged.UPSTASH_REDIS_URL) || (isReal(merged.REDIS_HOST) && isReal(merged.REDIS_PASSWORD));
  if (k === 'UPSTASH_REDIS_URL') {
    if (redisOk) real++;
    else missing++;
    continue;
  }
  if (isReal(v)) real++;
  else missing++;
}
console.log(`Backend secrets: ${real} configured, ${missing} still need real values (edit root .env or api/.env)`);
