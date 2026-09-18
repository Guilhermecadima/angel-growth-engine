import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Campaign } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(__dirname, '../data/campaigns.json');

async function ensure() {
  try { await fs.access(file); }
  catch { await fs.writeFile(file, '[]', 'utf8'); }
}

export async function readCampaigns(): Promise<Campaign[]> {
  await ensure();
  return JSON.parse(await fs.readFile(file, 'utf8')) as Campaign[];
}

export async function writeCampaigns(items: Campaign[]) {
  await ensure();
  await fs.writeFile(file, JSON.stringify(items, null, 2), 'utf8');
}
