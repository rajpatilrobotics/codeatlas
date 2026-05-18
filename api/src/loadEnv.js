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
dotenv.config({ path: path.join(apiDir, '.env') });

if (!process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_API_TOKEN) {
  process.env.HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_TOKEN;
}
