/**
 * Service Worker pour l'extension n8n AI Assistant
 * Gère la communication avec le backend workflow RAG
 */

// Importer la configuration
importScripts('./config.js');

// Écoute des messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SEND_TO_CLAUDE') {
    handleWorkflowRAGRequest(request.prompt, sender.tab.id)
      .catch(error => {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: 'CLAUDE_ERROR',
          error: error.message
        });
      });
    sendResponse({ received: true });
    return true;
  }
  
  // Nouveau : Support pour l'amélioration de workflow
  if (request.type === 'IMPROVE_WORKFLOW') {
    handleWorkflowImprovementRequest(request.currentWorkflow, request.improvementRequest, sender.tab.id)
      .catch(error => {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: 'CLAUDE_ERROR',
          error: error.message
        });
      });
    sendResponse({ received: true });
    return true;
  }
});

/**
 * Envoie une requête au backend workflow RAG
 */
async function handleWorkflowRAGRequest(prompt, tabId) {
  console.log(`🎯 Envoi de la requête au backend workflow RAG`);
  console.log('📝 Prompt:', prompt);
  
  // Notifier le début de traitement
  chrome.tabs.sendMessage(tabId, {
    type: 'WORKFLOW_GENERATION_START',
    message: 'Démarrage de la génération de workflow...'
  });

  const requestBody = {
    prompt: prompt // Seulement le prompt pour le backend workflow RAG
  };

  console.log('📤 Envoi requête workflow RAG');
  console.log('📦 Payload:', JSON.stringify(requestBody));

  // Timeout de sécurité pour éviter le chargement infini
  const timeoutMs = 900000; // 15 minutes (générations longues possibles)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout: La génération prend trop de temps (15 min)')), timeoutMs);
  });

  try {
    console.log('🌐 Tentative de fetch vers:', CONFIG.API_URL);
    
    const fetchPromise = fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    // Race entre fetch et timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    console.log('📨 Réponse reçue:', response.status, response.statusText);

    if (!response.ok) {
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

    // Timeout pour le streaming (si pas d'événement pendant 5min)
    const streamingTimeoutMs = 300000;
    
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
          chrome.tabs.sendMessage(tabId, {
            type: 'CLAUDE_ERROR',
            error: 'Timeout: Le serveur ne répond plus. Essayez un prompt plus simple.'
          });
          return;
        }

        const { done, value } = result;
        if (done) {
          // Traiter tout éventuel contenu restant dans le buffer (dernier événement non suivi d'un \n)
          if (buffer.trim().startsWith('data: ')) {
            try {
              const data = JSON.parse(buffer.trim().slice(6));
              eventCount++;
              console.log('📡 Événement final (buffer) reçu:', data.type);
              await processWorkflowRAGResponse(data, tabId);
            } catch (e) {
              console.log('⚠️ Parse error (buffer final):', e.message);
            }
          }

          console.log('✅ Stream terminé. Total événements:', eventCount);
          console.log('🔍 DEBUG: Stream terminé, derniers types d\'événements:', eventCount > 0 ? 'OK' : 'AUCUN');
          
          if (eventCount === 0) {
            chrome.tabs.sendMessage(tabId, {
              type: 'CLAUDE_ERROR',
              error: 'Aucune donnée reçue du serveur. Vérifiez la configuration backend.'
            });
          } else {
            console.log('🔍 DEBUG: Le stream s\'est terminé normalement après', eventCount, 'événements');
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
              console.log('📡 Événement reçu:', data.type);
              
              // DEBUG : Log complet pour event complete
              if (data.type === 'complete') {
                console.log('🚨 EVENT COMPLETE REÇU ! Data complète:', JSON.stringify(data, null, 2));
              }
              
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

  } catch (error) {
    console.error('❌ Erreur complète:', error);
    console.error('❌ Error stack:', error.stack);
    
    let errorMessage = error.message;
    if (error.message.includes('Timeout')) {
      errorMessage = error.message + ' Essayez un prompt plus simple ou réessayez plus tard.';
    } else if (error.message.includes('Failed to fetch')) {
      errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
    }
    
    // Envoyer une erreur détaillée
    chrome.tabs.sendMessage(tabId, {
      type: 'CLAUDE_ERROR',
      error: errorMessage
    });
    
    throw error;
  }
}

/**
 * Nouveau : Gère l'amélioration d'un workflow existant
 */
async function handleWorkflowImprovementRequest(currentWorkflow, improvementRequest, tabId) {
  console.log(`🎯 Amélioration de workflow demandée`);
  console.log('📝 Workflow actuel:', currentWorkflow);
  console.log('📝 Demande:', improvementRequest);
  
  // Notifier le début de traitement
  chrome.tabs.sendMessage(tabId, {
    type: 'WORKFLOW_GENERATION_START',
    message: 'Analyse du workflow existant...'
  });

  const requestBody = {
    prompt: improvementRequest,
    baseWorkflow: currentWorkflow // Nouveau : inclure le workflow de base
  };

  console.log('📤 Envoi requête amélioration workflow RAG');
  console.log('📦 Payload size:', JSON.stringify(requestBody).length, 'chars');

  const response = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.API_KEY}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.text();
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
}

/**
 * Traite la réponse du backend workflow RAG
 */
async function processWorkflowRAGResponse(data, tabId) {
  console.log('📨 Réponse workflow RAG:', data.type);
  
  // DEBUG : Log détaillé de chaque événement
  if (data.type === 'complete') {
    console.log('🔍 DEBUG Complete Event:', JSON.stringify(data, null, 2));
    console.log('🔍 DEBUG data.data:', data.data);
    console.log('🔍 DEBUG success:', data.data?.success);
    console.log('🔍 DEBUG workflow présent:', !!data.data?.workflow);
    if (data.data?.workflow) {
      console.log('🔍 DEBUG workflow nodes:', data.data.workflow.nodes?.length);
    }
  }

  switch (data.type) {
    case 'setup':
      chrome.tabs.sendMessage(tabId, {
        type: 'WORKFLOW_SETUP',
        message: data.data.message
      });
      break;

    case 'search':
      chrome.tabs.sendMessage(tabId, {
        type: 'WORKFLOW_SEARCH',
        message: data.data.message
      });
      break;

    case 'building':
      chrome.tabs.sendMessage(tabId, {
        type: 'WORKFLOW_BUILDING',
        message: data.data.message
      });
      break;

    case 'progress':
      chrome.tabs.sendMessage(tabId, {
        type: 'WORKFLOW_PROGRESS',
        stage: data.data.stage,
        message: data.data.message,
        workflows: data.data.workflows
      });
      break;

    case 'complete':
      if (data.data.success && data.data.workflow) {
        console.log('✅ Workflow généré avec succès');
        
        // --- NOUVELLE MÉTHODE : envoi en chunks pour éviter la limite de taille Chrome ---
        const workflowString = JSON.stringify(data.data.workflow);
        const CHUNK_SIZE = 400000; // 400 KB (~0.4 Mo) - largement sous la limite 4 Mo
        const totalChunks = Math.ceil(workflowString.length / CHUNK_SIZE);

        console.log(`📦 Envoi du workflow en ${totalChunks} chunks (taille totale ${workflowString.length} caractères)`);

        // 1. Message de démarrage
        chrome.tabs.sendMessage(tabId, {
          type: 'WORKFLOW_CHUNKS_START',
          totalChunks,
          explanation: data.data.explanation,
          message: data.data.message
        });

        // 2. Envoyer chaque chunk séquentiellement
        for (let i = 0; i < totalChunks; i++) {
          const chunk = workflowString.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          chrome.tabs.sendMessage(tabId, {
            type: 'WORKFLOW_CHUNK',
            index: i,
            chunk
          });
        }

        // 3. Message de fin
        chrome.tabs.sendMessage(tabId, {
          type: 'WORKFLOW_CHUNKS_END',
          message: 'Tous les chunks du workflow ont été envoyés'
        });

      } else {
        console.error('❌ Échec de génération');
        chrome.tabs.sendMessage(tabId, {
          type: 'WORKFLOW_ERROR',
          error: data.data.error || 'Échec de génération de workflow'
        });
      }
      break;

    case 'error':
      chrome.tabs.sendMessage(tabId, {
        type: 'WORKFLOW_ERROR',
        error: data.data.error || data.data.message
      });
      break;

    default:
      console.log('⚠️ Type de message inconnu:', data.type);
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
      chrome.tabs.sendMessage(tabId, {
        type: 'WORKFLOW_IMPORT_SUCCESS',
        message: successfulResults[0].result.message
      });
    } else if (failedResults.length > 0) {
      // Toutes les frames ont échoué
      chrome.tabs.sendMessage(tabId, {
        type: 'WORKFLOW_IMPORT_ERROR',
        error: failedResults[0].result.error
      });
    } else {
      // Aucun résultat (bizarre)
      chrome.tabs.sendMessage(tabId, {
        type: 'WORKFLOW_IMPORT_ERROR',
        error: 'Aucune frame n8n trouvée pour importer le workflow'
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur injection script:', error);
    chrome.tabs.sendMessage(tabId, {
      type: 'WORKFLOW_IMPORT_ERROR',
      error: `Erreur d'injection: ${error.message}`
    });
  }
}

// Installation de l'extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('n8n AI Assistant (Workflow RAG) installé avec succès');
}); 