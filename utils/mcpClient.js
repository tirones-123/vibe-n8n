// utils/mcpClient.js
// Utility to communicate with n8n-mcp server via stdio.
// Starts the MCP process lazily and keeps a map of pending requests.
// Usage: await callTool('get_node_essentials', { nodeType: 'n8n-nodes-base.httpRequest' });

import { spawn } from 'child_process';
import { once } from 'events';

// Configurable path to DB (used by ensure-db script)
const MCP_DB_PATH = process.env.MCP_DB_PATH || (process.env.RAILWAY_VOLUME_MOUNT_PATH ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH}/nodes.db` : 'data/nodes.db');

let mcpProcess = null;
let requestId = 1;
const pending = new Map();

function startProcess() {
  if (mcpProcess) return;

  const args = ['--mode', 'stdio', '--db', MCP_DB_PATH, '--log-level', 'error'];
  mcpProcess = spawn('n8n-mcp', args, {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: {
      ...process.env,
      DISABLE_CONSOLE_OUTPUT: 'true',
    },
  });

  let buffer = '';
  mcpProcess.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        const { id, result, error } = msg;
        const resolver = pending.get(id);
        if (resolver) {
          if (error) resolver.reject(new Error(error.message || String(error)));
          else resolver.resolve(result);
          pending.delete(id);
        }
      } catch (err) {
        // Ignore malformed lines
        console.error('Failed to parse MCP line:', err, 'line:', line);
      }
    }
  });

  mcpProcess.on('exit', (code, signal) => {
    console.error(`mcpProcess exited with code ${code} signal ${signal}`);
    // Reject all pending
    for (const { reject } of pending.values()) {
      reject(new Error('MCP process exited'));
    }
    pending.clear();
    mcpProcess = null;
  });
}

export async function callTool(name, args = {}) {
  startProcess();
  const id = requestId++;
  const payload = { id, name, arguments: args };

  const json = JSON.stringify(payload);
  mcpProcess.stdin.write(json + '\n');

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    // Timeout after 30s
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`MCP tool ${name} timed out`));
      }
    }, 30000);
  });
}

export async function listTools() {
  // Try official tool name list_tools (snake_case)
  try {
    const result = await callTool('list_tools', {});
    if (result && Array.isArray(result.tools)) return result;
  } catch (err) {
    // ignore and fallback
  }
  // Fallback to tools/list if server supports that
  try {
    const result = await callTool('tools/list', {});
    return result;
  } catch (err) {
    console.error('[MCP] listTools failed:', err.message);
    return { tools: [] };
  }
} 