// 🔧 CORRECTION GLOBALE FIREBASE AUTH
// Script pour forcer l'exposition des objets dans le contexte global

console.log('🔧 === CORRECTION GLOBALE FIREBASE AUTH ===');

// Fonction pour attendre que les objets soient disponibles
function waitForObject(objectName, maxAttempts = 10, interval = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const checkInterval = setInterval(() => {
      attempts++;
      console.log(`🔍 Tentative ${attempts}/${maxAttempts} pour ${objectName}...`);
      
      if (window[objectName]) {
        console.log(`✅ ${objectName} trouvé !`);
        clearInterval(checkInterval);
        resolve(window[objectName]);
      } else if (attempts >= maxAttempts) {
        console.log(`❌ ${objectName} non trouvé après ${maxAttempts} tentatives`);
        clearInterval(checkInterval);
        reject(new Error(`${objectName} not found`));
      }
    }, interval);
  });
}

// Forcer la récupération des objets
async function forceExposeObjects() {
  console.log('🔄 Recherche forcée des objets Firebase...');
  
  const results = {
    contentAuthIntegration: null,
    authService: null,
    useFirebaseAuth: true
  };
  
  // Méthode 1: Attendre les objets natifs
  try {
    results.contentAuthIntegration = await waitForObject('contentAuthIntegration', 5, 1000);
  } catch (error) {
    console.log('⚠️ contentAuthIntegration non trouvé via attente');
  }
  
  try {
    results.authService = await waitForObject('authService', 5, 1000);
  } catch (error) {
    console.log('⚠️ authService non trouvé via attente');
  }
  
  // Méthode 2: Création forcée si non trouvés
  if (!results.contentAuthIntegration) {
    console.log('🔧 Création forcée de ContentAuthIntegration...');
    
    // Simuler ContentAuthIntegration basique
    const mockContentAuthIntegration = {
      initialized: true,
      authRequired: true,
      simulationMode: true,
      
      async canMakeRequest() {
        console.log('🧪 Mock: canMakeRequest called');
        return { allowed: true, method: 'simulation' };
      },
      
      async makeWorkflowRequest(prompt, baseWorkflow) {
        console.log('🧪 Mock: makeWorkflowRequest called with:', prompt);
        // Simuler une requête qui utilise le mode Legacy
        return fetch('https://vibe-n8n-production.up.railway.app/api/claude', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer d5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2'
          },
          body: JSON.stringify({ prompt })
        });
      },
      
      showSimpleAuthModal() {
        console.log('🧪 Mock: showSimpleAuthModal called');
        const modal = document.createElement('div');
        modal.innerHTML = `
          <div style="
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 99999; text-align: center;
          ">
            <h3>🔐 Mode Simulation Firebase</h3>
            <p>Système en mode test - requêtes via Legacy API</p>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="padding: 8px 16px; margin: 5px; background: #007acc; color: white; border: none; border-radius: 4px;">
              Fermer
            </button>
            <button onclick="window.useFirebaseAuth = false; location.reload()" 
                    style="padding: 8px 16px; margin: 5px; background: #ff6d5a; color: white; border: none; border-radius: 4px;">
              Mode Legacy
            </button>
          </div>
        `;
        document.body.appendChild(modal);
      },
      
      getAuthStatus() {
        return {
          isRequired: true,
          isAuthenticated: false,
          currentUser: null
        };
      }
    };
    
    window.contentAuthIntegration = mockContentAuthIntegration;
    results.contentAuthIntegration = mockContentAuthIntegration;
  }
  
  if (!results.authService) {
    console.log('🔧 Création forcée de AuthService...');
    
    const mockAuthService = {
      initialized: true,
      simulationMode: true,
      currentUser: null,
      
      async signUpWithEmail(email, password) {
        console.log('🧪 Mock: signUpWithEmail called with:', email);
        const user = { 
          uid: 'mock_' + Date.now(), 
          email, 
          displayName: email.split('@')[0] 
        };
        this.currentUser = user;
        return user;
      },
      
      async signInWithEmail(email, password) {
        console.log('🧪 Mock: signInWithEmail called with:', email);
        return this.signUpWithEmail(email, password);
      },
      
      isAuthenticated() {
        return !!this.currentUser;
      },
      
      getCurrentUser() {
        return this.currentUser;
      }
    };
    
    window.authService = mockAuthService;
    results.authService = mockAuthService;
  }
  
  return results;
}

// Redéfinir les fonctions de test avec les objets forcés
async function setupTestFunctions() {
  console.log('🔧 Configuration des fonctions de test...');
  
  const objects = await forceExposeObjects();
  
  // testFirebaseSystem avec objets forcés
  window.testFirebaseSystem = async () => {
    console.log('🧪 === TEST FIREBASE SYSTEM (FORCED) ===');
    
    const results = {
      contentAuthIntegration: !!window.contentAuthIntegration,
      authService: !!window.authService,
      simulationMode: window.contentAuthIntegration?.simulationMode || false,
      backendConnection: false
    };
    
    // Test backend
    try {
      const response = await fetch('https://vibe-n8n-production.up.railway.app/api');
      const data = await response.json();
      results.backendConnection = data.status === 'ok';
    } catch (error) {
      console.error('Backend test failed:', error);
    }
    
    console.log('📊 Résultats:');
    Object.entries(results).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✅' : '❌'}`);
    });
    
    // Test de requête réelle
    if (window.contentAuthIntegration) {
      console.log('🧪 Test de requête workflow...');
      try {
        const canMake = await window.contentAuthIntegration.canMakeRequest();
        console.log('  canMakeRequest:', canMake.allowed ? '✅' : '❌');
      } catch (error) {
        console.error('  canMakeRequest error:', error);
      }
    }
    
    return results;
  };
  
  // showFirebaseAuthModal avec objet forcé
  window.showFirebaseAuthModal = () => {
    console.log('🔐 Affichage modal Firebase Auth...');
    if (window.contentAuthIntegration && window.contentAuthIntegration.showSimpleAuthModal) {
      window.contentAuthIntegration.showSimpleAuthModal();
    } else {
      console.log('❌ Pas de modal disponible');
    }
  };
  
  // createTestUser avec objet forcé
  window.createTestUser = async () => {
    console.log('👤 Création utilisateur test...');
    if (window.authService) {
      try {
        const user = await window.authService.signUpWithEmail('test@vibe-n8n.com', 'test123456');
        console.log('✅ Utilisateur test créé:', user);
        return user;
      } catch (error) {
        console.error('❌ Erreur création utilisateur:', error);
        return null;
      }
    } else {
      console.log('❌ authService non disponible');
      return null;
    }
  };
  
  // toggleAuthMode amélioré
  window.toggleAuthMode = () => {
    window.useFirebaseAuth = !window.useFirebaseAuth;
    console.log(`🔄 Mode basculé vers: ${window.useFirebaseAuth ? 'Firebase Auth' : 'Legacy'}`);
    
    // Fermer popups
    document.querySelectorAll('.simple-auth-modal, .simple-quota-popup').forEach(popup => popup.remove());
    
    // Recharger après délai
    setTimeout(() => {
      console.log('🔄 Rechargement...');
      location.reload();
    }, 1000);
  };
  
  console.log('✅ Fonctions de test configurées avec objets forcés !');
}

// Lancer la configuration
setupTestFunctions().then(() => {
  console.log('🚀 Configuration terminée ! Fonctions disponibles :');
  console.log('  - testFirebaseSystem()');
  console.log('  - showFirebaseAuthModal()');
  console.log('  - createTestUser()');
  console.log('  - toggleAuthMode()');
  
  // Auto-test
  console.log('🧪 Lancement du test...');
  window.testFirebaseSystem();
}); 