import dotenv from 'dotenv';
import { getNodeTypesByNames } from './api/rag/node-types-rag.js';

dotenv.config();

async function debugRAG() {
  console.log('🔍 Debug du système RAG\n');
  
  try {
    // Test 1: Récupérer des nodes spécifiques
    console.log('Test 1: Récupération de httpRequest et slack');
    const versions = {
      httpRequest: 5,
      slack: 4
    };
    
    const nodes = await getNodeTypesByNames(['httpRequest', 'slack'], versions);
    
    console.log(`\nRésultat: ${nodes.length} nodes trouvés`);
    
    nodes.forEach(node => {
      console.log('\n---');
      console.log(`Node: ${node.nodeName} v${node.version}`);
      console.log(`Metadata disponible: ${node.metadata ? 'Oui' : 'Non'}`);
      console.log(`FullData disponible: ${node.fullData ? 'Oui' : 'Non'}`);
      
      if (node.fullData) {
        console.log('Structure fullData:');
        console.log('- name:', node.fullData.name);
        console.log('- displayName:', node.fullData.displayName);
        console.log('- properties:', node.fullData.properties?.length || 0);
      }
    });
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

debugRAG(); 