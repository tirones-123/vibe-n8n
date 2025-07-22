import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import claudeHandler from './api/claude.js';
import pricingRoutes from './api/pricing.js';

// Charger les variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Special middleware for Stripe webhooks (raw body required)
app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }));

// Route principale pour Claude (nouveau système RAG)
app.use('/api/claude', claudeHandler);

// Routes de pricing (Stripe + Firebase)
app.use('/api', pricingRoutes);

// Servir le mini-site Firebase Auth pour l'extension Chrome
app.use('/firebase-auth', express.static('firebase-auth-site'));

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
    system: 'Workflow RAG (Pinecone + Claude) + Pricing (Firebase + Stripe)',
    timestamp: new Date().toISOString(),
    configuration: {
      claude_configured: !!process.env.CLAUDE_API_KEY,
      backend_auth_configured: !!process.env.BACKEND_API_KEY,
      openai_configured: !!process.env.OPENAI_API_KEY,
      pinecone_configured: !!process.env.PINECONE_API_KEY,
      firebase_configured: !!process.env.FIREBASE_PROJECT_ID,
      stripe_configured: !!process.env.STRIPE_SECRET_KEY,
      rag_ready: !!process.env.OPENAI_API_KEY && !!process.env.PINECONE_API_KEY && !!process.env.CLAUDE_API_KEY,
      pricing_ready: !!process.env.FIREBASE_PROJECT_ID && !!process.env.STRIPE_SECRET_KEY
    },
    endpoints: {
      '/api/claude': 'POST - Génération de workflows (SSE)',
      '/api/create-checkout-session': 'POST - Créer session Stripe',
      '/api/stripe-webhook': 'POST - Webhooks Stripe',
      '/api/report-usage': 'POST - Rapporter usage tokens',
      '/api/me': 'GET - Informations utilisateur',
      '/api/enable-usage-based': 'POST - Activer usage-based billing',
      '/api/pricing': 'GET - Plans et tarifs',
      '/api/status': 'GET - Monitoring système'
    }
  });
});

// Route de monitoring système
app.get('/api/status', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    uptime: uptime,
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external
    },
    environment: process.env.NODE_ENV || 'development'
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
  const coreRequired = {
    'CLAUDE_API_KEY': process.env.CLAUDE_API_KEY,
    'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
    'PINECONE_API_KEY': process.env.PINECONE_API_KEY,
    'BACKEND_API_KEY': process.env.BACKEND_API_KEY
  };

  const pricingRequired = {
    'FIREBASE_PROJECT_ID': process.env.FIREBASE_PROJECT_ID,
    'FIREBASE_PRIVATE_KEY': process.env.FIREBASE_PRIVATE_KEY,
    'FIREBASE_CLIENT_EMAIL': process.env.FIREBASE_CLIENT_EMAIL,
    'STRIPE_SECRET_KEY': process.env.STRIPE_SECRET_KEY,
    'STRIPE_WEBHOOK_SECRET': process.env.STRIPE_WEBHOOK_SECRET
  };
  
  const coreMissing = Object.entries(coreRequired)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  const pricingMissing = Object.entries(pricingRequired)
    .filter(([key, value]) => !value)
    .map(([key]) => key);
  
  console.log('\n🔧 === VÉRIFICATION CONFIGURATION ===');
  
  if (coreMissing.length > 0) {
    console.log('❌ Variables RAG manquantes:');
    coreMissing.forEach(key => console.log(`   - ${key}`));
    console.log('   Le système RAG ne fonctionnera pas.');
  } else {
    console.log('✅ Configuration RAG complète');
  }

  if (pricingMissing.length > 0) {
    console.log('⚠️  Variables Pricing manquantes:');
    pricingMissing.forEach(key => console.log(`   - ${key}`));
    console.log('   Le système de pricing utilisera le mode legacy (API Key seulement).');
  } else {
    console.log('✅ Configuration Pricing complète (Firebase + Stripe)');
  }
  
  // Vérifier l'index Pinecone
  const indexName = process.env.PINECONE_WORKFLOW_INDEX || 'n8n-workflows';
  console.log(`🗄️  Index Pinecone: ${indexName}`);
  console.log('=================================\n');
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