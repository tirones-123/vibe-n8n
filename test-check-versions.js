import { getNodeTypesByNames } from './api/rag/node-types-rag.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Test de recherche des versions des nodes\n');

async function testVersionSearch() {
  try {
    // Tester avec les nodes du workflow Gmail->Slack
    const nodeNames = ['gmail', 'gmailTrigger', 'slack', 'if'];
    
    console.log('📋 Nodes à rechercher:', nodeNames);
    console.log('📦 Versions fournies: {} (aucune)\n');
    
    // Appeler la fonction avec un objet vide (comme quand versions="none")
    const results = await getNodeTypesByNames(nodeNames, {});
    
    console.log('✅ Résultats trouvés:\n');
    
    results.forEach(result => {
      console.log(`📌 ${result.nodeName}:`);
      console.log(`   - Version trouvée: v${result.version}`);
      console.log(`   - Display Name: ${result.metadata?.displayName || result.fullData?.displayName || 'N/A'}`);
      console.log(`   - Description: ${(result.metadata?.description || result.fullData?.description || 'N/A').substring(0, 100)}...`);
      console.log(`   - Données complètes: ${result.fullData ? 'Oui' : 'Non'} ${result.fullData ? `(${JSON.stringify(result.fullData).length} caractères)` : ''}`);
      console.log('');
    });
    
    // Vérifier les nodes non trouvés
    const foundNames = results.map(r => r.nodeName);
    const notFound = nodeNames.filter(name => !foundNames.includes(name));
    
    if (notFound.length > 0) {
      console.log('❌ Nodes non trouvés:', notFound);
      
      // Debug spécifique pour gmailTrigger
      if (notFound.includes('gmailTrigger')) {
        console.log('\n🔍 Debug spécifique pour gmailTrigger:');
        console.log('   Ce node devrait être trouvé car le fichier existe:');
        console.log('   - n8n-nodes-base.gmailTrigger_v1.2.json');
        console.log('   Vérifier les logs du serveur pour voir ce qui se passe...');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testVersionSearch(); 