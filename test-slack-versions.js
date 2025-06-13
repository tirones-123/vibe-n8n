import dotenv from 'dotenv';
import { nodeTypesRAG } from './api/rag/node-types-rag.js';

dotenv.config();

async function findSlackVersions() {
  console.log('🔍 Recherche des versions de Slack\n');
  
  try {
    await nodeTypesRAG.initialize();
    
    // Recherche sémantique pour "slack"
    const results = await nodeTypesRAG.searchNodes('slack send message', 10);
    
    console.log('Nodes Slack trouvés:');
    const slackNodes = results.filter(r => r.nodeName.toLowerCase().includes('slack'));
    
    slackNodes.forEach(node => {
      console.log(`\n- ${node.nodeName} v${node.metadata.version}`);
      console.log(`  Display: ${node.metadata.displayName}`);
      console.log(`  Score: ${node.score.toFixed(3)}`);
    });
    
    // Vérifier quelques versions spécifiques
    console.log('\n\nTest de versions spécifiques:');
    const versionsToTest = [1, 2, 2.1, 2.2, 3, 4];
    
    for (const version of versionsToTest) {
      const testId = `n8n-nodes-base.slack|v${version}`;
      console.log(`- v${version}: En cours de test...`);
    }
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

findSlackVersions(); 