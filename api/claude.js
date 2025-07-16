import { createWorkflowRAGService } from './rag/workflow-rag-service.js';

// Configuration CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Initialize RAG service
let ragService = null;

async function initializeRAGService() {
  if (!ragService) {
    ragService = createWorkflowRAGService();
  }
  return ragService;
}

export default async function handler(req, res) {
  // Logger la requête entrante
  console.log('\n=== NOUVELLE REQUÊTE RAG WORKFLOW ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  
  if (req.method === 'POST' && req.body) {
    console.log('Body:', JSON.stringify({
      prompt: req.body.prompt,
      mode: req.body.mode || 'create'
    }, null, 2));
  }

  // Gérer les requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
    return res.status(200).end();
  }

  // Vérifier la méthode HTTP
  if (req.method !== 'POST') {
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST method is accepted'
    });
  }

  // Vérifier l'authentification
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (!token || token !== process.env.BACKEND_API_KEY) {
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    });
  }

  // Valider le body de la requête
  const { prompt, baseWorkflow } = req.body;
  
  if (!prompt || typeof prompt !== 'string') {
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
    return res.status(400).json({ 
      error: 'Bad Request',
      message: 'Missing or invalid prompt field'
    });
  }

  try {
    // Initialiser le service RAG
    const rag = await initializeRAGService();
    
    console.log(`\n📝 Processing prompt: "${prompt}"`);
    if (baseWorkflow) {
      console.log(`\n📋 Base workflow provided with ${baseWorkflow.nodes?.length || 0} nodes`);
    }
    
    // Configure SSE headers for streaming with aggressive anti-buffering
    res.writeHead(200, {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Transfer-Encoding': 'chunked',
    });

    function sendEvent(type, data) {
      const message = `data: ${JSON.stringify({ type, data, timestamp: new Date().toISOString() })}\n\n`;
      console.log(`📡 SSE Event: ${type} - ${data.message}`);
      
      res.write(message);
      
      // Force immediate flush with multiple methods
      if (res.flush) res.flush();
      if (res.flushHeaders) res.flushHeaders();
      if (res.socket) {
        res.socket.write('');
      }
    }

    // Step 1: Setup
    sendEvent('setup', { message: 'Setting up workflow generation...' });

    const searchResult = await rag.searchWorkflows(prompt, {
      topK: 10,
      minScore: 0.3
    });

    // Step 2: Analysis & Building  
    sendEvent('building', { 
      message: 'Analyzing requirements and building workflow...'
    });

    console.log('🚀 Début génération workflow avec RAG...');
    const generationStartTime = Date.now();
    
    let generationResult;
    try {
      generationResult = await rag.generateWorkflowFromExamplesWithStreaming(prompt, {
        topK: 3,
        workflowName: 'Generated Workflow',
        baseWorkflow: baseWorkflow, // Nouveau : passer le workflow de base
        onProgress: (stage, data) => {
          console.log(`📊 Progrès RAG: ${stage} - ${data.message}`);
          sendEvent('progress', { stage, ...data });
        }
      });
      
      const generationDuration = Date.now() - generationStartTime;
      console.log(`✅ Génération terminée en ${generationDuration}ms, succès: ${generationResult.success}`);
      
    } catch (generationError) {
      const generationDuration = Date.now() - generationStartTime;
      console.error(`❌ Erreur génération après ${generationDuration}ms:`, generationError);
      
      sendEvent('error', {
        message: 'Erreur lors de la génération',
        error: generationError.message,
        success: false
      });
      
      res.end();
      return;
    }

    // Step 3: Finalization
    if (generationResult.success) {
      sendEvent('complete', {
        message: 'Finalizing workflow configuration...',
        workflow: generationResult.workflow,
        explanation: generationResult.explanation,
        success: true
      });
    } else {
      sendEvent('error', {
        message: 'Failed to generate workflow',
        error: generationResult.error,
        success: false
      });
    }

    res.end();
    
  } catch (error) {
    console.error('API Error:', error);
    
      const statusCode = error.status || 500;
      const errorMessage = error.message || 'Internal server error';
      
      for (const [key, value] of Object.entries(corsHeaders)) {
        res.setHeader(key, value);
      }
      return res.status(statusCode).json({ 
        error: 'API Error',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
  }
} 