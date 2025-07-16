/**
 * Content Script pour l'extension n8n AI Assistant
 * Injecte le panneau latéral et gère l'interface utilisateur pour le système workflow RAG
 */

// PREMIER TEST : Est-ce que ce script se charge ?
console.log('%c🚀 n8n AI Assistant (Workflow RAG): SCRIPT CHARGÉ !', 'background: green; color: white; font-size: 16px; padding: 5px;');

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
  testDiv.textContent = '✅ Extension Workflow RAG chargée !';
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
        <div style="margin-bottom: 8px; font-weight: 600;">🤖 n8n AI Assistant (RAG)</div>
        <div style="margin-bottom: 12px;">Pour utiliser l'assistant IA workflow RAG, allez sur une page d'édition de workflow.</div>
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
  let currentWorkflowGeneration = null;
  let currentWorkflowId = null; // Nouveau : tracker le workflow actuel
  let autoImprovementEnabled = false; // Nouveau : option d'amélioration auto

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
        <h3 style="margin: 0;">🤖 AI Assistant (RAG)</h3>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Génération de workflows par IA</p>
        <button id="ai-close" style="float: right; margin-top: -35px; background: none; border: none; font-size: 20px; cursor: pointer;">×</button>
      </div>
      <div style="padding: 20px; height: calc(100vh - 180px); overflow-y: auto;">
        <div style="padding: 10px; background: #f0f8ff; border-radius: 5px; margin-bottom: 10px;">
          👋 Bonjour ! Je suis votre assistant IA pour générer des workflows n8n complets.
          <br><br>
          💡 <strong>Décrivez simplement</strong> le workflow que vous voulez et je le créerai pour vous !
        </div>
        <div id="ai-messages"></div>
      </div>
      <div style="padding: 20px; border-top: 1px solid #ddd; background: white;">
        <div style="display: flex; gap: 10px; align-items: flex-end;">
          <textarea 
            id="ai-input" 
            placeholder="Ex: Crée un workflow qui synchronise Slack avec Notion toutes les heures..." 
            style="flex: 1; height: 60px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: none; font-family: inherit; font-size: 14px;"
          ></textarea>
          <button 
            id="ai-send" 
            style="padding: 12px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; height: 44px; min-width: 44px; display: flex; align-items: center; justify-content: center; transition: background 0.2s;"
            title="Générer le workflow"
          >
            ➤
          </button>
        </div>
        <div style="margin-top: 8px; font-size: 11px; color: #666;">
          💡 Plus vous êtes précis, meilleur sera le workflow généré !
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
    button.title = 'Ouvrir l\'assistant IA (Workflow RAG)';
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
        <strong>Assistant:</strong> <span class="loading-dots">Démarrage de la génération...</span>
      </div>
    `;
    
    input.value = '';
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Nouveau : Timeout de sécurité frontend
    let timeoutHandle = null;
    let lastProgressTime = Date.now();
    
    // Fonction pour mettre à jour le timestamp de dernière activité
    window.updateLastProgress = () => {
      lastProgressTime = Date.now();
    };
    
    // Timeout de 8 minutes sans progression (workflows complexes peuvent prendre du temps)
    timeoutHandle = setTimeout(() => {
      const responseDiv = document.getElementById('assistant-response');
      if (responseDiv) {
        responseDiv.innerHTML = `
          <strong>Assistant:</strong> ⏱️ <strong>Timeout détecté</strong><br>
          📌 Le backend ne répond plus depuis plus de 8 minutes<br>
          🔄 <em>Solutions :</em><br>
          • Réessayez avec un prompt plus simple<br>
          • Vérifiez que le backend fonctionne<br>
          • Rechargez la page si le problème persiste
        `;
      }
    }, 480000); // 8 minutes

    try {
      // Vérifier que le contexte d'extension est valide
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        clearTimeout(timeoutHandle);
        console.error('❌ Contexte d\'extension invalide - rechargez l\'extension');
        const responseDiv = document.getElementById('assistant-response');
        if (responseDiv) {
          responseDiv.innerHTML = `
            <strong>Assistant:</strong> ❌ <strong>Extension déconnectée</strong><br>
            📌 <em>Solution :</em> Rechargez l'extension Chrome dans <code>chrome://extensions/</code><br>
            🔄 Ou rechargez cette page (Ctrl+R / Cmd+R)
          `;
        }
        return;
      }

      // Envoyer au background (seulement le prompt)
      console.log('🚀 Envoi vers backend workflow RAG...');
      
      chrome.runtime.sendMessage({
        type: 'SEND_TO_CLAUDE',
        prompt: message
      }).then(response => {
        console.log('✅ Réponse du background:', response);
      }).catch(err => {
        clearTimeout(timeoutHandle);
        console.error('❌ Erreur communication background:', err);
        
        // Si l'erreur contient "Extension context invalidated"
        if (err.message && err.message.includes('Extension context invalidated')) {
          const responseDiv = document.getElementById('assistant-response');
          if (responseDiv) {
            responseDiv.innerHTML = `
              <strong>Assistant:</strong> ❌ <strong>Extension déconnectée</strong><br>
              📌 <em>Solution :</em> Rechargez l'extension Chrome dans <code>chrome://extensions/</code><br>
              🔄 Ou rechargez cette page (Ctrl+R / Cmd+R)
            `;
          }
        } else {
          const responseDiv = document.getElementById('assistant-response');
          if (responseDiv) {
            responseDiv.innerHTML = '<strong>Assistant:</strong> ❌ Erreur de communication avec le service worker';
          }
        }
      });
      
      // Nettoyer le timeout quand on reçoit une réponse finale
      window.clearCurrentTimeout = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
      };
      
    } catch (err) {
      clearTimeout(timeoutHandle);
      console.error('❌ Erreur envoi message:', err);
      const responseDiv = document.getElementById('assistant-response');
      if (responseDiv) {
        responseDiv.innerHTML = '<strong>Assistant:</strong> ❌ Erreur lors de l\'envoi: ' + err.message;
      }
    }
  }

  // Gérer les messages du background script
  function handleBackgroundMessage(message) {
    const responseDiv = document.getElementById('assistant-response');
    if (!responseDiv) return;

    // Mettre à jour le timestamp de dernière activité
    if (window.updateLastProgress) {
      window.updateLastProgress();
    }

    switch (message.type) {
      case 'WORKFLOW_GENERATION_START':
        responseDiv.innerHTML = `<strong>Assistant:</strong> <span class="loading-dots">${message.message}</span>`;
        break;

      case 'WORKFLOW_SETUP':
        responseDiv.innerHTML = `<strong>Assistant:</strong> <span class="loading-dots">${message.message}</span>`;
        break;

      case 'WORKFLOW_SEARCH':
        responseDiv.innerHTML = `<strong>Assistant:</strong> <span class="loading-dots">${message.message}</span>`;
        break;

      case 'WORKFLOW_BUILDING':
        responseDiv.innerHTML = `<strong>Assistant:</strong> <span class="loading-dots">${message.message}</span>`;
        break;

      case 'WORKFLOW_PROGRESS':
        let progressMessage = message.message;
        if (message.workflows && message.workflows.length > 0) {
          progressMessage += `\n📚 Workflows similaires trouvés: ${message.workflows.join(', ')}`;
        }
        responseDiv.innerHTML = `<strong>Assistant:</strong> <span class="loading-dots">${progressMessage}</span>`;
        break;

      case 'WORKFLOW_COMPLETE':
        // Nettoyer le timeout car on a reçu une réponse finale
        if (window.clearCurrentTimeout) {
          window.clearCurrentTimeout();
        }
        
        if (message.workflow) {
          console.log('🎉 Workflow complet reçu:', message.workflow);
          
          let responseContent = '<strong>Assistant:</strong> ✅ Workflow généré avec succès !';
          
          // Afficher l'explication si disponible
          if (message.explanation) {
            responseContent += `
              <div style="margin: 12px 0; padding: 12px; background: #f0f9ff; border-radius: 6px; border-left: 4px solid #3b82f6;">
                <h4 style="margin: 0 0 8px 0; color: #1e40af;">📋 Détails du workflow :</h4>
                <p style="margin: 4px 0;"><strong>Résumé :</strong> ${message.explanation.summary}</p>
                <p style="margin: 4px 0;"><strong>Flux :</strong> ${message.explanation.flow}</p>
                <p style="margin: 4px 0;"><strong>Nœuds :</strong> ${message.explanation.nodes}</p>
                ${message.explanation.notes ? `<p style="margin: 4px 0;"><strong>Notes :</strong> ${message.explanation.notes}</p>` : ''}
              </div>
            `;
          }
          
          // Informations sur le workflow
          const nodeCount = message.workflow.nodes?.length || 0;
          const connectionCount = Object.keys(message.workflow.connections || {}).length;
          
          responseContent += `
            <div style="margin: 12px 0; padding: 10px; background: #fef3c7; border-radius: 4px; color: #92400e;">
              ⏳ Import en cours...
              <br>📊 ${nodeCount} nœuds, ${connectionCount} connexions
            </div>
          `;
          
          responseDiv.innerHTML = responseContent;
          
          // Importer automatiquement après un court délai
          setTimeout(() => {
            importWorkflow(message.workflow);
          }, 1000);
        }
        break;

      case 'WORKFLOW_ERROR':
        // Nettoyer le timeout car on a reçu une réponse finale (même si c'est une erreur)
        if (window.clearCurrentTimeout) {
          window.clearCurrentTimeout();
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'margin-top: 8px; padding: 8px; background: #fef2f2; border-radius: 4px; color: #dc2626;';
        errorDiv.innerHTML = `❌ ${message.error}`;
        responseDiv.appendChild(errorDiv);
        break;

      case 'WORKFLOW_IMPORT_SUCCESS':
        const successDiv = document.createElement('div');
        successDiv.style.cssText = 'margin-top: 12px; padding: 10px; background: #dcfce7; border-radius: 4px; color: #166534; font-weight: 600;';
        successDiv.innerHTML = `✅ ${message.message}`;
        responseDiv.appendChild(successDiv);
        break;

      case 'WORKFLOW_IMPORT_ERROR':
        const errorImportDiv = document.createElement('div');
        errorImportDiv.style.cssText = 'margin-top: 12px; padding: 10px; background: #fef2f2; border-radius: 4px; color: #dc2626;';
        errorImportDiv.innerHTML = `❌ Erreur d'import: ${message.error}`;
        responseDiv.appendChild(errorImportDiv);
        break;

      case 'CLAUDE_ERROR':
        // Nettoyer le timeout car on a reçu une réponse finale (même si c'est une erreur)
        if (window.clearCurrentTimeout) {
          window.clearCurrentTimeout();
        }
        
        responseDiv.innerHTML = `<strong>Assistant:</strong> ❌ Erreur: ${message.error}`;
        break;
      
      case 'WORKFLOW_CHUNKS_START':
        // Préparer le buffer pour recevoir les chunks
        window.__ragWorkflowBuffer = '';
        window.__ragWorkflowTotalChunks = message.totalChunks;
        window.__ragWorkflowChunksReceived = 0;
        window.__ragWorkflowExplanation = message.explanation;
        responseDiv.innerHTML = '<strong>Assistant:</strong> 📦 Réception du workflow (plusieurs chunks)...';
        break;
      
      case 'WORKFLOW_CHUNK':
        if (typeof window.__ragWorkflowBuffer === 'string') {
          window.__ragWorkflowBuffer += message.chunk;
          window.__ragWorkflowChunksReceived++;
          responseDiv.innerHTML = `<strong>Assistant:</strong> 📦 Réception du workflow... (${window.__ragWorkflowChunksReceived}/${window.__ragWorkflowTotalChunks})`;
        }
        break;
      
      case 'WORKFLOW_CHUNKS_END':
        if (typeof window.__ragWorkflowBuffer === 'string') {
          try {
            const workflowObj = JSON.parse(window.__ragWorkflowBuffer);
            console.log('🎉 Workflow complet (reconstruit) :', workflowObj);
            
            // Importer le workflow
            responseDiv.innerHTML = '<strong>Assistant:</strong> ✅ Workflow reçu, import en cours...';
            importWorkflow(workflowObj);
            
            // Afficher l'explication si on l'a
            if (window.__ragWorkflowExplanation) {
              const exp = window.__ragWorkflowExplanation;
              const expDiv = document.createElement('div');
              expDiv.style.cssText = 'margin-top: 12px; padding: 10px; background: #f0f9ff; border-radius: 4px; color: #0369a1;';
              expDiv.innerHTML = `<strong>Résumé :</strong> ${exp.summary}<br><strong>Flux :</strong> ${exp.flow}`;
              responseDiv.appendChild(expDiv);
            }
          } catch (parseErr) {
            console.error('❌ Erreur parsing workflow chunks:', parseErr);
            responseDiv.innerHTML = '<strong>Assistant:</strong> ❌ Erreur lors de la reconstruction du workflow';
          }
          // Nettoyer buffer
          window.__ragWorkflowBuffer = null;
          window.__ragWorkflowTotalChunks = 0;
          window.__ragWorkflowChunksReceived = 0;
        }
        break;
        
      default:
        console.log('Type de message inconnu:', message.type);
    }

    // Scroll automatique
    const messagesDiv = document.getElementById('ai-messages');
    if (messagesDiv) {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
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

  // Nouveau : Détecter l'ouverture d'un workflow
  function detectWorkflowChange() {
    const urlMatch = window.location.pathname.match(/\/workflow\/([^\/]+)/);
    const newWorkflowId = urlMatch ? urlMatch[1] : null;
    
    if (newWorkflowId && newWorkflowId !== currentWorkflowId) {
      currentWorkflowId = newWorkflowId;
      console.log('🔄 Nouveau workflow détecté:', newWorkflowId);
      
      // Attendre que le workflow soit chargé
      setTimeout(() => {
        checkForAutoImprovement();
      }, 2000);
    }
  }

  // Nouveau : Vérifier si on doit proposer une amélioration automatique
  async function checkForAutoImprovement() {
    // Récupérer le workflow actuel
    const currentWorkflow = await getCurrentWorkflow();
    
    if (currentWorkflow && currentWorkflow.nodes && currentWorkflow.nodes.length > 0) {
      console.log('📊 Workflow non-vide détecté:', currentWorkflow.nodes.length, 'nœuds');
      
      // Afficher une notification d'amélioration possible
      showWorkflowImprovementSuggestion(currentWorkflow);
    }
  }

  // Nouveau : Récupérer le workflow actuel via inject script
  function getCurrentWorkflow() {
    return new Promise((resolve) => {
      // Envoyer un message au script injecté
      window.postMessage({ type: 'GET_CURRENT_WORKFLOW' }, '*');
      
      // Écouter la réponse
      const listener = (event) => {
        if (event.source !== window) return;
        if (event.data.type === 'CURRENT_WORKFLOW_RESPONSE') {
          window.removeEventListener('message', listener);
          resolve(event.data.workflow);
        }
      };
      
      window.addEventListener('message', listener);
      
      // Timeout après 3 secondes
      setTimeout(() => {
        window.removeEventListener('message', listener);
        resolve(null);
      }, 3000);
    });
  }

  // Nouveau : Afficher une suggestion d'amélioration
  function showWorkflowImprovementSuggestion(currentWorkflow) {
    // Créer une notification en haut de la page
    const suggestion = document.createElement('div');
    suggestion.id = 'workflow-improvement-suggestion';
    suggestion.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 320px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;
    
    suggestion.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 20px; margin-right: 8px;">🎯</span>
        <strong>Améliorer ce workflow ?</strong>
      </div>
      <div style="margin-bottom: 12px; font-size: 13px; opacity: 0.9;">
        L'IA peut analyser et améliorer votre workflow existant (${currentWorkflow.nodes.length} nœuds détectés)
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="improve-workflow-btn" style="
          flex: 1;
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">
          ✨ Améliorer
        </button>
        <button id="dismiss-suggestion-btn" style="
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">
          ✕
        </button>
      </div>
    `;
    
    document.body.appendChild(suggestion);
    
    // Events
    document.getElementById('improve-workflow-btn').onclick = () => {
      suggestion.remove();
      startWorkflowImprovement(currentWorkflow);
    };
    
    document.getElementById('dismiss-suggestion-btn').onclick = () => {
      suggestion.remove();
    };
    
    // Auto-dismiss après 10 secondes
    setTimeout(() => {
      if (suggestion.parentElement) {
        suggestion.remove();
      }
    }, 10000);
  }

  // Nouveau : Démarrer l'amélioration du workflow
  async function startWorkflowImprovement(currentWorkflow) {
    // Ouvrir le panneau s'il n'est pas ouvert
    if (!isOpen) {
      togglePanel();
    }
    
    // Ajouter un message automatique
    const messagesDiv = document.getElementById('ai-messages');
    messagesDiv.innerHTML += `
      <div style="margin: 10px 0; padding: 10px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
        <strong>🎯 Amélioration automatique en cours...</strong>
        <div style="margin-top: 8px; font-size: 12px; color: #856404;">
          Analyse du workflow actuel (${currentWorkflow.nodes.length} nœuds) et génération d'une version améliorée...
        </div>
      </div>
      <div id="assistant-response" style="margin: 10px 0; padding: 10px; background: #f3e5f5; border-radius: 5px;">
        <strong>Assistant:</strong> <span class="loading-dots">Analyse du workflow existant...</span>
      </div>
    `;
    
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
      // Envoyer au backend avec le workflow actuel
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        console.log('🚀 Envoi vers backend workflow RAG pour amélioration...');
        
        chrome.runtime.sendMessage({
          type: 'IMPROVE_WORKFLOW',
          currentWorkflow: currentWorkflow,
          improvementRequest: "Analyse ce workflow et améliore-le : optimise les connexions, ajoute une gestion d'erreur si nécessaire, améliore la structure et suggère des améliorations de performance."
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
      console.error('❌ Erreur amélioration workflow:', err);
      const responseDiv = document.getElementById('assistant-response');
      if (responseDiv) {
        responseDiv.innerHTML = '<strong>Assistant:</strong> ❌ Erreur lors de l\'amélioration: ' + err.message;
      }
    }
  }

  // Initialisation
  async function init() {
    console.log('🎯 INITIALISATION WORKFLOW RAG');
    
    try {
      const panel = createSidePanel();
      const button = createFloatingButton();
      
      // Nouveau : Surveiller les changements d'URL
      let lastUrl = window.location.pathname;
      const urlObserver = new MutationObserver(() => {
        if (window.location.pathname !== lastUrl) {
          lastUrl = window.location.pathname;
          detectWorkflowChange();
        }
      });
      urlObserver.observe(document.body, { childList: true, subtree: true });
      
      // Détecter immédiatement si on est sur un workflow
      detectWorkflowChange();
      
      // Écouter les messages du background script
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          console.log('📨 Message reçu du background:', JSON.stringify(message, null, 2));
          handleBackgroundMessage(message);
          sendResponse({ received: true });
        });
        console.log('✅ Listeners background configurés');
      }
      
      console.log('🎉 SUCCÈS ! Extension workflow RAG prête');
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
      
      @keyframes slideIn {
        0% { transform: translateX(100%); opacity: 0; }
        100% { transform: translateX(0); opacity: 1; }
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