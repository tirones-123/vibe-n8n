import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

dotenv.config();

async function debugFetch() {
  console.log('🔍 Debug détaillé de fetchNodesByNames\n');
  
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    const index = pinecone.index('n8n-node-types');
    
    // Test avec différentes combinaisons
    const tests = [
      { name: 'httpRequest', version: 5 },
      { name: 'httpRequest', version: 4.2 },
      { name: 'httpRequest', version: 1 },
      { name: 'slack', version: 4 },
    ];
    
    for (const test of tests) {
      console.log(`\n=== Test pour ${test.name} v${test.version} ===`);
      
      const possibleIds = [
        `${test.name}|v${test.version}`,
        `n8n-nodes-base.${test.name}|v${test.version}`,
        `@n8n/n8n-nodes-langchain.${test.name}|v${test.version}`,
      ];
      
      for (const id of possibleIds) {
        try {
          const response = await index.namespace('node-types-latest').fetch([id]);
          
          if (response.records && Object.keys(response.records).length > 0) {
            console.log(`✅ TROUVÉ avec ID: "${id}"`);
            const record = response.records[id];
            console.log('  Metadata:', {
              nodeName: record.metadata?.nodeName,
              displayName: record.metadata?.displayName,
              version: record.metadata?.version
            });
          } else {
            console.log(`❌ Pas trouvé: "${id}"`);
          }
        } catch (error) {
          console.log(`❌ Erreur avec "${id}": ${error.message}`);
        }
      }
    }
    
    // Faire une recherche sémantique pour voir les vrais IDs
    console.log('\n\n=== Exemples d\'IDs réels via recherche ===');
    const openai = new (await import('openai')).OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'httpRequest',
    });
    
    const searchResponse = await index.namespace('node-types-latest').query({
      vector: embedding.data[0].embedding,
      topK: 3,
      includeMetadata: true
    });
    
    console.log('\nNodes trouvés par recherche:');
    searchResponse.matches.forEach(match => {
      console.log(`- ID: "${match.id}"`);
      console.log(`  nodeName: ${match.metadata.nodeName}`);
      console.log(`  version: ${match.metadata.version}`);
    });
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

debugFetch(); 