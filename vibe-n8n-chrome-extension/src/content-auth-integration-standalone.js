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

  // Définir la fonction Firebase Auth Google selon la doc officielle
  defineGlobalFirebaseAuthFunctions() {
    console.log('🔧 Définition fonction Firebase Auth Google (doc officielle)...');
    
    // Sign In avec Google - SEULE méthode selon la doc officielle
    window.handleFirebaseGoogleSignIn = async () => {
      console.log('🔗 handleFirebaseGoogleSignIn appelé (offscreen document)');
      try {
        // Utiliser la vraie implémentation offscreen selon la doc officielle
        const result = await chrome.runtime.sendMessage({
          type: 'firebase-signin-google'
        });
        
        console.log('🔗 Résultat authentification Google:', result);
        
        if (result.success || result.user) {
          document.querySelector('.simple-auth-modal')?.remove();
          
          // Affichage du succès
          const toast = document.createElement('div');
          toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 100000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          `;
          toast.textContent = `✅ Connecté avec succès !`;
          document.body.appendChild(toast);
          
          // Supprimer le toast après 3 secondes
          setTimeout(() => {
            if (toast.parentElement) {
              toast.remove();
            }
          }, 3000);
          
          // Attendre un peu puis recharger pour que l'état auth soit pris en compte
          setTimeout(() => location.reload(), 1000);
        } else {
          const errorMsg = result.error?.message || 'Erreur de connexion Google';
          console.error('❌ Erreur auth Google:', errorMsg);
          
          // Affichage de l'erreur
          const toast = document.createElement('div');
          toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 100000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          `;
          toast.textContent = `❌ ${errorMsg}`;
          document.body.appendChild(toast);
          
          setTimeout(() => {
            if (toast.parentElement) {
              toast.remove();
            }
          }, 5000);
        }
      } catch (error) {
        console.error('❌ Erreur handleFirebaseGoogleSignIn:', error);
        
        const toast = document.createElement('div');
        toast.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ef4444;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          z-index: 100000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        `;
        toast.textContent = `❌ Erreur de connexion: ${error.message}`;
        document.body.appendChild(toast);
        
        setTimeout(() => {
          if (toast.parentElement) {
            toast.remove();
          }
        }, 5000);
      }
    };
    
    console.log('✅ Fonction Firebase Auth Google définie');
    console.log('🔍 Vérification:', typeof window.handleFirebaseGoogleSignIn === 'function' ? '✅ OK' : '❌ ERREUR');
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

  // Simple auth modal selon la doc officielle Firebase (Google seulement)
  showSimpleAuthModal() {
    console.log('🔧 Affichage du modal Firebase Auth (Google uniquement)...');
    
    // S'assurer que la fonction Google est définie
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
        padding: 40px;
        border-radius: 16px;
        max-width: 400px;
        min-width: 350px;
        text-align: center;
        color: #333;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      ">
        <div style="font-size: 48px; margin-bottom: 20px;">🔐</div>
        <h2 style="margin-bottom: 10px; color: #2563eb; font-size: 24px;">Authentification requise</h2>
        <p style="margin-bottom: 30px; color: #666; line-height: 1.4;">
          Connectez-vous avec votre compte Google pour accéder à l'assistant IA n8n
        </p>
        
        <button id="google-signin-btn" 
                style="
                  width: 100%; 
                  padding: 16px; 
                  margin-bottom: 20px; 
                  background: #4285f4; 
                  color: white; 
                  border: none; 
                  border-radius: 8px; 
                  font-size: 16px; 
                  font-weight: 500;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 12px;
                  transition: background-color 0.2s;
                " 
                onmouseover="this.style.backgroundColor='#3367d6'"
                onmouseout="this.style.backgroundColor='#4285f4'">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path fill="#FFFFFF" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#FFFFFF" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FFFFFF" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#FFFFFF" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.462.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Se connecter avec Google
        </button>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                  style="
                    padding: 12px 24px; 
                    border: 1px solid #ddd; 
                    background: white; 
                    border-radius: 6px; 
                    font-size: 14px; 
                    cursor: pointer;
                    color: #666;
                    transition: all 0.2s;
                  "
                  onmouseover="this.style.backgroundColor='#f5f5f5'"
                  onmouseout="this.style.backgroundColor='white'">
            Annuler
          </button>
        </div>
        
        <p style="margin-top: 20px; font-size: 12px; color: #999; line-height: 1.3;">
          En vous connectant, vous acceptez nos conditions d'utilisation.<br>
          Authentification sécurisée via Firebase.
        </p>
      </div>
    `;
    
    // Insert modal then wire up event listener in the extension context
    document.body.appendChild(modal);

    const googleBtn = modal.querySelector('#google-signin-btn');
    if (googleBtn) {
      googleBtn.addEventListener('click', () => {
        if (typeof window.handleFirebaseGoogleSignIn === 'function') {
          window.handleFirebaseGoogleSignIn();
        } else {
          console.warn('handleFirebaseGoogleSignIn not available in page context');
        }
      });
    }
    
    // Auto-suppression après 60 secondes
    setTimeout(() => {
      if (modal.parentElement) {
        modal.remove();
      }
    }, 60000);
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