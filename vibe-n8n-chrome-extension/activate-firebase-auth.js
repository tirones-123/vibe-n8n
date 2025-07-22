// 🔥 ACTIVATION FIREBASE AUTH COMPLET
console.log('🔥 === ACTIVATION FIREBASE AUTH ===');

// Activer le mode Firebase Auth
function activateFirebaseAuth() {
  console.log('🔄 Activation du mode Firebase Auth...');
  
  // Sauvegarder le choix
  localStorage.setItem('n8n-ai-use-firebase', 'true');
  window.useFirebaseAuth = true;
  
  console.log('✅ Mode Firebase Auth activé');
  console.log('📁 Paramètre sauvegardé dans localStorage');
  
  // Recharger pour appliquer
  setTimeout(() => {
    console.log('🔄 Rechargement pour appliquer Firebase Auth...');
    location.reload();
  }, 1000);
}

// Vérifier la configuration Firebase
function checkFirebaseConfig() {
  console.log('🔍 === VÉRIFICATION CONFIG FIREBASE ===');
  
  // Vérifier les objets Firebase
  console.log('🔥 contentAuthIntegration:', !!window.contentAuthIntegration);
  console.log('🔥 authService:', !!window.authService);
  
  // Vérifier l'Offscreen Document
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({ type: 'test-firebase-available' }, (response) => {
      console.log('🔥 Background Firebase:', response?.available ? '✅' : '❌');
    });
  }
  
  // Vérifier le statut d'authentification
  if (window.contentAuthIntegration) {
    const status = window.contentAuthIntegration.getAuthStatus?.();
    console.log('🔐 Auth Status:', status);
  }
  
  return {
    contentAuthIntegration: !!window.contentAuthIntegration,
    authService: !!window.authService,
    useFirebaseAuth: window.useFirebaseAuth
  };
}

// Tester l'authentification complète
async function testFirebaseAuthFlow() {
  console.log('🧪 === TEST FIREBASE AUTH FLOW ===');
  
  if (!window.contentAuthIntegration) {
    console.log('❌ contentAuthIntegration non disponible');
    return false;
  }
  
  try {
    // 1. Tester canMakeRequest (devrait demander auth si pas connecté)
    console.log('1️⃣ Test canMakeRequest...');
    const canMake = await window.contentAuthIntegration.canMakeRequest();
    console.log('  Résultat:', canMake);
    
    if (!canMake.allowed) {
      console.log('✅ Parfait ! Auth requise comme attendu');
      console.log('💡 Pour vous connecter:');
      console.log('  - Un popup d\'auth devrait apparaître');
      console.log('  - Ou utilisez: showFirebaseAuthModal()');
      return true;
    } else {
      console.log('✅ Déjà authentifié !');
      
      // 2. Si déjà auth, tester une vraie requête
      console.log('2️⃣ Test makeWorkflowRequest...');
      try {
        const response = await window.contentAuthIntegration.makeWorkflowRequest('Test workflow simple');
        console.log('  Requête workflow:', response ? '✅ Succès' : '❌ Échec');
      } catch (error) {
        console.log('  Erreur workflow:', error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Erreur test auth:', error);
    return false;
  }
}

// Tester le modal d'authentification
function testAuthModal() {
  console.log('🔐 Test du modal d\'authentification...');
  
  if (window.contentAuthIntegration?.showSimpleAuthModal) {
    window.contentAuthIntegration.showSimpleAuthModal();
    console.log('✅ Modal d\'auth affiché');
  } else if (window.showFirebaseAuthModal) {
    window.showFirebaseAuthModal();
    console.log('✅ Modal d\'auth global affiché');
  } else {
    console.log('❌ Aucun modal d\'auth disponible');
  }
}

// Test complet du système
async function testCompleteFirebaseSystem() {
  console.log('🚀 === TEST SYSTÈME FIREBASE COMPLET ===');
  
  // 1. Vérifier config
  const config = checkFirebaseConfig();
  
  // 2. Vérifier mode
  const mode = localStorage.getItem('n8n-ai-use-firebase');
  console.log('📊 Mode stocké:', mode);
  console.log('📊 Mode actuel:', window.useFirebaseAuth ? 'Firebase' : 'Legacy');
  
  // 3. Tester auth flow
  if (config.contentAuthIntegration) {
    await testFirebaseAuthFlow();
  }
  
  // 4. Instructions
  console.log('');
  console.log('🎯 ÉTAPES SUIVANTES:');
  console.log('1. Si pas en mode Firebase → activateFirebaseAuth()');
  console.log('2. Tester auth → testFirebaseAuthFlow()');
  console.log('3. Afficher modal → testAuthModal()');
  console.log('4. Créer compte → Utilisez le modal pour sign up');
  console.log('5. Tester workflow → Cliquez sur 🤖 et envoyez une requête');
}

// Vérifier le mode actuel
const currentMode = localStorage.getItem('n8n-ai-use-firebase');
const isFirebaseMode = currentMode !== 'false' && window.useFirebaseAuth !== false;

console.log('🔍 Mode actuel:', isFirebaseMode ? 'Firebase Auth' : 'Legacy');

if (!isFirebaseMode) {
  console.log('⚠️ Vous êtes en mode Legacy');
  console.log('🔄 Pour activer Firebase Auth: activateFirebaseAuth()');
} else {
  console.log('✅ Mode Firebase Auth activé');
  console.log('🧪 Pour tester: testCompleteFirebaseSystem()');
}

// Exposer les fonctions
window.activateFirebaseAuth = activateFirebaseAuth;
window.checkFirebaseConfig = checkFirebaseConfig;
window.testFirebaseAuthFlow = testFirebaseAuthFlow;
window.testAuthModal = testAuthModal;
window.testCompleteFirebaseSystem = testCompleteFirebaseSystem;

console.log('');
console.log('🎯 Fonctions disponibles:');
console.log('  activateFirebaseAuth()     - Activer Firebase Auth');
console.log('  checkFirebaseConfig()      - Vérifier config Firebase');
console.log('  testFirebaseAuthFlow()     - Tester auth flow');
console.log('  testAuthModal()           - Afficher modal auth');
console.log('  testCompleteFirebaseSystem() - Test complet');

// Auto-test si déjà en mode Firebase
if (isFirebaseMode) {
  console.log('');
  console.log('🚀 Auto-test du système Firebase...');
  setTimeout(() => {
    testCompleteFirebaseSystem();
  }, 1000);
} 