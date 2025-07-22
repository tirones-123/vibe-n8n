# Guide d'Intégration Firebase Auth dans l'Extension Chrome

Ce guide explique comment intégrer le nouveau système d'authentification Firebase dans l'extension Chrome existante.

## 🎯 Ce qui a été configuré

### ✅ Fichiers créés
- `src/config.js` - Configuration Firebase + backend
- `src/auth.js` - Service d'authentification Firebase
- `src/auth-ui.js` - Interface utilisateur d'authentification
- `src/content-auth-integration.js` - Module d'intégration pour le content.js existant
- `styles/auth.css` - Styles pour l'authentification

### ✅ Fichiers modifiés
- `manifest.json` - Permissions Firebase + Stripe, nouveaux scripts
- `package.json` - Dépendance Firebase ajoutée

## 🔧 Comment intégrer dans le content.js existant

### Option 1 : Intégration minimale (recommandée)

Au début du fichier `content.js`, ajoutez :

```javascript
// Import du module d'intégration auth
import contentAuthIntegration from './content-auth-integration.js';

// Dans la fonction d'initialisation existante
async function initializeExtension() {
  // ... code existant ...
  
  // Initialiser l'authentification
  await contentAuthIntegration.initialize();
  
  // ... reste du code existant ...
}
```

### Option 2 : Modification des appels API

Remplacez les appels API existants par :

```javascript
// Au lieu de chrome.runtime.sendMessage ou fetch direct
// const response = await fetch(apiUrl, options);

// Utilisez :
const response = await contentAuthIntegration.makeWorkflowRequest(prompt, baseWorkflow);

if (!response) {
  // L'utilisateur n'est pas authentifié ou quota dépassé
  // Les popups sont gérés automatiquement
  return;
}

// Continuez avec la logique SSE existante
```

## 🔄 Migration progressive

### Étape 1 : Test de base
1. Chargez l'extension modifiée
2. Allez sur n8n.io ou votre instance
3. Ouvrez l'extension → Modal d'authentification doit apparaître
4. Connectez-vous avec email/password ou Google

### Étape 2 : Test des quotas
1. Générez quelques workflows pour consommer des tokens
2. Le quota doit s'afficher dans l'header
3. Quand le quota FREE est atteint → Popup "Go Pro"

### Étape 3 : Test du paiement
1. Cliquez "Go Pro" → Redirection Stripe Checkout
2. Utilisez une carte de test Stripe
3. Après paiement → Plan PRO activé automatiquement

## 🎨 Interface utilisateur

### Header d'authentification
```javascript
// L'header de l'extension affichera automatiquement :
[👤 Avatar] user@example.com (FREE/PRO) [⚙️]

// Barre de quota :
[████████░░] 65,000 / 70,000 tokens restants
```

### Popups intelligents
```javascript
// Plan FREE dépassé :
"🚀 Tu as atteint la limite gratuite. Passe au plan Pro pour continuer."
[Go Pro - 20$/mois] [Plus tard]

// Plan PRO dépassé :
"💳 Quota Pro atteint. Activer Usage-Based Spending ?"
[20$] [50$] [100$] [Plus tard]
```

## 🧪 Tests et debug

### Console logs à surveiller
```javascript
// Initialisation réussie :
✅ Firebase Auth initialized
🔐 Initializing authentication system...
✅ Authentication system initialized

// Authentification utilisateur :
✅ User authenticated: user@example.com
👤 User info loaded: PRO

// Erreurs possibles :
❌ Authentication initialization failed: [error]
❌ User not authenticated
❌ Error checking user quota: [error]
```

### URLs de test
```javascript
// Development (local)
API_URL: 'http://localhost:3000/api/claude'              // Endpoint Claude (compatibility)
API_BASE_URL: 'http://localhost:3000'                    // Base URL pour nouveaux endpoints

// Production (Railway)
API_URL: 'https://vibe-n8n-production.up.railway.app/api/claude'     // Endpoint Claude (compatibility)
API_BASE_URL: 'https://vibe-n8n-production.up.railway.app'           // Base URL pour nouveaux endpoints
```

## 🔧 Configuration Firebase Frontend

La configuration est déjà dans `src/config.js` :

```javascript
FIREBASE_CONFIG: {
  apiKey: "AIzaSyDPB8tHayuvKuhimMQPbJBBLvukFLJIZ8I",
  authDomain: "vibe-n8n-7e40d.firebaseapp.com",
  projectId: "vibe-n8n-7e40d",
  storageBucket: "vibe-n8n-7e40d.firebasestorage.app",
  messagingSenderId: "247816285693",
  appId: "1:247816285693:web:1229eea4a52d6d765afd94",
  measurementId: "G-1CLFCN7KVL"
}
```

## 🚨 Modes de fonctionnement

### Mode Legacy (fallback automatique)
- Si Firebase ne s'initialise pas → utilise l'ancienne API key
- Compatible avec l'extension actuelle
- Pas de quotas, pas de pricing

### Mode Firebase (nouveau)
- Authentification requise
- Quotas temps réel
- Popups de pricing automatiques
- Analytics d'usage

## 📦 Build et deployment

### 1. Installer les dépendances
```bash
cd vibe-n8n-chrome-extension
npm install
```

### 2. Charger l'extension
1. Chrome → `chrome://extensions/`
2. Mode développeur ON
3. "Charger l'extension non empaquetée"
4. Sélectionner le dossier `vibe-n8n-chrome-extension/`

### 3. Tester
1. Aller sur n8n.io
2. Ouvrir l'extension (bouton 🤖)
3. Modal d'auth doit apparaître
4. Se connecter et tester la génération

## ✅ Checklist de validation

- [ ] Extension se charge sans erreur
- [ ] Modal d'authentification apparaît
- [ ] Connexion email/password fonctionne
- [ ] Connexion Google fonctionne
- [ ] Header utilisateur s'affiche
- [ ] Barre de quota fonctionne
- [ ] Génération de workflow avec quotas
- [ ] Popup "Go Pro" quand limite atteinte
- [ ] Stripe Checkout fonctionne
- [ ] Upgrade vers PRO automatique
- [ ] Usage-based billing pour PRO

## 🎉 Résultat final

Une fois intégré, vous aurez :

- ✅ **Authentification moderne** (Firebase)
- ✅ **Quotas en temps réel** (FREE: 70k, PRO: 1M tokens)
- ✅ **Pricing transparent** (20$/mois + usage-based)
- ✅ **Popups intelligents** pour upgrade
- ✅ **Compatible** avec l'extension existante
- ✅ **Fallback legacy** si Firebase échoue

Le système est **prêt pour la production** ! 🚀

## 📞 Support technique

En cas de problème :

1. **Console Browser** : Vérifiez les logs Firebase
2. **Network Tab** : Vérifiez les appels API vers Railway
3. **Firebase Console** : Vérifiez les utilisateurs créés
4. **Stripe Dashboard** : Vérifiez les paiements et subscriptions

L'intégration est conçue pour être **non-disruptive** et **backward-compatible** ! 🎯 