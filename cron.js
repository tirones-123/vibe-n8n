#!/usr/bin/env node

import { spawn } from 'child_process';
import { logToFile, clearLogFile } from './scripts/log-to-file.js';

// Nettoyer les anciens logs
clearLogFile();

// Logger dans le fichier ET la console
logToFile('');
logToFile('='.repeat(60));
logToFile('🕐 CRON JOB RAILWAY - DÉBUT');
logToFile('='.repeat(60));
logToFile(`📅 Date: ${new Date().toISOString()}`);
logToFile(`🔧 PID: ${process.pid}`);
logToFile(`📦 Environnement: ${process.env.RAILWAY_ENVIRONMENT || 'local'}`);
logToFile('='.repeat(60));
logToFile('');

// Déterminer quelle commande exécuter basé sur les variables d'environnement
const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production';
const command = process.env.RAILWAY_CRON_COMMAND || (isRailway ? 'update-nodes' : 'update-nodes:docker');

logToFile(`🚀 Exécution de: npm run ${command}`);

// Timeout de sécurité : 5 minutes max
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const timeout = setTimeout(() => {
  logToFile('');
  logToFile('='.repeat(60));
  logToFile('❌ TIMEOUT: Le cron a dépassé 5 minutes !');
  logToFile('='.repeat(60));
  logToFile('');
  child.kill('SIGTERM');
  process.exit(1);
}, TIMEOUT_MS);

// Exécuter la commande avec capture des logs
const child = spawn('npm', ['run', command], {
  shell: true
});

// Capturer stdout
child.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim()) logToFile(line);
  });
});

// Capturer stderr
child.stderr.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim()) logToFile(`[ERROR] ${line}`);
  });
});

child.on('exit', (code) => {
  clearTimeout(timeout);
  logToFile('');
  logToFile('='.repeat(60));
  logToFile(`✅ CRON JOB RAILWAY - FIN (code: ${code})`);
  logToFile('='.repeat(60));
  logToFile('');
  process.exit(code);
}); 