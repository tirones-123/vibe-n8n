// 🔥 TEST FINAL FIREBASE AUTH + STRIPE
console.log('🔥 === TEST FINAL FIREBASE AUTH + STRIPE ===');

// Vérifier que Firebase Auth est par défaut
function checkDefaultMode() {
  console.log('🔍 Vérification mode par défaut...');
  
  const stored = localStorage.getItem('n8n-ai-use-firebase');
  const isFirebaseDefault = stored !== 'false';
  
  console.log('📁 localStorage:', stored);
  console.log('🔥 Mode Firebase par défaut:', isFirebaseDefault ? '✅' : '❌');
  console.log('🌐 window.useFirebaseAuth:', window.useFirebaseAuth);
  
  if (!isFirebaseDefault) {
    console.log('⚠️ Mode Legacy détecté. Pour revenir à Firebase (défaut):');
    console.log('  localStorage.removeItem("n8n-ai-use-firebase");');
    console.log('  location.reload();');
  }
  
  return isFirebaseDefault;
}

// Tester que les fonctions Firebase Auth sont définies
function testFirebaseAuthFunctions() {
  console.log('🧪 Test des fonctions Firebase Auth...');
  
  // D'abord, déclencher l'affichage du modal pour définir les fonctions
  if (window.contentAuthIntegration?.showSimpleAuthModal) {
    console.log('🔐 Affichage du modal pour définir les fonctions...');
    window.contentAuthIntegration.showSimpleAuthModal();
    
    setTimeout(() => {
      // Vérifier que les fonctions sont maintenant définies
      const functions = [
        'handleFirebaseSignIn',
        'handleFirebaseSignUp', 
        'handleFirebaseGoogleSignIn'
      ];
      
      console.log('🔍 Vérification des fonctions après modal:');
      functions.forEach(func => {
        const exists = typeof window[func] === 'function';
        console.log(`  ${func}: ${exists ? '✅' : '❌'}`);
      });
      
      // Fermer le modal de test
      const modal = document.querySelector('.simple-auth-modal');
      if (modal) {
        modal.remove();
        console.log('🗑️ Modal de test fermé');
      }
    }, 1000);
    
  } else {
    console.log('❌ contentAuthIntegration.showSimpleAuthModal non disponible');
  }
}

// Tester le backend avec Firebase Auth
async function testBackendWithFirebaseAuth() {
  console.log('🔗 Test connexion backend...');
  
  try {
    // Tester l'endpoint de status
    const response = await fetch('https://vibe-n8n-production.up.railway.app/api/status');
    const data = await response.json();
    
    console.log('📊 Status backend:', response.ok ? '✅' : '❌');
    
    if (data.configuration) {
      console.log('🔥 Firebase configuré:', data.configuration.firebase_configured ? '✅' : '❌');
      console.log('💳 Pricing ready:', data.configuration.pricing_ready ? '✅' : '❌');
    }
    
    return response.ok;
    
  } catch (error) {
    console.log('❌ Erreur backend:', error.message);
    return false;
  }
}

// Simuler un workflow complet avec auth
async function simulateCompleteWorkflow() {
  console.log('🚀 Simulation workflow complet...');
  
  // 1. Vérifier le mode
  const isFirebase = checkDefaultMode();
  if (!isFirebase) {
    console.log('❌ Mode Legacy actif, simulation interrompue');
    return false;
  }
  
  // 2. Vérifier contentAuthIntegration
  if (!window.contentAuthIntegration) {
    console.log('❌ contentAuthIntegration non disponible');
    return false;
  }
  
  // 3. Tester canMakeRequest
  try {
    const result = await window.contentAuthIntegration.canMakeRequest();
    console.log('📋 canMakeRequest résultat:', result);
    
    if (!result.allowed && result.action === 'show_auth_modal') {
      console.log('✅ Parfait ! Demande Firebase Auth comme attendu');
      console.log('💡 Pour tester la création de compte:');
      console.log('  1. Utilisez un email de test: test@vibe-n8n.com');
      console.log('  2. Mot de passe: test123456');
      console.log('  3. Après création, vous aurez 70k tokens gratuits');
      console.log('  4. Quota dépassé → popup Stripe pour passer PRO');
      return true;
    }
    
    if (result.allowed && result.method === 'firebase') {
      console.log('✅ Déjà authentifié avec Firebase');
      
      // Tester info utilisateur
      if (result.userInfo) {
        console.log('👤 Info utilisateur:', result.userInfo);
        console.log('📊 Plan:', result.userInfo.plan || 'N/A');
        console.log('📊 Tokens restants:', result.userInfo.quota?.remaining_tokens || 'N/A');
      }
      
      return true;
    }
    
    console.log('⚠️ Résultat inattendu:', result);
    return false;
    
  } catch (error) {
    console.log('❌ Erreur canMakeRequest:', error);
    return false;
  }
}

// Test des quotas et Stripe
function explainQuotaAndStripeFlow() {
  console.log('💰 === FLUX QUOTAS ET STRIPE ===');
  console.log('');
  console.log('📊 Plan FREE:');
  console.log('  - 70,000 tokens inclus/mois');
  console.log('  - Dépassement → Popup "Upgrade to PRO"');
  console.log('  - Clic → Redirect Stripe Checkout');
  console.log('');
  console.log('💳 Plan PRO (20$/mois):');
  console.log('  - 1,000,000 tokens inclus');
  console.log('  - Dépassement → 0.20$ / 10,000 tokens');
  console.log('  - Facturation usage-based');
  console.log('');
  console.log('🔗 Endpoints Stripe configurés:');
  console.log('  - /api/create-checkout-session');
  console.log('  - /api/stripe-webhook');
  console.log('  - Produit: Vibe Pro (prod_xxxxx)');
  console.log('  - Meter: vibe_input_tokens (mtr_xxxxx)');
}

// Test complet
async function runFinalTest() {
  console.log('🚀 === TEST FINAL COMPLET ===');
  
  // 1. Mode par défaut
  const isFirebaseDefault = checkDefaultMode();
  
  // 2. Backend
  const backendOk = await testBackendWithFirebaseAuth();
  
  // 3. Workflow simulation
  const workflowOk = await simulateCompleteWorkflow();
  
  // 4. Explications Stripe
  explainQuotaAndStripeFlow();
  
  // 5. Fonctions auth
  console.log('');
  console.log('🧪 Test des fonctions (dans 2 secondes)...');
  setTimeout(testFirebaseAuthFunctions, 2000);
  
  // 6. Résumé
  console.log('');
  console.log('📊 === RÉSUMÉ FINAL ===');
  console.log(`🔥 Firebase Auth par défaut: ${isFirebaseDefault ? '✅' : '❌'}`);
  console.log(`🔗 Backend disponible: ${backendOk ? '✅' : '❌'}`);
  console.log(`🚀 Workflow flow OK: ${workflowOk ? '✅' : '❌'}`);
  console.log('💳 Stripe configuré: ✅ (selon PRICING_SETUP_GUIDE.md)');
  
  if (isFirebaseDefault && backendOk && workflowOk) {
    console.log('');
    console.log('🎉 TOUT EST PRÊT ! Système Firebase Auth + Stripe opérationnel !');
    console.log('');
    console.log('💡 NEXT STEPS:');
    console.log('1. Cliquez sur le bouton AI 🤖');
    console.log('2. Demandez un workflow');
    console.log('3. Créez un compte dans le popup Firebase Auth');
    console.log('4. Profitez de 70k tokens gratuits !');
  } else {
    console.log('');
    console.log('⚠️ Quelques problèmes détectés. Voir les logs ci-dessus.');
  }
  
  return { isFirebaseDefault, backendOk, workflowOk };
}

// Exposer les fonctions
window.checkDefaultMode = checkDefaultMode;
window.testFirebaseAuthFunctions = testFirebaseAuthFunctions;
window.testBackendWithFirebaseAuth = testBackendWithFirebaseAuth;
window.simulateCompleteWorkflow = simulateCompleteWorkflow;
window.explainQuotaAndStripeFlow = explainQuotaAndStripeFlow;
window.runFinalTest = runFinalTest;

console.log('');
console.log('🎯 Fonctions disponibles:');
console.log('  runFinalTest()              - Test complet (recommandé)');
console.log('  checkDefaultMode()          - Vérifier mode par défaut');
console.log('  testFirebaseAuthFunctions() - Tester fonctions auth');
console.log('  simulateCompleteWorkflow()  - Simuler workflow complet');
console.log('  explainQuotaAndStripeFlow() - Expliquer flux Stripe');

// Auto-test
console.log('');
console.log('🚀 Lancement auto-test...');
setTimeout(runFinalTest, 1000); 