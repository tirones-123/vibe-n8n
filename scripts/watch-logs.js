#!/usr/bin/env node

/**
 * Script pour surveiller les logs du backend en temps réel
 * Usage: npm run logs
 */

import { spawn } from 'child_process';
import chalk from 'chalk';

console.log(chalk.blue.bold('\n🔍 Surveillance des logs du backend n8n AI Assistant\n'));
console.log(chalk.gray('Appuyez sur Ctrl+C pour arrêter\n'));

// Démarrer le serveur avec nodemon pour voir les logs
const server = spawn('npm', ['run', 'dev'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});

// Fonction pour formater les logs
function formatLog(data) {
  const lines = data.toString().split('\n');
  
  lines.forEach(line => {
    if (!line.trim()) return;
    
    // Colorer différents types de logs
    if (line.includes('=== NOUVELLE REQUÊTE CLAUDE ===')) {
      console.log(chalk.cyan.bold(line));
    } else if (line.includes('Timestamp:')) {
      console.log(chalk.gray(line));
    } else if (line.includes('Body:') || line.includes('prompt:')) {
      console.log(chalk.yellow(line));
    } else if (line.includes('Nodes identifiés:')) {
      console.log(chalk.green.bold(line));
    } else if (line.includes('✅')) {
      console.log(chalk.green(line));
    } else if (line.includes('❌')) {
      console.log(chalk.red(line));
    } else if (line.includes('--- CONTEXTE ENVOYÉ À CLAUDE OPUS ---')) {
      console.log(chalk.magenta.bold(line));
    } else if (line.includes('ERROR') || line.includes('Erreur')) {
      console.log(chalk.red.bold(line));
    } else if (line.includes('🚀')) {
      console.log(chalk.blue.bold(line));
    } else {
      console.log(line);
    }
  });
}

// Capturer stdout
server.stdout.on('data', formatLog);

// Capturer stderr
server.stderr.on('data', (data) => {
  console.error(chalk.red(data.toString()));
});

// Gérer la fermeture
server.on('close', (code) => {
  console.log(chalk.yellow(`\nServeur arrêté avec le code ${code}`));
  process.exit(code);
});

// Gérer Ctrl+C
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\nArrêt du serveur...'));
  server.kill('SIGINT');
}); 