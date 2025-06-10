#!/usr/bin/env node

import dotenv from 'dotenv';
import { n8nRAG } from '../api/rag/pinecone-rag.js';

// Charger les variables d'environnement
dotenv.config();

async function reindex() {
  console.log('🔄 Réindexation forcée de la documentation n8n...\n');
  
  // Vérifier les clés API
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY manquante dans le fichier .env');
    process.exit(1);
  }
  
  if (!process.env.PINECONE_API_KEY) {
    console.error('❌ PINECONE_API_KEY manquante dans le fichier .env');
    process.exit(1);
  }
  
  try {
    // Forcer la réindexation
    await n8nRAG.initialize(true);
    
    // Afficher les statistiques
    const stats = await n8nRAG.getStats();
    if (stats) {
      console.log('\n✅ Réindexation terminée avec succès !');
      console.log(`📊 Statistiques de l'index :`);
      console.log(`   - Vecteurs totaux : ${stats.totalVectors}`);
      console.log(`   - Dimension : ${stats.dimension}`);
    }
    
  } catch (error) {
    console.error('\n❌ Erreur lors de la réindexation :', error.message);
    process.exit(1);
  }
}

// Exécuter la réindexation
reindex(); 