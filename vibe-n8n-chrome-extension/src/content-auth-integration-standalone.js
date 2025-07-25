// Content Auth Integration - STANDALONE VERSION
// Compatible with Chrome Extension content scripts

// == Logging control ==
var DEBUG_LOGS_ENABLED = typeof DEBUG_LOGS_ENABLED !== 'undefined' ? DEBUG_LOGS_ENABLED : false;
if (typeof window.__n8nAICALogsPatched === 'undefined') {
  window.__n8nAICALogsPatched = true;
  const __caOriginalLog = console.log.bind(console);
  console.log = (...args) => {
    if (DEBUG_LOGS_ENABLED) {
      __caOriginalLog('[n8n-AI]', ...args);
    }
  };
}

class ContentAuthIntegration {
  constructor() {
    this.initialized = false;
    this.authRequired = false;
    
    // Configuration from global window.CONFIG or fallback
    this.CONFIG = window.CONFIG || {
      API_URL: 'https://vibe-n8n.com/api/claude',
      API_BASE_URL: 'https://vibe-n8n.com',
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

  // --- NEW: get Firebase ID token via background script ---
  async getFirebaseIdToken(forceRefresh = false) {
    try {
      const token = await chrome.runtime.sendMessage({
        type: 'firebase-get-token',
        data: { forceRefresh }
      });
      if (token && typeof token === 'string' && token.length > 50) {
        return token;
      }
      console.warn('getFirebaseIdToken: invalid token received', token);
      return null;
    } catch (err) {
      console.error('getFirebaseIdToken error:', err);
      return null;
    }
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
    
    window.handleFirebaseEmailAuth = async (mode = 'signin') => {
      const emailInput = document.querySelector('#firebase-auth-email');
      const passInput = document.querySelector('#firebase-auth-password');
      if (!emailInput || !passInput) return;

      const email = emailInput.value.trim();
      const password = passInput.value.trim();
      if (!email || !password) {
        alert('Please enter email and password');
        return;
      }

      const type = mode === 'signup' ? 'firebase-signup-email' : 'firebase-signin-email';
      console.log('🔗 handleFirebaseEmailAuth appelé:', mode, email);
      try {
        const result = await chrome.runtime.sendMessage({
          type,
          data: { email, password }
        });

        if (result.success || result.user) {
          document.querySelector('.simple-auth-modal')?.remove();
          
          // Si c'est un signup avec email de vérification envoyé, afficher le joli modal
          if (mode === 'signup' && result.verificationEmailSent) {
            window.contentAuthIntegration.createEmailVerificationModal(email, true);
            return; // Ne pas recharger la page immédiatement
          } else if (mode === 'signup') {
            window.contentAuthIntegration.createEmailVerificationModal(email, false);
            return; // Ne pas recharger la page immédiatement
          }
          
          // Pour signin normal, recharger après un délai
          setTimeout(() => location.reload(), 800);
        } else {
          alert(result.error?.message || 'Erreur d\'auth firebase');
        }
      } catch (e) {
        alert(e.message);
      }
    };
    
    console.log('✅ Fonction Firebase Auth Google définie');
    console.log('🔍 Vérification:', typeof window.handleFirebaseGoogleSignIn === 'function' ? '✅ OK' : '❌ ERREUR');
  }

  // Create a beautiful email verification modal
  createEmailVerificationModal(email, emailSent = true) {
    // Supprimer tout modal existant
    const existingModal = document.querySelector('.email-verification-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'email-verification-modal';
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const content = `
      <div style="
        background: white;
        padding: 40px;
        border-radius: 16px;
        max-width: 450px;
        min-width: 400px;
        text-align: center;
        color: #333;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        animation: modalSlideIn 0.3s ease-out;
      ">
        <div style="font-size: 64px; margin-bottom: 20px;">📧</div>
        <h2 style="margin-bottom: 15px; color: ${emailSent ? '#059669' : '#dc2626'}; font-size: 24px; font-weight: 600;">
          ${emailSent ? '✅ Compte créé avec succès !' : '⚠️ Compte créé - Action requise'}
        </h2>
        <p style="margin-bottom: 20px; color: #374151; font-size: 16px; line-height: 1.5;">
          ${emailSent ? 'Un email de vérification a été envoyé à :' : 'Votre compte a été créé pour :'}
        </p>
        <div style="
          background: #f3f4f6; 
          padding: 12px 16px; 
          border-radius: 8px; 
          margin-bottom: 25px;
          font-family: 'Courier New', monospace;
          color: #1f2937;
          font-weight: 500;
          border: 2px solid #e5e7eb;
        ">
          ${email}
        </div>
        ${emailSent ? `
          <div style="
            background: #fef3c7; 
            border: 1px solid #f59e0b; 
            border-radius: 8px; 
            padding: 16px; 
            margin-bottom: 30px;
            text-align: left;
          ">
                          <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;">📋 Next steps:</h4>
            <ol style="margin: 0; padding-left: 18px; color: #92400e; font-size: 14px; line-height: 1.4;">
                              <li>Check your email inbox (including spam folder)</li>
                <li>Click on the verification link</li>
              <li>Sign in again to activate your <strong>full access</strong></li>
            </ol>
          </div>
        ` : `
          <div style="
            background: #fef2f2; 
            border: 1px solid #fca5a5; 
            border-radius: 8px; 
            padding: 16px; 
            margin-bottom: 25px;
          ">
            <p style="margin: 0 0 10px 0; color: #dc2626; font-size: 14px; font-weight: 500;">
                              ⚠️ The verification email could not be sent automatically
            </p>
            <p style="margin: 0; color: #7f1d1d; font-size: 13px; line-height: 1.4;">
                              Please sign in and manually verify your email from your Firebase dashboard.
            </p>
          </div>
        `}
        <div style="
          background: #fef2f2; 
          border: 1px solid #fca5a5; 
          border-radius: 8px; 
          padding: 12px; 
          margin-bottom: 25px;
        ">
          <p style="margin: 0; color: #dc2626; font-size: 13px; font-weight: 500;">
            ⚠️ You cannot use the AI assistant until your email is verified
          </p>
        </div>
        <button id="close-verification-modal" style="
          width: 100%; 
          padding: 14px; 
          background: ${emailSent ? '#059669' : '#dc2626'}; 
          color: white; 
          border: none; 
          border-radius: 8px; 
          font-size: 16px; 
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        ">
          J'ai compris
        </button>
        
        <p style="margin-top: 20px; font-size: 12px; color: #999; line-height: 1.3;">
          En utilisant notre service, vous acceptez nos conditions d'utilisation.<br>
          Authentification sécurisée via Firebase.
        </p>
      </div>
    `;

    // Ajouter l'animation CSS si elle n'existe pas
    if (!document.querySelector('#verification-modal-animations')) {
      const style = document.createElement('style');
      style.id = 'verification-modal-animations';
      style.textContent = `
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }

    modal.innerHTML = content;
    document.body.appendChild(modal);

    // Gestionnaire de fermeture
    const closeBtn = modal.querySelector('#close-verification-modal');
    const closeModal = () => {
      modal.style.opacity = '0';
      setTimeout(() => {
        modal.remove();
      }, 200);
    };

    closeBtn.addEventListener('click', closeModal);

    // Fermer en cliquant en dehors
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Fermer avec Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  // Check if user can make a request with quota verification
  async canMakeRequest() {
    try {
      console.log('🔍 Vérification de l\'authentification Firebase...');
      
      // Vérifier l'état actuel de l'utilisateur Firebase
      const currentUser = await chrome.runtime.sendMessage({
        type: 'firebase-get-user'
      });
      
      console.log('👤 Current user check result:', currentUser);
      
      // --- MODIFICATION ---
      // Le background peut renvoyer directement l'objet user (sans success)
      // ou bien un objet { success: true, user: {...} }
      let user = null;
      if (currentUser && typeof currentUser === 'object') {
        if ('success' in currentUser) {
          // Nouveau format { success, user }
          if (currentUser.success) {
            user = currentUser.user || null;
          }
        } else {
          // Ancien format: l'objet utilisateur directement
          user = currentUser;
        }
      }

      if (!user) {
        console.log('❌ Utilisateur non authentifié');
        return { 
          allowed: false, 
          reason: 'NOT_AUTHENTICATED',
          action: 'show_auth_modal'
        };
      }

      console.log('✅ Utilisateur authentifié:', user.email || user.uid);
      
      // Check quota with backend
      try {
        const token = await this.getFirebaseIdToken();
        if (!token) {
          return {
            allowed: false,
            reason: 'NO_TOKEN',
            action: 'show_auth_modal'
          };
        }
        
        console.log('🔍 Vérification des quotas avec le backend...');
        
        // Get fresh user info to check quota
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          console.warn('Failed to check user quota:', response.status);
          return {
            allowed: true, // Allow by default if quota check fails
            reason: 'QUOTA_CHECK_FAILED',
            method: 'firebase',
            user
          };
        }
        
        const userData = await response.json();
        const freshUser = userData.user;
        
                 console.log('📊 Quota check - plan:', freshUser.plan, 'usage_based:', freshUser.usage_based_enabled);
        
        // Check if user has enough quota
        if (freshUser.remaining_tokens <= 0) {
          console.log('⚠️ Quota limit reached for plan:', freshUser.plan);
          
          // For FREE users
          if (freshUser.plan === 'FREE') {
            return {
              allowed: false,
              reason: 'FREE_LIMIT_EXCEEDED',
              action: 'show_quota_card',
              quotaInfo: {
                code: 'FREE_LIMIT_EXCEEDED',
                user: freshUser,
                action: 'upgrade_to_pro',
                message: 'Free plan limit reached. Please upgrade to continue.'
              }
            };
          }
          
          // For PRO users
          if (freshUser.plan === 'PRO') {
            // Check if usage-based billing is enabled
            if (freshUser.usage_based_enabled) {
              const totalSpent = (freshUser.this_month_usage_usd || 0) + (freshUser.paid_usage_usd || 0);
              const remainingBudget = freshUser.usage_limit_usd - totalSpent;
              
              if (remainingBudget <= 0) {
                return {
                  allowed: false,
                  reason: 'USAGE_LIMIT_EXCEEDED',
                  action: 'show_quota_card',
                  quotaInfo: {
                    code: 'USAGE_LIMIT_EXCEEDED',
                    user: freshUser,
                    action: 'increase_usage_limit',
                    message: 'Spending limit reached. Increase to continue.'
                  }
                };
              }
              
              // User has usage-based enabled and budget remaining
              console.log('✅ Quota check passed (usage-based billing)');
              return { 
                allowed: true, 
                reason: 'USAGE_BASED_OK',
                method: 'firebase',
                user: freshUser
              };
            } else {
              // PRO user without usage-based billing
              return {
                allowed: false,
                reason: 'PRO_LIMIT_EXCEEDED',
                action: 'show_quota_card',
                quotaInfo: {
                  code: 'PRO_LIMIT_EXCEEDED',
                  user: freshUser,
                  action: 'enable_usage_based',
                  message: 'PRO plan limit reached. Enable pay-as-you-go to continue.',
                  options: [20, 50, 100]
                }
              };
            }
          }
        }
        
        console.log('✅ Quota check passed - user has remaining quota');
        return {
          allowed: true,
          reason: 'OK',
          method: 'firebase',
          user: freshUser
        };
        
      } catch (quotaError) {
        console.error('Error checking quota:', quotaError);
        return {
          allowed: true, // Allow by default if quota check fails
          reason: 'QUOTA_CHECK_ERROR',
          method: 'firebase',
          user
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
      
      case 'show_quota_card':
        console.log('💳 Affichage de l\'encadré de quota');
        // Dispatch event to content script to show quota card
        window.postMessage({
          type: 'SHOW_QUOTA_CARD',
          quotaInfo: checkResult.quotaInfo
        }, '*');
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
        <h2 style="margin-bottom: 10px; color: #f36c3d; font-size: 24px;">Authentication Required</h2>
        <p style="margin-bottom: 30px; color: #666; line-height: 1.4;">
                      Sign in with your Google account to access the n8n AI assistant
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
                      Sign in with Google
        </button>

        <div style="margin: 10px 0; font-weight:600; color:#a3a3a3;">ou</div>

        <input id="firebase-auth-email" type="email" placeholder="Email" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #ddd;border-radius:6px;font-size:14px;"/>
        <input id="firebase-auth-password" type="password" placeholder="Password" style="width:100%;padding:12px;margin-bottom:16px;border:1px solid #ddd;border-radius:6px;font-size:14px;"/>

        <button id="email-signin-btn" style="width:100%;padding:14px;background:#f36c3d;color:white;border:none;border-radius:8px;font-size:15px;cursor:pointer;margin-bottom:10px;">Sign in</button>
        <button id="email-signup-btn" style="width:100%;padding:14px;background:#6366f1;color:white;border:none;border-radius:8px;font-size:15px;cursor:pointer;">Create account</button>
        
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

    modal.querySelector('#email-signin-btn')?.addEventListener('click', () => {
      window.handleFirebaseEmailAuth('signin');
    });
    modal.querySelector('#email-signup-btn')?.addEventListener('click', () => {
      window.handleFirebaseEmailAuth('signup');
    });
    
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

    // FIREBASE AUTH OBLIGATOIRE - Pas de fallback legacy pour l'extension Chrome
    let authToken = null;
    let authMethod = 'FIREBASE';
    
    try {
      const currentUser = await chrome.runtime.sendMessage({ type: 'firebase-get-user' });
      if (!currentUser || currentUser.success === false) {
        throw new Error('No Firebase user available - authentication required');
      }
      
      // Get Firebase ID token (required)
      const tokenResponse = await chrome.runtime.sendMessage({ 
        type: 'firebase-get-token',
        data: { forceRefresh: false }
      });
      
      if (tokenResponse && typeof tokenResponse === 'string' && tokenResponse.length > 50) {
        authToken = tokenResponse;
        console.log('🔥 Using Firebase authentication token for content auth request');
      } else {
        throw new Error('Firebase token not available or invalid - authentication required');
      }
    } catch (firebaseError) {
      console.error('❌ Firebase auth failed for content request:', firebaseError.message);
      this.handleAccessDenied({
        allowed: false,
        reason: 'FIREBASE_AUTH_REQUIRED',
        action: 'show_auth_modal'
      });
      return null;
    }
    
    if (!authToken) {
      console.error('❌ No authentication token available - Extension requires Firebase Auth');
      this.handleAccessDenied({
        allowed: false,
        reason: 'FIREBASE_AUTH_REQUIRED',
        action: 'show_auth_modal'
      });
      return null;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-Auth-Method': authMethod // For debugging
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

  // Create Stripe checkout session
  async createStripeCheckout() {
    try {
      const token = await this.getFirebaseIdToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          success_url: window.location.href + '?upgrade=success',
          cancel_url: window.location.href + '?upgrade=cancelled'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }
      
      const { checkout_url } = await response.json();
      
      // Open Stripe checkout in new tab
      window.open(checkout_url, '_blank');
      
      // Show success message
      this.showSuccessMessage('Redirection vers Stripe en cours...');
      
    } catch (error) {
      console.error('Error creating Stripe checkout:', error);
      this.showErrorMessage('Erreur lors de la création de la session de paiement');
    }
  }

  // Show success message
  showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'auth-success-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #16a34a;
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
    }, 3000);
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