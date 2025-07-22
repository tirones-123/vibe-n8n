// 🔥 FONCTIONS FIREBASE AUTH - MAIN WORLD
console.log('🔥 Injection Firebase Auth functions dans Main World...');

// Fonction pour communiquer avec le content script
function sendToContentScript(action, data) {
  return new Promise((resolve) => {
    const eventData = { action, data, id: Math.random().toString(36) };

    const responseHandler = (event) => {
      if (event.detail && event.detail.responseId === eventData.id) {
        document.removeEventListener('firebaseAuthResponse', responseHandler);
        resolve(event.detail.result);
      }
    };

    document.addEventListener('firebaseAuthResponse', responseHandler);
    document.dispatchEvent(new CustomEvent('firebaseAuthRequest', { detail: eventData }));

    // Timeout après 10 secondes
    setTimeout(() => {
      document.removeEventListener('firebaseAuthResponse', responseHandler);
      resolve({ success: false, error: { message: 'Timeout' } });
    }, 10000);
  });
}

// ----- Sign Up -----
window.handleFirebaseSignUp = async () => {
  console.log('📝 handleFirebaseSignUp appelé (Main World)');
  const email = document.getElementById('firebase-email')?.value;
  const password = document.getElementById('firebase-password')?.value;

  if (!email || !password) {
    alert('Veuillez remplir tous les champs');
    return;
  }
  if (password.length < 6) {
    alert('Le mot de passe doit contenir au moins 6 caractères');
    return;
  }
  try {
    console.log('📝 Envoi demande création compte au content script...', email);
    const result = await sendToContentScript('signUp', { email, password });
    if (result.success) {
      console.log('✅ Compte créé:', result.user.email);
      document.querySelector('.simple-auth-modal')?.remove();
      alert(`Compte créé avec succès ! Bienvenue ${email}`);
      setTimeout(() => location.reload(), 500);
    } else {
      console.error('❌ Erreur création:', result.error);
      alert(`Erreur de création: ${result.error?.message || 'Erreur inconnue'}`);
    }
  } catch (error) {
    console.error('❌ Erreur création compte:', error);
    alert(`Erreur de création: ${error.message}`);
  }
};

// ----- Sign In -----
window.handleFirebaseSignIn = async () => {
  console.log('🔐 handleFirebaseSignIn appelé (Main World)');
  const email = document.getElementById('firebase-email')?.value;
  const password = document.getElementById('firebase-password')?.value;
  if (!email || !password) {
    alert('Veuillez remplir tous les champs');
    return;
  }
  try {
    console.log('🔐 Envoi demande connexion au content script...', email);
    const result = await sendToContentScript('signIn', { email, password });
    if (result.success) {
      console.log('✅ Connexion réussie:', result.user.email);
      document.querySelector('.simple-auth-modal')?.remove();
      alert('Connexion réussie !');
      setTimeout(() => location.reload(), 500);
    } else {
      console.error('❌ Erreur connexion:', result.error);
      alert(`Erreur de connexion: ${result.error?.message || 'Erreur inconnue'}`);
    }
  } catch (error) {
    console.error('❌ Erreur connexion:', error);
    alert(`Erreur de connexion: ${error.message}`);
  }
};

// ----- Sign In with Google -----
window.handleFirebaseGoogleSignIn = async () => {
  console.log('🔗 handleFirebaseGoogleSignIn appelé (Main World)');
  try {
    console.log('🔗 Envoi demande connexion Google au content script...');
    const result = await sendToContentScript('signInGoogle', {});
    if (result.success) {
      console.log('✅ Connexion Google réussie:', result.user.email);
      document.querySelector('.simple-auth-modal')?.remove();
      setTimeout(() => location.reload(), 500);
    } else {
      console.error('❌ Erreur Google:', result.error);
      alert(`Erreur connexion Google: ${result.error?.message || 'Erreur inconnue'}`);
    }
  } catch (error) {
    console.error('❌ Erreur connexion Google:', error);
    alert(`Erreur connexion Google: ${error.message}`);
  }
};

console.log('✅ Fonctions Firebase Auth injectées dans Main World');

// Diagnostic rapide
console.log('🧪 Test Main World functions:');
console.log('  handleFirebaseSignUp:', typeof window.handleFirebaseSignUp);
console.log('  handleFirebaseSignIn:', typeof window.handleFirebaseSignIn);
console.log('  handleFirebaseGoogleSignIn:', typeof window.handleFirebaseGoogleSignIn); 