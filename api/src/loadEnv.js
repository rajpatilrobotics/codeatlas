/**
 * Load environment variables for the API process.
 * Order: repo root `.env` → root `.env.local` → `api/.env` (later wins).
 * Maps HUGGINGFACE_API_TOKEN → HUGGINGFACE_API_KEY when only the former is set.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.join(__dirname, '..');
const rootDir = path.join(apiDir, '..');

dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, '.env.local') });
// api/.env must override root (e.g. PORT=3001 vs Next PORT=3000)
dotenv.config({ path: path.join(apiDir, '.env'), override: true });

if (!process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_API_TOKEN) {
  process.env.HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_TOKEN;
}

// Root .env PORT=3000 is for Next.js; API always uses 3001 unless API_PORT is set
const apiPort = process.env.API_PORT || process.env.PORT;
if (!apiPort || apiPort === '3000') {
  process.env.PORT = '3001';
} else {
  process.env.PORT = apiPort;
}
