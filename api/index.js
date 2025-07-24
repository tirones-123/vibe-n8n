export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Route pour le health check
  if (req.method === 'GET' && req.url === '/api') {
    return res.status(200).json({
      status: 'ok',
      environment: 'RAG Workflow Backend',
      timestamp: new Date().toISOString(),
      endpoints: {
        '/api/claude': 'POST - Génération de workflows (SSE)',
        '/api/fallback': 'POST - Récupération fallback',
        '/api/status': 'GET - Monitoring du système'
      }
    });
  }

  // Route pour le monitoring
  if (req.method === 'GET' && req.url === '/api/status') {
    return res.status(200).json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    });
  }

  // Route de fallback pour récupérer les workflows
  if (req.method === 'POST' && req.url === '/api/fallback') {
    return handleFallbackRequest(req, res);
  }

  return res.status(404).json({
    error: 'Not Found',
    message: 'Endpoint not found',
    availableRoutes: ['/api', '/api/claude', '/api/fallback', '/api/status']
  });
}

// Cache temporaire pour les workflows (en production, utiliser Redis)
const workflowCache = new Map();

async function handleFallbackRequest(req, res) {
  // Vérification de l'authentification
  const authHeader = req.headers.authorization;
  const expectedAuth = `Bearer ${process.env.BACKEND_API_KEY}`;
  
  if (!authHeader || authHeader !== expectedAuth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { sessionId, action } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'SessionId is required' });
  }

  try {
    switch (action) {
      case 'check_status':
        // Vérifier le statut d'une session
        const status = workflowCache.get(sessionId);
        if (!status) {
          return res.status(404).json({ 
            error: 'Session not found',
            sessionId 
          });
        }
        
        return res.status(200).json({
          sessionId,
          status: status.stage,
          progress: status.progress || 0,
          lastUpdate: status.lastUpdate
        });

      case 'get_workflow':
        // Récupérer un workflow terminé
        const workflow = workflowCache.get(`${sessionId}_result`);
        if (!workflow) {
          return res.status(404).json({ 
            error: 'Workflow not ready or not found',
            sessionId 
          });
        }
        
        // Nettoyer le cache après récupération
        workflowCache.delete(`${sessionId}_result`);
        workflowCache.delete(sessionId);
        
        return res.status(200).json({
          sessionId,
          success: true,
          workflow: workflow.workflow,
          explanation: workflow.explanation,
          retrievedAt: new Date().toISOString()
        });

      case 'cancel_session':
        // Annuler une session
        workflowCache.delete(sessionId);
        workflowCache.delete(`${sessionId}_result`);
        
        return res.status(200).json({
          sessionId,
          cancelled: true
        });

      default:
        return res.status(400).json({ 
          error: 'Invalid action',
          validActions: ['check_status', 'get_workflow', 'cancel_session']
        });
    }

  } catch (error) {
    console.error('Fallback API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Export des fonctions pour utilisation dans d'autres modules
export { workflowCache }; 