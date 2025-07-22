// Firebase Auth Offscreen Document - Implementation selon la doc officielle
// Basé sur https://firebase.google.com/docs/auth/web/chrome-extension

console.log('🔥 Firebase Auth Offscreen Document starting...');

// This URL must point to the public site - selon la doc officielle
const _URL = 'https://vibe-n8n-production.up.railway.app/firebase-auth/';

// Créer l'iframe selon la doc officielle
const iframe = document.createElement('iframe');
iframe.src = _URL;
iframe.style.display = 'none';
document.documentElement.appendChild(iframe);

console.log('📱 Firebase iframe created with URL:', _URL);

// Écouter les messages depuis le background script - selon la doc officielle
chrome.runtime.onMessage.addListener(handleChromeMessages);

function handleChromeMessages(message, sender, sendResponse) {
  console.log('📨 Offscreen received message:', message);
  
  // Extensions may have a number of other reasons to send messages, so you
  // should filter out any that are not meant for the offscreen document.
  if (message.target !== 'offscreen') {
    return false;
  }

  function handleIframeMessage({data}) {
    try {
      if (data.startsWith && data.startsWith('!_{')) {
        // Other parts of the Firebase library send messages using postMessage.
        // You don't care about them in this context, so return early.
        console.log('📝 Ignoring Firebase internal message');
        return;
      }
      
      console.log('📨 Received data from iframe:', data);
      
      // If data is already an object, use it directly
      let parsedData = data;
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          console.log(`JSON parse failed - ${e.message}`);
          return;
        }
      }
      
      self.removeEventListener('message', handleIframeMessage);
      console.log('📤 Sending response to background script:', parsedData);
      sendResponse(parsedData);
    } catch (e) {
      console.error(`Error handling iframe message - ${e.message}`);
      sendResponse({
        success: false,
        error: { code: 'offscreen/message-error', message: e.message }
      });
    }
  }

  globalThis.addEventListener('message', handleIframeMessage, false);

  // Déterminer le message à envoyer à l'iframe
  let iframeMessage;
  
  switch (message.type) {
    case 'firebase-auth-signin-google':
      // Pour Google sign-in, utiliser initAuth selon la doc officielle
      iframeMessage = {"initAuth": true};
      break;
      
    case 'firebase-auth-signin-email':
      iframeMessage = {
        type: 'firebase-auth-signin-email',
        email: message.data.email,
        password: message.data.password
      };
      break;
      
    case 'firebase-auth-signup-email':
      iframeMessage = {
        type: 'firebase-auth-signup-email',
        email: message.data.email,
        password: message.data.password
      };
      break;
      
    case 'firebase-auth-signout':
      iframeMessage = { type: 'firebase-auth-signout' };
      break;
      
    case 'firebase-auth-get-token':
      iframeMessage = { 
        type: 'firebase-auth-get-token',
        forceRefresh: message.data?.forceRefresh 
      };
      break;
      
    case 'firebase-auth-get-user':
      iframeMessage = { type: 'firebase-auth-get-user' };
      break;
      
    default:
      console.warn('⚠️ Unknown message type:', message.type);
      sendResponse({
        success: false,
        error: { code: 'offscreen/unknown-type', message: 'Unknown message type' }
      });
      return false;
  }

  console.log('📤 Sending message to iframe:', iframeMessage);
  
  // Initialize the authentication flow in the iframed document. You must set the
  // second argument (targetOrigin) of the message in order for it to be successfully
  // delivered.
  iframe.contentWindow.postMessage(iframeMessage, new URL(_URL).origin);
  
  return true; // Keep message channel open for async response
}

console.log('✅ Offscreen document ready according to Firebase official docs'); 