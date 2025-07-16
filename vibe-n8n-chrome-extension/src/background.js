/**
 * Service Worker pour l'extension n8n AI Assistant
 * Gère la communication avec votre API backend
 */

// Importer la configuration
importScripts('./config.js');

// Schéma des fonctions disponibles pour Claude (format API vibe-n8n)
const FUNCTION_SCHEMA = [
  {
    name: "createNode",
    description: "Create a new node in the workflow",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Node type (e.g., 'n8n-nodes-base.httpRequest')" },
        position: { type: "array", items: { type: "number" }, description: "Position [x, y]" },
        parameters: { type: "object", description: "Node configuration parameters" }
      },
      required: ["type", "position"]
    }
  },
  {
    name: "updateNode",
    description: "Update an existing node",
    input_schema: {
      type: "object",
      properties: {
        nodeId: { type: "string", description: "ID of the node to update" },
        parameters: { type: "object", description: "New parameters to set" }
      },
      required: ["nodeId", "parameters"]
    }
  },
  {
    name: "connectNodes",
    description: "Connect two nodes together",
    input_schema: {
      type: "object",
      properties: {
        sourceNodeId: { type: "string", description: "Source node ID" },
        targetNodeId: { type: "string", description: "Target node ID" },
        sourceOutputIndex: { type: "number", description: "Source output index (default: 0)" },
        targetInputIndex: { type: "number", description: "Target input index (default: 0)" }
      },
      required: ["sourceNodeId", "targetNodeId"]
    }
  },
  {
    name: "deleteNode",
    description: "Delete a node from the workflow",
    input_schema: {
      type: "object",
      properties: {
        nodeId: { type: "string", description: "ID of the node to delete" }
      },
      required: ["nodeId"]
    }
  }
];

// Écoute des messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SEND_TO_CLAUDE') {
    handleClaudeRequest(request.prompt, request.context, request.versions, sender.tab.id)
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
 * Exécute un tool call directement dans la page via chrome.scripting
 */
async function executeToolCallDirect(toolCall, tabId) {
  console.log('🔧 Exécution directe du tool call:', toolCall);
  
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      world: 'MAIN',
      func: (toolCall) => {
        // Code injecté directement dans le contexte de la page
        console.log('💉 Exécution tool call inline:', toolCall);
        
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
        
        console.log('✅ Stores trouvés, exécution du tool call...');
        
        try {
          if (toolCall.name === 'createNode') {
            const nodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const nodeName = toolCall.parameters.type.split('.').pop() || 'New Node';
            
            const nodeData = {
              id: nodeId,
              name: nodeName,
              type: toolCall.parameters.type,
              position: toolCall.parameters.position || [100, 100],
              parameters: toolCall.parameters.parameters || {},
              typeVersion: 1
            };
            
            workflowStore.addNode(nodeData);
            console.log('✅ Nœud créé:', nodeName);
            
            // Animation visuelle
            setTimeout(() => {
              const nodeElement = document.querySelector(`[data-name="${nodeId}"]`) || 
                                document.querySelector(`[id*="${nodeId}"]`);
              if (nodeElement) {
                nodeElement.style.transition = 'all 0.5s ease';
                nodeElement.style.transform = 'scale(1.1)';
                nodeElement.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.8)';
                setTimeout(() => {
                  nodeElement.style.transform = 'scale(1)';
                  nodeElement.style.boxShadow = '';
                }, 500);
              }
            }, 100);
            
            return { success: true, message: `Nœud "${nodeName}" créé avec succès` };
            
          } else if (toolCall.name === 'updateNode') {
            const node = workflowStore.getNodeById(toolCall.parameters.nodeId);
            if (!node) {
              return { success: false, error: `Nœud ${toolCall.parameters.nodeId} introuvable` };
            }
            const updates = { parameters: { ...node.parameters, ...toolCall.parameters.parameters } };
            workflowStore.updateNode(toolCall.parameters.nodeId, updates);
            console.log('✅ Nœud mis à jour:', node.name);
            return { success: true, message: `Nœud "${node.name}" mis à jour` };
            
          } else if (toolCall.name === 'connectNodes') {
            const connection = {
              source: {
                id: toolCall.parameters.sourceNodeId,
                index: toolCall.parameters.sourceOutputIndex || 0,
                type: 'main'
              },
              target: {
                id: toolCall.parameters.targetNodeId,
                index: toolCall.parameters.targetInputIndex || 0,
                type: 'main'
              }
            };
            workflowStore.addConnection(connection);
            console.log('✅ Connexion créée');
            return { success: true, message: 'Connexion créée avec succès' };
            
          } else if (toolCall.name === 'deleteNode') {
            const node = workflowStore.getNodeById(toolCall.parameters.nodeId);
            if (!node) {
              return { success: false, error: `Nœud ${toolCall.parameters.nodeId} introuvable` };
            }
            workflowStore.removeNode(toolCall.parameters.nodeId);
            console.log('✅ Nœud supprimé:', node.name);
            return { success: true, message: `Nœud "${node.name}" supprimé` };
          }
          
          return { success: false, error: `Action ${toolCall.name} non reconnue` };
          
        } catch (error) {
          console.error('❌ Erreur lors de l\'exécution:', error);
          return { success: false, error: error.message };
        }
      },
      args: [toolCall]
    });
    
    // Vérifier les résultats de toutes les frames
    const successfulResults = results.filter(result => result.result?.success);
    const failedResults = results.filter(result => result.result && !result.result.success);
    
    if (successfulResults.length > 0) {
      // Au moins une frame a réussi
      chrome.tabs.sendMessage(tabId, {
        type: 'TOOL_CALL_SUCCESS',
        message: successfulResults[0].result.message
      });
    } else if (failedResults.length > 0) {
      // Toutes les frames ont échoué
      chrome.tabs.sendMessage(tabId, {
        type: 'TOOL_CALL_ERROR',
        error: failedResults[0].result.error
      });
    } else {
      // Aucun résultat (bizarre)
      chrome.tabs.sendMessage(tabId, {
        type: 'TOOL_CALL_ERROR',
        error: 'Aucune frame n8n trouvée pour exécuter l\'action'
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur injection script:', error);
    chrome.tabs.sendMessage(tabId, {
      type: 'TOOL_CALL_ERROR',
      error: `Erreur d'injection: ${error.message}`
    });
  }
}

/**
 * Envoie une requête à votre API backend qui gère Claude
 */
async function handleClaudeRequest(prompt, context, versions, tabId) {
  // Détection automatique du mode
  const hasExistingNodes = context?.nodes?.length > 0;
  const hasExistingConnections = context?.connections && Object.keys(context.connections).length > 0;
  const isModification = hasExistingNodes || hasExistingConnections;
  const mode = isModification ? 'modify' : 'create';
  
  console.log(`🎯 Mode détecté: ${mode}`, { hasExistingNodes, hasExistingConnections });
  console.log('📊 Versions reçues:', versions ? Object.keys(versions).length + ' nodes' : 'aucune');
  
  // Log des fonctionnalités backend supportées
  if (CONFIG.FEATURES) {
    console.log('🚀 Fonctionnalités backend supportées:');
    console.log('  - Métadonnées étendues:', CONFIG.FEATURES.EXTENDED_METADATA);
    console.log('  - Stockage volume:', CONFIG.FEATURES.VOLUME_STORAGE);
    console.log('  - Tokens étendus (16384):', CONFIG.FEATURES.EXTENDED_OUTPUT_TOKENS);
    console.log('  - RAG hybride:', CONFIG.FEATURES.HYBRID_RAG);
  }
  
  // Notifier le content script du mode
  chrome.tabs.sendMessage(tabId, {
    type: 'MODE_DETECTED',
    mode: mode
  });

  const requestBody = {
    prompt: prompt,
    context: context,
    mode: mode,
    tools: mode === 'modify' ? FUNCTION_SCHEMA : [],
    versions: versions // Inclure les versions dans la requête
  };

  console.log('📤 Envoi requête API avec versions:', versions ? 'oui' : 'non');
  console.log('📦 Taille du payload:', JSON.stringify(requestBody).length, 'caractères');

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
    throw new Error(`Erreur API: ${error}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completeWorkflowJson = ''; // Pour accumuler le JSON en mode create

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
          
          // En mode create, on accumule le JSON complet
          if (mode === 'create' && data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
            completeWorkflowJson += data.delta.text;
          }
          
          await processClaudeResponse(data, tabId, mode);
        } catch (e) {
          // Ignorer les erreurs de parsing
        }
      }
    }
  }

  // En mode create, traiter le workflow complet à la fin
  if (mode === 'create' && completeWorkflowJson) {
    try {
      console.log('📝 Texte complet reçu:', completeWorkflowJson);
      console.log('📏 Longueur du texte:', completeWorkflowJson.length);
      
      let workflowData = null;
      
      // Essayer d'abord d'extraire le JSON d'un bloc de code markdown
      const jsonMatch = completeWorkflowJson.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        console.log('📦 JSON trouvé dans bloc markdown');
        workflowData = JSON.parse(jsonMatch[1]);
      } else {
        // Sinon, essayer de trouver un objet JSON directement dans le texte
        // Chercher le premier { et le dernier } pour extraire le JSON
        const firstBrace = completeWorkflowJson.indexOf('{');
        const lastBrace = completeWorkflowJson.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          let jsonString = completeWorkflowJson.substring(firstBrace, lastBrace + 1);
          
          // Si le JSON semble incomplet (se termine par : ou ,), essayer de le compléter
          jsonString = jsonString.trim();
          if (jsonString.endsWith(':') || jsonString.endsWith(',')) {
            console.log('⚠️ JSON incomplet détecté, tentative de réparation...');
            // Retirer la virgule ou deux-points final
            jsonString = jsonString.slice(0, -1);
            // Fermer les accolades/crochets ouverts
            const openBraces = (jsonString.match(/{/g) || []).length;
            const closeBraces = (jsonString.match(/}/g) || []).length;
            const openBrackets = (jsonString.match(/\[/g) || []).length;
            const closeBrackets = (jsonString.match(/]/g) || []).length;
            
            // Ajouter les fermetures manquantes
            for (let i = 0; i < openBrackets - closeBrackets; i++) {
              jsonString += ']';
            }
            for (let i = 0; i < openBraces - closeBraces; i++) {
              jsonString += '}';
            }
          }
          
          // Gérer le cas spécifique où "active": n'a pas de valeur
          if (jsonString.includes('"active":') && !jsonString.includes('"active": false') && !jsonString.includes('"active": true')) {
            console.log('⚠️ Correction de "active" sans valeur');
            jsonString = jsonString.replace(/"active":\s*}/, '"active": false}');
            jsonString = jsonString.replace(/"active":\s*$/, '"active": false');
          }
          
          console.log('📦 Tentative de parse du JSON:', jsonString.substring(0, 200) + '...');
          workflowData = JSON.parse(jsonString);
        }
      }
      
      if (workflowData) {
        console.log('✅ Workflow complet parsé:', workflowData);
        
        // Envoyer le workflow complet au content script
        chrome.tabs.sendMessage(tabId, {
          type: 'COMPLETE_WORKFLOW_READY',
          workflow: workflowData
        });
      } else {
        throw new Error('Aucun JSON valide trouvé dans la réponse');
      }
    } catch (e) {
      console.error('❌ Erreur parsing workflow JSON:', e);
      console.error('Texte reçu (derniers 500 caractères):', completeWorkflowJson.slice(-500));
      chrome.tabs.sendMessage(tabId, {
        type: 'WORKFLOW_PARSE_ERROR',
        error: 'Impossible de parser le workflow généré. Le JSON semble incomplet.'
      });
    }
  }
}

/**
 * Traite la réponse de Claude et envoie les tool calls au content script
 */
async function processClaudeResponse(data, tabId, mode) {
  console.log('📨 Réponse Claude:', data.type, data);

  if (data.type === 'message_start' || 
      (data.type === 'content_block_start' && data.content_block?.type === 'text')) {
    // Début du message texte (ignorer thinking)
    chrome.tabs.sendMessage(tabId, {
      type: 'CLAUDE_STREAM_START'
    });
  }

  if (data.type === 'content_block_delta') {
    // Texte de réponse (ignorer le thinking et input_json_delta)
    if (data.delta?.type === 'text_delta') {
      chrome.tabs.sendMessage(tabId, {
        type: 'CLAUDE_STREAM_TEXT',
        text: data.delta.text
      });
    }
    // On peut logger le thinking pour debug si nécessaire
    if (data.delta?.type === 'thinking_delta') {
      console.log('[Thinking]', data.delta.thinking);
    }
    // Ignorer input_json_delta pour l'instant (on traite le tool_use complet plus tard)
  }

  // Traiter les tool calls seulement en mode modify
  if (mode === 'modify') {
    if (data.type === 'content_block_start' && data.content_block?.type === 'tool_use') {
      // Début d'un tool call - on stocke pour assemblage
      if (!this.pendingToolCalls) this.pendingToolCalls = {};
      this.pendingToolCalls[data.index] = {
        id: data.content_block.id,
        name: data.content_block.name,
        input: ''
      };
    }

    if (data.type === 'content_block_delta' && data.delta?.type === 'input_json_delta') {
      // Assembler les parties du JSON du tool call
      if (this.pendingToolCalls && this.pendingToolCalls[data.index]) {
        this.pendingToolCalls[data.index].input += data.delta.partial_json;
      }
    }

    if (data.type === 'content_block_stop' && this.pendingToolCalls && this.pendingToolCalls[data.index]) {
      // Fin d'un tool call - parser et exécuter directement
      const toolCall = this.pendingToolCalls[data.index];
      try {
        const parsedInput = JSON.parse(toolCall.input);
        const toolCallData = {
          name: toolCall.name,
          parameters: parsedInput
        };
        
        // Exécuter directement le tool call
        executeToolCallDirect(toolCallData, tabId);
        
      } catch (e) {
        console.error('Erreur parsing tool call:', e, toolCall.input);
        chrome.tabs.sendMessage(tabId, {
          type: 'TOOL_CALL_ERROR',
          error: `Erreur parsing: ${e.message}`
        });
      }
      delete this.pendingToolCalls[data.index];
    }
  }

  if (data.type === 'message_stop' || data.type === 'stream_end') {
    // Fin du message - nettoyer et notifier
    this.pendingToolCalls = {};
    chrome.tabs.sendMessage(tabId, {
      type: 'CLAUDE_STREAM_END'
    });
  }
}

// Installation de l'extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('n8n AI Assistant installé avec succès');
}); 