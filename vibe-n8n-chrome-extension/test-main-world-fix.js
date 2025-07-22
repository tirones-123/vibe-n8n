// 🧪 TEST MAIN WORLD FIREBASE AUTH FIX
console.log('🧪 === TEST MAIN WORLD FIREBASE AUTH FIX ===');

function testMainWorldFunctions() {
  console.log('🌐 Test des fonctions dans le Main World...');
  
  // Test direct des fonctions (maintenant dans le Main World)
  const functions = [
    'handleFirebaseSignUp',
    'handleFirebaseSignIn', 
    'handleFirebaseGoogleSignIn'
  ];
  
  console.log('📊 État des fonctions Main World:');
  let allOk = true;
  
  functions.forEach(func => {
    const exists = typeof window[func] === 'function';
    console.log(`  ${func}: ${exists ? '✅ Disponible' : '❌ Manquante'}`);
    if (!exists) allOk = false;
    
    if (exists) {
      // Tester que la fonction est bien callable
      try {
        console.log(`    → Type: ${typeof window[func]}`);
        console.log(`    → Callable: ${typeof window[func] === 'function' ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`    → Erreur: ${error.message}`);
        allOk = false;
      }
    }
  });
  
  return allOk;
}

function testEventCommunication() {
  console.log('📡 Test communication Main World ↔ Content Script...');
  
  // Test d'envoi d'événement au content script
  function testEvent() {
    const testData = { action: 'test', data: { test: true }, id: 'test-123' };
    
    console.log('📤 Envoi événement test...');
    
    // Écouter la réponse
    const responseHandler = (event) => {
      if (event.detail && event.detail.responseId === 'test-123') {
        console.log('📨 Réponse reçue:', event.detail);
        document.removeEventListener('firebaseAuthResponse', responseHandler);
      }
    };
    
    document.addEventListener('firebaseAuthResponse', responseHandler);
    
    // Envoyer l'événement
    document.dispatchEvent(new CustomEvent('firebaseAuthRequest', { detail: testData }));
    
    // Timeout
    setTimeout(() => {
      document.removeEventListener('firebaseAuthResponse', responseHandler);
      console.log('⏰ Test événement timeout');
    }, 2000);
  }
  
  testEvent();
}

function createTestModal() {
  console.log('🪟 Création d\'un modal de test...');
  
  // Supprimer modal existant
  document.querySelector('.test-modal')?.remove();
  
  const modal = document.createElement('div');
  modal.className = 'test-modal';
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 99999;
    border: 2px solid #2563eb;
  `;
  
  modal.innerHTML = `
    <h3>🧪 Test Firebase Auth (Main World)</h3>
    <input type="email" id="test-email" value="test@example.com" placeholder="Email" style="width: 100%; margin: 5px 0; padding: 8px;">
    <input type="password" id="test-password" value="test123456" placeholder="Password" style="width: 100%; margin: 5px 0; padding: 8px;">
    <br><br>
    <button onclick="window.handleFirebaseSignUp()" style="margin: 5px; padding: 10px; background: #059669; color: white; border: none; border-radius: 4px;">
      Test Sign Up
    </button>
    <button onclick="window.handleFirebaseSignIn()" style="margin: 5px; padding: 10px; background: #2563eb; color: white; border: none; border-radius: 4px;">
      Test Sign In
    </button>
    <button onclick="document.querySelector('.test-modal').remove()" style="margin: 5px; padding: 10px; background: #6b7280; color: white; border: none; border-radius: 4px;">
      Fermer
    </button>
  `;
  
  document.body.appendChild(modal);
  
  console.log('✅ Modal de test créé');
  console.log('💡 Cliquez sur les boutons pour tester les fonctions Firebase Auth');
}

function runFullTest() {
  console.log('🚀 === TEST COMPLET MAIN WORLD ===');
  
  // 1. Test des fonctions
  const functionsOk = testMainWorldFunctions();
  
  // 2. Test communication
  setTimeout(() => {
    testEventCommunication();
  }, 500);
  
  // 3. Créer modal de test
  setTimeout(() => {
    if (functionsOk) {
      createTestModal();
      console.log('');
      console.log('🎉 FONCTIONS MAIN WORLD DISPONIBLES !');
      console.log('✅ Les boutons Firebase Auth devraient maintenant fonctionner');
      console.log('🧪 Modal de test créé pour validation');
    } else {
      console.log('');
      console.log('❌ Fonctions Main World non disponibles');
      console.log('🔧 Rechargez l\'extension et la page');
    }
  }, 1000);
  
  return functionsOk;
}

function quickCheck() {
  console.log('⚡ Vérification rapide...');
  
  const checks = {
    'handleFirebaseSignUp': typeof window.handleFirebaseSignUp === 'function',
    'handleFirebaseSignIn': typeof window.handleFirebaseSignIn === 'function',
    'handleFirebaseGoogleSignIn': typeof window.handleFirebaseGoogleSignIn === 'function'
  };
  
  console.log('📊 Résultats:');
  Object.entries(checks).forEach(([func, ok]) => {
    console.log(`  ${func}: ${ok ? '✅' : '❌'}`);
  });
  
  const allOk = Object.values(checks).every(v => v);
  console.log(`\n${allOk ? '🎉 TOUTES LES FONCTIONS DISPONIBLES !' : '❌ Fonctions manquantes'}`);
  
  return allOk;
}

// Instructions
console.log('🎯 Script de test pour la correction Main World');
console.log('');
console.log('💡 Fonctions disponibles:');
console.log('  quickCheck()         - Vérification rapide');
console.log('  testMainWorldFunctions() - Test détaillé');
console.log('  createTestModal()    - Créer modal de test');
console.log('  runFullTest()        - Test complet (recommandé)');
console.log('');

// Exposer les fonctions
window.quickCheck = quickCheck;
window.testMainWorldFunctions = testMainWorldFunctions;
window.createTestModal = createTestModal;
window.runFullTest = runFullTest;

// Auto-test
console.log('🚀 Lancement auto-test...');
setTimeout(runFullTest, 1000); 