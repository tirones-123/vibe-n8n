/**
 * Script de debug pour tester l'authentification Firebase dans l'extension Chrome
 * À exécuter dans la console de l'extension sur une page n8n
 */

console.log('🔧 DEBUG: Extension Firebase Auth State');

// Test 1: Vérifier si l'extension est chargée
if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log('✅ Chrome extension API available');
  
  // Test 2: Ping le service worker
  chrome.runtime.sendMessage({ type: 'PING_SERVICE_WORKER' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Service worker ping failed:', chrome.runtime.lastError.message);
    } else {
      console.log('✅ Service worker ping successful:', response);
      
      // Test 3: Vérifier l'utilisateur Firebase actuel
      chrome.runtime.sendMessage({ type: 'firebase-get-user' }, (userResponse) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Firebase get user failed:', chrome.runtime.lastError.message);
        } else {
          console.log('🔥 Firebase user response:', userResponse);
          
          if (userResponse && (userResponse.success !== false)) {
            console.log('✅ User is authenticated with Firebase');
            
            // Test 4: Essayer de récupérer le token
            chrome.runtime.sendMessage({ 
              type: 'firebase-get-token',
              data: { forceRefresh: false }
            }, (tokenResponse) => {
              if (chrome.runtime.lastError) {
                console.error('❌ Firebase get token failed:', chrome.runtime.lastError.message);
              } else {
                console.log('🎫 Firebase token response type:', typeof tokenResponse);
                console.log('🎫 Firebase token response:', tokenResponse);
                
                if (tokenResponse && typeof tokenResponse === 'string') {
                  console.log('✅ Firebase token available (length:', tokenResponse.length, ')');
                  console.log('🔤 Token preview:', tokenResponse.substring(0, 50) + '...');
                  
                  // Test 5: Tester le token avec l'API backend
                  testTokenWithBackend(tokenResponse);
                } else {
                  console.log('❌ No valid Firebase token received');
                  console.log('🔄 Trying to refresh token...');
                  
                  // Essayer avec forceRefresh
                  chrome.runtime.sendMessage({ 
                    type: 'firebase-get-token',
                    data: { forceRefresh: true }
                  }, (refreshedTokenResponse) => {
                    if (chrome.runtime.lastError) {
                      console.error('❌ Firebase token refresh failed:', chrome.runtime.lastError.message);
                    } else {
                      console.log('🔄 Refreshed token response:', refreshedTokenResponse);
                    }
                  });
                }
              }
            });
          } else {
            console.log('❌ User is not authenticated with Firebase');
            console.log('🔐 Try signing in with Firebase first');
          }
        }
      });
    }
  });
} else {
  console.error('❌ Chrome extension API not available');
}

// Function to test token with backend
async function testTokenWithBackend(token) {
  console.log('🧪 Testing Firebase token with backend...');
  
  try {
    const response = await fetch('https://vibe-n8n-production.up.railway.app/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Auth-Method': 'FIREBASE'
      },
      body: JSON.stringify({
        prompt: 'test firebase token'
      })
    });
    
    console.log('📊 Backend response status:', response.status);
    console.log('📋 Backend response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      console.log('✅ Firebase token accepted by backend!');
      
      // Read first few SSE events
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let lineCount = 0;
      
      while (lineCount < 3) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            console.log('📡 SSE Event:', line.substring(0, 100) + '...');
            lineCount++;
            if (lineCount >= 3) break;
          }
        }
      }
      
      reader.cancel();
    } else {
      const errorText = await response.text();
      console.error('❌ Backend rejected Firebase token:', response.status, errorText);
    }
    
  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
  }
}

// Test complémentaire: vérifier la configuration
console.log('📋 Extension configuration check:');
if (typeof CONFIG !== 'undefined') {
  console.log('✅ CONFIG available');
  console.log('🔗 API_URL:', CONFIG.API_URL);
  console.log('🔑 Has LEGACY_API_KEY:', !!CONFIG.LEGACY_API_KEY);
} else {
  console.log('❌ CONFIG not available');
}

// Instructions pour l'utilisateur
console.log('\n📝 INSTRUCTIONS:');
console.log('1. Coller ce script dans la console de Chrome sur une page n8n');
console.log('2. Vérifier que vous êtes connecté avec Firebase dans l\'extension');
console.log('3. Analyser les résultats des tests ci-dessus');
console.log('4. Si "Firebase token available" ✅, le problème est dans la logique de l\'extension');
console.log('5. Si "No valid Firebase token" ❌, le problème est dans l\'auth Firebase'); 