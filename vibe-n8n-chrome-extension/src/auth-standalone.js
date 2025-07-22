// Firebase Authentication Module for Chrome Extension - STANDALONE VERSION
// Compatible with Chrome Extension content scripts (no import/export)

class AuthService {
  constructor() {
    this.app = null;
    this.auth = null;
    this.currentUser = null;
    this.currentToken = null;
    this.initialized = false;
    this.authStateCallbacks = [];
    this.firebase = null;
    
    // Firebase Configuration from window.CONFIG or fallback
    this.FIREBASE_CONFIG = {
      apiKey: "AIzaSyDPB8tHayuvKuhimMQPbJBBLvukFLJIZ8I",
      authDomain: "vibe-n8n-7e40d.firebaseapp.com",
      projectId: "vibe-n8n-7e40d",
      storageBucket: "vibe-n8n-7e40d.firebasestorage.app",
      messagingSenderId: "247816285693",
      appId: "1:247816285693:web:1229eea4a52d6d765afd94",
      measurementId: "G-1CLFCN7KVL"
    };
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🔥 Initializing Firebase Auth (Standalone)...');
      
      // Method 1: Use Firebase from global scope (if available)
      if (typeof window !== 'undefined' && window.firebaseApp && window.firebaseAuth) {
        console.log('📦 Using Firebase from global scope');
        this.app = window.firebaseApp;
        this.auth = window.firebaseAuth;
        this.setupAuthStateListener();
        this.initialized = true;
        return;
      }

      // Method 2: Load Firebase via external script (CSP compatible)
      try {
        console.log('📦 Loading Firebase SDK via external script...');
        await this.loadFirebaseViaScript();
        
        if (window.firebaseApp && window.firebaseAuth) {
          this.app = window.firebaseApp;
          this.auth = window.firebaseAuth;
          this.setupAuthStateListener();
          this.initialized = true;
          console.log('✅ Firebase loaded via external script');
          return;
        }
      } catch (scriptError) {
        console.warn('❌ External Firebase loading failed:', scriptError);
      }

      // Method 3: Simulation mode
      console.log('🔄 Using Firebase simulation mode');
      this.initializeSimulationMode();

    } catch (error) {
      console.error('❌ Firebase Auth initialization failed:', error);
      this.initialized = false;
      throw error;
    }
  }

  // Load Firebase via external script (CSP compatible)
  async loadFirebaseViaScript() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.firebaseApp && window.firebaseAuth) {
        resolve();
        return;
      }

      // Create external script that will be loaded from extension
      const scriptUrl = chrome.runtime.getURL('firebase-inject.html');
      
      // Create invisible iframe to load Firebase
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = scriptUrl;
      
      iframe.onload = () => {
        // Try to get Firebase from iframe
        try {
          const iframeWindow = iframe.contentWindow;
          if (iframeWindow.firebaseApp && iframeWindow.firebaseAuth) {
            window.firebaseApp = iframeWindow.firebaseApp;
            window.firebaseAuth = iframeWindow.firebaseAuth;
            window._firebaseModules = iframeWindow._firebaseModules;
            
            console.log('✅ Firebase loaded from iframe');
            document.body.removeChild(iframe);
            resolve();
          } else {
            throw new Error('Firebase not available in iframe');
          }
        } catch (error) {
          document.body.removeChild(iframe);
          reject(error);
        }
      };
      
      iframe.onerror = () => {
        document.body.removeChild(iframe);
        reject(new Error('Failed to load Firebase iframe'));
      };
      
      document.body.appendChild(iframe);

      // Timeout fallback
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
        reject(new Error('Firebase loading timeout'));
      }, 10000);
    });
  }

  // Initialize simulation mode for development
  initializeSimulationMode() {
    console.log('🧪 Firebase simulation mode - for development/testing');
    
    this.auth = {
      currentUser: null,
      signInWithEmailAndPassword: async (email, password) => {
        console.log('🧪 Simulated sign in:', email);
        const user = { 
          uid: 'sim_' + Date.now(), 
          email, 
          getIdToken: async () => 'sim_token_' + Date.now() 
        };
        this.currentUser = user;
        this.currentToken = await user.getIdToken();
        this.authStateCallbacks.forEach(cb => cb(user, this.currentToken));
        return { user };
      },
      createUserWithEmailAndPassword: async (email, password) => {
        console.log('🧪 Simulated sign up:', email);
        return this.auth.signInWithEmailAndPassword(email, password);
      },
      signOut: async () => {
        console.log('🧪 Simulated sign out');
        this.currentUser = null;
        this.currentToken = null;
        this.authStateCallbacks.forEach(cb => cb(null, null));
      },
      onAuthStateChanged: (callback) => {
        console.log('🧪 Auth state listener registered');
        this.authStateCallbacks.push(callback);
      }
    };
    
    this.initialized = true;
  }

  // Setup auth state listener
  setupAuthStateListener() {
    if (!this.auth) return;

    try {
      if (this.auth.onAuthStateChanged) {
        this.auth.onAuthStateChanged(async (user) => {
          console.log('🔐 Auth state changed:', user ? `${user.email} (${user.uid})` : 'signed out');
          
          if (user) {
            this.currentUser = user;
            this.currentToken = await user.getIdToken();
            console.log('🎫 ID Token refreshed');
          } else {
            this.currentUser = null;
            this.currentToken = null;
          }

          this.authStateCallbacks.forEach(callback => {
            try {
              callback(user, this.currentToken);
            } catch (error) {
              console.error('Error in auth state callback:', error);
            }
          });
        });
      }
    } catch (error) {
      console.error('Error setting up auth state listener:', error);
    }
  }

  // Subscribe to auth state changes
  onAuthStateChanged(callback) {
    this.authStateCallbacks.push(callback);
    
    if (this.currentUser && this.currentToken) {
      callback(this.currentUser, this.currentToken);
    }
  }

  // Sign in with email/password
  async signInWithEmail(email, password) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }

    try {
      if (this.auth.signInWithEmailAndPassword) {
        const result = await this.auth.signInWithEmailAndPassword(email, password);
        console.log('✅ Sign in successful:', result.user?.email || email);
        return result.user;
      }
      throw new Error('signInWithEmailAndPassword not available');
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

    try {
      if (this.auth.createUserWithEmailAndPassword) {
        const result = await this.auth.createUserWithEmailAndPassword(email, password);
        console.log('✅ Sign up successful:', result.user?.email || email);
        return result.user;
      }
      throw new Error('createUserWithEmailAndPassword not available');
    } catch (error) {
      console.error('❌ Sign up failed:', error.message);
      throw this.handleAuthError(error);
    }
  }

  // Sign out
  async signOut() {
    if (!this.initialized || !this.auth) {
      throw new Error('Firebase not initialized');
    }

    try {
      await this.auth.signOut();
      console.log('✅ Sign out successful');
    } catch (error) {
      console.error('❌ Sign out failed:', error.message);
      throw error;
    }
  }

  // Get current ID token
  async getIdToken(forceRefresh = false) {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const token = await this.currentUser.getIdToken(forceRefresh);
      this.currentToken = token;
      return token;
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