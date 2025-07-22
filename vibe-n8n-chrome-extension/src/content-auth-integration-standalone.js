// Content Auth Integration - STANDALONE VERSION
// Compatible with Chrome Extension content scripts

class ContentAuthIntegration {
  constructor() {
    this.initialized = false;
    this.authRequired = false;
    this.authService = null;
    this.authUI = null;
    
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
  }

  // Initialize authentication system
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🔐 Initializing content auth integration (standalone)...');
      
      // Get auth service from global scope
      this.authService = window.authService || window.AuthService;
      if (!this.authService) {
        console.warn('⚠️ AuthService not available globally');
        return;
      }

      // Initialize auth service
      await this.authService.initialize();
      
      // Get auth UI from global scope  
      this.authUI = window.authUI || window.AuthUI;
      if (this.authUI) {
        await this.authUI.initialize();
      }
      
      // Listen for auth state changes
      this.authService.onAuthStateChanged((user, token) => {
        if (user) {
          console.log('✅ User authenticated:', user.email);
          this.updateUIForAuthenticatedUser();
        } else {
          console.log('❌ User not authenticated');
          this.updateUIForUnauthenticatedUser();
        }
      });

      // CRITIQUE: Définir les fonctions Firebase Auth globalement dès l'initialisation
      this.defineGlobalFirebaseAuthFunctions();
      
      this.initialized = true;
      
      console.log('✅ Content auth integration initialized (Firebase Auth OBLIGATOIRE)');
    } catch (error) {
      console.error('❌ Content auth integration initialization failed:', error);
      // En cas d'erreur, Firebase Auth reste OBLIGATOIRE
    }
  }

  // Définir les fonctions Firebase Auth globalement (appelé à l'initialisation ET lors de l'affichage du modal)
  defineGlobalFirebaseAuthFunctions() {
    console.log('🔧 Définition globale des fonctions Firebase Auth...');
    
    const self = this; // Capturer le contexte
    
    // NOUVELLE APPROCHE : Injection dans le Main World de la page
    this.injectFirebaseAuthFunctionsIntoMainWorld();
    
    // ANCIENNE APPROCHE : Définition dans le content script (pour compatibilité)
    // Sign Up avec email/password
    window.handleFirebaseSignUp = async () => {
      console.log('📝 handleFirebaseSignUp appelé (content script)');
      return this.handleSignUp();
    };
    
    // Sign In avec email/password
    window.handleFirebaseSignIn = async () => {
      console.log('🔐 handleFirebaseSignIn appelé (content script)');
      return this.handleSignIn();
    };
    
    // Sign In avec Google
    window.handleFirebaseGoogleSignIn = async () => {
      console.log('🔗 handleFirebaseGoogleSignIn appelé (content script)');
      return this.handleGoogleSignIn();
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

  // Injection des fonctions dans le Main World de la page (contexte principal)
  injectFirebaseAuthFunctionsIntoMainWorld() {
    console.log('🌐 Injection des fonctions Firebase Auth dans le Main World...');

    // Charger le script depuis l’extension (évite unsafe-inline / CSP)
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('src/auth-mainworld.js');
    script.onload = () => script.remove(); // Nettoyage après exécution
    (document.head || document.documentElement).appendChild(script);

    // Configurer les listeners de communication entre Main World et content script
    this.setupMainWorldEventListeners();
  }

  // Configurer les listeners pour les événements du Main World
  setupMainWorldEventListeners() {
    console.log('📡 Configuration des listeners Main World...');
    
    document.addEventListener('firebaseAuthRequest', async (event) => {
      const { action, data, id } = event.detail;
      console.log(`📨 Requête Firebase Auth reçue: ${action}`, data);
      
      let result;
      
      try {
        switch (action) {
          case 'signUp':
            result = await this.authService.signUpWithEmail(data.email, data.password);
            break;
          case 'signIn':
            result = await this.authService.signInWithEmail(data.email, data.password);
            break;
          case 'signInGoogle':
            result = await this.authService.signInWithGoogle();
            break;
          default:
            result = { success: false, error: { message: 'Action inconnue' } };
        }
      } catch (error) {
        console.error(`❌ Erreur ${action}:`, error);
        result = { success: false, error: { message: error.message } };
      }
      
      // Envoyer la réponse
      console.log(`📤 Envoi réponse Firebase Auth: ${action}`, result);
      document.dispatchEvent(new CustomEvent('firebaseAuthResponse', {
        detail: { responseId: id, result }
      }));
    });
    
    console.log('✅ Listeners Main World configurés');
  }

  // Méthodes auxiliaires pour compatibilité
  async handleSignUp() {
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
    
    try {
      const result = await this.authService.signUpWithEmail(email, password);
      
      if (result.success) {
        document.querySelector('.simple-auth-modal')?.remove();
        alert(`Compte créé avec succès ! Bienvenue ${email}`);
        setTimeout(() => location.reload(), 500);
      } else {
        alert(`Erreur de création: ${result.error?.message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      alert(`Erreur de création: ${error.message}`);
    }
  }

  async handleSignIn() {
    const email = document.getElementById('firebase-email')?.value;
    const password = document.getElementById('firebase-password')?.value;
    
    if (!email || !password) {
      alert('Veuillez remplir tous les champs');
      return;
    }
    
    try {
      const result = await this.authService.signInWithEmail(email, password);
      
      if (result.success) {
        document.querySelector('.simple-auth-modal')?.remove();
        alert('Connexion réussie !');
        setTimeout(() => location.reload(), 500);
      } else {
        alert(`Erreur de connexion: ${result.error?.message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      alert(`Erreur de connexion: ${error.message}`);
    }
  }

  async handleGoogleSignIn() {
    try {
      const result = await this.authService.signInWithGoogle();
      
      if (result.success) {
        document.querySelector('.simple-auth-modal')?.remove();
        setTimeout(() => location.reload(), 500);
      } else {
        alert(`Erreur connexion Google: ${result.error?.message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      alert(`Erreur connexion Google: ${error.message}`);
    }
  }

  // Check if user can make a request (Firebase Auth OBLIGATOIRE)
  async canMakeRequest() {
    // Authentification Firebase TOUJOURS requise en production
    if (!this.authService || !this.authService.isAuthenticated()) {
      return { 
        allowed: false, 
        reason: 'NOT_AUTHENTICATED',
        action: 'show_auth_modal'
      };
    }

    try {
      const response = await this.authService.makeAuthenticatedRequest(
        `${this.CONFIG.API_BASE_URL}${this.CONFIG.ENDPOINTS.USER_INFO}`
      );

      if (!response.ok) {
        if (response.status === 429) {
          const error = await response.json();
          return {
            allowed: false,
            reason: error.code,
            data: error,
            action: 'show_quota_popup'
          };
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const userInfo = await response.json();
      return { 
        allowed: userInfo.quota.can_make_request,
        method: 'firebase',
        userInfo
      };

    } catch (error) {
      console.error('❌ Error checking user quota:', error);
      return { 
        allowed: false, 
        reason: 'API_ERROR',
        action: 'show_error'
      };
    }
  }

  // Handle quota/auth errors
  handleAccessDenied(checkResult) {
    switch (checkResult.action) {
      case 'show_auth_modal':
        if (this.authUI && this.authUI.showAuthModal) {
          this.authUI.showAuthModal();
        } else {
          this.showSimpleAuthModal();
        }
        break;
      
      case 'show_quota_popup':
        if (this.authUI && this.authUI.createQuotaExceededPopup) {
          const popup = this.authUI.createQuotaExceededPopup(checkResult.data);
          document.body.appendChild(popup);
        } else {
          this.showSimpleQuotaPopup(checkResult.data);
        }
        break;
      
      case 'show_error':
        this.showErrorMessage('Erreur de connexion. Réessayez plus tard.');
        break;
    }
  }

  // Simple auth modal fallback
  showSimpleAuthModal() {
    console.log('🔧 Affichage du modal Firebase Auth...');
    
    // S'assurer que les fonctions Firebase Auth sont définies globalement
    // (elles le sont déjà depuis l'initialisation, mais on reconfirme par sécurité)
    this.defineGlobalFirebaseAuthFunctions();
    
    // Maintenant créer le modal HTML (les fonctions existent déjà)
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
    
    setTimeout(() => {
      if (modal.parentElement) {
        modal.remove();
      }
    }, 30000); // 30 secondes pour avoir le temps de se connecter
  }



  // Simple quota popup fallback
  showSimpleQuotaPopup(quotaData) {
    const popup = document.createElement('div');
    popup.className = 'simple-quota-popup';
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 99999;
      max-width: 400px;
      text-align: center;
    `;
    
    popup.innerHTML = `
      <h3>📊 Quota dépassé</h3>
      <p>${quotaData.message || 'Limite atteinte'}</p>
      <div style="margin-top: 15px;">
        <button onclick="this.parentElement.parentElement.remove()" 
                style="padding: 8px 16px; margin-right: 10px;">
          Fermer
        </button>
        ${quotaData.action === 'upgrade_to_pro' ? 
          '<button onclick="window.open(\'https://vibe-n8n-production.up.railway.app/upgrade\', \'_blank\'); this.parentElement.parentElement.remove()" style="padding: 8px 16px; background: #ff6d5a; color: white; border: none; border-radius: 4px;">Go Pro</button>' :
          ''
        }
      </div>
    `;
    
    document.body.appendChild(popup);
    
    setTimeout(() => {
      if (popup.parentElement) {
        popup.remove();
      }
    }, 15000);
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
      let response;
      
      if (checkResult.method === 'legacy') {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.CONFIG.LEGACY_API_KEY}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        response = await this.authService.makeAuthenticatedRequest(endpoint, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (response.status === 429) {
        const error = await response.json();
        this.handleAccessDenied({ 
          allowed: false,
          action: 'show_quota_popup',
          data: error
        });
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (checkResult.method === 'firebase') {
        this.reportUsageAfterRequest(response);
      }

      return response;

    } catch (error) {
      console.error('❌ Workflow request failed:', error);
      this.showErrorMessage('Erreur lors de la génération. Réessayez.');
      return null;
    }
  }

  // Report usage after successful request
  async reportUsageAfterRequest(response) {
    try {
      const tokensUsed = this.extractTokenUsage(response);
      
      if (tokensUsed && this.authService) {
        await this.authService.makeAuthenticatedRequest(
          `${this.CONFIG.API_BASE_URL}${this.CONFIG.ENDPOINTS.REPORT_USAGE}`,
          {
            method: 'POST',
            body: JSON.stringify({
              input_tokens: tokensUsed.input,
              output_tokens: tokensUsed.output || 0
            })
          }
        );
      }
    } catch (error) {
      console.error('❌ Failed to report usage:', error);
    }
  }

  // Extract token usage from response
  extractTokenUsage(response) {
    return null; // Will be implemented based on backend response format
  }

  // Update UI for authenticated user
  updateUIForAuthenticatedUser() {
    console.log('🎨 Updating UI for authenticated user');
  }

  // Update UI for unauthenticated user
  updateUIForUnauthenticatedUser() {
    console.log('🎨 Updating UI for unauthenticated user');
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
  getAuthStatus() {
    return {
      isRequired: this.authRequired,
      isAuthenticated: this.authService ? this.authService.isAuthenticated() : false,
      currentUser: this.authService ? this.authService.getCurrentUser() : null
    };
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.ContentAuthIntegration = window.ContentAuthIntegration || ContentAuthIntegration;
  window.contentAuthIntegration = window.contentAuthIntegration || new ContentAuthIntegration();
}

// For potential imports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.ContentAuthIntegration;
} 