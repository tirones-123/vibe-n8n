// utils/mcpServer.js
// Start a local n8n-mcp server in HTTP mode (one instance per process)
// Returns the base URL, e.g. http://127.0.0.1:3333

import { spawn } from 'child_process';

export function startMcpHttp() {
  if (global.__mcpProcess) {
    return global.__mcpBaseUrl;
  }

  const port = process.env.MCP_PORT || '3333';
  const dbPath = process.env.MCP_DB_PATH || (process.env.RAILWAY_VOLUME_MOUNT_PATH ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH}/nodes.db` : 'data/nodes.db');

  const args = [
    'start:http',
    '--db', dbPath,
    '--port', port,
    '--log-level', process.env.MCP_LOG_LEVEL || 'error',
  ];

  const child = spawn('npx', ['--yes', 'n8n-mcp', ...args], {
    stdio: 'inherit',
    env: { ...process.env },
  });

  global.__mcpProcess = child;
  global.__mcpBaseUrl = `http://127.0.0.1:${port}`;

  child.on('exit', (code, signal) => {
    console.error(`[MCP] process exited with code ${code} signal ${signal}`);
    delete global.__mcpProcess;
    delete global.__mcpBaseUrl;
  });

  console.log(`[MCP] server started on ${global.__mcpBaseUrl}`);
  return global.__mcpBaseUrl;
} 