// Firebase Auth Offscreen Document - Exactement selon la doc officielle
// https://firebase.google.com/docs/auth/web/chrome-extension

// --- Firebase bundles (100 % locaux) ----------------------
const { initializeApp } = await import(
  chrome.runtime.getURL('libs/firebase-app-bundle.js')
);
const { getAuth, onAuthStateChanged, signOut } = await import(
  chrome.runtime.getURL('libs/firebase-auth-webext-bundle.js')
);
// Same config as site
const firebaseConfig = {
    apiKey: "AIzaSyDPB8tHayuvKuhimMQPbJBBLvukFLJIZ8I",
    authDomain: "vibe-n8n-7e40d.firebaseapp.com",
    projectId: "vibe-n8n-7e40d",
    storageBucket: "vibe-n8n-7e40d.firebasestorage.app",
    messagingSenderId: "247816285693",
    appId: "1:247816285693:web:1229eea4a52d6d765afd94",
    measurementId: "G-1CLFCN7KVL"
};

const firebaseApp = initializeApp(firebaseConfig);
const extAuth     = getAuth(firebaseApp);

let currentUser = null; // cache authenticated user (updated via onAuthStateChanged)

onAuthStateChanged(extAuth, (user) => {
  if (user) {
    currentUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    };
  } else {
    currentUser = null;
  }
});
// This URL must point to the public site
const _URL = 'https://vibe-n8n-production.up.railway.app/firebase-auth-site/index.html';

const iframe = document.createElement('iframe');
iframe.src = _URL;
document.documentElement.appendChild(iframe);
chrome.runtime.onMessage.addListener(handleChromeMessages);

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

  if (message.type === 'firebase-auth-get-token') {
    (async () => {
      try {
        if (!extAuth.currentUser) throw new Error('no-user');
        const token = await extAuth.currentUser.getIdToken(message.data?.forceRefresh || false);
        sendResponse({ success: true, token });
      } catch (err) {
        sendResponse({ success: false, error: { code: err.code || 'token-error', message: err.message } });
      }
    })();
    return true;
  }

  if (message.type === 'firebase-auth-signout') {
    (async () => {
      try {
        await signOut(extAuth);
        currentUser = null;
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: { code: err.code, message: err.message } });
      }
    })();
    return true;
  }

  if (message.type === 'firebase-auth-signin-popup') {
    // relaie la demande à l’iframe
    globalThis.addEventListener('message', handleIframeMessage, false);
    postMessageToIframe({ initAuth: true });
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

  return true;
}

function postMessageToIframe(payload){
  const targetOrigin = new URL(_URL).origin;
  if (iframe.contentWindow) {
    iframe.contentWindow.postMessage(payload, targetOrigin);
  } else {
    iframe.addEventListener('load', () => {
      iframe.contentWindow.postMessage(payload, targetOrigin);
    }, { once: true });
  }
} 