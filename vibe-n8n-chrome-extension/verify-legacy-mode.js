// 🧪 VÉRIFICATION MODE LEGACY
console.log('🧪 === VÉRIFICATION MODE LEGACY ===');

function verifyLegacyMode() {
  console.log('🔍 Vérification du mode actuel...');
  
  // 1. Vérifier les paramètres
  const stored = localStorage.getItem('n8n-ai-use-firebase');
  const windowVar = window.useFirebaseAuth;
  
  console.log('📁 localStorage n8n-ai-use-firebase:', stored);
  console.log('🌐 window.useFirebaseAuth:', windowVar);
  
  // 2. Déterminer le mode
  const isLegacyMode = stored === 'false' || windowVar === false;
  console.log(`🎯 Mode détecté: ${isLegacyMode ? 'LEGACY' : 'FIREBASE AUTH'}`);
  
  // 3. Vérifier la cohérence
  if (isLegacyMode) {
    console.log('✅ Mode Legacy configuré correctement');
    
    // Vérifier les objets Firebase (ne devraient pas être utilisés)
    if (window.contentAuthIntegration) {
      console.log('⚠️ contentAuthIntegration présent mais ne devrait pas être utilisé en Legacy');
    }
    
    console.log('💡 En mode Legacy:');
    console.log('  - Pas de login requis');
    console.log('  - Pas de quotas');
    console.log('  - API key fixe utilisée');
    console.log('  - Accès direct au backend');
    
  } else {
    console.log('🔐 Mode Firebase Auth configuré');
    console.log('💡 En mode Firebase:');
    console.log('  - Login email requis');
    console.log('  - Quotas: 70k tokens gratuit puis payant');
    console.log('  - Authentification et pricing');
  }
  
  return isLegacyMode;
}

function simulateWorkflowRequest() {
  console.log('🚀 Simulation de requête workflow...');
  
  // Chercher le bouton AI
  const aiButton = document.querySelector('[data-test-id="ask-assistant-floating-button"]');
  if (aiButton) {
    console.log('✅ Bouton AI trouvé');
    console.log('💡 Pour tester:');
    console.log('  1. Cliquez sur le bouton AI');
    console.log('  2. Tapez: "workflow simple"');
    console.log('  3. Envoyez');
    console.log('  4. En mode Legacy → pas de popup auth');
    console.log('  5. En mode Firebase → popup auth si pas connecté');
  } else {
    console.log('❌ Bouton AI non trouvé');
  }
}

function showModeSwitch() {
  console.log('🔄 Options de basculement:');
  
  if (verifyLegacyMode()) {
    console.log('📋 Pour revenir au mode Firebase:');
    console.log('  localStorage.setItem("n8n-ai-use-firebase", "true");');
    console.log('  location.reload();');
  } else {
    console.log('📋 Pour passer en mode Legacy:');
    console.log('  localStorage.setItem("n8n-ai-use-firebase", "false");');
    console.log('  location.reload();');
  }
}

// Auto-vérification
const isLegacy = verifyLegacyMode();

console.log('');
console.log('🎯 Fonctions disponibles:');
console.log('  verifyLegacyMode()      - Vérifier le mode');
console.log('  simulateWorkflowRequest() - Info test workflow');
console.log('  showModeSwitch()        - Options basculement');

// Exposer les fonctions
window.verifyLegacyMode = verifyLegacyMode;
window.simulateWorkflowRequest = simulateWorkflowRequest;
window.showModeSwitch = showModeSwitch;

// Conseil final
if (isLegacy) {
  console.log('');
  console.log('🎉 Parfait ! Vous êtes en mode Legacy.');
  console.log('🚀 Vous pouvez maintenant générer des workflows sans authentification !');
} else {
  console.log('');
  console.log('🔐 Vous êtes en mode Firebase Auth.');
  console.log('📝 Vous devrez vous connecter pour utiliser l\'assistant.');
} 