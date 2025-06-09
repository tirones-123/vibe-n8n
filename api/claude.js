import Anthropic from '@anthropic-ai/sdk';

// Configuration CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  // Gérer les requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeaders(corsHeaders).end();
  }

  // Vérifier la méthode HTTP
  if (req.method !== 'POST') {
    return res.status(405).setHeaders(corsHeaders).json({ 
      error: 'Method not allowed',
      message: 'Only POST method is accepted'
    });
  }

  // Vérifier l'authentification
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (!token || token !== process.env.BACKEND_API_KEY) {
    return res.status(401).setHeaders(corsHeaders).json({ 
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    });
  }

  // Valider le body de la requête
  const { prompt, context, tools } = req.body;
  
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).setHeaders(corsHeaders).json({ 
      error: 'Bad Request',
      message: 'Missing or invalid prompt field'
    });
  }

  if (!context || typeof context !== 'object') {
    return res.status(400).setHeaders(corsHeaders).json({ 
      error: 'Bad Request',
      message: 'Missing or invalid context field'
    });
  }

  if (!tools || !Array.isArray(tools)) {
    return res.status(400).setHeaders(corsHeaders).json({ 
      error: 'Bad Request',
      message: 'Missing or invalid tools field'
    });
  }

  try {
    // Initialiser le client Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });

    // Préparer le system prompt avec le contexte actuel
    const systemPrompt = `You are an AI assistant specialized in n8n. You can create and modify workflows using the available functions.
Current workflow context: ${JSON.stringify(context, null, 2)}

Use the functions to:
- Create nodes with createNode
- Modify existing nodes with updateNode
- Connect nodes with connectNodes
- Delete nodes with deleteNode

Always respond in the user's language and briefly explain what you're doing.

Important guidelines:
- Position new nodes logically based on existing nodes
- Use appropriate node types for the requested functionality
- Ensure connections flow logically from source to target
- Provide clear explanations of each action taken`;

    // Créer le stream avec l'API Claude
    const stream = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4096,
      messages: [{ 
        role: 'user', 
        content: prompt 
      }],
      system: systemPrompt,
      tools: tools,
      tool_choice: { type: 'auto' },
      stream: true,
    });

    // Configurer les headers pour Server-Sent Events
    res.writeHead(200, {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Désactiver le buffering pour Vercel
    });

    // Transmettre le stream de Claude vers le client
    try {
      for await (const chunk of stream) {
        // Envoyer chaque chunk comme un événement SSE
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        
        // Flush pour s'assurer que les données sont envoyées immédiatement
        if (res.flush) res.flush();
      }

      // Envoyer un événement de fin personnalisé
      res.write(`data: ${JSON.stringify({ type: 'stream_end' })}\n\n`);
      res.end();
    } catch (streamError) {
      console.error('Stream error:', streamError);
      
      // Envoyer l'erreur dans le stream si possible
      if (!res.finished) {
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          error: 'Stream interrupted',
          message: streamError.message 
        })}\n\n`);
        res.end();
      }
    }
  } catch (error) {
    console.error('API Error:', error);
    
    // Si on n'a pas encore commencé à streamer
    if (!res.headersSent) {
      const statusCode = error.status || 500;
      const errorMessage = error.message || 'Internal server error';
      
      return res.status(statusCode).setHeaders(corsHeaders).json({ 
        error: 'API Error',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      // Si on a déjà commencé à streamer, envoyer l'erreur dans le stream
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: 'API Error',
        message: error.message 
      })}\n\n`);
      res.end();
    }
  }
} 