#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();
import { nodeTypesRAG } from './api/rag/node-types-rag.js';

async function testTokenLimits() {
  console.log('🧮 Analyse des limites de tokens pour Claude\n');
  
  // Claude Opus 4 a une limite de 200k tokens (~150k mots)
  // 1 token ≈ 4 caractères en moyenne
  const CLAUDE_INPUT_LIMIT = 200000 * 4; // ~800k caractères
  const CLAUDE_OUTPUT_LIMIT = 8192 * 4;  // ~32k caractères actuellement
  
  try {
    await nodeTypesRAG.initialize();
    
    // Récupérer quelques gros nodes
    const bigNodes = [
      {name: 'slack', version: 2.3},
      {name: 'notion', version: 2.2},
      {name: 'uproc', version: 1},
      {name: 'salesforce', version: 1},
      {name: 'hubspot', version: 2.1},
      {name: 'zohoCrm', version: 1},
      {name: 'microsoftOutlook', version: 2}
    ];
    const nodes = [];
    
    console.log('📊 Taille des gros nodes:');
    for (const node of bigNodes) {
      const versions = { [node.name]: node.version };
      const nodeData = await nodeTypesRAG.fetchNodesByNames([node.name], versions);
      if (nodeData.length > 0 && nodeData[0].fullData) {
        const size = JSON.stringify(nodeData[0].fullData).length;
        const tokens = Math.ceil(size / 4);
        nodes.push({ name: node.name, size, tokens });
        console.log(`- ${node.name}: ${(size/1024).toFixed(1)}KB (~${tokens.toLocaleString()} tokens)`);
      }
    }
    
    // Calculer les combinaisons
    console.log('\n🔢 Analyse des combinaisons:');
    
    // Cas 1: Tous les gros nodes
    const totalSize = nodes.reduce((acc, n) => acc + n.size, 0);
    const totalTokens = nodes.reduce((acc, n) => acc + n.tokens, 0);
    console.log(`\nTous les gros nodes (${nodes.length}):
    - Taille totale: ${(totalSize/1024).toFixed(1)}KB
    - Tokens estimés: ${totalTokens.toLocaleString()}
    - % de la limite Claude: ${((totalTokens/200000)*100).toFixed(1)}%
    - ✅ Rentre dans la limite: ${totalTokens < 200000 ? 'OUI' : 'NON'}`);
    
    // Cas 2: Combinaisons réalistes
    console.log('\n📝 Scénarios réalistes:');
    
    // Workflow avec Slack + Notion + Discord
    const scenario1 = ['slack', 'notion', 'discord'];
    const size1 = scenario1.reduce((acc, name) => {
      const node = nodes.find(n => n.name === name);
      return acc + (node?.size || 50000); // 50KB par défaut
    }, 0);
    console.log(`\n1. Slack + Notion + Discord:
    - ~${(size1/1024).toFixed(0)}KB (~${Math.ceil(size1/4).toLocaleString()} tokens)
    - ${((size1/4/200000)*100).toFixed(1)}% de la limite`);
    
    // Workflow complexe
    const scenario2 = ['salesforce', 'hubspot', 'slack', 'googleSheets'];
    const size2 = scenario2.reduce((acc, name) => {
      const node = nodes.find(n => n.name === name);
      return acc + (node?.size || 50000);
    }, 0);
    console.log(`\n2. Salesforce + HubSpot + Slack + Sheets:
    - ~${(size2/1024).toFixed(0)}KB (~${Math.ceil(size2/4).toLocaleString()} tokens)
    - ${((size2/4/200000)*100).toFixed(1)}% de la limite`);
    
    // Recommandations
    console.log('\n💡 Recommandations:');
    console.log('1. La limite actuelle de 8192 tokens en sortie (~32KB) pourrait être augmentée');
    console.log('2. Pour les workflows très complexes, on pourrait limiter à ~10-15 gros nodes max');
    console.log('3. Le système actuel peut gérer la plupart des cas d\'usage réalistes');
    console.log('4. Claude Opus 4 a assez de contexte pour la majorité des workflows');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testTokenLimits();
