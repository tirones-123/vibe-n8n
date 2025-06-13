import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

dotenv.config();

async function debugPinecone() {
  console.log('🔍 Debug Pinecone - Vérification des IDs\n');
  
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    const index = pinecone.index('n8n-node-types');
    
    // Test 1: Essayer de récupérer avec différents formats d'ID
    console.log('Test des différents formats d\'ID pour httpRequest v5:');
    
    const idsToTest = [
      'httpRequest|v5',
      'n8n-nodes-base.httpRequest|v5',
      'httpRequest',
      'n8n-nodes-base.httpRequest'
    ];
    
    for (const id of idsToTest) {
      try {
        const response = await index.namespace('node-types-latest').fetch([id]);
        if (response.records && Object.keys(response.records).length > 0) {
          console.log(`✅ Trouvé avec ID: "${id}"`);
          const record = Object.values(response.records)[0];
          console.log('  - nodeName:', record.metadata?.nodeName);
          console.log('  - displayName:', record.metadata?.displayName);
          console.log('  - version:', record.metadata?.version);
        } else {
          console.log(`❌ Pas trouvé avec ID: "${id}"`);
        }
      } catch (error) {
        console.log(`❌ Erreur avec ID "${id}":`, error.message);
      }
    }
    
    // Test 2: Query pour voir quelques exemples d'IDs
    console.log('\n\nExemples de nodes dans l\'index:');
    const stats = await index.namespace('node-types-latest').describeIndexStats();
    console.log('Total de vecteurs:', stats.namespaces?.['node-types-latest']?.vectorCount || 0);
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

debugPinecone(); 