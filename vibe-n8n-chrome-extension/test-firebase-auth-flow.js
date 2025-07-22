// 🔥 TEST FIREBASE AUTH FLOW COMPLET
console.log('🔥 === TEST FIREBASE AUTH FLOW ===');

// Test du nouveau système
async function testNewFirebaseAuthFlow() {
  console.log('🧪 Test du nouveau flow Firebase Auth...');
  
  // 1. Vérifier le mode Firebase
  const isFirebaseMode = window.useFirebaseAuth !== false;
  console.log('📊 Mode Firebase Auth:', isFirebaseMode ? '✅ Activé' : '❌ Désactivé');
  
  if (!isFirebaseMode) {
    console.log('⚠️ Mode Firebase Auth désactivé. Pour activer:');
    console.log('  localStorage.setItem("n8n-ai-use-firebase", "true");');
    console.log('  location.reload();');
    return false;
  }
  
  // 2. Vérifier contentAuthIntegration
  if (!window.contentAuthIntegration) {
    console.log('❌ contentAuthIntegration non disponible');
    return false;
  }
  
  console.log('✅ contentAuthIntegration disponible');
  console.log('🔍 authRequired:', window.contentAuthIntegration.authRequired);
  
  // 3. Tester canMakeRequest (devrait demander auth)
  try {
    console.log('🧪 Test canMakeRequest...');
    const result = await window.contentAuthIntegration.canMakeRequest();
    console.log('📋 Résultat canMakeRequest:', result);
    
    if (result.allowed && result.method === 'legacy') {
      console.log('❌ PROBLÈME: Retourne encore Legacy au lieu de demander Firebase Auth');
      return false;
    }
    
    if (!result.allowed && result.action === 'show_auth_modal') {
      console.log('✅ PARFAIT: Demande Firebase Auth comme attendu');
      return true;
    }
    
    if (result.allowed && result.method === 'firebase') {
      console.log('✅ Déjà authentifié avec Firebase');
      return true;
    }
    
  } catch (error) {
    console.log('❌ Erreur test canMakeRequest:', error);
    return false;
  }
}

// Simuler une requête workflow pour déclencher l'auth
function simulateWorkflowRequest() {
  console.log('🚀 Simulation requête workflow...');
  
  // Chercher le bouton AI
  const aiButton = document.querySelector('[data-test-id="ask-assistant-floating-button"]');
  if (!aiButton) {
    console.log('❌ Bouton AI non trouvé');
    return false;
  }
  
  console.log('✅ Bouton AI trouvé');
  console.log('💡 Instructions:');
  console.log('1. Cliquez sur le bouton AI 🤖');
  console.log('2. Tapez une requête (ex: "workflow simple")');
  console.log('3. Envoyez');
  console.log('4. Le popup Firebase Auth devrait apparaître');
  console.log('5. Créez un compte ou connectez-vous');
  
  return true;
}

// Forcer l'affichage du modal Firebase Auth pour test
function showFirebaseAuthModal() {
  console.log('🔐 Affichage du modal Firebase Auth...');
  
  if (window.contentAuthIntegration?.showSimpleAuthModal) {
    window.contentAuthIntegration.showSimpleAuthModal();
    console.log('✅ Modal Firebase Auth affiché');
  } else {
    console.log('❌ Modal Firebase Auth non disponible');
  }
}

// Vérifier l'état d'authentification
function checkAuthState() {
  console.log('🔍 === ÉTAT AUTHENTIFICATION ===');
  
  if (window.authService) {
    const isAuth = window.authService.isAuthenticated();
    const user = window.authService.getCurrentUser();
    
    console.log('🔐 Authentifié:', isAuth ? '✅' : '❌');
    if (user) {
      console.log('👤 Utilisateur:', user.email || user.uid);
    }
  } else {
    console.log('❌ authService non disponible');
  }
  
  if (window.contentAuthIntegration) {
    const status = window.contentAuthIntegration.getAuthStatus?.();
    if (status) {
      console.log('📊 Status auth:', status);
    }
  }
}

// Test complet
async function runCompleteTest() {
  console.log('🚀 === TEST COMPLET FIREBASE AUTH ===');
  
  // 1. Test flow
  const flowResult = await testNewFirebaseAuthFlow();
  
  // 2. État auth
  checkAuthState();
  
  // 3. Instructions
  if (flowResult) {
    console.log('');
    console.log('🎯 TOUT EST PRÊT !');
    console.log('💡 Pour tester:');
    console.log('  - simulateWorkflowRequest() pour voir les instructions');
    console.log('  - showFirebaseAuthModal() pour afficher le modal');
    console.log('  - Ou cliquez directement sur le bouton AI 🤖');
  } else {
    console.log('');
    console.log('❌ Problème détecté. Vérifiez les logs ci-dessus.');
  }
  
  return flowResult;
}

// Exposer les fonctions
window.testNewFirebaseAuthFlow = testNewFirebaseAuthFlow;
window.simulateWorkflowRequest = simulateWorkflowRequest;
window.showFirebaseAuthModal = showFirebaseAuthModal;
window.checkAuthState = checkAuthState;
window.runCompleteTest = runCompleteTest;

console.log('');
console.log('🎯 Fonctions disponibles:');
console.log('  runCompleteTest()        - Test complet (recommandé)');
console.log('  testNewFirebaseAuthFlow() - Test du flow auth');
console.log('  showFirebaseAuthModal()  - Afficher modal auth');
console.log('  simulateWorkflowRequest() - Instructions workflow');
console.log('  checkAuthState()         - État authentification');

// Auto-test
console.log('');
console.log('🚀 Lancement auto-test...');
setTimeout(runCompleteTest, 1000); 