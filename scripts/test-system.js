#!/usr/bin/env node

import dotenv from 'dotenv';
import axios from 'axios';
import { nodeTypesRAG } from '../api/rag/node-types-rag.js';

// Charger les variables d'environnement
dotenv.config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

async function testEnvironment() {
  console.log(`${colors.blue}📋 Test de l'environnement${colors.reset}\n`);
  
  const requiredVars = {
    'CLAUDE_API_KEY': '🔑 Claude API',
    'BACKEND_API_KEY': '🔐 Backend Auth',
    'OPENAI_API_KEY': '🤖 OpenAI (pour embeddings)',
    'PINECONE_API_KEY': '📌 Pinecone (stockage vectoriel)'
  };
  
  let allPresent = true;
  for (const [key, name] of Object.entries(requiredVars)) {
    const isPresent = !!process.env[key];
    console.log(`${isPresent ? colors.green + '✓' : colors.red + '✗'} ${name}: ${isPresent ? 'Configuré' : 'Manquant'}${colors.reset}`);
    if (key === 'CLAUDE_API_KEY' || key === 'BACKEND_API_KEY') {
      allPresent = allPresent && isPresent;
    }
  }
  
  return allPresent;
}

async function testLocalServer() {
  console.log(`\n${colors.blue}🚀 Test du serveur local${colors.reset}\n`);
  
  try {
    const response = await axios.get('http://localhost:3000/api');
    console.log(`${colors.green}✓ Serveur accessible${colors.reset}`);
    console.log(`  Status: ${response.data.status}`);
    console.log(`  Version: ${response.data.version}`);
    console.log(`  Environnement:`, response.data.environment);
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Serveur non accessible${colors.reset}`);
    console.log(`  Assurez-vous de lancer: npm run dev`);
    return false;
  }
}

async function testNodeTypesRAG() {
  console.log(`\n${colors.blue}📚 Test du système Node-Types${colors.reset}\n`);
  
  if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY) {
    console.log(`${colors.yellow}⚠️  RAG non configuré (clés manquantes)${colors.reset}`);
    return false;
  }
  
  try {
    // Initialiser si nécessaire
    if (!nodeTypesRAG.initialized) {
      console.log('Initialisation du RAG...');
      await nodeTypesRAG.initialize();
    }
    
    // Obtenir les stats
    const stats = await nodeTypesRAG.getStats();
    console.log(`${colors.green}✓ RAG opérationnel${colors.reset}`);
    console.log(`  Nodes indexés: ${stats?.totalNodes || 0}`);
    console.log(`  Index: n8n-node-types`);
    
    // Test de recherche
    console.log('\nTest de recherche...');
    const { getNodeTypesByNames } = await import('../api/rag/node-types-rag.js');
    const results = await getNodeTypesByNames(['httpRequest', 'slack'], {
      slack: 4,
      httpRequest: 5
    });
    
    console.log(`${colors.green}✓ Recherche fonctionnelle${colors.reset}`);
    console.log(`  ${results.length} nodes trouvés`);
    
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Erreur RAG: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testClaudeAPI() {
  console.log(`\n${colors.blue}🤖 Test de l'API Claude${colors.reset}\n`);
  
  const API_KEY = process.env.BACKEND_API_KEY;
  if (!API_KEY) {
    console.log(`${colors.red}✗ BACKEND_API_KEY manquante${colors.reset}`);
    return false;
  }
  
  try {
    const response = await axios.post(
      'http://localhost:3000/api/claude',
      {
        prompt: "Dis juste 'Test OK' sans rien d'autre",
        context: { nodes: [], connections: {} },
        tools: [],
        mode: 'create'
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    );
    
    console.log(`${colors.green}✓ API Claude accessible${colors.reset}`);
    console.log(`  Streaming: Activé`);
    
    // Lire quelques chunks pour vérifier
    let receivedData = false;
    response.data.on('data', (chunk) => {
      receivedData = true;
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`  Réception de données: ${receivedData ? 'OK' : 'Échec'}`);
    
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Erreur API Claude: ${error.message}${colors.reset}`);
    if (error.response) {
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Message: ${error.response.data?.message}`);
    }
    return false;
  }
}

async function testN8nConnection() {
  console.log(`\n${colors.blue}🔗 Test de connexion n8n${colors.reset}\n`);
  
  const n8nUrl = process.env.N8N_INSTANCE_URL || 'https://primary-production-fc906.up.railway.app';
  
  try {
    const response = await axios.get(`${n8nUrl}/types/nodes.json`, {
      timeout: 10000
    });
    
    console.log(`${colors.green}✓ n8n accessible${colors.reset}`);
    console.log(`  URL: ${n8nUrl}`);
    console.log(`  Nodes disponibles: ${response.data.length}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ n8n non accessible${colors.reset}`);
    console.log(`  URL: ${n8nUrl}`);
    console.log(`  Erreur: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log(`${colors.magenta}╔═══════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.magenta}║     🧪 Tests du système n8n AI        ║${colors.reset}`);
  console.log(`${colors.magenta}╚═══════════════════════════════════════╝${colors.reset}\n`);
  
  const results = {
    environment: await testEnvironment(),
    server: await testLocalServer(),
    n8n: await testN8nConnection(),
    rag: await testNodeTypesRAG(),
    claude: false
  };
  
  // Test Claude uniquement si le serveur est OK
  if (results.server) {
    results.claude = await testClaudeAPI();
  }
  
  // Résumé
  console.log(`\n${colors.magenta}📊 Résumé des tests${colors.reset}\n`);
  
  const allPassed = Object.values(results).every(r => r === true);
  const critical = results.environment && results.server;
  
  for (const [test, passed] of Object.entries(results)) {
    const icon = passed ? colors.green + '✓' : colors.red + '✗';
    console.log(`${icon} ${test.charAt(0).toUpperCase() + test.slice(1)}${colors.reset}`);
  }
  
  console.log(`\n${colors.magenta}═══════════════════════════════════════${colors.reset}`);
  
  if (allPassed) {
    console.log(`${colors.green}🎉 Tous les tests sont passés !${colors.reset}`);
    console.log('Le système est prêt à être utilisé.');
  } else if (critical) {
    console.log(`${colors.yellow}⚠️  Tests partiellement réussis${colors.reset}`);
    console.log('Les fonctionnalités de base sont opérationnelles.');
    console.log('Certaines fonctionnalités avancées peuvent ne pas être disponibles.');
  } else {
    console.log(`${colors.red}❌ Tests échoués${colors.reset}`);
    console.log('Veuillez vérifier votre configuration.');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Lancer les tests
runAllTests().catch(error => {
  console.error(`${colors.red}Erreur fatale: ${error.message}${colors.reset}`);
  process.exit(1);
}); 