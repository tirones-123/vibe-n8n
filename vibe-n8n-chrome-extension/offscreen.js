// Firebase Auth Offscreen Document - Exactement selon la doc officielle
// https://firebase.google.com/docs/auth/web/chrome-extension

// This URL must point to the public site
const _URL = 'https://vibe-n8n.com/firebase-auth/';
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
  
  const result = await res.json();
  
  // Si c'est un signup, envoyer automatiquement l'email de vérification
  if (mode === 'signup') {
    try {
      console.log('📧 Sending email verification after signup...');
      
      const verificationRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'VERIFY_EMAIL',
          idToken: result.idToken
        })
      });
      
      if (verificationRes.ok) {
        console.log('✅ Email verification sent successfully');
        result.verificationEmailSent = true;
      } else {
        console.warn('⚠️ Failed to send verification email:', verificationRes.status);
        result.verificationEmailSent = false;
      }
    } catch (verificationError) {
      console.error('❌ Error sending verification email:', verificationError);
      result.verificationEmailSent = false;
    }
  }
  
  return result;
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
    
    if (currentUser && currentUser.idToken) {
      // PRIORITÉ 1: Utiliser l'idToken directement (notre objet plat après signup/signin)
      console.log('✅ Using currentUser.idToken directly:', typeof currentUser.idToken, currentUser.idToken ? currentUser.idToken.substring(0, 50) + '...' : 'null');
      sendResponse(currentUser.idToken);
    } else if (currentUser && typeof currentUser.getIdToken === 'function') {
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
      console.log('❌ No Firebase token available - user must sign in');
      console.log('  - currentUser exists:', !!currentUser);
      console.log('  - currentUser.idToken available:', !!(currentUser && currentUser.idToken));
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
          emailVerified: false  // Pour les nouveaux comptes email/password
        };
        
        // Si c'est un signup, créer immédiatement l'utilisateur dans la base de données
        if (mode === 'signup') {
          try {
            console.log('👤 Creating user entry in database after signup...');
            
            const createUserRes = await fetch('https://vibe-n8n.com/api/initialize-new-user', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${result.idToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (createUserRes.ok) {
              const userCreationResult = await createUserRes.json();
              console.log('✅ User entry created in database:', userCreationResult.user);
              currentUser.databaseUserCreated = true;
            } else {
              console.warn('⚠️ Failed to create user entry in database:', createUserRes.status);
              currentUser.databaseUserCreated = false;
            }
          } catch (userCreationError) {
            console.error('❌ Error creating user entry in database:', userCreationError);
            currentUser.databaseUserCreated = false;
          }
        }
        
        sendResponse({ 
          success: true, 
          user: currentUser,
          isNewUser: mode === 'signup',
          verificationEmailSent: result.verificationEmailSent || false
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