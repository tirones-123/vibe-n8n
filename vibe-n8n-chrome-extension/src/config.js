/**
 * Configuration de l'extension
 * Configuration pour le backend workflow RAG + système de pricing Firebase/Stripe
 */

const CONFIG = {
  // ===== BACKEND API =====
  // URL Railway (production - endpoint Claude direct pour compatibility)
  API_URL: 'https://vibe-n8n-production.up.railway.app/api/claude',
  
  // URL de base pour les nouveaux endpoints
  API_BASE_URL: 'https://vibe-n8n-production.up.railway.app',
  
  // URL locale (pour développement)
  API_URL_LOCAL: 'http://localhost:3000/api/claude',
  API_BASE_URL_LOCAL: 'http://localhost:3000',
  
  // API Key pour les requêtes backend
  API_KEY: 'd5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2',
  
  // Legacy API Key (pour compatibilité avec l'ancien système) 
  LEGACY_API_KEY: 'd5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2',
  
  // ===== FIREBASE CONFIGURATION =====
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyDPB8tHayuvKuhimMQPbJBBLvukFLJIZ8I",
    authDomain: "vibe-n8n-7e40d.firebaseapp.com",
    projectId: "vibe-n8n-7e40d",
    storageBucket: "vibe-n8n-7e40d.firebasestorage.app",
    messagingSenderId: "247816285693",
    appId: "1:247816285693:web:1229eea4a52d6d765afd94",
    measurementId: "G-1CLFCN7KVL"
  },
  
  // ===== CONFIGURATION GÉNÉRALE =====
  // Timeout pour les requêtes API (en millisecondes)
  API_TIMEOUT: 900000, // 15 minutes
  
  // Version de l'extension
  VERSION: '2.0.0',
  
  // Mode de fonctionnement : workflow RAG + pricing
  MODE: 'workflow_rag_with_pricing',
  
  // ===== FONCTIONNALITÉS =====
  FEATURES: {
    // Authentification Firebase
    FIREBASE_AUTH: true,
    // Système de pricing avec quotas
    PRICING_SYSTEM: true,
    // Plans FREE/PRO
    SUBSCRIPTION_PLANS: true,
    // Usage-based billing
    USAGE_BASED_BILLING: true,
    // Génération basée sur RAG avec 2055+ exemples
    RAG_WORKFLOW_GENERATION: true,
    // Streaming SSE
    STREAMING_RESPONSE: true,
    // Génération de workflows complets
    COMPLETE_WORKFLOW_GENERATION: true,
    // Système d'explication détaillée
    WORKFLOW_EXPLANATION: true,
    // Popups de quota intelligents
    QUOTA_MANAGEMENT: true
  },
  
  // ===== ENDPOINTS API =====
  ENDPOINTS: {
    CLAUDE: '/api/claude',
    USER_INFO: '/api/me',
    CREATE_CHECKOUT: '/api/create-checkout-session',
    ENABLE_USAGE_BASED: '/api/enable-usage-based',
    REPORT_USAGE: '/api/report-usage',
    PRICING: '/api/pricing',
    STATUS: '/api/status'
  }
};

// Rendre CONFIG disponible globalement pour Service Worker
if (typeof globalThis !== 'undefined') {
  globalThis.CONFIG = CONFIG;
}

// Export pour utilisation dans d'autres modules (Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}

// Pas d'export ES6 - incompatible avec Chrome Extension content scripts
// CONFIG est disponible globalement via window.CONFIG 