/**
 * Script pour la popup
 */

// == Logging control ==
var DEBUG_LOGS_ENABLED = typeof DEBUG_LOGS_ENABLED !== 'undefined' ? DEBUG_LOGS_ENABLED : false;
if (typeof window.__n8nAIPopupLogsPatched === 'undefined') {
  window.__n8nAIPopupLogsPatched = true;
  const __popupOriginalLog = console.log.bind(console);
  console.log = (...args) => {
    if (DEBUG_LOGS_ENABLED) {
      __popupOriginalLog('[n8n-AI]', ...args);
    }
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  const openN8nButton = document.getElementById('open-n8n');
  const activateButton = document.getElementById('activate-here');
  const customDomainSection = document.getElementById('custom-domain-section');
  const currentDomainSpan = document.getElementById('current-domain');
  const userSection = document.getElementById('userSection');
  const userEmail = document.getElementById('userEmail');
  const signOutBtn = document.getElementById('signOutBtn');
  const signInSection = document.getElementById('signInSection');
  const googleTab = document.getElementById('googleTab');
  const emailTab = document.getElementById('emailTab');
  const signupTab = document.getElementById('signupTab');
  const googleSignIn = document.getElementById('googleSignIn');
  const emailSignIn = document.getElementById('emailSignIn');
  const emailSignUp = document.getElementById('emailSignUp');
  const signInGoogleBtn = document.getElementById('signInGoogleBtn');
  const signInEmailBtn = document.getElementById('signInEmailBtn');
  const signUpEmailBtn = document.getElementById('signUpEmailBtn');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const signupEmailInput = document.getElementById('signupEmailInput');
  const signupPasswordInput = document.getElementById('signupPasswordInput');
  const confirmPasswordInput = document.getElementById('confirmPasswordInput');
  const switchToSignup = document.getElementById('switchToSignup');
  const switchToSignin = document.getElementById('switchToSignin');
  
  // Vérifier l'état d'authentification
  await checkAuthStatus();
  
  // Handler pour la déconnexion
  if (signOutBtn) {
    signOutBtn.addEventListener('click', handleSignOut);
  }
  
  // Handlers pour les onglets de connexion
  if (googleTab) {
    googleTab.addEventListener('click', () => switchTab('google'));
  }
  if (emailTab) {
    emailTab.addEventListener('click', () => switchTab('email'));
  }
  if (signupTab) {
    signupTab.addEventListener('click', () => switchTab('signup'));
  }
  
  // Handlers pour les boutons de connexion
  if (signInGoogleBtn) {
    signInGoogleBtn.addEventListener('click', handleSignInGoogle);
  }
  if (signInEmailBtn) {
    signInEmailBtn.addEventListener('click', handleSignInEmail);
  }
  if (signUpEmailBtn) {
    signUpEmailBtn.addEventListener('click', handleSignUpEmail);
  }
  
  // Handlers pour les liens de switch
  if (switchToSignup) {
    switchToSignup.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('signup');
    });
  }
  if (switchToSignin) {
    switchToSignin.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('email');
    });
  }
  
  // Handler pour Enter key dans les champs email/password
  if (emailInput) {
    emailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') passwordInput?.focus();
    });
  }
  if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSignInEmail();
    });
  }
  
  // Handler pour Enter key dans les champs de création de compte
  if (signupEmailInput) {
    signupEmailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') signupPasswordInput?.focus();
    });
  }
  if (signupPasswordInput) {
    signupPasswordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') confirmPasswordInput?.focus();
    });
  }
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSignUpEmail();
    });
  }
  
  // Obtenir l'onglet actuel
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Vérifier si on est sur une page qui pourrait être n8n
  if (currentTab && currentTab.url) {
    const url = new URL(currentTab.url);
    const hostname = url.hostname;
    
    console.log('🔍 Popup: Analysing current tab:', hostname, url.pathname);
    
    // Vérifier si c'est potentiellement n8n
    const couldBeN8n = hostname.includes('n8n') || 
                       url.pathname.includes('workflow') ||
                       url.pathname.includes('execution') ||
                       url.pathname.includes('editor');
    
    // Vérifier si c'est déjà supporté nativement
    const isSupported = hostname.includes('n8n.io') || 
                        hostname.includes('n8n.cloud');
    
    console.log('🔍 Popup: Detection results:', { couldBeN8n, isSupported });
    
    if (couldBeN8n && !isSupported) {
      // Montrer l'option d'activation manuelle
      console.log('✅ Popup: Showing manual activation option');
      customDomainSection.style.display = 'block';
      activateButton.style.display = 'block';
      currentDomainSpan.textContent = hostname;
      
      activateButton.addEventListener('click', async () => {
        try {
          console.log('🚀 Popup: Manual activation started for', hostname);
          
          // FIRST: Sauvegarder ce domaine pour la prochaine fois
          console.log('💾 Popup: Starting domain save process for:', hostname);
          try {
            const { customDomains = [] } = await chrome.storage.sync.get(['customDomains']);
            console.log('💾 Popup: Current saved domains:', customDomains);
            
            if (!customDomains.includes(hostname)) {
              customDomains.push(hostname);
              await chrome.storage.sync.set({ customDomains });
              console.log('✅ Popup: Domain successfully saved:', hostname);
              console.log('✅ Popup: Updated domains list:', customDomains);
              
              // Verify the save worked
              const verification = await chrome.storage.sync.get(['customDomains']);
              console.log('🔍 Popup: Verification - domains after save:', verification.customDomains);
            } else {
              console.log('ℹ️ Popup: Domain already in saved list:', hostname);
            }
          } catch (saveError) {
            console.error('❌ Popup: Failed to save domain:', saveError);
          }
          
          // THEN: Marquer cette page comme activation manuelle
          await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: () => {
              window.n8nAIManualActivation = true;
              window.n8nAIAutoActivation = true; // Also set this for immediate detection
              console.log('🎯 Manual activation flags set:', {
                manual: window.n8nAIManualActivation,
                auto: window.n8nAIAutoActivation
              });
            }
          });
          
          // FINALLY: Injecter le content script manuellement
          await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            files: ['src/content.js']
          });
          
          // Et les styles
          await chrome.scripting.insertCSS({
            target: { tabId: currentTab.id },
            files: ['styles/panel.css']
          });
          
          // Feedback visuel
          activateButton.textContent = '✅ Activé !';
          activateButton.disabled = true;
          activateButton.style.backgroundColor = '#22c55e';
          
          setTimeout(() => window.close(), 1500);
          
        } catch (error) {
          console.error('❌ Popup: Activation error:', error);
          activateButton.textContent = '❌ Erreur';
          activateButton.style.backgroundColor = '#ef4444';
        }
      });
    }
  }

  // Ouvrir n8n
  openN8nButton.addEventListener('click', async () => {
    // Chercher un onglet n8n existant
    const tabs = await chrome.tabs.query({});
    const n8nTab = tabs.find(tab => 
      tab.url?.includes('n8n')
    );

    if (n8nTab) {
      // Activer l'onglet existant
      chrome.tabs.update(n8nTab.id, { active: true });
      chrome.windows.update(n8nTab.windowId, { focused: true });
    } else {
      // Ouvrir un nouvel onglet
      chrome.tabs.create({ url: 'https://app.n8n.io' });
    }

    // Fermer la popup
    window.close();
  });
});

/**
 * Vérifier l'état d'authentification de l'utilisateur
 */
async function checkAuthStatus() {
  try {
    console.log('🔍 Popup: Checking user auth status...');
    
    // D'abord tenter de récupérer directement l'utilisateur Firebase via le background
    let firebaseUser = null;
    try {
      const response = await chrome.runtime.sendMessage({ type: 'firebase-get-user' });
      if (response && (response.user || (response.uid && response.email))) {
        // Peut être format { success, user } ou user direct
        firebaseUser = response.user || response;
      }
    } catch (e) {
      console.log('⚠️ Popup: firebase-get-user failed', e);
    }
    
    if (firebaseUser) {
      console.log('✅ Popup: Firebase user detected:', firebaseUser.email || firebaseUser.uid);
      displayUserInfo(firebaseUser.email || 'Utilisateur connecté', 'Firebase');
      return;
    }
    
    // Sinon fallback à l'ancien stockage local
    const stored = await chrome.storage.local.get(['authState']);
    
    if (stored.authState && stored.authState.authenticated) {
      console.log('✅ Popup: User is authenticated (storage):', stored.authState.method);
      // Essayer de récupérer l'email depuis chrome.identity ou storage
      try {
        const userInfo = await getUserInfo();
        displayUserInfo(userInfo.email || 'Utilisateur connecté', stored.authState.method);
      } catch (error) {
        console.log('⚠️ Popup: Could not get user email, using stored info');
        displayUserInfo('Utilisateur connecté', stored.authState.method);
      }
    } else {
      console.log('ℹ️ Popup: No authenticated user found');
      hideUserInfo();
    }
  } catch (error) {
    console.error('❌ Popup: Error checking auth status:', error);
    hideUserInfo();
  }
}

/**
 * Récupérer les informations utilisateur via Google API
 */
async function getUserInfo() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error('No token available'));
        return;
      }
      
      // Utiliser le token pour récupérer les infos utilisateur
      fetch('https://www.googleapis.com/oauth2/v1/userinfo?access_token=' + token)
        .then(response => response.json())
        .then(userInfo => resolve(userInfo))
        .catch(reject);
    });
  });
}

/**
 * Afficher les informations utilisateur
 */
function displayUserInfo(email, method) {
  const userSection = document.getElementById('userSection');
  const userEmail = document.getElementById('userEmail');
  const authMethod = document.getElementById('authMethod');
  
  userEmail.textContent = email;
  authMethod.textContent = method === 'chrome-identity' ? 'Chrome Identity' : method;
  userSection.style.display = 'block';
  
  // Cacher la section sign-in et montrer sign-out
  document.getElementById('signInSection').style.display = 'none';
  document.getElementById('signOutBtn').style.display = 'inline-block';
  console.log('👤 Popup: User info displayed:', { email, method });
}

/**
 * Masquer les informations utilisateur
 */
function hideUserInfo() {
  const userSection = document.getElementById('userSection');
  userSection.style.display = 'none';
  // Montrer la section sign-in quand non authentifié
  document.getElementById('signInSection').style.display = 'block';
  document.getElementById('signOutBtn').style.display = 'none';
}

/**
 * Basculer entre les onglets de connexion
 */
function switchTab(tabType) {
  // Gérer les onglets
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.sign-in-option').forEach(option => option.classList.remove('active'));
  
  if (tabType === 'google') {
    document.getElementById('googleTab').classList.add('active');
    document.getElementById('googleSignIn').classList.add('active');
  } else if (tabType === 'email') {
    document.getElementById('emailTab').classList.add('active');
    document.getElementById('emailSignIn').classList.add('active');
    // Focus sur le champ email
    setTimeout(() => {
      document.getElementById('emailInput')?.focus();
    }, 100);
  } else if (tabType === 'signup') {
    document.getElementById('signupTab').classList.add('active');
    document.getElementById('emailSignUp').classList.add('active');
    // Focus sur le champ email de création de compte
    setTimeout(() => {
      document.getElementById('signupEmailInput')?.focus();
    }, 100);
  }
}

/**
 * Gérer la connexion Google (Firebase)
 */
async function handleSignInGoogle() {
  try {
    console.log('🔐 Popup: Google sign-in requested');
    const signInBtn = document.getElementById('signInGoogleBtn');
    const originalText = signInBtn.textContent;
    signInBtn.textContent = '⏳ Connexion...';
    signInBtn.disabled = true;

    // Demander au background de lancer le flow Google
    const response = await chrome.runtime.sendMessage({
      type: 'firebase-signin-google'
    });

    if ((response && response.success) || response?.user) {
      console.log('✅ Popup: Sign-in success');
      await checkAuthStatus();
      signInBtn.textContent = '✅ Connecté !';
      setTimeout(() => window.close(), 1200);
    } else {
      console.warn('❌ Popup: Sign-in failed', response);
      signInBtn.textContent = '❌ Erreur';
      setTimeout(() => {
        signInBtn.textContent = originalText;
        signInBtn.disabled = false;
      }, 2000);
    }
  } catch (err) {
    console.error('❌ Popup: Google sign-in error', err);
    const signInBtn = document.getElementById('signInGoogleBtn');
    signInBtn.textContent = '❌ Erreur';
    setTimeout(() => {
      signInBtn.textContent = '🔐 Se connecter avec Google';
      signInBtn.disabled = false;
    }, 2000);
  }
}

/**
 * Gérer la connexion Email/Password (Firebase)
 */
async function handleSignInEmail() {
  try {
    console.log('📧 Popup: Email sign-in requested');
    const signInBtn = document.getElementById('signInEmailBtn');
    const originalText = signInBtn.textContent;
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    
    // Validation basique
    if (!email || !password) {
      alert('Veuillez remplir tous les champs');
      return;
    }
    
    if (!email.includes('@')) {
      alert('Veuillez entrer un email valide');
      return;
    }
    
    if (password.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    signInBtn.textContent = '⏳ Connexion...';
    signInBtn.disabled = true;

    // Demander au background de lancer le flow Email/Password
    const response = await chrome.runtime.sendMessage({
      type: 'firebase-signin-email',
      data: { email, password }
    });

    if ((response && response.success) || response?.user) {
      console.log('✅ Popup: Email sign-in success');
      await checkAuthStatus();
      signInBtn.textContent = '✅ Connecté !';
      // Clear les champs
      document.getElementById('emailInput').value = '';
      document.getElementById('passwordInput').value = '';
      setTimeout(() => window.close(), 1200);
    } else {
      console.warn('❌ Popup: Email sign-in failed', response);
      signInBtn.textContent = '❌ Erreur';
      
      // Suggérer de créer un compte si l'utilisateur n'existe pas
      if (response?.error?.includes('user-not-found')) {
        signInBtn.textContent = '👤 Compte inexistant';
        setTimeout(() => {
          signInBtn.textContent = originalText;
          signInBtn.disabled = false;
          // Suggérer de créer un compte
          if (confirm('Ce compte n\'existe pas. Souhaitez-vous créer un compte ?')) {
            switchTab('signup');
            // Pré-remplir l'email
            document.getElementById('signupEmailInput').value = email;
            document.getElementById('signupPasswordInput').focus();
          }
        }, 1500);
      } else {
        setTimeout(() => {
          signInBtn.textContent = originalText;
          signInBtn.disabled = false;
        }, 2000);
      }
    }
  } catch (err) {
    console.error('❌ Popup: Email sign-in error', err);
    const signInBtn = document.getElementById('signInEmailBtn');
    signInBtn.textContent = '❌ Erreur';
    setTimeout(() => {
      signInBtn.textContent = '📧 Se connecter';
      signInBtn.disabled = false;
    }, 2000);
  }
}

/**
 * Gérer la création de compte Email/Password (Firebase)
 */
async function handleSignUpEmail() {
  try {
    console.log('✨ Popup: Email sign-up requested');
    const signUpBtn = document.getElementById('signUpEmailBtn');
    const originalText = signUpBtn.textContent;
    const email = document.getElementById('signupEmailInput').value.trim();
    const password = document.getElementById('signupPasswordInput').value;
    const confirmPassword = document.getElementById('confirmPasswordInput').value;
    
    // Validation avancée
    if (!email || !password || !confirmPassword) {
      alert('Veuillez remplir tous les champs');
      return;
    }
    
    if (!email.includes('@')) {
      alert('Veuillez entrer un email valide');
      return;
    }
    
    if (password.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    if (password !== confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      document.getElementById('confirmPasswordInput').focus();
      return;
    }
    
    // Validation supplémentaire du mot de passe
    if (!/(?=.*[a-z])/.test(password)) {
      alert('Le mot de passe doit contenir au moins une lettre minuscule');
      return;
    }
    
    signUpBtn.textContent = '⏳ Création...';
    signUpBtn.disabled = true;

    // Demander au background de créer le compte
    const response = await chrome.runtime.sendMessage({
      type: 'firebase-signup-email',
      data: { email, password }
    });

    if ((response && response.success) || response?.user) {
      console.log('✅ Popup: Account created successfully');
      
      // Vérifier si l'email de vérification a été envoyé
      if (response.verificationEmailSent) {
        console.log('📧 Popup: Email verification sent');
        
        // Afficher un message de vérification d'email
        signUpBtn.textContent = '📧 Vérifiez votre email';
        signUpBtn.style.backgroundColor = '#f59e0b';
        
        // Créer un joli modal au lieu d'une alert
        setTimeout(() => {
          createEmailVerificationModal(email);
          
          // Clear les champs
          document.getElementById('signupEmailInput').value = '';
          document.getElementById('signupPasswordInput').value = '';
          document.getElementById('confirmPasswordInput').value = '';
          
          // Basculer vers l'onglet de connexion
          switchTab('email');
          
          // Pré-remplir l'email pour faciliter la connexion après vérification
          document.getElementById('emailInput').value = email;
        }, 500);
      } else {
        // Fallback si l'email de vérification n'a pas pu être envoyé
        signUpBtn.textContent = '⚠️ Vérification manuelle requise';
        signUpBtn.style.backgroundColor = '#ef4444';
        
        setTimeout(() => {
          createEmailVerificationModal(email, false);
          
          // Clear les champs et switch
          document.getElementById('signupEmailInput').value = '';
          document.getElementById('signupPasswordInput').value = '';
          document.getElementById('confirmPasswordInput').value = '';
          switchTab('email');
          document.getElementById('emailInput').value = email;
        }, 500);
      }
      
      await checkAuthStatus();
    } else {
      console.warn('❌ Popup: Account creation failed', response);
      signUpBtn.textContent = '❌ Erreur';
      
      // Gestion des erreurs spécifiques Firebase
      if (response?.error?.includes('email-already-in-use')) {
        signUpBtn.textContent = '📧 Email déjà utilisé';
        setTimeout(() => {
          signUpBtn.textContent = originalText;
          signUpBtn.disabled = false;
          // Suggérer de se connecter
          if (confirm('Cet email est déjà utilisé. Souhaitez-vous vous connecter ?')) {
            switchTab('email');
            // Pré-remplir l'email
            document.getElementById('emailInput').value = email;
            document.getElementById('passwordInput').focus();
          }
        }, 2000);
      } else if (response?.error?.includes('weak-password')) {
        signUpBtn.textContent = '🔒 Mot de passe trop faible';
        setTimeout(() => {
          signUpBtn.textContent = originalText;
          signUpBtn.disabled = false;
          document.getElementById('signupPasswordInput').focus();
        }, 2000);
      } else {
        setTimeout(() => {
          signUpBtn.textContent = originalText;
          signUpBtn.disabled = false;
        }, 2000);
      }
    }
  } catch (err) {
    console.error('❌ Popup: Email sign-up error', err);
    const signUpBtn = document.getElementById('signUpEmailBtn');
    signUpBtn.textContent = '❌ Erreur';
    setTimeout(() => {
      signUpBtn.textContent = '✨ Créer mon compte';
      signUpBtn.disabled = false;
    }, 2000);
  }
}

/**
 * Créer un joli modal de vérification d'email
 */
function createEmailVerificationModal(email, emailSent = true) {
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
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 40px;
    border-radius: 16px;
    max-width: 450px;
    min-width: 400px;
    text-align: center;
    color: #333;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    position: relative;
    animation: modalSlideIn 0.3s ease-out;
  `;
  
  // Ajouter l'animation CSS
  if (!document.querySelector('#modal-animations')) {
    const style = document.createElement('style');
    style.id = 'modal-animations';
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
  
  if (emailSent) {
    content.innerHTML = `
      <div style="font-size: 64px; margin-bottom: 20px;">📧</div>
      <h2 style="margin-bottom: 15px; color: #059669; font-size: 24px; font-weight: 600;">
        ✅ Compte créé avec succès !
      </h2>
      <p style="margin-bottom: 20px; color: #374151; font-size: 16px; line-height: 1.5;">
        Un email de vérification a été envoyé à :
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
      <div style="
        background: #fef3c7; 
        border: 1px solid #f59e0b; 
        border-radius: 8px; 
        padding: 16px; 
        margin-bottom: 30px;
        text-align: left;
      ">
        <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;">📋 Étapes suivantes :</h4>
        <ol style="margin: 0; padding-left: 18px; color: #92400e; font-size: 14px; line-height: 1.4;">
          <li>Vérifiez votre boîte email (y compris les spams)</li>
          <li>Cliquez sur le lien de vérification</li>
          <li>Reconnectez-vous pour activer vos <strong>70,000 tokens gratuits</strong></li>
        </ol>
      </div>
      <div style="
        background: #fef2f2; 
        border: 1px solid #fca5a5; 
        border-radius: 8px; 
        padding: 12px; 
        margin-bottom: 25px;
      ">
        <p style="margin: 0; color: #dc2626; font-size: 13px; font-weight: 500;">
          ⚠️ Vous ne pourrez pas utiliser l'assistant IA tant que votre email n'est pas vérifié
        </p>
      </div>
      <button id="close-modal-btn" style="
        width: 100%; 
        padding: 14px; 
        background: #059669; 
        color: white; 
        border: none; 
        border-radius: 8px; 
        font-size: 16px; 
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      " onmouseover="this.style.backgroundColor='#047857'" onmouseout="this.style.backgroundColor='#059669'">
        J'ai compris
      </button>
    `;
  } else {
    content.innerHTML = `
      <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
      <h2 style="margin-bottom: 15px; color: #dc2626; font-size: 24px; font-weight: 600;">
        Compte créé - Action requise
      </h2>
      <p style="margin-bottom: 20px; color: #374151; font-size: 16px; line-height: 1.5;">
        Votre compte a été créé pour :
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
      <div style="
        background: #fef2f2; 
        border: 1px solid #fca5a5; 
        border-radius: 8px; 
        padding: 16px; 
        margin-bottom: 25px;
      ">
        <p style="margin: 0 0 10px 0; color: #dc2626; font-size: 14px; font-weight: 500;">
          ⚠️ L'email de vérification n'a pas pu être envoyé automatiquement
        </p>
        <p style="margin: 0; color: #7f1d1d; font-size: 13px; line-height: 1.4;">
          Veuillez vous connecter puis vérifier manuellement votre email depuis votre tableau de bord Firebase.
        </p>
      </div>
      <button id="close-modal-btn" style="
        width: 100%; 
        padding: 14px; 
        background: #dc2626; 
        color: white; 
        border: none; 
        border-radius: 8px; 
        font-size: 16px; 
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      " onmouseover="this.style.backgroundColor='#b91c1c'" onmouseout="this.style.backgroundColor='#dc2626'">
        Compris
      </button>
    `;
  }
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Gestionnaire de fermeture
  const closeBtn = modal.querySelector('#close-modal-btn');
  const closeModal = () => {
    modal.style.opacity = '0';
    modal.style.transform = 'scale(0.9)';
    setTimeout(() => {
      modal.remove();
      window.close();
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

/**
 * Gérer la déconnexion
 */
async function handleSignOut() {
  try {
    console.log('🚪 Popup: Starting sign out process...');
    
    const signOutBtn = document.getElementById('signOutBtn');
    const originalText = signOutBtn.textContent;
    
    // Feedback visuel
    signOutBtn.textContent = '⏳ Déconnexion...';
    signOutBtn.disabled = true;
    
    // 1. Déconnexion Firebase (toujours nécessaire)
    try {
      await chrome.runtime.sendMessage({ type: 'firebase-signout' });
      console.log('✅ Popup: Firebase signout success');
    } catch (e) {
      console.log('⚠️ Popup: Firebase signout error', e);
    }
    
    // 2. Vérifier s'il y a des tokens Chrome Identity (Google uniquement)
    let hasGoogleTokens = false;
    try {
      const token = await new Promise((resolve) => {
        chrome.identity.getAuthToken({ interactive: false }, resolve);
      });
      
      if (token && !chrome.runtime.lastError) {
        hasGoogleTokens = true;
        console.log('🔍 Popup: Google tokens detected - cleaning Chrome Identity');
        
        // Supprimer le token principal
        await new Promise((resolve) => {
          chrome.identity.removeCachedAuthToken({ token }, resolve);
        });
        console.log('✅ Popup: Chrome Identity token removed');
        
        // Nettoyer tous les tokens Chrome Identity pour tous les scopes
        const scopes = [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
          'openid',
          'email',
          'profile'
        ];
        
        for (const scope of scopes) {
          try {
            const scopeToken = await new Promise((resolve) => {
              chrome.identity.getAuthToken({ 
                interactive: false,
                scopes: [scope]
              }, resolve);
            });
            
            if (scopeToken && !chrome.runtime.lastError) {
              await new Promise((resolve) => {
                chrome.identity.removeCachedAuthToken({ token: scopeToken }, resolve);
              });
              console.log(`✅ Popup: Removed token for scope: ${scope}`);
            }
          } catch (scopeError) {
            // Continue même si une scope échoue
            console.log(`⚠️ Popup: Could not remove token for scope ${scope}:`, scopeError);
          }
        }
        
        // SEULEMENT pour Google : Forcer la déconnexion des sessions Google dans Chrome
        console.log('🔐 Popup: Cleaning Google sessions (Google sign-in detected)');
        const logoutUrls = [
          'https://accounts.google.com/logout',
          'https://accounts.google.com/SignOutOptions'
        ];
        
        for (const url of logoutUrls) {
          try {
            const logoutTab = await chrome.tabs.create({
              url: url,
              active: false
            });
            
            // Fermer après 2 secondes
            setTimeout(() => {
              chrome.tabs.remove(logoutTab.id).catch(() => {});
            }, 2000);
          } catch (urlError) {
            console.log(`⚠️ Popup: Could not open logout URL ${url}:`, urlError);
          }
        }
      } else {
        console.log('ℹ️ Popup: No Google tokens found - email/password sign-in');
      }
    } catch (error) {
      console.log('⚠️ Popup: Could not check Chrome Identity tokens:', error);
    }
    
    // 3. Nettoyer le storage local
    await chrome.storage.local.remove(['authState']);
    console.log('✅ Popup: Local auth state cleared');
    
    // 4. Notifier le background script
    try {
      await chrome.runtime.sendMessage({
        type: 'auth-signout',
        source: 'popup'
      });
      console.log('✅ Popup: Background script notified');
    } catch (error) {
      console.log('⚠️ Popup: Could not notify background script:', error);
    }
    
    // 5. Mettre à jour l'interface
    hideUserInfo();
    
    // Feedback de succès
    const method = hasGoogleTokens ? 'Google + Firebase' : 'Firebase';
    signOutBtn.textContent = '✅ Déconnecté !';
    signOutBtn.style.backgroundColor = '#22c55e';
    
    console.log(`🎉 Popup: Sign out completed successfully (${method})`);
    
    setTimeout(() => {
      signOutBtn.textContent = originalText;
      signOutBtn.disabled = false;
      signOutBtn.style.backgroundColor = '';
      window.close();
    }, 1500);
    
  } catch (error) {
    console.error('❌ Popup: Sign out error:', error);
    
    const signOutBtn = document.getElementById('signOutBtn');
    signOutBtn.textContent = '❌ Erreur';
    signOutBtn.style.backgroundColor = '#ef4444';
    
    setTimeout(() => {
      signOutBtn.textContent = '🚪 Se déconnecter';
      signOutBtn.disabled = false;
      signOutBtn.style.backgroundColor = '';
    }, 2000);
  }
} 