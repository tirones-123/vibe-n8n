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