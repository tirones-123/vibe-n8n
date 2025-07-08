import { getNodeTypesByNames } from './api/rag/node-types-rag.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Vérification du node IF et ses opérations\n');

async function checkIfNode() {
  try {
    // Récupérer le node IF
    const results = await getNodeTypesByNames(['if'], {});
    
    if (results.length > 0) {
      const ifNode = results[0];
      console.log(`✅ Node IF trouvé: v${ifNode.version}\n`);
      
      // Chercher la propriété conditions
      const conditionsProp = ifNode.fullData?.properties?.find(p => p.name === 'conditions');
      
      if (conditionsProp) {
        console.log('📋 Propriété "conditions" trouvée:');
        console.log(`   - Type: ${conditionsProp.type}`);
        console.log(`   - Display Name: ${conditionsProp.displayName}`);
        
        // Explorer les options pour trouver les opérations
        if (conditionsProp.options?.string) {
          console.log('\n🔍 Options pour les conditions string:');
          const stringOptions = conditionsProp.options.string.options || [];
          
          stringOptions.forEach(option => {
            console.log(`\n   Option: ${option.name}`);
            if (option.name === 'operation' && option.options) {
              console.log('   📌 Opérations disponibles:');
              option.options.forEach(op => {
                console.log(`      - ${op.value}: ${op.name}`);
              });
              
              const hasEquals = option.options.some(op => op.value === 'equals');
              console.log(`\n   ✅ "equals" est supporté: ${hasEquals ? 'OUI' : 'NON'}`);
            }
          });
        }
        
        // Afficher la structure complète pour debug
        console.log('\n📄 Structure complète de la propriété conditions:');
        console.log(JSON.stringify(conditionsProp, null, 2));
      } else {
        console.log('❌ Propriété "conditions" non trouvée');
      }
    } else {
      console.log('❌ Node IF non trouvé');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  }
}

// Lancer le test
checkIfNode(); 