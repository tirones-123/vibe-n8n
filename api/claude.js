import { createWorkflowRAGService } from './rag/workflow-rag-service.js';
import firebaseService from './services/firebase-service.js';
import stripeService from './services/stripe-service.js';
import { verifyAuth, checkTokenQuota } from './middleware/auth.js';

// Initialize services
await firebaseService.initialize();
await stripeService.initialize();

// Monitoring et stats
let requestStats = {
  total: 0,
  success: 0,
  errors: 0,
  largeWorkflows: 0,
  compressionUsed: 0,
  chunkingUsed: 0,
  tokenQuotaBlocked: 0
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate user first
  try {
    await new Promise((resolve, reject) => {
      verifyAuth(req, res, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  } catch (authError) {
    return; // Response already sent by middleware
  }

  // Check token quota before processing
  try {
    await new Promise((resolve, reject) => {
      checkTokenQuota(10000)(req, res, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  } catch (quotaError) {
    requestStats.tokenQuotaBlocked++;
    return; // Response already sent by middleware
  }

  const startTime = Date.now();
  requestStats.total++;
  
  console.log(`\n🚀 === WORKFLOW RAG REQUEST ${requestStats.total} ===`);
  console.log('📊 Stats actuelles:', requestStats);
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('👤 User:', req.user.isSystem ? 'SYSTEM' : `${req.user.uid} (${req.user.plan})`);
  if (!req.user.isSystem) {
    console.log('🎯 Tokens restants:', req.user.remaining_tokens?.toLocaleString() || 'N/A');
  }

  // Récupère l'en-tête Authorization pour le logging (évite ReferenceError)
  const authHeader = req.headers?.authorization || null;

  // 📊 DETAILED LOGGING - Request inspection
  console.log('\n%c📊 BACKEND: Incoming request analysis', 'background: darkred; color: white; padding: 2px 6px;');
  console.log('🔍 Method:', req.method);
  console.log('🔑 Authorization header present:', !!authHeader);
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  
  // Analyser le body de la requête
  console.log('\n%c📦 BACKEND: Request body analysis', 'background: darkblue; color: white; padding: 2px 6px;');
  const rawBodySize = JSON.stringify(req.body).length;
  console.log('📏 Raw body size:', rawBodySize, 'chars (', (rawBodySize / 1024).toFixed(1), 'KB)');
  console.log('🔧 Body keys:', Object.keys(req.body));
  
  try {
    const { prompt, baseWorkflow } = req.body;

    // 📊 DETAILED LOGGING - Request payload inspection
    console.log('\n%c🔍 BACKEND: Payload inspection', 'background: purple; color: white; padding: 2px 6px;');
    console.log('📝 Prompt received:');
    console.log('  - Type:', typeof prompt);
    console.log('  - Length:', prompt?.length || 0, 'chars');
    console.log('  - Content:', prompt ? `"${prompt.substring(0, 200)}${prompt.length > 200 ? '...' : ''}"` : 'null');
    
    console.log('🔄 Base workflow analysis:');
    if (baseWorkflow) {
      console.log('  - Base workflow PROVIDED: YES');
      console.log('  - Type:', typeof baseWorkflow);
      console.log('  - Keys:', Object.keys(baseWorkflow));
      console.log('  - Nodes count:', baseWorkflow.nodes?.length || 0);
      console.log('  - Connections count:', Object.keys(baseWorkflow.connections || {}).length);
      console.log('  - Workflow name:', baseWorkflow.name);
      console.log('  - Workflow ID:', baseWorkflow.id);
      
      if (baseWorkflow.nodes && baseWorkflow.nodes.length > 0) {
        console.log('  - Node details:');
        baseWorkflow.nodes.forEach((node, i) => {
          console.log(`    ${i + 1}. ${node.name} (${node.type}) - ID: ${node.id}`);
        });
      }
      
      const baseWorkflowSize = JSON.stringify(baseWorkflow).length;
      console.log('  - Base workflow size:', baseWorkflowSize, 'chars (', (baseWorkflowSize / 1024).toFixed(1), 'KB)');
    } else {
      console.log('  - Base workflow PROVIDED: NO');
    }

    // Mode detection logic
    const isImprovementMode = baseWorkflow && baseWorkflow.nodes && baseWorkflow.nodes.length > 0;
    console.log('\n%c🎯 BACKEND: Mode detection', 'background: darkgreen; color: white; padding: 2px 6px;');
    console.log('🔧 Detected mode:', isImprovementMode ? 'IMPROVEMENT' : 'GENERATION');
    console.log('📋 Reasoning:');
    console.log('  - baseWorkflow exists:', !!baseWorkflow);
    console.log('  - baseWorkflow.nodes exists:', !!(baseWorkflow?.nodes));
    console.log('  - baseWorkflow.nodes.length:', baseWorkflow?.nodes?.length || 0);
    console.log('  - Final decision:', isImprovementMode ? 'Will improve existing workflow' : 'Will generate new workflow');

    if (!prompt || typeof prompt !== 'string') {
      console.log('❌ Prompt manquant ou invalide');
      return res.status(400).json({ error: 'Prompt is required and must be a string' });
    }

    console.log('📝 Prompt reçu:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
    if (baseWorkflow) {
      console.log('🔄 Mode amélioration détecté, workflow existant:', baseWorkflow.nodes?.length || 0, 'nœuds');
    }

    // Configuration SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Pour Nginx

    // Force l'envoi des en-têtes tout de suite (important pour Railway / proxies)
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    } else {
      // fallback minimal : envoyer une ligne vide pour déclencher le flush
      try { res.write('\n'); } catch (_) {}
    }

    // État de la session
    let sessionState = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime,
      stage: 'init',
      workflowSize: 0,
      transmissionType: 'unknown',
      mode: isImprovementMode ? 'improvement' : 'generation'
    };

    console.log(`🔑 Session créée: ${sessionState.id} (mode: ${sessionState.mode})`);

    // Fonction helper pour envoyer les événements SSE
    const sendSSE = (type, data) => {
      const payload = JSON.stringify({ type, data });
      console.log(`📡 SSE [${sessionState.id}] ${type}:`, data.message || data.stage || 'event');
      
      try {
        res.write(`data: ${payload}\n\n`);
      } catch (writeError) {
        console.error('❌ Erreur écriture SSE:', writeError.message);
        throw writeError;
      }
    };

    // Callback de progression avec monitoring
    const onProgress = (stage, data) => {
      sessionState.stage = stage;
      
      // Logging détaillé selon le stage
      switch (stage) {
        case 'search':
          console.log(`🔍 [${sessionState.id}] Recherche: ${data.message}`);
          break;
        case 'context_building':
          console.log(`🏗️ [${sessionState.id}] Contexte: ${data.workflows?.length || 0} workflows`);
          break;
        case 'claude_call':
          console.log(`🤖 [${sessionState.id}] Claude: ${data.promptLength} chars`);
          break;
        case 'compression':
          console.log(`🗜️ [${sessionState.id}] Compression: ${data.nodesCount} nœuds`);
          break;
        case 'chunking_start':
          console.log(`📦 [${sessionState.id}] Chunking: ${data.totalChunks} parties`);
          requestStats.chunkingUsed++;
          sessionState.transmissionType = 'chunked';
          break;
        case 'compressed_complete':
          console.log(`✅ [${sessionState.id}] Compressé envoyé`);
          requestStats.compressionUsed++;
          sessionState.transmissionType = 'compressed';
          break;
        case 'error':
          console.error(`❌ [${sessionState.id}] Erreur:`, data.message || data.error);
          break;
      }
      
      sendSSE(stage, data);
    };

    // Initialiser le service RAG
    sendSSE('setup', { message: 'Initialisation du service RAG...' });
    sessionState.stage = 'setup';

    const ragService = createWorkflowRAGService();
    console.log(`✅ [${sessionState.id}] Service RAG initialisé`);

    // 📊 DETAILED LOGGING - RAG service call preparation
    console.log('\n%c🤖 BACKEND: RAG service call preparation', 'background: darkviolet; color: white; padding: 2px 6px;');
    console.log('🔧 Calling generateWorkflowFromExamplesWithStreaming with:');
    console.log('  - prompt:', prompt.substring(0, 100) + '...');
    console.log('  - topK: 3');
    console.log('  - workflowName: "Generated Workflow"');
    console.log('  - baseWorkflow:', baseWorkflow ? 'PROVIDED' : 'null');
    console.log('  - onProgress: callback function provided');

    // Générer le workflow avec monitoring
    const result = await ragService.generateWorkflowFromExamplesWithStreaming(
      prompt,
      {
        topK: 3,
        workflowName: 'Generated Workflow',
        baseWorkflow,
        onProgress
      }
    );

    // Calculer les statistiques
    const duration = Date.now() - startTime;
    const workflowJson = JSON.stringify(result.workflow || {});
    sessionState.workflowSize = Buffer.byteLength(workflowJson, 'utf8');

    // Déterminer si c'est un gros workflow
    const isLargeWorkflow = sessionState.workflowSize > 50000; // 50KB
    if (isLargeWorkflow) {
      requestStats.largeWorkflows++;
    }

    console.log(`\n📈 === SESSION COMPLETE ${sessionState.id} ===`);
    console.log(`⏱️ Durée: ${(duration / 1000).toFixed(1)}s`);
    console.log(`📏 Taille workflow: ${(sessionState.workflowSize / 1024).toFixed(1)}KB`);
    console.log(`🔄 Type transmission: ${sessionState.transmissionType}`);
    console.log(`🎯 Succès: ${result.success}`);
    console.log(`📊 Nœuds: ${result.workflow?.nodes?.length || 0}`);
    console.log(`🔧 Mode: ${sessionState.mode}`);

    if (result.success) {
      requestStats.success++;

      // Report token usage for billing
      if (!req.user.isSystem && result.tokensUsed) {
        try {
          sendSSE('reporting_usage', { 
            message: 'Mise à jour du quota utilisateur...',
            tokensUsed: result.tokensUsed.input
          });

          await firebaseService.updateUserTokens(
            req.user.uid, 
            result.tokensUsed.input, 
            result.tokensUsed.output || 0
          );

          // Report to Stripe if PRO user with usage-based billing
          if (req.user.plan === 'PRO' && req.user.stripe_customer_id) {
            const updatedUser = await firebaseService.getOrCreateUser(req.user.uid);
            
            if (updatedUser.remaining_tokens === 0 && updatedUser.usage_based_enabled) {
              await stripeService.reportUsage(req.user.stripe_customer_id, result.tokensUsed.input);
              console.log(`📊 Reported ${result.tokensUsed.input} tokens to Stripe for ${req.user.uid}`);
            }
          }

          // Log usage event for analytics
          await firebaseService.logUsageEvent(req.user.uid, 'workflow_generation', {
            input_tokens: result.tokensUsed.input,
            output_tokens: result.tokensUsed.output || 0,
            workflow_size: sessionState.workflowSize,
            mode: sessionState.mode,
            duration: duration
          });

          console.log(`📊 [${sessionState.id}] Usage rapporté: ${result.tokensUsed.input} input, ${result.tokensUsed.output || 0} output tokens`);
        } catch (usageError) {
          console.error(`❌ Erreur rapport usage:`, usageError.message);
          // Don't fail the request for usage reporting errors
        }
      }
      
      // Log final de succès
      sendSSE('session_complete', {
        message: 'Session terminée avec succès',
        duration: duration,
        workflowSize: sessionState.workflowSize,
        transmissionType: result.transmissionType || sessionState.transmissionType,
        mode: sessionState.mode,
        tokensUsed: result.tokensUsed,
        stats: {
          nodes: result.workflow?.nodes?.length || 0,
          connections: Object.keys(result.workflow?.connections || {}).length
        }
      });
    } else {
      requestStats.errors++;
      console.error(`❌ [${sessionState.id}] Échec:`, result.error);
      
      sendSSE('error', {
        error: result.error,
        sessionId: sessionState.id
      });
    }

  } catch (error) {
    requestStats.errors++;
    console.error('\n❌ === ERREUR CRITIQUE ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Timestamp:', new Date().toISOString());
    
    try {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        data: {
          error: `Erreur serveur: ${error.message}`,
          timestamp: new Date().toISOString(),
          code: 'INTERNAL_ERROR'
        }
      })}\n\n`);
    } catch (writeError) {
      console.error('❌ Impossible d\'envoyer l\'erreur SSE:', writeError.message);
    }
  } finally {
    try {
      res.end();
    } catch (endError) {
      console.error('❌ Erreur fermeture connexion:', endError.message);
    }
    
    console.log(`\n📊 === STATS GLOBALES ===`);
    console.log(`Total requêtes: ${requestStats.total}`);
    console.log(`Succès: ${requestStats.success} (${(requestStats.success/requestStats.total*100).toFixed(1)}%)`);
    console.log(`Erreurs: ${requestStats.errors} (${(requestStats.errors/requestStats.total*100).toFixed(1)}%)`);
    console.log(`Quota bloqués: ${requestStats.tokenQuotaBlocked} (${(requestStats.tokenQuotaBlocked/requestStats.total*100).toFixed(1)}%)`);
    console.log(`Gros workflows: ${requestStats.largeWorkflows}`);
    console.log(`Compression utilisée: ${requestStats.compressionUsed}`);
    console.log(`Chunking utilisé: ${requestStats.chunkingUsed}`);
  }
} 