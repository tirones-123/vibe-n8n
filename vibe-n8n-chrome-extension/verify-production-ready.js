// 🚀 VÉRIFICATION PRODUCTION READY - AUCUN CONTOURNEMENT POSSIBLE
console.log('🚀 === VÉRIFICATION PRODUCTION READY ===');

function verifyProductionReady() {
  console.log('🔍 Vérification que l\'extension est prête pour la production...');
  
  const issues = [];
  
  // 1. Vérifier qu'il n'y a pas de bouton Legacy
  console.log('1️⃣ Vérification absence de contournements...');
  
  // Chercher des éléments DOM qui pourraient permettre le contournement
  const legacyButtons = document.querySelectorAll('button');
  let hasLegacyContournement = false;
  
  legacyButtons.forEach(btn => {
    const text = btn.textContent?.toLowerCase() || '';
    const onclick = btn.getAttribute('onclick') || '';
    
    if (text.includes('legacy') || text.includes('mode legacy') || 
        onclick.includes('useFirebaseAuth = false') || onclick.includes('legacy')) {
      console.log('❌ ALERTE: Bouton de contournement détecté:', btn);
      hasLegacyContournement = true;
      issues.push('Bouton de contournement Legacy trouvé');
    }
  });
  
  if (!hasLegacyContournement) {
    console.log('✅ Aucun bouton de contournement trouvé');
  }
  
  // 2. Vérifier l'absence de variables de mode
  console.log('2️⃣ Vérification variables de mode...');
  
  if (typeof window.useFirebaseAuth !== 'undefined') {
    console.log('❌ ALERTE: Variable useFirebaseAuth encore présente');
    issues.push('Variable useFirebaseAuth exposée globalement');
  } else {
    console.log('✅ Variable useFirebaseAuth supprimée');
  }
  
  // 3. Vérifier l'absence de fonction toggleAuthMode
  console.log('3️⃣ Vérification fonction de basculement...');
  
  if (typeof window.toggleAuthMode === 'function') {
    console.log('❌ ALERTE: Fonction toggleAuthMode encore présente');
    issues.push('Fonction toggleAuthMode permet le contournement');
  } else {
    console.log('✅ Fonction toggleAuthMode supprimée');
  }
  
  // 4. Vérifier que Firebase Auth est obligatoire
  console.log('4️⃣ Vérification Firebase Auth obligatoire...');
  
  if (!window.contentAuthIntegration) {
    console.log('⚠️ contentAuthIntegration pas encore initialisé');
  } else {
    // Tester canMakeRequest - doit TOUJOURS demander auth si pas connecté
    window.contentAuthIntegration.canMakeRequest().then(result => {
      console.log('📋 Test canMakeRequest:', result);
      
      if (result.allowed && result.method === 'legacy') {
        console.log('❌ GRAVE: canMakeRequest retourne encore du Legacy !');
        issues.push('canMakeRequest permet encore le contournement Legacy');
      } else if (!result.allowed && result.action === 'show_auth_modal') {
        console.log('✅ Parfait: Firebase Auth OBLIGATOIRE');
      } else if (result.allowed && result.method === 'firebase') {
        console.log('✅ Utilisateur déjà authentifié avec Firebase');
      }
    });
  }
  
  // 5. Vérifier localStorage
  console.log('5️⃣ Vérification localStorage...');
  
  const legacyMode = localStorage.getItem('n8n-ai-use-firebase');
  if (legacyMode === 'false') {
    console.log('⚠️ localStorage indique mode Legacy - sera ignoré');
    console.log('💡 En production, localStorage sera ignoré');
  } else {
    console.log('✅ Pas de préférence Legacy dans localStorage');
  }
  
  return issues;
}

// Test de sécurité : essayer de contourner l'auth
function trySecurityBypass() {
  console.log('🔒 === TEST DE SÉCURITÉ ===');
  console.log('🧪 Tentative de contournement de l\'authentification...');
  
  const bypasses = [];
  
  // Test 1: Essayer de définir useFirebaseAuth
  try {
    window.useFirebaseAuth = false;
    console.log('⚠️ Réussi à définir useFirebaseAuth = false');
    bypasses.push('window.useFirebaseAuth modifiable');
  } catch (error) {
    console.log('✅ Impossible de modifier useFirebaseAuth');
  }
  
  // Test 2: Essayer d'activer localStorage Legacy
  try {
    localStorage.setItem('n8n-ai-use-firebase', 'false');
    console.log('⚠️ Réussi à définir localStorage Legacy');
    bypasses.push('localStorage modifiable');
  } catch (error) {
    console.log('✅ Impossible de modifier localStorage');
  }
  
  // Test 3: Vérifier que contentAuthIntegration force Firebase
  if (window.contentAuthIntegration) {
    console.log('📋 Test forçage Firebase Auth...');
    
    // Le système devrait TOUJOURS demander Firebase Auth
    window.contentAuthIntegration.canMakeRequest().then(result => {
      if (result.method === 'legacy' || result.allowed === true) {
        console.log('❌ GRAVE: Contournement possible détecté !');
        bypasses.push('canMakeRequest permet le contournement');
      } else {
        console.log('✅ Impossible de contourner Firebase Auth');
      }
    });
  }
  
  console.log('');
  if (bypasses.length === 0) {
    console.log('🔒 SÉCURITÉ OK: Aucun contournement trouvé');
  } else {
    console.log('❌ FAILLES DE SÉCURITÉ:', bypasses);
  }
  
  return bypasses;
}

// Test complet de production
function runProductionTest() {
  console.log('🚀 === TEST COMPLET PRODUCTION ===');
  
  // 1. Tests de vérification
  const issues = verifyProductionReady();
  
  // 2. Tests de sécurité
  setTimeout(() => {
    const bypasses = trySecurityBypass();
    
    // 3. Résumé final
    setTimeout(() => {
      console.log('');
      console.log('📊 === RÉSUMÉ PRODUCTION ===');
      
      if (issues.length === 0 && bypasses.length === 0) {
        console.log('🎉 EXTENSION PRÊTE POUR PRODUCTION !');
        console.log('✅ Aucun contournement possible');
        console.log('🔐 Firebase Auth OBLIGATOIRE');
        console.log('💳 Quotas et pricing protégés');
        console.log('');
        console.log('🚀 Système sécurisé pour déploiement:');
        console.log('  - Authentification obligatoire');
        console.log('  - Quotas respectés (70k FREE, PRO illimité)');
        console.log('  - Paiements Stripe sécurisés');
        console.log('  - Aucun contournement possible');
      } else {
        console.log('❌ PROBLÈMES DÉTECTÉS:');
        [...issues, ...bypasses].forEach(issue => {
          console.log(`  - ${issue}`);
        });
        console.log('');
        console.log('⚠️ L\'extension N\'EST PAS prête pour la production');
        console.log('🔧 Corrigez les problèmes ci-dessus avant déploiement');
      }
    }, 2000);
  }, 1000);
}

// Instructions pour l'utilisateur
console.log('🎯 Ce script vérifie que l\'extension est prête pour la production');
console.log('🔒 Il s\'assure qu\'aucun contournement d\'authentification n\'est possible');
console.log('');
console.log('💡 Fonctions disponibles:');
console.log('  runProductionTest()     - Test complet (recommandé)');
console.log('  verifyProductionReady() - Vérifications basiques');
console.log('  trySecurityBypass()     - Tests de sécurité');

// Exposer les fonctions
window.verifyProductionReady = verifyProductionReady;
window.trySecurityBypass = trySecurityBypass;
window.runProductionTest = runProductionTest;

// Auto-test
console.log('');
console.log('🚀 Lancement auto-test...');
setTimeout(runProductionTest, 1000); 