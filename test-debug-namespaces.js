import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

dotenv.config();

async function debugNamespaces() {
  console.log('🔍 Debug Pinecone - Vérification de tous les namespaces\n');
  
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    const index = pinecone.index('n8n-node-types');
    
    // Obtenir les stats de tous les namespaces
    const stats = await index.describeIndexStats();
    console.log('Stats complètes de l\'index:');
    console.log(JSON.stringify(stats, null, 2));
    
    // Tester quelques namespaces possibles
    const namespacesToTest = [
      '', // namespace par défaut
      'node-types-latest',
      'n8n-documentation',
      'default'
    ];
    
    console.log('\n\nTest des namespaces:');
    for (const ns of namespacesToTest) {
      try {
        const nsStats = await index.namespace(ns).describeIndexStats();
        const count = nsStats.namespaces?.[ns || '']?.vectorCount || 0;
        console.log(`- Namespace "${ns || '(default)'}": ${count} vecteurs`);
      } catch (error) {
        console.log(`- Namespace "${ns}": Erreur - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

debugNamespaces(); 