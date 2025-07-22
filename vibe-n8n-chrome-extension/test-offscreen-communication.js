// Test de communication avec l'Offscreen Document
console.log('🧪 Test de communication Offscreen Document');

// 1. Test de vérification de l'offscreen document
async function testOffscreenExists() {
  console.log('\n📋 Test 1: Vérification de l\'existence de l\'offscreen document');
  
  try {
    const matchedClients = await clients.matchAll();
    const offscreenUrl = chrome.runtime.getURL('/offscreen.html');
    const exists = matchedClients.some(client => client.url === offscreenUrl);
    
    console.log('🔍 URL recherchée:', offscreenUrl);
    console.log('📊 Clients trouvés:', matchedClients.map(c => c.url));
    console.log('✅ Offscreen document existe:', exists);
    
    return exists;
  } catch (error) {
    console.error('❌ Erreur:', error);
    return false;
  }
}

// 2. Test d'envoi de message simple
async function testSimpleMessage() {
  console.log('\n📋 Test 2: Envoi d\'un message simple');
  
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'test-firebase-available',
      target: 'offscreen'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Erreur:', chrome.runtime.lastError.message);
        resolve(false);
      } else {
        console.log('✅ Réponse reçue:', response);
        resolve(true);
      }
    });
  });
}

// 3. Test de création de compte
async function testSignUp() {
  console.log('\n📋 Test 3: Test de création de compte');
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'testPassword123!';
  
  console.log('📧 Email de test:', testEmail);
  
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'firebase-signup-email',
      target: 'offscreen',
      data: {
        email: testEmail,
        password: testPassword
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Erreur runtime:', chrome.runtime.lastError.message);
        resolve(false);
      } else if (response && response.success) {
        console.log('✅ Création réussie:', response.user);
        resolve(true);
      } else {
        console.error('❌ Échec création:', response?.error);
        resolve(false);
      }
    });
  });
}

// 4. Vérifier les logs de l'offscreen document
function checkOffscreenLogs() {
  console.log('\n📋 Pour voir les logs de l\'offscreen document:');
  console.log('1. Aller sur chrome://extensions/');
  console.log('2. Trouver l\'extension "Vibe n8n AI Assistant"');
  console.log('3. Cliquer sur "Service Worker" pour voir les logs du background');
  console.log('4. Dans une nouvelle fenêtre, ouvrir chrome://inspect/#other');
  console.log('5. Chercher "offscreen.html" et cliquer sur "inspect"');
}

// Lancer tous les tests
async function runAllTests() {
  console.log('🚀 Démarrage des tests de communication Offscreen\n');
  
  // Test 1
  const offscreenExists = await testOffscreenExists();
  if (!offscreenExists) {
    console.log('⚠️  L\'offscreen document n\'existe pas encore. Il sera créé au premier appel Firebase.');
  }
  
  // Test 2
  await testSimpleMessage();
  
  // Attendre un peu
  await new Promise(r => setTimeout(r, 1000));
  
  // Test 3
  await testSignUp();
  
  // Instructions finales
  checkOffscreenLogs();
  
  console.log('\n✅ Tests terminés');
}

// Exécuter les tests
runAllTests(); 