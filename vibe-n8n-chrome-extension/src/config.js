/**
 * Configuration de l'extension
 * Configuration pour l'API vibe-n8n avec support du système hybride Pinecone + Volume
 */

const CONFIG = {
  // URL de l'API backend vibe-n8n (Railway avec système hybride)
  API_URL: 'https://vibe-n8n-production.up.railway.app/api/claude',
  
  // URL de test local (pour développement)
  API_URL_LOCAL: 'http://localhost:3000/api/claude',
  
  // Clé d'authentification pour l'API backend
  API_KEY: 'd5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2',
  
  // Timeout pour les requêtes API (en millisecondes)
  // Augmenté à 5 minutes car Railway n'a pas de limite de timeout
  // Le nouveau système hybride peut prendre plus de temps pour les gros nodes
  API_TIMEOUT: 300000,
  
  // Version de l'extension
  VERSION: '1.0.0',
  
  // Nouvelles fonctionnalités backend supportées
  FEATURES: {
    // Support des métadonnées étendues (jusqu'à 280KB pour Notion)
    EXTENDED_METADATA: true,
    // Système de volume pour données illimitées
    VOLUME_STORAGE: true,
    // Tokens de sortie augmentés (8192 → 16384)
    EXTENDED_OUTPUT_TOKENS: true,
    // RAG amélioré avec Pinecone + Volume
    HYBRID_RAG: true
  }
};

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} 