import { createWorkflowRAGService } from './rag/workflow-rag-service.js';

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

  // Simple auth check
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== 'd5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const startTime = Date.now();
  
  console.log(`\n🚀 === SIMPLE WORKFLOW RAG TEST ===`);
  console.log('⏰ Timestamp:', new Date().toISOString());

  try {
    const { prompt, baseWorkflow } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      console.log('❌ Prompt manquant ou invalide');
      return res.status(400).json({ error: 'Prompt is required and must be a string' });
    }

    console.log('📝 Prompt reçu:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));

    // Configuration SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Fonction helper pour envoyer les événements SSE
    const sendSSE = (type, data) => {
      const payload = JSON.stringify({ type, data });
      console.log(`📡 SSE ${type}:`, data.message || data.stage || 'event');
      
      try {
        res.write(`data: ${payload}\n\n`);
      } catch (writeError) {
        console.error('❌ Erreur écriture SSE:', writeError.message);
        throw writeError;
      }
    };

    // Callback de progression
    const onProgress = (stage, data) => {
      console.log(`🔄 Progress: ${stage}:`, data.message || data);
      sendSSE(stage, data);
    };

    // Initialiser le service RAG
    sendSSE('setup', { message: 'Initialisation du service RAG...' });
    
    console.log('🤖 Initializing RAG service...');
    const ragService = createWorkflowRAGService();
    console.log('✅ RAG service initialized');

    // Générer le workflow
    console.log('🎯 Starting workflow generation...');
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
    console.log(`⏱️ Durée: ${(duration / 1000).toFixed(1)}s`);
    console.log(`🎯 Succès: ${result.success}`);

    if (result.success) {
      console.log(`📊 Nœuds: ${result.workflow?.nodes?.length || 0}`);
      
      // Envoyer le workflow final
      const workflowJson = JSON.stringify(result.workflow);
      const workflowSize = Buffer.byteLength(workflowJson, 'utf8');
      
      console.log(`📏 Taille workflow: ${(workflowSize / 1024).toFixed(1)}KB`);
      
      if (workflowSize > 32768) {
        // Gros workflow - utiliser compression
        sendSSE('compression', { 
          message: 'Compression du workflow...', 
          nodesCount: result.workflow?.nodes?.length || 0 
        });
        
        const compressed = await ragService.prepareWorkflowForTransmission(result.workflow, result.explanation);
        sendSSE('compressed_complete', {
          success: true,
          compressed: true,
          data: compressed.base64Data,
          originalSize: workflowSize
        });
      } else {
        // Workflow normal
        sendSSE('complete', {
          success: true,
          workflow: result.workflow,
          explanation: result.explanation
        });
      }
    } else {
      sendSSE('error', { error: result.error || 'Erreur inconnue' });
    }

    res.end();

  } catch (error) {
    console.error('❌ Erreur complète:', error);
    
    try {
      const sendSSE = (type, data) => {
        const payload = JSON.stringify({ type, data });
        res.write(`data: ${payload}\n\n`);
      };
      
      sendSSE('error', { error: error.message });
      res.end();
    } catch (writeError) {
      console.error('❌ Cannot send error via SSE:', writeError.message);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  }
} 