#!/usr/bin/env node

import dotenv from 'dotenv';
import { spawn } from 'child_process';
import { updateNodeTypesIndex } from '../api/rag/node-types-rag.js';
import fs from 'fs/promises';
import path from 'path';

// Charger les variables d'environnement
dotenv.config();

// Configuration
const N8N_VERSION = process.env.N8N_VERSION || 'latest';
const N8N_PORT = process.env.N8N_PORT || 5678;
const ARCHIVE_DIR = path.join(process.cwd(), 'archives', 'node-types');

async function ensureArchiveDir() {
  try {
    await fs.mkdir(ARCHIVE_DIR, { recursive: true });
  } catch (error) {
    console.error('Erreur création dossier archives:', error);
  }
}

async function startN8nDocker() {
  console.log(`🐳 Démarrage de n8n:${N8N_VERSION} sur le port ${N8N_PORT}...`);
  
  return new Promise((resolve, reject) => {
    const docker = spawn('docker', [
      'run',
      '-d',
      '--rm',
      '--name', 'n8n-temp-update',
      '-p', `${N8N_PORT}:5678`,
      `n8nio/n8n:${N8N_VERSION}`
    ]);
    
    docker.stdout.on('data', (data) => {
      console.log(`Docker: ${data}`);
    });
    
    docker.stderr.on('data', (data) => {
      console.error(`Docker Error: ${data}`);
    });
    
    docker.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Docker exited with code ${code}`));
      } else {
        // Attendre que n8n soit prêt
        setTimeout(resolve, 15000); // 15 secondes pour être sûr
      }
    });
  });
}

async function stopN8nDocker() {
  console.log('🛑 Arrêt du conteneur n8n...');
  
  return new Promise((resolve) => {
    const docker = spawn('docker', ['stop', 'n8n-temp-update']);
    docker.on('close', () => {
      console.log('Conteneur n8n arrêté');
      resolve();
    });
  });
}

async function archiveNodeTypes(versionsMap) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `node-types-${timestamp}.json`;
    const filepath = path.join(ARCHIVE_DIR, filename);
    
    await fs.writeFile(
      filepath,
      JSON.stringify(versionsMap, null, 2),
      'utf-8'
    );
    
    console.log(`📁 Archive sauvegardée: ${filename}`);
  } catch (error) {
    console.error('Erreur archivage:', error);
  }
}

async function updateNodeTypes() {
  console.log('🔄 Mise à jour hebdomadaire des node-types n8n\n');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`🏷️  Version n8n: ${N8N_VERSION}\n`);
  
  // Vérifier les clés API
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY manquante');
    process.exit(1);
  }
  
  if (!process.env.PINECONE_API_KEY) {
    console.error('❌ PINECONE_API_KEY manquante');
    process.exit(1);
  }
  
  let n8nStarted = false;
  
  try {
    // Créer le dossier d'archives si nécessaire
    await ensureArchiveDir();
    
    // Démarrer n8n temporairement
    await startN8nDocker();
    n8nStarted = true;
    
    console.log('\n📡 Récupération et indexation des node-types...\n');
    
    // Mettre à jour l'index Pinecone
    const result = await updateNodeTypesIndex(`http://localhost:${N8N_PORT}`);
    
    console.log('\n✅ Mise à jour terminée avec succès !');
    console.log(`📊 Statistiques :`);
    console.log(`   - Nodes indexés : ${result.nodesCount}`);
    console.log(`   - Vecteurs totaux : ${result.stats?.totalNodes || 0}`);
    
    // Archiver le mapping des versions
    await archiveNodeTypes(result.versionsMap);
    
    // Afficher quelques exemples
    console.log('\n📋 Exemples de nodes indexés :');
    const examples = Object.entries(result.versionsMap).slice(0, 5);
    examples.forEach(([name, version]) => {
      console.log(`   - ${name}: v${version}`);
    });
    
  } catch (error) {
    console.error('\n❌ Erreur lors de la mise à jour :', error.message);
    process.exit(1);
  } finally {
    // Toujours arrêter le conteneur n8n
    if (n8nStarted) {
      await stopN8nDocker();
    }
  }
}

// Fonction alternative sans Docker (si n8n est déjà en cours d'exécution)
async function updateNodeTypesLocal() {
  console.log('🔄 Mise à jour des node-types depuis l\'instance locale\n');
  
  try {
    const result = await updateNodeTypesIndex();
    
    console.log('\n✅ Mise à jour terminée !');
    console.log(`📊 Nodes indexés : ${result.nodesCount}`);
    
    await archiveNodeTypes(result.versionsMap);
    
  } catch (error) {
    console.error('\n❌ Erreur :', error.message);
    process.exit(1);
  }
}

// Déterminer quel mode utiliser
const useDocker = process.argv.includes('--docker');
const useLocal = process.argv.includes('--local');

if (useLocal) {
  updateNodeTypesLocal();
} else {
  // Par défaut, utiliser Docker
  updateNodeTypes();
} 