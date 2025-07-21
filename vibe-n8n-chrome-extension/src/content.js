/**
 * Content Script for n8n AI Assistant
 * Modern code editor-inspired interface for workflow RAG system
 */

// Initial load check
console.log('%c🚀 n8n AI Assistant (Workflow RAG): SCRIPT LOADED !', 'background: green; color: white; font-size: 16px; padding: 5px;');

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

console.log('📍 Current URL:', window.location.href);

// Prevent double execution
if (window.n8nAIAssistantLoaded) {
  console.log('🔄 n8n AI Assistant already loaded, skipping...');
  throw new Error('Already loaded');
}
window.n8nAIAssistantLoaded = true;

// Check if we're on potential n8n page
function detectN8nPage() {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  // Method 1: Domain contains 'n8n'
  if (hostname.includes('n8n')) {
    console.log('✅ n8n detected via domain:', hostname);
    return true;
  }
  
  // Method 2: URL patterns suggest n8n
  const n8nPatterns = ['/workflow/', '/execution/', '/editor/', '/credentials/', '/settings/'];
  if (n8nPatterns.some(pattern => pathname.includes(pattern))) {
    console.log('✅ n8n detected via URL pattern:', pathname);
    return true;
  }
  
  // Method 3: Manual injection (when user clicked "Activate on this page")
  if (window.n8nAIManualActivation) {
    console.log('✅ n8n detected via manual activation');
    return true;
  }
  
  // Method 4: Auto injection (when domain was previously saved)
  if (window.n8nAIAutoActivation) {
    console.log('✅ n8n detected via auto activation for saved domain:', hostname);
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
      console.log('✅ n8n detected via saved custom domain:', currentHostname);
      window.n8nAIAutoActivation = true;
      window.n8nAIManualActivation = true;
      
      // Trigger initialization if not already loaded
      if (!window.__n8nAiAssistantLoaded) {
        console.log('🚀 Triggering initialization for saved domain');
        setTimeout(() => {
          init().catch(error => {
            console.error('❌ Failed to initialize after domain detection:', error);
          });
        }, 500);
      }
      
      return true;
    }
  } catch (error) {
    console.log('⚠️ Could not check saved domains:', error.message);
  }
  return false;
}

// Main initialization function
(async function initializeExtension() {
  console.log('🚀 Starting extension initialization...');
  
  // FIRST: Check for saved custom domains and auto-activate if needed
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const hostname = window.location.hostname;
      console.log('🔍 Checking if domain is in saved custom domains:', hostname);
      
      const { customDomains = [] } = await chrome.storage.sync.get(['customDomains']);
      console.log('📋 Saved custom domains:', customDomains);
      
      if (customDomains.includes(hostname)) {
        console.log('✅ Domain found in saved list! Auto-activating:', hostname);
        window.n8nAIManualActivation = true;
        window.n8nAIAutoActivation = true;
      } else {
        console.log('❌ Domain not in saved list:', hostname);
      }
    } else {
      console.log('⚠️ Chrome storage not available');
    }
  } catch (error) {
    console.log('❌ Error checking storage for auto-activation:', error.message);
  }

  // THEN: Detect if this is an n8n page (now with potential auto-activation flag set)
  const isN8nPage = detectN8nPage();

  console.log('🔍 Final page analysis:', {
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    manualActivation: !!window.n8nAIManualActivation,
    isN8nPage: isN8nPage
  });

  if (!isN8nPage) {
    console.log('❌ Not detected as n8n page, stopping initialization');
    return;
  }

  // Continue with n8n AI Assistant initialization
  console.log('✅ n8n page confirmed! Initializing AI Assistant...');

  if (window.__n8nAiAssistantLoaded) {
    console.log('⚠️ Extension already loaded in this context');
    return;
  }
  console.log('✅ On n8n workflow page, continuing...');
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
  const MIN_PANEL_WIDTH = 280;  // Minimum usable width
  const MAX_PANEL_WIDTH = 800;  // Maximum width
  
  // Calculate optimal panel width based on screen size
  function getOptimalPanelWidth() {
    // Check if user has a saved preference
    const savedWidth = localStorage.getItem('n8n-ai-panel-width');
    if (savedWidth) {
      const width = parseInt(savedWidth);
      if (width >= MIN_PANEL_WIDTH && width <= MAX_PANEL_WIDTH) {
        console.log('📏 Using saved panel width:', width + 'px');
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
    
    console.log('📏 Panel width updated to:', clampedWidth + 'px');
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
    console.log('🔍 Detecting n8n layout elements (SAFE mode)...');
    
    // Log current page info
    console.log('📍 Current URL:', window.location.href);
    console.log('📏 Window size:', window.innerWidth, 'x', window.innerHeight);
    
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
    console.log('🔍 Scanning for safe n8n container elements:');
    n8nSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`  Found ${elements.length} elements for "${selector}"`);
        elements.forEach((el, i) => {
          const rect = el.getBoundingClientRect();
          console.log(`    ${i + 1}. Size: ${rect.width}x${rect.height}, Position: ${window.getComputedStyle(el).position}`);
        });
      }
    });
    
    // Check protected elements to avoid
    console.log('🛡️ Checking protected editor elements:');
    protectedSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`  Protected: ${elements.length} elements for "${selector}"`);
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
            console.log(`🛡️ Skipping ${selector} - contains protected element: ${protectedSelector}`);
            hasProtectedElements = true;
            break;
          }
        }
        
        if (hasProtectedElements) {
          // Instead of modifying this element, look for its parent
          const parent = element.parentElement;
          if (parent && parent !== document.body && parent !== document.documentElement) {
            console.log(`🔍 Trying parent element instead...`);
            const parentRect = parent.getBoundingClientRect();
            if (parentRect.width > window.innerWidth * 0.8) {
              console.log(`🎯 Using parent element for layout modification`);
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
          console.log(`🔧 Safe to modify element: ${selector}`, {
            width: rect.width,
            height: rect.height,
            position: computedStyle.position,
            display: computedStyle.display,
            id: element.id,
            classes: Array.from(element.classList).join(' '),
            isTopLevel: isTopLevel
          });
          
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
          console.log(`⏭️ Skipping element: ${selector} (width: ${rect.width}, height: ${rect.height}, position: ${computedStyle.position})`);
        }
      }
      
      // If we found a suitable element, stop searching
      if (modifiedElements.length > 0) break;
    }
    
    console.log(`✅ Found ${modifiedElements.length} safe elements to modify`);
    
    // Enhanced fallback: Only if absolutely necessary
    if (modifiedElements.length === 0) {
      console.log('🔍 No safe elements found, trying ultra-conservative fallback...');
      
      // Try to modify only body or html
      const bodyRect = document.body.getBoundingClientRect();
      if (bodyRect.width > window.innerWidth * 0.9) {
        console.log('🎯 Using document.body as fallback');
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
        console.warn('⚠️ Editor canvas too small after layout modification:', {
          width: rect.width,
          height: rect.height,
          minRequired: { width: minWidth, height: minHeight }
        });
        return false;
      }
      
      console.log('✅ Editor canvas size OK:', { width: rect.width, height: rect.height });
      return true;
    }
    
    // No canvas found - might be loading
    console.log('🔍 No editor canvas found yet');
    return true; // Don't fail if we can't find the canvas yet
  }

  // Apply layout modifications to make space for AI panel
  function applyN8nLayoutModifications() {
    if (n8nLayoutModified) return;
    
    console.log('🎨 Applying n8n layout modifications...');
    console.log('📏 Panel width:', currentPanelWidth, 'px');
    console.log('📏 Screen width:', window.innerWidth, 'px');
    
    const modifiedElements = detectAndModifyN8nLayout();
    
    if (modifiedElements.length === 0) {
      console.warn('⚠️ No elements found to modify - layout integration may not work properly');
      // Still mark as modified to avoid infinite retry
      n8nLayoutModified = true;
      return;
    }
    
    // Apply width modifications
    modifiedElements.forEach(({ element, selector }) => {
      element.classList.add('n8n-layout-with-ai');
      console.log(`✅ Applied layout class to: ${selector}`);
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
      console.log('📐 Applying body margin for smaller screen or fallback');
      body.style.marginRight = currentPanelWidth + 'px';
    }
    
    n8nLayoutModified = true;
    
    // Verify editor functionality after a short delay
    setTimeout(() => {
      const isEditorOK = checkEditorFunctionality();
      if (!isEditorOK) {
        console.warn('⚠️ Editor functionality compromised - consider reducing panel width');
      }
    }, 500);
    
    console.log('✅ N8n layout modifications applied successfully');
  }

  // Remove layout modifications
  function removeN8nLayoutModifications() {
    if (!n8nLayoutModified) return;
    
    console.log('🔄 Removing n8n layout modifications...');
    
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
    console.log('✅ N8n layout modifications removed');
  }

  // Create the main interface
  function createInterface() {
    console.log('🎨 Creating integrated interface');
    
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
      console.log('🔧 Initializing UI state after DOM ready...');
      clearCode();
      resetUIState();
      console.log('✅ Interface ready, UI state reset');
      
      // 🔧 Test initial du service worker
      checkServiceWorkerStatus();
    }, 250);
    
    return container;
  }

  // Handle window resize
  function handleWindowResize() {
    if (isOpen && n8nLayoutModified) {
      console.log('📏 Window resized - updating layout');
      
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
        console.log('🔄 DOM changes detected - reapplying layout');
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
    
    console.log('👁️ DOM observer setup for layout maintenance');
    return observer;
  }

  // Create floating button
  function createFloatingButton() {
    console.log('🔵 Creating floating button');
    
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
    console.log('🔵 Floating button created - visibility managed by toggle function');
    
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
    console.log('🎧 Setting up event listeners...');
    
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
          console.log('🔴 Node opened (URL changed) - closing AI assistant:', nodeIdMatch[1]);
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
      console.log('✅ Close button listener set');
    } else {
      console.log('⚠️ Close button not found');
    }
    
    // Status indicator (clickable diagnostic)
    const statusIndicator = document.getElementById('ai-status');
    if (statusIndicator) {
      statusIndicator.onclick = (e) => {
        e.stopPropagation();
        console.log('🔧 Manual service worker check triggered');
        checkServiceWorkerStatus();
      };
      console.log('✅ Status indicator listener set');
    }
    
    // Send button and input
    if (sendButton && inputField) {
      sendButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔴 Send button clicked!');
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
        console.log('📋 Paste in chat detected - marking to prevent n8n auto-import');
        
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
          console.log('⌨️ Ctrl+Enter in chat - sending message');
          sendMessage();
        }
      });
      
      console.log('✅ Send button and input listeners set');
    } else {
      console.log('⚠️ Send button or input field not found');
    }
    

    
    // Code panel toggle
    if (codeToggle) {
      codeToggle.onclick = toggleCodePanel;
      console.log('✅ Code panel toggle listener set');
    } else {
      console.log('⚠️ Code toggle not found');
    }
    
    // Insert code button
    if (insertButton) {
      insertButton.onclick = (e) => {
      e.stopPropagation();
        insertWorkflow(false); // Insert without replacing
      };
      console.log('✅ Insert button listener set');
    } else {
      console.log('⚠️ Insert button not found');
    }
    
    // Insert & Replace code button
    if (insertReplaceButton) {
      insertReplaceButton.onclick = (e) => {
        e.stopPropagation();
        insertWorkflow(true); // Insert with replacement
      };
      console.log('✅ Insert & Replace button listener set');
    } else {
      console.log('⚠️ Insert & Replace button not found');
    }
    
    // Auto-import checkbox
    if (autoImportCheckbox) {
      autoImportCheckbox.onchange = (e) => {
        e.stopPropagation();
        autoImportEnabled = e.target.checked;
        console.log(autoImportEnabled ? '✅ Auto-import enabled' : '❌ Auto-import disabled');
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
      
      console.log('✅ Auto-import checkbox listeners set');
    } else {
      console.log('⚠️ Auto-import checkbox not found');
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
      
      console.log('✅ Copy button listener set and initialized hidden');
      
      // Debug: Test copy button positioning
      setTimeout(() => {
        const rect = copyButton.getBoundingClientRect();
        const computed = window.getComputedStyle(copyButton);
        console.log('🔧 Copy button debug info:');
        console.log('  Position:', rect);
        console.log('  Display:', computed.display);
        console.log('  Opacity:', computed.opacity);
        console.log('  Z-index:', computed.zIndex);
        console.log('  Parent:', copyButton.parentElement?.id);
        
        // Temporary test: force show button for 3 seconds to test visibility
        console.log('🧪 Testing copy button visibility...');
        copyButton.style.display = 'flex';
        copyButton.style.opacity = '1';
        copyButton.classList.add('visible');
        
        setTimeout(() => {
          copyButton.style.display = 'none';
          copyButton.style.opacity = '0';
          copyButton.classList.remove('visible');
          console.log('🧪 Copy button test complete');
        }, 3000);
      }, 1000);
    } else {
      console.log('⚠️ Copy button not found');
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
    
      console.log('✅ Input field focus and keyboard listeners set');
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
          console.log('🔧 Force reset triggered');
          resetUIState();
        }
      }
    });
    
    console.log('✅ All event listeners setup complete');
  }

  // Toggle interface
  function toggleInterface() {
    console.log('🔄 Toggle integrated interface');
    
    // 🔧 Wake up service worker when opening interface
    if (!isOpen) {
      console.log('🚀 Waking up service worker on interface open...');
      pingServiceWorker().catch(error => {
        console.warn('⚠️ Service worker wake-up failed:', error.message);
      });
    }
    
    isOpen = !isOpen;
    const container = document.getElementById('n8n-ai-assistant');
    const button = document.getElementById('n8n-ai-toggle');
    
    if (isOpen) {
      console.log('📖 Opening AI assistant - modifying n8n layout');
      
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
      console.log('📚 Closing AI assistant - restoring n8n layout');
      
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
      
      console.log('🔧 Resize started');
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
      
      console.log('🔧 Resize ended, new height:', currentPanelHeight + 'px');
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
      console.log('⚠️ Horizontal resize elements not found');
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
      
      console.log('🔧 Horizontal resize started, initial width:', startWidth + 'px');
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
      
      console.log('🔧 Horizontal resize ended, final width:', currentPanelWidth + 'px');
    });
    
    // Prevent resize handle click from interfering with other events
    resizeHandle.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    console.log('✅ Horizontal resize functionality setup complete');
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
      console.log(`🔍 NDV state changed: ${isNDVOpen ? 'open' : 'closed'} → ${newNDVState ? 'open' : 'closed'}`);
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
      console.log('🔧 Adapting AI panel for NDV view...');
      
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
      
      console.log(`📐 AI panel adapted for NDV: ${originalPanelWidth}px → ${ndvModeWidth}px`);
      
    } else {
      // NDV is closed - restore original size
      console.log('🔧 Restoring AI panel size after NDV close...');
      
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
        
        console.log(`📐 AI panel restored after NDV: ${currentPanelWidth}px → ${originalPanelWidth}px`);
        
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
    
    console.log('🔍 Starting NDV detection...');
    
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
    
    console.log('✅ NDV detection started');
  }

  // 🎨 THEME DETECTION AND ADAPTATION
  let currentTheme = 'light';
  let themeObserver = null;
  let themeDetectionTimeout = null;

  // Detect n8n theme (dark/light)
  function detectN8nTheme() {
    console.log('🔍 Detecting n8n theme...');
    
    // Method 0: PRIORITY - Check if n8n is using system preferences
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    console.log('🖥️ System prefers dark mode:', systemPrefersDark);
    
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
    console.log('🎯 System default indicators score:', systemDefaultScore, '/3');
    
    // If we have good evidence n8n is following system preferences, use that
    if (systemDefaultScore >= 1) {
      console.log('✅ n8n appears to be following system preferences');
      if (systemPrefersDark) {
        console.log('✅ Dark theme detected via system preference (n8n system default mode)');
        return 'dark';
      } else {
        console.log('✅ Light theme detected via system preference (n8n system default mode)');
        return 'light';
      }
    }
    
    // Method 1: Check for explicit dark theme classes
    
    console.log('📋 HTML classes:', html.className);
    console.log('📋 Body classes:', body.className);
    
    if (html.classList.contains('dark') || 
        body.classList.contains('dark') ||
        html.classList.contains('dark-theme') ||
        body.classList.contains('dark-theme')) {
      console.log('✅ Dark theme detected via HTML/body classes');
      return 'dark';
    }
    
    // Method 2: Check n8n specific dark theme indicators
    const n8nApp = document.querySelector('#app, .n8n-app, [data-theme]');
    if (n8nApp) {
      console.log('📋 n8n app element found:', n8nApp.tagName, n8nApp.className);
      const theme = n8nApp.getAttribute('data-theme');
      console.log('📋 data-theme attribute:', theme);
      
      if (theme && theme.includes('dark')) {
        console.log('✅ Dark theme detected via data-theme attribute');
        return 'dark';
      }
      
      const classList = n8nApp.classList;
      if (classList.contains('dark') || classList.contains('dark-theme')) {
        console.log('✅ Dark theme detected via n8n app classes');
        return 'dark';
      }
    }
    
    // Method 2.5: Look for n8n light mode indicators
    if (html.classList.contains('light') || 
        body.classList.contains('light') ||
        html.classList.contains('light-theme') ||
        body.classList.contains('light-theme')) {
      console.log('✅ Light theme detected via HTML/body classes');
      return 'light';
    }
    
    if (n8nApp) {
      const theme = n8nApp.getAttribute('data-theme');
      if (theme && theme.includes('light')) {
        console.log('✅ Light theme detected via data-theme attribute');
        return 'light';
      }
      
      const classList = n8nApp.classList;
      if (classList.contains('light') || classList.contains('light-theme')) {
        console.log('✅ Light theme detected via n8n app classes');
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
    
    console.log('🔍 Checking background colors of elements...');
    
    for (const selector of n8nElements) {
      const element = document.querySelector(selector);
      if (element) {
        const computedStyle = window.getComputedStyle(element);
        const bgColor = computedStyle.backgroundColor;
        
        console.log(`📋 Element ${selector} background:`, bgColor);
        
        // Parse RGB values to determine if it's dark
        const rgb = bgColor.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
          const [r, g, b] = rgb.map(Number);
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
          
          console.log(`📊 ${selector} luminance: ${luminance} (RGB: ${r},${g},${b})`);
          
          // If luminance is low, it's likely a dark theme
          if (luminance < 100) { // More strict threshold for dark detection
            console.log(`✅ Dark theme detected via element ${selector}: RGB(${r},${g},${b}) luminance=${luminance}`);
            return 'dark';
          }
          
          // If luminance is high, it's likely a light theme
          if (luminance > 200) {
            console.log(`✅ Light theme detected via element ${selector}: RGB(${r},${g},${b}) luminance=${luminance}`);
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
          console.log(`🎨 Dark theme detected via body background: RGB(${r},${g},${b}) luminance=${luminance}`);
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
    console.log('🔍 No explicit theme found, checking system preferences more thoroughly...');
    
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
    
    console.log('🖥️ System preference checks:', systemChecks);
    
    if (systemChecks.mediaQuery || systemChecks.cssColorScheme || systemChecks.browserDefault) {
      console.log('✅ Dark theme detected via enhanced system preference detection');
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
      
      console.log('🎨 System Canvas colors - bg:', bgColor, 'text:', textColor);
      
      // Parse and check luminance of system canvas color
      const bgRgb = bgColor.match(/\d+/g);
      if (bgRgb && bgRgb.length >= 3) {
        const [r, g, b] = bgRgb.map(Number);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
        console.log('🎨 System canvas luminance:', luminance);
        
        if (luminance < 128) {
          console.log('✅ Dark theme detected via system Canvas colors');
          document.body.removeChild(testElement);
          return 'dark';
        }
      }
    } catch (error) {
      console.log('⚠️ Error checking system Canvas colors:', error.message);
    }
    
    document.body.removeChild(testElement);
    
    console.log('⚠️ No clear theme indicators found, defaulting to light');
    console.log('🔍 Consider opening browser dev tools and running: window.debugThemeDetection()');
    return 'light'; // Default fallback
  }

  // Debug function to manually test theme detection
  function debugThemeDetection() {
    console.log('🐛 ENHANCED THEME DETECTION DEBUG');
    console.log('==================================');
    
    // System information
    console.log('🖥️ SYSTEM INFO:');
    console.log('  - User agent:', navigator.userAgent);
    console.log('  - System prefers dark:', window.matchMedia('(prefers-color-scheme: dark)').matches);
    console.log('  - System prefers light:', window.matchMedia('(prefers-color-scheme: light)').matches);
    
    // Document info
    console.log('📄 DOCUMENT INFO:');
    console.log('  - URL:', window.location.href);
    console.log('  - Title:', document.title);
    console.log('  - HTML classes:', document.documentElement.className);
    console.log('  - Body classes:', document.body.className);
    
    // CSS info
    console.log('🎨 CSS INFO:');
    const rootStyle = window.getComputedStyle(document.documentElement);
    console.log('  - color-scheme:', rootStyle.getPropertyValue('color-scheme'));
    console.log('  - Background color:', rootStyle.getPropertyValue('background-color'));
    console.log('  - Color:', rootStyle.getPropertyValue('color'));
    
    // n8n specific
    console.log('🎯 N8N SPECIFIC:');
    const n8nApp = document.querySelector('#app, .n8n-app, [data-theme]');
    if (n8nApp) {
      console.log('  - n8n app element:', n8nApp.tagName);
      console.log('  - n8n app classes:', n8nApp.className);
      console.log('  - data-theme:', n8nApp.getAttribute('data-theme'));
    } else {
      console.log('  - n8n app element: NOT FOUND');
    }
    
    // Detection result
    console.log('🔍 DETECTION RESULT:');
    const theme = detectN8nTheme();
    console.log(`  - Detected theme: ${theme}`);
    console.log(`  - Current applied theme: ${currentTheme}`);
    
    if (theme !== currentTheme) {
      console.log('🔄 Applying new theme...');
      applyThemeColors(theme);
    } else {
      console.log('✅ Theme is already correct');
    }
    
    return theme;
  }
  
  // Expose debug functions globally for easier troubleshooting
  window.debugThemeDetection = debugThemeDetection;
  window.forceThemeDetection = () => {
    console.log('🔄 Forcing theme re-detection...');
    const newTheme = detectN8nTheme();
    console.log('🎯 Re-detected theme:', newTheme);
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
  
  console.log('🛠️ Theme debug functions available:');
  console.log('  - window.debugThemeDetection() - Full theme detection debug');
  console.log('  - window.forceThemeDetection() - Force re-detect and apply theme');
  console.log('  - window.getSystemPreferences() - Check system color preferences');

  // Apply theme-specific colors
  function applyThemeColors(theme) {
    console.log(`%c🎨 Applying ${theme} theme colors to AI Assistant`, `background: ${theme === 'dark' ? '#1e1e1e' : '#ffffff'}; color: ${theme === 'dark' ? '#ffffff' : '#1f2937'}; padding: 3px 8px; border-radius: 4px;`);
    
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
    console.log('🎨 Setting up n8n theme monitoring...');
    
    // Initial theme detection
    const detectedTheme = detectN8nTheme();
    console.log(`🎨 Initial theme detected: ${detectedTheme}`);
    applyThemeColors(detectedTheme);
    
    // NEW: Monitor system preference changes in real-time for "System default" mode
    if (window.matchMedia) {
      const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Function to handle system preference changes
      const handleSystemThemeChange = (e) => {
        console.log('🖥️ System theme preference changed to:', e.matches ? 'dark' : 'light');
        
        // Give n8n a moment to update its theme, then check
        setTimeout(() => {
          const newTheme = detectN8nTheme();
          if (newTheme !== currentTheme) {
            console.log(`🔄 Theme auto-updated due to system change: ${currentTheme} → ${newTheme}`);
            applyThemeColors(newTheme);
          }
        }, 100);
      };
      
      // Listen for system theme changes (modern browsers)
      if (systemThemeQuery.addEventListener) {
        systemThemeQuery.addEventListener('change', handleSystemThemeChange);
        console.log('🖥️ System theme change listener added (modern)');
      } else if (systemThemeQuery.addListener) {
        // Fallback for older browsers
        systemThemeQuery.addListener(handleSystemThemeChange);
        console.log('🖥️ System theme change listener added (legacy)');
      }
    }
    
    // Monitor theme changes with MutationObserver
    if (themeObserver) {
      themeObserver.disconnect();
    }
    
    themeObserver = new MutationObserver((mutations) => {
      let themeChanged = false;
      
      mutations.forEach((mutation) => {
        // Check for class changes that might indicate theme switch
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || 
             mutation.attributeName === 'data-theme' ||
             mutation.attributeName === 'style')) {
          themeChanged = true;
        }
        
        // Check for added/removed nodes that might contain theme info
        if (mutation.type === 'childList') {
          themeChanged = true;
        }
      });
      
      if (themeChanged) {
        // Debounce theme detection to avoid excessive calls
        clearTimeout(themeDetectionTimeout);
        themeDetectionTimeout = setTimeout(() => {
          const newTheme = detectN8nTheme();
          if (newTheme !== currentTheme) {
            console.log(`🎨 Theme changed: ${currentTheme} → ${newTheme}`);
            applyThemeColors(newTheme);
          }
        }, 500);
      }
    });
    
    // Observe the entire document for theme changes
    themeObserver.observe(document, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class', 'data-theme', 'style']
    });
    
    // Also monitor window resize and focus events (theme might change)
    window.addEventListener('focus', () => {
      setTimeout(() => {
        const newTheme = detectN8nTheme();
        if (newTheme !== currentTheme) {
          console.log(`🎨 Theme check on focus: ${currentTheme} → ${newTheme}`);
          applyThemeColors(newTheme);
        }
      }, 100);
    });
    
    // Monitor system theme preference changes
    if (window.matchMedia) {
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      darkModeMediaQuery.addEventListener('change', (e) => {
        console.log(`🎨 System theme preference changed: ${e.matches ? 'dark' : 'light'}`);
        setTimeout(() => {
          const newTheme = detectN8nTheme();
          if (newTheme !== currentTheme) {
            console.log(`🎨 Applying new theme based on system preference: ${newTheme}`);
            applyThemeColors(newTheme);
          }
        }, 200);
      });
    }
  }

  // Copy JSON to clipboard
  async function copyJsonToClipboard() {
    const codeContent = document.getElementById('ai-code-content');
    const copyButton = document.getElementById('ai-copy-json');
    
    console.log('📋 copyJsonToClipboard called');
    console.log('🔍 Code content found:', !!codeContent);
    console.log('🔍 Copy button found:', !!copyButton);
    
    if (!codeContent) {
      console.log('❌ Code content element not found');
      return;
    }
    
    if (!copyButton) {
      console.log('❌ Copy button element not found');
      return;
    }
    
    const jsonText = codeContent.textContent || codeContent.innerText;
    console.log('📄 JSON text length:', jsonText ? jsonText.length : 0);
    console.log('📄 JSON text preview:', jsonText ? jsonText.substring(0, 100) + '...' : 'empty');
    
    if (!jsonText || jsonText.trim() === '') {
      console.log('❌ No JSON to copy');
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
      
      console.log('✅ JSON copied to clipboard');
      
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
        
        console.log('✅ JSON copied to clipboard (fallback)');
        
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
    console.log('🧹 Clearing code content...');
    
    const codeContent = document.getElementById('ai-code-content');
    const copyButton = document.getElementById('ai-copy-json');
    
    // Safety checks before accessing elements
    if (codeContent) {
    codeContent.innerHTML = '';
      codeContent.textContent = '';
      console.log('✅ Code content cleared');
    } else {
      console.log('⚠️ Code content element not found');
    }
    
    if (copyButton) {
      copyButton.classList.remove('visible');
      copyButton.style.display = 'none';
      copyButton.style.opacity = '0';
      console.log('✅ Copy button hidden');
    } else {
      console.log('⚠️ Copy button element not found');
    }
    
    jsonBuffer = '';
    updateCodeStatus('ready');
    
    console.log('🧹 Code content clearing complete');
  }

  // Insert workflow into n8n
  function insertWorkflow(isReplacement = false) {
    // Check if currently pasting in chat to avoid auto-import
    if (window.aiChatPastingFlag && window.aiChatPastingFlag()) {
      console.log('🛡️ Skipping workflow import - pasting in chat detected');
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
    console.log('🔧 Parsing and cleaning workflow JSON...');
    
    try {
      // Première tentative de parsing direct
      return JSON.parse(jsonString);
    } catch (error) {
      console.log('⚠️ Direct JSON parse failed, attempting cleanup:', error.message);
      
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
        
        console.log('🧹 JSON cleaned, attempting parse...');
        const parsed = JSON.parse(cleanedJSON);
        
        // Mettre à jour l'affichage avec le JSON nettoyé
        updateCodeContent(JSON.stringify(parsed, null, 2), true);
        
        console.log('✅ JSON successfully cleaned and parsed!');
        return parsed;
        
      } catch (cleanupError) {
        console.log('❌ JSON cleanup also failed:', cleanupError.message);
        
        // Dernière tentative : nettoyage manuel spécifique pour les emails HTML
        try {
          console.log('🔧 Attempting specific HTML email cleanup...');
          
          let manualCleanJSON = jsonString;
          
                     // Remplacer spécifiquement le contenu HTML problématique dans le message email
           manualCleanJSON = manualCleanJSON.replace(
             /"message":\s*"[^"]*UTF-8[^"]*"([^}]*)/,
             '"message": "<!DOCTYPE html><html><head><meta charset=\\"UTF-8\\"></head><body><div style=\\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;\\"><div style=\\"background: white; padding: 30px; border-radius: 8px;\\"><h1 style=\\"color: #2563eb;\\">🌤️ Météo Paris</h1><p>Rapport quotidien du {{ new Date().toLocaleDateString(\'fr-FR\') }}</p><h2>📊 Données météorologiques</h2><p>🌡️ Température maximale: {{ $json.daily.temperature_2m_max[0] }}{{ $json.daily_units.temperature_2m_max }}</p><p>🕐 Fuseau horaire: {{ $json.timezone }}</p><p>📅 Date: {{ new Date().toLocaleString(\'fr-FR\') }}</p></div></div></body></html>"'
           );
          
          const manualParsed = JSON.parse(manualCleanJSON);
          
          // Mettre à jour l'affichage
          updateCodeContent(JSON.stringify(manualParsed, null, 2), true);
          
          console.log('✅ Manual cleanup successful!');
          addChatMessage('🔧 JSON was automatically cleaned and fixed!', false);
          
          return manualParsed;
          
        } catch (manualError) {
          console.log('❌ Manual cleanup failed:', manualError.message);
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
    
    console.log('🔧 updateCodeContent called');
    console.log('📄 Content length:', content ? content.length : 0);
    console.log('✅ Is complete:', isComplete);
    console.log('🔍 Code content element found:', !!codeContent);
    console.log('📋 Copy button element found:', !!copyButton);
    
    // Safety checks
    if (!codeContent) {
      console.log('⚠️ Code content element not found in updateCodeContent');
      return;
    }
    
    codeContent.className = 'ai-scrollbar ai-json-highlight';
    
    // Clean content properly
    const cleanContent = content ? content.trim() : '';
    console.log('🧹 Clean content length:', cleanContent.length);
    console.log('📄 Clean content preview:', cleanContent.substring(0, 100) + '...');
    
    // Update content directly (no need to preserve button since it's separate now)
    if (isComplete && cleanContent) {
      try {
        const parsed = JSON.parse(cleanContent);
        const formatted = JSON.stringify(parsed, null, 2);
        codeContent.innerHTML = highlightJSON(formatted);
        console.log('✅ JSON formatted and highlighted');
      } catch (e) {
        console.log('⚠️ JSON parse failed, using raw content');
        codeContent.innerHTML = highlightJSON(cleanContent);
      }
    } else if (cleanContent) {
      codeContent.innerHTML = highlightJSON(cleanContent);
      console.log('✅ Content highlighted (not complete)');
    } else {
      codeContent.innerHTML = '';
      console.log('🧹 Content cleared');
    }
    
    // Show/hide copy button - better content detection
    const hasVisibleContent = cleanContent && cleanContent.length > 0 && 
                             cleanContent !== '{}' && cleanContent !== '[]';
    
    console.log('🔍 Has visible content:', hasVisibleContent);
    console.log('📊 Content conditions:');
    console.log('  - cleanContent exists:', !!cleanContent);
    console.log('  - cleanContent.length > 0:', cleanContent.length > 0);
    console.log('  - not empty object:', cleanContent !== '{}');
    console.log('  - not empty array:', cleanContent !== '[]');
    
    // Update copy button visibility (button stays in DOM, just show/hide)
    if (copyButton) {
      if (hasVisibleContent) {
        copyButton.classList.add('visible');
        copyButton.style.display = 'flex';
        copyButton.style.opacity = '1';
        console.log('✅ Copy button made visible with content');
        console.log('📋 Copy button classes:', copyButton.className);
        console.log('📋 Copy button style.display:', copyButton.style.display);
        console.log('📋 Copy button style.opacity:', copyButton.style.opacity);
        
        // Force visibility check
        setTimeout(() => {
          const computedStyle = window.getComputedStyle(copyButton);
          console.log('🔍 Copy button computed display:', computedStyle.display);
          console.log('🔍 Copy button computed opacity:', computedStyle.opacity);
          console.log('🔍 Copy button computed visibility:', computedStyle.visibility);
          console.log('🔍 Copy button offset dimensions:', copyButton.offsetWidth, 'x', copyButton.offsetHeight);
          console.log('🔍 Copy button position:', copyButton.getBoundingClientRect());
        }, 100);
        
      } else {
        copyButton.classList.remove('visible');
        copyButton.style.display = 'none';
        copyButton.style.opacity = '0';
        console.log('🙈 Copy button hidden - no content');
      }
    } else {
      console.log('⚠️ Copy button element not found');
    }
    
    // Auto-scroll to bottom
    codeContent.scrollTop = codeContent.scrollHeight;
    
    // Auto-expand code panel when JSON arrives
    if (hasVisibleContent && !isCodePanelExpanded) {
      console.log('📂 Auto-expanding code panel');
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
    console.log('🏓 Pinging service worker...');

    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ type: 'PING_SERVICE_WORKER' }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('⚠️ Service worker ping lastError:', chrome.runtime.lastError.message);
            return reject(new Error(chrome.runtime.lastError.message));
          }

          if (response && response.pong) {
            console.log('✅ Service worker is active and responsive');
            console.log('📊 Service worker uptime:', response.uptime, 'ms');
            console.log('⏰ Service worker timestamp:', response.timestamp);
            resolve(true);
          } else {
            console.warn('⚠️ Service worker responded but with unexpected data:', response);
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
      console.log('🔍 Checking service worker status...');
      statusEl.textContent = 'checking...';
      statusEl.style.color = 'var(--ai-text-warning)';
      
      const isActive = await pingServiceWorker();
      
      if (isActive) {
        statusEl.textContent = 'ready';
        statusEl.style.color = 'var(--ai-text-success)';
        console.log('✅ Service worker status: ACTIVE');
      } else {
        statusEl.textContent = 'service issue';
        statusEl.style.color = 'var(--ai-text-error)';
        console.log('⚠️ Service worker status: ISSUE');
      }
    } catch (error) {
      statusEl.textContent = 'service sleeping';
      statusEl.style.color = 'var(--ai-text-error)';
      statusEl.title = 'Click the extension icon to wake up the service worker';
      console.log('❌ Service worker status: SLEEPING/ERROR');
    }
  }

  // Reset UI state
  function resetUIState() {
    console.log('🔄 Resetting UI state');
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
    console.log('✅ UI state reset complete');
  }

  // Send message
  async function sendMessage() {
    const input = document.getElementById('ai-input');
    const message = input.value.trim();
    
    console.log('🔴 sendMessage called, isGenerating:', isGenerating, 'message:', message);
    
    if (!message) {
      console.log('❌ No message to send');
      return;
    }
    
    if (isGenerating) {
      console.log('❌ Already generating, stopping');
      return;
    }

    console.log('%c💬 CONTENT: Sending message to backend', 'background: blue; color: white; padding: 2px 6px;');
    console.log('📝 User prompt:', message);
    
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
    console.log('%c📊 CONTENT: Current workflow analysis', 'background: purple; color: white; padding: 2px 6px;');
    console.log('🔍 hasExistingWorkflow:', hasExistingWorkflow);
    if (currentWorkflow) {
      console.log('📋 Current workflow structure:');
      console.log('  - Nodes count:', currentWorkflow.nodes?.length || 0);
      console.log('  - Connections count:', Object.keys(currentWorkflow.connections || {}).length);
      console.log('  - Workflow name:', currentWorkflow.name);
      console.log('  - Workflow ID:', currentWorkflow.id);
      
      if (currentWorkflow.nodes) {
        console.log('📝 Node details:');
        currentWorkflow.nodes.forEach((node, i) => {
          console.log(`  ${i + 1}. ${node.name} (${node.type}) - ID: ${node.id}`);
        });
      }
      
      // Calcul taille payload
      const workflowSize = JSON.stringify(currentWorkflow).length;
      console.log('📏 Current workflow payload size:', workflowSize, 'chars (', (workflowSize / 1024).toFixed(1), 'KB)');
    } else {
      console.log('📋 No current workflow detected');
    }
    
    if (hasExistingWorkflow) {
      console.log('🔄 Detected existing workflow with', currentWorkflow.nodes.length, 'nodes - using improvement mode');
      console.log('📋 Current workflow nodes:', currentWorkflow.nodes.map(n => `${n.name} (${n.type})`));
      updateChatMessage(assistantMessage, `🔄 Analyzing existing workflow (${currentWorkflow.nodes.length} nodes) for improvements...`, true);
    } else {
      console.log('🆕 No existing workflow detected - using generation mode');
      console.log('📋 Current workflow state:', currentWorkflow ? 'empty workflow' : 'no workflow data');
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
      console.log('%c🔧 CONTENT: Checking service worker status', 'background: purple; color: white; padding: 2px 6px;');
      
      // Ping service worker pour vérifier qu'il est actif
      await pingServiceWorker();
      
      // Send to background with appropriate mode
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        console.log('%c🚀 CONTENT: Preparing message for background script', 'background: green; color: white; padding: 2px 6px;');
        
        if (hasExistingWorkflow) {
          // Mode amélioration - envoyer le workflow actuel
          console.log('📋 Using IMPROVE_WORKFLOW mode with current workflow');
          
          const messagePayload = {
            type: 'IMPROVE_WORKFLOW',
            currentWorkflow: currentWorkflow,
            improvementRequest: message
          };
          
          // 📊 DETAILED LOGGING - Message payload
          console.log('%c📊 CONTENT: IMPROVE_WORKFLOW payload details', 'background: orange; color: white; padding: 2px 6px;');
          console.log('🔧 Message type:', messagePayload.type);
          console.log('📝 Improvement request:', messagePayload.improvementRequest);
          console.log('📋 Current workflow payload:');
          console.log('  - Nodes:', messagePayload.currentWorkflow.nodes?.length || 0);
          console.log('  - Connections:', Object.keys(messagePayload.currentWorkflow.connections || {}).length);
          console.log('  - Name:', messagePayload.currentWorkflow.name);
          
          const payloadSize = JSON.stringify(messagePayload).length;
          console.log('📏 Total message payload size:', payloadSize, 'chars (', (payloadSize / 1024).toFixed(1), 'KB)');
          console.log('📦 Raw payload sample (first 500 chars):', JSON.stringify(messagePayload).substring(0, 500) + '...');
          
          chrome.runtime.sendMessage(messagePayload).then(response => {
            console.log('✅ Background response (improvement):', response);
            if (response && response.serviceWorkerActive) {
              console.log('📊 Service worker confirmed active during request');
            }
          }).catch(err => {
            console.error('❌ Background communication error:', err);
            const errorMsg = err.message.includes('service worker') ? 
              'Service worker is sleeping. Try clicking the extension icon to wake it up, or wait a moment and try again.' :
              `Communication error with service worker: ${err.message}`;
            handleError(errorMsg, assistantMessage);
          });
        } else {
          // Mode génération normale - nouveau workflow
          console.log('🆕 Using SEND_TO_CLAUDE mode for new workflow');
          
          const messagePayload = {
            type: 'SEND_TO_CLAUDE',
            prompt: message
          };
          
          // 📊 DETAILED LOGGING - Message payload
          console.log('%c📊 CONTENT: SEND_TO_CLAUDE payload details', 'background: orange; color: white; padding: 2px 6px;');
          console.log('🔧 Message type:', messagePayload.type);
          console.log('📝 Prompt:', messagePayload.prompt);
          
          const payloadSize = JSON.stringify(messagePayload).length;
          console.log('📏 Total message payload size:', payloadSize, 'chars (', (payloadSize / 1024).toFixed(1), 'KB)');
          console.log('📦 Raw payload:', JSON.stringify(messagePayload));
          
          chrome.runtime.sendMessage(messagePayload).then(response => {
            console.log('✅ Background response (generation):', response);
            if (response && response.serviceWorkerActive) {
              console.log('📊 Service worker confirmed active during request');
            }
          }).catch(err => {
            console.error('❌ Background communication error:', err);
            const errorMsg = err.message.includes('service worker') ? 
              'Service worker is sleeping. Try clicking the extension icon to wake it up, or wait a moment and try again.' :
              `Communication error with service worker: ${err.message}`;
            handleError(errorMsg, assistantMessage);
          });
        }
      }
    } catch (err) {
      console.error('❌ Send message error:', err);
      handleError('Error sending message: ' + err.message, assistantMessage);
    }
  }

  // Handle errors
  function handleError(error, messageElement = null) {
    console.log('❌ handleError called:', error);
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
    console.log('📨 Background message:', message.type);
    
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
          console.log('🎉 Complete workflow received');
          
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
            console.log('📄 Auto-import disabled - workflow available for manual import');
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
        console.log('🗜️ Decompression fallback requested');
        handleDecompressionFallback(message.compressedData, message.originalSize, lastMessage);
        break;

      case 'CLAUDE_ERROR':
        handleError(message.error, lastMessage);
        break;
        
      default:
        // Handle any unrecognized progress messages
        if (message.message && lastMessage) {
          console.log('Unhandled message type:', message.type, 'treating as progress');
          updateChatMessage(lastMessage, message.message, true);
        } else {
          console.log('Unknown message type:', message.type, message);
        }
    }
  }

  // Import workflow
  function importWorkflow(workflowData, isImprovement = false) {
    console.log('🔄 Importing workflow:', workflowData);
    console.log('🔄 Import mode:', isImprovement ? 'improvement (will clear existing)' : 'new workflow');
    
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
        console.log(`🔍 N8n readiness check ${attempts}/${maxAttempts}: ${readyIndicators.length}/${indicators.length} indicators ready`);
        
        // If we have at least 2 indicators or the main app + store, consider it ready
        if (readyIndicators.length >= 2 || (indicators[0] && indicators[4])) {
          console.log('✅ N8n appears to be ready');
          resolve();
          return;
        }
        
        if (attempts >= maxAttempts) {
          console.warn('⏰ Timeout waiting for n8n to be ready');
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
    console.log('🎯 Initializing integrated AI interface');
    
    try {
      injectStyles();
      const container = createInterface();
      const button = createFloatingButton();
      
      // Listen for window resize
      window.addEventListener('resize', handleWindowResize);
      console.log('✅ Window resize listener added');
      
      // Setup DOM observer for layout maintenance
      const domObserver = setupDOMObserver();
      
      // Setup theme monitoring for automatic dark/light theme adaptation
      setupThemeMonitoring();
      
      // Listen for background messages
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          console.log('📨 Message from background:', message.type);
          handleBackgroundMessage(message);
          sendResponse({ received: true });
        });
        console.log('✅ Background listeners configured');
      }
      
      // Cleanup on page unload
      window.addEventListener('beforeunload', () => {
        if (n8nLayoutModified) {
          removeN8nLayoutModifications();
        }
      });
      
      console.log('🎉 Integrated AI interface ready');
      
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
        console.log('🔄 Auto-opening for saved custom domain:', hostname);
        // For saved custom domains, open immediately after a short delay
        setTimeout(() => {
          console.log('🚀 Auto-opening AI assistant (saved custom domain)');
          toggleInterface();
        }, 1500);
      } else {
        // For official domains, wait for n8n readiness
        waitForN8nReady().then(() => {
          console.log('🚀 Auto-opening AI assistant (official domain)');
          toggleInterface();
        }).catch(() => {
          // Fallback: open after delay even if we can't detect n8n readiness
          setTimeout(() => {
            console.log('🚀 Auto-opening AI assistant (fallback)');
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
      console.log('🔧 Force init after timeout');
      init();
    }
  }, 1000);

  // Listen for click on n8n "+" (add node) button to auto-close assistant
  document.addEventListener('click', (e) => {
    const plusBtn = e.target.closest('button._nodeCreatorPlus_ebnw3_154');
    if (plusBtn && isOpen) {
      console.log('➕ n8n node creator plus clicked – closing AI assistant');
      toggleInterface();
    }
  });
})(); // End of initializeExtension function 