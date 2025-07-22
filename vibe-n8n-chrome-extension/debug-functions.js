// DEBUG FUNCTIONS - Script de diagnostic Firebase Auth
// À exécuter directement dans la console pour diagnostiquer les problèmes

console.log('🧪 === DIAGNOSTIC FIREBASE AUTH ===');

// Test 1: Vérifier si les fonctions globales existent
console.log('📝 Test des fonctions globales:');
console.log('  testFirebaseSystem:', typeof window.testFirebaseSystem);
console.log('  toggleAuthMode:', typeof window.toggleAuthMode);
console.log('  showFirebaseAuthModal:', typeof window.showFirebaseAuthModal);
console.log('  createTestUser:', typeof window.createTestUser);

// Test 2: Vérifier les objets auth
console.log('📝 Test des objets auth:');
console.log('  contentAuthIntegration:', !!window.contentAuthIntegration);
console.log('  authService:', !!window.authService);
console.log('  useFirebaseAuth:', window.useFirebaseAuth);

// Test 3: Diagnostic Offscreen Document
console.log('📝 Test Offscreen Document:');
if (window.contentAuthIntegration) {
  console.log('  simulationMode:', window.contentAuthIntegration.simulationMode);
  console.log('  authRequired:', window.contentAuthIntegration.authRequired);
  console.log('  authService available:', !!window.contentAuthIntegration.authService);
}

// Test 4: Test communication Background Script
console.log('📝 Test communication Background:');
try {
  chrome.runtime.sendMessage({ type: 'test-firebase-available' }, (response) => {
    console.log('  Background response:', response);
  });
} catch (error) {
  console.error('  Background error:', error);
}

// FONCTIONS DE TEST FORCÉES (si manquantes)
if (typeof window.testFirebaseSystem === 'undefined') {
  console.log('🔧 Redéfinition forcée de testFirebaseSystem...');
  
  window.testFirebaseSystem = async () => {
    console.log('🧪 === TEST FIREBASE SYSTEM (DEBUG) ===');
    
    const results = {
      contentAuthIntegration: !!window.contentAuthIntegration,
      authService: !!window.authService,
      simulationMode: window.contentAuthIntegration?.simulationMode || false,
      backgroundConnection: false
    };
    
    // Test background connection
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'test-firebase-available' }, resolve);
      });
      results.backgroundConnection = !!response?.available;
    } catch (error) {
      console.error('Background test failed:', error);
    }
    
    console.log('📊 Résultats:');
    Object.entries(results).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✅' : '❌'}`);
    });
    
    return results;
  };
}

if (typeof window.toggleAuthMode === 'undefined') {
  console.log('🔧 Redéfinition forcée de toggleAuthMode...');
  
  window.toggleAuthMode = () => {
    // Basculer le mode
    window.useFirebaseAuth = !window.useFirebaseAuth;
    console.log(`🔄 Mode basculé vers: ${window.useFirebaseAuth ? 'Firebase Auth' : 'Legacy'}`);
    
    // Fermer les popups
    const popups = document.querySelectorAll('.simple-auth-modal, .simple-quota-popup');
    popups.forEach(popup => popup.remove());
    
    // Recharger la page pour appliquer le nouveau mode
    setTimeout(() => {
      console.log('🔄 Rechargement de la page...');
      location.reload();
    }, 1000);
  };
}

if (typeof window.showFirebaseAuthModal === 'undefined') {
  console.log('🔧 Redéfinition forcée de showFirebaseAuthModal...');
  
  window.showFirebaseAuthModal = () => {
    if (window.contentAuthIntegration) {
      window.contentAuthIntegration.showSimpleAuthModal();
    } else {
      console.log('❌ contentAuthIntegration non disponible');
    }
  };
}

if (typeof window.createTestUser === 'undefined') {
  console.log('🔧 Redéfinition forcée de createTestUser...');
  
  window.createTestUser = async () => {
    console.log('👤 Création utilisateur test...');
    if (window.authService) {
      try {
        const user = await window.authService.signUpWithEmail('test@vibe-n8n.com', 'test123456');
        console.log('✅ Utilisateur test créé:', user.email);
        return user;
      } catch (error) {
        console.error('❌ Erreur création utilisateur test:', error);
        return false;
      }
    } else {
      console.log('❌ authService non disponible');
      return false;
    }
  };
}

console.log('✅ Fonctions de test redéfinies. Vous pouvez maintenant utiliser:');
console.log('  - testFirebaseSystem()');
console.log('  - toggleAuthMode()');
console.log('  - showFirebaseAuthModal()');
console.log('  - createTestUser()');

// AUTO-TEST
console.log('🚀 Lancement auto-test...');
window.testFirebaseSystem(); 