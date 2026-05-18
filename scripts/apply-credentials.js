#!/usr/bin/env node
/**
 * Read credentials.dump.env and apply to root .env + api/.env
 * Does not print secret values.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const dumpPath = path.join(root, 'credentials.dump.env');
const examplePath = path.join(root, 'credentials.dump.env.example');
const rootEnvPath = path.join(root, '.env');

const PLACEHOLDER = /your[-_]|changeme|placeholder|example|password@host|sk-your|hf_your|ghp_your|username:password|user:password@host/i;

/** Map alias names from Bob / other tools → canonical env keys */
const ALIASES = {
  NEON_DATABASE_URL: 'DATABASE_URL',
  POSTGRES_URL: 'DATABASE_URL',
  DATABASE_URL: 'DATABASE_URL',
  UPSTASH_REDIS_URL: 'UPSTASH_REDIS_URL',
  REDIS_URL: 'UPSTASH_REDIS_URL',
  UPSTASH_REDIS_TOKEN: 'UPSTASH_REDIS_TOKEN',
  REDIS_HOST: 'REDIS_HOST',
  REDIS_PORT: 'REDIS_PORT',
  REDIS_PASSWORD: 'REDIS_PASSWORD',
  REDIS_TLS: 'REDIS_TLS',
  QDRANT_URL: 'QDRANT_URL',
  QDRANT_API_KEY: 'QDRANT_API_KEY',
  QDRANT_COLLECTION: 'QDRANT_COLLECTION',
  QDRANT_COLLECTION_NAME: 'QDRANT_COLLECTION_NAME',
  HUGGINGFACE_API_KEY: 'HUGGINGFACE_API_KEY',
  HUGGINGFACE_API_TOKEN: 'HUGGINGFACE_API_TOKEN',
  HF_API_KEY: 'HUGGINGFACE_API_KEY',
  HF_TOKEN: 'HUGGINGFACE_API_TOKEN',
  HUGGINGFACE_TOKEN: 'HUGGINGFACE_API_TOKEN',
  DEEPSEEK_API_KEY: 'DEEPSEEK_API_KEY',
  DEEPSEEK_KEY: 'DEEPSEEK_API_KEY',
  GITHUB_TOKEN: 'GITHUB_TOKEN',
  GITHUB_API_KEY: 'GITHUB_TOKEN',
  GITHUB_PAT: 'GITHUB_TOKEN',
  NEXT_PUBLIC_API_URL: 'NEXT_PUBLIC_API_URL',
  SENTRY_DSN: 'SENTRY_DSN',
  JWT_SECRET: 'JWT_SECRET',
  API_KEY: 'API_KEY',
  FRONTEND_URL: 'FRONTEND_URL',
  HUGGINGFACE_MODEL: 'HUGGINGFACE_MODEL',
  DEEPSEEK_BASE_URL: 'DEEPSEEK_BASE_URL',
  DEEPSEEK_MODEL: 'DEEPSEEK_MODEL',
};

function parseEnv(content) {
  const out = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const rawKey = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!value) continue;
    const key = ALIASES[rawKey] || rawKey;
    if (!isReal(value)) continue;
    out[key] = value;
  }
  return out;
}

function isReal(value) {
  if (!value) return false;
  return !PLACEHOLDER.test(value);
}

function normalizeDump(vars) {
  const out = { ...vars };
  if (!out.HUGGINGFACE_API_KEY && out.HUGGINGFACE_API_TOKEN) {
    out.HUGGINGFACE_API_KEY = out.HUGGINGFACE_API_TOKEN;
  }
  if (!out.QDRANT_COLLECTION && out.QDRANT_COLLECTION_NAME) {
    out.QDRANT_COLLECTION = out.QDRANT_COLLECTION_NAME;
  }
  return out;
}

function applyToEnvFile(filePath, dumpVars) {
  if (!fs.existsSync(filePath)) {
    console.error('Missing', filePath);
    return 0;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const seen = new Set();
  let updated = 0;

  const newLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return line;
    const key = trimmed.slice(0, eq).trim();
    if (dumpVars[key] === undefined) return line;
    seen.add(key);
    updated++;
    return `${key}=${dumpVars[key]}`;
  });

  const toAppend = [];
  for (const [key, value] of Object.entries(dumpVars)) {
    if (!seen.has(key)) {
      toAppend.push(`${key}=${value}`);
      updated++;
    }
  }

  if (toAppend.length) {
    newLines.push('', '# --- applied from credentials.dump.env ---', ...toAppend);
  }

  fs.writeFileSync(filePath, newLines.join('\n'));
  return updated;
}

// --- main ---
if (!fs.existsSync(dumpPath)) {
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, dumpPath);
    console.log('Created credentials.dump.env from example.');
    console.log('Paste your secrets into credentials.dump.env, save, then run:');
    console.log('  npm run credentials:apply');
    process.exit(0);
  }
  console.error('Missing credentials.dump.env — run: cp credentials.dump.env.example credentials.dump.env');
  process.exit(1);
}

const dumpVars = normalizeDump(parseEnv(fs.readFileSync(dumpPath, 'utf8')));
const keyCount = Object.keys(dumpVars).length;

if (keyCount === 0) {
  console.log('No real credentials found in credentials.dump.env');
  console.log('Paste your keys (non-empty values), save the file, and run again.');
  process.exit(1);
}

console.log(`Found ${keyCount} credential(s) in credentials.dump.env`);

const rootUpdates = applyToEnvFile(rootEnvPath, dumpVars);
console.log(`Updated ${rootUpdates} value(s) in .env`);

execSync('node scripts/sync-env.js', { cwd: root, stdio: 'inherit' });

console.log('');
console.log('Done. Start the app:  npm run dev:all');
console.log('(credentials.dump.env stays on your machine — do not commit it)');
