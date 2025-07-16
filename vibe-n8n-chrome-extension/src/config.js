/**
 * Configuration de l'extension
 * Configuration pour le backend workflow RAG système
 */

const CONFIG = {
  // URL Railway (production active)
  API_URL: 'https://vibe-n8n-production.up.railway.app/api/claude',
  
  // URL Vercel (backup)
  API_URL_VERCEL: 'https://vibe-n8n.vercel.app/api/claude',
  
  // URL locale (pour développement)
  API_URL_LOCAL: 'http://localhost:3000/api/claude',
  
  // Clé d'authentification pour le backend workflow RAG
  API_KEY: 'd5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2', // Remplacer par votre BACKEND_API_KEY
  
  // Timeout pour les requêtes API (en millisecondes)
  // Backend workflow RAG peut prendre plus de temps pour la génération (5-10 min)
  API_TIMEOUT: 900000, // 15 minutes
  
  // Version de l'extension
  VERSION: '1.0.0',
  
  // Mode de fonctionnement : workflow RAG (génération complète)
  MODE: 'workflow_rag',
  
  // Fonctionnalités du backend workflow RAG
  FEATURES: {
    // Génération basée sur RAG avec 2055+ exemples
    RAG_WORKFLOW_GENERATION: true,
    // Streaming SSE
    STREAMING_RESPONSE: true,
    // Génération de workflows complets (pas de tool calls)
    COMPLETE_WORKFLOW_GENERATION: true,
    // Système d'explication détaillée
    WORKFLOW_EXPLANATION: true
  }
};

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} 