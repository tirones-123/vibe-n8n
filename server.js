import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import claudeHandler from './api/claude.js';

// Charger les variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Route principale pour Claude (nouveau système RAG)
app.use('/api/claude', claudeHandler);

// Page d'accueil
app.get('/', async (req, res) => {
  try {
    const { default: indexHandler } = await import('./api/index.js');
    indexHandler(req, res);
  } catch (error) {
    res.json({ 
      message: 'n8n Workflow RAG Backend',
      status: 'running',
      version: '2.0.0',
      endpoints: {
        claude: '/api/claude (POST)',
        api: '/api (GET)'
      }
    });
  }
});

// Route de statut pour vérifier la configuration
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    environment: 'RAG Workflow Backend',
    version: '2.0.0',
    system: 'Workflow RAG (Pinecone + Claude)',
    configuration: {
      claude_configured: !!process.env.CLAUDE_API_KEY,
      backend_auth_configured: !!process.env.BACKEND_API_KEY,
      openai_configured: !!process.env.OPENAI_API_KEY,
      pinecone_configured: !!process.env.PINECONE_API_KEY,
      rag_ready: !!process.env.OPENAI_API_KEY && !!process.env.PINECONE_API_KEY && !!process.env.CLAUDE_API_KEY
    }
  });
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

// Vérifier la configuration au démarrage
function checkConfiguration() {
  const required = {
    'CLAUDE_API_KEY': process.env.CLAUDE_API_KEY,
    'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
    'PINECONE_API_KEY': process.env.PINECONE_API_KEY,
    'BACKEND_API_KEY': process.env.BACKEND_API_KEY
  };
  
  const missing = Object.entries(required)
    .filter(([key, value]) => !value)
    .map(([key]) => key);
  
  if (missing.length > 0) {
    console.log('⚠️  Variables d\'environnement manquantes:');
    missing.forEach(key => console.log(`   - ${key}`));
    console.log('   Le système RAG pourrait ne pas fonctionner correctement.');
  } else {
    console.log('✅ Toutes les variables d\'environnement sont configurées');
  }
  
  // Vérifier l'index Pinecone
  const indexName = process.env.PINECONE_WORKFLOW_INDEX || 'n8n-workflows';
  console.log(`🗄️  Index Pinecone configuré: ${indexName}`);
}

// Démarrer le serveur 
app.listen(PORT, () => {
  console.log(`🚀 n8n Workflow RAG Backend v2.0.0`);
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api/claude`);
  console.log(`🏠 Homepage: http://localhost:${PORT}/`);
  
  checkConfiguration();
  
  console.log('\n📋 Pour tester le système:');
  console.log('   npm run test:streaming');
  console.log('   ou ouvrir test-streaming-client.html');
}); 