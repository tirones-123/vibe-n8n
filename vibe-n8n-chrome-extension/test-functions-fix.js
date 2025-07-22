// 🧪 TEST CORRECTION FONCTIONS FIREBASE AUTH
console.log('🧪 === TEST CORRECTION FIREBASE AUTH ===');

function quickTest() {
  console.log('⚡ Test rapide des fonctions Firebase Auth...');
  
  // 1. Vérifier les fonctions
  const functions = [
    'handleFirebaseSignUp',
    'handleFirebaseSignIn', 
    'handleFirebaseGoogleSignIn'
  ];
  
  console.log('📊 État des fonctions:');
  let allOk = true;
  
  functions.forEach(func => {
    const exists = typeof window[func] === 'function';
    console.log(`  ${func}: ${exists ? '✅' : '❌'}`);
    if (!exists) allOk = false;
  });
  
  // 2. Vérifier contentAuthIntegration
  console.log('');
  console.log('📦 Système:');
  console.log(`  contentAuthIntegration: ${!!window.contentAuthIntegration ? '✅' : '❌'}`);
  console.log(`  authService: ${!!window.authService ? '✅' : '❌'}`);
  
  // 3. Test du modal si pas déjà affiché
  if (!document.querySelector('.simple-auth-modal')) {
    console.log('');
    console.log('🪟 Test modal...');
    
    if (window.contentAuthIntegration) {
      window.contentAuthIntegration.showSimpleAuthModal();
      
      setTimeout(() => {
        const modal = document.querySelector('.simple-auth-modal');
        console.log(`  Modal créé: ${!!modal ? '✅' : '❌'}`);
        
        if (modal) {
          const buttons = modal.querySelectorAll('button');
          console.log(`  Boutons: ${buttons.length} trouvés`);
          
          // Test spécifique du bouton "Créer un compte"
          const signUpBtn = Array.from(buttons).find(btn => 
            btn.textContent.includes('Créer un compte')
          );
          
          if (signUpBtn) {
            console.log('  Bouton "Créer un compte": ✅ Trouvé');
            console.log(`    onclick: ${signUpBtn.getAttribute('onclick')}`);
          } else {
            console.log('  Bouton "Créer un compte": ❌ Non trouvé');
          }
        }
      }, 100);
    } else {
      console.log('  ❌ contentAuthIntegration non disponible');
    }
  } else {
    console.log('🪟 Modal Firebase Auth déjà affiché');
  }
  
  // 4. Résumé
  setTimeout(() => {
    console.log('');
    if (allOk && window.contentAuthIntegration) {
      console.log('🎉 CORRECTION RÉUSSIE !');
      console.log('✅ Toutes les fonctions Firebase Auth sont définies');
      console.log('💡 Les boutons du modal devraient maintenant fonctionner');
    } else {
      console.log('❌ Des problèmes persistent...');
      console.log('🔧 Essayez de recharger l\'extension et la page');
    }
  }, 200);
  
  return allOk;
}

function testButtonClick() {
  console.log('🧪 Test simulation clic bouton...');
  
  if (typeof window.handleFirebaseSignUp !== 'function') {
    console.log('❌ handleFirebaseSignUp non définie');
    return false;
  }
  
  // S'assurer qu'il y a un modal avec les champs
  if (!document.querySelector('.simple-auth-modal')) {
    console.log('📱 Création du modal pour test...');
    if (window.contentAuthIntegration) {
      window.contentAuthIntegration.showSimpleAuthModal();
    } else {
      console.log('❌ contentAuthIntegration non disponible');
      return false;
    }
  }
  
  setTimeout(() => {
    // Remplir les champs de test
    const email = document.getElementById('firebase-email');
    const password = document.getElementById('firebase-password');
    
    if (email && password) {
      email.value = 'test@example.com';
      password.value = 'test123456';
      console.log('✅ Champs remplis avec valeurs de test');
      console.log('💡 Maintenant cliquez sur "Créer un compte" ou testez avec:');
      console.log('  window.handleFirebaseSignUp()');
    } else {
      console.log('❌ Champs email/password non trouvés');
    }
  }, 100);
  
  return true;
}

// Instructions
console.log('🎯 Script de test pour la correction Firebase Auth');
console.log('');
console.log('💡 Fonctions disponibles:');
console.log('  quickTest()      - Test rapide complet');
console.log('  testButtonClick() - Test clic bouton');
console.log('');

// Exposer les fonctions
window.quickTest = quickTest;
window.testButtonClick = testButtonClick;

// Auto-test
console.log('🚀 Lancement auto-test...');
setTimeout(quickTest, 500); 