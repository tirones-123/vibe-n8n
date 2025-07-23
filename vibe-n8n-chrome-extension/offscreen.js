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

  // NEW: Sign-out handler – clear cached user & reset iframe
  if (message.type === 'firebase-auth-signout') {
    try {
      currentUser = null;
      // Reload the iframe to reset Firebase auth state
      iframe.src = _URL;
      sendResponse({ success: true });
    } catch (e) {
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
          refreshToken: result.refreshToken
        };
        sendResponse({ success: true, user: currentUser });
      } catch (e) {
        sendResponse({ success: false, error: { message: e.message } });
      }
    })();
    return true;
  }

  // NEW: Get ID token (optionally force refresh)
  if (message.type === 'firebase-auth-get-token') {
    const forceRefresh = message.data?.forceRefresh;
    (async () => {
      try {
        if (!currentUser) {
          throw new Error('No authenticated user');
        }

        // Si pas de refresh requis et un token est déjà dispo
        let existingToken = extractIdToken(currentUser);
        if (!forceRefresh && existingToken) {
          return sendResponse({ success: true, token: existingToken });
        }

        // Si pas de refresh requis mais token absent, essayer quand même de rafraîchir
        if (!forceRefresh && !existingToken && !currentUser.refreshToken) {
          throw new Error('No ID token available');
        }

        const refreshToken = currentUser.refreshToken;
        if (!refreshToken) {
          // Pas de refreshToken → renvoie l'existingToken (peut être null) ou erreur
          if (existingToken) {
            return sendResponse({ success: true, token: existingToken });
          }
          throw new Error('No refresh token to obtain ID token');
        }

        // Attempt token refresh via Google Identity Toolkit secure token API
        const refreshRes = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString()
        });

        if (!refreshRes.ok) {
          const err = await refreshRes.json();
          throw new Error(err.error?.message || 'Token refresh failed');
        }

        const refreshData = await refreshRes.json();
        currentUser.idToken = refreshData.id_token;
        currentUser.refreshToken = refreshData.refresh_token;
        sendResponse({ success: true, token: currentUser.idToken });
      } catch (e) {
        sendResponse({ success: false, error: { message: e.message } });
      }
    })();
    return true; // Async response
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
      
      // Toujours essayer d'extraire et de stocker idToken si présent
      if (currentUser) {
        const possibleToken = extractIdToken(currentUser);
        if (possibleToken) {
          currentUser.idToken = possibleToken;
        }
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

// Helper pour extraire un JWT idToken d'un objet utilisateur Firebase
function extractIdToken(userObj) {
  if (!userObj) return null;
  if (userObj.idToken) return userObj.idToken;
  if (userObj.accessToken) return userObj.accessToken;
  if (userObj.stsTokenManager && userObj.stsTokenManager.accessToken) {
    return userObj.stsTokenManager.accessToken;
  }
  return null;
} 