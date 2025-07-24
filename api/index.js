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
        '/api/status': 'GET - Monitoring du système',
        '/api/email-verified': 'GET - Page de vérification d\'email'
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

  // Route pour la page de vérification d'email
  if (req.method === 'GET' && req.url === '/api/email-verified') {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verified - n8n AI Assistant</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          
          .container {
            background: white;
            border-radius: 20px;
            padding: 60px 40px;
            max-width: 500px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            animation: slideIn 0.6s ease-out;
          }
          
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .check-icon {
            width: 80px;
            height: 80px;
            background: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 30px;
            animation: pulse 2s infinite;
          }
          
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          
          .check-icon svg {
            width: 40px;
            height: 40px;
            color: white;
          }
          
          h1 {
            color: #1f2937;
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 20px;
          }
          
          .subtitle {
            color: #6b7280;
            font-size: 18px;
            margin-bottom: 40px;
            line-height: 1.5;
          }
          
          .features {
            background: #f8fafc;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 40px;
            text-align: left;
          }
          
          .features h3 {
            color: #1f2937;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
            text-align: center;
          }
          
          .features ul {
            list-style: none;
            padding: 0;
          }
          
          .features li {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            color: #374151;
            font-size: 14px;
          }
          
          .features li:before {
            content: "✅";
            margin-right: 12px;
            font-size: 16px;
          }
          
          .cta-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 16px 32px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
            margin-bottom: 20px;
          }
          
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
          }
          
          .secondary-link {
            color: #6b7280;
            font-size: 14px;
            text-decoration: none;
            margin-top: 20px;
            display: inline-block;
          }
          
          .secondary-link:hover {
            color: #374151;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid #e5e7eb;
            color: #9ca3af;
            font-size: 12px;
            line-height: 1.4;
          }
          
          .loader {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #ffffff40;
            border-top: 2px solid #ffffff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-left: 8px;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="check-icon">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </div>
          
          <h1>Email Successfully Verified! 🎉</h1>
          
          <p class="subtitle">
            Your email has been verified and your n8n AI Assistant account is now fully activated.
          </p>
          
          <div class="features">
            <h3>🚀 What's unlocked for you:</h3>
            <ul>
              <li>70,000 free tokens for AI workflow generation</li>
              <li>Access to Claude 4 Sonnet AI assistant</li>
              <li>2055+ real workflow examples for inspiration</li>
              <li>Seamless Chrome extension integration</li>
              <li>Smart workflow suggestions and improvements</li>
            </ul>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 20px;">🏠 Return to your n8n instance:</h3>
            
            <a href="https://n8n.io" class="cta-button" style="width: 100%; margin-bottom: 12px; display: block; text-decoration: none;">
              📊 n8n.io (Community)
            </a>
            
            <a href="https://app.n8n.cloud" class="cta-button" style="width: 100%; margin-bottom: 12px; display: block; text-decoration: none; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
              ☁️ n8n Cloud
            </a>
            
            <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-top: 16px; text-align: left;">
              <p style="margin: 0; color: #374151; font-size: 14px; font-weight: 500; margin-bottom: 8px;">
                💡 Using a self-hosted instance?
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.4;">
                Simply return to your custom n8n domain (e.g., n8n.yourcompany.com) and look for the blue 🤖 AI Assistant button in any workflow editor.
              </p>
            </div>
          </div>
          
          <div class="footer">
            <strong>Next steps:</strong><br>
            1. Open any n8n workflow editor on your instance<br>
            2. Look for the blue 🤖 AI Assistant button<br>
            3. Start describing your automation needs<br>
            4. Watch as AI generates complete workflows for you!
            <br><br>
            <em>Powered by Firebase Auth & Claude 4 Sonnet</em>
          </div>
        </div>
        
        <script>
          // Remove auto-redirect functionality
          // Users with custom domains need manual control
          
          document.addEventListener('DOMContentLoaded', () => {
            // Show success animation
            setTimeout(() => {
              document.querySelector('.check-icon').style.animation = 'pulse 2s infinite';
            }, 500);
            
            // Add click analytics (optional)
            document.querySelectorAll('.cta-button').forEach(button => {
              button.addEventListener('click', (e) => {
                console.log('User clicked:', e.target.textContent);
              });
            });
          });
        </script>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  }

  // Route de fallback pour récupérer les workflows
  if (req.method === 'POST' && req.url === '/api/fallback') {
    return handleFallbackRequest(req, res);
  }

  return res.status(404).json({
    error: 'Not Found',
    message: 'Endpoint not found',
    availableRoutes: ['/api', '/api/claude', '/api/fallback', '/api/status', '/api/email-verified']
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