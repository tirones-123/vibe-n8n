/**
 * Service Worker pour l'extension n8n AI Assistant
 * Gère la communication avec le backend workflow RAG
 * + Firebase Auth via Offscreen Document (méthode officielle)
 */

// FIREBASE OFFSCREEN DOCUMENT MANAGEMENT
// Basé sur https://firebase.google.com/docs/auth/web/chrome-extension
const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';
let creatingOffscreenDocument;

// Check if offscreen document already exists
async function hasOffscreenDocument() {
  try {
    console.log('🔍 Checking if offscreen document exists...');
    const matchedClients = await clients.matchAll();
    const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
    console.log('🔍 Looking for offscreen URL:', offscreenUrl);
    console.log('🔍 Available clients:', matchedClients.map(c => c.url));
    return matchedClients.some(
      (c) => c.url === chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)
    );
  } catch (error) {
    console.warn('Error checking offscreen document:', error);
    return false;
  }
}

// Setup offscreen document
async function setupOffscreenDocument() {
  console.log('🔄 setupOffscreenDocument called');
  if (await hasOffscreenDocument()) {
    console.log('🔥 Offscreen document already exists');
    return;
  }

  if (creatingOffscreenDocument) {
    console.log('🔄 Waiting for existing creation...');
    await creatingOffscreenDocument;
    console.log('🔄 Existing creation completed');
    return;
  }

  try {
    console.log('🔥 Creating Firebase Auth offscreen document...');
    console.log('🔥 Offscreen path:', OFFSCREEN_DOCUMENT_PATH);
    console.log('🔥 Full URL:', chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH));
    creatingOffscreenDocument = chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
      justification: 'Firebase Authentication with signInWithPopup'
    });
    
    await creatingOffscreenDocument;
    creatingOffscreenDocument = null;
    console.log('✅ Firebase Auth offscreen document created');
    
    // Wait for Firebase to initialize in the offscreen document
    await new Promise(r => setTimeout(r, 1000));
    console.log('✅ Offscreen document initialization wait completed');
  } catch (error) {
    console.error('❌ Failed to create offscreen document:', error);
    creatingOffscreenDocument = null;
    throw error;
  }
}

// Close offscreen document
async function closeOffscreenDocument() {
  if (!(await hasOffscreenDocument())) {
    return;
  }
  
  try {
    await chrome.offscreen.closeDocument();
    console.log('🔥 Offscreen document closed');
  } catch (error) {
    console.warn('Failed to close offscreen document:', error);
  }
}

// Firebase Auth wrapper functions
async function firebaseSignInWithEmail(email, password) {
  console.log('🔐 firebaseSignInWithEmail called for:', email);
  
  return sendToOffscreen({
    type: 'firebase-auth-signin-email',
    target: 'offscreen',
    data: { email, password }
  });
}

// Helper: send a message to the offscreen document
async function sendToOffscreen(payload) {
  console.log('📤 sendToOffscreen called with payload type:', payload.type);
  
  // S'assurer que l'offscreen document existe
  await setupOffscreenDocument();
  
  return new Promise((resolve, reject) => {
    // Envoyer le message normalement - l'offscreen document écoute avec chrome.runtime.onMessage
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ sendToOffscreen error:', chrome.runtime.lastError.message);
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        console.log('✅ sendToOffscreen response:', response);
        resolve(response);
      }
    });
  });
}

async function firebaseSignUpWithEmail(email, password) {
  console.log('🔐 firebaseSignUpWithEmail called for:', email);
  
  return sendToOffscreen({
    type: 'firebase-auth-signup-email',
    target: 'offscreen',
    data: { email, password }
  });
}

async function firebaseSignInWithGoogle() {
  console.log('🔐 firebaseSignInWithGoogle called');
  
  // --- NEW: ensure the Google authentication popup appears in front ---
  try {
    const focusListener = (createdWindow) => {
      // Bring the newly created window (usually the Google auth popup) to the foreground
      chrome.windows.update(createdWindow.id, { focused: true });
      // Remove the listener after the first window to avoid focusing all new windows
      chrome.windows.onCreated.removeListener(focusListener);
    };
    chrome.windows.onCreated.addListener(focusListener);
  } catch (err) {
    console.warn('⚠️ Unable to set focus on auth window:', err);
  }
  
  return sendToOffscreen({
    type: 'firebase-auth-signin-google',
    target: 'offscreen'
  });
}

async function firebaseSignOut() {
  console.log('🚪 firebaseSignOut called');
  
  return sendToOffscreen({
    type: 'firebase-auth-signout',
    target: 'offscreen'
  });
}

async function firebaseGetIdToken(forceRefresh = false) {
  console.log('🎫 firebaseGetIdToken called');
  
  const response = await sendToOffscreen({
    type: 'firebase-auth-get-token',
    target: 'offscreen',
    data: { forceRefresh }
  });
  
  // Handle direct token response (string) or object response
  if (typeof response === 'string' && response.length > 50) {
    console.log('✅ Firebase ID token received directly (length:', response.length, ')');
    return response;
  } else if (response && response.success && response.token) {
    console.log('✅ Firebase ID token received via object (length:', response.token.length, ')');
    return response.token;
  } else {
    console.log('❌ No valid Firebase ID token received:', typeof response, response);
    return null;
  }
}

async function firebaseGetCurrentUser() {
  console.log('👤 firebaseGetCurrentUser called');
  
  const response = await sendToOffscreen({
    type: 'firebase-auth-get-user',
    target: 'offscreen'
  });
  
  if (response.success) {
    return response.user;
  } else {
    throw new Error(response.error.message);
  }
}

// Configuration intégrée pour éviter les problèmes d'import ES6
const CONFIG = {
  API_URL: 'https://vibe-n8n.com/api/claude',
  API_BASE_URL: 'https://vibe-n8n.com',
  API_KEY: 'd5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2', // Pour backward compatibility
  LEGACY_API_KEY: 'd5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2',
  API_TIMEOUT: 900000
};

// State pour les gros workflows
let chunkBuffer = {};
let compressionSupported = true;

// 🚀 SERVICE WORKER LIFECYCLE MANAGEMENT
let isServiceWorkerActive = true;
let lastActivityTime = Date.now();
let keepAliveInterval = null;

// === NEW: persistent Port map to keep the service-worker alive during long RAG streams ===
const activePorts = new Map();

function openKeepAlivePort(tabId) {
  if (activePorts.has(tabId)) return activePorts.get(tabId);
  try {
    const port = chrome.tabs.connect(tabId, { name: 'rag-stream' });
    activePorts.set(tabId, port);
    console.log('🔌 Keep-alive port opened for tab', tabId);
    port.onDisconnect.addListener(() => {
      activePorts.delete(tabId);
      console.log('🔌 Keep-alive port closed for tab', tabId);
    });
    return port;
  } catch (err) {
    console.warn('⚠️ Unable to open keep-alive port:', err.message);
    return null;
  }
}

function closeKeepAlivePort(tabId) {
  const port = activePorts.get(tabId);
  if (port) {
    try { port.disconnect(); } catch (_) {}
    activePorts.delete(tabId);
    console.log('🔌 Keep-alive port manually closed for tab', tabId);
  }
}

// Helper: send a message to the tab and log if the view is no longer available
function safeSendMessage(tabId, payload) {
  try {
    chrome.tabs.sendMessage(tabId, payload, () => {
      if (chrome.runtime.lastError) {
        console.warn('⚠️ sendMessage failed:', chrome.runtime.lastError.message);
      }
    });
  } catch (err) {
    console.warn('⚠️ sendMessage threw:', err.message);
  }
}

// Log du démarrage du service worker
console.log('🚀 Service Worker started at:', new Date().toISOString());
console.log('🆔 Extension ID:', chrome.runtime.id);
console.log('');
console.log('🔥 ===================== FIREBASE SETUP REQUIRED =====================');
console.log('🔗 Add this domain to Firebase Console:');
console.log(`   chrome-extension://${chrome.runtime.id}`);
console.log('');
console.log('📋 Steps:');
console.log('   1. Go to Firebase Console > Authentication > Settings');
console.log('   2. Scroll to "Authorized domains"');
console.log('   3. Click "Add domain"');
console.log(`   4. Enter: chrome-extension://${chrome.runtime.id}`);
console.log('   5. Save');
console.log('🔥 ================================================================');
console.log('');

// 🎯 INJECTION AUTOMATIQUE DES DOMAINES PERSONNALISÉS
// Écoute la navigation pour injecter automatiquement sur les domaines sauvegardés
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Seulement sur les changements de statut 'complete' avec une URL
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const url = new URL(tab.url);
      const hostname = url.hostname;
      
      // Ignorer les domaines déjà supportés nativement (via manifest.json)
      const nativeDomains = ['n8n.io', 'n8n.cloud'];
      const isNativelySupported = nativeDomains.some(domain => hostname.includes(domain));
      
      if (!isNativelySupported) {
        // Vérifier si ce domaine est dans la liste des domaines sauvegardés
        const { customDomains = [] } = await chrome.storage.sync.get(['customDomains']);
        
        if (customDomains.includes(hostname)) {
          console.log('🎯 Auto-injection for saved domain:', hostname);
          const originPattern = `${url.origin}/*`;
          chrome.permissions.contains({ origins: [originPattern] }, (hasPerm) => {
            if (hasPerm) {
              performAutoInjection(tabId, hostname);
            } else {
              chrome.permissions.request({ origins: [originPattern] }, (granted) => {
                if (granted) {
                  console.log('✅ Permission granted for', originPattern);
                  performAutoInjection(tabId, hostname);
                } else {
                  console.warn('⚠️ Permission denied for', originPattern);
                }
              });
            }
          });
          // move return inside closures
          return;
        }
      }
    } catch (urlError) {
      // Ignorer les erreurs d'URL (pages chrome://, file://, etc.)
    }
  }
});

function performAutoInjection(tabId, hostname) {
  (async () => {
    try {
      // Marquer comme activation automatique
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => { window.n8nAIAutoActivation = true; }
      });

      // Injecter le content script et les styles
      await chrome.scripting.executeScript({ target: { tabId }, files: ['src/content.js'] });
      await chrome.scripting.insertCSS({ target: { tabId }, files: ['styles/panel.css'] });

      console.log('✅ Auto-injection successful for:', hostname);
    } catch (injectionError) {
      console.log('⚠️ Auto-injection failed for', hostname, ':', injectionError.message);
    }
  })();
}

// 🔧 Keep-alive mechanism pour éviter que le service worker s'endorme
function startKeepAlive() {
  if (keepAliveInterval) return;
  
  console.log('⏰ Starting keep-alive mechanism');
  keepAliveInterval = setInterval(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityTime;
    
    if (timeSinceLastActivity < 25000) { // Si activité récente (< 25s)
      console.log('💓 Service worker keep-alive ping');
      // Ping rapide pour maintenir le service worker actif
      chrome.runtime.getPlatformInfo().then(() => {
        // Simple call pour maintenir le SW actif
      }).catch(() => {
        // Ignore errors
      });
    }
  }, 20000); // Ping toutes les 20 secondes
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    console.log('⏹️ Stopping keep-alive mechanism');
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

function updateActivity() {
  lastActivityTime = Date.now();
  if (!keepAliveInterval) {
    startKeepAlive();
  }
}

// Event listeners pour le lifecycle du service worker
self.addEventListener('activate', () => {
  console.log('🔄 Service Worker activated');
  isServiceWorkerActive = true;
  updateActivity();
});

self.addEventListener('install', () => {
  console.log('📦 Service Worker installed');
  self.skipWaiting();
});

// Auto-stop keep-alive après inactivité prolongée
setInterval(() => {
  const now = Date.now();
  const timeSinceLastActivity = now - lastActivityTime;
  
  if (timeSinceLastActivity > 60000) { // 1 minute sans activité
    stopKeepAlive();
  }
}, 30000);

// Écoute des messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 🚀 Diagnostics du service worker
  console.log('📨 Service Worker received message:', request.type, 'at', new Date().toISOString());
  console.log('🔍 Service Worker active:', isServiceWorkerActive);
  console.log('📍 Sender tab ID:', sender.tab?.id);
  console.log('⏰ Last activity time:', new Date(lastActivityTime).toISOString());
  
  // Mettre à jour l'activité pour maintenir le service worker actif
  updateActivity();
  
  if (request.type === 'SEND_TO_CLAUDE') {
    console.log('🆕 Processing new workflow generation request');
    handleWorkflowRAGRequest(request.prompt, sender.tab.id)
      .catch(error => {
        console.error('❌ Error in SEND_TO_CLAUDE:', error);
        safeSendMessage(sender.tab.id, {
          type: 'CLAUDE_ERROR',
          error: error.message
        });
        // Close any dangling keep-alive port on error
        closeKeepAlivePort(sender.tab.id);
      });
    sendResponse({ received: true, serviceWorkerActive: true });
    return true; // Async response
  }
  
  // Nouveau : Support pour l'amélioration de workflow
  if (request.type === 'IMPROVE_WORKFLOW') {
    console.log('🔄 Processing workflow improvement request');
    handleWorkflowImprovementRequest(request.currentWorkflow, request.improvementRequest, sender.tab.id)
      .catch(error => {
        console.error('❌ Error in IMPROVE_WORKFLOW:', error);
        safeSendMessage(sender.tab.id, {
          type: 'CLAUDE_ERROR',
          error: error.message
        });
        // Close keep-alive port on error as well
        closeKeepAlivePort(sender.tab.id);
      });
    sendResponse({ received: true, serviceWorkerActive: true });
    return true; // Async response
  }
  
  // Nouveau : Health check pour diagnostics
  if (request.type === 'PING_SERVICE_WORKER') {
    console.log('🏓 Service Worker health check received');
    sendResponse({ 
      pong: true, 
      serviceWorkerActive: true,
      uptime: Date.now() - lastActivityTime,
      timestamp: new Date().toISOString()
    });
    return false; // Sync response
  }

  // FIREBASE AUTH HANDLERS
  if (request.type === 'test-firebase-available') {
    console.log('🔥 Testing Firebase availability...');
    sendResponse({ available: true });
    return false; // Sync response
  }

  if (request.type === 'firebase-signin-email') {
    console.log('🔐 Firebase sign in with email:', request.data?.email);
    firebaseSignInWithEmail(request.data.email, request.data.password)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ 
        success: false, 
        error: { code: error.code, message: error.message } 
      }));
    return true; // Async response
  }

  if (request.type === 'firebase-signup-email') {
    console.log('📝 Firebase sign up with email:', request.data?.email);
    firebaseSignUpWithEmail(request.data.email, request.data.password)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ 
        success: false, 
        error: { code: error.code, message: error.message } 
      }));
    return true; // Async response
  }

  if (request.type === 'firebase-signin-google') {
    console.log('🔐 Firebase sign in with Google');
    firebaseSignInWithGoogle()
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ 
        success: false, 
        error: { code: error.code, message: error.message } 
      }));
    return true; // Async response
  }

  if (request.type === 'firebase-signout') {
    console.log('🚪 Firebase sign out');
    firebaseSignOut()
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ 
        success: false, 
        error: { code: error.code, message: error.message } 
      }));
    return true; // Async response
  }

  if (request.type === 'firebase-get-token') {
    console.log('🎫 Firebase get ID token');
    firebaseGetIdToken(request.data?.forceRefresh)
      .then(token => sendResponse(token))
      .catch(error => sendResponse({ 
        success: false, 
        error: { code: error.code, message: error.message } 
      }));
    return true; // Async response
  }

  if (request.type === 'firebase-get-user') {
    console.log('👤 Firebase get current user');
    firebaseGetCurrentUser()
      .then(user => sendResponse(user))
      .catch(error => sendResponse({ 
        success: false, 
        error: { code: error.code, message: error.message } 
      }));
    return true; // Async response
  }
  
  console.log('⚠️ Unknown message type:', request.type);
  sendResponse({ error: 'Unknown message type', serviceWorkerActive: true });
  return false;
});

/**
 * Décompresse les données base64 gzip (si supporté)
 */
async function decompressData(compressedBase64) {
  console.log('🗜️ Tentative de décompression, taille:', compressedBase64.length, 'chars');
  
  try {
    // Convertir base64 en bytes
    const compressedBytes = Uint8Array.from(atob(compressedBase64), c => c.charCodeAt(0));
    console.log('📦 Données décodées base64, taille:', compressedBytes.length, 'bytes');
    
    // Dans le service worker, utiliser l'API DecompressionStream si disponible
    if (typeof DecompressionStream !== 'undefined') {
      console.log('✅ DecompressionStream disponible, décompression...');
      
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      writer.write(compressedBytes);
      writer.close();
      
      const chunks = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }
      
      // Concat all chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      const decompressed = new TextDecoder().decode(result);
      console.log('✅ Décompression réussie, taille finale:', decompressed.length, 'chars');
      return decompressed;
    } else {
      console.warn('⚠️ DecompressionStream not available in service worker context');
      console.log('🔄 Fallback: Demander au content script de décompresser');
      
      // Fallback: demander au content script de décompresser (qui a accès à window)
      compressionSupported = false;
      throw new Error('Compression not supported in service worker - using fallback');
    }
  } catch (error) {
    console.error('❌ Decompression failed:', error);
    throw error;
  }
}

/**
 * Gère les chunks de gros workflows
 */
function handleWorkflowChunk(data, tabId) {
  const sessionId = `${tabId}_workflow`;
  
  if (!chunkBuffer[sessionId]) {
    chunkBuffer[sessionId] = {
      chunks: [],
      totalChunks: data.total,
      receivedChunks: 0
    };
  }
  
  const buffer = chunkBuffer[sessionId];
  buffer.chunks[data.index] = data.data;
  buffer.receivedChunks++;
  
  console.log(`📦 Chunk reçu: ${data.index + 1}/${data.total} (${buffer.receivedChunks}/${data.total})`);
  
  // Vérifier si tous les chunks sont reçus
  if (buffer.receivedChunks === data.total) {
    console.log('✅ Tous les chunks reçus, assemblage...');
    
    try {
      // Assembler les chunks dans l'ordre
      const completeData = buffer.chunks.join('');
      const workflowData = JSON.parse(completeData);
      
      console.log('✅ Workflow assemblé avec succès');
      
      // Nettoyer le buffer
      delete chunkBuffer[sessionId];
      
      // Envoyer le workflow complet
      safeSendMessage(tabId, {
        type: 'WORKFLOW_COMPLETE',
        workflow: workflowData.workflow,
        explanation: workflowData.explanation,
        message: `Workflow volumineux assemblé (${data.total} parties)`
      });
      
    } catch (error) {
      console.error('❌ Erreur assemblage chunks:', error);
      delete chunkBuffer[sessionId];
      
      safeSendMessage(tabId, {
        type: 'WORKFLOW_ERROR',
        error: `Erreur assemblage workflow: ${error.message}`
      });
    }
  } else {
    // Notifier du progress
    safeSendMessage(tabId, {
      type: 'WORKFLOW_PROGRESS',
      stage: 'chunking',
      message: `Réception partie ${buffer.receivedChunks}/${data.total}...`,
      progress: Math.round((buffer.receivedChunks / data.total) * 100)
    });
  }
}

/**
 * Envoie une requête au backend workflow RAG
 */
async function handleWorkflowRAGRequest(prompt, tabId) {
  // ⚡ Start keep-alive for the whole duration of the request
  openKeepAlivePort(tabId);
  console.log('%c🎯 BACKGROUND: Starting workflow RAG request', 'background: darkblue; color: white; padding: 2px 6px;');
  console.log('📝 Prompt received:', prompt);
  console.log('🆔 Tab ID:', tabId);
  
  // Notifier le début de traitement
  safeSendMessage(tabId, {
    type: 'WORKFLOW_GENERATION_START',
    message: 'Démarrage de la génération de workflow...'
  });

  const requestBody = {
    prompt: prompt // Seulement le prompt pour le backend workflow RAG
  };

  // 📊 DETAILED LOGGING - Backend request preparation
  console.log('%c📊 BACKGROUND: Backend request preparation', 'background: darkgreen; color: white; padding: 2px 6px;');
  console.log('🔧 Request type: NEW_WORKFLOW_GENERATION');
  console.log('📝 Request body structure:');
  console.log('  - prompt:', requestBody.prompt);
  console.log('  - baseWorkflow: null (new workflow)');
  
  const requestBodySize = JSON.stringify(requestBody).length;
  console.log('📏 Request body size:', requestBodySize, 'chars (', (requestBodySize / 1024).toFixed(1), 'KB)');
  console.log('📦 Full request body:', JSON.stringify(requestBody));
  
  console.log('🌐 Backend endpoint:', CONFIG.API_URL);
  console.log('🔑 API key (first 20 chars):', CONFIG.API_KEY.substring(0, 20) + '...');

  console.log('📤 Envoi requête workflow RAG');
  console.log('📦 Payload:', JSON.stringify(requestBody));

  // Timeout de sécurité pour éviter le chargement infini
  const timeoutMs = 1800000; // 30 minutes (pour gros workflows)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout: La génération prend trop de temps (30 min)')), timeoutMs);
  });

  try {
    console.log('🌐 Tentative de fetch vers:', CONFIG.API_URL);
    
    // FIREBASE AUTH OBLIGATOIRE - Pas de fallback legacy pour l'extension Chrome
    let authToken = null;
    let authMethod = 'FIREBASE';
    
    console.log('🔧 Firebase Auth obligatoire pour extension Chrome...');
    
    try {
      console.log('🔥 Getting Firebase token (required)...');
      const firebaseToken = await firebaseGetIdToken();
      console.log('🎫 firebaseGetIdToken result:', typeof firebaseToken, firebaseToken ? '✅ Token received' : '❌ No token');
      
      if (firebaseToken && typeof firebaseToken === 'string' && firebaseToken.length > 50) {
        authToken = firebaseToken;
        console.log('✅ Using Firebase authentication token (length:', firebaseToken.length, ')');
        console.log('🔤 Token preview:', firebaseToken.substring(0, 50) + '...');
      } else {
        console.error('❌ Firebase token invalid or empty - Extension requires Firebase Auth');
        console.log('🔍 Token details:', { type: typeof firebaseToken, length: firebaseToken?.length });
        
        // Envoyer une erreur pour déclencher l'auth modal
        chrome.tabs.sendMessage(tabId, {
          type: 'FIREBASE_AUTH_REQUIRED',
          error: 'Firebase authentication required. Please sign in to continue.'
        });
        return;
      }
    } catch (firebaseError) {
      console.error('❌ Firebase auth failed - Extension requires authentication:', firebaseError);
      console.log('🔍 Error details:', firebaseError.message, firebaseError.stack);
      
      // Envoyer une erreur pour déclencher l'auth modal
      chrome.tabs.sendMessage(tabId, {
        type: 'FIREBASE_AUTH_REQUIRED',
        error: 'Authentication failed: ' + firebaseError.message
      });
      return;
    }
    
    if (!authToken) {
      console.error('❌ No authentication token available - Extension requires Firebase Auth');
      chrome.tabs.sendMessage(tabId, {
        type: 'FIREBASE_AUTH_REQUIRED',
        error: 'No authentication token available. Please sign in.'
      });
      return;
    }
    
    console.log('🏁 Firebase authentication confirmed for extension');
    
    const fetchPromise = fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Auth-Method': authMethod,
        'X-Client-Type': 'chrome-extension'
      },
      body: JSON.stringify(requestBody)
    });

    // Race entre fetch et timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    console.log('📨 Réponse reçue:', response.status, response.statusText);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

    // Gestion spécifique des erreurs 403 (email non vérifié)
    if (response.status === 403) {
      const errorData = await response.json();
      console.log('📧 Access forbidden:', errorData);
      
      if (errorData.code === 'EMAIL_NOT_VERIFIED') {
        chrome.tabs.sendMessage(tabId, {
          type: 'EMAIL_NOT_VERIFIED',
          error: errorData.message,
          email: errorData.email
        });
        return;
      }
    }

    if (!response.ok) {
      // Handle quota exceeded errors specifically
      if (response.status === 429) {
        try {
          const quotaError = await response.json();
          console.error('❌ Quota exceeded:', quotaError);
          
          // Send quota exceeded message to content script
          chrome.tabs.sendMessage(tabId, {
            type: 'QUOTA_EXCEEDED',
            quotaInfo: quotaError
          });
          return; // Stop here, don't throw generic error
        } catch (parseError) {
          console.error('Failed to parse quota error:', parseError);
        }
      }
      
      const errorText = await response.text();
      console.error('❌ Erreur HTTP:', response.status, errorText);
      throw new Error(`Erreur API workflow RAG (${response.status}): ${errorText}`);
    }
    
    console.log('✅ Réponse OK, démarrage streaming...');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let eventCount = 0;
    let lastEventTime = Date.now();

    // Timeout pour le streaming (si pas d'événement pendant 10min)
    const streamingTimeoutMs = 600000;
    
    const processStream = async () => {
      while (true) {
                  // Timeout si pas d'événement pendant 5min
        const streamTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout streaming: Pas de réponse pendant 5min')), streamingTimeoutMs);
        });

        const readPromise = reader.read();
        
        let result;
        try {
          result = await Promise.race([readPromise, streamTimeoutPromise]);
        } catch (timeoutError) {
          console.error('❌ Timeout streaming:', timeoutError.message);
          safeSendMessage(tabId, {
            type: 'CLAUDE_ERROR',
            error: 'Timeout: Le serveur ne répond plus. Essayez un prompt plus simple.'
          });
          return;
        }

        const { done, value } = result;
        if (done) {
          console.log('✅ Stream terminé. Total événements:', eventCount);
          if (eventCount === 0) {
            safeSendMessage(tabId, {
              type: 'CLAUDE_ERROR',
              error: 'Aucune donnée reçue du serveur. Vérifiez la configuration backend.'
            });
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              eventCount++;
              lastEventTime = Date.now();
              console.log('📡 Événement reçu:', data.type, '| Data:', JSON.stringify(data).substring(0, 200) + '...');
              await processWorkflowRAGResponse(data, tabId);
            } catch (e) {
              // Ignorer les erreurs de parsing
              console.log('⚠️ Parse error:', e.message, 'Line:', line);
            }
          }
        }
      }
    };

    await processStream();

    // ✅ Stream finished successfully – we can release the keep-alive port
    closeKeepAlivePort(tabId);

  } catch (error) {
    console.error('❌ Erreur complète:', error);
    console.error('❌ Error stack:', error.stack);
    
    let errorMessage = error.message;
    const lowerMsg = (error.message || '').toLowerCase();
    if (lowerMsg.includes('overloaded')) {
      errorMessage = 'Service IA saturé. Réessayez dans quelques instants.';
    } else if (error.message.includes('Timeout')) {
      errorMessage = error.message + ' Essayez un prompt plus simple ou réessayez plus tard.';
    } else if (error.message.includes('Failed to fetch')) {
      errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
    }
    
    // Envoyer une erreur détaillée
    safeSendMessage(tabId, {
      type: 'CLAUDE_ERROR',
      error: errorMessage
    });

    // 🛑 Ensure we release the port on error as well
    closeKeepAlivePort(tabId);
    
    throw error;
  }
}

/**
 * Nouveau : Gère l'amélioration d'un workflow existant
 */
async function handleWorkflowImprovementRequest(currentWorkflow, improvementRequest, tabId) {
  // ⚡ Start keep-alive for the improvement request as well
  openKeepAlivePort(tabId);
  console.log('%c🎯 BACKGROUND: Starting workflow improvement request', 'background: darkviolet; color: white; padding: 2px 6px;');
  console.log('📝 Improvement request:', improvementRequest);
  console.log('🆔 Tab ID:', tabId);
  
  // Notifier le début de traitement
  safeSendMessage(tabId, {
    type: 'WORKFLOW_GENERATION_START',
    message: 'Analyse du workflow existant...'
  });

  const requestBody = {
    prompt: improvementRequest,
    baseWorkflow: currentWorkflow // Nouveau : inclure le workflow de base
  };

  // 📊 DETAILED LOGGING - Backend improvement request preparation
  console.log('%c📊 BACKGROUND: Backend improvement request preparation', 'background: darkorange; color: white; padding: 2px 6px;');
  console.log('🔧 Request type: WORKFLOW_IMPROVEMENT');
  console.log('📝 Request body structure:');
  console.log('  - prompt:', requestBody.prompt);
  console.log('  - baseWorkflow provided: YES');
  console.log('  - baseWorkflow.nodes count:', requestBody.baseWorkflow?.nodes?.length || 0);
  console.log('  - baseWorkflow.connections count:', Object.keys(requestBody.baseWorkflow?.connections || {}).length);
  console.log('  - baseWorkflow.name:', requestBody.baseWorkflow?.name);
  
  // Analyse détaillée du workflow existant
  if (requestBody.baseWorkflow?.nodes) {
    console.log('📋 Existing workflow nodes:');
    requestBody.baseWorkflow.nodes.forEach((node, i) => {
      console.log(`  ${i + 1}. ${node.name} (${node.type}) - ID: ${node.id}`);
    });
  }
  
  const requestBodySize = JSON.stringify(requestBody).length;
  console.log('📏 Request body size:', requestBodySize, 'chars (', (requestBodySize / 1024).toFixed(1), 'KB)');
  console.log('📦 Request body sample (first 1000 chars):', JSON.stringify(requestBody).substring(0, 1000) + '...');
  
  console.log('🌐 Backend endpoint:', CONFIG.API_URL);

  console.log('📤 Envoi requête amélioration workflow RAG');
  console.log('📦 Payload size:', JSON.stringify(requestBody).length, 'chars');

  // FIREBASE AUTH OBLIGATOIRE - Pas de fallback legacy pour l'extension Chrome
  let authToken = null;
  let authMethod = 'FIREBASE';
  
  console.log('🔧 Firebase Auth obligatoire pour extension Chrome (amélioration)...');
  
  try {
    console.log('🔥 Getting Firebase token for improvement (required)...');
    const firebaseToken = await firebaseGetIdToken();
    console.log('🎫 firebaseGetIdToken result (improvement):', typeof firebaseToken, firebaseToken ? '✅ Token received' : '❌ No token');
    
    if (firebaseToken && typeof firebaseToken === 'string' && firebaseToken.length > 50) {
      authToken = firebaseToken;
      console.log('✅ Using Firebase authentication token for improvement (length:', firebaseToken.length, ')');
      console.log('🔤 Token preview:', firebaseToken.substring(0, 50) + '...');
    } else {
      console.error('❌ Firebase token invalid or empty for improvement - Extension requires Firebase Auth');
      console.log('🔍 Token details:', { type: typeof firebaseToken, length: firebaseToken?.length });
      
      // Envoyer une erreur pour déclencher l'auth modal
      chrome.tabs.sendMessage(tabId, {
        type: 'FIREBASE_AUTH_REQUIRED',
        error: 'Firebase authentication required for workflow improvement. Please sign in.'
      });
      return;
    }
  } catch (firebaseError) {
    console.error('❌ Firebase auth failed for improvement - Extension requires authentication:', firebaseError);
    console.log('🔍 Error details:', firebaseError.message, firebaseError.stack);
    
    // Envoyer une erreur pour déclencher l'auth modal
    chrome.tabs.sendMessage(tabId, {
      type: 'FIREBASE_AUTH_REQUIRED',
      error: 'Authentication failed for improvement: ' + firebaseError.message
    });
    return;
  }
  
  if (!authToken) {
    console.error('❌ No authentication token available for improvement - Extension requires Firebase Auth');
    chrome.tabs.sendMessage(tabId, {
      type: 'FIREBASE_AUTH_REQUIRED',
      error: 'No authentication token available for improvement. Please sign in.'
    });
    return;
  }
  
  console.log('🏁 Firebase authentication confirmed for improvement');

  try {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Auth-Method': authMethod,
        'X-Client-Type': 'chrome-extension'
      },
      body: JSON.stringify(requestBody)
    });

  console.log('📨 Improvement response received:', response.status, response.statusText);
  console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

  // Gestion spécifique des erreurs 403 (email non vérifié) pour amélioration
  if (response.status === 403) {
    const errorData = await response.json();
    console.log('📧 Improvement access forbidden:', errorData);
    
    if (errorData.code === 'EMAIL_NOT_VERIFIED') {
      chrome.tabs.sendMessage(tabId, {
        type: 'EMAIL_NOT_VERIFIED',
        error: errorData.message,
        email: errorData.email
      });
      return;
    }
  }

  if (!response.ok) {
    // Handle quota exceeded errors specifically for improvement requests
    if (response.status === 429) {
      try {
        const quotaError = await response.json();
        console.error('❌ Quota exceeded during improvement:', quotaError);
        
        // Send quota exceeded message to content script
        chrome.tabs.sendMessage(tabId, {
          type: 'QUOTA_EXCEEDED',
          quotaInfo: quotaError
        });
        return; // Stop here, don't throw generic error
      } catch (parseError) {
        console.error('Failed to parse quota error during improvement:', parseError);
      }
    }
    
    const error = await response.text();
    console.error('❌ Improvement API error:', response.status, error);
    throw new Error(`Erreur API amélioration workflow: ${error}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          await processWorkflowRAGResponse(data, tabId);
        } catch (e) {
          // Ignorer les erreurs de parsing
          console.log('⚠️ Parse error:', e.message);
        }
      }
    }
  }

  // ✅ Finished processing improvement stream – release port
  closeKeepAlivePort(tabId);
  
  } catch (error) {
    console.error('❌ Erreur requête amélioration workflow:', error);
    chrome.tabs.sendMessage(tabId, {
      type: 'WORKFLOW_ERROR',
      error: error.message
    });
    
    // Release port on error
    closeKeepAlivePort(tabId);
  }
}

/**
 * Traite la réponse du backend workflow RAG
 */
async function processWorkflowRAGResponse(data, tabId) {
  console.log('📨 Réponse workflow RAG:', data.type);
  const send = (payload) => safeSendMessage(tabId, payload);

  switch (data.type) {
    case 'setup':
      send({
        type: 'WORKFLOW_SETUP',
        message: data.data.message
      });
      break;

    case 'search':
      send({
        type: 'WORKFLOW_SEARCH',
        message: data.data.message
      });
      break;

    case 'building':
      send({
        type: 'WORKFLOW_BUILDING',
        message: data.data.message
      });
      break;

    case 'progress':
      send({
        type: 'WORKFLOW_PROGRESS',
        stage: data.data.stage,
        message: data.data.message,
        workflows: data.data.workflows,
        progress: data.data.progress
      });
      break;

    case 'context_building':
      send({
        type: 'WORKFLOW_PROGRESS',
        stage: 'context_building',
        message: data.data.message,
        workflows: data.data.workflows
      });
      break;

    case 'claude_call':
      send({
        type: 'WORKFLOW_BUILDING',
        message: data.data.message
      });
      break;

    case 'parsing':
      send({
        type: 'WORKFLOW_PROGRESS',
        stage: 'parsing',
        message: data.data.message
      });
      break;

    case 'compression':
      send({
        type: 'WORKFLOW_PROGRESS',
        stage: 'compression',
        message: data.data.message,
        nodesCount: data.data.nodesCount
      });
      break;

    case 'complete':
      if (data.data.success && data.data.workflow) {
        console.log('✅ Workflow généré avec succès');
        
        // Envoyer le workflow complet et l'explication
        send({
          type: 'WORKFLOW_COMPLETE',
          workflow: data.data.workflow,
          explanation: data.data.explanation,
          message: data.data.message
        });
      } else {
        console.error('❌ Échec de génération');
        send({
          type: 'WORKFLOW_ERROR',
          error: data.data.error || 'Échec de génération de workflow'
        });
      }
      break;

    case 'compressed_complete':
      console.log('🗜️ Événement compressed_complete reçu:', data.data);
      
      if (data.data.success && data.data.compressed) {
        console.log('✅ Workflow compressé reçu, décompression...');
        
        try {
          // Essayer la décompression directe
          const decompressedData = await decompressData(data.data.data);
          const workflowData = JSON.parse(decompressedData);
          
          console.log('✅ Workflow décompressé avec succès via service worker');
          
          // Envoyer le workflow décompressé
          send({
            type: 'WORKFLOW_COMPLETE',
            workflow: workflowData.workflow,
            explanation: workflowData.explanation,
            message: 'Workflow compressé décompressé avec succès !'
          });
          
        } catch (error) {
          console.error('❌ Erreur décompression service worker:', error);
          console.log('🔄 Fallback: Envoi au content script pour décompression');
          
          // Fallback: Envoyer les données compressées au content script
          send({
            type: 'DECOMPRESS_WORKFLOW',
            compressedData: data.data.data,
            originalSize: data.data.originalSize
          });
        }
      } else {
        console.error('❌ Échec de génération compressée');
        send({
          type: 'WORKFLOW_ERROR',
          error: 'Échec de génération de workflow compressé'
        });
      }
      break;

    case 'chunking_start':
      console.log(`📦 Début réception chunks: ${data.data.totalChunks} parties`);
      send({
        type: 'WORKFLOW_PROGRESS',
        stage: 'chunking',
        message: data.data.message,
        totalChunks: data.data.totalChunks
      });
      break;

    case 'chunk':
      console.log(`📦 Chunk reçu: ${data.data.index + 1}/${data.data.total}`);
      handleWorkflowChunk(data.data, tabId);
      break;

    case 'chunking_complete':
      console.log('✅ Chunking terminé');
      // Le message sera envoyé par handleWorkflowChunk
      break;

    case 'session_complete':
      console.log('📈 Session terminée avec succès:', data.data);
      // Pas besoin d'action spécifique, juste log
      break;

    case 'error':
      {
        let friendly = data.data.error || data.data.message;
        if (typeof friendly === 'string' && friendly.toLowerCase().includes('overloaded')) {
          friendly = 'Service IA saturé. Réessayez dans quelques instants.';
        }
      send({
        type: 'WORKFLOW_ERROR',
          error: friendly
      });
      }
      break;

    default:
      console.log('⚠️ Type de message inconnu:', data.type, '| Data:', data.data);
  }
}

/**
 * Exécute l'import d'un workflow complet directement dans la page via chrome.scripting
 */
async function executeWorkflowImport(workflow, tabId) {
  console.log('🔧 Import direct du workflow complet:', workflow);
  
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      world: 'MAIN',
      func: (workflowData) => {
        // Code injecté directement dans le contexte de la page
        console.log('💉 Import workflow inline:', workflowData);
        
        // Rechercher Pinia
        const pinia = window.__pinia || window.$pinia ||
                     document.querySelector('#app')?.__vue_app__?._context.provides.pinia;
        
        if (!pinia) {
          console.error('❌ Pinia non trouvé');
          return { success: false, error: 'Pinia non trouvé - êtes-vous sur une page de workflow n8n ?' };
        }
        
        const workflowStore = pinia._s.get('workflows');
        if (!workflowStore) {
          console.error('❌ workflowStore non trouvé');
          return { success: false, error: 'workflowStore non trouvé - page de workflow non active' };
        }
        
        console.log('✅ Stores trouvés, import du workflow...');
        
        try {
          // Effacer le workflow actuel
          const currentNodes = [...workflowStore.allNodes];
          for (const node of currentNodes) {
            workflowStore.removeNode(node.id);
          }

          // Importer les nouveaux nœuds
          if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
            for (const node of workflowData.nodes) {
              const nodeId = node.id || `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              
              workflowStore.addNode({
                id: nodeId,
                name: node.name || 'Unnamed Node',
                type: node.type,
                position: node.position || [100, 100],
                parameters: node.parameters || {},
                typeVersion: node.typeVersion || 1,
                disabled: node.disabled || false,
                credentials: node.credentials || {}
              });
              
              console.log(`✅ Nœud ajouté: ${node.name} (${nodeId})`);
            }
          }

          // Importer les connexions
          if (workflowData.connections && typeof workflowData.connections === 'object') {
            // Logique d'import des connexions simplifiée
            const allConnections = { ...workflowData.connections };
            workflowStore.$patch({
              workflow: {
                ...workflowStore.workflow,
                connections: allConnections
              }
            });
            console.log('✅ Connexions importées');
          }

          // Définir le nom du workflow si fourni
          if (workflowData.name) {
            workflowStore.$patch({
              workflow: {
                ...workflowStore.workflow,
                name: workflowData.name
              }
            });
          }

          console.log('✅ Workflow importé avec succès');
          return { 
            success: true, 
            message: `Workflow importé: ${workflowData.nodes?.length || 0} nœuds` 
          };
          
        } catch (error) {
          console.error('❌ Erreur lors de l\'import:', error);
          return { success: false, error: error.message };
        }
      },
      args: [workflow]
    });
    
    // Vérifier les résultats de toutes les frames
    const successfulResults = results.filter(result => result.result?.success);
    const failedResults = results.filter(result => result.result && !result.result.success);
    
    if (successfulResults.length > 0) {
      // Au moins une frame a réussi
      safeSendMessage(tabId, {
        type: 'WORKFLOW_IMPORT_SUCCESS',
        message: successfulResults[0].result.message
      });
    } else if (failedResults.length > 0) {
      // Toutes les frames ont échoué
      safeSendMessage(tabId, {
        type: 'WORKFLOW_IMPORT_ERROR',
        error: failedResults[0].result.error
      });
    } else {
      // Aucun résultat (bizarre)
      safeSendMessage(tabId, {
        type: 'WORKFLOW_IMPORT_ERROR',
        error: 'Aucune frame n8n trouvée pour importer le workflow'
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur injection script:', error);
    safeSendMessage(tabId, {
      type: 'WORKFLOW_IMPORT_ERROR',
      error: `Erreur d'injection: ${error.message}`
    });
  }
}

// Firebase Auth selon la documentation officielle
// https://firebase.google.com/docs/auth/web/chrome-extension

async function setupOffscreenDocument(path = OFFSCREEN_DOCUMENT_PATH) {
  // If we do not have a document, we are already setup and can skip
  if (!(await hasOffscreenDocument())) {
    // create offscreen document
    if (creatingOffscreenDocument) {
      await creatingOffscreenDocument;
    } else {
      creatingOffscreenDocument = chrome.offscreen.createDocument({
        url: path,
        reasons: [
            chrome.offscreen.Reason.DOM_SCRAPING
        ],
        justification: 'authentication'
      });
      await creatingOffscreenDocument;
      creatingOffscreenDocument = null;
    }
  }
}

async function closeOffscreenDocument() {
  if (!(await hasOffscreenDocument())) {
    return;
  }
  await chrome.offscreen.closeDocument();
}

function getAuth() {
  return new Promise(async (resolve, reject) => {
    const auth = await chrome.runtime.sendMessage({
      type: 'firebase-auth',
      target: 'offscreen'
    });
    auth?.name !== 'FirebaseError' ? resolve(auth) : reject(auth);
  })
}

async function firebaseAuth() {
  await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);

  const auth = await getAuth()
    .then((auth) => {
      console.log('User Authenticated', auth);
      return auth;
    })
    .catch(err => {
      if (err.code === 'auth/operation-not-allowed') {
        console.error('You must enable an OAuth provider in the Firebase' +
                      ' console in order to use signInWithPopup. This sample' +
                      ' uses Google by default.');
      } else {
        console.error(err);
        return err;
      }
    })
    .finally(closeOffscreenDocument)

  return auth;
}

// Installation de l'extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('n8n AI Assistant (Workflow RAG) installé avec succès');
}); 

// == Logging control ==
const DEBUG_LOGS_ENABLED = false;
const __bgOriginalConsoleLog = console.log.bind(console);
console.log = (...args) => {
  if (DEBUG_LOGS_ENABLED) {
    __bgOriginalConsoleLog('[n8n-AI]', ...args);
  }
}; 