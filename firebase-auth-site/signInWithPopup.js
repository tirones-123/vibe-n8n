// signInWithPopup.js - Version compatible web selon doc Firebase
// Utilisation des imports CDN au lieu d'ES6 modules

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

// Initialiser Firebase dès que le script se charge
document.addEventListener('DOMContentLoaded', function() {
    // Attendre que Firebase soit chargé
    if (typeof firebase !== 'undefined') {
        initializeFirebaseAuth();
    } else {
        // Attendre que Firebase soit disponible
        let attempts = 0;
        const waitForFirebase = setInterval(() => {
            attempts++;
            if (typeof firebase !== 'undefined') {
                clearInterval(waitForFirebase);
                initializeFirebaseAuth();
            } else if (attempts > 50) { // 5 secondes max
                clearInterval(waitForFirebase);
                console.error('❌ Firebase SDK not loaded');
            }
        }, 100);
    }
});

function initializeFirebaseAuth() {
    console.log('🔥 Initializing Firebase Auth with CDN approach...');
    
    try {
        // Initialize Firebase
        const app = firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();

        // This code runs inside of an iframe in the extension's offscreen document.
        // This gives you a reference to the parent frame, i.e. the offscreen document.
        // You will need this to assign the targetOrigin for postMessage.
        const PARENT_FRAME = document.location.ancestorOrigins[0];

        // This demo uses the Google auth provider, but any supported provider works.
        // Make sure that you enable any provider you want to use in the Firebase Console.
        const PROVIDER = new firebase.auth.GoogleAuthProvider();

        function sendResponse(result) {
            console.log('📤 Sending auth result to parent:', result);
            try {
                // Formatter le résultat selon la doc officielle
                let response;
                if (result.user) {
                    response = {
                        success: true,
                        user: {
                            uid: result.user.uid,
                            email: result.user.email,
                            displayName: result.user.displayName,
                            photoURL: result.user.photoURL
                        },
                        token: null // Will be set asynchronously
                    };
                    
                    // Get ID token asynchronously
                    result.user.getIdToken().then(token => {
                        response.token = token;
                        window.parent.postMessage(JSON.stringify(response), PARENT_FRAME);
                    }).catch(error => {
                        console.error('❌ Error getting ID token:', error);
                        window.parent.postMessage(JSON.stringify(response), PARENT_FRAME);
                    });
                } else if (result.code) {
                    // Error case
                    response = {
                        success: false,
                        error: {
                            code: result.code,
                            message: result.message
                        }
                    };
                    window.parent.postMessage(JSON.stringify(response), PARENT_FRAME);
                } else {
                    // Generic success case
                    response = { success: true };
                    window.parent.postMessage(JSON.stringify(response), PARENT_FRAME);
                }
            } catch (error) {
                console.error('❌ Error in sendResponse:', error);
                window.parent.postMessage(JSON.stringify({
                    success: false,
                    error: { code: 'auth/send-response-error', message: error.message }
                }), PARENT_FRAME);
            }
        }

        // Listen for messages from parent (offscreen document)
        window.addEventListener('message', function(event) {
            console.log('📨 Received message in iframe:', event.data);
            
            if (event.data && event.data.initAuth) {
                console.log('🚀 Starting Google sign-in popup...');
                // Opens the Google sign-in page in a popup, inside of an iframe in the
                // extension's offscreen document.
                // To centralize logic, all responses are forwarded to the parent frame,
                // which goes on to forward them to the extension's service worker.
                firebase.auth().signInWithPopup(PROVIDER)
                    .then(sendResponse)
                    .catch(sendResponse);
            }
        });

        console.log('✅ Firebase Auth iframe ready');
        
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
    }
} 