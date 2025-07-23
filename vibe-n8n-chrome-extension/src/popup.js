/**
 * Script pour la popup
 */

document.addEventListener('DOMContentLoaded', async () => {
  const openN8nButton = document.getElementById('open-n8n');
  const activateButton = document.getElementById('activate-here');
  const customDomainSection = document.getElementById('custom-domain-section');
  const currentDomainSpan = document.getElementById('current-domain');
  const userSection = document.getElementById('userSection');
  const userEmail = document.getElementById('userEmail');
  const signOutBtn = document.getElementById('signOutBtn');
  
  // Vérifier l'état d'authentification
  await checkAuthStatus();
  
  // Handler pour la déconnexion
  signOutBtn.addEventListener('click', handleSignOut);
  
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
    
    // Vérifier si un utilisateur est connecté via chrome.storage
    const stored = await chrome.storage.local.get(['authState']);
    
    if (stored.authState && stored.authState.authenticated) {
      console.log('✅ Popup: User is authenticated:', stored.authState.method);
      
      // Essayer de récupérer l'email depuis chrome.identity
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
  
  console.log('👤 Popup: User info displayed:', { email, method });
}

/**
 * Masquer les informations utilisateur
 */
function hideUserInfo() {
  const userSection = document.getElementById('userSection');
  userSection.style.display = 'none';
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
    
    // 1. Supprimer le token Chrome Identity
    try {
      const token = await new Promise((resolve) => {
        chrome.identity.getAuthToken({ interactive: false }, resolve);
      });
      
      if (token && !chrome.runtime.lastError) {
        await new Promise((resolve) => {
          chrome.identity.removeCachedAuthToken({ token }, resolve);
        });
        console.log('✅ Popup: Chrome Identity token removed');
      }
    } catch (error) {
      console.log('⚠️ Popup: Could not remove Chrome Identity token:', error);
    }
    
    // 1.5. Déconnexion complète Google (optionnel mais recommandé)
    try {
      // Ouvrir la page de déconnexion Google dans un onglet invisible
      const logoutTab = await chrome.tabs.create({
        url: 'https://accounts.google.com/logout',
        active: false // Onglet en arrière-plan
      });
      
      // Fermer l'onglet après 2 secondes
      setTimeout(() => {
        chrome.tabs.remove(logoutTab.id).catch(() => {
          // Ignore si l'onglet n'existe plus
        });
      }, 2000);
      
      console.log('✅ Popup: Google logout initiated');
    } catch (error) {
      console.log('⚠️ Popup: Could not logout from Google:', error);
    }
    
    // 2. Nettoyer le storage local
    await chrome.storage.local.remove(['authState']);
    console.log('✅ Popup: Local auth state cleared');
    
    // 3. Notifier le background script
    try {
      await chrome.runtime.sendMessage({
        type: 'auth-signout',
        source: 'popup'
      });
      console.log('✅ Popup: Background script notified');
    } catch (error) {
      console.log('⚠️ Popup: Could not notify background script:', error);
    }
    
    // 4. Mettre à jour l'interface
    hideUserInfo();
    
    // Feedback de succès
    signOutBtn.textContent = '✅ Déconnecté !';
    signOutBtn.style.backgroundColor = '#22c55e';
    
    setTimeout(() => {
      signOutBtn.textContent = originalText;
      signOutBtn.disabled = false;
      signOutBtn.style.backgroundColor = '';
      window.close();
    }, 1500);
    
    console.log('🎉 Popup: Sign out completed successfully');
    
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