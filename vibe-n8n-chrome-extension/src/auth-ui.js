// Authentication UI Components for Chrome Extension
import authService from './auth.js';

class AuthUI {
  constructor() {
    this.isShowingAuthModal = false;
    this.currentUser = null;
    this.userInfo = null;
  }

  // Initialize auth UI
  async initialize() {
    try {
      await authService.initialize();
      
      // Listen to auth state changes
      authService.onAuthStateChanged((user, token) => {
        this.currentUser = user;
        this.updateUIForAuthState();
        
        if (user) {
          this.fetchUserInfo();
        }
      });

      console.log('🎨 Auth UI initialized');
    } catch (error) {
      console.error('❌ Auth UI initialization failed:', error);
    }
  }

  // Update UI based on authentication state
  updateUIForAuthState() {
    const isAuthenticated = !!this.currentUser;
    
    // Update chat panel header
    this.updateChatHeader(isAuthenticated);
    
    // Update settings panel
    this.updateSettingsPanel(isAuthenticated);
    
    // Show/hide auth modal if needed
    if (!isAuthenticated && !this.isShowingAuthModal) {
      this.showAuthModal();
    } else if (isAuthenticated && this.isShowingAuthModal) {
      this.hideAuthModal();
    }
  }

  // Create authentication modal
  createAuthModal() {
    const modal = document.createElement('div');
    modal.id = 'vibe-auth-modal';
    modal.className = 'vibe-auth-modal';
    
    modal.innerHTML = `
      <div class="auth-modal-backdrop">
        <div class="auth-modal-content">
          <div class="auth-modal-header">
            <h2>🤖 Vibe n8n AI Assistant</h2>
            <p>Connectez-vous pour générer des workflows IA</p>
          </div>
          
          <div class="auth-tabs">
            <button class="auth-tab active" data-tab="signin">Connexion</button>
            <button class="auth-tab" data-tab="signup">Inscription</button>
          </div>
          
          <!-- Sign In Form -->
          <form id="signin-form" class="auth-form active">
            <div class="form-group">
              <label for="signin-email">Email</label>
              <input type="email" id="signin-email" placeholder="votre@email.com" required>
            </div>
            <div class="form-group">
              <label for="signin-password">Mot de passe</label>
              <input type="password" id="signin-password" placeholder="••••••••" required>
            </div>
            <button type="submit" class="auth-btn primary">Se connecter</button>
            <div class="auth-divider">ou</div>
            <button type="button" id="google-signin" class="auth-btn google">
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 16c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 16z"/>
                <path fill="#FBBC05" d="M4.5 9.52a4.8 4.8 0 0 1 0-3.04V4.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                <path fill="#EA4335" d="M8.98 3.58c1.21 0 2.3.42 3.16 1.24l2.36-2.36A8 8 0 0 0 1.83 4.41L4.5 6.48a4.77 4.77 0 0 1 4.48-2.9z"/>
              </svg>
              Continuer avec Google
            </button>
          </form>
          
          <!-- Sign Up Form -->
          <form id="signup-form" class="auth-form">
            <div class="form-group">
              <label for="signup-email">Email</label>
              <input type="email" id="signup-email" placeholder="votre@email.com" required>
            </div>
            <div class="form-group">
              <label for="signup-password">Mot de passe</label>
              <input type="password" id="signup-password" placeholder="••••••••" required>
            </div>
            <div class="form-group">
              <label for="signup-confirm">Confirmer mot de passe</label>
              <input type="password" id="signup-confirm" placeholder="••••••••" required>
            </div>
            <button type="submit" class="auth-btn primary">Créer un compte</button>
            <div class="auth-divider">ou</div>
            <button type="button" id="google-signup" class="auth-btn google">
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 16c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 16z"/>
                <path fill="#FBBC05" d="M4.5 9.52a4.8 4.8 0 0 1 0-3.04V4.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                <path fill="#EA4335" d="M8.98 3.58c1.21 0 2.3.42 3.16 1.24l2.36-2.36A8 8 0 0 0 1.83 4.41L4.5 6.48a4.77 4.77 0 0 1 4.48-2.9z"/>
              </svg>
              S'inscrire avec Google
            </button>
          </form>
          
          <div class="auth-footer">
            <p class="auth-terms">
              En vous connectant, vous acceptez nos 
              <a href="#" target="_blank">conditions d'utilisation</a> 
              et notre <a href="#" target="_blank">politique de confidentialité</a>.
            </p>
          </div>
          
          <div id="auth-error" class="auth-error hidden"></div>
          <div id="auth-loading" class="auth-loading hidden">
            <div class="spinner"></div>
            <span>Connexion en cours...</span>
          </div>
        </div>
      </div>
    `;
    
    return modal;
  }

  // Show authentication modal
  showAuthModal() {
    if (this.isShowingAuthModal) return;
    
    const existingModal = document.getElementById('vibe-auth-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = this.createAuthModal();
    document.body.appendChild(modal);
    
    // Add event listeners
    this.attachAuthModalListeners(modal);
    
    this.isShowingAuthModal = true;
    
    // Animation
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
  }

  // Hide authentication modal
  hideAuthModal() {
    const modal = document.getElementById('vibe-auth-modal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.remove();
        this.isShowingAuthModal = false;
      }, 300);
    }
  }

  // Attach event listeners to auth modal
  attachAuthModalListeners(modal) {
    // Tab switching
    const tabs = modal.querySelectorAll('.auth-tab');
    const forms = modal.querySelectorAll('.auth-form');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update active form
        forms.forEach(f => f.classList.remove('active'));
        modal.querySelector(`#${tabName}-form`).classList.add('active');
      });
    });

    // Sign in form
    const signinForm = modal.querySelector('#signin-form');
    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSignIn(modal);
    });

    // Sign up form
    const signupForm = modal.querySelector('#signup-form');
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSignUp(modal);
    });

    // Google sign in
    modal.querySelector('#google-signin').addEventListener('click', async () => {
      await this.handleGoogleSignIn(modal);
    });

    modal.querySelector('#google-signup').addEventListener('click', async () => {
      await this.handleGoogleSignIn(modal);
    });
  }

  // Handle sign in
  async handleSignIn(modal) {
    const email = modal.querySelector('#signin-email').value;
    const password = modal.querySelector('#signin-password').value;
    
    if (!email || !password) {
      this.showAuthError(modal, 'Veuillez remplir tous les champs');
      return;
    }

    this.showAuthLoading(modal, true);
    this.hideAuthError(modal);

    try {
      await authService.signInWithEmail(email, password);
      console.log('✅ User signed in successfully');
    } catch (error) {
      this.showAuthError(modal, error.message);
    } finally {
      this.showAuthLoading(modal, false);
    }
  }

  // Handle sign up
  async handleSignUp(modal) {
    const email = modal.querySelector('#signup-email').value;
    const password = modal.querySelector('#signup-password').value;
    const confirmPassword = modal.querySelector('#signup-confirm').value;
    
    if (!email || !password || !confirmPassword) {
      this.showAuthError(modal, 'Veuillez remplir tous les champs');
      return;
    }

    if (password !== confirmPassword) {
      this.showAuthError(modal, 'Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      this.showAuthError(modal, 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    this.showAuthLoading(modal, true);
    this.hideAuthError(modal);

    try {
      await authService.signUpWithEmail(email, password);
      console.log('✅ User signed up successfully');
    } catch (error) {
      this.showAuthError(modal, error.message);
    } finally {
      this.showAuthLoading(modal, false);
    }
  }

  // Handle Google sign in
  async handleGoogleSignIn(modal) {
    this.showAuthLoading(modal, true);
    this.hideAuthError(modal);

    try {
      await authService.signInWithGoogle();
      console.log('✅ User signed in with Google');
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        this.showAuthError(modal, error.message);
      }
    } finally {
      this.showAuthLoading(modal, false);
    }
  }

  // Show/hide auth error
  showAuthError(modal, message) {
    const errorDiv = modal.querySelector('#auth-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
  }

  hideAuthError(modal) {
    const errorDiv = modal.querySelector('#auth-error');
    errorDiv.classList.add('hidden');
  }

  // Show/hide loading state
  showAuthLoading(modal, show) {
    const loadingDiv = modal.querySelector('#auth-loading');
    const forms = modal.querySelectorAll('.auth-form');
    
    if (show) {
      loadingDiv.classList.remove('hidden');
      forms.forEach(form => form.style.opacity = '0.5');
    } else {
      loadingDiv.classList.add('hidden');
      forms.forEach(form => form.style.opacity = '1');
    }
  }

  // Fetch user info from backend
  async fetchUserInfo() {
    try {
      const response = await authService.makeAuthenticatedRequest(
        `${CONFIG.API_URL}/api/me`
      );
      
      if (response.ok) {
        this.userInfo = await response.json();
        console.log('👤 User info loaded:', this.userInfo.user.plan);
        this.updateUserDisplay();
      }
    } catch (error) {
      console.error('❌ Failed to fetch user info:', error);
    }
  }

  // Update chat header with user info
  updateChatHeader(isAuthenticated) {
    const chatHeader = document.querySelector('.vibe-chat-header');
    if (!chatHeader) return;

    const userSection = chatHeader.querySelector('.user-section') || document.createElement('div');
    userSection.className = 'user-section';

    if (isAuthenticated && this.currentUser) {
      userSection.innerHTML = `
        <div class="user-avatar">
          ${this.currentUser.photoURL ? 
            `<img src="${this.currentUser.photoURL}" alt="Avatar">` : 
            `<div class="avatar-initials">${this.currentUser.email[0].toUpperCase()}</div>`
          }
        </div>
        <div class="user-info">
          <div class="user-email">${this.currentUser.email}</div>
          <div class="user-plan">${this.userInfo?.user?.plan || 'FREE'}</div>
        </div>
        <button class="sign-out-btn" title="Se déconnecter">⚙️</button>
      `;

      // Add sign out listener
      userSection.querySelector('.sign-out-btn').addEventListener('click', () => {
        this.handleSignOut();
      });
    } else {
      userSection.innerHTML = `
        <button class="sign-in-btn">Se connecter</button>
      `;

      userSection.querySelector('.sign-in-btn').addEventListener('click', () => {
        this.showAuthModal();
      });
    }

    if (!chatHeader.contains(userSection)) {
      chatHeader.appendChild(userSection);
    }
  }

  // Update user display with quota info
  updateUserDisplay() {
    if (!this.userInfo) return;

    const quota = this.userInfo.quota;
    const user = this.userInfo.user;

    // Update quota display
    const quotaSection = document.querySelector('.quota-section') || document.createElement('div');
    quotaSection.className = 'quota-section';
    
    const remainingTokens = quota.remaining_tokens?.toLocaleString() || '0';
    const maxTokens = quota.max_tokens?.toLocaleString() || '0';
    const usagePercentage = quota.usage_percentage || 0;

    quotaSection.innerHTML = `
      <div class="quota-info">
        <div class="quota-bar">
          <div class="quota-fill" style="width: ${usagePercentage}%"></div>
        </div>
        <div class="quota-text">
          ${remainingTokens} / ${maxTokens} tokens restants
        </div>
        ${user.plan === 'PRO' && user.usage_based_enabled ? 
          `<div class="usage-based-info">
            Usage-based: ${user.this_month_usage_usd?.toFixed(2) || '0.00'}$ / ${user.usage_limit_usd || '0'}$
          </div>` : ''
        }
      </div>
    `;

    const chatPanel = document.querySelector('.vibe-chat-panel');
    if (chatPanel && !chatPanel.contains(quotaSection)) {
      chatPanel.querySelector('.vibe-chat-header').appendChild(quotaSection);
    }
  }

  // Handle sign out
  async handleSignOut() {
    try {
      await authService.signOut();
      this.userInfo = null;
      console.log('✅ User signed out');
    } catch (error) {
      console.error('❌ Sign out failed:', error);
    }
  }

  // Update settings panel with pricing options
  updateSettingsPanel(isAuthenticated) {
    // This will be implemented when user needs pricing options
    // Show upgrade buttons, usage-based options, etc.
  }

  // Create quota exceeded popup
  createQuotaExceededPopup(quotaData) {
    const popup = document.createElement('div');
    popup.className = 'vibe-quota-popup';
    
    if (quotaData.code === 'FREE_LIMIT_EXCEEDED') {
      popup.innerHTML = `
        <div class="quota-popup-content">
          <h3>🚀 Limite gratuite atteinte</h3>
          <p>Tu as atteint la limite gratuite. Passe au plan Pro pour continuer.</p>
          <div class="quota-popup-actions">
            <button class="quota-btn primary" id="upgrade-to-pro">
              Go Pro - 20$/mois
            </button>
            <button class="quota-btn secondary" id="close-quota-popup">
              Plus tard
            </button>
          </div>
        </div>
      `;

      popup.querySelector('#upgrade-to-pro').addEventListener('click', () => {
        this.handleUpgradeToPro();
      });
    } else if (quotaData.code === 'PRO_LIMIT_EXCEEDED') {
      popup.innerHTML = `
        <div class="quota-popup-content">
          <h3>💳 Quota Pro atteint</h3>
          <p>Activer Usage-Based Spending ?</p>
          <div class="usage-options">
            <button class="usage-btn" data-limit="20">20$</button>
            <button class="usage-btn" data-limit="50">50$</button>
            <button class="usage-btn" data-limit="100">100$</button>
          </div>
          <div class="quota-popup-actions">
            <button class="quota-btn secondary" id="close-quota-popup">
              Plus tard
            </button>
          </div>
        </div>
      `;

      popup.querySelectorAll('.usage-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const limit = parseInt(btn.dataset.limit);
          this.handleEnableUsageBased(limit);
        });
      });
    }

    popup.querySelector('#close-quota-popup').addEventListener('click', () => {
      popup.remove();
    });

    return popup;
  }

  // Handle upgrade to pro
  async handleUpgradeToPro() {
    try {
      const response = await authService.makeAuthenticatedRequest(
        `${CONFIG.API_URL}/api/create-checkout-session`,
        {
          method: 'POST',
          body: JSON.stringify({
            success_url: window.location.href,
            cancel_url: window.location.href
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        window.open(data.checkout_url, '_blank');
      }
    } catch (error) {
      console.error('❌ Failed to create checkout session:', error);
    }
  }

  // Handle enable usage-based billing
  async handleEnableUsageBased(limitUsd) {
    try {
      const response = await authService.makeAuthenticatedRequest(
        `${CONFIG.API_URL}/api/enable-usage-based`,
        {
          method: 'POST',
          body: JSON.stringify({ limit_usd: limitUsd })
        }
      );

      if (response.ok) {
        console.log(`✅ Usage-based billing enabled: $${limitUsd}`);
        await this.fetchUserInfo(); // Refresh user info
      }
    } catch (error) {
      console.error('❌ Failed to enable usage-based billing:', error);
    }
  }
}

// Export singleton instance
export default new AuthUI(); 