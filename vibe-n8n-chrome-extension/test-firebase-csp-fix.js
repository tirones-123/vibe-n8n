// Test script pour vérifier que Firebase se charge correctement après le fix CSP
console.log('🧪 Test Firebase CSP Fix');

// 1. Vérifier que l'offscreen document existe
async function checkOffscreenDocument() {
  console.log('\n📋 Test 1: Vérification de l\'offscreen document');
  
  try {
    const clients = await self.clients.matchAll();
    const offscreenUrl = chrome.runtime.getURL('/offscreen.html');
    const offscreenClient = clients.find(c => c.url === offscreenUrl);
    
    if (offscreenClient) {
      console.log('✅ Offscreen document trouvé:', offscreenUrl);
      return true;
    } else {
      console.log('❌ Offscreen document non trouvé');
      console.log('📊 Clients disponibles:', clients.map(c => c.url));
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
    return false;
  }
}

// 2. Tester l'envoi d'un message à l'offscreen
async function testOffscreenCommunication() {
  console.log('\n📋 Test 2: Communication avec l\'offscreen document');
  
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'test-firebase-available',
      target: 'offscreen'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Erreur de communication:', chrome.runtime.lastError.message);
        resolve(false);
      } else {
        console.log('✅ Communication réussie:', response);
        resolve(true);
      }
    });
  });
}

// 3. Tester la création d'un compte test
async function testFirebaseAuth() {
  console.log('\n📋 Test 3: Test authentification Firebase');
  
  const testEmail = `test-csp-fix-${Date.now()}@example.com`;
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
        console.log('✅ Authentification réussie !');
        console.log('👤 Utilisateur créé:', response.user);
        console.log('🔑 Token présent:', !!response.token);
        resolve(true);
      } else {
        console.error('❌ Échec authentification:', response?.error);
        resolve(false);
      }
    });
  });
}

// 4. Instructions pour vérifier la console de l'offscreen
function showOffscreenInstructions() {
  console.log('\n📋 Pour vérifier les logs Firebase dans l\'offscreen document:');
  console.log('1. Ouvrir chrome://inspect/#other');
  console.log('2. Chercher "offscreen.html"');
  console.log('3. Cliquer sur "inspect"');
  console.log('4. Vérifier que vous voyez:');
  console.log('   - 🔥 Firebase Auth Offscreen Document starting...');
  console.log('   - ✅ Firebase Auth initialized successfully');
  console.log('   - 📱 Offscreen document ready');
  console.log('5. Pas d\'erreur CSP (Refused to load the script)');
}

// Lancer tous les tests
async function runAllTests() {
  console.log('🚀 Démarrage des tests CSP Fix\n');
  console.log('⚠️  IMPORTANT: Assurez-vous d\'avoir rechargé l\'extension après le fix CSP !');
  
  // Test 1
  const hasOffscreen = await checkOffscreenDocument();
  
  // Attendre un peu
  await new Promise(r => setTimeout(r, 1000));
  
  // Test 2
  const canCommunicate = await testOffscreenCommunication();
  
  if (canCommunicate) {
    // Test 3
    await new Promise(r => setTimeout(r, 1000));
    await testFirebaseAuth();
  } else {
    console.log('⚠️  Communication impossible - vérifiez l\'offscreen document');
  }
  
  // Instructions
  showOffscreenInstructions();
  
  console.log('\n✅ Tests terminés');
  console.log('\n🎯 Résumé:');
  console.log('- Offscreen document existe:', hasOffscreen);
  console.log('- Communication possible:', canCommunicate);
  console.log('\nSi tout est ✅, Firebase fonctionne correctement !');
}

// Exécuter les tests
runAllTests(); 