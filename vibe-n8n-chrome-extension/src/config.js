/**
 * Configuration de l'extension
 * Configuration pour le backend workflow RAG système
 */

const CONFIG = {
  // URL du backend workflow RAG local
  API_URL: 'http://localhost:3000/api/claude',
  
  // URL de production (si déployé)
  API_URL_PROD: 'https://your-workflow-rag-backend.railway.app/api/claude',
  
  // Clé d'authentification pour le backend workflow RAG
  API_KEY: 'your-token-securise', // Remplacer par votre BACKEND_API_KEY
  
  // Timeout pour les requêtes API (en millisecondes)
  // Backend workflow RAG peut prendre plus de temps pour la génération
  API_TIMEOUT: 60000, // 1 minute
  
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