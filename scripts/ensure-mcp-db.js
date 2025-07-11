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
  process.exit(0);
}

log('Database not found, trying to copy pre-built DB shipped with n8n-mcp...');

try {
  const pkgJson = require.resolve('n8n-mcp/package.json');
  const pkgDir = path.dirname(pkgJson);
  const shippedDb = path.join(pkgDir, 'data', 'nodes.db');
  if (fs.existsSync(shippedDb)) {
    fs.copyFileSync(shippedDb, DB_PATH);
    log('Copied bundled nodes.db from n8n-mcp package.');
    process.exit(0);
  }
} catch (copyErr) {
  log('Could not copy bundled DB (' + copyErr.message + '), falling back to rebuild.');
}

log('Rebuilding via n8n-mcp (timeout 60s)...');
const result = spawnSync('npx', ['--yes', 'n8n-mcp', 'rebuild', '--db', DB_PATH], {
  stdio: 'inherit',
  timeout: 60000, // 60 seconds safety
});

if (result.error && result.error.code === 'ETIMEDOUT') {
  console.error('n8n-mcp rebuild timed out (60s). Build aborted.');
  process.exit(1);
}

if (result.status !== 0) {
  console.error('Failed to rebuild nodes.db');
  process.exit(result.status || 1);
}

if (fs.existsSync(DB_PATH)) {
  log('Database rebuilt successfully.');
} else {
  console.error('Rebuild completed but database still missing.');
  process.exit(1);
} 