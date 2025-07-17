/**
 * Service Worker pour l'extension n8n AI Assistant
 * Gère la communication avec le backend workflow RAG
 */

// Importer la configuration
importScripts('./config.js');

// State pour les gros workflows
let chunkBuffer = {};
let compressionSupported = true;

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
 * Décompresse les données base64 gzip (si supporté)
 */
async function decompressData(compressedBase64) {
  try {
    // Convertir base64 en bytes
    const compressedBytes = Uint8Array.from(atob(compressedBase64), c => c.charCodeAt(0));
    
    // Utiliser CompressionStream/DecompressionStream si disponible (Chrome 103+)
    if ('DecompressionStream' in window) {
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
      
      return new TextDecoder().decode(result);
    } else {
      console.warn('⚠️ DecompressionStream not supported, using fallback');
      compressionSupported = false;
      throw new Error('Compression not supported in this browser version');
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
      chrome.tabs.sendMessage(tabId, {
        type: 'WORKFLOW_COMPLETE',
        workflow: workflowData.workflow,
        explanation: workflowData.explanation,
        message: `Workflow volumineux assemblé (${data.total} parties)`
      });
      
    } catch (error) {
      console.error('❌ Erreur assemblage chunks:', error);
      delete chunkBuffer[sessionId];
      
      chrome.tabs.sendMessage(tabId, {
        type: 'WORKFLOW_ERROR',
        error: `Erreur assemblage workflow: ${error.message}`
      });
    }
  } else {
    // Notifier du progress
    chrome.tabs.sendMessage(tabId, {
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
  const timeoutMs = 1800000; // 30 minutes (pour gros workflows)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout: La génération prend trop de temps (30 min)')), timeoutMs);
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
          chrome.tabs.sendMessage(tabId, {
            type: 'CLAUDE_ERROR',
            error: 'Timeout: Le serveur ne répond plus. Essayez un prompt plus simple.'
          });
          return;
        }

        const { done, value } = result;
        if (done) {
          console.log('✅ Stream terminé. Total événements:', eventCount);
          if (eventCount === 0) {
            chrome.tabs.sendMessage(tabId, {
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
              console.log('📡 Événement reçu:', data.type);
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
        workflows: data.data.workflows,
        progress: data.data.progress
      });
      break;

    case 'compression':
      chrome.tabs.sendMessage(tabId, {
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
        chrome.tabs.sendMessage(tabId, {
          type: 'WORKFLOW_COMPLETE',
          workflow: data.data.workflow,
          explanation: data.data.explanation,
          message: data.data.message
        });
      } else {
        console.error('❌ Échec de génération');
        chrome.tabs.sendMessage(tabId, {
          type: 'WORKFLOW_ERROR',
          error: data.data.error || 'Échec de génération de workflow'
        });
      }
      break;

    case 'compressed_complete':
      if (data.data.success && data.data.compressed) {
        console.log('✅ Workflow compressé reçu, décompression...');
        
        try {
          // Décompresser les données
          const decompressedData = await decompressData(data.data.data);
          const workflowData = JSON.parse(decompressedData);
          
          console.log('✅ Workflow décompressé avec succès');
          
          // Envoyer le workflow décompressé
          chrome.tabs.sendMessage(tabId, {
            type: 'WORKFLOW_COMPLETE',
            workflow: workflowData.workflow,
            explanation: workflowData.explanation,
            message: 'Workflow compressé décompressé avec succès !'
          });
          
        } catch (error) {
          console.error('❌ Erreur décompression:', error);
          chrome.tabs.sendMessage(tabId, {
            type: 'WORKFLOW_ERROR',
            error: `Erreur décompression: ${error.message}`
          });
        }
      } else {
        console.error('❌ Échec de génération compressée');
        chrome.tabs.sendMessage(tabId, {
          type: 'WORKFLOW_ERROR',
          error: 'Échec de génération de workflow compressé'
        });
      }
      break;

    case 'chunking_start':
      console.log(`📦 Début réception chunks: ${data.data.totalChunks} parties`);
      chrome.tabs.sendMessage(tabId, {
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