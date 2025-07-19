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

// Check if we're on n8n and a workflow page
const isN8n = window.location.hostname.includes('n8n.io') || 
              window.location.hostname.includes('n8n.cloud') || 
              window.location.hostname.includes('localhost');

const isWorkflowPage = window.location.pathname.includes('/workflow/') || 
                       window.location.pathname.includes('/execution/') ||
                       window.location.pathname.includes('/editor/') ||
                       (window.location.hostname.includes('localhost') && window.location.pathname === '/');

if (!isN8n || !isWorkflowPage) {
  console.log('❌ Not on n8n workflow page, stopping');
  
  if (isN8n && !isWorkflowPage) {
    setTimeout(() => {
      const helpDiv = document.createElement('div');
      helpDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1e1e1e;
        color: #d4d4d4;
        padding: 16px 20px;
        border-radius: 6px;
        font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
        font-size: 13px;
        z-index: 9999;
        max-width: 320px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.32);
        border: 1px solid #3e3e3e;
      `;
      helpDiv.innerHTML = `
        <div style="margin-bottom: 8px; font-weight: 600; color: #569cd6;">🤖 n8n AI Assistant</div>
        <div style="margin-bottom: 12px; color: #9cdcfe;">Navigate to a workflow editor to use the AI assistant.</div>
        <button onclick="window.open('/workflows', '_blank'); this.parentElement.remove();" 
                style="background: #0078d4; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; font-size: 12px; font-family: inherit;">
          View Workflows
        </button>
        <button onclick="this.parentElement.remove();" 
                style="background: transparent; color: #d4d4d4; border: 1px solid #3e3e3e; padding: 6px 12px; border-radius: 3px; cursor: pointer; margin-left: 8px; font-size: 12px; font-family: inherit;">
          Dismiss
        </button>
      `;
      document.body.appendChild(helpDiv);
      
      setTimeout(() => {
        if (helpDiv.parentElement) helpDiv.remove();
      }, 10000);
    }, 1000);
  }
} else if (window.__n8nAiAssistantLoaded) {
  console.log('⚠️ Extension already loaded in this context');
} else {
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

  // Create Monaco-inspired styles
  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'n8n-ai-assistant-styles';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');
      
      :root {
        --ai-bg-primary: #1e1e1e;
        --ai-bg-secondary: #252526;
        --ai-bg-tertiary: #2d2d30;
        --ai-border: #3e3e42;
        --ai-text-primary: #cccccc;
        --ai-text-secondary: #9ca3af;
        --ai-text-accent: #569cd6;
        --ai-text-success: #4ec9b0;
        --ai-text-warning: #dcdcaa;
        --ai-text-error: #f44747;
        --ai-accent: #007acc;
        --ai-accent-hover: #005a9e;
        --ai-font-mono: 'JetBrains Mono', 'SF Mono', 'Monaco', 'Cascadia Code', Consolas, monospace;
        --ai-font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
      }

      .ai-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #4a4a4a;
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

      .ai-json-highlight {
        color: var(--ai-text-primary);
      }

      .ai-json-highlight .json-key {
        color: #9cdcfe;
      }

      .ai-json-highlight .json-string {
        color: #ce9178;
      }

      .ai-json-highlight .json-number {
        color: #b5cea8;
      }

      .ai-json-highlight .json-boolean {
        color: #569cd6;
      }

      .ai-json-highlight .json-null {
        color: #569cd6;
      }

      .ai-message {
        margin-bottom: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .ai-message-user {
        align-items: flex-end;
      }

      .ai-message-assistant {
        align-items: flex-start;
      }

      .ai-message-bubble {
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.4;
        word-wrap: break-word;
      }

      .ai-message-bubble-user {
        background: var(--ai-accent);
        color: white;
        border-bottom-right-radius: 4px;
      }

      .ai-message-bubble-assistant {
        background: var(--ai-bg-secondary);
        color: var(--ai-text-primary);
        border-bottom-left-radius: 4px;
        border: 1px solid var(--ai-border);
      }

      .ai-code-panel {
        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        overflow: hidden;
      }

      .ai-code-panel.collapsed {
        height: 40px !important;
      }

      .ai-code-panel.expanded {
        height: 300px !important;
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
    `;
    document.head.appendChild(style);
  }

  // Create the main interface
  function createInterface() {
    console.log('🎨 Creating modern interface');
    
    // Remove existing
    const existing = document.getElementById('n8n-ai-assistant');
    if (existing) existing.remove();
    
    const container = document.createElement('div');
    container.id = 'n8n-ai-assistant';
    container.className = 'ai-assistant-container ai-slide-in';
    container.style.cssText = `
      position: fixed;
      top: 0;
      right: -520px;
      width: 520px;
      height: 100vh;
      background: var(--ai-bg-primary);
      border-left: 1px solid var(--ai-border);
      transition: right 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      z-index: 9999;
      font-family: var(--ai-font-ui);
      display: flex;
      flex-direction: column;
      box-shadow: -8px 0 32px rgba(0,0,0,0.24);
    `;
    
    container.innerHTML = `
      <!-- Header -->
      <div style="
        padding: 12px 16px;
        background: var(--ai-bg-secondary);
        border-bottom: 1px solid var(--ai-border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 48px;
      ">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--ai-text-success);
          "></div>
          <span style="
            font-weight: 500;
            color: var(--ai-text-primary);
            font-size: 13px;
          ">AI Workflow Assistant</span>
          <span id="ai-status" style="
            font-size: 11px;
            color: var(--ai-text-secondary);
            font-family: var(--ai-font-mono);
          ">ready</span>
      </div>
        <button id="ai-close" style="
          background: transparent;
          border: none;
          color: var(--ai-text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 3px;
          font-size: 16px;
          line-height: 1;
          transition: all 0.15s ease;
        " title="Close (Esc)">×</button>
      </div>

      <!-- Chat Messages Area -->
      <div id="ai-chat-messages" style="
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      " class="ai-scrollbar">
        <div style="
          color: var(--ai-text-secondary);
          font-style: italic;
          text-align: center;
          margin-top: 40px;
          font-size: 14px;
        ">
          👋 Welcome to n8n AI Workflow Assistant
          <br><br>
          Describe your workflow needs and I'll generate<br>
          a complete n8n workflow for you.
          <br><br>
          <span style="font-size: 12px; opacity: 0.7;">
            Start by typing your request below ↓
          </span>
        </div>
      </div>

      <!-- Code Panel (Collapsible) -->
      <div id="ai-code-panel" class="ai-code-panel collapsed" style="
        background: var(--ai-bg-secondary);
        border-top: 1px solid var(--ai-border);
        height: 40px;
        display: flex;
        flex-direction: column;
      ">
        <!-- Code Panel Header -->
        <div id="ai-code-toggle" style="
          padding: 8px 16px;
          background: var(--ai-bg-tertiary);
          border-bottom: 1px solid var(--ai-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          min-height: 40px;
        ">
          <div style="
            font-size: 12px;
            color: var(--ai-text-secondary);
            font-family: var(--ai-font-mono);
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <span>📄</span>
            <span>workflow.json</span>
            <span id="ai-code-status" style="color: var(--ai-text-warning);"></span>
          </div>
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <button id="ai-clear-code" class="ai-button-secondary" style="
              padding: 2px 6px;
              font-size: 11px;
              border-radius: 3px;
              cursor: pointer;
            " title="Clear code">Clear</button>
            <span id="ai-toggle-arrow" class="ai-toggle-arrow" style="
              color: var(--ai-text-secondary);
              font-size: 12px;
            ">▲</span>
          </div>
        </div>
        
        <!-- Code Content -->
        <div id="ai-code-content" style="
          flex: 1;
          padding: 16px;
          background: var(--ai-bg-primary);
          color: var(--ai-text-primary);
          font-family: var(--ai-font-mono);
          font-size: 13px;
          line-height: 1.5;
          overflow-y: auto;
          white-space: pre-wrap;
          word-break: break-word;
        " class="ai-scrollbar">
        </div>
      </div>

      <!-- Input Area -->
      <div style="
        padding: 16px;
        background: var(--ai-bg-secondary);
        border-top: 1px solid var(--ai-border);
      ">
        <div style="
          display: flex;
          gap: 8px;
          align-items: flex-end;
        ">
          <div style="flex: 1;">
          <textarea 
            id="ai-input" 
              class="ai-input-auto"
              placeholder="Describe your workflow... (e.g., 'Create a workflow that syncs Slack with Notion every hour')"
              style="
                width: 100%;
                height: 72px;
                padding: 12px;
                background: var(--ai-bg-primary);
                border: 1px solid var(--ai-border);
                border-radius: 4px;
                color: var(--ai-text-primary);
                font-family: var(--ai-font-ui);
                font-size: 13px;
                line-height: 1.4;
                resize: none;
                outline: none;
                transition: border-color 0.15s ease;
              "
          ></textarea>
          </div>
          <button 
            id="ai-send" 
            class="ai-button-primary"
            style="
              padding: 12px 16px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 13px;
              font-weight: 500;
              height: 40px;
              min-width: 80px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
            "
            title="Generate workflow (Ctrl+Enter)"
          >
            <span id="ai-send-text">Generate</span>
            <span id="ai-send-icon" style="font-size: 11px;">⚡</span>
          </button>
        </div>
        <div style="
          margin-top: 8px;
          font-size: 11px;
          color: var(--ai-text-secondary);
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <span>💡 Be specific for better results</span>
          <span style="font-family: var(--ai-font-mono);">Ctrl+Enter to send</span>
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
    return container;
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
      background: var(--ai-accent);
      color: white;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      font-size: 20px;
      z-index: 9998;
      box-shadow: 0 4px 16px rgba(0, 122, 204, 0.3);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--ai-font-ui);
    `;
    
    button.innerHTML = '🤖';
    button.title = 'Open AI Assistant (Ctrl+Shift+A)';
    
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.05)';
      button.style.boxShadow = '0 6px 20px rgba(0, 122, 204, 0.4)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 16px rgba(0, 122, 204, 0.3)';
    });
    
    button.onclick = toggleInterface;
    document.body.appendChild(button);
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
    // Close button
    document.getElementById('ai-close').onclick = toggleInterface;
    
    // Send button and input
    const sendButton = document.getElementById('ai-send');
    const inputField = document.getElementById('ai-input');
    
    sendButton.onclick = sendMessage;
    

    
    // Code panel toggle
    document.getElementById('ai-code-toggle').onclick = toggleCodePanel;
    
    // Clear code button
    document.getElementById('ai-clear-code').onclick = (e) => {
      e.stopPropagation();
      clearCode();
    };
    
    // Input focus effects
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
    
    // Prevent propagation on input event as well
    inputField.addEventListener('input', (e) => {
      e.stopPropagation();
      autoResizeTextarea(inputField);
    });
    
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
      }
    });
  }

  // Toggle interface
  function toggleInterface() {
    console.log('🔄 Toggle interface');
    isOpen = !isOpen;
    const container = document.getElementById('n8n-ai-assistant');
    const button = document.getElementById('n8n-ai-toggle');
    
    if (isOpen) {
      container.style.right = '0px';
      button.style.background = 'var(--ai-text-error)';
      button.innerHTML = '✕';
      button.title = 'Close AI Assistant (Esc)';
      document.getElementById('ai-input').focus();
    } else {
      container.style.right = '-520px';
      button.style.background = 'var(--ai-accent)';
      button.innerHTML = '🤖';
      button.title = 'Open AI Assistant (Ctrl+Shift+A)';
    }
  }

  // Toggle code panel
  function toggleCodePanel() {
    isCodePanelExpanded = !isCodePanelExpanded;
    const panel = document.getElementById('ai-code-panel');
    const arrow = document.getElementById('ai-toggle-arrow');
    
    if (isCodePanelExpanded) {
      panel.classList.remove('collapsed');
      panel.classList.add('expanded');
      arrow.classList.add('expanded');
    } else {
      panel.classList.remove('expanded');
      panel.classList.add('collapsed');
      arrow.classList.remove('expanded');
    }
  }

  // Clear code
  function clearCode() {
    const codeContent = document.getElementById('ai-code-content');
    codeContent.innerHTML = '';
    jsonBuffer = '';
    updateCodeStatus('ready');
  }

  // Add message to chat
  function addChatMessage(content, isUser = false, isLoading = false) {
    const chatMessages = document.getElementById('ai-chat-messages');
    
    // Clear welcome message on first real message
    if (chatMessages.children.length === 1 && chatMessages.children[0].style.textAlign === 'center') {
      chatMessages.innerHTML = '';
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${isUser ? 'ai-message-user' : 'ai-message-assistant'}`;
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = `ai-message-bubble ${isUser ? 'ai-message-bubble-user' : 'ai-message-bubble-assistant'}`;
    
    if (isLoading) {
      bubbleDiv.innerHTML = content + ' <span class="ai-typing-dots"></span>';
    } else {
      bubbleDiv.textContent = content;
    }
    
    messageDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return bubbleDiv;
  }

  // Update message content
  function updateChatMessage(messageElement, content, isLoading = false) {
    if (isLoading) {
      messageElement.innerHTML = content + ' <span class="ai-typing-dots"></span>';
    } else {
      messageElement.textContent = content;
    }
  }

  // Update code status
  function updateCodeStatus(status) {
    const statusEl = document.getElementById('ai-code-status');
    const aiStatus = document.getElementById('ai-status');
    
    switch (status) {
      case 'generating':
        statusEl.textContent = '● generating...';
        statusEl.style.color = 'var(--ai-text-warning)';
        aiStatus.textContent = 'generating';
        aiStatus.className = 'ai-pulse';
        break;
      case 'streaming':
        statusEl.textContent = '● streaming...';
        statusEl.style.color = 'var(--ai-text-accent)';
        aiStatus.textContent = 'streaming';
        aiStatus.className = 'ai-pulse';
        break;
      case 'complete':
        statusEl.textContent = '● complete';
        statusEl.style.color = 'var(--ai-text-success)';
        aiStatus.textContent = 'ready';
        aiStatus.className = '';
        break;
      case 'error':
        statusEl.textContent = '● error';
        statusEl.style.color = 'var(--ai-text-error)';
        aiStatus.textContent = 'error';
        aiStatus.className = '';
        break;
      case 'ready':
      default:
        statusEl.textContent = '';
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
    codeContent.className = 'ai-scrollbar ai-json-highlight';
    
    if (isComplete) {
      try {
        const parsed = JSON.parse(content);
        const formatted = JSON.stringify(parsed, null, 2);
        codeContent.innerHTML = highlightJSON(formatted);
      } catch (e) {
        codeContent.innerHTML = highlightJSON(content);
      }
    } else {
      codeContent.innerHTML = highlightJSON(content);
    }
    
    // Auto-scroll to bottom
    codeContent.scrollTop = codeContent.scrollHeight;
    
    // Auto-expand code panel when JSON arrives
    if (content.trim() && !isCodePanelExpanded) {
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

  // Send message
  async function sendMessage() {
    const input = document.getElementById('ai-input');
    const message = input.value.trim();
    if (!message || isGenerating) return;

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
    const sendText = document.getElementById('ai-send-text');
    const sendIcon = document.getElementById('ai-send-icon');
    
    sendButton.disabled = true;
    sendButton.style.opacity = '0.7';
    sendText.textContent = 'Generating';
    sendIcon.textContent = '⏳';
    
    input.value = '';
    input.style.height = '72px'; // Reset height
    input.disabled = true;
    
    updateCodeStatus('generating');

    try {
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
          }).catch(err => {
            console.error('❌ Background communication error:', err);
            handleError('Communication error with service worker', assistantMessage);
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
          }).catch(err => {
            console.error('❌ Background communication error:', err);
            handleError('Communication error with service worker', assistantMessage);
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
    isGenerating = false;
    
    const sendButton = document.getElementById('ai-send');
    const sendText = document.getElementById('ai-send-text');
    const sendIcon = document.getElementById('ai-send-icon');
    const input = document.getElementById('ai-input');
    
    sendButton.disabled = false;
    sendButton.style.opacity = '1';
    sendText.textContent = 'Generate';
    sendIcon.textContent = '⚡';
    input.disabled = false;
    
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
          
          isGenerating = false;
          updateCodeStatus('complete');
          
          // Reset send button
          const sendButton = document.getElementById('ai-send');
          const sendText = document.getElementById('ai-send-text');
          const sendIcon = document.getElementById('ai-send-icon');
          const input = document.getElementById('ai-input');
          
          sendButton.disabled = false;
          sendButton.style.opacity = '1';
          sendText.textContent = 'Generate';
          sendIcon.textContent = '⚡';
          input.disabled = false;
          
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
          
          // Auto-import after short delay (longer delay for subsequent imports)
          const userMessages = document.querySelectorAll('.ai-message-user');
          const importDelay = userMessages.length > 1 ? 2000 : 1000; // Longer delay if not first message
          const isImprovement = userMessages.length > 1; // Check if this is an improvement
          
          setTimeout(() => {
            if (isImprovement && lastMessage) {
              updateChatMessage(lastMessage, finalMessage.replace('🔄 Importing to n8n editor...', '🗑️ Clearing existing workflow and importing new version...'), false);
            }
            
            importWorkflow(message.workflow, isImprovement);
            
            setTimeout(() => {
              if (lastMessage) {
                const successMessage = isImprovement ? 
                  '✅ Workflow updated successfully!' : 
                  '✅ Workflow imported to n8n editor!';
                updateChatMessage(lastMessage, finalMessage.replace('🔄 Importing to n8n editor...', successMessage).replace('🗑️ Clearing existing workflow and importing new version...', successMessage), false);
              }
            }, 500);
          }, importDelay);
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
    console.log('🎯 Initializing modern AI interface');
    
    try {
      injectStyles();
      const container = createInterface();
      const button = createFloatingButton();
      
      // Listen for background messages
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          console.log('📨 Message from background:', message.type);
          handleBackgroundMessage(message);
          sendResponse({ received: true });
        });
        console.log('✅ Background listeners configured');
      }
      
      console.log('🎉 Modern AI interface ready');
      
      // Listen for inject script messages
      window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        
        if (event.data.type === 'IMPORT_SUCCESS') {
          // Success message already handled in workflow completion
        } else if (event.data.type === 'IMPORT_ERROR') {
          // Error message already handled in workflow error
        }
      });
      
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
} 