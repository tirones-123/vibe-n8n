/**
 * Content Script for n8n AI Assistant
 * Modern code editor-inspired interface for workflow RAG system
 */

// ===== NOUVEAU SYSTÈME AUTH (STANDALONE) =====
// Utilisation des services globaux (pas d'imports ES6)
let contentAuthIntegration = null;

  // Firebase Auth

// ANCIENNE MÉTHODE IFRAME SUPPRIMÉE - Maintenant utilise Offscreen Documents
// Firebase SDK est géré par background.js via Offscreen Document API

// Fonction pour attendre qu'un objet soit disponible
function waitForGlobalObject(objectName, maxAttempts = 10, interval = 100) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      if (window[objectName]) {
        clearInterval(checkInterval);
        resolve(window[objectName]);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        reject(new Error(`${objectName} not available after ${maxAttempts} attempts`));
      }
    }, interval);
  });
}

// Fonction pour exposer les fonctions de test globalement
function exposeTestFunctions() {
  console.log('🔧 Exposition des fonctions de test...');
  
  // testFirebaseSystem - Test complet du système
  window.testFirebaseSystem = async () => {
    console.log('🧪 === TEST FIREBASE SYSTEM ===');
    
    const results = {
      contentAuthIntegration: !!window.contentAuthIntegration,
      authService: !!window.authService,
      simulationMode: window.contentAuthIntegration?.simulationMode || false,
      backgroundConnection: false
    };
    
    // Test communication background via chrome.runtime
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'test-firebase-available' }, resolve);
        });
        results.backgroundConnection = !!response?.available;
      } catch (error) {
        console.error('Background test failed:', error);
      }
    }
    
    console.log('📊 Résultats:');
    Object.entries(results).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✅' : '❌'}`);
    });
    
    // Test fonctionnel si possible
    if (window.contentAuthIntegration) {
      console.log('🧪 Test fonctionnel...');
      try {
        const canMake = await window.contentAuthIntegration.canMakeRequest();
        console.log('  canMakeRequest:', canMake.allowed ? '✅' : '❌');
        console.log('  method:', canMake.method || 'unknown');
      } catch (error) {
        console.error('  canMakeRequest error:', error);
      }
    }
    
    return results;
  };
  
  // showFirebaseAuthModal - Afficher modal d'auth
  window.showFirebaseAuthModal = () => {
    console.log('🔐 Affichage modal Firebase Auth...');
    if (window.contentAuthIntegration?.showSimpleAuthModal) {
      window.contentAuthIntegration.showSimpleAuthModal();
    } else {
      console.log('❌ Modal non disponible');
      // Créer modal basique
      const modal = document.createElement('div');
      modal.innerHTML = `
        <div style="
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 99999; text-align: center; color: black;
        ">
          <h3>🔐 Firebase Auth</h3>
          <p>contentAuthIntegration: ${!!window.contentAuthIntegration ? '✅' : '❌'}</p>
          <p>authService: ${!!window.authService ? '✅' : '❌'}</p>
          <button onclick="this.parentElement.parentElement.remove()" 
                  style="padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px;">
            Fermer
          </button>
        </div>
      `;
      document.body.appendChild(modal);
    }
  };
  
  // createTestUser - Créer utilisateur de test
  window.createTestUser = async () => {
    console.log('👤 Création utilisateur test...');
    if (window.authService) {
      try {
        const user = await window.authService.signUpWithEmail('test@vibe-n8n.com', 'test123456');
        console.log('✅ Utilisateur test créé:', user);
        return user;
      } catch (error) {
        console.error('❌ Erreur création utilisateur:', error);
        return null;
      }
    } else {
      console.log('❌ authService non disponible');
      return null;
    }
  };
  
  // debugFirebaseAuth - Debug état auth
  window.debugFirebaseAuth = () => {
    console.log('🔍 === DEBUG FIREBASE AUTH ===');
    console.log('  contentAuthIntegration:', !!window.contentAuthIntegration);
    console.log('  authService:', !!window.authService);
    console.log('  simulationMode:', window.contentAuthIntegration?.simulationMode);
    console.log('  Chrome runtime:', typeof chrome?.runtime);
    
    if (window.contentAuthIntegration) {
      const status = window.contentAuthIntegration.getAuthStatus?.() || {};
      console.log('  Auth status:', status);
    }
    
    console.log('  🔐 Firebase Auth activé');
  };
  
  // testFirebaseAuth - Test auth spécifique
  window.testFirebaseAuth = window.testFirebaseSystem; // Alias
  
  console.log('✅ Fonctions de test exposées globalement !');
}

  // Fonction d'initialisation Firebase Auth
async function initializeFirebaseAuth() {
  try {
    console.log('🔐 Initialisation Firebase Auth...');
    
    // Utilise Offscreen Document via background.js (méthode officielle Firebase)
    
    // Étape 1: Attendre que contentAuthIntegration soit disponible
    console.log('⏳ Attente de contentAuthIntegration...');
    contentAuthIntegration = await waitForGlobalObject('contentAuthIntegration', 20, 100);
    console.log('✅ contentAuthIntegration trouvé');
    
    // Étape 2: Initialiser le système d'authentification
    await contentAuthIntegration.initialize();
    
    // Étape 3: Exposer globalement pour les tests
    window.contentAuthIntegration = contentAuthIntegration;
    window.authService = window.authService || contentAuthIntegration.authService;
    
    console.log('✅ Firebase Auth initialisé avec succès');
    return true;
  } catch (error) {
    console.error('❌ ERREUR CRITIQUE: Firebase Auth failed:', error);
    console.error('💀 L\'application ne peut pas fonctionner sans Firebase Auth');
    return false;
  }
}

// Initial load check

// Quick test injection
(function testImmediate() {
  const testDiv = document.createElement('div');
  testDiv.id = 'n8n-ai-test';
  testDiv.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #22c55e;
    color: white;
    padding: 8px 12px;
    z-index: 99999;
    border-radius: 4px;
    font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
    font-size: 12px;
    font-weight: 500;
  `;
  testDiv.textContent = '✅ AI Assistant Loaded';
  document.body.appendChild(testDiv);
  
  setTimeout(() => testDiv.remove(), 2000);
})();


// Prevent double execution without throwing hard error
+(function() {
  if (window.n8nAIAssistantLoaded) {
    return; // early exit for duplicate injection (inside IIFE, legal)
  }
  window.n8nAIAssistantLoaded = true;
})();

// Check if we're on potential n8n page
function detectN8nPage() {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  // Method 1: Domain contains 'n8n'
  if (hostname.includes('n8n')) {
    return true;
  }
  
  // Method 2: URL patterns suggest n8n
  const n8nPatterns = ['/workflow/', '/execution/', '/editor/', '/credentials/', '/settings/'];
  if (n8nPatterns.some(pattern => pathname.includes(pattern))) {
    return true;
  }
  
  // Method 3: Manual injection (when user clicked "Activate on this page")
  if (window.n8nAIManualActivation) {
    return true;
  }
  
  // Method 4: Auto injection (when domain was previously saved)
  if (window.n8nAIAutoActivation) {
    return true;
  }
  
  // Method 5: Check saved custom domains (async check)
  checkSavedDomains(hostname);
  
  return false;
}

// New function to check saved domains asynchronously
async function checkSavedDomains(currentHostname) {
  try {
    const result = await chrome.storage.sync.get(['customDomains']);
    const customDomains = result.customDomains || [];
    
    if (customDomains.includes(currentHostname)) {
      window.n8nAIAutoActivation = true;
      window.n8nAIManualActivation = true;
      
      // Trigger initialization if not already loaded
      if (!window.__n8nAiAssistantLoaded) {
        setTimeout(() => {
          init().catch(error => {
            console.error('❌ Failed to initialize after domain detection:', error);
          });
        }, 500);
      }
      
      return true;
    }
  } catch (error) {
  }
  return false;
}

// Main initialization function
(async function initializeExtension() {
  
  // FIRST: Check for saved custom domains and auto-activate if needed
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const hostname = window.location.hostname;
      
      const { customDomains = [] } = await chrome.storage.sync.get(['customDomains']);
      
      if (customDomains.includes(hostname)) {
        window.n8nAIManualActivation = true;
        window.n8nAIAutoActivation = true;
      } else {
      }
    } else {
    }
  } catch (error) {
  }

  // THEN: Detect if this is an n8n page (now with potential auto-activation flag set)
  const isN8nPage = detectN8nPage();

  // Abort initialization if not on an n8n page
  if (!isN8nPage) {
    return;
  }

  // Continue with n8n AI Assistant initialization

  if (window.__n8nAiAssistantLoaded) {
    return;
  }
  window.__n8nAiAssistantLoaded = true;
  
  // Inject script for Pinia access
  const injectScript = document.createElement('script');
  injectScript.src = chrome.runtime.getURL('src/inject.js');
  injectScript.onload = () => injectScript.remove();
  (document.head || document.documentElement).appendChild(injectScript);

  // Application state
  let isOpen = false;
  let currentSession = null;
  let currentWorkflowId = null;
  let isGenerating = false;
  let jsonBuffer = '';
  let isCodePanelExpanded = false;
  let autoImportEnabled = true; // Auto-import activé par défaut
  let n8nLayoutModified = false;
  let isResizingWidth = false;
  // Keep-alive interval ID for service worker
  let keepAliveIntervalId = null;
  const MIN_PANEL_WIDTH = 280;  // Minimum usable width
  const MAX_PANEL_WIDTH = 800;  // Maximum width
  
  // Calculate optimal panel width based on screen size
  function getOptimalPanelWidth() {
    // Check if user has a saved preference
    const savedWidth = localStorage.getItem('n8n-ai-panel-width');
    if (savedWidth) {
      const width = parseInt(savedWidth);
      if (width >= MIN_PANEL_WIDTH && width <= MAX_PANEL_WIDTH) {
        return width;
      }
    }
    
    // Default width based on screen size
    const screenWidth = window.innerWidth;
    if (screenWidth >= 1600) {
      return 450; // Large screens: 450px (was 465px, -15px)
    } else if (screenWidth >= 1200) {
      return 370; // Medium screens: 370px (was 385px, -15px)
    } else if (screenWidth >= 900) {
      return 320; // Small-medium screens: 320px (was 335px, -15px)
    } else {
      return Math.min(screenWidth * 0.4, 270); // Very small screens: max 40% or 270px (was 285px, -15px)
    }
  }
  
  let currentPanelWidth = getOptimalPanelWidth(); // Dynamic width that can be resized
  
  // Update panel width and save preference
  function updatePanelWidth(newWidth) {
    const clampedWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, newWidth));
    currentPanelWidth = clampedWidth;
    
    // Save user preference
    localStorage.setItem('n8n-ai-panel-width', clampedWidth.toString());
    
    return clampedWidth;
  }
  
  // Resize state
  let isResizing = false;
  let currentPanelHeight = 300; // Default expanded height
  let minPanelHeight = 120;     // Minimum usable height
  let maxPanelHeight = 600;     // Maximum height (about 60% of screen)

  // Create Monaco-inspired styles
  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'n8n-ai-assistant-styles';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');
      
      :root {
        /* n8n Native Colors - Light Theme */
        --ai-bg-primary: #ffffff;
        --ai-bg-secondary: #f9f9f9;
        --ai-bg-tertiary: #f5f5f5;
        --ai-border: #ddd;
        --ai-border-light: #e6e6e6;
        --ai-text-primary: #333333;
        --ai-text-secondary: #666666;
        --ai-text-muted: #999999;
        --ai-text-accent: #007acc;
        --ai-text-success: #28a745;
        --ai-text-warning: #ffc107;
        --ai-text-error: #dc3545;
        --ai-accent: #ff6d5a;
        --ai-accent-hover: #ff5a47;
        --ai-accent-blue: #007acc;
        --ai-accent-blue-hover: #0066b3;
        --ai-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        --ai-shadow-strong: 0 4px 12px rgba(0, 0, 0, 0.15);
        --ai-font-mono: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        --ai-font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }

      .ai-assistant-container * {
        box-sizing: border-box;
      }

      .ai-scrollbar::-webkit-scrollbar {
        width: 8px;
      }

      .ai-scrollbar::-webkit-scrollbar-track {
        background: var(--ai-bg-secondary);
      }

      .ai-scrollbar::-webkit-scrollbar-thumb {
        background: var(--ai-border);
        border-radius: 4px;
        border: 2px solid var(--ai-bg-secondary);
      }

      .ai-scrollbar::-webkit-scrollbar-thumb:hover {
        background: var(--ai-text-secondary);
      }

      .ai-slide-in {
        animation: ai-slide-in 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      }

      .ai-pulse {
        animation: ai-pulse 2s infinite;
      }

      .ai-typing-dots::after {
        content: '';
        animation: ai-typing-dots 1.5s infinite;
      }

      @keyframes ai-slide-in {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }

      @keyframes ai-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      @keyframes ai-typing-dots {
        0%, 20% { content: '.'; }
        40% { content: '..'; }
        60%, 100% { content: '...'; }
      }

      .ai-button-primary {
        background: var(--ai-accent);
        border: 1px solid var(--ai-accent);
        color: white;
        transition: all 0.15s ease;
      }

      .ai-button-primary:hover {
        background: var(--ai-accent-hover);
        border-color: var(--ai-accent-hover);
        transform: translateY(-1px);
      }

      .ai-button-secondary {
        background: transparent;
        border: 1px solid var(--ai-border);
        color: var(--ai-text-primary);
        transition: all 0.15s ease;
      }

      .ai-button-secondary:hover {
        background: var(--ai-bg-tertiary);
        border-color: var(--ai-text-secondary);
      }

      /* Style pour la checkbox Auto */
      #ai-auto-import {
        accent-color: var(--ai-accent);
        width: 14px;
        height: 14px;
      }

      #ai-auto-import:checked {
        background-color: var(--ai-accent);
        border-color: var(--ai-accent);
      }

      .ai-json-highlight {
        color: var(--ai-text-primary);
      }

      .ai-json-highlight .json-key {
        color: var(--ai-code-key);
      }

      .ai-json-highlight .json-string {
        color: var(--ai-code-string);
      }

      .ai-json-highlight .json-number {
        color: var(--ai-code-number);
      }

      .ai-json-highlight .json-boolean {
        color: var(--ai-code-boolean);
      }

      .ai-json-highlight .json-null {
        color: var(--ai-code-null);
      }

      .ai-message {
        margin-bottom: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .ai-message-user {
        align-items: flex-end;
        margin-bottom: 12px;
      }

      .ai-message-assistant {
        align-items: flex-start;
        margin-bottom: 24px;
      }

      .ai-message-bubble {
        padding: 12px 16px;
        font-size: 14px;
        line-height: 1.5;
        word-wrap: break-word;
      }

      .ai-message-bubble-user {
        max-width: 80%;
        border-radius: 16px;
      }

      .ai-message-bubble-assistant {
        max-width: 100%;
        margin: 0;
        padding: 12px 0;
        line-height: 1.6;
        border-radius: 0;
      }

      .ai-message-bubble-user {
        background: var(--ai-accent-blue);
        color: white;
        border-radius: 16px;
        box-shadow: var(--ai-shadow);
      }

      .ai-message-bubble-assistant {
        background: transparent;
        color: var(--ai-text-primary);
        border: none;
        border-radius: 0;
        padding: 0;
        max-width: 100%;
        box-shadow: none;
      }

      .ai-code-panel {
        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        overflow: hidden;
      }

      .ai-code-panel.collapsed {
        height: 40px !important;
      }

      .ai-code-panel.expanded {
        height: var(--panel-height, 300px) !important;
      }

      .ai-code-panel.resizing {
        transition: none !important;
      }

      .ai-resize-handle:hover .ai-resize-indicator {
        opacity: 0.8 !important;
        background: var(--ai-accent-blue) !important;
      }

      .ai-resize-handle.active .ai-resize-indicator {
        opacity: 1 !important;
        background: var(--ai-accent-blue) !important;
        transform: translateX(-50%) scaleX(1.2) !important;
      }

      /* Copy button styles - Same as Insert button (secondary style) */
      #ai-copy-json.visible {
        display: flex !important;
        opacity: 1 !important;
        transform: scale(1) !important;
      }

      #ai-copy-json.visible:hover,
      #ai-copy-json:hover {
        background: var(--ai-bg-tertiary) !important;
        border-color: var(--ai-text-secondary) !important;
        color: var(--ai-text-primary) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
      }

      #ai-copy-json.copying {
        background: var(--ai-text-success) !important;
        border-color: var(--ai-text-success) !important;
        color: white !important;
        opacity: 1 !important;
        transform: scale(1.05) !important;
      }

      /* Ensure button is always properly positioned */
      #ai-copy-json {
        pointer-events: auto !important;
      }

      .ai-toggle-arrow {
        transition: transform 0.2s ease;
      }

      .ai-toggle-arrow.expanded {
        transform: rotate(180deg);
      }

      .ai-input-auto {
        min-height: 72px;
        max-height: 192px; /* 8 lines * 24px line-height */
        transition: height 0.1s ease;
      }

      /* N8N Layout modifications */
      :root {
        --ai-panel-width: ${currentPanelWidth}px;
      }

      .n8n-layout-modified {
        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1) !important;
      }

      .n8n-layout-with-ai {
        width: calc(100% - var(--ai-panel-width)) !important;
        max-width: calc(100% - var(--ai-panel-width)) !important;
        min-width: 400px !important; /* Ensure minimum usable editor width */
      }

      /* AI Panel integrated layout */
      .ai-assistant-integrated {
        position: fixed !important;
        top: 0 !important;
        right: 0 !important;
        width: var(--ai-panel-width) !important;
        height: 100vh !important;
        z-index: 9999 !important;
        transform: none !important;
        box-shadow: -2px 0 8px rgba(0,0,0,0.1) !important;
        border-left: 1px solid var(--ai-border) !important;
      }

      /* Horizontal resize handle */
      .ai-resize-handle-horizontal {
        position: absolute;
        left: -3px;
        top: 0;
        bottom: 0;
        width: 6px;
        cursor: ew-resize;
        background: transparent;
        z-index: 10;
      }

      .ai-resize-handle-horizontal:hover .ai-resize-indicator-horizontal {
        opacity: 0.8 !important;
        background: var(--ai-accent-blue) !important;
      }

      .ai-resize-handle-horizontal.active .ai-resize-indicator-horizontal {
        opacity: 1 !important;
        background: var(--ai-accent-blue) !important;
        transform: translateY(-50%) scaleY(1.2) !important;
      }

      .ai-resize-indicator-horizontal {
        position: absolute;
        left: 2px;
        top: 50%;
        transform: translateY(-50%);
        width: 2px;
        height: 40px;
        background: var(--ai-text-secondary);
        border-radius: 1px;
        opacity: 0.5;
        transition: all 0.15s ease;
      }

              /* Disable transitions during horizontal resize */
        .ai-assistant-container.resizing-width {
          transition: none !important;
        }

        .ai-assistant-container.resizing-width .n8n-layout-modified {
          transition: none !important;
        }

        /* NDV mode - compact styling when node detail view is open */
        .n8n-ai-assistant.ndv-mode {
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.3) !important;
          border-left: 2px solid var(--ai-border-accent) !important;
        }

        .n8n-ai-assistant.ndv-mode .ai-header {
          padding: 8px 12px !important;
          font-size: 13px !important;
        }

        .n8n-ai-assistant.ndv-mode .ai-content {
          padding: 8px 12px !important;
        }

        .n8n-ai-assistant.ndv-mode .ai-chat-messages {
          max-height: 200px !important;
        }

        .n8n-ai-assistant.ndv-mode .ai-input-auto {
          height: 60px !important;
          font-size: 11px !important;
        }

        .n8n-ai-assistant.ndv-mode .ai-code-panel {
          max-height: 250px !important;
        }

        /* n8n-style input focus states */
        #ai-input:focus {
          border-color: var(--ai-accent-blue) !important;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05), 0 0 0 2px rgba(0, 122, 204, 0.1) !important;
        }

        #ai-input::placeholder {
          color: var(--ai-text-muted) !important;
        }

        /* n8n-style button hover effects */
        #ai-insert-code:hover {
          background: var(--ai-bg-tertiary) !important;
          border-color: var(--ai-accent-blue) !important;
        }

        #ai-insert-replace-code:hover {
          background: var(--ai-accent-blue-hover) !important;
          border-color: var(--ai-accent-blue-hover) !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 12px rgba(0, 122, 204, 0.2) !important;
        }

        #ai-close:hover {
          background: var(--ai-bg-tertiary) !important;
          border-color: var(--ai-text-primary) !important;
          color: var(--ai-text-primary) !important;
        }

        /* n8n-style chat messages */
        .ai-message {
          margin-bottom: 16px;
          display: flex;
          align-items: flex-start;
        }

        .ai-message-user {
          justify-content: flex-end;
        }

        .ai-message-assistant {
          justify-content: flex-start;
        }

        .ai-message-bubble {
          padding: 12px 16px;
          line-height: 1.5;
          font-size: 14px;
          word-wrap: break-word;
        }

        .ai-message-bubble-user {
          max-width: 80%;
          border-radius: 12px;
        }

        .ai-message-bubble-assistant {
          max-width: 100%;
          margin: 0;
          padding: 12px 0;
          line-height: 1.6;
          border-radius: 0;
        }

        .ai-message-bubble-user {
          background: var(--ai-accent-blue);
          color: white;
          border-radius: 12px;
          box-shadow: var(--ai-shadow);
        }

        .ai-message-bubble-assistant {
          background: transparent;
          color: var(--ai-text-primary);
          border: none;
          border-radius: 0;
          padding: 0;
          max-width: 100%;
          box-shadow: none;
        }

        .ai-typing-dots {
          display: inline-block;
        }

        .ai-typing-dots::after {
          content: '...';
          animation: typing-dots 1.5s infinite;
        }

        @keyframes typing-dots {
          0%, 20% { content: '.'; }
          40% { content: '..'; }
          60%, 100% { content: '...'; }
        }

      /* Send button hover and loading states - n8n style */
      #ai-send:hover {
        background: var(--ai-accent-blue-hover) !important;
        transform: scale(1.1) !important;
        box-shadow: var(--ai-shadow-strong) !important;
      }

      #ai-send:active {
        transform: scale(0.9) !important;
      }

      #ai-send:disabled {
        background: var(--ai-text-muted) !important;
        cursor: not-allowed !important;
        transform: none !important;
        box-shadow: none !important;
        opacity: 0.6 !important;
      }

      #ai-send.loading {
        background: var(--ai-text-muted) !important;
        cursor: not-allowed !important;
      }

      #ai-send.loading #ai-send-icon {
        animation: spin 1s linear infinite !important;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* Hide annoying GitHub button from n8n interface */
      div[class*="_github-button_"],
      ._github-button_hdyww_149,
      .github-button {
        display: none !important;
        visibility: hidden !important;
      }

      /* Custom tooltip styling for Auto checkbox - adapts to theme */
      label[title="auto insert & replace"] {
        position: relative;
      }

      /* Firebase Auth status indicators */
      #ai-status.auth-ready {
        background: var(--ai-text-success) !important;
        color: white !important;
        font-weight: 600 !important;
      }

      #ai-status.legacy-mode {
        background: var(--ai-text-warning) !important;
        color: white !important;
        font-weight: 600 !important;
      }

      #ai-status.auth-error {
        background: var(--ai-text-error) !important;
        color: white !important;
        font-weight: 600 !important;
      }

      /* Firebase Auth modal styles */
      .firebase-auth-modal {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.7) !important;
        z-index: 99999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      label[title="auto insert & replace"]:hover::after {
        content: attr(title);
        position: absolute;
        bottom: 130%;
        left: 50%;
        transform: translateX(-50%);
        background: var(--ai-text-primary);
        color: var(--ai-bg-primary);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 10px;
        white-space: nowrap;
        z-index: 99999;
        opacity: 0;
        animation: tooltip-fade-in 0.2s ease-out forwards;
        pointer-events: none;
        box-shadow: var(--ai-shadow);
        border: 1px solid var(--ai-border);
      }

      label[title="auto insert & replace"]:hover::before {
        content: '';
        position: absolute;
        bottom: 122%;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-top: 4px solid var(--ai-text-primary);
        z-index: 99999;
        opacity: 0;
        animation: tooltip-fade-in 0.2s ease-out forwards;
      }

      @keyframes tooltip-fade-in {
        from { opacity: 0; transform: translateX(-50%) translateY(4px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }

      /* Responsive adjustments - ensure editor remains usable */
      @media (max-width: 1200px) {
        .n8n-layout-with-ai {
          min-width: 350px !important;
        }
      }

      @media (max-width: 900px) {
        .n8n-layout-with-ai {
          min-width: 300px !important;
        }
      }

      @media (max-width: 600px) {
        .n8n-layout-with-ai {
          width: 100% !important;
          max-width: 100% !important;
        }
        
        .ai-assistant-integrated {
          width: 100% !important;
          border-left: none !important;
          box-shadow: 0 -2px 8px rgba(0,0,0,0.1) !important;
        }
      }

      /* SIMPLE SCROLL FIX for JSON code panel */
      .ai-code-panel.expanded {
        /* Use dynamic --panel-height so JS resize works */
        height: var(--panel-height, 300px) !important;
        overflow: hidden !important;
      }

      .ai-code-panel.expanded #ai-code-content {
        /* Keep 50px less than panel to account for header */
        height: calc(var(--panel-height, 300px) - 50px) !important;
        overflow-y: scroll !important;
        overflow-x: hidden !important;
        overscroll-behavior: contain !important;
        scroll-behavior: smooth !important;
      }

      /* Visible vertical scrollbar only */
      #ai-code-content::-webkit-scrollbar {
        width: 12px !important;
        display: block !important;
      }

      #ai-code-content::-webkit-scrollbar-track {
        background: var(--ai-bg-tertiary) !important;
        border-radius: 6px !important;
      }

      #ai-code-content::-webkit-scrollbar-thumb {
        background: var(--ai-border) !important;
        border-radius: 6px !important;
        border: 2px solid var(--ai-bg-tertiary) !important;
      }

      #ai-code-content::-webkit-scrollbar-thumb:hover {
        background: var(--ai-text-muted) !important;
      }

      /* Smart button text truncation for Insert & Replace */
      .ai-assistant-integrated[style*="width: 335px"] #ai-insert-replace-text,
      .ai-assistant-integrated[style*="width: 30"] #ai-insert-replace-text,
      .ai-assistant-integrated[style*="width: 31"] #ai-insert-replace-text,
      .ai-assistant-integrated[style*="width: 32"] #ai-insert-replace-text,
      .ai-assistant-integrated[style*="width: 33"] #ai-insert-replace-text {
        font-size: 0;
      }
      
      .ai-assistant-integrated[style*="width: 335px"] #ai-insert-replace-text::after,
      .ai-assistant-integrated[style*="width: 30"] #ai-insert-replace-text::after,
      .ai-assistant-integrated[style*="width: 31"] #ai-insert-replace-text::after,
      .ai-assistant-integrated[style*="width: 32"] #ai-insert-replace-text::after,
      .ai-assistant-integrated[style*="width: 33"] #ai-insert-replace-text::after {
        content: "Insert & Repla..";
        font-size: 11px;
      }

      @media (max-width: 400px) {
        #ai-insert-replace-text {
          font-size: 0;
        }
        #ai-insert-replace-text::after {
          content: "Insert & Repla..";
          font-size: 11px;
        }
      }

      @media (max-width: 350px) {
        #ai-insert-replace-text::after {
          content: "Replace";
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Detect and modify n8n layout (SAFE mode - protect editor functionality)
  function detectAndModifyN8nLayout() {
    
    // Log current page info
    
    // CONSERVATIVE approach: Only target the highest-level containers
    // Avoid canvas, editor, and interactive elements
    const n8nSelectors = [
      '#app',                              // Main app container (safest)
      '.el-container',                     // Element UI container
      '.n8n-app',                         // N8n app wrapper
      'main[role="main"]',                // Main content with role
      '.layout-wrapper'                   // Layout wrapper
    ];
    
    // Elements to NEVER modify (protect editor functionality)
    const protectedSelectors = [
      '[data-test-id="canvas"]',          // Canvas area (CRITICAL)
      '.nodeview',                        // Workflow canvas (CRITICAL)
      '.workflow-canvas',                 // Canvas wrapper (CRITICAL)
      '.node-view',                       // Node view (CRITICAL)
      '.editor-ui',                       // Editor UI (CRITICAL)
      '.workflow-editor',                 // Editor container (CRITICAL)
      '.ndv-container',                   // Node detail view (CRITICAL)
      '.sticky-wrapper',                  // Sticky notes (CRITICAL)
      '.pan-zoom',                        // Pan/zoom container (CRITICAL)
      '.zoom-container'                   // Zoom container (CRITICAL)
    ];
    
    let modifiedElements = [];
    
    // First, log all found elements for debugging
    n8nSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach((el, i) => {
          const rect = el.getBoundingClientRect();
        });
      }
    });
    
    // Check protected elements to avoid
    protectedSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
      }
    });
    
    for (const selector of n8nSelectors) {
      const elements = document.querySelectorAll(selector);
      
      for (const element of elements) {
        // Skip if already modified or if it's our extension
        if (element.classList.contains('n8n-layout-modified') || 
            element.id === 'n8n-ai-assistant' || 
            element.closest('#n8n-ai-assistant')) {
          continue;
        }
        
        // CRITICAL: Skip if element contains protected editor elements
        let hasProtectedElements = false;
        for (const protectedSelector of protectedSelectors) {
          if (element.querySelector(protectedSelector)) {
            hasProtectedElements = true;
            break;
          }
        }
        
        if (hasProtectedElements) {
          // Instead of modifying this element, look for its parent
          const parent = element.parentElement;
          if (parent && parent !== document.body && parent !== document.documentElement) {
            const parentRect = parent.getBoundingClientRect();
            if (parentRect.width > window.innerWidth * 0.8) {
              parent.classList.add('n8n-layout-modified');
              modifiedElements.push({
                element: parent,
                selector: `${selector}-parent`,
                originalWidth: window.getComputedStyle(parent).width,
                originalMaxWidth: window.getComputedStyle(parent).maxWidth
              });
            }
          }
          continue;
        }
        
        // Check if element is suitable for modification
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        
        const isWideEnough = rect.width > window.innerWidth * 0.7; // Higher threshold for safety
        const isNotFloating = computedStyle.position !== 'fixed' && computedStyle.position !== 'absolute';
        const hasReasonableHeight = rect.height > 300; // Higher threshold for main containers
        const isTopLevel = element.parentElement === document.body || 
                          element.parentElement === document.documentElement ||
                          element.closest('html') === document.documentElement;
        
        if (isWideEnough && isNotFloating && hasReasonableHeight) {
          // debug info removed
          // Add transition class
          element.classList.add('n8n-layout-modified');
          modifiedElements.push({
            element,
            selector,
            originalWidth: computedStyle.width,
            originalMaxWidth: computedStyle.maxWidth
          });
          
          // Only modify the first suitable element to avoid conflicts
          break;
        } else {
        }
      }
      
      // If we found a suitable element, stop searching
      if (modifiedElements.length > 0) break;
    }
    
    
    // Enhanced fallback: Only if absolutely necessary
    if (modifiedElements.length === 0) {
      
      // Try to modify only body or html
      const bodyRect = document.body.getBoundingClientRect();
      if (bodyRect.width > window.innerWidth * 0.9) {
        document.body.classList.add('n8n-layout-modified');
        modifiedElements.push({
          element: document.body,
          selector: 'body-fallback',
          originalWidth: window.getComputedStyle(document.body).width,
          originalMaxWidth: window.getComputedStyle(document.body).maxWidth
        });
      }
    }
    
    return modifiedElements;
  }

  // Check if editor remains functional after layout changes
  function checkEditorFunctionality() {
    // Check if editor canvas is still accessible and has reasonable size
    const canvas = document.querySelector('[data-test-id="canvas"], .nodeview, .workflow-canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const minWidth = 300; // Minimum width for usable editor
      const minHeight = 200; // Minimum height for usable editor
      
      if (rect.width < minWidth || rect.height < minHeight) {
        // Editor canvas too small after layout modification
        return false;
      }
      
      return true;
    }
    
    // No canvas found - might be loading
    return true; // Don't fail if we can't find the canvas yet
  }

  // Apply layout modifications to make space for AI panel
  function applyN8nLayoutModifications() {
    if (n8nLayoutModified) return;
    
    
    const modifiedElements = detectAndModifyN8nLayout();
    
    if (modifiedElements.length === 0) {
      // Still mark as modified to avoid infinite retry
      n8nLayoutModified = true;
      return;
    }
    
    // Apply width modifications
    modifiedElements.forEach(({ element, selector }) => {
      element.classList.add('n8n-layout-with-ai');
    });
    
    // Store body margin for restoration
    const body = document.body;
    if (!body.dataset.originalMarginRight) {
      const computedStyle = window.getComputedStyle(body);
      body.dataset.originalMarginRight = computedStyle.marginRight;
    }
    
    // Apply body modifications more conservatively
    const shouldModifyBody = window.innerWidth < 1200 || modifiedElements.length === 0;
    if (shouldModifyBody) {
      body.style.marginRight = currentPanelWidth + 'px';
    }
    
    n8nLayoutModified = true;
    
    // Verify editor functionality after a short delay
    setTimeout(() => {
      const isEditorOK = checkEditorFunctionality();
      if (!isEditorOK) {
      }
    }, 500);
    
  }

  // Remove layout modifications
  function removeN8nLayoutModifications() {
    if (!n8nLayoutModified) return;
    
    
    // Remove all layout classes
    const modifiedElements = document.querySelectorAll('.n8n-layout-modified');
    modifiedElements.forEach(element => {
      element.classList.remove('n8n-layout-modified', 'n8n-layout-with-ai');
    });
    
    // Restore body margin
    const body = document.body;
    if (body.dataset.originalMarginRight) {
      body.style.marginRight = body.dataset.originalMarginRight;
      delete body.dataset.originalMarginRight;
    }
    
    n8nLayoutModified = false;
  }

  // Create the main interface
  function createInterface() {
    
    // Remove existing
    const existing = document.getElementById('n8n-ai-assistant');
    if (existing) existing.remove();
    
    const container = document.createElement('div');
    container.id = 'n8n-ai-assistant';
    container.className = 'ai-assistant-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      right: -${currentPanelWidth}px;
      width: ${currentPanelWidth}px;
      height: 100vh;
      background: var(--ai-bg-primary);
      border-left: 1px solid var(--ai-border);
      transition: right 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      z-index: 9999;
      font-family: var(--ai-font-ui);
      display: flex;
      flex-direction: column;
      box-shadow: -2px 0 8px rgba(0,0,0,0.1);
    `;
    
    container.innerHTML = `
      <!-- Horizontal Resize Handle -->
      <div class="ai-resize-handle-horizontal" id="ai-resize-handle-horizontal">
        <div class="ai-resize-indicator-horizontal"></div>
      </div>

                  <!-- Header - n8n Style (Enhanced to match native headers) -->
      <div style="
        padding: 16px 20px;
        background: var(--ai-bg-primary);
        border-bottom: 1px solid var(--ai-border-light);
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 56px;
        box-shadow: none;
      ">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--ai-text-success);
          "></div>
          <span style="
            font-weight: 600;
            color: var(--ai-text-primary);
            font-size: 15px;
            letter-spacing: -0.2px;
          ">AI Workflow Assistant</span>
          <span id="ai-status" style="
            font-size: 11px;
            color: var(--ai-text-muted);
            font-family: var(--ai-font-mono);
            cursor: pointer;
            background: var(--ai-bg-tertiary);
            padding: 3px 8px;
            border-radius: 12px;
            border: 1px solid var(--ai-border-light);
          " title="Click to check service worker status">ready</span>
      </div>
        <button id="ai-close" style="
          background: transparent;
          border: 1px solid var(--ai-border);
          color: var(--ai-text-secondary);
          cursor: pointer;
          padding: 8px 10px;
          border-radius: 6px;
          font-size: 14px;
          line-height: 1;
          transition: all 0.15s ease;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        " title="Close (Esc)">×</button>
      </div>

      <!-- Chat Messages Area - Cursor AI Style -->
      <div id="ai-chat-messages" style="
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        background: var(--ai-bg-secondary);
      " class="ai-scrollbar">
        <!-- Welcome message styled like assistant message -->
        <div class="ai-message ai-message-assistant" style="margin-bottom: 24px;">
          <div class="ai-message-bubble ai-message-bubble-assistant">
                        <span style="
              color: var(--ai-text-muted);
              font-weight: 600;
              margin-right: 12px;
              font-size: 14px;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              opacity: 0.8;
            ">
              <span style="font-size: 12px;">🤖</span><span>AI</span>
            </span>
                        <span style="color: var(--ai-text-primary); line-height: 1.6;">
              Hello! I'm your n8n workflow assistant. I can help you create or modify complete, functional workflows from simple descriptions.
            </span>
          </div>
        </div>
      </div>

      <!-- Code Panel (Collapsible & Resizable) -->
      <div id="ai-code-panel" class="ai-code-panel collapsed" style="
        background: var(--ai-bg-secondary);
        border-top: 1px solid var(--ai-border);
        height: 40px;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
        min-height: 0;
      ">
        <!-- Resize Handle -->
        <div id="ai-resize-handle" class="ai-resize-handle" style="
          position: absolute;
          top: -3px;
          left: 0;
          right: 0;
          height: 6px;
          cursor: ns-resize;
          background: transparent;
          z-index: 10;
          display: none;
        ">
          <div class="ai-resize-indicator" style="
            position: absolute;
            top: 2px;
            left: 50%;
            transform: translateX(-50%);
            width: 40px;
            height: 2px;
            background: var(--ai-text-secondary);
            border-radius: 1px;
            opacity: 0.5;
            transition: all 0.15s ease;
          "></div>
        </div>
        
        <!-- Code Panel Header - n8n Style -->
        <div id="ai-code-toggle" style="
          padding: 8px 12px;
          background: var(--ai-bg-primary);
          border-bottom: 1px solid var(--ai-border-light);
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          min-height: 36px;
          box-shadow: none;
        ">
          <div style="
            font-size: 12px;
            color: var(--ai-text-primary);
            font-family: var(--ai-font-ui);
            display: flex;
            align-items: center;
            gap: 6px;
            font-weight: 500;
          ">
            <span>📄</span>
            <span>workflow.json</span>
          </div>
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <button id="ai-insert-code" style="
              padding: 4px 8px;
              font-size: 11px;
              border-radius: 4px;
              cursor: pointer;
              background: transparent;
              border: 1px solid var(--ai-border);
              color: var(--ai-text-primary);
              font-weight: 500;
              transition: all 0.15s ease;
            " title="Insert workflow into n8n">Insert</button>
            <button id="ai-insert-replace-code" style="
              padding: 4px 8px;
              font-size: 11px;
              border-radius: 4px;
              cursor: pointer;
              background: var(--ai-accent-blue);
              color: white;
              border: 1px solid var(--ai-accent-blue);
              font-weight: 500;
              transition: all 0.15s ease;
              box-shadow: var(--ai-shadow);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              min-width: 0;
            " title="Replace current workflow with this one"><span id="ai-insert-replace-text">Insert & Replace</span></button>
            <label style="
              display: flex;
              align-items: center;
              gap: 3px;
              cursor: pointer;
              font-size: 10px;
              color: var(--ai-text-muted);
            " title="auto insert & replace">
              <input type="checkbox" id="ai-auto-import" checked style="
                margin: 0;
                cursor: pointer;
                width: 12px;
                height: 12px;
                accent-color: var(--ai-accent-blue);
              ">
              <span>Auto</span>
            </label>
            <span id="ai-toggle-arrow" class="ai-toggle-arrow" style="
              color: var(--ai-text-secondary);
              font-size: 12px;
            ">▲</span>
          </div>
        </div>
        
        <!-- Code Content Container -->
        <div style="
          flex: 1;
          position: relative;
          background: var(--ai-bg-primary);
        ">
          <!-- Copy Button (fixed position, separate from content) -->
          <button id="ai-copy-json" style="
            position: absolute;
            top: 8px;
            right: 8px;
            background: var(--ai-bg-primary);
            border: 1px solid var(--ai-border);
            color: var(--ai-text-primary);
            padding: 4px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-family: var(--ai-font-ui);
            display: none;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: all 0.2s ease;
            z-index: 100;
            backdrop-filter: blur(8px);
            box-shadow: var(--ai-shadow);
            width: 28px;
            height: 28px;
            pointer-events: auto;
          " title="Copy JSON to clipboard">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="m5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          
                    <!-- Actual Code Content - n8n Style -->
          <div id="ai-code-content" style="
            padding: 16px;
            padding-top: 50px;
            background: var(--ai-bg-secondary);
            color: var(--ai-text-primary);
            font-family: var(--ai-font-mono);
            font-size: 12px;
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
            border: 1px solid var(--ai-border-light);
            border-top: none;
            box-sizing: border-box;
            height: 100%;
            overflow-y: scroll;
            overflow-x: hidden;
        " class="ai-scrollbar">
          </div>
        </div>
      </div>

      <!-- Input Area - n8n Style -->
      <div style="
        padding: 12px;
        background: var(--ai-bg-primary);
        border-top: 1px solid var(--ai-border-light);
        box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.05);
      ">
        <div style="
          position: relative;
          display: flex;
          align-items: flex-end;
        ">
          <textarea 
            id="ai-input" 
              class="ai-input-auto"
              placeholder="Describe your workflow... (e.g., 'Create a workflow that syncs Slack with Notion every hour')"
              data-no-auto-import="true"
              style="
                width: 100%;
                height: 72px;
                padding: 12px 36px 12px 12px;
                background: var(--ai-bg-primary);
                border: 1px solid var(--ai-border);
                border-radius: 8px;
                color: var(--ai-text-primary);
                font-family: var(--ai-font-ui);
                font-size: 12px;
                line-height: 1.4;
                resize: none;
                outline: none;
                transition: all 0.15s ease;
                box-sizing: border-box;
                box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
              "
          ></textarea>
          <button 
            id="ai-send" 
            style="
              position: absolute;
              right: 8px;
              bottom: 8px;
              width: 24px;
              height: 24px;
              padding: 0;
              background: var(--ai-accent-blue);
              color: white;
              border: none;
              border-radius: 50%;
              cursor: pointer;
              font-size: 12px;
              font-weight: 300;
              line-height: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.15s ease;
              box-shadow: var(--ai-shadow);
              z-index: 10;
            "
            title="Generate workflow (Ctrl+Enter)"
          >
            <span id="ai-send-icon">↑</span>
          </button>
        </div>
        <div style="
          margin-top: 8px;
          font-size: 10px;
          color: var(--ai-text-muted);
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <span style="display: flex; align-items: center; gap: 3px;">
            <span>💡</span>
            <span>Be specific for better results</span>
          </span>
          <span style="
            font-family: var(--ai-font-mono);
            background: var(--ai-bg-tertiary);
            padding: 1px 4px;
            border-radius: 3px;
            border: 1px solid var(--ai-border-light);
            font-size: 9px;
          ">Ctrl+Enter</span>
        </div>
      </div>
    `;

    // Prevent all events from propagating to n8n
    container.addEventListener('keydown', (e) => {
      e.stopPropagation();
    });
    
    container.addEventListener('keyup', (e) => {
      e.stopPropagation();
    });
    
    container.addEventListener('keypress', (e) => {
      e.stopPropagation();
    });
    
    document.body.appendChild(container);
    setupEventListeners();
    
    // Open the code panel by default (was collapsed previously)
    if (!isCodePanelExpanded) {
      toggleCodePanel();
    }
    
    // Ensure console starts completely clean and UI state is reset
    // Wait longer to ensure all DOM elements are ready
    setTimeout(() => {
      clearCode();
      resetUIState();
      
      // 🔧 Test initial du service worker
      checkServiceWorkerStatus();
    }, 250);
    
    return container;
  }

  // Handle window resize
  function handleWindowResize() {
    if (isOpen && n8nLayoutModified) {
      
      // Re-detect and apply layout modifications
      setTimeout(() => {
        removeN8nLayoutModifications();
        applyN8nLayoutModifications();
      }, 100);
    }
  }

  // Monitor for n8n DOM changes and reapply layout if needed
  function setupDOMObserver() {
    const observer = new MutationObserver((mutations) => {
      if (!isOpen || !n8nLayoutModified) return;
      
      let shouldReapply = false;
      
      mutations.forEach(mutation => {
        // Check if any added nodes might be main containers
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            
            // Check if it's a potential main container
            if (element.id === 'app' || 
                element.classList.contains('app-container') ||
                element.classList.contains('n8n-app') ||
                element.tagName === 'MAIN') {
              shouldReapply = true;
            }
          }
        });
        
        // Check if any removed nodes had our modifications
        mutation.removedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE && 
              node.classList?.contains('n8n-layout-modified')) {
            shouldReapply = true;
          }
        });
      });
      
      if (shouldReapply) {
        setTimeout(() => {
          removeN8nLayoutModifications();
          applyN8nLayoutModifications();
        }, 100);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    return observer;
  }

  // Create floating button
  function createFloatingButton() {
    
    const existing = document.getElementById('n8n-ai-toggle');
    if (existing) existing.remove();
    
    const button = document.createElement('button');
    button.id = 'n8n-ai-toggle';
    button.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      background: var(--ai-accent-blue);
      color: white;
      border: 1px solid var(--ai-accent-blue);
      border-radius: 16px;
      cursor: pointer;
      font-size: 20px;
      z-index: 9998;
      box-shadow: var(--ai-shadow-strong);
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--ai-font-ui);
      font-weight: 500;
    `;
    
    button.innerHTML = '🤖';
    button.title = 'Open AI Assistant (Ctrl+Shift+A)';
    
    button.addEventListener('mouseenter', () => {
      if (!isOpen) {
        button.style.transform = 'scale(1.05) translateY(-2px)';
        button.style.boxShadow = '0 8px 25px rgba(0, 122, 204, 0.3)';
        button.style.background = 'var(--ai-accent-blue-hover)';
        button.style.borderColor = 'var(--ai-accent-blue-hover)';
      }
    });
    
    button.addEventListener('mouseleave', () => {
      if (!isOpen) {
        button.style.transform = 'scale(1) translateY(0px)';
        button.style.boxShadow = 'var(--ai-shadow-strong)';
        button.style.background = 'var(--ai-accent-blue)';
        button.style.borderColor = 'var(--ai-accent-blue)';
      }
    });
    
    button.onclick = toggleInterface;
    document.body.appendChild(button);
    
    // Button stays in original position and visibility is handled by toggle function
    
    return button;
  }

  // Auto-resize textarea
  function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 72), 192);
    textarea.style.height = newHeight + 'px';
  }

  // Setup event listeners
  function setupEventListeners() {
    
    // Safety checks for all elements
    const closeButton = document.getElementById('ai-close');
    const sendButton = document.getElementById('ai-send');
    const inputField = document.getElementById('ai-input');
    const codeToggle = document.getElementById('ai-code-toggle');
    const insertButton = document.getElementById('ai-insert-code');
    const insertReplaceButton = document.getElementById('ai-insert-replace-code');
    const autoImportCheckbox = document.getElementById('ai-auto-import');
    const copyButton = document.getElementById('ai-copy-json');
    
    // Close chat when a node opens (detected by URL change)
    let lastUrl = window.location.href;
    
    function checkUrlChange() {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        // Check if URL contains a node ID (format: /workflow/ID/NODE_ID)
        const nodeIdMatch = currentUrl.match(/\/workflow\/[^\/]+\/([a-zA-Z0-9]+)$/);
        if (nodeIdMatch && isOpen) {
          toggleInterface();
        }
        lastUrl = currentUrl;
      }
    }
    
    // Listen for URL changes via popstate
    window.addEventListener('popstate', checkUrlChange);
    
    // Also check periodically since n8n uses client-side routing
    setInterval(checkUrlChange, 500);
    
    // Close button
    if (closeButton) {
      closeButton.onclick = toggleInterface;
    } else {
    }
    
    // Status indicator (clickable diagnostic)
    const statusIndicator = document.getElementById('ai-status');
    if (statusIndicator) {
      statusIndicator.onclick = (e) => {
        e.stopPropagation();
        checkServiceWorkerStatus();
      };
    }
    
    // Send button and input
    if (sendButton && inputField) {
      sendButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        sendMessage();
      };
      
      // Input field event listeners
      inputField.addEventListener('input', (e) => {
        e.stopPropagation();
        autoResizeTextarea(inputField);
      });
      
      // Gentle protection: mark when pasting in chat to avoid auto-import
      let isPastingInChat = false;
      
      inputField.addEventListener('paste', (e) => {
        isPastingInChat = true;
        
        // Clear the flag after a short delay
        setTimeout(() => {
          isPastingInChat = false;
          autoResizeTextarea(inputField);
        }, 1000);
      });
      
      // Expose flag globally to prevent auto-import when pasting in chat
      window.aiChatPastingFlag = () => isPastingInChat;
      
      // Handle Ctrl+Enter for sending message
      inputField.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          sendMessage();
        }
      });
      
    } else {
    }
    

    
    // Code panel toggle
    if (codeToggle) {
      codeToggle.onclick = toggleCodePanel;
    } else {
    }
    
    // Insert code button
    if (insertButton) {
      insertButton.onclick = (e) => {
      e.stopPropagation();
        insertWorkflow(false); // Insert without replacing
      };
    } else {
    }
    
    // Insert & Replace code button
    if (insertReplaceButton) {
      insertReplaceButton.onclick = (e) => {
        e.stopPropagation();
        insertWorkflow(true); // Insert with replacement
      };
    } else {
    }
    
    // Auto-import checkbox
    if (autoImportCheckbox) {
      autoImportCheckbox.onchange = (e) => {
        e.stopPropagation();
        autoImportEnabled = e.target.checked;
    };
    
      // Prevent checkbox click from toggling code panel
      autoImportCheckbox.onclick = (e) => {
        e.stopPropagation();
      };
      
      // Also prevent label click from toggling code panel
      if (autoImportCheckbox.parentElement) {
        autoImportCheckbox.parentElement.onclick = (e) => {
          e.stopPropagation();
        };
      }
      
    } else {
    }
    
    // Resize handle functionality
    setupResizeHandle();
    
    // Horizontal resize functionality
    setupHorizontalResize();
    
    // NDV detection and adaptation
    startNDVDetection();
    
    // Copy JSON button (now permanently in DOM)
    if (copyButton) {
      copyButton.onclick = (e) => {
        e.stopPropagation();
        copyJsonToClipboard();
      };
      
      // Make sure it starts hidden
      copyButton.style.display = 'none';
      copyButton.style.opacity = '0';
      copyButton.classList.remove('visible');
      
      
      // Debug: Test copy button positioning
      setTimeout(() => {
        const rect = copyButton.getBoundingClientRect();
        const computed = window.getComputedStyle(copyButton);
        
        // Temporary test: force show button for 3 seconds to test visibility
        copyButton.style.display = 'flex';
        copyButton.style.opacity = '1';
        copyButton.classList.add('visible');
        
        setTimeout(() => {
          copyButton.style.display = 'none';
          copyButton.style.opacity = '0';
          copyButton.classList.remove('visible');
        }, 3000);
      }, 1000);
    } else {
    }
    
    // Input focus effects (only if inputField exists)
    if (inputField) {
    inputField.addEventListener('focus', (e) => {
      e.stopPropagation();
      inputField.style.borderColor = 'var(--ai-accent)';
    });
    
    inputField.addEventListener('blur', (e) => {
      e.stopPropagation();
      inputField.style.borderColor = 'var(--ai-border)';
    });
    
    // Keyboard shortcuts
    inputField.addEventListener('keydown', (e) => {
      // Stop propagation to prevent n8n shortcuts from being triggered
      e.stopPropagation();
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        toggleInterface();
      }
    });
    
    // Also prevent propagation on keyup and keypress
    inputField.addEventListener('keyup', (e) => {
      e.stopPropagation();
    });
    
    inputField.addEventListener('keypress', (e) => {
      e.stopPropagation();
    });
    
    }
    
    // Note: input event listener already added above in the setup
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Only handle global shortcuts if not focused on our extension
      const isExtensionFocused = document.activeElement && 
        (document.activeElement.closest('#n8n-ai-assistant') || 
         document.activeElement.id === 'ai-input');
      
      if (!isExtensionFocused) {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
          e.preventDefault();
          e.stopPropagation();
          toggleInterface();
        }
        
        if (e.key === 'Escape' && isOpen) {
          e.preventDefault();
          e.stopPropagation();
          toggleInterface();
        }
        
        // Force reset with Ctrl+Shift+R (for debugging)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
          e.preventDefault();
          e.stopPropagation();
          resetUIState();
        }
      }
    });
    
  }

  // Toggle interface
  function toggleInterface() {
    
    // 🔧 Wake up service worker when opening interface
    if (!isOpen) {
      // We are opening the assistant – wake the service worker immediately
      pingServiceWorker().catch(() => {});
      // Start keep-alive ping every 15 s while the assistant is visible
      if (!keepAliveIntervalId) {
        keepAliveIntervalId = setInterval(() => {
          pingServiceWorker().catch(() => {});
        }, 15000); // 15 seconds
      }
    } else {
      // We are closing the assistant – stop keep-alive pings
      if (keepAliveIntervalId) {
        clearInterval(keepAliveIntervalId);
        keepAliveIntervalId = null;
      }
    }
    
    isOpen = !isOpen;
    const container = document.getElementById('n8n-ai-assistant');
    const button = document.getElementById('n8n-ai-toggle');
    
    if (isOpen) {
      
      // Apply layout modifications to make space
      applyN8nLayoutModifications();
      
      // Show the panel
      container.style.right = '0px';
      container.classList.add('ai-assistant-integrated');
      
      // Hide the floating button when interface is open (integrated layout doesn't need it)
      button.style.opacity = '0';
      button.style.pointerEvents = 'none';
      button.style.transform = 'scale(0.8)';
      
      // Focus input after layout settles
      setTimeout(() => {
        const input = document.getElementById('ai-input');
        if (input) input.focus();
      }, 350); // Wait for transition to complete
      
    } else {
      
      // Hide the panel first
      container.style.right = `-${currentPanelWidth}px`;
      container.classList.remove('ai-assistant-integrated');
      
      // Show the floating button when interface is closed
      button.style.opacity = '1';
      button.style.pointerEvents = 'auto';
      button.style.transform = 'scale(1)';
      button.style.right = '24px';
      
      // Remove layout modifications after animation
      setTimeout(() => {
        removeN8nLayoutModifications();
      }, 300); // Wait for panel to slide out
    }
  }

  // Toggle code panel
  function toggleCodePanel() {
    isCodePanelExpanded = !isCodePanelExpanded;
    const panel = document.getElementById('ai-code-panel');
    const arrow = document.getElementById('ai-toggle-arrow');
    const resizeHandle = document.getElementById('ai-resize-handle');
    
    if (isCodePanelExpanded) {
      panel.classList.remove('collapsed');
      panel.classList.add('expanded');
      arrow.classList.add('expanded');
      resizeHandle.style.display = 'block';
      // Apply current height
      panel.style.setProperty('--panel-height', currentPanelHeight + 'px');
    } else {
      panel.classList.remove('expanded');
      panel.classList.add('collapsed');
      arrow.classList.remove('expanded');
      resizeHandle.style.display = 'none';
    }
  }

  // Setup resize handle functionality
  function setupResizeHandle() {
    const resizeHandle = document.getElementById('ai-resize-handle');
    const panel = document.getElementById('ai-code-panel');
    
    let startY = 0;
    let startHeight = 0;
    
    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      isResizing = true;
      startY = e.clientY;
      startHeight = currentPanelHeight;
      
      panel.classList.add('resizing');
      resizeHandle.classList.add('active');
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ns-resize';
      
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      
      e.preventDefault();
      const deltaY = startY - e.clientY; // Inverted because we want drag down = smaller
      const newHeight = Math.max(minPanelHeight, Math.min(maxPanelHeight, startHeight + deltaY));
      
      currentPanelHeight = newHeight;
      panel.style.setProperty('--panel-height', newHeight + 'px');
    });
    
    document.addEventListener('mouseup', (e) => {
      if (!isResizing) return;
      
      isResizing = false;
      panel.classList.remove('resizing');
      resizeHandle.classList.remove('active');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      
    });
    
    // Prevent resize handle click from toggling panel
    resizeHandle.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Setup horizontal resize functionality
  function setupHorizontalResize() {
    const resizeHandle = document.getElementById('ai-resize-handle-horizontal');
    const container = document.getElementById('n8n-ai-assistant');
    
    if (!resizeHandle || !container) {
      return;
    }
    
    let startX = 0;
    let startWidth = 0;
    
    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      isResizingWidth = true;
      startX = e.clientX;
      startWidth = currentPanelWidth;
      
      container.classList.add('resizing-width');
      resizeHandle.classList.add('active');
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
      
      // Disable CSS transitions temporarily
      updateCSSVariable('--ai-panel-width', currentPanelWidth + 'px');
      
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isResizingWidth) return;
      
      e.preventDefault();
      const deltaX = startX - e.clientX; // Distance moved left (positive = smaller)
      const newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, startWidth + deltaX));
      
      // Update width immediately
      updatePanelWidth(newWidth);
      
      // Update container size
      container.style.width = newWidth + 'px';
      container.style.right = isOpen ? '0px' : `-${newWidth}px`;
      
      // Update CSS variable for n8n layout
      updateCSSVariable('--ai-panel-width', newWidth + 'px');
      
      // No width indicator to update (removed from header)
      
      // Reapply n8n layout modifications with new width
      if (isOpen && n8nLayoutModified) {
        applyN8nLayoutModifications();
      }
    });
    
    document.addEventListener('mouseup', (e) => {
      if (!isResizingWidth) return;
      
      isResizingWidth = false;
      container.classList.remove('resizing-width');
      resizeHandle.classList.remove('active');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      
    });
    
    // Prevent resize handle click from interfering with other events
    resizeHandle.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
  }

  // Update CSS variable dynamically
  function updateCSSVariable(name, value) {
    document.documentElement.style.setProperty(name, value);
  }

  // 🎯 NODE DETAIL VIEW (NDV) DETECTION AND ADAPTATION
  let ndvObserver = null;
  let isNDVOpen = false;
  let originalPanelWidth = null;

  // Detect when Node Detail View opens/closes
  function detectNDVState() {
    const ndvContainer = document.querySelector('.ndv-container, [data-test-id="ndv"], .node-view-wrapper');
    const newNDVState = !!(ndvContainer && ndvContainer.offsetParent !== null);
    
    if (newNDVState !== isNDVOpen) {
      isNDVOpen = newNDVState;
      adaptToNDVState(isNDVOpen);
    }
    
    return isNDVOpen;
  }

  // Adapt AI panel when NDV opens/closes
  function adaptToNDVState(ndvOpen) {
    const container = document.getElementById('n8n-ai-assistant');
    if (!container) return;

    if (ndvOpen) {
      // NDV is open - make AI panel smaller and more discreet
      
      // Store original width if not already stored
      if (originalPanelWidth === null) {
        originalPanelWidth = currentPanelWidth;
      }
      
      // Reduce panel width significantly for NDV mode
      const ndvModeWidth = Math.min(300, originalPanelWidth * 0.6);
      updatePanelWidth(ndvModeWidth);
      
      // Add special class for NDV mode styling
      container.classList.add('ndv-mode');
      
      // Update container with new width
      container.style.width = ndvModeWidth + 'px';
      container.style.right = isOpen ? '0px' : `-${ndvModeWidth}px`;
      
      // Update CSS variable
      updateCSSVariable('--ai-panel-width', ndvModeWidth + 'px');
      
      
    } else {
      // NDV is closed - restore original size
      
      // Remove NDV mode class
      container.classList.remove('ndv-mode');
      
      // Restore original width if it was stored
      if (originalPanelWidth !== null) {
        updatePanelWidth(originalPanelWidth);
        
        // Update container with restored width
        container.style.width = originalPanelWidth + 'px';
        container.style.right = isOpen ? '0px' : `-${originalPanelWidth}px`;
        
        // Update CSS variable
        updateCSSVariable('--ai-panel-width', originalPanelWidth + 'px');
        
        
        // Clear the stored width
        originalPanelWidth = null;
      }
    }
    
    // Reapply layout modifications if needed
    if (isOpen && n8nLayoutModified) {
      // Small delay to ensure NDV transition is complete
      setTimeout(() => {
        removeN8nLayoutModifications();
        applyN8nLayoutModifications();
      }, 100);
    }
  }

  // Start NDV monitoring
  function startNDVDetection() {
    if (ndvObserver) return; // Already running
    
    
    // Initial detection
    detectNDVState();
    
    // Create observer for NDV changes
    ndvObserver = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      mutations.forEach((mutation) => {
        // Check for node additions/removals that might be NDV
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          const removedNodes = Array.from(mutation.removedNodes);
          
          const isNDVRelated = [...addedNodes, ...removedNodes].some(node => {
            if (node.nodeType !== Node.ELEMENT_NODE) return false;
            const element = node;
            return element.classList.contains('ndv-container') ||
                   element.classList.contains('node-view-wrapper') ||
                   element.querySelector?.('.ndv-container, [data-test-id="ndv"]');
          });
          
          if (isNDVRelated) {
            shouldCheck = true;
          }
        }
        
        // Check for style/class changes that might affect NDV visibility
        if (mutation.type === 'attributes') {
          const target = mutation.target;
          if (target.classList.contains('ndv-container') ||
              target.classList.contains('node-view-wrapper') ||
              target.hasAttribute('data-test-id') && target.getAttribute('data-test-id') === 'ndv') {
            shouldCheck = true;
          }
        }
      });
      
      if (shouldCheck) {
        // Debounce NDV detection
        setTimeout(() => {
          detectNDVState();
        }, 50);
      }
    });
    
    // Observe the document for NDV changes
    ndvObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-test-id']
    });
    
  }

  // 🎨 THEME DETECTION AND ADAPTATION
  let currentTheme = 'light';
  let themeObserver = null;
  let themeDetectionTimeout = null;

  // Detect n8n theme (dark/light)
  function detectN8nTheme() {
    
    // Method 0: PRIORITY - Check if n8n is using system preferences
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Check if n8n is following system preferences (common indicators)
    const html = document.documentElement;
    const body = document.body;
    
    // Look for indicators that n8n is in "system default" mode
    const systemDefaultIndicators = [
      // Check if CSS uses system color schemes
      () => {
        const rootStyles = window.getComputedStyle(document.documentElement);
        const colorScheme = rootStyles.getPropertyValue('color-scheme').trim();
        return colorScheme.includes('light dark') || colorScheme.includes('dark light');
      },
      // Check if body/html don't have explicit theme classes (indicating system default)
      () => {
        const hasExplicitTheme = html.classList.contains('dark') || html.classList.contains('light') ||
                               body.classList.contains('dark') || body.classList.contains('light') ||
                               html.classList.contains('dark-theme') || html.classList.contains('light-theme') ||
                               body.classList.contains('dark-theme') || body.classList.contains('light-theme');
        return !hasExplicitTheme;
      },
      // Check for CSS variables that respond to prefers-color-scheme
      () => {
        const style = document.createElement('div');
        style.style.color = 'var(--color-background, transparent)';
        document.body.appendChild(style);
        const hasThemeVars = window.getComputedStyle(style).color !== 'transparent';
        document.body.removeChild(style);
        return hasThemeVars;
      }
    ];
    
    const systemDefaultScore = systemDefaultIndicators.filter(check => check()).length;
    
    // If we have good evidence n8n is following system preferences, use that
    if (systemDefaultScore >= 1) {
      if (systemPrefersDark) {
        return 'dark';
      } else {
        return 'light';
      }
    }
    
    // Method 1: Check for explicit dark theme classes
    
    
    if (html.classList.contains('dark') || 
        body.classList.contains('dark') ||
        html.classList.contains('dark-theme') ||
        body.classList.contains('dark-theme')) {
      return 'dark';
    }
    
    // Method 2: Check n8n specific dark theme indicators
    const n8nApp = document.querySelector('#app, .n8n-app, [data-theme]');
    if (n8nApp) {
      const theme = n8nApp.getAttribute('data-theme');
      
      if (theme && theme.includes('dark')) {
        return 'dark';
      }
      
      const classList = n8nApp.classList;
      if (classList.contains('dark') || classList.contains('dark-theme')) {
        return 'dark';
      }
    }
    
    // Method 2.5: Look for n8n light mode indicators
    if (html.classList.contains('light') || 
        body.classList.contains('light') ||
        html.classList.contains('light-theme') ||
        body.classList.contains('light-theme')) {
      return 'light';
    }
    
    if (n8nApp) {
      const theme = n8nApp.getAttribute('data-theme');
      if (theme && theme.includes('light')) {
        return 'light';
      }
      
      const classList = n8nApp.classList;
      if (classList.contains('light') || classList.contains('light-theme')) {
        return 'light';
      }
    }
    
    // Method 3: Check n8n specific selectors and background colors
    const n8nElements = [
      // n8n specific selectors
      '.n8n-sidebar',
      '.sidebar-menu',
      '.main-content',
      '.editor-panel',
      '.main-header',
      '.header-wrapper',
      '.content-wrapper',
      // More specific n8n selectors
      '.left-panel',
      '.nodeview',
      '.node-view',
      '.canvas-container',
      '.main-panel',
      '.workflow-canvas',
      // Generic selectors
      '.navbar', 
      '.header', 
      '.top-bar', 
      '[class*="header"]',
      '.sidebar', 
      '.side-menu', 
      '[class*="sidebar"]',
      '.main-content', 
      '.content', 
      '[class*="main"]'
    ];
    
    
    for (const selector of n8nElements) {
      const element = document.querySelector(selector);
      if (element) {
        const computedStyle = window.getComputedStyle(element);
        const bgColor = computedStyle.backgroundColor;
        
        
        // Parse RGB values to determine if it's dark
        const rgb = bgColor.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
          const [r, g, b] = rgb.map(Number);
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
          
          
          // If luminance is low, it's likely a dark theme
          if (luminance < 100) { // More strict threshold for dark detection
            return 'dark';
          }
          
          // If luminance is high, it's likely a light theme
          if (luminance > 200) {
            return 'light';
          }
        }
      }
    }
    
    // Check body background specifically
    const bodyStyle = window.getComputedStyle(body);
    const bodyBgColor = bodyStyle.backgroundColor;
    if (bodyBgColor) {
      const rgb = bodyBgColor.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        const [r, g, b] = rgb.map(Number);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
        
        if (luminance < 100) {
          return 'dark';
        }
      }
    }
    
    // Method 4: Check CSS custom properties that n8n might use
    const rootStyles = window.getComputedStyle(document.documentElement);
    const possibleThemeVars = [
      '--color-background',
      '--color-foreground', 
      '--background-color',
      '--text-color',
      '--primary-color'
    ];
    
    for (const varName of possibleThemeVars) {
      const value = rootStyles.getPropertyValue(varName).trim();
      if (value) {
        // Check if the background color indicates dark theme
        if (value.includes('rgb') || value.includes('#')) {
          const rgb = value.match(/\d+/g);
          if (rgb && rgb.length >= 3) {
            const [r, g, b] = rgb.map(Number);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
            if (luminance < 128) {
              return 'dark';
            }
          }
        }
        // Check for common dark theme color keywords
        if (value.includes('dark') || value.includes('black') || value.includes('#1') || value.includes('#2')) {
          return 'dark';
        }
      }
    }
    
    // Method 5: Enhanced system preference fallback
    
    // Check multiple system preference indicators
    const systemChecks = {
      mediaQuery: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
      cssColorScheme: (() => {
        const computedStyle = window.getComputedStyle(document.documentElement);
        const colorScheme = computedStyle.getPropertyValue('color-scheme');
        return colorScheme.includes('dark');
      })(),
      browserDefault: (() => {
        // Check if browser chrome itself is dark
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      })()
    };
    
    
    if (systemChecks.mediaQuery || systemChecks.cssColorScheme || systemChecks.browserDefault) {
      return 'dark';
    }
    
    // Final fallback: Check if CSS is using system colors that might indicate dark mode
    const testElement = document.createElement('div');
    testElement.style.cssText = 'position: absolute; visibility: hidden; background: Canvas; color: CanvasText;';
    document.body.appendChild(testElement);
    
    try {
      const style = window.getComputedStyle(testElement);
      const bgColor = style.backgroundColor;
      const textColor = style.color;
      
      
      // Parse and check luminance of system canvas color
      const bgRgb = bgColor.match(/\d+/g);
      if (bgRgb && bgRgb.length >= 3) {
        const [r, g, b] = bgRgb.map(Number);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
        
        if (luminance < 128) {
          document.body.removeChild(testElement);
          return 'dark';
        }
      }
    } catch (error) {
    }
    
    document.body.removeChild(testElement);
    
    return 'light'; // Default fallback
  }

  // Debug function to manually test theme detection
  function debugThemeDetection() {
    
    // System information
    
    // Document info
    
    // CSS info
    const rootStyle = window.getComputedStyle(document.documentElement);
    
    // n8n specific
    const n8nApp = document.querySelector('#app, .n8n-app, [data-theme]');
    if (n8nApp) {
    } else {
    }
    
    // Detection result
    const theme = detectN8nTheme();
    
    if (theme !== currentTheme) {
      applyThemeColors(theme);
    } else {
    }
    
    return theme;
  }
  
  // Expose debug functions globally for easier troubleshooting
  window.debugThemeDetection = debugThemeDetection;
  window.forceThemeDetection = () => {
    const newTheme = detectN8nTheme();
    applyThemeColors(newTheme);
    return newTheme;
  };
  window.getSystemPreferences = () => {
    return {
      prefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
      prefersLight: window.matchMedia('(prefers-color-scheme: light)').matches,
      prefersNoPreference: window.matchMedia('(prefers-color-scheme: no-preference)').matches,
      supportsColorScheme: !!window.matchMedia
    };
  };

  // ===== FIREBASE AUTH DEBUG FUNCTIONS =====
  // Expose Firebase Auth functions globally for debugging
  window.debugFirebaseAuth = () => {
    const status = contentAuthIntegration ? contentAuthIntegration.getAuthStatus() : null;
    console.log('🔍 Firebase Auth Status:', {
      contentAuthIntegration: !!contentAuthIntegration,
      status,
      mode: 'Firebase Auth'
    });
    return status;
  };



  window.testFirebaseAuth = async () => {
    if (!contentAuthIntegration) {
      console.log('❌ contentAuthIntegration non disponible');
      return false;
    }
    
    try {
      console.log('🧪 Test d\'authentification Firebase...');
      const canMakeRequest = await contentAuthIntegration.canMakeRequest();
      console.log('✅ Résultat du test:', canMakeRequest);
      return canMakeRequest;
    } catch (error) {
      console.error('❌ Erreur lors du test:', error);
      return false;
    }
  };

  window.showFirebaseAuthModal = () => {
    if (!contentAuthIntegration) {
      console.log('❌ contentAuthIntegration non disponible');
      return;
    }
    
    // Utiliser les services globaux
    const authUI = window.authUI || window.AuthUI;
    if (authUI && authUI.showAuthModal) {
      authUI.showAuthModal();
      console.log('✅ Modal d\'authentification affichée');
    } else {
      // Fallback: modal simple
      contentAuthIntegration.showSimpleAuthModal();
      console.log('✅ Modal d\'authentification simple affichée');
    }
  };

  // Fonction de test complète Firebase + Backend + Quotas + Pricing
  window.testFirebaseSystem = async () => {
    console.log('🧪 === TEST COMPLET DU SYSTÈME FIREBASE ===');
    
    const results = {
      firebaseSDK: false,
      authentication: false,
      backendConnection: false,
      quotas: false,
      pricing: false
    };
    
    try {
      // Test 1: Firebase Offscreen Document disponible
      console.log('🔥 Test 1: Disponibilité Firebase Offscreen...');
      if (contentAuthIntegration && !contentAuthIntegration.simulationMode) {
        console.log('✅ Firebase Offscreen opérationnel');
        results.firebaseSDK = true;
      } else if (contentAuthIntegration && contentAuthIntegration.simulationMode) {
        console.log('🧪 Firebase en mode simulation');
        results.firebaseSDK = true; // Considéré comme fonctionnel même en simulation
      } else {
        console.log('❌ Firebase Offscreen non disponible');
      }
      
      // Test 2: Authentification
      console.log('🔐 Test 2: Système d\'authentification...');
      if (contentAuthIntegration) {
        const authStatus = contentAuthIntegration.getAuthStatus();
        console.log('📊 Auth Status:', authStatus);
        results.authentication = authStatus.isRequired;
        
        // Test capacité de requête
        const canMakeRequest = await contentAuthIntegration.canMakeRequest();
        console.log('🎯 Can make request:', canMakeRequest);
        results.quotas = canMakeRequest.allowed || canMakeRequest.reason !== 'ERROR';
      }
      
      // Test 3: Connexion backend
      console.log('🌐 Test 3: Connexion backend...');
      try {
        const response = await fetch('https://vibe-n8n-production.up.railway.app/api');
        const data = await response.json();
        console.log('✅ Backend opérationnel:', data.status);
        results.backendConnection = data.status === 'ok';
      } catch (error) {
        console.log('❌ Backend inaccessible:', error.message);
      }
      
      // Test 4: Pricing endpoints
      console.log('💳 Test 4: Endpoints de pricing...');
      try {
        const pricingResponse = await fetch('https://vibe-n8n-production.up.railway.app/api/status');
        if (pricingResponse.ok) {
          console.log('✅ Endpoints pricing disponibles');
          results.pricing = true;
        }
      } catch (error) {
        console.log('❌ Endpoints pricing indisponibles');
      }
      
      // Résumé
      console.log('\n📊 === RÉSUMÉ DES TESTS ===');
      console.log('🔥 Firebase SDK:', results.firebaseSDK ? '✅' : '❌');
      console.log('🔐 Authentication:', results.authentication ? '✅' : '❌');
      console.log('🌐 Backend:', results.backendConnection ? '✅' : '❌');
      console.log('📊 Quotas:', results.quotas ? '✅' : '❌');
      console.log('💳 Pricing:', results.pricing ? '✅' : '❌');
      
      const allWorking = Object.values(results).every(result => result === true);
      console.log('\n🎯 ÉTAT GLOBAL:', allWorking ? '✅ TOUT FONCTIONNE' : '⚠️ PROBLÈMES DÉTECTÉS');
      
      // Message d'aide
      if (!allWorking) {
        console.log('\n🔧 ACTIONS RECOMMANDÉES :');
        if (!results.firebaseSDK) console.log('  - Rechargez la page pour réinjecter Firebase SDK');
        if (!results.backendConnection) console.log('  - Vérifiez que Railway backend est opérationnel');
        if (!results.authentication) console.log('  - Vérifiez les credentials Firebase');
        if (!results.quotas) console.log('  - Vérifiez la base de données Firebase');
        if (!results.pricing) console.log('  - Vérifiez les endpoints Stripe');
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Erreur lors des tests:', error);
      return results;
    }
  };

  // Fonction pour créer un utilisateur de test
  window.createTestUser = async () => {
    console.log('👤 Création d\'un utilisateur de test...');
    
    if (!contentAuthIntegration) {
      console.error('❌ ContentAuthIntegration non disponible');
      return false;
    }
    
    try {
      // Utiliser authService global
      const authService = window.authService || window.AuthService;
      if (!authService) {
        console.error('❌ AuthService non disponible globalement');
        return false;
      }
      
      const testEmail = 'test@vibe-n8n.com';
      const testPassword = 'test123456';
      
      console.log('📝 Tentative de création utilisateur test:', testEmail);
      
      const user = await authService.signUpWithEmail(testEmail, testPassword);
      console.log('✅ Utilisateur test créé:', user.email);
      
      return user;
    } catch (error) {
      console.error('❌ Erreur création utilisateur test:', error);
      return false;
    }
  };
  

  // Apply theme-specific colors
  function applyThemeColors(theme) {
    
    if (theme === 'dark') {
      // Dark theme colors - perfectly harmonized with n8n dark mode
      updateCSSVariable('--ai-bg-primary', '#1a1a1a');    // Darker primary for better contrast
      updateCSSVariable('--ai-bg-secondary', '#212121');  // Slightly lighter secondary
      updateCSSVariable('--ai-bg-tertiary', '#2a2a2a');   // Tertiary for accents
      updateCSSVariable('--ai-text-primary', '#f5f5f5');  // Softer white for less strain
      updateCSSVariable('--ai-text-secondary', '#e0e0e0'); // Secondary text
      updateCSSVariable('--ai-text-muted', '#9e9e9e');    // Muted text
      updateCSSVariable('--ai-border', '#424242');        // Borders
      updateCSSVariable('--ai-border-light', '#303030');  // Light borders
      updateCSSVariable('--ai-accent-blue', '#4a9eff');   // Brighter blue for dark theme
      updateCSSVariable('--ai-accent-blue-hover', '#3d8bdb'); // Hover state
      updateCSSVariable('--ai-text-success', '#4caf50');  // Success green
      updateCSSVariable('--ai-text-warning', '#ff9800');  // Warning orange
      updateCSSVariable('--ai-text-error', '#f44336');    // Error red
      updateCSSVariable('--ai-shadow', '0 4px 12px rgba(0, 0, 0, 0.5)');      // Stronger shadows
      updateCSSVariable('--ai-shadow-strong', '0 8px 24px rgba(0, 0, 0, 0.6)');
      
      // Code syntax highlighting for dark theme - VSCode style
      updateCSSVariable('--ai-code-bg', '#1e1e1e');
      updateCSSVariable('--ai-code-border', '#404040');
      updateCSSVariable('--ai-code-string', '#ce9178');   // Orange-ish for strings
      updateCSSVariable('--ai-code-number', '#b5cea8');   // Light green for numbers
      updateCSSVariable('--ai-code-boolean', '#569cd6');  // Blue for booleans
      updateCSSVariable('--ai-code-null', '#f44747');     // Red for null
      updateCSSVariable('--ai-code-key', '#9cdcfe');      // Light blue for keys
      
    } else {
      // Light theme colors - original colors
      updateCSSVariable('--ai-bg-primary', '#ffffff');
      updateCSSVariable('--ai-bg-secondary', '#f8f9fa');
      updateCSSVariable('--ai-bg-tertiary', '#f1f3f4');
      updateCSSVariable('--ai-text-primary', '#1f2937');
      updateCSSVariable('--ai-text-secondary', '#4b5563');
      updateCSSVariable('--ai-text-muted', '#9ca3af');
      updateCSSVariable('--ai-border', '#e5e7eb');
      updateCSSVariable('--ai-border-light', '#f3f4f6');
      updateCSSVariable('--ai-accent-blue', '#3b82f6');
      updateCSSVariable('--ai-accent-blue-hover', '#2563eb');
      updateCSSVariable('--ai-text-success', '#10b981');
      updateCSSVariable('--ai-text-warning', '#f59e0b');
      updateCSSVariable('--ai-text-error', '#ef4444');
      updateCSSVariable('--ai-shadow', '0 4px 12px rgba(0, 0, 0, 0.1)');
      updateCSSVariable('--ai-shadow-strong', '0 8px 24px rgba(0, 0, 0, 0.15)');
      
      // Code syntax highlighting for light theme
      updateCSSVariable('--ai-code-bg', '#f8f9fa');
      updateCSSVariable('--ai-code-border', '#e5e7eb');
      updateCSSVariable('--ai-code-string', '#006400');   // deep green strings
      updateCSSVariable('--ai-code-number', '#b45200');   // softer brown-orange numbers
      updateCSSVariable('--ai-code-boolean', '#6a1b9a');  // purple booleans
      updateCSSVariable('--ai-code-null', '#b71c1c');     // dark red null
      updateCSSVariable('--ai-code-key', '#0d47a1');      // dark blue keys
    }
    
    currentTheme = theme;
  }

  // Setup theme monitoring
  function setupThemeMonitoring() {
    const applyDetectedTheme = () => {
      const theme = detectN8nTheme();
      if (theme !== currentTheme) {
        applyThemeColors(theme);
      }
    };

    // Initial apply
    applyDetectedTheme();

    // React to system color-scheme changes
    if (window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      // Modern browsers: addEventListener
      if (media.addEventListener) {
        media.addEventListener('change', applyDetectedTheme);
      } else if (media.addListener) { // Safari <=13
        media.addListener(applyDetectedTheme);
      }
    }

    // Observe html / body attribute or class mutations that may signal n8n theme change
    const observer = new MutationObserver(() => {
      // Debounce via animation frame
      if (themeDetectionTimeout) cancelAnimationFrame(themeDetectionTimeout);
      themeDetectionTimeout = requestAnimationFrame(applyDetectedTheme);
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  }

  // Copy JSON to clipboard
  async function copyJsonToClipboard() {
    const codeContent = document.getElementById('ai-code-content');
    const copyButton = document.getElementById('ai-copy-json');
    
    
    if (!codeContent) {
      return;
    }
    
    if (!copyButton) {
      return;
    }
    
    const jsonText = codeContent.textContent || codeContent.innerText;
    
    if (!jsonText || jsonText.trim() === '') {
      return;
    }
    
    try {
      // Try to format JSON properly before copying
      let formattedJson;
      try {
        const parsed = JSON.parse(jsonText);
        formattedJson = JSON.stringify(parsed, null, 2);
      } catch {
        formattedJson = jsonText; // Use as-is if not valid JSON
      }
      
      // Copy to clipboard
      await navigator.clipboard.writeText(formattedJson);
      
      // Visual feedback
      copyButton.classList.add('copying');
      copyButton.title = 'Copied!';
      copyButton.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20,6 9,17 4,12"></polyline>
        </svg>
      `;
      
      
      // Reset after 1.5 seconds
      setTimeout(() => {
        copyButton.classList.remove('copying');
        copyButton.title = 'Copy JSON to clipboard';
        copyButton.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="m5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        `;
      }, 1500);
      
    } catch (error) {
      console.error('❌ Failed to copy JSON:', error);
      
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = jsonText;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        // Visual feedback for fallback
        copyButton.classList.add('copying');
        copyButton.title = 'Copied!';
        copyButton.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20,6 9,17 4,12"></polyline>
          </svg>
        `;
        
        
        setTimeout(() => {
          copyButton.classList.remove('copying');
          copyButton.title = 'Copy JSON to clipboard';
          copyButton.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="m5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          `;
        }, 1500);
        
      } catch (fallbackError) {
        console.error('❌ Fallback copy also failed:', fallbackError);
        addChatMessage('❌ Failed to copy JSON to clipboard', false);
        
        // Show error feedback
        copyButton.title = 'Copy failed!';
        copyButton.style.background = 'var(--ai-text-error)';
        copyButton.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        `;
        
        setTimeout(() => {
          copyButton.title = 'Copy JSON to clipboard';
          copyButton.style.background = '';
          copyButton.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="m5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          `;
        }, 2000);
      }
    }
  }



  // Clear code content
  function clearCode() {
    
    const codeContent = document.getElementById('ai-code-content');
    const copyButton = document.getElementById('ai-copy-json');
    
    // Safety checks before accessing elements
    if (codeContent) {
    codeContent.innerHTML = '';
      codeContent.textContent = '';
    } else {
    }
    
    if (copyButton) {
      copyButton.classList.remove('visible');
      copyButton.style.display = 'none';
      copyButton.style.opacity = '0';
    } else {
    }
    
    jsonBuffer = '';
    updateCodeStatus('ready');
    
  }

  // Insert workflow into n8n
  function insertWorkflow(isReplacement = false) {
    // Check if currently pasting in chat to avoid auto-import
    if (window.aiChatPastingFlag && window.aiChatPastingFlag()) {
      return;
    }
    
    const codeContent = document.getElementById('ai-code-content');
    const workflowJSON = codeContent.textContent;
    
    if (!workflowJSON || workflowJSON.trim() === '') {
      addChatMessage('❌ No workflow to insert', false);
      return;
    }
    
    try {
      // Parse pour valider le JSON avec nettoyage automatique
      const workflowData = parseAndCleanWorkflowJSON(workflowJSON);
      
      if (!workflowData.nodes || !Array.isArray(workflowData.nodes)) {
        throw new Error('Invalid workflow structure');
      }
      
      // Envoyer le message pour l'insertion
      const actionMessage = isReplacement ? 
        `🔄 Inserting & replacing workflow with ${workflowData.nodes.length} nodes...` :
        `📥 Inserting workflow with ${workflowData.nodes.length} nodes...`;
        
      addChatMessage(actionMessage, false);
      
      // Appeler la fonction d'import via le script inject
      importWorkflow(workflowData, isReplacement);
      
    } catch (error) {
      console.error('Error inserting workflow:', error);
      addChatMessage(`❌ Error inserting workflow: ${error.message}`, false);
    }
  }

  // Parse and clean workflow JSON
  function parseAndCleanWorkflowJSON(jsonString) {
    
    try {
      // Première tentative de parsing direct
      return JSON.parse(jsonString);
    } catch (error) {
      
      try {
        // Nettoyer le JSON automatiquement
        let cleanedJSON = jsonString;
        
        // 1. Échapper les guillemets doubles non-échappés dans les chaînes HTML
        cleanedJSON = cleanedJSON.replace(
          /"message":\s*"([^"]*(?:\\.[^"]*)*)"/, 
          (match, content) => {
            // Échapper le contenu HTML correctement
            const escapedContent = content
              .replace(/\\\"/g, '""') // Temporarily replace escaped quotes
              .replace(/"/g, '\\"')   // Escape unescaped quotes
              .replace(/""/g, '\\"'); // Restore escaped quotes
            return `"message": "${escapedContent}"`;
          }
        );
        
        // 2. Nettoyer les caractères de contrôle problématiques
        cleanedJSON = cleanedJSON
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .replace(/\n/g, '\\n')     // Escape newlines
          .replace(/\r/g, '\\r')     // Escape carriage returns
          .replace(/\t/g, '\\t');    // Escape tabs
        
        // 3. Corriger les virgules en trop
        cleanedJSON = cleanedJSON.replace(/,(\s*[}\]])/g, '$1');
        
        const parsed = JSON.parse(cleanedJSON);
        
        // Mettre à jour l'affichage avec le JSON nettoyé
        updateCodeContent(JSON.stringify(parsed, null, 2), true);
        
        return parsed;
        
      } catch (cleanupError) {
        
        // Dernière tentative : nettoyage manuel spécifique pour les emails HTML
        try {
          
          let manualCleanJSON = jsonString;
          
                     // Remplacer spécifiquement le contenu HTML problématique dans le message email
           manualCleanJSON = manualCleanJSON.replace(
             /"message":\s*"[^"]*UTF-8[^"]*"([^}]*)/,
             '"message": "<!DOCTYPE html><html><head><meta charset=\\"UTF-8\\"></head><body><div style=\\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;\\"><div style=\\"background: white; padding: 30px; border-radius: 8px;\\"><h1 style=\\"color: #2563eb;\\">🌤️ Météo Paris</h1><p>Rapport quotidien du {{ new Date().toLocaleDateString(\'fr-FR\') }}</p><h2>📊 Données météorologiques</h2><p>🌡️ Température maximale: {{ $json.daily.temperature_2m_max[0] }}{{ $json.daily_units.temperature_2m_max }}</p><p>🕐 Fuseau horaire: {{ $json.timezone }}</p><p>📅 Date: {{ new Date().toLocaleString(\'fr-FR\') }}</p></div></div></body></html>"'
           );
          
          const manualParsed = JSON.parse(manualCleanJSON);
          
          // Mettre à jour l'affichage
          updateCodeContent(JSON.stringify(manualParsed, null, 2), true);
          
          addChatMessage('🔧 JSON was automatically cleaned and fixed!', false);
          
          return manualParsed;
          
        } catch (manualError) {
          throw new Error(`JSON parsing failed: ${error.message}. Try copying the workflow again or simplify the HTML content.`);
        }
      }
    }
  }

  // Add message to chat (Cursor AI / ChatGPT style)
  function addChatMessage(content, isUser = false, isLoading = false) {
    const chatMessages = document.getElementById('ai-chat-messages');
    
    // Clear welcome message on first real message
    if (chatMessages.children.length === 1 && chatMessages.children[0].style.textAlign === 'center') {
      chatMessages.innerHTML = '';
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${isUser ? 'ai-message-user' : 'ai-message-assistant'}`;
    
    if (isUser) {
      // User message: bubble style (like before)
    const bubbleDiv = document.createElement('div');
      bubbleDiv.className = 'ai-message-bubble ai-message-bubble-user';
      bubbleDiv.textContent = content;
      messageDiv.appendChild(bubbleDiv);
    } else {
      // Assistant message: direct text with prefix (like Cursor AI)
      const contentDiv = document.createElement('div');
      contentDiv.className = 'ai-message-bubble ai-message-bubble-assistant';
      
      // Add AI icon prefix (Cursor AI style)
      const prefixSpan = document.createElement('span');
      prefixSpan.style.cssText = `
        color: var(--ai-text-muted);
        font-weight: 600;
        margin-right: 12px;
        font-size: 14px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        opacity: 0.8;
      `;
      prefixSpan.innerHTML = '<span style="font-size: 12px;">🤖</span><span>AI</span>';
      
            const contentSpan = document.createElement('div');
      contentSpan.style.cssText = `
        color: var(--ai-text-primary);
        line-height: 1.6;
        white-space: pre-wrap;
        word-wrap: break-word;
      `;
      
      if (isLoading) {
        contentSpan.innerHTML = content + ' <span class="ai-typing-dots"></span>';
      } else {
        // Better formatting for AI responses
        const formattedContent = content
          .replace(/\n/g, '<br>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code style="background: var(--ai-bg-tertiary); padding: 2px 4px; border-radius: 3px; font-family: var(--ai-font-mono); font-size: 13px;">$1</code>');
        
        contentSpan.innerHTML = formattedContent;
      }
      
      contentDiv.appendChild(prefixSpan);
      contentDiv.appendChild(contentSpan);
      messageDiv.appendChild(contentDiv);
    }
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv.querySelector('.ai-message-bubble');
  }

    // Update message content (compatible with new structure)
  function updateChatMessage(messageElement, content, isLoading = false) {
    // Check if it's an assistant message with prefix structure
    const contentDiv = messageElement.querySelector('div[style*="color: var(--ai-text-primary)"]');
    if (contentDiv) {
      // Assistant message with prefix structure
      if (isLoading) {
        contentDiv.innerHTML = content + ' <span class="ai-typing-dots"></span>';
      } else {
        // Better formatting for AI responses
        const formattedContent = content
          .replace(/\n/g, '<br>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code style="background: var(--ai-bg-tertiary); padding: 2px 4px; border-radius: 3px; font-family: var(--ai-font-mono); font-size: 13px;">$1</code>');
        
        contentDiv.innerHTML = formattedContent;
      }
    } else {
      // User message (bubble structure)
      if (isLoading) {
        messageElement.innerHTML = content + ' <span class="ai-typing-dots"></span>';
      } else {
        messageElement.textContent = content;
      }
    }
  }

  // Update status (simplified - no more workflow.json status indicator)
  function updateCodeStatus(status) {
    const aiStatus = document.getElementById('ai-status');
    
    switch (status) {
      case 'generating':
        aiStatus.textContent = 'generating';
        aiStatus.className = 'ai-pulse';
        break;
      case 'streaming':
        aiStatus.textContent = 'streaming';
        aiStatus.className = 'ai-pulse';
        break;
      case 'complete':
        aiStatus.textContent = 'ready';
        aiStatus.className = '';
        break;
      case 'error':
        aiStatus.textContent = 'error';
        aiStatus.className = '';
        break;
      case 'ready':
      default:
        aiStatus.textContent = 'ready';
        aiStatus.className = '';
        break;
    }
  }

  // Highlight JSON
  function highlightJSON(json) {
    if (typeof json !== 'string') {
      json = JSON.stringify(json, null, 2);
    }
    
    return json
      .replace(/("[\w\s]+")(\s*:)/g, '<span class="json-key">$1</span>$2')
      .replace(/:\s*(".*?")/g, ': <span class="json-string">$1</span>')
      .replace(/:\s*(\d+)/g, ': <span class="json-number">$1</span>')
      .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
      .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');
  }

  // Update code content
  function updateCodeContent(content, isComplete = false) {
    const codeContent = document.getElementById('ai-code-content');
    const copyButton = document.getElementById('ai-copy-json');
    
    
    // Safety checks
    if (!codeContent) {
      return;
    }
    
    codeContent.className = 'ai-scrollbar ai-json-highlight';
    
    // Clean content properly
    const cleanContent = content ? content.trim() : '';
    
    // Update content directly (no need to preserve button since it's separate now)
    if (isComplete && cleanContent) {
      try {
        const parsed = JSON.parse(cleanContent);
        const formatted = JSON.stringify(parsed, null, 2);
        codeContent.innerHTML = highlightJSON(formatted);
      } catch (e) {
        codeContent.innerHTML = highlightJSON(cleanContent);
      }
    } else if (cleanContent) {
      codeContent.innerHTML = highlightJSON(cleanContent);
    } else {
      codeContent.innerHTML = '';
    }
    
    // Show/hide copy button - better content detection
    const hasVisibleContent = cleanContent && cleanContent.length > 0 && 
                             cleanContent !== '{}' && cleanContent !== '[]';
    
    
    // Update copy button visibility (button stays in DOM, just show/hide)
    if (copyButton) {
      if (hasVisibleContent) {
        copyButton.classList.add('visible');
        copyButton.style.display = 'flex';
        copyButton.style.opacity = '1';
        
        // Force visibility check
        setTimeout(() => {
          const computedStyle = window.getComputedStyle(copyButton);
        }, 100);
        
      } else {
        copyButton.classList.remove('visible');
        copyButton.style.display = 'none';
        copyButton.style.opacity = '0';
      }
    } else {
    }
    
    // Auto-scroll to bottom
    codeContent.scrollTop = codeContent.scrollHeight;
    
    // Auto-expand code panel when JSON arrives
    if (hasVisibleContent && !isCodePanelExpanded) {
      toggleCodePanel();
    }
  }

  // Get current workflow from n8n editor
  function getCurrentWorkflow() {
    return new Promise((resolve) => {
      // Send message to inject script to get current workflow
      window.postMessage({ type: 'GET_CURRENT_WORKFLOW' }, '*');
      
      // Listen for response
      const listener = (event) => {
        if (event.source !== window) return;
        if (event.data.type === 'CURRENT_WORKFLOW_RESPONSE') {
          window.removeEventListener('message', listener);
          resolve(event.data.workflow);
        }
      };
      
      window.addEventListener('message', listener);
      
      // Timeout after 3 seconds
      setTimeout(() => {
        window.removeEventListener('message', listener);
        resolve(null);
      }, 3000);
    });
  }

  // Ping service worker pour vérifier qu'il est actif
  async function pingServiceWorker() {

    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ type: 'PING_SERVICE_WORKER' }, (response) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }

          if (response && response.pong) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
      } catch (err) {
        console.error('❌ Service worker ping threw:', err);
        reject(err);
      }
    });
  }

  // Vérifier l'état du service worker et mettre à jour l'interface
  async function checkServiceWorkerStatus() {
    const statusEl = document.getElementById('ai-status');
    if (!statusEl) return;
    
    try {
      statusEl.textContent = 'checking...';
      statusEl.style.color = 'var(--ai-text-warning)';
      
      const isActive = await pingServiceWorker();
      
      if (isActive) {
        statusEl.textContent = 'ready';
        statusEl.style.color = 'var(--ai-text-success)';
      } else {
        statusEl.textContent = 'service issue';
        statusEl.style.color = 'var(--ai-text-error)';
      }
    } catch (error) {
      statusEl.textContent = 'service sleeping';
      statusEl.style.color = 'var(--ai-text-error)';
      statusEl.title = 'Click the extension icon to wake up the service worker';
    }
  }

  // Reset UI state
  function resetUIState() {
    isGenerating = false;
    
    const sendButton = document.getElementById('ai-send');
    const sendIcon = document.getElementById('ai-send-icon');
    const input = document.getElementById('ai-input');
    
    if (sendButton) {
      sendButton.disabled = false;
      sendButton.classList.remove('loading');
      sendButton.style.opacity = '1';
    }
    if (sendIcon) sendIcon.textContent = '↑';
    if (input) input.disabled = false;
    
    updateCodeStatus('ready');
  }

  // Send message
  async function sendMessage() {
    const input = document.getElementById('ai-input');
    const message = input.value.trim();
    
    
    if (!message) {
      return;
    }
    
    if (isGenerating) {
      return;
    }

    
    isGenerating = true;
    jsonBuffer = '';
    
    // Clear previous workflow JSON to avoid conflicts
    clearCode();
    
    // Add user message to chat
    addChatMessage(message, true);
    
    // Add assistant loading message
    const assistantMessage = addChatMessage('Analyzing your request...', false, true);

    // Check if this is an improvement request (workflow exists in editor)
    const currentWorkflow = await getCurrentWorkflow();
    const hasExistingWorkflow = currentWorkflow && currentWorkflow.nodes && currentWorkflow.nodes.length > 0;
    
    // 📊 DETAILED LOGGING - Current workflow analysis
    if (currentWorkflow) {
      
      if (currentWorkflow.nodes) {
        currentWorkflow.nodes.forEach((node, i) => {
        });
      }
      
      // Calcul taille payload
      const workflowSize = JSON.stringify(currentWorkflow).length;
    } else {
    }
    
    if (hasExistingWorkflow) {
      updateChatMessage(assistantMessage, `🔄 Analyzing existing workflow (${currentWorkflow.nodes.length} nodes) for improvements...`, true);
    } else {
      updateChatMessage(assistantMessage, '🆕 Creating new workflow from scratch...', true);
    }
    
    // Update UI
    const sendButton = document.getElementById('ai-send');
    const sendIcon = document.getElementById('ai-send-icon');
    
    sendButton.disabled = true;
    sendButton.classList.add('loading');
    sendButton.style.opacity = '0.7';
    sendIcon.textContent = '⟲';
    
    input.value = '';
    input.style.height = '72px'; // Reset height
    input.disabled = true;
    
    updateCodeStatus('generating');

    try {
      // 🔧 DIAGNOSTIC SERVICE WORKER
      
      // Ping service worker pour vérifier qu'il est actif
      await pingServiceWorker();
      
      // ===== FIREBASE AUTH =====
      if (!contentAuthIntegration) {
        console.error('💀 ERREUR CRITIQUE: contentAuthIntegration non disponible');
        handleError('Système d\'authentification non disponible. Veuillez recharger la page.', assistantMessage);
        return;
      }

      console.log('🔐 Traitement avec Firebase Auth...');
      
      try {
        // Vérifier auth + quotas avant envoi
        const response = await contentAuthIntegration.makeWorkflowRequest(
          message, 
          hasExistingWorkflow ? currentWorkflow : null
        );
        
        if (!response) {
          // Auth failed ou quota exceeded - popups gérés automatiquement
          console.warn('❌ Firebase Auth request failed');
          handleError('Authentification ou quota requis. Veuillez vous connecter.', assistantMessage);
          return;
        }
        
        console.log('✅ Firebase Auth request successful, handling streaming response...');
        
        // La réponse sera gérée via les handlers de messages existants
        return;
        
      } catch (authError) {
        console.error('❌ Firebase Auth error:', authError);
        handleError('Erreur d\'authentification. Veuillez vous reconnecter.', assistantMessage);
        return;
      }
    } catch (err) {
      console.error('❌ Send message error:', err);
      handleError('Error sending message: ' + err.message, assistantMessage);
    }
  }

  // Handle errors
  function handleError(error, messageElement = null) {
    resetUIState();
    updateCodeStatus('error');
    
    if (messageElement) {
      updateChatMessage(messageElement, `❌ Error: ${error}`, false);
    } else {
      addChatMessage(`❌ Error: ${error}`, false);
    }
  }

  // Handle background messages
  function handleBackgroundMessage(message) {
    
    const lastMessage = document.querySelector('.ai-message-assistant:last-child .ai-message-bubble');

    switch (message.type) {
      case 'WORKFLOW_GENERATION_START':
        if (lastMessage) {
          updateChatMessage(lastMessage, message.message, true);
        }
        updateCodeStatus('generating');
        break;

      case 'WORKFLOW_SETUP':
        if (lastMessage) {
          updateChatMessage(lastMessage, message.message, true);
        }
        break;

      case 'WORKFLOW_SEARCH':
        if (lastMessage) {
          updateChatMessage(lastMessage, message.message, true);
        }
        break;

      case 'WORKFLOW_BUILDING':
        if (lastMessage) {
          updateChatMessage(lastMessage, message.message, true);
        }
        updateCodeStatus('streaming');
        break;

      case 'WORKFLOW_PROGRESS':
      case 'context_building':
      case 'claude_call':
      case 'parsing':
      case 'compression':
        let progressMsg = message.message;
        if (message.workflows && message.workflows.length > 0) {
          progressMsg += `\n\nFound similar workflows: ${message.workflows.join(', ')}`;
        }
        if (lastMessage) {
          updateChatMessage(lastMessage, progressMsg, true);
        }
        break;

      case 'WORKFLOW_COMPLETE':
        if (message.workflow) {
          
          // Reset UI state
          resetUIState();
          
          // Update chat message
          let finalMessage = '✅ Workflow generated successfully!';
          if (message.explanation) {
            const { summary, flow, nodes: nodeDesc, notes } = message.explanation;
            if (summary) {
              finalMessage += `\n\n📋 ${summary}`;
            }
            if (flow) {
              finalMessage += `\n\n🔄 Flow:\n${flow}`;
            }
            if (notes) {
              finalMessage += `\n\n📝 Notes:\n${notes}`;
            }
          }
          finalMessage += '\n\n🔄 Importing to n8n editor...';
          
          if (lastMessage) {
            updateChatMessage(lastMessage, finalMessage, false);
          }
          
          // Show JSON in code panel
          const workflowJson = JSON.stringify(message.workflow, null, 2);
          updateCodeContent(workflowJson, true);
          
          // Auto-import seulement si activé
          if (autoImportEnabled) {
            // Auto-import with REPLACE mode (always replace existing workflow)
            const importDelay = 1000;
          
          setTimeout(() => {
              if (lastMessage) {
                updateChatMessage(lastMessage, finalMessage.replace('🔄 Importing to n8n editor...', '🗑️ Auto-replacing workflow in editor...'), false);
            }
            
              // Auto-import always does Insert & Replace (isImprovement = true)
              importWorkflow(message.workflow, true);
            
            setTimeout(() => {
              if (lastMessage) {
                  const successMessage = '';
                  updateChatMessage(lastMessage, finalMessage.replace('🔄 Importing to n8n editor...', successMessage).replace('🗑️ Auto-replacing workflow in editor...', successMessage), false);
              }
            }, 500);
          }, importDelay);
          } else {
            // Auto-import désactivé - juste afficher le message sans import
            if (lastMessage) {
              const manualMessage = finalMessage.replace('🔄 Importing to n8n editor...', '📄 Workflow ready! Use buttons above to import manually.');
              updateChatMessage(lastMessage, manualMessage, false);
            }
          }
        }
        break;

      case 'WORKFLOW_ERROR':
        handleError(message.error, lastMessage);
        break;

      case 'WORKFLOW_IMPORT_SUCCESS':
        // Message already updated in WORKFLOW_COMPLETE
        break;

      case 'WORKFLOW_IMPORT_ERROR':
        if (lastMessage) {
          const currentText = lastMessage.textContent;
          updateChatMessage(lastMessage, currentText + `\n\n❌ Import error: ${message.error}`, false);
        }
        break;

      case 'DECOMPRESS_WORKFLOW':
        handleDecompressionFallback(message.compressedData, message.originalSize, lastMessage);
        break;

      case 'CLAUDE_ERROR':
        handleError(message.error, lastMessage);
        break;
        
      default:
        // Handle any unrecognized progress messages
        if (message.message && lastMessage) {
          updateChatMessage(lastMessage, message.message, true);
        } else {
        }
    }
  }

  // Import workflow
  function importWorkflow(workflowData, isImprovement = false) {
    
    window.postMessage({ 
      type: 'IMPORT_WORKFLOW',
      workflow: workflowData,
      isImprovement: isImprovement
    }, '*');
  }

  // Wait for n8n to be ready before opening interface
  function waitForN8nReady() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds maximum wait
      
      const checkReady = () => {
        attempts++;
        
        // Check for various indicators that n8n is ready
        const indicators = [
          document.querySelector('#app'),                    // Basic app loaded
          document.querySelector('[data-test-id="canvas"]'), // Canvas ready
          document.querySelector('.nodeview'),               // Node view ready
          document.querySelector('.workflow-canvas'),        // Canvas loaded
          window.__pinia || window.$pinia                   // Pinia store ready
        ];
        
        const readyIndicators = indicators.filter(Boolean);
        
        // If we have at least 2 indicators or the main app + store, consider it ready
        if (readyIndicators.length >= 2 || (indicators[0] && indicators[4])) {
          resolve();
          return;
        }
        
        if (attempts >= maxAttempts) {
          reject(new Error('Timeout waiting for n8n'));
          return;
        }
        
        // Try again in 1 second
        setTimeout(checkReady, 1000);
      };
      
      // Start checking immediately
      checkReady();
    });
  }

  // Handle decompression fallback
  async function handleDecompressionFallback(compressedBase64, originalSize, messageElement) {
    try {
      if (messageElement) {
        updateChatMessage(messageElement, 'Decompressing large workflow...', true);
      }
      
      const compressedBytes = Uint8Array.from(atob(compressedBase64), c => c.charCodeAt(0));
      
      if (typeof window.DecompressionStream !== 'undefined') {
        const stream = new window.DecompressionStream('gzip');
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
        
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        
        const decompressed = new TextDecoder().decode(result);
        const workflowData = JSON.parse(decompressed);
        
        // Update code panel
        updateCodeContent(decompressed, true);
        
        // === NEW: Reset UI state and update status after successful decompression ===
        resetUIState();
        updateCodeStatus('complete');
        // === END NEW ===
        
        if (messageElement) {
          updateChatMessage(messageElement, '✅ Large workflow decompressed and ready for import!', false);
        }
        
        setTimeout(() => {
          const userMessages = document.querySelectorAll('.ai-message-user');
          const isImprovement = userMessages.length > 1;
          importWorkflow(workflowData.workflow, isImprovement);
        }, 1000);
        
      } else {
        throw new Error('DecompressionStream not available');
      }
      
    } catch (error) {
      console.error('❌ Decompression error:', error);
      handleError(`Decompression failed: ${error.message}`, messageElement);
    }
  }

  // Initialize
  async function init() {
    
    try {
      // ===== INITIALISATION FIREBASE AUTH =====
      console.log('🚀 Initialisation de l\'extension n8n AI Assistant...');
      
      // Initialiser Firebase Auth en arrière-plan (non-bloquant)
      initializeFirebaseAuth().then(success => {
        if (success) {
          console.log('✅ Firebase Auth prêt');
          
          // Mettre à jour le statut dans l'interface si elle existe
          const statusEl = document.getElementById('ai-status');
          if (statusEl) {
            statusEl.textContent = 'firebase';
            statusEl.className = 'auth-ready';
            statusEl.title = 'Firebase authentication active - quotas and pricing enabled';
          }
        } else {
          console.log('🔄 Mode legacy activé');
          
          // Mettre à jour le statut pour indiquer le mode legacy
          const statusEl = document.getElementById('ai-status');
          if (statusEl) {
            statusEl.textContent = 'legacy';
            statusEl.className = 'legacy-mode';
            statusEl.title = 'Legacy mode active - unlimited access with API key';
          }
        }
      }).catch(error => {
        console.error('💀 ERREUR CRITIQUE: Firebase Auth initialisation failed:', error);
        
        // Mettre à jour le statut pour indiquer l'erreur critique
        const statusEl = document.getElementById('ai-status');
        if (statusEl) {
          statusEl.textContent = 'auth failed';
          statusEl.className = 'auth-error';
          statusEl.title = 'ERREUR CRITIQUE: Système d\'authentification requis non disponible';
        }
      });
      
      // ===== INITIALISATION INTERFACE =====
      injectStyles();
      const container = createInterface();
      const button = createFloatingButton();
      
      // ===== DIAGNOSTIC DE DÉMARRAGE =====
      setTimeout(() => {
        console.log('📊 === DIAGNOSTIC n8n AI Assistant ===');
        console.log('🔧 Extension Version: 2.0.0 avec Firebase Auth');
        console.log('🌐 Page:', window.location.href);
        console.log('🔐 Mode Auth: Firebase Auth');
        console.log('📦 ContentAuthIntegration:', !!contentAuthIntegration);
        console.log('🔥 Firebase SDK (Offscreen):', !!(contentAuthIntegration && !contentAuthIntegration.simulationMode));
        console.log('🎯 Status Element:', !!document.getElementById('ai-status'));
        console.log('💻 User Agent:', navigator.userAgent.substring(0, 50) + '...');
        console.log('⚡ Chrome Extension API:', typeof chrome !== 'undefined');
        console.log('');
        console.log('🧪 === FONCTIONS DE TEST DISPONIBLES ===');
        console.log('   testFirebaseSystem()     - 🔥 TEST COMPLET (recommandé)');
        console.log('   debugFirebaseAuth()      - État actuel auth');
                  console.log('   🔐 Firebase Auth - Architecture Offscreen Document');
        console.log('   testFirebaseAuth()       - Tester authentification');
        console.log('   showFirebaseAuthModal()  - Afficher modal de connexion');
        console.log('   createTestUser()         - Créer utilisateur de test');
        console.log('');
        console.log('💡 POUR COMMENCER: Tapez testFirebaseSystem() pour vérifier tout le système');
        console.log('=====================================');
        
        // ===== EXPOSITION DES FONCTIONS DE TEST =====
        exposeTestFunctions();
      }, 2000);
      
      // Listen for window resize
      window.addEventListener('resize', handleWindowResize);
      
      // Setup DOM observer for layout maintenance
      const domObserver = setupDOMObserver();
      
      // Setup theme monitoring for automatic dark/light theme adaptation
      setupThemeMonitoring();
      
      // Listen for background messages
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          handleBackgroundMessage(message);
          sendResponse({ received: true });
        });
      }
      
      // Cleanup on page unload
      window.addEventListener('beforeunload', () => {
        if (n8nLayoutModified) {
          removeN8nLayoutModifications();
        }
      });
      
      
      // Listen for inject script messages
      window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        
        if (event.data.type === 'IMPORT_SUCCESS') {
          // Success message already handled in workflow completion
        } else if (event.data.type === 'IMPORT_ERROR') {
          // Error message already handled in workflow error
        }
      });
      
      // Auto-open AI assistant by default after n8n is ready
      // Special handling for saved custom domains
      const hostname = window.location.hostname;
      const isSavedCustomDomain = window.n8nAIManualActivation && !hostname.includes('n8n.io') && !hostname.includes('n8n.cloud');
      
      if (isSavedCustomDomain) {
        // For saved custom domains, open immediately after a short delay
        setTimeout(() => {
          toggleInterface();
        }, 1500);
      } else {
        // For official domains, wait for n8n readiness
        waitForN8nReady().then(() => {
          toggleInterface();
        }).catch(() => {
          // Fallback: open after delay even if we can't detect n8n readiness
          setTimeout(() => {
            toggleInterface();
          }, 3000);
        });
      }
      
    } catch (error) {
      console.error('❌ Init error:', error);
    }
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Force init fallback
  setTimeout(() => {
    if (!document.getElementById('n8n-ai-toggle')) {
      init();
    }
  }, 1000);

  // Listen for click on n8n "+" (add node) button to auto-close assistant
  document.addEventListener('click', (e) => {
    const plusBtn = e.target.closest('button._nodeCreatorPlus_ebnw3_154');
    if (plusBtn && isOpen) {
      toggleInterface();
    }
  });

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onConnect) {
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === 'rag-stream') {
        // Respond to keep the port open; do nothing else for now
        port.onDisconnect.addListener(() => {
        });
      }
    });
  }
})(); // End of initializeExtension function 