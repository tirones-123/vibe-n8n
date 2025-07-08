#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import { nodeTypesRAG } from './api/rag/node-types-rag.js';

async function testSlack() {
  console.log('🧪 Test direct du système RAG pour Slack\n');
  
  try {
    // Initialiser si nécessaire
    await nodeTypesRAG.initialize();
    
    // Test 1: Récupérer les données de Slack
    console.log('📊 Récupération des données Slack...');
    const slackNodes = await nodeTypesRAG.fetchNodesByNames(['slack'], { slack: 2.3 });
    
    if (slackNodes.length > 0) {
      const slack = slackNodes[0];
      
      console.log('\n✅ Données Slack récupérées:');
      console.log(`- Nom: ${slack.nodeName}`);
      console.log(`- Version: ${slack.version}`);
      console.log(`- Display Name: ${slack.displayName}`);
      
      if (slack.fullData) {
        const dataStr = JSON.stringify(slack.fullData);
        console.log(`\n📏 Taille des données complètes: ${dataStr.length} caractères`);
        console.log(`✅ C'est ${dataStr.length > 40000 ? 'PLUS' : 'MOINS'} que la limite Pinecone de 40KB !`);
        
        // Compter les opérations
        if (slack.fullData.properties?.resource?.options) {
          console.log(`\n📋 Opérations disponibles: ${slack.fullData.properties.resource.options.length}`);
          console.log('\nQuelques exemples:');
          slack.fullData.properties.resource.options.slice(0, 5).forEach(op => {
            console.log(`  - ${op.name}: ${op.value}`);
          });
        }
        
        // Vérifier l'intégrité du JSON
        try {
          JSON.parse(dataStr);
          console.log('\n✅ JSON valide et complet !');
        } catch (e) {
          console.log('\n❌ JSON invalide !');
        }
      } else {
        console.log('\n❌ Pas de données complètes trouvées');
      }
    } else {
      console.log('❌ Node Slack non trouvé');
    }
    
    // Test 2: Vérifier d'autres gros nodes
    console.log('\n\n📊 Vérification d\'autres gros nodes...');
    const bigNodes = ['notion', 'salesforce', 'hubspot'];
    
    for (const nodeName of bigNodes) {
      const nodes = await nodeTypesRAG.fetchNodesByNames([nodeName]);
      if (nodes.length > 0 && nodes[0].fullData) {
        const size = JSON.stringify(nodes[0].fullData).length;
        console.log(`- ${nodeName}: ${(size / 1024).toFixed(1)}KB ${size > 40000 ? '(>40KB ✅)' : ''}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testSlack();
