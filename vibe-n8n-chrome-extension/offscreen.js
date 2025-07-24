// Firebase Auth Offscreen Document - Exactement selon la doc officielle
// https://firebase.google.com/docs/auth/web/chrome-extension

// This URL must point to the public site
const _URL = 'https://vibe-n8n-production.up.railway.app/firebase-auth/';
let currentUser = null; // cache authenticated user

const iframe = document.createElement('iframe');
iframe.src = _URL;
document.documentElement.appendChild(iframe);
chrome.runtime.onMessage.addListener(handleChromeMessages);

const FIREBASE_API_KEY = "AIzaSyDPB8tHayuvKuhimMQPbJBBLvukFLJIZ8I";

async function firebaseEmailRequest(mode, email, password) {
  const endpoint = mode === 'signup'
    ? `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`
    : `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
  const body = {
    email,
    password,
    returnSecureToken: true
  };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Firebase auth error');
  }
  return res.json();
}

// NEW: Send email verification
async function sendEmailVerification(idToken) {
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`;
  const body = {
    requestType: 'VERIFY_EMAIL',
    idToken: idToken
  };
  
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to send verification email');
  }
  
  return res.json();
}

// NEW: Get user info including email verification status
async function getUserInfo(idToken) {
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`;
  const body = {
    idToken: idToken
  };
  
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to get user info');
  }
  
  const data = await res.json();
  return data.users[0]; // Returns user info including emailVerified
}

function handleChromeMessages(message, sender, sendResponse) {
  // Extensions may have a number of other reasons to send messages, so you
  // should filter out any that are not meant for the offscreen document.
  if (message.target !== 'offscreen') {
    return false;
  }

  if (message.type === 'firebase-auth-get-user') {
    sendResponse({ success: true, user: currentUser });
    return true;
  }

  // NEW: Get Firebase ID token
  if (message.type === 'firebase-auth-get-token') {
    console.log('🎫 Token request received in offscreen');
    console.log('👤 currentUser available:', !!currentUser);
    console.log('🔍 currentUser type:', typeof currentUser);
    console.log('🔧 currentUser keys:', currentUser ? Object.keys(currentUser) : 'none');
    
    if (currentUser && typeof currentUser.getIdToken === 'function') {
      console.log('🔥 Using Firebase SDK getIdToken() method...');
      
      try {
        // Use Firebase SDK method to get fresh token
        currentUser.getIdToken(true) // Force refresh
          .then(token => {
            console.log('✅ Firebase getIdToken SUCCESS:', typeof token, token ? token.substring(0, 50) + '...' : 'null');
            sendResponse(token);
          })
          .catch(error => {
            console.log('❌ Firebase getIdToken ERROR:', error);
            sendResponse(null);
          });
      } catch (syncError) {
        console.log('❌ Error calling getIdToken synchronously:', syncError);
        sendResponse(null);
      }
    } else if (currentUser && currentUser.stsTokenManager && currentUser.stsTokenManager.accessToken) {
      console.log('🔑 Using stsTokenManager.accessToken...');
      const token = currentUser.stsTokenManager.accessToken;
      console.log('✅ Token from stsTokenManager:', typeof token, token ? token.substring(0, 50) + '...' : 'null');
      sendResponse(token);
    } else {
      console.log('❌ No valid way to get Firebase token');
      console.log('  - currentUser.getIdToken available:', !!(currentUser && currentUser.getIdToken));
      console.log('  - currentUser.stsTokenManager available:', !!(currentUser && currentUser.stsTokenManager));
      sendResponse(null);
    }
    
    return true;
  }

  // NEW: Sign-out handler – clear cached user & reset iframe
  if (message.type === 'firebase-auth-signout') {
    try {
      console.log('🚪 Offscreen: Sign out requested');
      currentUser = null;
      
      // First, try to sign out from the iframe Firebase auth
      function handleSignOutMessage({data}) {
        try {
          if (data.startsWith('!_{')) return;
          const parsedData = JSON.parse(data);
          console.log('📨 Sign out response from iframe:', parsedData);
          
          // Whether iframe sign out succeeds or fails, we reset everything
          iframe.src = _URL; // Reload the iframe to reset Firebase auth state
          sendResponse({ success: true });
        } catch (e) {
          console.log('❌ Error parsing sign out response:', e);
          iframe.src = _URL; // Still reset iframe
          sendResponse({ success: true });
        }
        self.removeEventListener('message', handleSignOutMessage);
      }
      
      globalThis.addEventListener('message', handleSignOutMessage, false);
      
      // Request sign out from iframe
      const targetOrigin = new URL(_URL).origin;
      if (iframe && iframe.contentWindow) {
        console.log('📡 Requesting sign out from iframe...');
        iframe.contentWindow.postMessage({ signOut: true }, targetOrigin);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          self.removeEventListener('message', handleSignOutMessage);
          iframe.src = _URL; // Force reload anyway
          sendResponse({ success: true });
        }, 5000);
      } else {
        console.log('❌ No iframe available for sign out');
        sendResponse({ success: true });
      }
    } catch (e) {
      console.log('❌ Sign out error:', e);
      sendResponse({ success: false, error: { message: e.message } });
    }
    return true;
  }

  // NEW: Email/Password sign-in & sign-up handlers
  if (message.type === 'firebase-auth-signin-email' || message.type === 'firebase-auth-signup-email') {
    const mode = message.type.endsWith('signup-email') ? 'signup' : 'signin';
    const { email, password } = message.data || {};
    (async () => {
      try {
        const result = await firebaseEmailRequest(mode, email, password);
        currentUser = {
          uid: result.localId,
          email: result.email,
          idToken: result.idToken,
          refreshToken: result.refreshToken,
          emailVerified: result.emailVerified || false
        };

        // For signup, automatically send email verification
        if (mode === 'signup') {
          try {
            await sendEmailVerification(result.idToken);
            console.log('✅ Email verification sent to:', result.email);
            sendResponse({ 
              success: true, 
              user: currentUser,
              emailVerificationSent: true,
              message: 'Compte créé ! Vérifiez votre email avant d\'utiliser le service.'
            });
          } catch (verificationError) {
            console.error('❌ Failed to send verification email:', verificationError);
            sendResponse({ 
              success: true, 
              user: currentUser,
              emailVerificationSent: false,
              warning: 'Compte créé mais l\'email de vérification n\'a pas pu être envoyé. Contactez le support.'
            });
          }
        } else {
          // For signin, just return user info
          sendResponse({ success: true, user: currentUser });
        }
      } catch (e) {
        sendResponse({ success: false, error: { message: e.message } });
      }
    })();
    return true;
  }

  // NEW: Send email verification handler
  if (message.type === 'firebase-send-email-verification') {
    (async () => {
      try {
        if (!currentUser || !currentUser.idToken) {
          sendResponse({ success: false, error: { message: 'User not authenticated' } });
          return;
        }
        
        await sendEmailVerification(currentUser.idToken);
        sendResponse({ 
          success: true, 
          message: 'Email de vérification envoyé !' 
        });
      } catch (e) {
        sendResponse({ success: false, error: { message: e.message } });
      }
    })();
    return true;
  }

  // NEW: Check email verification status
  if (message.type === 'firebase-check-email-verified') {
    (async () => {
      try {
        if (!currentUser || !currentUser.idToken) {
          sendResponse({ success: false, error: { message: 'User not authenticated' } });
          return;
        }
        
        const userInfo = await getUserInfo(currentUser.idToken);
        const emailVerified = userInfo.emailVerified || false;
        
        // Update current user status
        currentUser.emailVerified = emailVerified;
        
        sendResponse({ 
          success: true, 
          emailVerified: emailVerified,
          user: currentUser
        });
      } catch (e) {
        sendResponse({ success: false, error: { message: e.message } });
      }
    })();
    return true;
  }

  function handleIframeMessage({data}) {
    try {
      if (data.startsWith('!_{')) {
        // Other parts of the Firebase library send messages using postMessage.
        // You don't care about them in this context, so return early.
        return;
      }
      data = JSON.parse(data);
      // Persist authenticated user if available
      if (data && (data.user || data.currentUser)) {
        currentUser = data.user || data.currentUser;
      } else if (data && data.userCredential && data.userCredential.user) {
        currentUser = data.userCredential.user;
      }
      self.removeEventListener('message', handleIframeMessage);

      sendResponse(data);
    } catch (e) {
      console.log(`json parse failed - ${e.message}`);
    }
  }

  globalThis.addEventListener('message', handleIframeMessage, false);

  // Initialize the authentication flow in the iframed document. You must set the
  // second argument (targetOrigin) of the message in order for it to be successfully
  // delivered.
  // Ensure iframe is ready before sending the initAuth signal
  const targetOrigin = new URL(_URL).origin;
  if (iframe.contentWindow) {
    iframe.contentWindow.postMessage({ initAuth: true }, targetOrigin);
  } else {
    // In rare cases iframe isn't ready yet – retry on load
    iframe.addEventListener('load', () => {
      iframe.contentWindow.postMessage({ initAuth: true }, targetOrigin);
    }, { once: true });
  }
  return true;
} 