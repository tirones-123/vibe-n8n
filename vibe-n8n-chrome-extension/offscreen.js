// Firebase Auth Offscreen Document - Version avec mini-site externe
// Basé sur la documentation officielle Firebase : https://firebase.google.com/docs/auth/web/chrome-extension

console.log('🔥 Firebase Auth Offscreen Document starting (with external site)...');

// URL du mini-site Firebase Auth sur Railway
const FIREBASE_AUTH_SITE_URL = 'https://vibe-n8n-production.up.railway.app/firebase-auth/';

let firebaseIframe;
let firebaseReady = false;
let pendingRequests = new Map();

// Create iframe for Firebase auth
function createFirebaseIframe() {
  firebaseIframe = document.createElement('iframe');
  firebaseIframe.src = FIREBASE_AUTH_SITE_URL;
  firebaseIframe.style.display = 'none';
  firebaseIframe.onload = () => {
    console.log('📱 Firebase iframe loaded successfully from:', FIREBASE_AUTH_SITE_URL);
  };
  firebaseIframe.onerror = (error) => {
    console.error('❌ Firebase iframe load error:', error);
  };
  document.body.appendChild(firebaseIframe);
  
  console.log('📱 Firebase iframe created');
  console.log('🔗 Firebase iframe src:', firebaseIframe.src);
}

// Listen for messages from Firebase iframe
window.addEventListener('message', (event) => {
  console.log('📨 Offscreen received from iframe:', event.data);
  
  if (event.data.type === 'firebase-ready') {
    firebaseReady = true;
    console.log('✅ Firebase iframe ready');
    return;
  }
  
  if (event.data.type === 'auth-state-changed') {
    // Forward auth state changes to background script
    chrome.runtime.sendMessage({
      type: 'firebase-auth-state-changed',
      user: event.data.user
    }).catch(() => {
      // Ignore if background script is not available
    });
    return;
  }
  
  // Handle auth responses - find the matching request
  for (let [requestId, callback] of pendingRequests.entries()) {
    callback(event.data);
    pendingRequests.delete(requestId);
    break; // Assume first match is correct
  }
});

// Send message to Firebase iframe and wait for response
function sendToFirebaseIframe(message) {
  return new Promise((resolve) => {
    // If Firebase is not ready, wait for it
    if (!firebaseReady) {
      console.log('⏳ Firebase not ready, waiting...');
      
      // Wait up to 10 seconds for Firebase to be ready
      const waitForFirebase = (attempts = 0) => {
        if (firebaseReady) {
          console.log('✅ Firebase ready after waiting');
          sendMessage();
        } else if (attempts < 40) { // 40 * 250ms = 10 seconds
          setTimeout(() => waitForFirebase(attempts + 1), 250);
        } else {
          console.error('❌ Firebase timeout after 10 seconds');
          resolve({ success: false, error: { message: 'Firebase initialization timeout' } });
        }
      };
      
      waitForFirebase();
      return;
    }
    
    sendMessage();
    
    function sendMessage() {
      const requestId = Math.random().toString(36);
      pendingRequests.set(requestId, resolve);
      
      console.log('📤 Sending to Firebase iframe:', message.type);
      firebaseIframe.contentWindow.postMessage(message, '*');
      
      // Timeout after 15 seconds
      setTimeout(() => {
        if (pendingRequests.has(requestId)) {
          pendingRequests.delete(requestId);
          console.error('❌ Firebase request timeout');
          resolve({ success: false, error: { message: 'Request timeout' } });
        }
      }, 15000);
    }
  });
}

// Initialize iframe
createFirebaseIframe();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Offscreen received message:', message);
  
  // Filter messages intended for offscreen document
  if (message.target !== 'offscreen') {
    return false;
  }

  switch (message.type) {
    case 'firebase-auth-signin-email':
      handleSignInWithEmail(message.data, sendResponse);
      break;
      
    case 'firebase-auth-signup-email':
      handleSignUpWithEmail(message.data, sendResponse);
      break;
      
    case 'firebase-auth-signin-google':
      handleSignInWithGoogle(sendResponse);
      break;
      
    case 'firebase-auth-signout':
      handleSignOut(sendResponse);
      break;
      
    case 'firebase-auth-get-token':
      handleGetToken(message.data, sendResponse);
      break;
      
    case 'firebase-auth-get-user':
      handleGetCurrentUser(sendResponse);
      break;
      
    default:
      console.warn('⚠️ Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
      break;
  }
  
  return true; // Keep message channel open for async response
});

// Sign in with email/password
async function handleSignInWithEmail(data, sendResponse) {
  try {
    console.log('🔐 Signing in with email:', data.email);
    const response = await sendToFirebaseIframe({
      type: 'firebase-auth-signin-email',
      email: data.email,
      password: data.password
    });
    
    if (response.success) {
      sendResponse({ 
        success: true, 
        user: response.user,
        token: response.token
      });
    } else {
      sendResponse({ 
        success: false, 
        error: response.error
      });
    }
  } catch (error) {
    console.error('❌ Sign in failed:', error);
    sendResponse({ 
      success: false, 
      error: { code: error.code, message: error.message } 
    });
  }
}

// Sign up with email/password
async function handleSignUpWithEmail(data, sendResponse) {
  try {
    console.log('📝 Signing up with email:', data.email);
    const response = await sendToFirebaseIframe({
      type: 'firebase-auth-signup-email',
      email: data.email,
      password: data.password
    });
    
    if (response.success) {
      sendResponse({ 
        success: true, 
        user: response.user,
        token: response.token
      });
    } else {
      sendResponse({ 
        success: false, 
        error: response.error
      });
    }
  } catch (error) {
    console.error('❌ Sign up failed:', error);
    sendResponse({ 
      success: false, 
      error: { code: error.code, message: error.message } 
    });
  }
}

// Sign in with Google popup
async function handleSignInWithGoogle(sendResponse) {
  try {
    console.log('🔐 Signing in with Google...');
    const response = await sendToFirebaseIframe({
      type: 'firebase-auth-signin-google'
    });
    
    if (response.success) {
      sendResponse({ 
        success: true, 
        user: response.user,
        token: response.token
      });
    } else {
      sendResponse({ 
        success: false, 
        error: response.error
      });
    }
  } catch (error) {
    console.error('❌ Google sign in failed:', error);
    sendResponse({ 
      success: false, 
      error: {
        code: error.code,
        message: error.message
      }
    });
  }
}

// Sign out
async function handleSignOut(sendResponse) {
  try {
    console.log('🚪 Signing out...');
    const response = await sendToFirebaseIframe({
      type: 'firebase-auth-signout'
    });
    
    if (response.success) {
      sendResponse({ success: true });
    } else {
      sendResponse({ 
        success: false, 
        error: response.error
      });
    }
  } catch (error) {
    console.error('❌ Sign out failed:', error);
    sendResponse({ 
      success: false, 
      error: {
        code: error.code,
        message: error.message
      }
    });
  }
}

// Get current ID token
async function handleGetToken(data, sendResponse) {
  try {
    const response = await sendToFirebaseIframe({
      type: 'firebase-auth-get-token',
      data: data
    });
    
    if (response.success) {
      sendResponse({ success: true, token: response.token });
    } else {
      sendResponse({ 
        success: false, 
        error: response.error
      });
    }
  } catch (error) {
    console.error('❌ Get token failed:', error);
    sendResponse({ 
      success: false, 
      error: {
        code: error.code || 'auth/no-current-user',
        message: error.message
      }
    });
  }
}

// Get current user
async function handleGetCurrentUser(sendResponse) {
  try {
    const response = await sendToFirebaseIframe({
      type: 'firebase-auth-get-user'
    });
    
    if (response.success) {
      sendResponse({ 
        success: true, 
        user: response.user
      });
    } else {
      sendResponse({ 
        success: false, 
        error: response.error
      });
    }
  } catch (error) {
    console.error('❌ Get current user failed:', error);
    sendResponse({ 
      success: false, 
      error: {
        code: error.code,
        message: error.message
      }
    });
  }
}

console.log('📱 Offscreen document ready with external Firebase site'); 