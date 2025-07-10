// scripts/ensure-mcp-db.js
// Ensures the MCP SQLite database exists in the persistent volume.
// Called during postinstall (Railway build) and at runtime if needed.

import fs from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';

const DB_PATH = process.env.MCP_DB_PATH || (process.env.RAILWAY_VOLUME_MOUNT_PATH ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH}/nodes.db` : 'data/nodes.db');
const DB_DIR = path.dirname(DB_PATH);

function log(msg) {
  console.log(`[ensure-mcp-db] ${msg}`);
}

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  log(`Created directory ${DB_DIR}`);
}

if (fs.existsSync(DB_PATH)) {
  log(`Database already present at ${DB_PATH}`);
  // Already present, nothing more to do when imported as a module
  return;
}

log('Database not found, rebuilding via n8n-mcp rebuild (may take ~30s)...');

const result = spawnSync('npx', ['--yes', 'n8n-mcp', 'rebuild', '--db', DB_PATH], {
  stdio: 'inherit',
});

if (result.status !== 0) {
  console.error('Failed to rebuild nodes.db');
  throw new Error('Failed to rebuild nodes.db');
}

if (fs.existsSync(DB_PATH)) {
  log('Database rebuilt successfully.');
} else {
  throw new Error('Rebuild completed but database still missing.');
} 