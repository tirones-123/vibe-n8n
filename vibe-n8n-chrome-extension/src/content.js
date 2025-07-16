/**
 * Content Script pour l'extension n8n AI Assistant
 * Injecte le panneau latéral et gère l'interface utilisateur
 */

// PREMIER TEST : Est-ce que ce script se charge ?
console.log('%c🚀 n8n AI Assistant: SCRIPT CHARGÉ !', 'background: green; color: white; font-size: 16px; padding: 5px;');

// Test immédiat d'injection dans le DOM
(function testImmediate() {
  const testDiv = document.createElement('div');
  testDiv.id = 'n8n-ai-test';
  testDiv.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: red;
    color: white;
    padding: 10px;
    z-index: 99999;
    border-radius: 5px;
    font-family: monospace;
  `;
  testDiv.textContent = '✅ Extension chargée !';
  document.body.appendChild(testDiv);
  
  setTimeout(() => {
    testDiv.remove();
  }, 3000);
})();

console.log('📍 URL actuelle:', window.location.href);
console.log('🌐 Domain:', window.location.hostname);
console.log('📄 Pathname:', window.location.pathname);

// Test simple : on est sur n8n ET sur une page de workflow ?
const isN8n = window.location.hostname.includes('n8n.io') || 
              window.location.hostname.includes('n8n.cloud') || 
              window.location.hostname.includes('localhost');

const isWorkflowPage = window.location.pathname.includes('/workflow/') || 
                       window.location.pathname.includes('/execution/') ||
                       window.location.pathname.includes('/editor/') ||
                       (window.location.hostname.includes('localhost') && window.location.pathname === '/');

console.log('🔍 Est-ce n8n ?', isN8n);
console.log('🔍 Est-ce une page de workflow ?', isWorkflowPage);

if (!isN8n || !isWorkflowPage) {
  console.log('❌ Pas sur une page de workflow n8n, arrêt');
  
  // Si on est sur n8n mais pas sur une page de workflow, afficher un message d'aide
  if (isN8n && !isWorkflowPage) {
    setTimeout(() => {
      const helpDiv = document.createElement('div');
      helpDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #3b82f6;
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 9999;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      `;
      helpDiv.innerHTML = `
        <div style="margin-bottom: 8px; font-weight: 600;">🤖 n8n AI Assistant</div>
        <div style="margin-bottom: 12px;">Pour utiliser l'assistant IA, allez sur une page d'édition de workflow.</div>
        <button onclick="window.open('/workflows', '_blank'); this.parentElement.remove();" 
                style="background: white; color: #3b82f6; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
          Voir mes workflows
        </button>
        <button onclick="this.parentElement.remove();" 
                style="background: none; color: white; border: 1px solid white; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-left: 8px; font-size: 12px;">
          OK
        </button>
      `;
      document.body.appendChild(helpDiv);
      
      // Auto-remove après 10 secondes
      setTimeout(() => {
        if (helpDiv.parentElement) helpDiv.remove();
      }, 10000);
    }, 1000);
  }
} else if (window.__n8nAiAssistantLoaded) {
  console.log('⚠️ Extension déjà chargée dans ce contexte');
} else {
  console.log('✅ Sur une page de workflow n8n, continuer...');
  window.__n8nAiAssistantLoaded = true;
  
  // Injecter le script inject.js dans le contexte de la page pour accéder à Pinia
  const injectScript = document.createElement('script');
  injectScript.src = chrome.runtime.getURL('src/inject.js');
  injectScript.onload = () => injectScript.remove();
  (document.head || document.documentElement).appendChild(injectScript);

  // État de l'application
  let isOpen = false;
  let messages = [];
  let currentStreamingMessage = null;
  let nodeVersions = null; // Cache des versions des nodes

  // Récupérer les versions des nodes depuis l'API n8n
  async function fetchNodeVersions() {
    console.log('🔍 Récupération des versions des nodes...');
    
    try {
      // Construire l'URL de l'API en fonction de l'instance
      const baseUrl = window.location.origin;
      const nodeTypesUrl = `${baseUrl}/rest/node-types`;
      
      console.log('📡 Appel API:', nodeTypesUrl);
      
      // Pour les instances cloud, essayer d'abord avec l'API publique
      let response;
      
      try {
        response = await fetch(nodeTypesUrl, {
          method: 'GET',
          credentials: 'include', // Important pour les cookies de session
          headers: {
            'Accept': 'application/json'
          }
        });
      } catch (fetchError) {
        console.warn('⚠️ Erreur fetch directe:', fetchError.message);
        
        // Si c'est une instance cloud, essayer via l'API publique
        if (window.location.hostname.includes('n8n.cloud') || window.location.hostname.includes('n8n.io')) {
          console.log('🌐 Tentative via API publique n8n...');
          
          // Pour les instances cloud, on peut essayer de récupérer depuis le script injecté
          return await fetchNodeVersionsViaInject();
        }
        
        throw fetchError;
      }
      
      if (!response.ok) {
        // Si 401/403, c'est probablement un problème d'auth
        if (response.status === 401 || response.status === 403) {
          console.warn('⚠️ Problème d\'authentification, tentative via inject script...');
          return await fetchNodeVersionsViaInject();
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const nodeTypes = await response.json();
      console.log('📦 Node types reçus:', Object.keys(nodeTypes).length, 'types');
      
      // Transformer en mapping { nodeName: maxVersion }
      const versions = {};
      
      for (const [nodeType, versionData] of Object.entries(nodeTypes)) {
        // Extraire le nom simple du node (sans le préfixe n8n-nodes-base.)
        const simpleName = nodeType.split('.').pop();
        
        // Trouver la version maximale
        const versionNumbers = Object.keys(versionData)
          .map(v => parseInt(v))
          .filter(v => !isNaN(v));
        
        if (versionNumbers.length > 0) {
          const maxVersion = Math.max(...versionNumbers);
          versions[simpleName] = maxVersion;
          
          // Aussi stocker avec le nom complet
          versions[nodeType] = maxVersion;
        }
      }
      
      console.log('✅ Versions extraites:', Object.keys(versions).length, 'nodes');
      console.log('📊 Exemple de versions:', Object.entries(versions).slice(0, 5));
      
      // Stocker dans le localStorage pour persistance
      localStorage.setItem('n8n-ai-node-versions', JSON.stringify(versions));
      localStorage.setItem('n8n-ai-node-versions-timestamp', Date.now().toString());
      
      return versions;
      
    } catch (error) {
      console.error('❌ Erreur récupération node-types:', error);
      
      // Essayer de récupérer depuis le cache
      const cached = localStorage.getItem('n8n-ai-node-versions');
      if (cached) {
        console.log('📦 Utilisation du cache des versions');
        return JSON.parse(cached);
      }
      
      // Fallback: retourner null (le backend utilisera les versions latest)
      return null;
    }
  }

  // Récupérer les versions via le script injecté (pour contourner CORS/auth)
  async function fetchNodeVersionsViaInject() {
    return new Promise((resolve) => {
      console.log('🔄 Tentative de récupération via inject script...');
      
      // Envoyer un message au script injecté
      window.postMessage({ type: 'GET_NODE_VERSIONS' }, '*');
      
      // Écouter la réponse
      const listener = (event) => {
        if (event.source !== window) return;
        if (event.data.type === 'NODE_VERSIONS_RESPONSE') {
          window.removeEventListener('message', listener);
          
          if (event.data.versions) {
            console.log('✅ Versions reçues via inject:', Object.keys(event.data.versions).length, 'nodes');
            
            // Stocker dans le cache
            localStorage.setItem('n8n-ai-node-versions', JSON.stringify(event.data.versions));
            localStorage.setItem('n8n-ai-node-versions-timestamp', Date.now().toString());
            
            resolve(event.data.versions);
          } else {
            console.warn('⚠️ Pas de versions reçues via inject');
            resolve(null);
          }
        }
      };
      
      window.addEventListener('message', listener);
      
      // Timeout après 5 secondes
      setTimeout(() => {
        window.removeEventListener('message', listener);
        console.warn('⚠️ Timeout récupération versions via inject');
        resolve(null);
      }, 5000);
    });
  }

  // Vérifier et mettre à jour le cache des versions si nécessaire
  async function ensureNodeVersions() {
    // Vérifier si on a déjà les versions en mémoire
    if (nodeVersions) {
      return nodeVersions;
    }
    
    // Vérifier le cache localStorage
    const cached = localStorage.getItem('n8n-ai-node-versions');
    const cacheTimestamp = localStorage.getItem('n8n-ai-node-versions-timestamp');
    
    if (cached && cacheTimestamp) {
      const age = Date.now() - parseInt(cacheTimestamp);
      const maxAge = 24 * 60 * 60 * 1000; // 24 heures
      
      if (age < maxAge) {
        console.log('📦 Utilisation du cache des versions (âge:', Math.round(age / 1000 / 60), 'minutes)');
        nodeVersions = JSON.parse(cached);
        return nodeVersions;
      }
    }
    
    // Récupérer les versions fraîches
    nodeVersions = await fetchNodeVersions();
    return nodeVersions;
  }

  // Créer le panneau latéral
  function createSidePanel() {
    console.log('🎨 Création du panneau');
    
    // Supprimer s'il existe
    const existing = document.getElementById('n8n-ai-assistant');
    if (existing) existing.remove();
    
    const panel = document.createElement('div');
    panel.id = 'n8n-ai-assistant';
    panel.style.cssText = `
      position: fixed;
      top: 0;
      right: -400px;
      width: 400px;
      height: 100vh;
      background: white;
      box-shadow: -2px 0 10px rgba(0,0,0,0.1);
      transition: right 0.3s ease;
      z-index: 9999;
      font-family: Arial, sans-serif;
    `;
    
    panel.innerHTML = `
      <div style="padding: 20px; background: #f5f5f5; border-bottom: 1px solid #ddd;">
        <h3 style="margin: 0;">🤖 AI Assistant</h3>
        <button id="ai-close" style="float: right; margin-top: -25px; background: none; border: none; font-size: 20px; cursor: pointer;">×</button>
      </div>
      <div style="padding: 20px; height: calc(100vh - 180px); overflow-y: auto;">
        <div style="padding: 10px; background: #f0f8ff; border-radius: 5px; margin-bottom: 10px;">
          👋 Bonjour ! Je suis votre assistant IA pour n8n.
        </div>
        <div id="ai-messages"></div>
      </div>
      <div style="padding: 20px; border-top: 1px solid #ddd; background: white;">
        <div style="display: flex; gap: 10px; align-items: flex-end;">
          <textarea 
            id="ai-input" 
            placeholder="Ex: Crée un workflow qui envoie les emails sur Slack..." 
            style="flex: 1; height: 60px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: none; font-family: inherit; font-size: 14px;"
          ></textarea>
          <button 
            id="ai-send" 
            style="padding: 12px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; height: 44px; min-width: 44px; display: flex; align-items: center; justify-content: center; transition: background 0.2s;"
            title="Envoyer le message"
          >
            ➤
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    console.log('✅ Panneau ajouté');

    // Events
    document.getElementById('ai-close').onclick = togglePanel;
    const sendButton = document.getElementById('ai-send');
    const inputField = document.getElementById('ai-input');
    
    sendButton.onclick = sendMessage;
    
    // Effet hover du bouton
    sendButton.onmouseenter = () => {
      sendButton.style.background = '#0056b3';
      sendButton.style.transform = 'scale(1.05)';
    };
    sendButton.onmouseleave = () => {
      sendButton.style.background = '#007bff';
      sendButton.style.transform = 'scale(1)';
    };
    
    // Envoyer avec Entrée (sans Shift)
    inputField.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    };
    
    return panel;
  }

  // Créer le bouton flottant
  function createFloatingButton() {
    console.log('🔵 Création du bouton');
    
    // Supprimer s'il existe
    const existing = document.getElementById('n8n-ai-toggle');
    if (existing) existing.remove();
    
    const button = document.createElement('button');
    button.id = 'n8n-ai-toggle';
    button.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      font-size: 24px;
      z-index: 9998;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    button.innerHTML = '🤖';
    button.title = 'Ouvrir l\'assistant IA';
    button.onclick = togglePanel;
    
    document.body.appendChild(button);
    console.log('✅ Bouton ajouté');
    
    return button;
  }

  // Toggle panel
  function togglePanel() {
    console.log('🔄 Toggle panel');
    isOpen = !isOpen;
    const panel = document.getElementById('n8n-ai-assistant');
    const button = document.getElementById('n8n-ai-toggle');
    
    if (isOpen) {
      panel.style.right = '0px';
      button.style.background = '#dc3545';
    } else {
      panel.style.right = '-400px';
      button.style.background = '#007bff';
    }
  }

  // Envoyer message
  async function sendMessage() {
    const input = document.getElementById('ai-input');
    const message = input.value.trim();
    if (!message) return;

    console.log('💬 Message:', message);
    
    // Ajouter à l'affichage
    const messagesDiv = document.getElementById('ai-messages');
    messagesDiv.innerHTML += `
      <div style="margin: 10px 0; padding: 10px; background: #e3f2fd; border-radius: 5px;">
        <strong>Vous:</strong> ${message}
      </div>
      <div id="assistant-response" style="margin: 10px 0; padding: 10px; background: #f3e5f5; border-radius: 5px;">
        <strong>Assistant:</strong> <span class="loading-dots">Analyse du contexte...</span>
      </div>
    `;
    
    input.value = '';
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
      // Récupérer les versions des nodes (avec cache)
      const versions = await ensureNodeVersions();
      console.log('📊 Versions disponibles:', versions ? Object.keys(versions).length + ' nodes' : 'aucune');

      // Récupérer le contexte du workflow actuel
      const context = await getWorkflowContext();
      console.log('📋 Contexte workflow:', context);
      
      // Envoyer au background avec le contexte actuel et les versions
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        console.log('🚀 Envoi vers background script avec versions...');
        
        chrome.runtime.sendMessage({
          type: 'SEND_TO_CLAUDE',
          prompt: message,
          context: context,
          versions: versions // Ajouter les versions ici
        }).then(response => {
          console.log('✅ Réponse du background:', response);
        }).catch(err => {
          console.error('❌ Erreur communication background:', err);
          const responseDiv = document.getElementById('assistant-response');
          if (responseDiv) {
            responseDiv.innerHTML = '<strong>Assistant:</strong> ❌ Erreur de communication avec le service worker';
          }
        });
      }
    } catch (err) {
      console.error('❌ Erreur récupération contexte/versions:', err);
      // Continuer sans versions si erreur
      chrome.runtime.sendMessage({
        type: 'SEND_TO_CLAUDE',
        prompt: message,
        context: { nodes: [], connections: {} },
        versions: null
      });
    }
  }

  // Récupérer le contexte du workflow actuel
  function getWorkflowContext() {
    return new Promise((resolve, reject) => {
      // Envoyer un message au script injecté pour récupérer le contexte
      window.postMessage({ type: 'GET_WORKFLOW_CONTEXT' }, '*');
      
      // Écouter la réponse
      const listener = (event) => {
        if (event.source !== window) return;
        if (event.data.type === 'WORKFLOW_CONTEXT') {
          window.removeEventListener('message', listener);
          resolve(event.data.context);
        }
      };
      
      window.addEventListener('message', listener);
      
      // Timeout après 2 secondes
      setTimeout(() => {
        window.removeEventListener('message', listener);
        reject(new Error('Timeout récupération contexte'));
      }, 2000);
    });
  }

  // Gérer les messages du background script
  function handleBackgroundMessage(message) {
    const responseDiv = document.getElementById('assistant-response');
    if (!responseDiv) return;

    switch (message.type) {
      case 'MODE_DETECTED':
        // Afficher le mode détecté
        const modeIcon = message.mode === 'create' ? '🆕' : '✏️';
        const modeText = message.mode === 'create' ? 'Création' : 'Modification';
        responseDiv.innerHTML = `<strong>Assistant:</strong> <span class="loading-dots">${modeIcon} ${modeText} en cours...</span>`;
        break;

      case 'CLAUDE_STREAM_START':
        if (!responseDiv.innerHTML.includes('Création') && !responseDiv.innerHTML.includes('Modification')) {
          responseDiv.innerHTML = '<strong>Assistant:</strong> <span class="loading-dots">Claude réfléchit...</span>';
        }
        break;
        
      case 'CLAUDE_STREAM_TEXT':
        // Démarrer ou continuer la réponse
        if (!responseDiv.dataset.started) {
          responseDiv.innerHTML = '<strong>Assistant:</strong> ';
          responseDiv.dataset.started = 'true';
        }
        responseDiv.innerHTML += message.text;
        
        // Scroll automatique
        const messagesDiv = document.getElementById('ai-messages');
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        break;

      case 'COMPLETE_WORKFLOW_READY':
        // Workflow complet reçu (mode create)
        console.log('📦 Workflow complet reçu:', message.workflow);
        
        // Afficher un message d'import en cours
        const importingMsg = document.createElement('div');
        importingMsg.style.cssText = 'margin-top: 12px; padding: 10px; background: #fef3c7; border-radius: 4px; color: #92400e; font-weight: 500;';
        importingMsg.innerHTML = '⏳ Import du workflow en cours...';
        responseDiv.appendChild(importingMsg);
        
        // Afficher un aperçu du workflow
        const preview = document.createElement('div');
        preview.style.cssText = 'margin-top: 8px; padding: 8px; background: #f0f9ff; border-radius: 4px; font-size: 12px;';
        preview.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 4px;">📊 Aperçu du workflow:</div>
          <div>• ${message.workflow.nodes?.length || 0} nœuds</div>
          <div>• ${Object.keys(message.workflow.connections || {}).length} connexions</div>
        `;
        responseDiv.appendChild(preview);
        
        // Importer automatiquement après un court délai
        setTimeout(() => {
          importingMsg.remove();
          importWorkflow(message.workflow);
        }, 500);
        break;

      case 'WORKFLOW_PARSE_ERROR':
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'margin-top: 8px; padding: 8px; background: #fef2f2; border-radius: 4px; color: #dc2626;';
        errorDiv.innerHTML = `❌ ${message.error}`;
        responseDiv.appendChild(errorDiv);
        break;
        
      case 'TOOL_CALL_SUCCESS':
        const successInfo = document.createElement('div');
        successInfo.style.cssText = 'margin-top: 8px; padding: 6px 10px; background: #dcfce7; border-radius: 4px; font-size: 12px; color: #166534;';
        successInfo.innerHTML = `✅ ${message.message}`;
        responseDiv.appendChild(successInfo);
        break;
        
      case 'TOOL_CALL_ERROR':
        const errorInfo = document.createElement('div');
        errorInfo.style.cssText = 'margin-top: 8px; padding: 6px 10px; background: #fef2f2; border-radius: 4px; font-size: 12px; color: #dc2626;';
        errorInfo.innerHTML = `❌ ${message.error}`;
        responseDiv.appendChild(errorInfo);
        break;
        
      case 'CLAUDE_STREAM_END':
        responseDiv.removeAttribute('data-started');
        const endInfo = document.createElement('div');
        endInfo.style.cssText = 'margin-top: 8px; font-size: 11px; color: #666; font-style: italic;';
        endInfo.textContent = '✅ Terminé';
        responseDiv.appendChild(endInfo);
        break;
        
      case 'CLAUDE_ERROR':
        responseDiv.innerHTML = `<strong>Assistant:</strong> ❌ Erreur: ${message.error}`;
        break;
        
      default:
        console.log('Type de message inconnu:', message.type);
    }
  }

  // Importer un workflow complet dans n8n
  function importWorkflow(workflowData) {
    console.log('🔄 Import du workflow:', workflowData);
    
    // Envoyer le workflow au script injecté
    window.postMessage({ 
      type: 'IMPORT_WORKFLOW',
      workflow: workflowData
    }, '*');
  }

  // Initialisation
  async function init() {
    console.log('🎯 INITIALISATION');
    
    try {
      const panel = createSidePanel();
      const button = createFloatingButton();
      
      // Récupérer les versions des nodes en arrière-plan
      fetchNodeVersions().then(versions => {
        if (versions) {
          console.log('✅ Versions des nodes chargées au démarrage:', Object.keys(versions).length, 'nodes');
        } else {
          console.log('⚠️ Impossible de charger les versions des nodes au démarrage');
        }
      }).catch(err => {
        console.error('❌ Erreur chargement versions:', err);
      });
      
      // Écouter les messages du background script
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          console.log('📨 Message reçu du background:', JSON.stringify(message, null, 2));
          handleBackgroundMessage(message);
          sendResponse({ received: true });
        });
        console.log('✅ Listeners background configurés');
      }
      
      console.log('🎉 SUCCÈS ! Extension prête');
      console.log('📍 Panel ID:', panel.id);
      console.log('📍 Button ID:', button.id);
      
      // Écouter aussi les messages du script injecté
      window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        
        if (event.data.type === 'IMPORT_SUCCESS') {
          const responseDiv = document.getElementById('assistant-response');
          if (responseDiv) {
            const successMsg = document.createElement('div');
            successMsg.style.cssText = 'margin-top: 12px; padding: 10px; background: #dcfce7; border-radius: 4px; color: #166534; font-weight: 600;';
            successMsg.innerHTML = `✅ ${event.data.message}`;
            responseDiv.appendChild(successMsg);
          }
        } else if (event.data.type === 'IMPORT_ERROR') {
          const responseDiv = document.getElementById('assistant-response');
          if (responseDiv) {
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = 'margin-top: 12px; padding: 10px; background: #fef2f2; border-radius: 4px; color: #dc2626;';
            errorMsg.innerHTML = `❌ Erreur d'import: ${event.data.error}`;
            responseDiv.appendChild(errorMsg);
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Erreur init:', error);
    }

    // Ajouter les styles CSS pour les animations
    const style = document.createElement('style');
    style.textContent = `
      .loading-dots::after {
        content: '';
        animation: loading-dots 1.5s infinite;
      }
      
      @keyframes loading-dots {
        0%, 20% { content: '.'; }
        40% { content: '..'; }
        60%, 100% { content: '...'; }
      }
    `;
    document.head.appendChild(style);
  }

  // Démarrer
  if (document.readyState === 'loading') {
    console.log('⏳ Attente DOM...');
    document.addEventListener('DOMContentLoaded', init);
  } else {
    console.log('✅ DOM ready, init immédiate');
    init();
  }
  
  // Force init après 1 seconde au cas où
  setTimeout(() => {
    if (!document.getElementById('n8n-ai-toggle')) {
      console.log('🔧 Force init après timeout');
      init();
    }
  }, 1000);
} 