// Firebase Authentication Module for Chrome Extension
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

// Import configuration from config.js
import CONFIG from './config.js';

// Firebase Configuration
const FIREBASE_CONFIG = CONFIG.FIREBASE_CONFIG;

class AuthService {
  constructor() {
    this.app = null;
    this.auth = null;
    this.currentUser = null;
    this.currentToken = null;
    this.initialized = false;
    this.authStateCallbacks = [];
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize Firebase
      this.app = initializeApp(FIREBASE_CONFIG);
      this.auth = getAuth(this.app);

      console.log('🔥 Firebase Auth initialized');

      // Listen to auth state changes
      onAuthStateChanged(this.auth, async (user) => {
        console.log('🔐 Auth state changed:', user ? `${user.email} (${user.uid})` : 'signed out');
        
        if (user) {
          this.currentUser = user;
          // Get fresh token
          this.currentToken = await user.getIdToken();
          console.log('🎫 ID Token refreshed');
        } else {
          this.currentUser = null;
          this.currentToken = null;
        }

        // Notify callbacks
        this.authStateCallbacks.forEach(callback => {
          try {
            callback(user, this.currentToken);
          } catch (error) {
            console.error('Error in auth state callback:', error);
          }
        });
      });

      this.initialized = true;
    } catch (error) {
      console.error('❌ Firebase Auth initialization failed:', error);
      throw error;
    }
  }

  // Subscribe to auth state changes
  onAuthStateChanged(callback) {
    this.authStateCallbacks.push(callback);
    
    // If already authenticated, call immediately
    if (this.currentUser && this.currentToken) {
      callback(this.currentUser, this.currentToken);
    }
  }

  // Sign in with email/password
  async signInWithEmail(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('✅ Sign in successful:', userCredential.user.email);
      return userCredential.user;
    } catch (error) {
      console.error('❌ Sign in failed:', error.message);
      throw this.handleAuthError(error);
    }
  }

  // Sign up with email/password
  async signUpWithEmail(email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      console.log('✅ Sign up successful:', userCredential.user.email);
      return userCredential.user;
    } catch (error) {
      console.error('❌ Sign up failed:', error.message);
      throw this.handleAuthError(error);
    }
  }

  // Sign in with Google
  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(this.auth, provider);
      console.log('✅ Google sign in successful:', userCredential.user.email);
      return userCredential.user;
    } catch (error) {
      console.error('❌ Google sign in failed:', error.message);
      throw this.handleAuthError(error);
    }
  }

  // Sign out
  async signOut() {
    try {
      await signOut(this.auth);
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
      'auth/popup-closed-by-user': 'Connexion annulée par l\'utilisateur',
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
        // Token expired, try to refresh
        console.log('🔄 Token expired, refreshing...');
        const newToken = await this.getIdToken(true);
        
        // Retry with new token
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

// Export singleton instance
export default new AuthService(); 