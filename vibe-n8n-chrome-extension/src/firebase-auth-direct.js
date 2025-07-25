/**
 * Firebase Auth Direct - Selon la documentation officielle
 * Utilise firebase/auth/web-extension pour les méthodes simples
 * https://firebase.google.com/docs/auth/web/chrome-extension
 */

// ⚠️ NOTE: Ceci nécessite l'installation du SDK Firebase dans l'extension
// npm install firebase (version 10.8.0+)

// == Logging control ==
var DEBUG_LOGS_ENABLED = typeof DEBUG_LOGS_ENABLED !== 'undefined' ? DEBUG_LOGS_ENABLED : false;
if (typeof self.__n8nAIFALogsPatched === 'undefined') {
  self.__n8nAIFALogsPatched = true;
  const __faOriginalLog = console.log.bind(console);
  console.log = (...args) => {
    if (DEBUG_LOGS_ENABLED) {
      __faOriginalLog('[n8n-AI]', ...args);
    }
  };
}

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDPB8tHayuvKuhimMQPbJBBLvukFLJIZ8I",
    authDomain: "vibe-n8n-7e40d.firebaseapp.com",
    projectId: "vibe-n8n-7e40d",
    storageBucket: "vibe-n8n-7e40d.firebasestorage.app",
    messagingSenderId: "247816285693",
    appId: "1:247816285693:web:1229eea4a52d6d765afd94",
    measurementId: "G-1CLFCN7KVL"
};

class FirebaseAuthDirect {
    constructor() {
        this.auth = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Import dynamique pour éviter les erreurs si Firebase n'est pas disponible
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
            const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } = 
                await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');

            console.log('🔥 Initializing Firebase Auth Direct (web-extension approach)');
            
            const app = initializeApp(firebaseConfig);
            this.auth = getAuth(app);
            
            this.initialized = true;
            console.log('✅ Firebase Auth Direct initialized');

            // Listen for auth state changes
            onAuthStateChanged(this.auth, (user) => {
                console.log('🔐 Auth state changed:', user ? user.email : 'signed out');
                this.notifyAuthStateChange(user);
            });

        } catch (error) {
            console.error('❌ Firebase Auth Direct initialization failed:', error);
            throw error;
        }
    }

    async signInWithEmail(email, password) {
        if (!this.initialized) await this.initialize();

        try {
            console.log('🔐 Direct sign in with email:', email);
            
            const { signInWithEmailAndPassword } = 
                await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
            
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;
            
            console.log('✅ Direct sign in successful:', user.email);
            
            return {
                success: true,
                user: {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL
                },
                token: await user.getIdToken()
            };
        } catch (error) {
            console.error('❌ Direct sign in failed:', error);
            return {
                success: false,
                error: {
                    code: error.code,
                    message: error.message
                }
            };
        }
    }

    async signUpWithEmail(email, password) {
        if (!this.initialized) await this.initialize();

        try {
            console.log('📝 Direct sign up with email:', email);
            
            const { createUserWithEmailAndPassword } = 
                await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
            
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;
            
            console.log('✅ Direct sign up successful:', user.email);
            
            return {
                success: true,
                user: {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL
                },
                token: await user.getIdToken()
            };
        } catch (error) {
            console.error('❌ Direct sign up failed:', error);
            return {
                success: false,
                error: {
                    code: error.code,
                    message: error.message
                }
            };
        }
    }

    async signOut() {
        if (!this.initialized) await this.initialize();

        try {
            console.log('🚪 Direct sign out');
            
            const { signOut } = 
                await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
            
            await signOut(this.auth);
            console.log('✅ Direct sign out successful');
            
            return { success: true };
        } catch (error) {
            console.error('❌ Direct sign out failed:', error);
            return {
                success: false,
                error: {
                    code: error.code,
                    message: error.message
                }
            };
        }
    }

    async getCurrentUser() {
        if (!this.initialized) await this.initialize();

        const user = this.auth.currentUser;
        return {
            success: true,
            user: user ? {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL
            } : null
        };
    }

    async getIdToken(forceRefresh = false) {
        if (!this.initialized) await this.initialize();

        try {
            const user = this.auth.currentUser;
            if (!user) {
                throw new Error('No current user');
            }

            const token = await user.getIdToken(forceRefresh);
            return { success: true, token };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: error.code || 'auth/no-current-user',
                    message: error.message
                }
            };
        }
    }

    notifyAuthStateChange(user) {
        // Notifier le background script des changements d'état
        try {
            chrome.runtime.sendMessage({
                type: 'firebase-auth-state-changed-direct',
                user: user ? {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL
                } : null
            }).catch(() => {
                // Ignore if background script is not available
            });
        } catch (error) {
            // Ignore messaging errors
        }
    }
}

// Export global instance
if (typeof window !== 'undefined') {
    window.firebaseAuthDirect = new FirebaseAuthDirect();
}

// For module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseAuthDirect;
} 