// 🔍 DIAGNOSTIC FIREBASE AUTH FUNCTIONS
console.log('🔍 === DIAGNOSTIC FIREBASE AUTH FUNCTIONS ===');

function diagnoseFirebaseAuth() {
  console.log('📊 État actuel des fonctions Firebase Auth:');
  
  // 1. Vérifier les fonctions globales
  const functions = [
    'handleFirebaseSignUp',
    'handleFirebaseSignIn', 
    'handleFirebaseGoogleSignIn'
  ];
  
  functions.forEach(func => {
    const exists = typeof window[func] === 'function';
    console.log(`  ${func}: ${exists ? '✅ Définie' : '❌ Manquante'}`);
    
    if (exists) {
      console.log(`    → Fonction: ${window[func].toString().substring(0, 100)}...`);
    }
  });
  
  // 2. Vérifier contentAuthIntegration
  console.log('');
  console.log('📦 ContentAuthIntegration:');
  console.log(`  Existe: ${!!window.contentAuthIntegration}`);
  
  if (window.contentAuthIntegration) {
    console.log(`  showSimpleAuthModal: ${typeof window.contentAuthIntegration.showSimpleAuthModal}`);
  }
  
  // 3. Vérifier le modal existant
  console.log('');
  console.log('🪟 Modal Firebase Auth:');
  const modal = document.querySelector('.simple-auth-modal');
  console.log(`  Modal existe: ${!!modal}`);
  
  if (modal) {
    const buttons = modal.querySelectorAll('button');
    console.log(`  Boutons trouvés: ${buttons.length}`);
    
    buttons.forEach((btn, i) => {
      const onclick = btn.getAttribute('onclick');
      const text = btn.textContent.trim();
      console.log(`    Bouton ${i+1}: "${text}" → onclick: ${onclick}`);
    });
  }
  
  return {
    functions: functions.map(f => ({ name: f, exists: typeof window[f] === 'function' })),
    contentAuthIntegration: !!window.contentAuthIntegration,
    modal: !!modal
  };
}

function forceDefineFirebaseFunctions() {
  console.log('🔧 Redéfinition forcée des fonctions Firebase Auth...');
  
  // Vérifier si contentAuthIntegration existe
  if (!window.contentAuthIntegration) {
    console.log('❌ contentAuthIntegration manquant - impossible de définir les fonctions');
    return false;
  }
  
  const authIntegration = window.contentAuthIntegration;
  
  // Redéfinir les fonctions globalement
  window.handleFirebaseSignUp = async () => {
    console.log('📝 handleFirebaseSignUp appelé (redéfini)');
    const email = document.getElementById('firebase-email')?.value;
    const password = document.getElementById('firebase-password')?.value;
    
    if (!email || !password) {
      alert('Veuillez remplir tous les champs');
      return;
    }
    
    if (password.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    try {
      console.log('📝 Tentative de création de compte...', email);
      const result = await authIntegration.authService.signUpWithEmail(email, password);
      
      if (result.success) {
        console.log('✅ Compte créé:', result.user.email);
        document.querySelector('.simple-auth-modal')?.remove();
        alert(`Compte créé avec succès ! Bienvenue ${email}`);
        setTimeout(() => location.reload(), 500);
      } else {
        console.error('❌ Erreur création:', result.error);
        alert(`Erreur de création: ${result.error?.message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('❌ Erreur création compte:', error);
      alert(`Erreur de création: ${error.message}`);
    }
  };
  
  window.handleFirebaseSignIn = async () => {
    console.log('🔐 handleFirebaseSignIn appelé (redéfini)');
    const email = document.getElementById('firebase-email')?.value;
    const password = document.getElementById('firebase-password')?.value;
    
    if (!email || !password) {
      alert('Veuillez remplir tous les champs');
      return;
    }
    
    try {
      console.log('🔐 Tentative de connexion Firebase...', email);
      const result = await authIntegration.authService.signInWithEmail(email, password);
      
      if (result.success) {
        console.log('✅ Connexion réussie:', result.user.email);
        document.querySelector('.simple-auth-modal')?.remove();
        alert('Connexion réussie !');
        setTimeout(() => location.reload(), 500);
      } else {
        console.error('❌ Erreur connexion:', result.error);
        alert(`Erreur de connexion: ${result.error?.message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('❌ Erreur connexion:', error);
      alert(`Erreur de connexion: ${error.message}`);
    }
  };
  
  window.handleFirebaseGoogleSignIn = async () => {
    console.log('🔗 handleFirebaseGoogleSignIn appelé (redéfini)');
    try {
      console.log('🔗 Tentative de connexion Google...');
      const result = await authIntegration.authService.signInWithGoogle();
      
      if (result.success) {
        console.log('✅ Connexion Google réussie:', result.user.email);
        document.querySelector('.simple-auth-modal')?.remove();
        setTimeout(() => location.reload(), 500);
      } else {
        console.error('❌ Erreur Google:', result.error);
        alert(`Erreur connexion Google: ${result.error?.message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('❌ Erreur connexion Google:', error);
      alert(`Erreur connexion Google: ${error.message}`);
    }
  };
  
  console.log('✅ Fonctions Firebase Auth redéfinies avec succès');
  
  // Vérifier que les fonctions sont bien définies
  const verification = diagnoseFirebaseAuth();
  return verification;
}

function testModalCreation() {
  console.log('🧪 Test de création du modal...');
  
  if (!window.contentAuthIntegration) {
    console.log('❌ contentAuthIntegration non disponible');
    return false;
  }
  
  // Supprimer le modal existant si présent
  document.querySelector('.simple-auth-modal')?.remove();
  
  console.log('📱 Création du modal Firebase Auth...');
  window.contentAuthIntegration.showSimpleAuthModal();
  
  // Attendre et vérifier
  setTimeout(() => {
    const modal = document.querySelector('.simple-auth-modal');
    console.log(`Modal créé: ${!!modal}`);
    
    if (modal) {
      // Vérifier les fonctions après création
      setTimeout(() => {
        console.log('🔍 Vérification post-création...');
        diagnoseFirebaseAuth();
      }, 100);
    }
  }, 100);
  
  return true;
}

// Instructions
console.log('🎯 Script de diagnostic Firebase Auth');
console.log('');
console.log('💡 Fonctions disponibles:');
console.log('  diagnoseFirebaseAuth()      - Diagnostic complet');
console.log('  forceDefineFirebaseFunctions() - Redéfinition forcée');
console.log('  testModalCreation()         - Test création modal');
console.log('');

// Exposer globalement
window.diagnoseFirebaseAuth = diagnoseFirebaseAuth;
window.forceDefineFirebaseFunctions = forceDefineFirebaseFunctions;
window.testModalCreation = testModalCreation;

// Auto-diagnostic
console.log('🚀 Lancement auto-diagnostic...');
setTimeout(diagnoseFirebaseAuth, 500);
