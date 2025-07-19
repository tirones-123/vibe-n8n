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
          importCompleteWorkflow(event.data.workflow, event.data.isImprovement);
          break;
      }
    });
  }

  // Fonction utilitaire pour nettoyer les objets non-sérialisables
  function cleanForSerialization(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => cleanForSerialization(item));
    }
    
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      try {
        if (value === null || value === undefined) {
          cleaned[key] = value;
        } else if (typeof value === 'function') {
          // Ignorer les fonctions
          continue;
        } else if (typeof value === 'object') {
          // Test de sérialisation
          JSON.stringify(value);
          cleaned[key] = cleanForSerialization(value);
        } else {
          cleaned[key] = value;
        }
      } catch (e) {
        // Si un objet ne peut pas être sérialisé, le remplacer par une description
        console.log(`⚠️ Object non-sérialisable: ${key}`, e.message);
        cleaned[key] = `[Non-serializable: ${typeof value}]`;
      }
    }
    return cleaned;
  }

  // Nouveau : Récupérer les données du workflow actuel
  function getCurrentWorkflowData() {
    console.log('%c📋 INJECT: getCurrentWorkflowData called', 'background: darkgreen; color: white; padding: 2px 6px;');
    
    if (!workflowStore) {
      console.error('❌ INJECT: Store Pinia non disponible');
      window.postMessage({
        type: 'CURRENT_WORKFLOW_RESPONSE',
        workflow: null,
        error: 'Store Pinia non disponible'
      }, '*');
      return;
    }

    try {
      // 📊 DETAILED LOGGING - Store analysis
      console.log('%c🔍 INJECT: Store analysis', 'background: purple; color: white; padding: 2px 6px;');
      console.log('🏪 workflowStore available:', !!workflowStore);
      console.log('📊 workflowStore.allNodes available:', !!workflowStore.allNodes);
      console.log('🔢 Raw nodes count:', workflowStore.allNodes?.length || 0);
      console.log('🔗 Raw connections available:', !!workflowStore.workflow?.connections);
      console.log('📝 Raw workflow name:', workflowStore.workflow?.name);
      
      // Log des nœuds bruts avant traitement
      const rawNodes = workflowStore.allNodes || [];
      if (rawNodes.length > 0) {
        console.log('📋 Raw nodes before processing:');
        rawNodes.forEach((node, i) => {
          console.log(`  ${i + 1}. "${node.name}" (${node.type}) - ID: ${node.id}`);
          console.log(`      Position:`, node.position);
          console.log(`      Parameters keys:`, node.parameters ? Object.keys(node.parameters) : 'none');
          console.log(`      Credentials keys:`, node.credentials ? Object.keys(node.credentials) : 'none');
        });
      }
      
      console.log('📋 inject.js: Récupération workflow, nœuds disponibles:', workflowStore.allNodes?.length || 0);
      
      // Récupérer tous les nœuds avec leurs détails complets
      const nodes = rawNodes.map(node => {
        console.log(`🔄 Processing node: ${node.name} (${node.type})`);
        try {
          const processedNode = {
            id: node.id,
            name: node.name,
            type: node.type,
            position: Array.isArray(node.position) ? [...node.position] : [100, 100],
            parameters: cleanForSerialization(node.parameters) || {},
            typeVersion: node.typeVersion || 1,
            disabled: Boolean(node.disabled),
            credentials: cleanForSerialization(node.credentials) || {}
          };
          
          console.log(`  ✅ Node processed successfully:`, {
            id: processedNode.id,
            name: processedNode.name,
            type: processedNode.type,
            position: processedNode.position,
            parametersKeys: Object.keys(processedNode.parameters),
            credentialsKeys: Object.keys(processedNode.credentials)
          });
          
          return processedNode;
        } catch (nodeError) {
          console.log(`⚠️ Erreur sérialisation nœud ${node.name}:`, nodeError.message);
          return {
            id: node.id,
            name: node.name,
            type: node.type,
            position: [100, 100],
            parameters: {},
            typeVersion: 1,
            disabled: false,
            credentials: {}
          };
        }
      });

      // Récupérer les connexions
      const rawConnections = workflowStore.workflow?.connections || {};
      console.log('🔗 Raw connections before processing:', rawConnections);
      console.log('🔗 Raw connections keys:', Object.keys(rawConnections));
      
      const connections = cleanForSerialization(rawConnections);
      console.log('🔗 Processed connections:', connections);

      // Récupérer les métadonnées du workflow
      const workflowData = {
        nodes: nodes,
        connections: connections,
        name: workflowStore.workflow?.name || 'Unnamed Workflow',
        active: Boolean(workflowStore.workflow?.active),
        settings: cleanForSerialization(workflowStore.workflow?.settings) || {},
        id: workflowStore.workflow?.id || null,
        createdAt: workflowStore.workflow?.createdAt || null,
        updatedAt: workflowStore.workflow?.updatedAt || null
      };

      // 📊 DETAILED LOGGING - Final workflow data
      console.log('%c📊 INJECT: Final workflow data prepared', 'background: darkblue; color: white; padding: 2px 6px;');
      console.log('📝 Final workflow structure:');
      console.log('  - nodes count:', workflowData.nodes.length);
      console.log('  - connections count:', Object.keys(workflowData.connections).length);
      console.log('  - name:', workflowData.name);
      console.log('  - active:', workflowData.active);
      console.log('  - id:', workflowData.id);
      
      if (workflowData.nodes.length > 0) {
        console.log('📋 Final processed nodes:');
        workflowData.nodes.forEach((node, i) => {
          console.log(`  ${i + 1}. "${node.name}" (${node.type}) - ID: ${node.id}`);
          console.log(`      Position: [${node.position.join(', ')}]`);
          console.log(`      Parameters: ${Object.keys(node.parameters).length} keys`);
          console.log(`      Credentials: ${Object.keys(node.credentials).length} keys`);
        });
      }
      
      if (Object.keys(workflowData.connections).length > 0) {
        console.log('🔗 Final processed connections:');
        Object.entries(workflowData.connections).forEach(([source, outputs]) => {
          console.log(`  ${source}:`, outputs);
        });
      }

      console.log('📤 inject.js: Workflow actuel envoyé:', {
        nodesCount: nodes.length,
        connectionsCount: Object.keys(connections).length,
        name: workflowData.name
      });

      // Test de sérialisation avant envoi
      try {
        const serializedTest = JSON.stringify(workflowData);
        const serializedSize = serializedTest.length;
        console.log('✅ Serialization test passed, size:', serializedSize, 'chars (', (serializedSize / 1024).toFixed(1), 'KB)');
        console.log('📦 Serialized data sample (first 500 chars):', serializedTest.substring(0, 500) + '...');
        
        window.postMessage({
          type: 'CURRENT_WORKFLOW_RESPONSE',
          workflow: workflowData
        }, '*');
      } catch (serializeError) {
        console.error('❌ Erreur sérialisation finale:', serializeError.message);
        console.log('🔧 Attempting fallback serialization...');
        
        // Envoi d'une version minimale
        const minimalWorkflow = {
          nodes: nodes.map(n => ({ id: n.id, name: n.name, type: n.type })),
          connections: {},
          name: workflowData.name
        };
        
        try {
          JSON.stringify(minimalWorkflow);
          console.log('✅ Fallback serialization successful');
          window.postMessage({
            type: 'CURRENT_WORKFLOW_RESPONSE',
            workflow: minimalWorkflow
          }, '*');
        } catch (fallbackError) {
          console.error('❌ Even fallback serialization failed:', fallbackError.message);
          window.postMessage({
            type: 'CURRENT_WORKFLOW_RESPONSE',
            workflow: null,
            error: `Serialization failed: ${serializeError.message}`
          }, '*');
        }
      }

    } catch (error) {
      console.error('❌ inject.js: Erreur récupération workflow:', error);
      console.error('❌ Error stack:', error.stack);
      
      // Fallback : au moins compter les nœuds
      try {
        const nodeCount = workflowStore.allNodes?.length || 0;
        console.log('🔄 Fallback : détecté', nodeCount, 'nœuds');
        
        if (nodeCount > 0) {
          // Envoyer une version minimale pour indiquer qu'il y a des nœuds
          window.postMessage({
            type: 'CURRENT_WORKFLOW_RESPONSE',
            workflow: {
              nodes: Array.from({ length: nodeCount }, (_, i) => ({
                id: `fallback_${i}`,
                name: `Node ${i + 1}`,
                type: 'unknown'
              })),
              connections: {},
              name: 'Current Workflow'
            }
          }, '*');
        } else {
          window.postMessage({
            type: 'CURRENT_WORKFLOW_RESPONSE',
            workflow: null,
            error: error.message
          }, '*');
        }
      } catch (fallbackError) {
        console.error('❌ Même le fallback a échoué:', fallbackError.message);
        window.postMessage({
          type: 'CURRENT_WORKFLOW_RESPONSE',
          workflow: null,
          error: error.message
        }, '*');
      }
    }
  }

  // Importer un workflow complet généré par le système RAG
  async function importCompleteWorkflow(workflowData, isImprovement = false) {
    if (!workflowStore) {
      window.postMessage({
        type: 'IMPORT_ERROR',
        error: 'Store Pinia non disponible'
      }, '*');
      return;
    }

    try {
      console.log('🔄 Import du workflow RAG:', workflowData);
      console.log('🔄 Mode d\'import:', isImprovement ? 'amélioration (suppression ancien)' : 'nouveau workflow');

      // Effacer le workflow actuel
      const currentNodes = [...workflowStore.allNodes];
      if (currentNodes.length > 0) {
        console.log(`🗑️ Suppression de ${currentNodes.length} nœuds existants...`);
        if (isImprovement) {
          console.log('📝 Nœuds supprimés:', currentNodes.map(n => `${n.name} (${n.type})`));
        }
        
        // Méthode 1: Essayer removeNode pour chaque nœud
        for (const node of currentNodes) {
          try {
            workflowStore.removeNode(node.id);
          } catch (e) {
            console.log(`⚠️ removeNode échoué pour ${node.name}:`, e.message);
          }
        }
        
        // Méthode 2: Vider directement le state du workflow (plus agressif)
        try {
          workflowStore.$patch({
            workflow: {
              ...workflowStore.workflow,
              nodes: [],
              connections: {}
            }
          });
          console.log('🧹 Workflow vidé via $patch');
        } catch (patchError) {
          console.log('⚠️ $patch échoué:', patchError.message);
        }
        
        // Méthode 3: Si une méthode clearWorkflow existe
        if (typeof workflowStore.clearWorkflow === 'function') {
          try {
            workflowStore.clearWorkflow();
            console.log('🧹 Workflow vidé via clearWorkflow');
          } catch (clearError) {
            console.log('⚠️ clearWorkflow échoué:', clearError.message);
          }
        }
        
        // Méthode 4: Réinitialisation complète du workflow si méthode existe
        if (typeof workflowStore.resetWorkflow === 'function') {
          try {
            workflowStore.resetWorkflow();
            console.log('🧹 Workflow réinitialisé via resetWorkflow');
          } catch (resetError) {
            console.log('⚠️ resetWorkflow échoué:', resetError.message);
          }
        }
        
        // Vérification post-suppression
        const remainingNodes = workflowStore.allNodes;
        if (remainingNodes.length > 0) {
          console.warn(`⚠️ ${remainingNodes.length} nœuds toujours présents après suppression:`, remainingNodes.map(n => n.name));
          
          // Dernière tentative: suppression force via state manipulation
          try {
            // Accès direct au state interne
            const state = workflowStore.$state;
            if (state.workflow) {
              state.workflow.nodes = [];
              state.workflow.connections = {};
              console.log('🧹 Suppression forcée via state direct');
            }
          } catch (stateError) {
            console.log('⚠️ Suppression état direct échoué:', stateError.message);
          }
        } else {
          console.log('✅ Workflow précédent supprimé avec succès');
        }
      } else {
        console.log('📋 Aucun nœud à supprimer (workflow vide)');
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
          
          // Conserver toutes les propriétés du nœud généré afin de ne rien perdre (notes, couleur, etc.)
          const sanitizedNode = cleanForSerialization({
            ...node,
            id: nodeId // garantir un ID défini
          });

          workflowStore.addNode(sanitizedNode);
        }
      }

      console.log('🗺️ Mapping nom->ID:', nameToIdMap);

      // Appliquer directement l'objet "connections" complet fourni par l'IA
      if (workflowData.connections && typeof workflowData.connections === 'object') {
        workflowStore.$patch({
          workflow: {
            ...workflowStore.workflow,
            connections: cleanForSerialization(workflowData.connections)
          }
        });
        console.log('✅ Connexions importées via patch global');
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

      const importMessage = isImprovement ? 
        `✅ Workflow amélioré avec succès: ${nodeCount} nœuds, ${connectionCount} connexions` :
        `✅ Import workflow RAG terminé: ${nodeCount} nœuds, ${connectionCount} connexions`;
      
      console.log(importMessage);
      
      window.postMessage({
        type: 'IMPORT_SUCCESS',
        message: isImprovement ? 
          `Workflow amélioré avec succès: ${nodeCount} nœuds, ${connectionCount} connexions` :
          `Workflow RAG importé avec succès: ${nodeCount} nœuds, ${connectionCount} connexions`
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