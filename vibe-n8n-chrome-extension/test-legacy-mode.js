// 🧪 TEST MODE LEGACY
console.log('🧪 === TEST MODE LEGACY ===');

// Forcer le mode Legacy
function activateLegacyMode() {
  console.log('🔄 Activation du mode Legacy...');
  
  // Sauvegarder le choix
  localStorage.setItem('n8n-ai-use-firebase', 'false');
  window.useFirebaseAuth = false;
  
  console.log('✅ Mode Legacy activé');
  console.log('📁 Paramètre sauvegardé dans localStorage');
  
  // Recharger pour appliquer
  setTimeout(() => {
    console.log('🔄 Rechargement pour appliquer...');
    location.reload();
  }, 1000);
}

// Vérifier le mode actuel
function checkCurrentMode() {
  console.log('🔍 === VÉRIFICATION MODE ACTUEL ===');
  console.log('localStorage n8n-ai-use-firebase:', localStorage.getItem('n8n-ai-use-firebase'));
  console.log('window.useFirebaseAuth:', window.useFirebaseAuth);
  console.log('Mode détecté:', window.useFirebaseAuth ? 'Firebase Auth' : 'Legacy');
}

// Test direct d'une requête Legacy
async function testLegacyRequest() {
  console.log('🚀 Test requête Legacy directe...');
  
  try {
    const response = await fetch('https://vibe-n8n-production.up.railway.app/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer d5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2'
      },
      body: JSON.stringify({
        prompt: 'Test workflow simple avec trigger manuel'
      })
    });
    
    if (response.ok) {
      console.log('✅ Requête Legacy réussie !');
      const data = await response.text();
      console.log('📄 Réponse reçue (', data.length, 'caractères)');
    } else {
      console.log('❌ Erreur HTTP:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.log('❌ Erreur requête:', error.message);
    
    if (error.message.includes('CSP')) {
      console.log('⚠️ Erreur CSP - normal dans la console');
      console.log('💡 La requête doit passer par l\'extension, pas la console');
    }
  }
}

// Afficher les options
console.log('🎯 Fonctions disponibles:');
console.log('  checkCurrentMode()     - Vérifier le mode actuel');
console.log('  activateLegacyMode()   - Activer le mode Legacy');
console.log('  testLegacyRequest()    - Tester une requête Legacy');
console.log('');

// Auto-vérification
checkCurrentMode();

// Exposer les fonctions
window.checkCurrentMode = checkCurrentMode;
window.activateLegacyMode = activateLegacyMode;
window.testLegacyRequest = testLegacyRequest; 