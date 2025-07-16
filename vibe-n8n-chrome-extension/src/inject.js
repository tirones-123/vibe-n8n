/**
 * Script injecté dans le contexte de la page n8n
 * Accès direct au store Pinia pour manipuler le workflow
 */

(function() {
  'use strict';

  console.log('💉 inject.js: Script injecté CHARGÉ !');

  // Attendre que Pinia soit disponible
  let piniaStore = null;
  let workflowStore = null;
  let uiStore = null;
  let ndvStore = null;

  function initializeStores() {
    console.log('🔍 inject.js: Recherche des stores Pinia...');
    
    // Rechercher le store Pinia
    if (window.__pinia || window.$pinia) {
      piniaStore = window.__pinia || window.$pinia;
      console.log('✅ inject.js: Pinia trouvé:', piniaStore);
      
      // Assurer l'exposition de Pinia sur window pour les tool calls directs
      window.__pinia = piniaStore;
      window.$pinia = piniaStore;
      
      // Accéder aux stores n8n
      const stores = piniaStore._s;
      if (stores) {
        console.log('📦 inject.js: Stores disponibles:', Array.from(stores.keys()));
        workflowStore = stores.get('workflows');
        uiStore = stores.get('ui');
        ndvStore = stores.get('ndv');
        
        if (workflowStore) {
          console.log('✅ inject.js: Stores Pinia trouvés');
          return true;
        }
      }
    }

    // Alternative: chercher dans Vue
    const app = document.querySelector('#app')?.__vue_app__;
    if (app && app._context && app._context.provides) {
      const pinia = app._context.provides.pinia;
      if (pinia) {
        console.log('✅ inject.js: Pinia trouvé via Vue:', pinia);
        piniaStore = pinia;
        // Exposer Pinia sur window pour les tool calls directs
        window.__pinia = pinia;
        window.$pinia = pinia;
        workflowStore = pinia._s.get('workflows');
        uiStore = pinia._s.get('ui');
        ndvStore = pinia._s.get('ndv');
        
        if (workflowStore) {
          console.log('✅ inject.js: Stores trouvés via Vue');
          return true;
        }
      }
    }

    // Nouvelle méthode: chercher dans les éléments Vue montés
    const vueElements = document.querySelectorAll('[data-v-app], #app, .n8n-app');
    for (const el of vueElements) {
      if (el.__vue_app__) {
        const app = el.__vue_app__;
        console.log('🔍 inject.js: App Vue trouvée sur élément:', el);
        
        // Chercher Pinia dans les provides
        if (app._context?.provides?.pinia) {
          const pinia = app._context.provides.pinia;
          console.log('✅ inject.js: Pinia trouvé via élément Vue');
          piniaStore = pinia;
          window.__pinia = pinia;
          window.$pinia = pinia;
          
          workflowStore = pinia._s.get('workflows');
          uiStore = pinia._s.get('ui');
          ndvStore = pinia._s.get('ndv');
          
          if (workflowStore) {
            console.log('✅ inject.js: Stores trouvés !');
            return true;
          }
        }
        
        // Chercher dans l'instance globale
        if (app.config?.globalProperties?.$pinia) {
          const pinia = app.config.globalProperties.$pinia;
          console.log('✅ inject.js: Pinia trouvé via globalProperties');
          piniaStore = pinia;
          window.__pinia = pinia;
          window.$pinia = pinia;
          
          workflowStore = pinia._s.get('workflows');
          uiStore = pinia._s.get('ui');
          ndvStore = pinia._s.get('ndv');
          
          if (workflowStore) {
            console.log('✅ inject.js: Stores trouvés !');
            return true;
          }
        }
      }
      
      // Chercher dans les propriétés Vue 2/3
      if (el._vnode?.appContext?.provides?.pinia) {
        const pinia = el._vnode.appContext.provides.pinia;
        console.log('✅ inject.js: Pinia trouvé via vnode');
        piniaStore = pinia;
        window.__pinia = pinia;
        window.$pinia = pinia;
        
        workflowStore = pinia._s.get('workflows');
        uiStore = pinia._s.get('ui');
        ndvStore = pinia._s.get('ndv');
        
        if (workflowStore) {
          console.log('✅ inject.js: Stores trouvés !');
          return true;
        }
      }
    }

    console.log('❌ inject.js: Stores non trouvés');
    return false;
  }

  // Attendre un peu avant de commencer la recherche (n8n charge de manière asynchrone)
  setTimeout(() => {
  // Réessayer jusqu'à ce que les stores soient disponibles
  const initInterval = setInterval(() => {
    if (initializeStores()) {
      clearInterval(initInterval);
      setupMessageListener();
    }
    }, 1000); // Augmenté à 1 seconde entre chaque tentative

    // Timeout après 30 secondes (augmenté de 10 à 30)
  setTimeout(() => {
    clearInterval(initInterval);
    if (!workflowStore) {
        console.warn('n8n AI Assistant: Impossible de trouver les stores Pinia après 30 secondes');
    }
    }, 30000);
  }, 2000); // Attendre 2 secondes avant de commencer

  // Écouter les messages du content script
  function setupMessageListener() {
    console.log('🎧 inject.js: Listeners configurés');
    
    // Signaler que le script est prêt
    window.postMessage({ type: 'INJECT_SCRIPT_READY' }, '*');
    
    window.addEventListener('message', async (event) => {
      if (event.source !== window) return;

      console.log('📨 inject.js: Message reçu:', event.data);

      switch (event.data.type) {
        case 'PING_INJECT_SCRIPT':
          console.log('🏓 inject.js: PONG reçu, je réponds !');
          window.postMessage({ 
            type: 'INJECT_SCRIPT_READY',
            stores: {
              workflowStore: !!workflowStore,
              uiStore: !!uiStore,
              ndvStore: !!ndvStore
            }
          }, '*');
          break;
          
        case 'GET_WORKFLOW_CONTEXT':
          console.log('📋 inject.js: Récupération du contexte workflow');
          sendWorkflowContext();
          break;
          
        case 'GET_NODE_VERSIONS':
          console.log('📊 inject.js: Récupération des versions des nodes');
          sendNodeVersions();
          break;
          
        case 'EXECUTE_TOOL_CALL':
          console.log('🔧 inject.js: Exécution tool call:', event.data.toolCall);
          executeToolCall(event.data.toolCall);
          break;

        case 'IMPORT_WORKFLOW':
          console.log('📥 inject.js: Import workflow complet');
          importCompleteWorkflow(event.data.workflow);
          break;
      }
    });
  }

  // Envoyer le contexte du workflow actuel
  function sendWorkflowContext() {
    if (!workflowStore) {
      window.postMessage({ type: 'WORKFLOW_CONTEXT', context: { nodes: [], connections: {} } }, '*');
      return;
    }

    try {
      // Récupérer les nœuds
      const nodes = workflowStore.allNodes.map(node => ({
        id: node.id,
        name: node.name,
        type: node.type,
        position: node.position,
        parameters: node.parameters,
        typeVersion: node.typeVersion
      }));

      // Récupérer les connexions
      const connections = {};
      const allConnections = workflowStore.allConnections || [];
      
      // Vérifier si c'est un tableau ou un objet
      if (Array.isArray(allConnections)) {
        allConnections.forEach(conn => {
          if (!connections[conn.source.id]) {
            connections[conn.source.id] = { main: [[]] };
          }
          if (!connections[conn.source.id].main[conn.source.index]) {
            connections[conn.source.id].main[conn.source.index] = [];
          }
          connections[conn.source.id].main[conn.source.index].push({
            node: conn.target.id,
            type: conn.target.type || 'main',
            index: conn.target.index || 0
          });
        });
      } else if (typeof allConnections === 'object') {
        // Si c'est déjà un objet de connexions formaté
        Object.assign(connections, allConnections);
      }

      const context = { 
        nodes, 
        connections,
        name: workflowStore.name,
        active: workflowStore.active,
        settings: workflowStore.settings
      };

      console.log('📤 Contexte workflow envoyé:', context);
      window.postMessage({
        type: 'WORKFLOW_CONTEXT',
        context: context
      }, '*');
    } catch (error) {
      console.error('❌ Erreur récupération contexte:', error);
      window.postMessage({ 
        type: 'WORKFLOW_CONTEXT', 
        context: { nodes: [], connections: {} } 
      }, '*');
    }
  }

  // Envoyer les versions des nodes disponibles
  function sendNodeVersions() {
    console.log('🔍 inject.js: Recherche des versions des nodes...');
    
    try {
      // Méthode 1: Via le nodeTypesStore
      const nodeTypesStore = piniaStore?._s.get('nodeTypes');
      if (nodeTypesStore) {
        console.log('✅ nodeTypesStore trouvé');
        
        const versions = {};
        
        // Récupérer tous les types de nodes
        const allNodeTypes = nodeTypesStore.allNodeTypes || nodeTypesStore.nodeTypes || {};
        
        for (const [nodeType, nodeData] of Object.entries(allNodeTypes)) {
          // Extraire le nom simple
          const simpleName = nodeType.split('.').pop();
          
          // Récupérer la version maximale
          if (nodeData.version) {
            versions[simpleName] = nodeData.version;
            versions[nodeType] = nodeData.version;
          } else if (nodeData.typeVersion) {
            versions[simpleName] = nodeData.typeVersion;
            versions[nodeType] = nodeData.typeVersion;
          }
        }
        
        console.log('📊 Versions extraites du store:', Object.keys(versions).length, 'nodes');
        
        if (Object.keys(versions).length > 0) {
          window.postMessage({
            type: 'NODE_VERSIONS_RESPONSE',
            versions: versions
          }, '*');
          return;
        }
      }
      
      // Méthode 2: Via l'API REST interne (si accessible)
      if (window.n8n && window.n8n.nodeTypes) {
        console.log('✅ window.n8n.nodeTypes trouvé');
        
        const versions = {};
        const nodeTypes = window.n8n.nodeTypes.getAll();
        
        for (const [nodeType, nodeData] of Object.entries(nodeTypes)) {
          const simpleName = nodeType.split('.').pop();
          const version = nodeData.version || nodeData.typeVersion || 1;
          versions[simpleName] = version;
          versions[nodeType] = version;
        }
        
        console.log('📊 Versions extraites de window.n8n:', Object.keys(versions).length, 'nodes');
        
        window.postMessage({
          type: 'NODE_VERSIONS_RESPONSE',
          versions: versions
        }, '*');
        return;
      }
      
      // Méthode 3: Essayer de faire un appel API depuis le contexte de la page
      fetch('/rest/node-types', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      })
      .then(response => response.json())
      .then(nodeTypes => {
        const versions = {};
        
        for (const [nodeType, versionData] of Object.entries(nodeTypes)) {
          const simpleName = nodeType.split('.').pop();
          const versionNumbers = Object.keys(versionData)
            .map(v => parseInt(v))
            .filter(v => !isNaN(v));
          
          if (versionNumbers.length > 0) {
            const maxVersion = Math.max(...versionNumbers);
            versions[simpleName] = maxVersion;
            versions[nodeType] = maxVersion;
          }
        }
        
        console.log('📊 Versions extraites via API:', Object.keys(versions).length, 'nodes');
        
        window.postMessage({
          type: 'NODE_VERSIONS_RESPONSE',
          versions: versions
        }, '*');
      })
      .catch(error => {
        console.error('❌ Erreur appel API node-types:', error);
        window.postMessage({
          type: 'NODE_VERSIONS_RESPONSE',
          versions: null
        }, '*');
      });
      
    } catch (error) {
      console.error('❌ Erreur récupération versions:', error);
      window.postMessage({
        type: 'NODE_VERSIONS_RESPONSE',
        versions: null
      }, '*');
    }
  }

  // Importer un workflow complet
  async function importCompleteWorkflow(workflowData) {
    if (!workflowStore) {
      window.postMessage({
        type: 'IMPORT_ERROR',
        error: 'Store Pinia non disponible'
      }, '*');
      return;
    }

    try {
      console.log('🔄 Import du workflow:', workflowData);

      // Effacer le workflow actuel
      const currentNodes = [...workflowStore.allNodes];
      for (const node of currentNodes) {
        workflowStore.removeNode(node.id);
      }

      // Mapper les noms vers les IDs pour les connexions
      const nameToIdMap = {};

      // Importer les nouveaux nœuds
      if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
        for (const node of workflowData.nodes) {
          const nodeId = node.id || `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Stocker le mapping nom -> id ET id -> id
          if (node.name) {
            nameToIdMap[node.name] = nodeId;
          }
          if (node.id) {
            nameToIdMap[node.id] = nodeId; // Au cas où les connexions utilisent les anciens IDs
          }
          
          console.log(`📝 Nœud ajouté: ${node.name} (${nodeId})`);
          
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
        }
      }

      console.log('🗺️ Mapping nom->ID:', nameToIdMap);

      // Importer les connexions avec une meilleure gestion d'erreur
      if (workflowData.connections && typeof workflowData.connections === 'object') {
        Object.entries(workflowData.connections).forEach(([sourceKey, outputs]) => {
          // Déterminer l'ID source (peut être un nom ou un ID)
          const sourceId = nameToIdMap[sourceKey] || sourceKey;
          
          console.log(`🔗 Traitement connexions de: ${sourceKey} -> ${sourceId}`);
          
          if (outputs.main && Array.isArray(outputs.main)) {
            outputs.main.forEach((outputConnections, outputIndex) => {
              if (Array.isArray(outputConnections)) {
                outputConnections.forEach(conn => {
                  try {
                    // Déterminer l'ID cible (peut être un nom ou un ID)
                    const targetId = nameToIdMap[conn.node] || conn.node;
                    
                    // Vérifier que les nœuds source et cible existent
                    const sourceNode = workflowStore.getNodeById(sourceId);
                    const targetNode = workflowStore.getNodeById(targetId);
                    
                    if (!sourceNode) {
                      console.warn(`⚠️ Nœud source non trouvé: ${sourceKey} (${sourceId})`);
                      return;
                    }
                    
                    if (!targetNode) {
                      console.warn(`⚠️ Nœud cible non trouvé: ${conn.node} (${targetId})`);
                      return;
                    }
                    
                                        // Essayer d'abord l'API Canvas directe
                    let connectionSuccess = false;
                    
                    try {
                      // Méthode 1: Utiliser l'API Canvas n8n directement
                      if (window.canvasApi && window.canvasApi.connections) {
                        const connectionData = {
                          source: { node: sourceId, output: outputIndex },
                          target: { node: targetId, input: conn.index || 0 }
                        };
                        console.log(`🎨 Tentative connexion via Canvas API:`, connectionData);
                        window.canvasApi.connections.add(connectionData);
                        console.log(`✅ Connexion Canvas réussie: ${sourceNode.name} → ${targetNode.name}`);
                        connectionSuccess = true;
                      }
                    } catch (canvasError) {
                      console.log(`⚠️ Canvas API échoué:`, canvasError.message);
                    }
                    
                    // Méthode 2: Essayer via le store Canvas si disponible
                    if (!connectionSuccess) {
                      try {
                        const canvasStore = piniaStore._s.get('canvas');
                        if (canvasStore && canvasStore.addConnection) {
                          const connectionData = {
                            source: { node: sourceId, output: outputIndex },
                            target: { node: targetId, input: conn.index || 0 }
                          };
                          console.log(`🎨 Tentative connexion via Canvas Store:`, connectionData);
                          canvasStore.addConnection(connectionData);
                          console.log(`✅ Connexion Canvas Store réussie: ${sourceNode.name} → ${targetNode.name}`);
                          connectionSuccess = true;
                        }
                      } catch (canvasStoreError) {
                        console.log(`⚠️ Canvas Store échoué:`, canvasStoreError.message);
                      }
                    }
                    
                    // Méthode 3: Manipulation directe de l'état des connexions
                    if (!connectionSuccess) {
                      try {
                        // Accéder directement aux connexions du workflow
                        const currentConnections = { ...workflowStore.workflow.connections || {} };
                        
                        // Créer la structure de connexion
                        if (!currentConnections[sourceNode.name]) {
                          currentConnections[sourceNode.name] = { main: [] };
                        }
                        if (!currentConnections[sourceNode.name].main[outputIndex]) {
                          currentConnections[sourceNode.name].main[outputIndex] = [];
                        }
                        
                        // Ajouter la connexion
                        currentConnections[sourceNode.name].main[outputIndex].push({
                          node: targetNode.name,
                          type: conn.type || 'main',
                          index: conn.index || 0
                        });
                        
                        console.log(`🔗 Tentative via manipulation directe:`, currentConnections);
                        
                        // Mettre à jour le workflow avec les nouvelles connexions
                        workflowStore.$patch({
                          workflow: {
                            ...workflowStore.workflow,
                            connections: currentConnections
                          }
                        });
                        
                        console.log(`✅ Connexion directe réussie: ${sourceNode.name} → ${targetNode.name}`);
                        connectionSuccess = true;
                        
                      } catch (directError) {
                        console.log(`⚠️ Manipulation directe échouée:`, directError.message);
                      }
                    }
                    
                    // Méthode 4: Utiliser setWorkflowConnections si disponible
                    if (!connectionSuccess) {
                      try {
                        if (workflowStore.setWorkflowConnections) {
                          const allConnections = { ...workflowStore.workflow.connections || {} };
                          
                          if (!allConnections[sourceNode.name]) {
                            allConnections[sourceNode.name] = { main: [] };
                          }
                          if (!allConnections[sourceNode.name].main[outputIndex]) {
                            allConnections[sourceNode.name].main[outputIndex] = [];
                          }
                          
                          allConnections[sourceNode.name].main[outputIndex].push({
                            node: targetNode.name,
                            type: conn.type || 'main',
                            index: conn.index || 0
                          });
                          
                          console.log(`🔗 Tentative via setWorkflowConnections:`, allConnections);
                          workflowStore.setWorkflowConnections(allConnections);
                          console.log(`✅ Connexion setWorkflowConnections réussie: ${sourceNode.name} → ${targetNode.name}`);
                          connectionSuccess = true;
                        }
                      } catch (setError) {
                        console.log(`⚠️ setWorkflowConnections échoué:`, setError.message);
                      }
                    }
                    
                    if (!connectionSuccess) {
                      console.error(`❌ Toutes les méthodes ont échoué pour ${sourceKey} → ${conn.node}`);
                      
                      // Logs de diagnostic
                      console.log('🔍 Canvas API disponible:', !!window.canvasApi);
                      console.log('🔍 Canvas Store disponible:', !!piniaStore._s.get('canvas'));
                      console.log('🔍 setWorkflowConnections disponible:', !!workflowStore.setWorkflowConnections);
                      console.log('🔍 Workflow actuel:', workflowStore.workflow);
                    }
                    
                  } catch (connError) {
                    console.error(`❌ Erreur connexion ${sourceKey} → ${conn.node}:`, connError);
                  }
                });
              }
            });
          }
        });
      }

      // Animation de succès
      setTimeout(() => {
        const nodeElements = document.querySelectorAll('[data-node-name], .node');
        nodeElements.forEach(el => {
          el.style.animation = 'fadeIn 0.5s ease-out';
        });
      }, 100);

      const nodeCount = workflowData.nodes?.length || 0;
      const connectionCount = Object.values(workflowData.connections || {})
        .reduce((total, outputs) => {
          if (outputs.main && Array.isArray(outputs.main)) {
            return total + outputs.main.reduce((sum, conns) => sum + (conns?.length || 0), 0);
          }
          return total;
        }, 0);

      console.log(`✅ Import terminé: ${nodeCount} nœuds, ${connectionCount} connexions`);
      
      window.postMessage({
        type: 'IMPORT_SUCCESS',
        message: `Workflow importé avec succès: ${nodeCount} nœuds, ${connectionCount} connexions`
      }, '*');

    } catch (error) {
      console.error('❌ Erreur import workflow:', error);
      window.postMessage({
        type: 'IMPORT_ERROR',
        error: error.message
      }, '*');
    }
  }

  // Exécuter un tool call
  async function executeToolCall(toolCall) {
    if (!workflowStore) {
      window.postMessage({
        type: 'TOOL_CALL_ERROR',
        error: 'Store Pinia non disponible'
      }, '*');
      return;
    }

    try {
      let result = null;
      
      switch (toolCall.name) {
        case 'createNode':
          result = await createNode(toolCall.parameters);
          break;
          
        case 'updateNode':
          result = await updateNode(toolCall.parameters);
          break;
          
        case 'connectNodes':
          result = await connectNodes(toolCall.parameters);
          break;
          
        case 'deleteNode':
          result = await deleteNode(toolCall.parameters);
          break;
          
        default:
          throw new Error(`Fonction inconnue: ${toolCall.name}`);
      }

      window.postMessage({
        type: 'TOOL_CALL_SUCCESS',
        message: result.message,
        data: result.data
      }, '*');

    } catch (error) {
      window.postMessage({
        type: 'TOOL_CALL_ERROR',
        error: error.message
      }, '*');
    }
  }

  // Créer un nouveau nœud
  async function createNode(params) {
    const nodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Générer un nom par défaut basé sur le type
    const nodeName = params.name || params.type.split('.').pop() || 'New Node';
    
    const nodeData = {
      id: nodeId,
      name: nodeName,
      type: params.type,
      position: params.position || [100, 100],
      parameters: params.parameters || {},
      typeVersion: 1
    };

    // Ajouter le nœud via l'action du store
    workflowStore.addNode(nodeData);

    // Animer le nœud
    highlightNode(nodeId, 'created');

    return {
      message: `Nœud "${nodeName}" créé`,
      data: { nodeId }
    };
  }

  // Mettre à jour un nœud existant
  async function updateNode(params) {
    const node = workflowStore.getNodeById(params.nodeId);
    if (!node) {
      throw new Error(`Nœud ${params.nodeId} introuvable`);
    }

    const updates = {};
    
    // L'API n'envoie que les parameters à mettre à jour
    if (params.parameters !== undefined) {
      updates.parameters = { ...node.parameters, ...params.parameters };
    }

    // Mettre à jour via l'action du store
    workflowStore.updateNode(params.nodeId, updates);

    // Animer le nœud
    highlightNode(params.nodeId, 'updated');

    return {
      message: `Nœud "${node.name}" mis à jour`,
      data: { nodeId: params.nodeId }
    };
  }

  // Connecter deux nœuds
  async function connectNodes(params) {
    const sourceNode = workflowStore.getNodeById(params.sourceNodeId);
    const targetNode = workflowStore.getNodeById(params.targetNodeId);
    
    if (!sourceNode) throw new Error(`Nœud source ${params.sourceNodeId} introuvable`);
    if (!targetNode) throw new Error(`Nœud cible ${params.targetNodeId} introuvable`);

    const connection = {
      source: {
        id: params.sourceNodeId,
        index: params.sourceOutputIndex || 0,
        type: 'main'
      },
      target: {
        id: params.targetNodeId,
        index: params.targetInputIndex || 0,
        type: 'main'
      }
    };

    // Ajouter la connexion via l'action du store
    workflowStore.addConnection(connection);

    // Animer la connexion
    highlightConnection(params.sourceNodeId, params.targetNodeId);

    return {
      message: `Connexion créée: ${sourceNode.name} → ${targetNode.name}`,
      data: { connection }
    };
  }

  // Supprimer un nœud
  async function deleteNode(params) {
    const node = workflowStore.getNodeById(params.nodeId);
    if (!node) {
      throw new Error(`Nœud ${params.nodeId} introuvable`);
    }

    const nodeName = node.name;

    // Animer avant suppression
    highlightNode(params.nodeId, 'deleted');
    
    // Attendre un peu pour l'animation
    await new Promise(resolve => setTimeout(resolve, 300));

    // Supprimer via l'action du store
    workflowStore.removeNode(params.nodeId);

    return {
      message: `Nœud "${nodeName}" supprimé`,
      data: { nodeId: params.nodeId }
    };
  }

  // Mettre en surbrillance un nœud
  function highlightNode(nodeId, action) {
    const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (!nodeElement) return;

    const classMap = {
      created: 'n8n-ai-node-created',
      updated: 'n8n-ai-node-updated',
      deleted: 'n8n-ai-node-deleted'
    };

    nodeElement.classList.add(classMap[action]);
    
    setTimeout(() => {
      nodeElement.classList.remove(classMap[action]);
    }, 2000);
  }

  // Mettre en surbrillance une connexion
  function highlightConnection(sourceId, targetId) {
    // Trouver l'élément SVG de la connexion
    const connections = document.querySelectorAll('.connection-line');
    connections.forEach(conn => {
      if (conn.dataset.sourceId === sourceId && conn.dataset.targetId === targetId) {
        conn.classList.add('n8n-ai-connection-created');
        setTimeout(() => {
          conn.classList.remove('n8n-ai-connection-created');
        }, 2000);
      }
    });
  }

  // Ajouter les styles d'animation
  const style = document.createElement('style');
  style.textContent = `
    .n8n-ai-node-created {
      animation: aiNodeCreated 0.5s ease-out;
      box-shadow: 0 0 20px rgba(34, 197, 94, 0.8) !important;
    }
    
    .n8n-ai-node-updated {
      animation: aiNodeUpdated 0.5s ease-out;
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.8) !important;
    }
    
    .n8n-ai-node-deleted {
      animation: aiNodeDeleted 0.3s ease-out;
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.8) !important;
      opacity: 0.5;
    }
    
    .n8n-ai-connection-created {
      stroke: #22c55e !important;
      stroke-width: 3 !important;
      animation: aiConnectionCreated 0.5s ease-out;
    }
    
    @keyframes aiNodeCreated {
      0% { transform: scale(0.8); opacity: 0; }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }
    
    @keyframes aiNodeUpdated {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    
    @keyframes aiNodeDeleted {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(0.8); opacity: 0.5; }
    }
    
    @keyframes aiConnectionCreated {
      0% { stroke-dasharray: 5; opacity: 0; }
      100% { stroke-dasharray: 0; opacity: 1; }
    }
    
    @keyframes fadeIn {
      0% { opacity: 0; transform: scale(0.9); }
      100% { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);

})(); 