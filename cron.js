#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('');
console.log('='.repeat(60));
console.log('🕐 CRON JOB RAILWAY - DÉBUT');
console.log('='.repeat(60));
console.log(`📅 Date: ${new Date().toISOString()}`);
console.log(`🔧 PID: ${process.pid}`);
console.log(`📦 Environnement: ${process.env.RAILWAY_ENVIRONMENT || 'local'}`);
console.log('='.repeat(60));
console.log('');

// Déterminer quelle commande exécuter basé sur les variables d'environnement
const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production';
const command = process.env.RAILWAY_CRON_COMMAND || (isRailway ? 'update-nodes' : 'update-nodes:docker');

console.log(`🚀 Exécution de: npm run ${command}`);

// Exécuter la commande
const child = spawn('npm', ['run', command], {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  console.log('');
  console.log('='.repeat(60));
  console.log(`✅ CRON JOB RAILWAY - FIN (code: ${code})`);
  console.log('='.repeat(60));
  console.log('');
  process.exit(code);
}); 