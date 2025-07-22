// Firebase Authentication Module for Chrome Extension - OFFSCREEN VERSION
// Utilise la méthode officielle Firebase avec Offscreen Documents
// Compatible avec Chrome Extension content scripts (no import/export)

class AuthService {
  constructor() {
    this.currentUser = null;
    this.currentToken = null;
    this.initialized = false;
    this.authStateCallbacks = [];
    this.simulationMode = false;
    
    // Listen for auth state changes from background script
    this.setupAuthStateListener();
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🔥 Initializing Firebase Auth (Offscreen)...');
      
      // Test if we can communicate with background script
      const testResponse = await this.sendMessageToBackground({
        type: 'test-firebase-available'
      });
      
      if (testResponse && testResponse.available) {
        console.log('✅ Firebase Auth via Offscreen available');
        this.simulationMode = false;
      } else {
        console.log('🔄 Firebase Offscreen not available, using simulation');
        this.initializeSimulationMode();
      }
      
      this.initialized = true;
      
    } catch (error) {
      console.warn('❌ Firebase Auth initialization failed, using simulation:', error);
      this.initializeSimulationMode();
      this.initialized = true;
    }
  }

  // Send message to background script
  async sendMessageToBackground(message) {
    return new Promise((resolve) => {
      if (!chrome.runtime?.sendMessage) {
        resolve(null);
        return;
      }
      
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('Background message error:', chrome.runtime.lastError.message);
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
  }

  // Setup auth state listener for background messages
  setupAuthStateListener() {
    if (!chrome.runtime?.onMessage) return;
    
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'firebase-auth-state-changed') {
        console.log('🔐 Auth state changed from background:', message.user?.email || 'signed out');
        
        this.currentUser = message.user;
        
        // Call all registered callbacks
        this.authStateCallbacks.forEach(callback => {
          try {
            callback(message.user, this.currentToken);
          } catch (error) {
            console.error('Error in auth state callback:', error);
          }
        });
      }
    });
  }

  // Initialize simulation mode for development
  initializeSimulationMode() {
    console.log('🧪 Firebase simulation mode - for development/testing');
    this.simulationMode = true;
    this.initialized = true;
  }

  // Subscribe to auth state changes
  onAuthStateChanged(callback) {
    this.authStateCallbacks.push(callback);
    
    // Call immediately if we have current user
    if (this.currentUser && this.currentToken) {
      try {
        callback(this.currentUser, this.currentToken);
      } catch (error) {
        console.error('Error in immediate auth callback:', error);
      }
    }
  }

  // Sign in with email/password
  async signInWithEmail(email, password) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }

    if (this.simulationMode) {
      return this.simulateSignIn(email, password);
    }

    try {
      const response = await this.sendMessageToBackground({
        type: 'firebase-signin-email',
        target: 'offscreen',
        data: { email, password }
      });
      
      if (response && response.success) {
        this.currentUser = response.user;
        this.currentToken = response.token;
        console.log('✅ Sign in successful:', response.user.email);
        return response.user;
      } else {
        throw new Error(response?.error?.message || 'Sign in failed');
      }
    } catch (error) {
      console.error('❌ Sign in failed:', error.message);
      throw this.handleAuthError(error);
    }
  }

  // Sign up with email/password
  async signUpWithEmail(email, password) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }

    if (this.simulationMode) {
      return this.simulateSignUp(email, password);
    }

    try {
      const response = await this.sendMessageToBackground({
        type: 'firebase-signup-email',
        target: 'offscreen',
        data: { email, password }
      });
      
      if (response && response.success) {
        this.currentUser = response.user;
        this.currentToken = response.token;
        console.log('✅ Sign up successful:', response.user.email);
        return response.user;
      } else {
        throw new Error(response?.error?.message || 'Sign up failed');
      }
    } catch (error) {
      console.error('❌ Sign up failed:', error.message);
      throw this.handleAuthError(error);
    }
  }

  // Sign in with Google
  async signInWithGoogle() {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }

    if (this.simulationMode) {
      return this.simulateSignIn('google@test.com', 'google_auth');
    }

    try {
      const response = await this.sendMessageToBackground({
        type: 'firebase-signin-google',
        target: 'offscreen'
      });
      
      if (response && response.success) {
        this.currentUser = response.user;
        this.currentToken = response.token;
        console.log('✅ Google sign in successful:', response.user.email);
        return response.user;
      } else {
        throw new Error(response?.error?.message || 'Google sign in failed');
      }
    } catch (error) {
      console.error('❌ Google sign in failed:', error.message);
      throw this.handleAuthError(error);
    }
  }

  // Sign out
  async signOut() {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }

    if (this.simulationMode) {
      this.currentUser = null;
      this.currentToken = null;
      this.authStateCallbacks.forEach(cb => cb(null, null));
      console.log('🧪 Simulated sign out');
      return;
    }

    try {
      const response = await this.sendMessageToBackground({
        type: 'firebase-signout',
        target: 'offscreen'
      });
      
      if (response && response.success) {
        this.currentUser = null;
        this.currentToken = null;
        console.log('✅ Sign out successful');
      } else {
        throw new Error('Sign out failed');
      }
    } catch (error) {
      console.error('❌ Sign out failed:', error.message);
      throw error;
    }
  }

  // Get current ID token
  async getIdToken(forceRefresh = false) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }

    if (this.simulationMode) {
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }
      return `sim_token_${Date.now()}`;
    }

    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await this.sendMessageToBackground({
        type: 'firebase-get-token',
        target: 'offscreen',
        data: { forceRefresh }
      });
      
      if (response && response.success && response.token) {
        this.currentToken = response.token;
        return response.token;
      } else {
        throw new Error('Failed to get token');
      }
    } catch (error) {
      console.error('❌ Failed to get ID token:', error);
      throw error;
    }
  }

  // Get current user info
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser;
  }

  // Simulation methods
  async simulateSignIn(email, password) {
    console.log('🧪 Simulated sign in:', email);
    const user = { 
      uid: 'sim_' + Date.now(), 
      email, 
      displayName: email.split('@')[0],
      photoURL: null
    };
    this.currentUser = user;
    this.currentToken = `sim_token_${Date.now()}`;
    
    // Trigger auth callbacks
    setTimeout(() => {
      this.authStateCallbacks.forEach(cb => cb(user, this.currentToken));
    }, 100);
    
    return user;
  }

  async simulateSignUp(email, password) {
    console.log('🧪 Simulated sign up:', email);
    return this.simulateSignIn(email, password);
  }

  // Handle auth errors with user-friendly messages
  handleAuthError(error) {
    const errorMessages = {
      'auth/user-not-found': 'Aucun compte trouvé avec cet email',
      'auth/wrong-password': 'Mot de passe incorrect',
      'auth/email-already-in-use': 'Un compte existe déjà avec cet email',
      'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères',
      'auth/invalid-email': 'Format d\'email invalide',
      'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard',
      'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion'
    };

    const friendlyMessage = errorMessages[error.code] || error.message;
    
    return {
      code: error.code,
      message: friendlyMessage,
      originalError: error
    };
  }

  // Make authenticated API request
  async makeAuthenticatedRequest(url, options = {}) {
    if (!this.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    try {
      const token = await this.getIdToken();
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      };

      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401) {
        console.log('🔄 Token expired, refreshing...');
        const newToken = await this.getIdToken(true);
        headers.Authorization = `Bearer ${newToken}`;
        return fetch(url, { ...options, headers });
      }

      return response;
    } catch (error) {
      console.error('❌ Authenticated request failed:', error);
      throw error;
    }
  }
}

// Create and export singleton instance - make it globally available
if (typeof window !== 'undefined') {
  window.AuthService = window.AuthService || new AuthService();
  window.authService = window.authService || window.AuthService;
}

// Also make it available for potential imports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.AuthService;
} 