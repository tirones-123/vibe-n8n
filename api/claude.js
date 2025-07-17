import { createWorkflowRAGService } from './rag/workflow-rag-service.js';

// Monitoring et stats
let requestStats = {
  total: 0,
  success: 0,
  errors: 0,
  largeWorkflows: 0,
  compressionUsed: 0,
  chunkingUsed: 0
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

  // Vérification de l'authentification
  const authHeader = req.headers.authorization;
  const expectedAuth = `Bearer ${process.env.BACKEND_API_KEY}`;
  
  if (!authHeader || authHeader !== expectedAuth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  requestStats.total++;
  
  console.log(`\n🚀 === WORKFLOW RAG REQUEST ${requestStats.total} ===`);
  console.log('📊 Stats actuelles:', requestStats);
  console.log('⏰ Timestamp:', new Date().toISOString());

  try {
    const { prompt, baseWorkflow } = req.body;

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

    // État de la session
    let sessionState = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime,
      stage: 'init',
      workflowSize: 0,
      transmissionType: 'unknown'
    };

    console.log(`🔑 Session créée: ${sessionState.id}`);

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

    if (result.success) {
      requestStats.success++;
      
      // Log final de succès
      sendSSE('session_complete', {
        message: 'Session terminée avec succès',
        duration: duration,
        workflowSize: sessionState.workflowSize,
        transmissionType: result.transmissionType || sessionState.transmissionType,
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
    console.log(`Gros workflows: ${requestStats.largeWorkflows}`);
    console.log(`Compression utilisée: ${requestStats.compressionUsed}`);
    console.log(`Chunking utilisé: ${requestStats.chunkingUsed}`);
  }
} 