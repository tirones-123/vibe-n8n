import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDPB8tHayuvKuhimMQPbJBBLvukFLJIZ8I",
    authDomain: "vibe-n8n-7e40d.firebaseapp.com",
    projectId: "vibe-n8n-7e40d",
    storageBucket: "vibe-n8n-7e40d.firebasestorage.app",
    messagingSenderId: "247816285693",
    appId: "1:247816285693:web:1229eea4a52d6d765afd94",
    measurementId: "G-1CLFCN7KVL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();

// This code runs inside of an iframe in the extension's offscreen document.
// This gives you a reference to the parent frame, i.e. the offscreen document.
// You will need this to assign the targetOrigin for postMessage.
const PARENT_FRAME = document.location.ancestorOrigins[0];

// This demo uses the Google auth provider, but any supported provider works.
// Make sure that you enable any provider you want to use in the Firebase Console.
// https://console.firebase.google.com/project/_/authentication/providers
const PROVIDER = new GoogleAuthProvider();

// Force account selection and prevent automatic sign-in
PROVIDER.setCustomParameters({
  prompt: 'select_account', // Force user to select account
  hd: '', // Allow any domain (remove if you want to restrict to specific domains)
});

// Additional provider settings for better UX
PROVIDER.addScope('email');
PROVIDER.addScope('profile');

function sendResponse(result) {
  globalThis.parent.self.postMessage(JSON.stringify(result), PARENT_FRAME);
}

globalThis.addEventListener('message', function({data}) {
  if (data.initAuth) {
    // Opens the Google sign-in page in a popup, inside of an iframe in the
    // extension's offscreen document.
    // To centralize logic, all respones are forwarded to the parent frame,
    // which goes on to forward them to the extension's service worker.
    signInWithPopup(auth, PROVIDER)
      .then(sendResponse)
      .catch(sendResponse)
  } else if (data.signOut) {
    // Handle sign out request
    console.log('🚪 Firebase iframe: Sign out requested');
    auth.signOut()
      .then(() => {
        console.log('✅ Firebase iframe: Sign out successful');
        sendResponse({ success: true, signedOut: true });
      })
      .catch((error) => {
        console.error('❌ Firebase iframe: Sign out error:', error);
        sendResponse({ success: false, error: error.message });
      });
  } else if (data.getIdToken) {
    // Handle token request
    if (auth.currentUser) {
      auth.currentUser.getIdToken(true)  // Force refresh
        .then((idToken) => {
          console.log('✅ Firebase iframe: Token retrieved');
          sendResponse({ idToken });
        })
        .catch((error) => {
          console.error('❌ Firebase iframe: Token error:', error);
          sendResponse({ error: error.message });
        });
    } else {
      console.log('⚠️ Firebase iframe: No current user for token');
      sendResponse({ error: 'No authenticated user' });
    }
  }
}); 