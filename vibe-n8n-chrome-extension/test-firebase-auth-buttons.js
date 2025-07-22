// 🧪 TEST BOUTONS FIREBASE AUTH
console.log('🧪 === TEST FONCTIONS FIREBASE AUTH ===');

function testFirebaseAuthFunctions() {
  console.log('🔍 Vérification des fonctions Firebase Auth...');
  
  const tests = {
    handleFirebaseSignIn: typeof window.handleFirebaseSignIn === 'function',
    handleFirebaseSignUp: typeof window.handleFirebaseSignUp === 'function', 
    handleFirebaseGoogleSignIn: typeof window.handleFirebaseGoogleSignIn === 'function'
  };
  
  console.log('📊 Résultats des tests:');
  Object.entries(tests).forEach(([func, available]) => {
    console.log(`  ${func}: ${available ? '✅ Disponible' : '❌ Manquant'}`);
  });
  
  const allFunctionsAvailable = Object.values(tests).every(test => test);
  
  if (allFunctionsAvailable) {
    console.log('🎉 Toutes les fonctions Firebase Auth sont disponibles !');
  } else {
    console.log('❌ Certaines fonctions Firebase Auth manquent');
  }
  
  return tests;
}

function testModalButtons() {
  console.log('🔍 Test des boutons du modal...');
  
  const modal = document.querySelector('.simple-auth-modal');
  if (!modal) {
    console.log('⚠️ Modal Firebase Auth non trouvé. Affichez-le d\'abord avec showFirebaseAuthModal()');
    return false;
  }
  
  const buttons = modal.querySelectorAll('button');
  console.log(`📊 ${buttons.length} boutons trouvés dans le modal`);
  
  buttons.forEach((btn, index) => {
    const onclick = btn.getAttribute('onclick');
    const text = btn.textContent.trim();
    
    console.log(`  Bouton ${index + 1}: "${text}"`);
    console.log(`    onclick: ${onclick || 'Aucun'}`);
    
    if (onclick && onclick.includes('window.handle')) {
      const functionName = onclick.match(/window\.(handle\w+)/)?.[1];
      if (functionName && window[functionName]) {
        console.log(`    ✅ Fonction ${functionName} disponible`);
      } else {
        console.log(`    ❌ Fonction ${functionName} non disponible`);
      }
    }
  });
  
  return true;
}

function simulateButtonClick(buttonType) {
  console.log(`🧪 Simulation clic bouton ${buttonType}...`);
  
  // D'abord afficher le modal s'il n'existe pas
  if (!document.querySelector('.simple-auth-modal')) {
    if (window.contentAuthIntegration) {
      window.contentAuthIntegration.showSimpleAuthModal();
      
      // Attendre que le modal soit créé
      setTimeout(() => {
        console.log('✅ Modal créé, maintenant tester le bouton...');
        performButtonTest(buttonType);
      }, 100);
    } else {
      console.log('❌ contentAuthIntegration non disponible');
      return;
    }
  } else {
    performButtonTest(buttonType);
  }
}

function performButtonTest(buttonType) {
  // Remplir les champs de test
  const emailField = document.getElementById('firebase-email');
  const passwordField = document.getElementById('firebase-password');
  
  if (emailField && passwordField && (buttonType === 'signup' || buttonType === 'signin')) {
    emailField.value = 'test@example.com';
    passwordField.value = 'test123456';
    console.log('✅ Champs email/password remplis avec des valeurs de test');
  }
  
  // Tester la fonction correspondante
  try {
    switch (buttonType) {
      case 'signup':
        console.log('🧪 Test handleFirebaseSignUp...');
        if (window.handleFirebaseSignUp) {
          console.log('✅ Fonction trouvée, prêt pour test réel');
          console.log('💡 Pour tester: window.handleFirebaseSignUp()');
        }
        break;
        
      case 'signin':
        console.log('🧪 Test handleFirebaseSignIn...');
        if (window.handleFirebaseSignIn) {
          console.log('✅ Fonction trouvée, prêt pour test réel');
          console.log('💡 Pour tester: window.handleFirebaseSignIn()');
        }
        break;
        
      case 'google':
        console.log('🧪 Test handleFirebaseGoogleSignIn...');
        if (window.handleFirebaseGoogleSignIn) {
          console.log('✅ Fonction trouvée, prêt pour test réel');
          console.log('💡 Pour tester: window.handleFirebaseGoogleSignIn()');
        }
        break;
    }
  } catch (error) {
    console.error('❌ Erreur pendant le test:', error);
  }
}

function runCompleteTest() {
  console.log('🚀 === TEST COMPLET FIREBASE AUTH ===');
  
  // 1. Test des fonctions
  const functionTests = testFirebaseAuthFunctions();
  
  // 2. Test du modal
  setTimeout(() => {
    if (!document.querySelector('.simple-auth-modal')) {
      console.log('📱 Affichage du modal pour test...');
      if (window.contentAuthIntegration) {
        window.contentAuthIntegration.showSimpleAuthModal();
        
        setTimeout(() => {
          testModalButtons();
        }, 200);
      }
    } else {
      testModalButtons();
    }
  }, 500);
  
  return functionTests;
}

// Instructions
console.log('🎯 Ce script teste les fonctions Firebase Auth');
console.log('');
console.log('💡 Fonctions disponibles:');
console.log('  testFirebaseAuthFunctions() - Vérifier si les fonctions existent');
console.log('  testModalButtons()          - Tester les boutons du modal');
console.log('  simulateButtonClick(type)   - Simuler clic (signup/signin/google)');
console.log('  runCompleteTest()           - Test complet (recommandé)');
console.log('');
console.log('📝 Exemples:');
console.log('  simulateButtonClick("signup")  - Test bouton "Créer un compte"');
console.log('  simulateButtonClick("signin")  - Test bouton "Se connecter"');
console.log('  simulateButtonClick("google")  - Test bouton Google');

// Exposer les fonctions
window.testFirebaseAuthFunctions = testFirebaseAuthFunctions;
window.testModalButtons = testModalButtons;
window.simulateButtonClick = simulateButtonClick;
window.runCompleteTest = runCompleteTest;

// Auto-test
console.log('');
console.log('🚀 Lancement auto-test...');
setTimeout(runCompleteTest, 1000); 