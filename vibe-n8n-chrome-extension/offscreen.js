// Firebase Auth Offscreen Document - Exactement selon la doc officielle
// https://firebase.google.com/docs/auth/web/chrome-extension

// This URL must point to the public site
const _URL = 'https://vibe-n8n-production.up.railway.app/firebase-auth/';
let currentUser = null; // cache authenticated user

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