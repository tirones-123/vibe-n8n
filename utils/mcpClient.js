// utils/mcpClient.js
// Utility to communicate with n8n-mcp server via stdio using JSON-RPC 2.0 protocol.
// Implements the Model Context Protocol specification.
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

  const args = ['n8n-mcp', '--mode', 'stdio', '--db', MCP_DB_PATH, '--log-level', 'error'];
  mcpProcess = spawn('npx', args, {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: {
      ...process.env,
      DISABLE_CONSOLE_OUTPUT: 'true',
    },
  });

  console.log('[MCP] Starting n8n-mcp server via npx...');

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
        
        // Handle JSON-RPC 2.0 response
        if (msg.jsonrpc === '2.0' && msg.id !== undefined) {
          const resolver = pending.get(msg.id);
          if (resolver) {
            if (msg.error) {
              resolver.reject(new Error(msg.error.message || String(msg.error)));
            } else {
              resolver.resolve(msg.result);
            }
            pending.delete(msg.id);
          }
        }
        // Handle notifications (no response expected)
        else if (msg.jsonrpc === '2.0' && msg.method) {
          console.log('[MCP] Notification:', msg.method, msg.params);
        }
      } catch (err) {
        // Ignore malformed lines
        console.error('[MCP] Failed to parse line:', err.message, 'line:', line);
      }
    }
  });

  mcpProcess.on('exit', (code, signal) => {
    console.error(`[MCP] mcpProcess exited with code ${code} signal ${signal}`);
    // Reject all pending
    for (const { reject } of pending.values()) {
      reject(new Error('MCP process exited'));
    }
    pending.clear();
    mcpProcess = null;
  });

  mcpProcess.on('error', (err) => {
    console.error('[MCP] Process error:', err);
  });
}

// Initialize MCP connection with handshake
async function initializeMCP() {
  startProcess();
  
  // Send initialize request
  const initRequest = {
    jsonrpc: '2.0',
    id: requestId++,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: {
          listChanged: false
        },
        sampling: {}
      },
      clientInfo: {
        name: 'n8n-backend',
        version: '1.0.0'
      }
    }
  };

  return new Promise((resolve, reject) => {
    pending.set(initRequest.id, { resolve, reject });
    mcpProcess.stdin.write(JSON.stringify(initRequest) + '\n');
    
    setTimeout(() => {
      if (pending.has(initRequest.id)) {
        pending.delete(initRequest.id);
        reject(new Error('MCP initialization timed out'));
      }
    }, 10000);
  });
}

export async function callTool(name, args = {}) {
  // Ensure MCP is initialized
  if (!mcpProcess) {
    await initializeMCP();
  }
  
  const id = requestId++;
  const request = {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: {
      name,
      arguments: args
    }
  };

  const json = JSON.stringify(request);
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
  // Ensure MCP is initialized
  if (!mcpProcess) {
    await initializeMCP();
  }
  
  const id = requestId++;
  const request = {
    jsonrpc: '2.0',
    id,
    method: 'tools/list',
    params: {}
  };

  const json = JSON.stringify(request);
  mcpProcess.stdin.write(json + '\n');

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('MCP listTools timed out'));
      }
    }, 10000);
  });
} 