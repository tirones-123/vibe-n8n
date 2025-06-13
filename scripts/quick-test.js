#!/usr/bin/env node

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

console.log('🔍 Test rapide du système\n');

// Test 1: Variables d'environnement
console.log('📋 Variables d\'environnement:');
console.log(`- CLAUDE_API_KEY: ${process.env.CLAUDE_API_KEY ? '✅ Configurée' : '❌ Manquante'}`);
console.log(`- BACKEND_API_KEY: ${process.env.BACKEND_API_KEY ? '✅ Configurée' : '❌ Manquante'}`);
console.log(`- OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Configurée' : '❌ Manquante'}`);
console.log(`- PINECONE_API_KEY: ${process.env.PINECONE_API_KEY ? '✅ Configurée' : '❌ Manquante'}`);

// Test 2: Connexion n8n
console.log('\n🔗 Test de connexion n8n:');
const n8nUrl = process.env.N8N_INSTANCE_URL || 'https://primary-production-fc906.up.railway.app';

try {
  const response = await axios.get(`${n8nUrl}/types/nodes.json`, {
    timeout: 5000
  });
  console.log(`✅ n8n accessible: ${response.data.length} nodes disponibles`);
} catch (error) {
  console.log(`❌ n8n non accessible: ${error.message}`);
}

console.log('\n✨ Test terminé!'); 