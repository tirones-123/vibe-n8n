# Guide d'Authentification - Système de Pricing Vibe n8n

Ce guide explique **comment les utilisateurs s'authentifient** dans le système Vibe n8n et comment l'authentification fonctionne entre l'extension Chrome, Firebase et le backend.

## 🔐 Vue d'ensemble de l'authentification

### Architecture complète

```
👤 Utilisateur
    ↓ (Email/Password ou Google)
🔥 Firebase Authentication
    ↓ (ID Token JWT)
🌐 Extension Chrome
    ↓ (Bearer Token)
🖥️ Backend n8n RAG
    ↓ (Token verification)
🔥 Firebase Admin SDK
    ↓ (User data)
📊 Firestore Database
```

## 🚀 Comment les utilisateurs s'authentifient

### 1. Première utilisation

Lorsqu'un utilisateur ouvre l'extension pour la première fois :

1. **Modal d'authentification apparaît automatiquement**
2. **Choix de méthode** :
   - Email/Password (inscription ou connexion)
   - Google Sign-In (popup)
3. **Création automatique** du profil utilisateur (plan FREE, 70k tokens)

### 2. Méthodes d'authentification disponibles

#### 📧 Email/Password
```javascript
// L'utilisateur saisit ses identifiants
await authService.signInWithEmail(email, password);
// ou pour s'inscrire
await authService.signUpWithEmail(email, password);
```

#### 🔍 Google Sign-In
```javascript
// Popup Google OAuth
await authService.signInWithGoogle();
```

### 3. Expérience utilisateur

**Interface moderne avec :**
- Modal d'authentification élégante
- Onglets Connexion/Inscription
- Messages d'erreur localisés en français
- Loading states et animations
- Support mobile responsive

## 🔄 Flow d'authentification détaillé

### Étape 1 : Initialisation Extension
```javascript
// Au chargement de l'extension (content.js)
import authUI from './auth-ui.js';

// Initialise Firebase Auth et l'UI
await authUI.initialize();
```

### Étape 2 : État d'authentification
```javascript
// Écoute des changements d'authentification
authService.onAuthStateChanged((user, token) => {
  if (user) {
    console.log('✅ Utilisateur connecté:', user.email);
    // Charge les informations utilisateur depuis le backend
    fetchUserInfo();
  } else {
    console.log('❌ Utilisateur déconnecté');
    // Affiche le modal d'authentification
    showAuthModal();
  }
});
```

### Étape 3 : Récupération du token
```javascript
// Récupération du token ID Firebase
const token = await authService.getIdToken();
// Token JWT valide pendant 1 heure
```

### Étape 4 : Communication avec le backend
```javascript
// Toutes les requêtes utilisent le token Firebase
const response = await authService.makeAuthenticatedRequest('/api/claude', {
  method: 'POST',
  body: JSON.stringify({ prompt: 'Mon workflow...' })
});
```

## 🛡️ Sécurité côté Backend

### Validation des tokens Firebase
```javascript
// Middleware d'authentification (backend)
export async function verifyFirebaseAuth(req, res, next) {
  const authHeader = req.headers.authorization; // "Bearer <firebase_token>"
  const idToken = authHeader.substring(7);
  
  // Vérification avec Firebase Admin SDK
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  
  // Récupération des données utilisateur
  const user = await firebaseService.getOrCreateUser(decodedToken.uid);
  
  req.user = user; // Attaché à la requête
  next();
}
```

### Vérification des quotas
```javascript
// Avant chaque génération de workflow
const { allowed, reason } = await firebaseService.canUserMakeRequest(
  req.user.uid, 
  10000 // estimation tokens
);

if (!allowed) {
  return res.status(429).json({
    error: 'Quota exceeded',
    code: reason, // FREE_LIMIT_EXCEEDED | PRO_LIMIT_EXCEEDED
    action: 'upgrade_to_pro' // Action suggérée
  });
}
```

## 📱 Interface utilisateur

### Header de l'extension
```javascript
// Affichage des informations utilisateur
if (isAuthenticated) {
  header.innerHTML = `
    <div class="user-section">
      <div class="user-avatar">${user.email[0]}</div>
      <div class="user-info">
        <div class="user-email">${user.email}</div>
        <div class="user-plan">${user.plan}</div>
      </div>
      <button class="sign-out-btn">⚙️</button>
    </div>
  `;
}
```

### Barre de quota
```javascript
// Affichage du quota en temps réel
const quotaBar = `
  <div class="quota-section">
    <div class="quota-bar">
      <div class="quota-fill" style="width: ${usagePercentage}%"></div>
    </div>
    <div class="quota-text">
      ${remainingTokens} / ${maxTokens} tokens restants
    </div>
  </div>
`;
```

## 🚫 Gestion des limites et popups

### Plan FREE - Limite atteinte
```javascript
// Popup automatique quand quota épuisé
if (response.status === 429 && error.code === 'FREE_LIMIT_EXCEEDED') {
  const popup = authUI.createQuotaExceededPopup({
    code: 'FREE_LIMIT_EXCEEDED',
    message: 'Tu as atteint la limite gratuite. Passe au plan Pro pour continuer.'
  });
  
  document.body.appendChild(popup);
}
```

### Plan PRO - Options usage-based
```javascript
// Popup avec choix de budget
if (error.code === 'PRO_LIMIT_EXCEEDED') {
  const popup = `
    <div class="quota-popup">
      <h3>💳 Quota Pro atteint</h3>
      <p>Activer Usage-Based Spending ?</p>
      <div class="usage-options">
        <button data-limit="20">20$</button>
        <button data-limit="50">50$</button>
        <button data-limit="100">100$</button>
      </div>
    </div>
  `;
}
```

## 💳 Intégration avec Stripe

### Upgrade vers PRO
```javascript
// Création session de paiement Stripe
const response = await authService.makeAuthenticatedRequest('/api/create-checkout-session', {
  method: 'POST',
  body: JSON.stringify({
    success_url: window.location.href,
    cancel_url: window.location.href
  })
});

// Redirection vers Stripe Checkout
window.open(response.checkout_url, '_blank');
```

## 🔧 Configuration Frontend

### Fichier de configuration
```javascript
// src/config.js de l'extension
const CONFIG = {
  // Backend API
  API_URL: 'https://vibe-n8n-production.up.railway.app',
  
  // Configuration Firebase (Frontend)
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "vibe-n8n-production.firebaseapp.com",
    projectId: "vibe-n8n-production",
    storageBucket: "vibe-n8n-production.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
  }
};
```

## ✅ Résumé

**L'authentification fonctionne ainsi :**

1. **👤 Utilisateur** : Se connecte via Firebase (email/password ou Google)
2. **🎫 Token JWT** : Firebase génère un token d'identité sécurisé
3. **🌐 Extension** : Utilise le token pour toutes les requêtes API
4. **🖥️ Backend** : Vérifie le token, charge les données utilisateur, check quota
5. **📊 Usage** : Tracker en temps réel, popups si limites atteintes
6. **💳 Upgrade** : Stripe Checkout intégré pour passage PRO

**Avantages :**
- ✅ Sécurité Firebase (tokens JWT, refresh automatique)
- ✅ UX moderne (modal native, Google Sign-In)
- ✅ Quotas en temps réel
- ✅ Pricing transparent
- ✅ Compatibilité avec l'existant (legacy API key)

Le système est **prêt pour la production** ! 🎉 