// Content Auth Integration - STANDALONE VERSION
// Compatible with Chrome Extension content scripts

class ContentAuthIntegration {
  constructor() {
    this.initialized = false;
    this.authRequired = false;
    
    // Configuration from global window.CONFIG or fallback
    this.CONFIG = window.CONFIG || {
      API_URL: 'https://vibe-n8n-production.up.railway.app/api/claude',
      API_BASE_URL: 'https://vibe-n8n-production.up.railway.app',
      LEGACY_API_KEY: 'd5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2',
      ENDPOINTS: {
        USER_INFO: '/api/me',
        CREATE_CHECKOUT: '/api/create-checkout-session',
        REPORT_USAGE: '/api/report-usage'
      }
    };
    
    // Définir immédiatement les fonctions globales
    this.defineGlobalFirebaseAuthFunctions();
  }

  // Initialize authentication system
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🔐 Initializing content auth integration (standalone)...');
      this.initialized = true;
      console.log('✅ Content auth integration initialized');
    } catch (error) {
      console.error('❌ Content auth integration initialization failed:', error);
    }
  }

  // Définir les fonctions Firebase Auth globalement - VERSION SIMPLIFIÉE
  defineGlobalFirebaseAuthFunctions() {
    console.log('🔧 Définition globale des fonctions Firebase Auth...');
    
    // Sign Up avec email/password
    window.handleFirebaseSignUp = async () => {
      console.log('📝 handleFirebaseSignUp appelé');
      try {
        const email = document.getElementById('firebase-email')?.value;
        const password = document.getElementById('firebase-password')?.value;
        
        if (!email || !password) {
          alert('Veuillez remplir tous les champs');
          return;
        }
        
        if (password.length < 6) {
          alert('Le mot de passe doit contenir au moins 6 caractères');
          return;
        }
        
        const result = await chrome.runtime.sendMessage({
          type: 'firebase-signup-email',
          data: { email, password }
        });
        
        if (result.success) {
          document.querySelector('.simple-auth-modal')?.remove();
          alert(`Compte créé avec succès ! Bienvenue ${email}`);
          setTimeout(() => location.reload(), 500);
        } else {
          alert(`Erreur de création: ${result.error?.message || 'Erreur inconnue'}`);
        }
      } catch (error) {
        console.error('❌ Error in handleFirebaseSignUp:', error);
        alert(`Erreur de création: ${error.message}`);
      }
    };
    
    // Sign In avec email/password
    window.handleFirebaseSignIn = async () => {
      console.log('🔐 handleFirebaseSignIn appelé');
      try {
        const email = document.getElementById('firebase-email')?.value;
        const password = document.getElementById('firebase-password')?.value;
        
        if (!email || !password) {
          alert('Veuillez remplir tous les champs');
          return;
        }
        
        const result = await chrome.runtime.sendMessage({
          type: 'firebase-signin-email',
          data: { email, password }
        });
        
        if (result.success) {
          document.querySelector('.simple-auth-modal')?.remove();
          alert('Connexion réussie !');
          setTimeout(() => location.reload(), 500);
        } else {
          alert(`Erreur de connexion: ${result.error?.message || 'Erreur inconnue'}`);
        }
      } catch (error) {
        console.error('❌ Error in handleFirebaseSignIn:', error);
        alert(`Erreur de connexion: ${error.message}`);
      }
    };
    
    // Sign In avec Google
    window.handleFirebaseGoogleSignIn = async () => {
      console.log('🔗 handleFirebaseGoogleSignIn appelé');
      try {
        const result = await chrome.runtime.sendMessage({
          type: 'firebase-signin-google'
        });
        
        if (result.success) {
          document.querySelector('.simple-auth-modal')?.remove();
          alert('Connexion Google réussie !');
          setTimeout(() => location.reload(), 500);
        } else {
          alert(`Erreur connexion Google: ${result.error?.message || 'Erreur inconnue'}`);
        }
      } catch (error) {
        console.error('❌ Error in handleFirebaseGoogleSignIn:', error);
        alert(`Erreur connexion Google: ${error.message}`);
      }
    };
    
    console.log('✅ Fonctions Firebase Auth définies globalement');
    
    // Vérification immédiate
    const functionsOk = [
      typeof window.handleFirebaseSignUp === 'function',
      typeof window.handleFirebaseSignIn === 'function', 
      typeof window.handleFirebaseGoogleSignIn === 'function'
    ].every(test => test);
    
    console.log(`🔍 Vérification: ${functionsOk ? '✅ Toutes les fonctions définies' : '❌ Fonctions manquantes'}`);
  }

  // Check if user can make a request
  async canMakeRequest() {
    try {
      console.log('🔍 Vérification de l\'authentification Firebase...');
      
      // Vérifier l'état actuel de l'utilisateur Firebase
      const currentUser = await chrome.runtime.sendMessage({
        type: 'firebase-get-user'
      });
      
      console.log('👤 Current user check result:', currentUser);
      
      if (currentUser.success && currentUser.user) {
        console.log('✅ Utilisateur authentifié:', currentUser.user.email);
        return { 
          allowed: true,
          method: 'firebase',
          user: currentUser.user
        };
      } else {
        console.log('❌ Utilisateur non authentifié');
        return { 
          allowed: false, 
          reason: 'NOT_AUTHENTICATED',
          action: 'show_auth_modal'
        };
      }
    } catch (error) {
      console.error('❌ Erreur vérification auth:', error);
      return { 
        allowed: false, 
        reason: 'AUTH_ERROR',
        action: 'show_auth_modal'
      };
    }
  }

  // Handle quota/auth errors
  handleAccessDenied(checkResult) {
    console.log('🚫 Accès refusé:', checkResult.reason);
    
    switch (checkResult.action) {
      case 'show_auth_modal':
        console.log('🔐 Affichage du modal d\'authentification requis');
        this.showSimpleAuthModal();
        break;
      
      case 'show_error':
        this.showErrorMessage('Erreur de connexion. Réessayez plus tard.');
        break;
        
      default:
        console.log('🔐 Action par défaut: affichage modal auth');
        this.showSimpleAuthModal();
        break;
    }
  }

  // Simple auth modal fallback
  showSimpleAuthModal() {
    console.log('🔧 Affichage du modal Firebase Auth...');
    
    // S'assurer que les fonctions sont définies
    this.defineGlobalFirebaseAuthFunctions();
    
    const modal = document.createElement('div');
    modal.className = 'simple-auth-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 450px;
        min-width: 400px;
        text-align: center;
        color: #333;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      ">
        <h2 style="margin-bottom: 10px; color: #2563eb;">🔐 Firebase Authentication</h2>
        <p style="margin-bottom: 25px; color: #666;">Connectez-vous pour accéder à l'assistant IA</p>
        
        <div style="text-align: left; margin-bottom: 20px;">
          <input type="email" id="firebase-email" placeholder="Email" 
                 style="width: 100%; padding: 12px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
          <input type="password" id="firebase-password" placeholder="Mot de passe" 
                 style="width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
        </div>
        
        <div style="margin-bottom: 20px;">
          <button onclick="window.handleFirebaseSignIn()" 
                  style="width: 100%; padding: 12px; margin-bottom: 10px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer;">
            Se connecter
          </button>
          <button onclick="window.handleFirebaseSignUp()" 
                  style="width: 100%; padding: 12px; margin-bottom: 10px; background: #059669; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer;">
            Créer un compte
          </button>
          <button onclick="window.handleFirebaseGoogleSignIn()" 
                  style="width: 100%; padding: 12px; margin-bottom: 15px; background: #dc2626; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer;">
            🔗 Connexion Google
          </button>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 15px; text-align: center;">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                  style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 4px; font-size: 14px; cursor: pointer;">
            Annuler
          </button>
        </div>
      </div>
    `;
    
    // Ajouter le modal au DOM
    document.body.appendChild(modal);
    
    // Auto-suppression après 30 secondes
    setTimeout(() => {
      if (modal.parentElement) {
        modal.remove();
      }
    }, 30000);
  }

  // Make authenticated request
  async makeWorkflowRequest(prompt, baseWorkflow = null) {
    const checkResult = await this.canMakeRequest();
    
    if (!checkResult.allowed) {
      this.handleAccessDenied(checkResult);
      return null;
    }

    const endpoint = this.CONFIG.API_URL;
    const payload = { prompt };
    
    if (baseWorkflow) {
      payload.baseWorkflow = baseWorkflow;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.CONFIG.LEGACY_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;

    } catch (error) {
      console.error('❌ Workflow request failed:', error);
      this.showErrorMessage('Erreur lors de la génération. Réessayez.');
      return null;
    }
  }

  // Show error message
  showErrorMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'auth-error-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc2626;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 10002;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 5000);
  }

  // Get current authentication status
  async getAuthStatus() {
    try {
      const currentUser = await chrome.runtime.sendMessage({
        type: 'firebase-get-user'
      });
      
      return {
        isRequired: true, // Firebase Auth est maintenant requis
        isAuthenticated: currentUser.success && !!currentUser.user,
        currentUser: currentUser.user || null
      };
    } catch (error) {
      console.error('❌ Erreur récupération statut auth:', error);
      return {
        isRequired: true,
        isAuthenticated: false,
        currentUser: null
      };
    }
  }
}

// Make available globally et initialiser immédiatement
if (typeof window !== 'undefined') {
  window.ContentAuthIntegration = window.ContentAuthIntegration || ContentAuthIntegration;
  
  // Créer et initialiser l'instance immédiatement
  if (!window.contentAuthIntegration) {
    window.contentAuthIntegration = new ContentAuthIntegration();
    window.contentAuthIntegration.initialize();
  }
}

// For potential imports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentAuthIntegration;
} 