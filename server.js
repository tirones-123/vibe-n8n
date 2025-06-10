import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import claudeHandler from './api/claude.js';
import { n8nRAG } from './api/rag/pinecone-rag.js';

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

// Initialiser les services au démarrage
async function initializeServices() {
  try {
    // Initialiser le RAG Pinecone si les clés sont disponibles
    if (process.env.OPENAI_API_KEY && process.env.PINECONE_API_KEY) {
      console.log('Initialisation du RAG Pinecone...');
      await n8nRAG.initialize();
      console.log('RAG Pinecone prêt !');
    } else {
      console.log('RAG Pinecone non configuré :');
      if (!process.env.OPENAI_API_KEY) {
        console.log('  - OPENAI_API_KEY manquante (nécessaire pour les embeddings)');
      }
      if (!process.env.PINECONE_API_KEY) {
        console.log('  - PINECONE_API_KEY manquante (nécessaire pour le stockage vectoriel)');
      }
      console.log('Le backend fonctionnera sans enrichissement RAG.');
    }
  } catch (error) {
    console.error('Erreur initialisation services:', error);
    console.log('Le serveur continue sans RAG.');
  }
}

// Démarrer le serveur
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Claude endpoint: http://localhost:${PORT}/api/claude`);
  await initializeServices();
}); 