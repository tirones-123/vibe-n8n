import dotenv from 'dotenv';
import { nodeTypesRAG } from './api/rag/node-types-rag.js';

dotenv.config();

async function testSemanticSearch() {
  console.log('🔍 Test de recherche sémantique\n');
  
  try {
    await nodeTypesRAG.initialize();
    
    // Test 1: Recherche sémantique
    console.log('Test 1: Recherche sémantique pour "HTTP Request"');
    const results = await nodeTypesRAG.searchNodes('HTTP Request API call', 5);
    
    console.log(`\nRésultats: ${results.length} nodes trouvés`);
    results.forEach((result, idx) => {
      console.log(`\n${idx + 1}. ${result.nodeName} (score: ${result.score.toFixed(3)})`);
      console.log(`   - Version: ${result.metadata?.version}`);
      console.log(`   - Display Name: ${result.metadata?.displayName}`);
      console.log(`   - Has fullData: ${result.fullData ? 'Yes' : 'No'}`);
    });
    
    // Test 2: Vérifier les stats
    console.log('\n\nStats de l\'index:');
    const stats = await nodeTypesRAG.getStats();
    console.log(stats);
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

testSemanticSearch(); 