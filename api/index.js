export default function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Page d'accueil simple
  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>n8n AI Assistant Backend</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 2rem;
                line-height: 1.6;
                background: #f9fafb;
            }
            .container {
                background: white;
                padding: 2rem;
                border-radius: 10px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            h1 { color: #1f2937; margin-bottom: 1rem; }
            .status { 
                background: #10b981;
                color: white;
                padding: 0.75rem 1rem;
                border-radius: 6px;
                margin: 1rem 0;
                font-weight: 500;
            }
            .endpoint {
                background: #f3f4f6;
                padding: 1rem;
                border-radius: 6px;
                font-family: 'Monaco', 'Menlo', monospace;
                margin: 1rem 0;
                border-left: 4px solid #3b82f6;
            }
            .method { color: #059669; font-weight: bold; }
            .url { color: #1f2937; }
            ul { color: #4b5563; }
            li { margin: 0.5rem 0; }
            a { color: #3b82f6; text-decoration: none; }
            a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 n8n Workflow RAG Backend</h1>
            
            <div class="status">
                ✅ Backend RAG déployé et fonctionnel
            </div>
            
            <h2>📡 Endpoint API</h2>
            <div class="endpoint">
                <span class="method">POST</span> <span class="url">/api/claude</span>
            </div>
            
            <h2>📋 Configuration requise</h2>
            <ul>
                <li><strong>Content-Type:</strong> application/json</li>
                <li><strong>Authorization:</strong> Bearer YOUR_API_KEY</li>
                <li><strong>Body:</strong> { "prompt": "your workflow description" }</li>
            </ul>
            
            <h2>🔧 Variables d'environnement</h2>
            <ul>
                <li><strong>CLAUDE_API_KEY:</strong> ${process.env.CLAUDE_API_KEY ? '✅ Configurée' : '❌ Manquante'}</li>
                <li><strong>BACKEND_API_KEY:</strong> ${process.env.BACKEND_API_KEY ? '✅ Configurée' : '❌ Manquante'}</li>
            </ul>
            
            <h2>📚 Documentation</h2>
            <p>
                Consultez le 
                <a href="https://github.com/tirones-123/vibe-n8n" target="_blank">README sur GitHub</a>
                pour les instructions complètes.
            </p>
        </div>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
} 