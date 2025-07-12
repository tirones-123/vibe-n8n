import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import claudeHandler from './api/claude.js';
import { nodeTypesRAG } from './api/rag/node-types-rag.js';
import { startMcpHttp } from './utils/mcpServer.js';

// Charger les variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Route principale pour Claude
app.use('/api/claude', claudeHandler);

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'n8n AI Assistant Backend',
    status: 'running',
    endpoints: {
      claude: '/api/claude'
    }
  });
});

// Route de statut pour vérifier la configuration
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    message: 'n8n AI Assistant Backend API',
    version: '1.0.0',
    environment: {
      claude_configured: !!process.env.CLAUDE_API_KEY,
      backend_auth_configured: !!process.env.BACKEND_API_KEY,
      openai_configured: !!process.env.OPENAI_API_KEY,
      pinecone_configured: !!process.env.PINECONE_API_KEY,
      rag_available: !!process.env.OPENAI_API_KEY && !!process.env.PINECONE_API_KEY
    }
  });
});

// Route pour consulter les logs du cron
app.get('/api/cron-logs', async (req, res) => {
  try {
    const { readFileSync, existsSync } = await import('fs');
    const { join } = await import('path');
    const logFile = join(process.cwd(), 'cron-debug.log');
    
    if (existsSync(logFile)) {
      const logs = readFileSync(logFile, 'utf-8');
      res.type('text/plain').send(logs);
    } else {
      res.status(404).send('Aucun log de cron trouvé. Le cron n\'a pas encore été exécuté.');
    }
  } catch (error) {
    res.status(500).json({ 
      error: 'Erreur lecture logs', 
      message: error.message 
    });
  }
});

// Route pour consulter les logs récents du serveur
app.get('/api/logs', (req, res) => {
  const { limit = 100 } = req.query;
  
  // Stocker les logs en mémoire (simple pour le dev)
  if (!global.serverLogs) {
    global.serverLogs = [];
  }
  
  const recentLogs = global.serverLogs.slice(-parseInt(limit));
  
  res.json({
    total: global.serverLogs.length,
    limit: parseInt(limit),
    logs: recentLogs
  });
});

// Intercepter console.log pour stocker les logs
const originalLog = console.log;
console.log = function(...args) {
  // Appeler le console.log original
  originalLog.apply(console, args);
  
  // Stocker dans notre buffer
  if (!global.serverLogs) {
    global.serverLogs = [];
  }
  
  global.serverLogs.push({
    timestamp: new Date().toISOString(),
    message: args.join(' ')
  });
  
  // Limiter à 1000 entrées max
  if (global.serverLogs.length > 1000) {
    global.serverLogs = global.serverLogs.slice(-1000);
  }
};

// Initialiser les services au démarrage
async function initializeServices() {
  try {
    // Initialiser le NodeTypes RAG si les clés sont disponibles
    if (process.env.OPENAI_API_KEY && process.env.PINECONE_API_KEY) {
      console.log('Initialisation du NodeTypes RAG...');
      await nodeTypesRAG.initialize();
      console.log('NodeTypes RAG prêt !');
      
      // Afficher les stats
      const stats = await nodeTypesRAG.getStats();
      if (stats) {
        console.log(`📊 Index stats: ${stats.totalNodes} nodes indexés`);
      }
    } else {
      console.log('NodeTypes RAG non configuré :');
      if (!process.env.OPENAI_API_KEY) {
        console.log('  - OPENAI_API_KEY manquante (nécessaire pour les embeddings)');
      }
      if (!process.env.PINECONE_API_KEY) {
        console.log('  - PINECONE_API_KEY manquante (nécessaire pour le stockage vectoriel)');
      }
      console.log('Le backend fonctionnera sans enrichissement des node-types.');
    }
  } catch (error) {
    console.error('Erreur initialisation services:', error);
    console.log('Le serveur continue sans NodeTypes RAG.');
  }
}

// Démarrer le serveur 
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Claude endpoint: http://localhost:${PORT}/api/claude`);
  
  // Start local MCP server only if not using remote MCP
  if (process.env.USE_REMOTE_MCP !== 'true') {
    console.log('🔧 Starting local MCP server...');
    startMcpHttp();
  } else {
    console.log('🌐 Using remote MCP server:', process.env.MCP_SERVER_URL);
  }
  
  await initializeServices();
}); 