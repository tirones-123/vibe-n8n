// Script de debug simple pour la console de l'extension (service worker)
console.log('🔧 DEBUG: Service Worker Firebase State');

// Test Firebase functions directly
async function testFirebaseAuth() {
  console.log('🧪 Testing Firebase authentication in service worker...');
  
  try {
    // Test 1: Get current user
    console.log('1️⃣ Testing firebaseGetCurrentUser...');
    const currentUser = await firebaseGetCurrentUser();
    console.log('👤 Current user result:', currentUser);
    
    if (currentUser && currentUser.success !== false) {
      console.log('✅ User is authenticated with Firebase');
      
      // Test 2: Get Firebase token
      console.log('2️⃣ Testing firebaseGetIdToken...');
      const token = await firebaseGetIdToken();
      console.log('🎫 Token result:', typeof token, token ? token.substring(0, 50) + '...' : 'null');
      
      if (token && typeof token === 'string') {
        console.log('✅ Firebase token available!');
        
        // Test 3: Test with backend
        console.log('3️⃣ Testing token with backend...');
        testTokenWithBackend(token);
      } else {
        console.log('❌ No valid Firebase token received');
        
        // Try force refresh
        console.log('🔄 Trying force refresh...');
        const refreshedToken = await firebaseGetIdToken(true);
        console.log('🔄 Refreshed token:', typeof refreshedToken, refreshedToken ? refreshedToken.substring(0, 50) + '...' : 'null');
      }
    } else {
      console.log('❌ User is not authenticated with Firebase');
    }
    
  } catch (error) {
    console.error('❌ Error testing Firebase auth:', error);
  }
}

// Test token with backend
async function testTokenWithBackend(token) {
  try {
    const response = await fetch('https://vibe-n8n-production.up.railway.app/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Auth-Method': 'FIREBASE'
      },
      body: JSON.stringify({
        prompt: 'test firebase debug'
      })
    });
    
    console.log('📊 Backend response:', response.status, response.statusText);
    
    if (response.ok) {
      console.log('✅ Firebase token accepted by backend!');
      
      // Read first SSE event
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const { value } = await reader.read();
      
      if (value) {
        const chunk = decoder.decode(value);
        console.log('📡 First SSE event:', chunk.substring(0, 200) + '...');
      }
      
      reader.cancel();
    } else {
      const errorText = await response.text();
      console.error('❌ Backend rejected token:', response.status, errorText);
    }
    
  } catch (error) {
    console.error('❌ Backend test failed:', error);
  }
}

// Check if functions exist
console.log('📋 Available functions:');
console.log('- firebaseGetCurrentUser:', typeof firebaseGetCurrentUser);
console.log('- firebaseGetIdToken:', typeof firebaseGetIdToken);
console.log('- CONFIG:', typeof CONFIG);

if (typeof CONFIG !== 'undefined') {
  console.log('🔗 CONFIG.API_URL:', CONFIG.API_URL);
  console.log('🔑 CONFIG.API_KEY length:', CONFIG.API_KEY?.length);
}

// Run the test
testFirebaseAuth(); 