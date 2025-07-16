/**
 * Script injecté dans le contexte de la page n8n
 * Accès direct au store Pinia pour importer des workflows complets générés par le système RAG
 */

(function() {
  'use strict';

  console.log('💉 inject.js (Workflow RAG): Script injecté CHARGÉ !');

  // Attendre que Pinia soit disponible
  let piniaStore = null;
  let workflowStore = null;
  let uiStore = null;

  function initializeStores() {
    console.log('🔍 inject.js: Recherche des stores Pinia...');
    
    // Rechercher le store Pinia
    if (window.__pinia || window.$pinia) {
      piniaStore = window.__pinia || window.$pinia;
      console.log('✅ inject.js: Pinia trouvé:', piniaStore);
      
      // Assurer l'exposition de Pinia sur window
      window.__pinia = piniaStore;
      window.$pinia = piniaStore;
      
      // Accéder aux stores n8n
      const stores = piniaStore._s;
      if (stores) {
        console.log('📦 inject.js: Stores disponibles:', Array.from(stores.keys()));
        workflowStore = stores.get('workflows');
        uiStore = stores.get('ui');
        
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
        window.__pinia = pinia;
        window.$pinia = pinia;
        workflowStore = pinia._s.get('workflows');
        uiStore = pinia._s.get('ui');
        
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
    }, 1000);

    // Timeout après 30 secondes
    setTimeout(() => {
      clearInterval(initInterval);
      if (!workflowStore) {
        console.warn('n8n AI Assistant (Workflow RAG): Impossible de trouver les stores Pinia après 30 secondes');
      }
    }, 30000);
  }, 2000);

  // Écouter les messages du content script
  function setupMessageListener() {
    console.log('🎧 inject.js: Listeners configurés pour workflow RAG');
    
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
              uiStore: !!uiStore
            }
          }, '*');
          break;

        case 'GET_CURRENT_WORKFLOW':
          console.log('📋 inject.js: Récupération du workflow actuel');
          getCurrentWorkflowData();
          break;

        case 'IMPORT_WORKFLOW':
          console.log('📥 inject.js: Import workflow complet');
          importCompleteWorkflow(event.data.workflow);
          break;
      }
    });
  }

  // Nouveau : Récupérer les données du workflow actuel
  function getCurrentWorkflowData() {
    if (!workflowStore) {
      window.postMessage({
        type: 'CURRENT_WORKFLOW_RESPONSE',
        workflow: null,
        error: 'Store Pinia non disponible'
      }, '*');
      return;
    }

    try {
      // Récupérer tous les nœuds avec leurs détails complets
      const nodes = workflowStore.allNodes.map(node => ({
        id: node.id,
        name: node.name,
        type: node.type,
        position: node.position || [100, 100],
        parameters: node.parameters || {},
        typeVersion: node.typeVersion || 1,
        disabled: node.disabled || false,
        credentials: node.credentials || {}
      }));

      // Récupérer les connexions
      const connections = workflowStore.workflow.connections || {};

      // Récupérer les métadonnées du workflow
      const workflowData = {
        nodes: nodes,
        connections: connections,
        name: workflowStore.workflow.name || 'Unnamed Workflow',
        active: workflowStore.workflow.active || false,
        settings: workflowStore.workflow.settings || {},
        id: workflowStore.workflow.id || null,
        createdAt: workflowStore.workflow.createdAt || null,
        updatedAt: workflowStore.workflow.updatedAt || null
      };

      console.log('📤 inject.js: Workflow actuel envoyé:', {
        nodesCount: nodes.length,
        connectionsCount: Object.keys(connections).length,
        name: workflowData.name
      });

      window.postMessage({
        type: 'CURRENT_WORKFLOW_RESPONSE',
        workflow: workflowData
      }, '*');

    } catch (error) {
      console.error('❌ inject.js: Erreur récupération workflow:', error);
      window.postMessage({
        type: 'CURRENT_WORKFLOW_RESPONSE',
        workflow: null,
        error: error.message
      }, '*');
    }
  }

  // Importer un workflow complet généré par le système RAG
  async function importCompleteWorkflow(workflowData) {
    if (!workflowStore) {
      window.postMessage({
        type: 'IMPORT_ERROR',
        error: 'Store Pinia non disponible'
      }, '*');
      return;
    }

    try {
      console.log('🔄 Import du workflow RAG:', workflowData);

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
            nameToIdMap[node.id] = nodeId;
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

      // Importer les connexions
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
                    // Déterminer l'ID cible
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
                    
                    // Essayer différentes méthodes de connexion
                    let connectionSuccess = false;
                    
                    // Méthode 1: Manipulation directe de l'état des connexions
                    try {
                      const currentConnections = { ...workflowStore.workflow.connections || {} };
                      
                      if (!currentConnections[sourceNode.name]) {
                        currentConnections[sourceNode.name] = { main: [] };
                      }
                      if (!currentConnections[sourceNode.name].main[outputIndex]) {
                        currentConnections[sourceNode.name].main[outputIndex] = [];
                      }
                      
                      currentConnections[sourceNode.name].main[outputIndex].push({
                        node: targetNode.name,
                        type: conn.type || 'main',
                        index: conn.index || 0
                      });
                      
                      workflowStore.$patch({
                        workflow: {
                          ...workflowStore.workflow,
                          connections: currentConnections
                        }
                      });
                      
                      console.log(`✅ Connexion créée: ${sourceNode.name} → ${targetNode.name}`);
                      connectionSuccess = true;
                      
                    } catch (directError) {
                      console.log(`⚠️ Méthode directe échouée:`, directError.message);
                    }
                    
                    // Méthode 2: Via setWorkflowConnections si disponible
                    if (!connectionSuccess && workflowStore.setWorkflowConnections) {
                      try {
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
                        
                        workflowStore.setWorkflowConnections(allConnections);
                        console.log(`✅ Connexion setWorkflowConnections: ${sourceNode.name} → ${targetNode.name}`);
                        connectionSuccess = true;
                      } catch (setError) {
                        console.log(`⚠️ setWorkflowConnections échoué:`, setError.message);
                      }
                    }
                    
                    if (!connectionSuccess) {
                      console.error(`❌ Connexion échouée pour ${sourceKey} → ${conn.node}`);
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

      // Définir le nom du workflow si fourni
      if (workflowData.name) {
        workflowStore.$patch({
          workflow: {
            ...workflowStore.workflow,
            name: workflowData.name
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

      console.log(`✅ Import workflow RAG terminé: ${nodeCount} nœuds, ${connectionCount} connexions`);
      
      window.postMessage({
        type: 'IMPORT_SUCCESS',
        message: `Workflow RAG importé avec succès: ${nodeCount} nœuds, ${connectionCount} connexions`
      }, '*');

    } catch (error) {
      console.error('❌ Erreur import workflow RAG:', error);
      window.postMessage({
        type: 'IMPORT_ERROR',
        error: error.message
      }, '*');
    }
  }

  // Ajouter les styles d'animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      0% { opacity: 0; transform: scale(0.9); }
      100% { opacity: 1; transform: scale(1); }
    }
    
    .workflow-rag-imported {
      animation: fadeIn 0.5s ease-out;
      box-shadow: 0 0 20px rgba(34, 197, 94, 0.6) !important;
    }
  `;
  document.head.appendChild(style);

})(); 