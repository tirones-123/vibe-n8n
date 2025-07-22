// Test script pour vérifier que Firebase est bien initialisé dans l'Offscreen Document

console.log('🧪 Test Firebase Offscreen - Début');

// Fonction pour envoyer un message au background script
async function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Erreur:', chrome.runtime.lastError.message);
        resolve(null);
      } else {
        console.log('✅ Réponse reçue:', response);
        resolve(response);
      }
    });
  });
}

// Test de création de compte
async function testSignUp() {
  console.log('📝 Test de création de compte...');
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'testPassword123!';
  
  const response = await sendMessage({
    type: 'firebase-signup-email',
    target: 'offscreen',
    data: {
      email: testEmail,
      password: testPassword
    }
  });
  
  if (response && response.success) {
    console.log('✅ Création de compte réussie !');
    console.log('👤 Utilisateur:', response.user);
    console.log('🔑 Token:', response.token ? 'Présent' : 'Absent');
  } else {
    console.error('❌ Échec de la création de compte:', response?.error);
  }
}

// Test de vérification que l'Offscreen Document est actif
async function testOffscreenStatus() {
  console.log('🔍 Vérification du statut Offscreen Document...');
  
  // Envoyer un message test
  const response = await sendMessage({
    type: 'test-firebase-available',
    target: 'offscreen'
  });
  
  console.log('📊 Statut Offscreen:', response);
}

// Lancer les tests
async function runTests() {
  console.log('🚀 Démarrage des tests Firebase Offscreen');
  
  // Test 1: Vérifier le statut
  await testOffscreenStatus();
  
  // Attendre un peu
  await new Promise(r => setTimeout(r, 1000));
  
  // Test 2: Essayer de créer un compte
  await testSignUp();
  
  console.log('✅ Tests terminés');
}

// Exécuter les tests
runTests(); 