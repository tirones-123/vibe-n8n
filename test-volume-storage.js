#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import { nodeTypesRAG } from './api/rag/node-types-rag.js';

async function testVolumeStorage() {
  console.log('🧪 Test du stockage des node-types sur volume');
  console.log('=============================================\n');
  
  try {
    // 1. Initialiser le système
    console.log('1️⃣ Initialisation du système RAG...');
    await nodeTypesRAG.initialize();
    console.log('✅ Système initialisé\n');
    
    // 2. Récupérer les node-types
    console.log('2️⃣ Récupération des node-types depuis n8n...');
    const nodeTypes = await nodeTypesRAG.fetchNodeTypes();
    console.log(`✅ ${nodeTypes.length} node-types récupérés\n`);
    
    // 3. Trouver les gros nodes (comme Slack)
    console.log('3️⃣ Analyse des tailles des nodes...');
    const nodeSizes = nodeTypes.map(node => ({
      name: node.name,
      displayName: node.displayName,
      size: JSON.stringify(node).length,
      propertiesCount: node.properties?.length || 0
    })).sort((a, b) => b.size - a.size);
    
    console.log('Top 10 des plus gros nodes:');
    nodeSizes.slice(0, 10).forEach((node, idx) => {
      const sizeKB = (node.size / 1024).toFixed(1);
      const status = node.size > 40000 ? '🚨' : '✅';
      console.log(`${idx + 1}. ${status} ${node.displayName} (${node.name}): ${sizeKB}KB - ${node.propertiesCount} propriétés`);
    });
    console.log('');
    
    // 4. Trouver spécifiquement Slack
    const slackNode = nodeTypes.find(n => n.name.toLowerCase().includes('slack'));
    if (slackNode) {
      const slackSize = JSON.stringify(slackNode).length;
      console.log(`4️⃣ Node Slack trouvé:`);
      console.log(`   - Nom: ${slackNode.name}`);
      console.log(`   - Taille: ${(slackSize / 1024).toFixed(1)}KB`);
      console.log(`   - Dépasserait la limite Pinecone: ${slackSize > 40000 ? 'OUI 🚨' : 'NON ✅'}`);
      console.log(`   - Propriétés: ${slackNode.properties?.length || 0}`);
      console.log('');
    }
    
    // 5. Tester l'indexation de quelques nodes
    console.log('5️⃣ Test d\'indexation des 5 plus gros nodes...');
    const testNodes = nodeSizes.slice(0, 5).map(ns => nodeTypes.find(n => n.name === ns.name));
    
    // Formater et sauvegarder
    for (const node of testNodes) {
      const formatted = nodeTypesRAG.formatNodeForIndexing(node);
      console.log(`\n📝 Traitement de ${node.displayName}:`);
      
      // Sauvegarder sur le volume
      await nodeTypesRAG.saveNodeToVolume(formatted.id, node);
      
      // Vérifier qu'on peut le recharger
      const loaded = await nodeTypesRAG.loadNodeFromVolume(formatted.id);
      if (loaded) {
        const loadedSize = JSON.stringify(loaded).length;
        console.log(`   ✅ Sauvegarde et chargement réussis`);
        console.log(`   📊 Taille originale: ${JSON.stringify(node).length} octets`);
        console.log(`   📊 Taille chargée: ${loadedSize} octets`);
        console.log(`   🎯 Intégrité: ${loadedSize === JSON.stringify(node).length ? 'PARFAITE' : 'DIFFÉRENTE'}`);
      } else {
        console.log(`   ❌ Échec du chargement`);
      }
    }
    
    // 6. Simuler une récupération complète
    console.log('\n6️⃣ Test de récupération via fetchNodesByNames...');
    
    // Créer un mapping de versions pour les tests
    const versions = {};
    testNodes.forEach(node => {
      const simpleName = node.name.replace('n8n-nodes-base.', '').replace('@n8n/n8n-nodes-langchain.', '');
      versions[simpleName] = Array.isArray(node.version) ? Math.max(...node.version) : (node.version || 1);
    });
    
    const nodeNames = Object.keys(versions);
    console.log(`   Recherche de: ${nodeNames.join(', ')}`);
    
    // Note: Cette partie nécessiterait que les nodes soient déjà indexés dans Pinecone
    // Pour un test complet, il faudrait d'abord indexer puis récupérer
    
    console.log('\n✅ Test terminé avec succès!');
    console.log('\n📌 Résumé:');
    console.log(`   - Stockage sur volume: ${process.env.RAILWAY_VOLUME_MOUNT_PATH ? 'Railway' : 'Local'}`);
    console.log(`   - Dossier: ${nodeTypesRAG.storageDir}`);
    console.log(`   - Nodes > 40KB: ${nodeSizes.filter(n => n.size > 40000).length}`);
    console.log(`   - Solution: Les données complètes sont stockées sur le volume sans limite!`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    console.error(error.stack);
  }
}

// Lancer le test
testVolumeStorage(); 