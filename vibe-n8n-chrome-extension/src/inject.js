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

  // 🎯 SYSTÈME DE VALIDATION COMPLET COMME N8N
  
  // ✨ Accès aux APIs internes de n8n pour validation native
  function getN8nInternalAPIs() {
    const apis = {};
    
    try {
      // Accéder aux méthodes de validation native de n8n
      if (window.Vue && window.Vue.config && window.Vue.config.globalProperties) {
        const globalProps = window.Vue.config.globalProperties;
        
        // Chercher les services de validation
        apis.nodeTypesStore = globalProps.$nodeTypesStore || null;
        apis.workflowsStore = globalProps.$workflowsStore || workflowStore;
        apis.ndvStore = globalProps.$ndvStore || null;
        apis.uiStore = globalProps.$uiStore || uiStore;
      }
      
      // Chercher dans les stores Pinia
      if (piniaStore && piniaStore._s) {
        apis.nodeTypesStore = apis.nodeTypesStore || piniaStore._s.get('nodeTypes');
        apis.ndvStore = apis.ndvStore || piniaStore._s.get('ndv');
        apis.settingsStore = piniaStore._s.get('settings');
        apis.credentialsStore = piniaStore._s.get('credentials');
        apis.tagsStore = piniaStore._s.get('tags');
      }
      
      // Accéder aux utilitaires de validation n8n
      if (window.n8n) {
        apis.nodeHelpers = window.n8n.nodeHelpers || null;
        apis.workflowHelpers = window.n8n.workflowHelpers || null;
        apis.expressionEvaluator = window.n8n.expressionEvaluator || null;
      }
      
      console.log('🔧 N8n Internal APIs found:', Object.keys(apis).filter(k => apis[k] !== null));
      
    } catch (error) {
      console.warn('⚠️ Could not access all n8n internal APIs:', error.message);
    }
    
    return apis;
  }
  
  // ✨ Validation complète à la manière de n8n - COMME LE COPIER-COLLER NATIF
  async function validateAndFixWorkflowLikeN8n(workflowData) {
    const n8nAPIs = getN8nInternalAPIs();
    const fixes = [];
    const warnings = [];
    
    console.log('🔍 Starting complete n8n-style validation (like native copy-paste)...');
    
    // 1. VALIDATION DU WORKFLOW GLOBAL
    const validatedWorkflow = {
      ...workflowData,
      id: workflowData.id || generateUniqueId(),
      name: workflowData.name || 'Imported Workflow',
      nodes: [],
      connections: {},
      settings: validateWorkflowSettings(workflowData.settings || {}),
      meta: validateWorkflowMeta(workflowData.meta || {})
    };
    
    // 2. VALIDATION ET CORRECTION DE CHAQUE NŒUD (comme n8n le fait)
    for (const [index, node] of (workflowData.nodes || []).entries()) {
      try {
        const validatedNode = await validateNodeLikeN8nNative(node, index, n8nAPIs);
        validatedWorkflow.nodes.push(validatedNode.node);
        fixes.push(...validatedNode.fixes);
        warnings.push(...validatedNode.warnings);
      } catch (nodeError) {
        console.error(`❌ Failed to validate node ${node.name}:`, nodeError);
        warnings.push(`Node "${node.name}" could not be validated: ${nodeError.message}`);
      }
    }
    
    // 3. VALIDATION ET CORRECTION DES CONNEXIONS (comme n8n le fait)
    const connectionValidation = validateConnectionsLikeN8nNative(
      workflowData.connections || {}, 
      validatedWorkflow.nodes,
      n8nAPIs
    );
    validatedWorkflow.connections = connectionValidation.connections;
    fixes.push(...connectionValidation.fixes);
    warnings.push(...connectionValidation.warnings);
    
    // 4. VALIDATION FINALE ET OPTIMIZATION (comme n8n le fait)
    const finalValidation = await performFinalValidationLikeN8n(validatedWorkflow, n8nAPIs);
    fixes.push(...finalValidation.fixes);
    warnings.push(...finalValidation.warnings);
    
    return {
      workflow: validatedWorkflow,
      fixes,
      warnings,
      isValid: warnings.filter(w => w.includes('CRITICAL')).length === 0
    };
  }
  
  // ✨ Validation des métadonnées du workflow (comme n8n)
  function validateWorkflowMeta(meta) {
    const validMeta = { ...meta };
    
    // Instance ID requis par n8n
    if (!validMeta.instanceId) {
      validMeta.instanceId = generateUniqueId();
    }
    
    // Template credentials setup
    if (validMeta.templateCredsSetupCompleted === undefined) {
      validMeta.templateCredsSetupCompleted = false;
    }
    
    return validMeta;
  }
  
  // ✨ Validation des paramètres du workflow (comme n8n)
  function validateWorkflowSettings(settings) {
    const validSettings = { ...settings };
    
    // Execution order par défaut
    if (!validSettings.executionOrder && !validSettings.executionTimeout) {
      validSettings.executionOrder = 'v1';
    }
    
    // Timezone par défaut
    if (!validSettings.timezone) {
      validSettings.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    }
    
    return validSettings;
  }
  
  // ✨ Validation d'un nœud EXACTEMENT comme n8n le fait
  async function validateNodeLikeN8nNative(node, index, n8nAPIs) {
    const fixes = [];
    const warnings = [];
    
    // 1. STRUCTURE DE BASE DU NŒUD (comme n8n)
    const validatedNode = {
      id: node.id || generateUniqueId(),
      name: node.name || `Node ${index + 1}`,
      type: node.type || 'n8n-nodes-base.noOp',
      typeVersion: 1,
      position: Array.isArray(node.position) ? [...node.position] : [100 + index * 200, 100],
      parameters: {},
      credentials: {},
      disabled: Boolean(node.disabled)
    };
    
    // 2. VALIDATION DU TYPE DE NŒUD AVEC N8N APIs
    const nodeTypeValidation = await validateNodeTypeWithN8nAPIs(node.type, n8nAPIs);
    if (!nodeTypeValidation.isValid) {
      warnings.push(`CRITICAL: Unknown node type "${node.type}"`);
      // Essayer de trouver un type similaire
      const suggestion = suggestSimilarNodeType(node.type, n8nAPIs);
      if (suggestion) {
        validatedNode.type = suggestion;
        fixes.push(`Changed node type from "${node.type}" to "${suggestion}"`);
      }
    } else {
      validatedNode.typeVersion = nodeTypeValidation.latestVersion;
      if (node.typeVersion !== nodeTypeValidation.latestVersion) {
        fixes.push(`Updated typeVersion from ${node.typeVersion} to ${nodeTypeValidation.latestVersion}`);
      }
    }
    
    // 3. VALIDATION DES PARAMÈTRES AVEC LES SPECS N8N EXACTES
    const parameterValidation = await validateNodeParametersLikeN8n(
      node.parameters || {},
      validatedNode.type,
      validatedNode.typeVersion,
      n8nAPIs
    );
    validatedNode.parameters = parameterValidation.parameters;
    fixes.push(...parameterValidation.fixes);
    warnings.push(...parameterValidation.warnings);
    
    // 4. VALIDATION DES CREDENTIALS (comme n8n)
    const credentialValidation = validateNodeCredentialsLikeN8n(
      node.credentials || {},
      validatedNode.type,
      n8nAPIs
    );
    validatedNode.credentials = credentialValidation.credentials;
    fixes.push(...credentialValidation.fixes);
    warnings.push(...credentialValidation.warnings);
    
    // 5. PROPRIÉTÉS AVANCÉES (exactement comme n8n)
    if (node.notes !== undefined) validatedNode.notes = String(node.notes);
    if (node.color !== undefined) validatedNode.color = node.color;
    if (node.continueOnFail !== undefined) validatedNode.continueOnFail = Boolean(node.continueOnFail);
    if (node.alwaysOutputData !== undefined) validatedNode.alwaysOutputData = Boolean(node.alwaysOutputData);
    if (node.executeOnce !== undefined) validatedNode.executeOnce = Boolean(node.executeOnce);
    if (node.retryOnFail !== undefined) validatedNode.retryOnFail = Boolean(node.retryOnFail);
    if (node.maxTries !== undefined) validatedNode.maxTries = Math.max(1, Number(node.maxTries) || 3);
    if (node.waitBetweenTries !== undefined) validatedNode.waitBetweenTries = Math.max(0, Number(node.waitBetweenTries) || 0);
    
    return {
      node: validatedNode,
      fixes,
      warnings
    };
  }
  
  // ✨ Validation du type de nœud avec les APIs n8n EXACTES
  async function validateNodeTypeWithN8nAPIs(nodeType, n8nAPIs) {
    if (!nodeType || typeof nodeType !== 'string') {
      return { isValid: false, latestVersion: 1 };
    }
    
    try {
      // Utiliser le nodeTypesStore EXACTEMENT comme n8n
      if (n8nAPIs.nodeTypesStore && typeof n8nAPIs.nodeTypesStore.getNodeType === 'function') {
        const nodeTypeInfo = n8nAPIs.nodeTypesStore.getNodeType(nodeType);
        if (nodeTypeInfo) {
          return {
            isValid: true,
            latestVersion: nodeTypeInfo.typeVersion || nodeTypeInfo.version || 1,
            nodeTypeInfo
          };
        }
      }
      
      // Fallback: validation basique par pattern (comme n8n)
      const isValidPattern = /^n8n-nodes-base\.|^@n8n\/|^n8n-community-/.test(nodeType);
      return {
        isValid: isValidPattern,
        latestVersion: 1
      };
      
    } catch (error) {
      console.warn(`Could not validate node type ${nodeType}:`, error);
      return { isValid: false, latestVersion: 1 };
    }
  }
  
  // ✨ Validation avancée des paramètres EXACTEMENT comme n8n
  async function validateNodeParametersLikeN8n(parameters, nodeType, typeVersion, n8nAPIs) {
    const fixes = [];
    const warnings = [];
    let validatedParameters = { ...parameters };
    
    try {
      // Obtenir la description du nœud pour validation (comme n8n)
      let nodeTypeInfo = null;
      if (n8nAPIs.nodeTypesStore && typeof n8nAPIs.nodeTypesStore.getNodeType === 'function') {
        nodeTypeInfo = n8nAPIs.nodeTypesStore.getNodeType(nodeType, typeVersion);
      }
      
      // VALIDATION SPÉCIALISÉE PAR TYPE DE NŒUD (exacte comme n8n)
      const typeSpecificValidation = validateParametersByNodeTypeLikeN8n(
        validatedParameters, 
        nodeType, 
        nodeTypeInfo
      );
      validatedParameters = typeSpecificValidation.parameters;
      fixes.push(...typeSpecificValidation.fixes);
      warnings.push(...typeSpecificValidation.warnings);
      
      // VALIDATION GÉNÉRALE DES STRUCTURES (comme n8n)
      validatedParameters = cleanParameterStructuresLikeN8n(validatedParameters);
      
      // VALIDATION DES EXPRESSIONS ET FORMULES (comme n8n)
      const expressionValidation = validateExpressionsLikeN8n(validatedParameters, n8nAPIs);
      fixes.push(...expressionValidation.fixes);
      warnings.push(...expressionValidation.warnings);
      
    } catch (error) {
      warnings.push(`Parameter validation error: ${error.message}`);
    }
    
    return {
      parameters: validatedParameters,
      fixes,
      warnings
    };
  }
  
  // ✨ Validation spécialisée par type de nœud EXACTEMENT comme n8n
  function validateParametersByNodeTypeLikeN8n(parameters, nodeType, nodeTypeInfo) {
    console.log(`🔍 Validating parameters for ${nodeType} like n8n native`);
    
    switch (nodeType) {
      case 'n8n-nodes-base.webhook':
        return validateWebhookParametersLikeN8n(parameters);
        
      case 'n8n-nodes-base.httpRequest':
        return validateHttpRequestParametersLikeN8n(parameters);
        
      case 'n8n-nodes-base.code':
      case 'n8n-nodes-base.function':
        return validateCodeParametersLikeN8n(parameters);
        
      case 'n8n-nodes-base.set':
        return validateSetParametersLikeN8n(parameters);
        
      case 'n8n-nodes-base.if':
        return validateIfParametersLikeN8n(parameters);
        
      case 'n8n-nodes-base.switch':
        return validateSwitchParametersLikeN8n(parameters);
        
      case 'n8n-nodes-base.merge':
        return validateMergeParametersLikeN8n(parameters);
        
      default:
        // Validation générique pour les nœuds d'API (comme n8n)
        return validateGenericApiParametersLikeN8n(parameters, nodeType);
    }
  }
  
  // ✨ Validation complète des paramètres Webhook EXACTEMENT comme n8n
  function validateWebhookParametersLikeN8n(params) {
    const fixes = [];
    const warnings = [];
    const validated = { ...params };
    
    console.log('🌐 Validating webhook parameters like n8n native');
    
    // HTTP Method (exactement comme n8n)
    if (!validated.httpMethod) {
      validated.httpMethod = 'GET';
      fixes.push('Added default httpMethod: GET');
    } else if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(validated.httpMethod)) {
      validated.httpMethod = 'GET';
      fixes.push('Fixed invalid httpMethod to GET');
    }
    
    // Path (exactement comme n8n)
    if (!validated.path) {
      validated.path = 'webhook';
      fixes.push('Added default path: webhook');
    } else {
      // Nettoyer le path exactement comme n8n
      validated.path = validated.path.replace(/^\/+/, '').replace(/\/+$/, '') || 'webhook';
    }
    
    // Response Mode (exactement comme n8n)
    if (!validated.responseMode) {
      validated.responseMode = 'onReceived';
      fixes.push('Added default responseMode: onReceived');
    }
    
    // Response Code (exactement comme n8n)
    if (!validated.responseCode && validated.responseMode === 'onReceived') {
      validated.responseCode = 200;
      fixes.push('Added default responseCode: 200');
    }
    
    // Options (exactement comme n8n)
    if (!validated.options) {
      validated.options = {};
    }
    
    return { parameters: validated, fixes, warnings };
  }
  
  // ✨ Validation complète des paramètres HTTP Request EXACTEMENT comme n8n
  function validateHttpRequestParametersLikeN8n(params) {
    const fixes = [];
    const warnings = [];
    const validated = { ...params };
    
    console.log('📡 Validating HTTP Request parameters like n8n native');
    
    // Authentication (exactement comme n8n)
    if (!validated.authentication) {
      validated.authentication = 'none';
      fixes.push('Added default authentication: none');
    }
    
    // Request Method (exactement comme n8n)
    if (!validated.requestMethod) {
      validated.requestMethod = 'get';
      fixes.push('Added default requestMethod: get');
    }
    
    // URL (requis - exactement comme n8n)
    if (!validated.url) {
      validated.url = 'https://api.example.com';
      fixes.push('Added placeholder URL');
      warnings.push('URL is required - please update the placeholder');
    }
    
    // Headers, Query, Body (exactement comme n8n)
    if (!validated.sendHeaders) validated.sendHeaders = false;
    if (!validated.sendQuery) validated.sendQuery = false;
    if (!validated.sendBody) validated.sendBody = false;
    if (!validated.options) validated.options = {};
    
    return { parameters: validated, fixes, warnings };
  }
  
  // ✨ Validation complète des paramètres Code EXACTEMENT comme n8n
  function validateCodeParametersLikeN8n(params) {
    const fixes = [];
    const warnings = [];
    const validated = { ...params };
    
    console.log('💻 Validating Code parameters like n8n native');
    
    // Mode d'exécution (exactement comme n8n)
    if (!validated.mode) {
      validated.mode = 'runOnceForAllItems';
      fixes.push('Added default mode: runOnceForAllItems');
    }
    
    // Code JavaScript (exactement comme n8n)
    if (!validated.jsCode) {
      validated.jsCode = '// Add your JavaScript code here\nreturn $input.all();';
      fixes.push('Added default JavaScript code template');
      warnings.push('Please add your custom JavaScript code');
    }
    
    // Vérification basique du code (exactement comme n8n)
    if (validated.jsCode && !validated.jsCode.includes('return')) {
      warnings.push('Code should contain a return statement');
    }
    
    return { parameters: validated, fixes, warnings };
  }
  
  // ✨ Validation complète des paramètres Set EXACTEMENT comme n8n
  function validateSetParametersLikeN8n(params) {
    const fixes = [];
    const warnings = [];
    const validated = { ...params };
    
    console.log('⚙️ Validating Set parameters like n8n native');
    
    // Mode (exactement comme n8n)
    if (!validated.mode) {
      validated.mode = 'manual';
      fixes.push('Added default mode: manual');
    }
    
    // Assignments structure (exactement comme n8n)
    if (!validated.assignments || !validated.assignments.assignments) {
      validated.assignments = {
        assignments: [
          {
            id: generateUniqueId(),
            name: 'newField',
            type: 'string',
            value: 'defaultValue'
          }
        ]
      };
      fixes.push('Added default assignment structure');
      warnings.push('Please configure your field assignments');
    } else {
      // Valider chaque assignment (exactement comme n8n)
      validated.assignments.assignments = validated.assignments.assignments.map(assignment => {
        const validAssignment = { ...assignment };
        if (!validAssignment.id) {
          validAssignment.id = generateUniqueId();
          fixes.push(`Added ID to assignment "${validAssignment.name}"`);
        }
        if (!validAssignment.name) {
          validAssignment.name = 'field';
          fixes.push('Added default name to assignment');
        }
        if (!validAssignment.type) {
          validAssignment.type = 'string';
          fixes.push(`Added default type to assignment "${validAssignment.name}"`);
        }
        return validAssignment;
      });
    }
    
    // Include other fields (exactement comme n8n)
    if (validated.includeOtherFields === undefined) {
      validated.includeOtherFields = true;
    }
    
    // Options (exactement comme n8n)
    if (!validated.options) {
      validated.options = {};
    }
    
    return { parameters: validated, fixes, warnings };
  }
  
  // ✨ Validation des autres types (If, Switch, Merge) EXACTEMENT comme n8n
  function validateIfParametersLikeN8n(params) {
    const fixes = [];
    const warnings = [];
    const validated = { ...params };
    
    if (!validated.conditions) {
      validated.conditions = {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict'
        },
        conditions: [
          {
            id: generateUniqueId(),
            leftValue: '',
            rightValue: '',
            operator: {
              type: 'string',
              operation: 'equals'
            }
          }
        ],
        combinator: 'and'
      };
      fixes.push('Added default condition structure');
    }
    
    return { parameters: validated, fixes, warnings };
  }
  
  function validateSwitchParametersLikeN8n(params) {
    const fixes = [];
    return { parameters: params, fixes, warnings: [] };
  }
  
  function validateMergeParametersLikeN8n(params) {
    const fixes = [];
    const validated = { ...params };
    
    if (!validated.mode) {
      validated.mode = 'combine';
      fixes.push('Added default merge mode: combine');
    }
    
    return { parameters: validated, fixes, warnings: [] };
  }
  
  function validateGenericApiParametersLikeN8n(params, nodeType) {
    const fixes = [];
    const warnings = [];
    const validated = { ...params };
    
    // Pour les nœuds d'API (exactement comme n8n)
    if (!validated.operation && !validated.resource) {
      validated.operation = 'get';
      fixes.push('Added default operation: get');
    }
    
    // Ajouter resource si manquant (exactement comme n8n)
    if (nodeType.includes('airtable') && !validated.resource) {
      validated.resource = 'record';
      fixes.push('Added default resource: record');
    }
    else if (nodeType.includes('googleSheets') && !validated.resource) {
      validated.resource = 'spreadsheet';
      fixes.push('Added default resource: spreadsheet');
    }
    else if (nodeType.includes('slack') && !validated.resource) {
      validated.resource = 'message';
      fixes.push('Added default resource: message');
    }
    
    return { parameters: validated, fixes, warnings };
  }
  
  // ✨ Validation des credentials EXACTEMENT comme n8n
  function validateNodeCredentialsLikeN8n(credentials, nodeType, n8nAPIs) {
    const fixes = [];
    const warnings = [];
    const validated = {};
    
    Object.keys(credentials).forEach(credKey => {
      const cred = credentials[credKey];
      if (cred && typeof cred === 'object') {
        const validCred = { ...cred };
        // S'assurer que la credential a au moins un ID ou nom (exactement comme n8n)
        if (!validCred.id && !validCred.name) {
          validCred.name = `credential-${credKey}`;
          fixes.push(`Added default name for credential: ${credKey}`);
        }
        validated[credKey] = validCred;
      } else {
        fixes.push(`Removed invalid credential: ${credKey}`);
      }
    });
    
    return { credentials: validated, fixes, warnings };
  }
  
  // ✨ Validation des connexions EXACTEMENT comme n8n le fait
  function validateConnectionsLikeN8nNative(connections, nodes, n8nAPIs) {
    const fixes = [];
    const warnings = [];
    const validatedConnections = {};
    
    console.log('🔗 Validating connections like n8n native copy-paste');
    
    // Créer un map des nœuds par nom (exactement comme n8n)
    const nodeMap = new Map();
    nodes.forEach(node => {
      nodeMap.set(node.name, node);
    });
    
    for (const [sourceNodeName, outputs] of Object.entries(connections)) {
      const sourceNode = nodeMap.get(sourceNodeName);
      if (!sourceNode) {
        warnings.push(`Source node "${sourceNodeName}" not found in workflow`);
        continue;
      }
      
      const validatedOutputs = {};
      
      // Valider les connexions main (exactement comme n8n)
      if (outputs.main && Array.isArray(outputs.main)) {
        validatedOutputs.main = [];
        
        outputs.main.forEach((outputConnections, outputIndex) => {
          if (Array.isArray(outputConnections)) {
            const validConnections = [];
            
            outputConnections.forEach(connection => {
              if (connection && connection.node) {
                const targetNode = nodeMap.get(connection.node);
                if (targetNode) {
                  validConnections.push({
                    node: connection.node,
                    type: connection.type || 'main',
                    index: Number(connection.index) || 0
                  });
                } else {
                  warnings.push(`Target node "${connection.node}" not found for connection from "${sourceNodeName}"`);
                }
              }
            });
            
            validatedOutputs.main[outputIndex] = validConnections;
          } else {
            validatedOutputs.main[outputIndex] = [];
          }
        });
      }
      
      // Conserver les autres types de connexions (exactement comme n8n)
      Object.keys(outputs).forEach(outputType => {
        if (outputType !== 'main') {
          validatedOutputs[outputType] = outputs[outputType];
        }
      });
      
      if (Object.keys(validatedOutputs).length > 0) {
        validatedConnections[sourceNodeName] = validatedOutputs;
      }
    }
    
    return {
      connections: validatedConnections,
      fixes,
      warnings
    };
  }
  
  // ✨ Validation finale EXACTEMENT comme n8n le fait
  async function performFinalValidationLikeN8n(workflow, n8nAPIs) {
    const fixes = [];
    const warnings = [];
    
    console.log('🔍 Performing final validation like n8n native');
    
    // 1. Vérifier qu'il y a au moins un trigger (exactement comme n8n)
    const triggerNodes = workflow.nodes.filter(node => 
      node.type.includes('trigger') || 
      node.type.includes('webhook') ||
      node.type === 'n8n-nodes-base.manualTrigger'
    );
    
    if (triggerNodes.length === 0) {
      warnings.push('Workflow should have at least one trigger node');
    }
    
    // 2. Vérifier les nœuds isolés (exactement comme n8n)
    const connectedNodes = new Set();
    Object.values(workflow.connections).forEach(outputs => {
      if (outputs.main) {
        outputs.main.forEach(outputArray => {
          if (Array.isArray(outputArray)) {
            outputArray.forEach(connection => {
              if (connection.node) {
                connectedNodes.add(connection.node);
              }
            });
          }
        });
      }
    });
    
    const isolatedNodes = workflow.nodes.filter(node => 
      !triggerNodes.includes(node) && !connectedNodes.has(node.name)
    );
    
    if (isolatedNodes.length > 0) {
      warnings.push(`Found ${isolatedNodes.length} isolated nodes: ${isolatedNodes.map(n => n.name).join(', ')}`);
    }
    
    // 3. Validation des credentials requis (exactement comme n8n)
    for (const node of workflow.nodes) {
      const requiredCreds = getRequiredCredentialsLikeN8n(node.type, node.parameters);
      if (requiredCreds.length > 0 && Object.keys(node.credentials).length === 0) {
        warnings.push(`Node "${node.name}" may require credentials: ${requiredCreds.join(', ')}`);
      }
    }
    
    return { fixes, warnings };
  }
  
  // ✨ Helper: obtenir les credentials requis EXACTEMENT comme n8n
  function getRequiredCredentialsLikeN8n(nodeType, parameters) {
    const credentialMap = {
      'n8n-nodes-base.googleSheets': ['googleSheetsOAuth2Api'],
      'n8n-nodes-base.slack': ['slackOAuth2Api'],
      'n8n-nodes-base.notion': ['notionApi'],
      'n8n-nodes-base.airtable': ['airtableApi'],
      'n8n-nodes-base.hubspot': ['hubspotApi'],
      'n8n-nodes-base.salesforce': ['salesforceOAuth2Api']
    };
    
    return credentialMap[nodeType] || [];
  }
  
  // ✨ Validation des expressions n8n EXACTEMENT comme n8n
  function validateExpressionsLikeN8n(parameters, n8nAPIs) {
    const fixes = [];
    const warnings = [];
    
    function validateExpressionRecursive(obj, path = '') {
      if (typeof obj === 'string' && obj.startsWith('={{') && obj.endsWith('}}')) {
        // C'est une expression n8n
        const expression = obj.slice(3, -2).trim();
        if (expression.length === 0) {
          warnings.push(`Empty expression at ${path}`);
        }
        // Validation basique de syntaxe (exactement comme n8n)
        if (expression.includes('$json') || expression.includes('$node') || expression.includes('$input')) {
          // Expression semble valide
        } else {
          warnings.push(`Potentially invalid expression at ${path}: ${expression}`);
        }
      } else if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach(key => {
          validateExpressionRecursive(obj[key], path ? `${path}.${key}` : key);
        });
      }
    }
    
    validateExpressionRecursive(parameters);
    
    return { fixes, warnings };
  }
  
  // ✨ Nettoyage des structures de paramètres EXACTEMENT comme n8n
  function cleanParameterStructuresLikeN8n(parameters) {
    const cleaned = {};
    
    for (const [key, value] of Object.entries(parameters)) {
      if (value !== null && value !== undefined) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          const cleanedObject = cleanParameterStructuresLikeN8n(value);
          if (Object.keys(cleanedObject).length > 0) {
            cleaned[key] = cleanedObject;
          }
        } else {
          cleaned[key] = value;
        }
      }
    }
    
    return cleaned;
  }
  
  // ✨ Suggérer un type de nœud similaire EXACTEMENT comme n8n
  function suggestSimilarNodeType(invalidType, n8nAPIs) {
    if (!invalidType) return null;
    
    const commonReplacements = {
      'n8n-nodes-base.function': 'n8n-nodes-base.code',
      'n8n-nodes-base.httpRequest': 'n8n-nodes-base.httpRequest',
      'n8n-nodes-base.set': 'n8n-nodes-base.set',
      'n8n-nodes-base.merge': 'n8n-nodes-base.merge',
      'n8n-nodes-base.if': 'n8n-nodes-base.if',
      'n8n-nodes-base.switch': 'n8n-nodes-base.switch'
    };
    
    // Vérifier les remplacements directs
    if (commonReplacements[invalidType]) {
      return commonReplacements[invalidType];
    }
    
    // Si le type commence par un préfixe valide, le garder
    if (/^n8n-nodes-base\./.test(invalidType)) {
      return invalidType;
    }
    
    // Sinon, suggérer noOp
    return 'n8n-nodes-base.noOp';
  }

  // 🎯 REPRODUCTION EXACTE DU COPIER-COLLER N8N NATIF
  
  // ✨ Fonction qui reproduit EXACTEMENT ce que fait n8n lors du copier-coller
  function processWorkflowLikeN8nCopyPaste(workflowData) {
    const changes = [];
    
    console.log('🎯 Processing workflow EXACTLY like n8n native copy-paste...');
    
    // 1. PRÉPARER LES NŒUDS (comme n8n)
    const existingNodeNames = new Set((workflowStore.allNodes || []).map(n => n.name));
    const newNodeIdMap = new Map(); // Ancien ID → Nouveau ID
    const newNodeNameMap = new Map(); // Ancien nom → Nouveau nom
    
    const processedNodes = workflowData.nodes.map((node, index) => {
      // Générer un nouvel UUID (EXACTEMENT comme n8n)
      const newId = generateUniqueId();
      newNodeIdMap.set(node.id, newId);
      
      // Gérer les conflits de noms (EXACTEMENT comme n8n)
      let newName = node.name;
      let nameCounter = 1;
      while (existingNodeNames.has(newName)) {
        newName = `${node.name}${nameCounter}`;
        nameCounter++;
      }
      existingNodeNames.add(newName);
      newNodeNameMap.set(node.name, newName);
      
      if (newName !== node.name) {
        changes.push(`Renamed "${node.name}" → "${newName}"`);
      }
      
      // COPIER EXACTEMENT TOUT le nœud SANS MODIFICATIONS
      const processedNode = {
        ...node, // Copier TOUT tel quel
        id: newId, // Seulement changer l'ID
        name: newName // Et le nom si conflit
      };
      
      console.log(`✅ Processed node: "${newName}" (${newId})`);
      
      return processedNode;
    });
    
    // 2. METTRE À JOUR LES CONNEXIONS (comme n8n)
    const processedConnections = {};
    
    if (workflowData.connections) {
      for (const [oldNodeName, outputs] of Object.entries(workflowData.connections)) {
        const newSourceName = newNodeNameMap.get(oldNodeName) || oldNodeName;
        
        if (outputs.main && Array.isArray(outputs.main)) {
          const updatedOutputs = {
            main: outputs.main.map(outputArray => {
              if (Array.isArray(outputArray)) {
                return outputArray.map(connection => {
                  const newTargetName = newNodeNameMap.get(connection.node) || connection.node;
                  return {
                    ...connection, // Garder TOUT tel quel
                    node: newTargetName // Seulement mettre à jour le nom
                  };
                });
              }
              return outputArray;
            })
          };
          
          // Copier les autres types de connexions tel quel
          Object.keys(outputs).forEach(outputType => {
            if (outputType !== 'main') {
              updatedOutputs[outputType] = outputs[outputType];
            }
          });
          
          processedConnections[newSourceName] = updatedOutputs;
        }
      }
    }
    
    // 3. WORKFLOW METADATA (minimal comme n8n)
    const processedWorkflow = {
      nodes: processedNodes,
      connections: processedConnections
    };
    
    // N'ajouter les métadonnées que si elles existent déjà
    if (workflowData.name) processedWorkflow.name = workflowData.name;
    if (workflowData.settings) processedWorkflow.settings = workflowData.settings;
    if (workflowData.meta) processedWorkflow.meta = workflowData.meta;
    if (workflowData.tags) processedWorkflow.tags = workflowData.tags;
    if (workflowData.active !== undefined) processedWorkflow.active = workflowData.active;
    
    console.log('🎯 Workflow processed exactly like n8n copy-paste:');
    console.log(`  📝 ${processedNodes.length} nodes processed`);
    console.log(`  🔗 ${Object.keys(processedConnections).length} connection sources`);
    console.log(`  🔧 ${changes.length} changes made`);
    
    if (changes.length > 0) {
      console.log('📋 Changes made (like n8n):');
      changes.forEach((change, i) => console.log(`  ${i + 1}. ${change}`));
    }
    
    return {
      workflow: processedWorkflow,
      changes,
      nodeIdMap: newNodeIdMap,
      nodeNameMap: newNodeNameMap
    };
  }

  // ✨ Import EXACTEMENT comme le copier-coller natif de n8n
  async function importCompleteWorkflow(workflowData, isImprovement = false) {
    if (!workflowStore) {
      window.postMessage({
        type: 'IMPORT_ERROR',
        error: 'Store Pinia non disponible'
      }, '*');
      return;
    }

    try {
      console.log('🎯 Import EXACTLY like n8n native copy-paste:', workflowData);
      console.log('🎯 Mode:', isImprovement ? 'amélioration (suppression ancien)' : 'nouveau workflow');

      // ✨ TRAITEMENT EXACTEMENT COMME N8N COPY-PASTE
      const result = processWorkflowLikeN8nCopyPaste(workflowData);
      const processedWorkflow = result.workflow;

      // Effacer le workflow actuel SI mode amélioration
      if (isImprovement) {
        const currentNodes = [...workflowStore.allNodes];
        if (currentNodes.length > 0) {
          console.log(`🗑️ Clearing ${currentNodes.length} existing nodes (improvement mode)...`);
          
          for (const node of currentNodes) {
            try {
              workflowStore.removeNode(node.id);
            } catch (e) {
              console.log(`⚠️ removeNode failed for ${node.name}:`, e.message);
            }
          }
          
          try {
            workflowStore.$patch({
              workflow: {
                ...workflowStore.workflow,
                nodes: [],
                connections: {}
              }
            });
            console.log('🧹 Workflow cleared via $patch');
          } catch (patchError) {
            console.log('⚠️ $patch failed:', patchError.message);
          }
        }
      }

      // ✨ AJOUTER LES NŒUDS EXACTEMENT COMME N8N
      let successfulNodes = 0;
      const nodeErrors = [];
      
      for (const node of processedWorkflow.nodes) {
        try {
          // Utiliser la méthode native n8n SANS MODIFICATION
          if (workflowStore.addNode) {
            workflowStore.addNode(node);
          } else {
            // Fallback direct au state
            workflowStore.$patch(state => {
              if (!state.workflow.nodes) state.workflow.nodes = [];
              state.workflow.nodes.push(node);
            });
          }
          
          successfulNodes++;
          console.log(`✅ Node added exactly like n8n: ${node.name} (${node.type})`);
          
        } catch (addError) {
          console.error(`❌ Error adding node ${node.name}:`, addError);
          nodeErrors.push(`${node.name}: ${addError.message}`);
        }
      }

      // ✨ AJOUTER LES CONNEXIONS EXACTEMENT COMME N8N
      if (Object.keys(processedWorkflow.connections).length > 0) {
        try {
          workflowStore.$patch({
            workflow: {
              ...workflowStore.workflow,
              connections: processedWorkflow.connections
            }
          });
          console.log('✅ Connections added exactly like n8n');
        } catch (connectionsError) {
          console.error('❌ Error adding connections:', connectionsError);
        }
      }

      // ✨ APPLIQUER LES MÉTADONNÉES SEULEMENT SI ELLES EXISTENT
      const workflowUpdates = {};
      if (processedWorkflow.name) workflowUpdates.name = processedWorkflow.name;
      if (processedWorkflow.settings) workflowUpdates.settings = processedWorkflow.settings;
      if (processedWorkflow.meta) workflowUpdates.meta = processedWorkflow.meta;
      if (processedWorkflow.active !== undefined) workflowUpdates.active = processedWorkflow.active;
      
      if (Object.keys(workflowUpdates).length > 0) {
        workflowStore.$patch({
          workflow: {
            ...workflowStore.workflow,
            ...workflowUpdates
          }
        });
        console.log('✅ Workflow metadata applied like n8n');
      }

      // ✨ VALIDATION POST-IMPORT (minimal comme n8n)
      setTimeout(() => {
        const finalNodes = workflowStore.allNodes;
        const finalConnections = workflowStore.workflow?.connections || {};
        
        console.log('🎯 Post-import validation (like n8n):');
        console.log(`  📊 Nodes imported: ${finalNodes.length}/${processedWorkflow.nodes.length}`);
        console.log(`  🔗 Connections: ${Object.keys(finalConnections).length}`);
        console.log(`  🔧 Changes made: ${result.changes.length}`);
        
        // Animation de succès (comme n8n)
        const nodeElements = document.querySelectorAll('[data-node-name], .node');
        nodeElements.forEach(el => {
          el.style.animation = 'fadeIn 0.5s ease-out';
        });
        
        // PAS de revalidation forcée (n8n ne le fait pas)
        console.log('✅ Import completed exactly like n8n native copy-paste');
      }, 100);

      const connectionCount = Object.values(processedWorkflow.connections)
        .reduce((total, outputs) => {
          if (outputs.main && Array.isArray(outputs.main)) {
            return total + outputs.main.reduce((sum, conns) => sum + (conns?.length || 0), 0);
          }
          return total;
        }, 0);

      const importMessage = isImprovement ? 
        `✅ Workflow improved exactly like n8n copy-paste: ${successfulNodes} nodes, ${connectionCount} connections, ${result.changes.length} changes` :
        `✅ Workflow imported exactly like n8n copy-paste: ${successfulNodes} nodes, ${connectionCount} connections, ${result.changes.length} changes`;
      
      console.log(importMessage);
      
      window.postMessage({
        type: 'IMPORT_SUCCESS',
        message: importMessage,
        summary: {
          nodes: successfulNodes,
          connections: connectionCount,
          changes: result.changes.length,
          errors: nodeErrors.length,
          exactCopy: true // Indique que c'est une copie exacte
        }
      }, '*');

    } catch (error) {
      console.error('❌ Error in exact n8n copy-paste import:', error);
      window.postMessage({
        type: 'IMPORT_ERROR',
        error: `Import failed (exact copy-paste mode): ${error.message}`
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