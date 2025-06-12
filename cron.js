#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🕐 Cron job Railway démarré');
console.log(`📅 Date: ${new Date().toISOString()}`);

// Déterminer quelle commande exécuter basé sur les variables d'environnement
const command = process.env.RAILWAY_CRON_COMMAND || 'update-nodes:docker';

console.log(`🚀 Exécution de: npm run ${command}`);

// Exécuter la commande
const child = spawn('npm', ['run', command], {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  console.log(`✅ Cron job terminé avec le code: ${code}`);
  process.exit(code);
}); 