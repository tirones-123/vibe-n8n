# 🔐 Guide de Sécurité Firebase pour Extension Chrome

## ❓ **Pourquoi la clé API Firebase est-elle visible ?**

**C'est NORMAL et SÉCURISÉ !** ✅

### 🎯 **Principes de sécurité Firebase**

1. **Clés API Frontend = Publiques** 
   - Conçues pour être exposées dans le code client
   - Ne donnent PAS accès aux données directement
   - Servent uniquement à identifier votre projet Firebase

2. **Sécurité = Règles + Authentification**
   - La sécurité repose sur les **règles Firestore** 
   - Et sur l'**authentification des utilisateurs**
   - PAS sur la confidentialité de la clé API

3. **Analogie : Adresse postale**
   - La clé API = adresse de votre maison (publique)
   - Les règles Firestore = serrures et alarmes (privées)

## 🛡️ **Sécurisation de votre projet Firebase**

### 1. **Configurer les restrictions d'API**

Dans [Google Cloud Console](https://console.cloud.google.com/apis/credentials) :

```
1. Aller à "APIs & Services" > "Credentials"
2. Cliquer sur votre clé API Browser
3. Dans "Application restrictions" :
   - Choisir "Chrome extensions"
   - Ajouter votre Extension ID : chrome-extension://VOTRE_EXTENSION_ID/*

4. Dans "API restrictions" :
   - Restricter aux APIs Firebase nécessaires :
     ✅ Identity Toolkit API
     ✅ Firebase Installations API
     ✅ Cloud Firestore API
     ❌ Désactiver tout le reste
```

### 2. **Règles Firestore sécurisées**

Dans Firebase Console > Firestore > Rules :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règles pour les utilisateurs authentifiés uniquement
    match /users/{userId} {
      allow read, write: if request.auth != null 
                        && request.auth.uid == userId;
    }
    
    // Règles pour les événements d'usage (lecture seule)
    match /usage_events/{eventId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                  && request.auth.uid == resource.data.userId;
    }
    
    // Bloquer tout le reste
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 3. **Authentication sécurisée**

Dans Firebase Console > Authentication > Settings :

```
1. Domaines autorisés :
   - Ajouter UNIQUEMENT vos domaines de test
   - chrome-extension://VOTRE_EXTENSION_ID
   - localhost (pour développement uniquement)

2. Fournisseurs d'authentification :
   ✅ Email/Password (avec email verification)
   ✅ Google (avec domaines restreints si nécessaire)
   ❌ Anonymous (désactiver pour production)

3. Politique de mots de passe :
   - Minimum 8 caractères
   - Exiger majuscules/minuscules/chiffres
```

### 4. **App Check (recommandé pour production)**

Pour une sécurité maximale, activez Firebase App Check :

```
1. Firebase Console > App Check
2. Configurer pour Chrome Extension
3. Générer un token App Check
4. Ajouter dans le code :

import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_SITE_KEY'),
  isTokenAutoRefreshEnabled: true
});
```

## 🚨 **Ce qu'il NE FAUT PAS faire**

### ❌ **Clés server-side dans l'extension**
```javascript
// JAMAIS ça dans une extension :
const FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----...";
const STRIPE_SECRET_KEY = "sk_live_...";
```

### ❌ **Règles Firestore permissives**
```javascript
// JAMAIS ça en production :
allow read, write: if true;  // Accès public total
```

### ❌ **Authentification désactivée**
```javascript
// JAMAIS ça en production :
// Permettre l'accès sans auth
```

## ✅ **Configuration actuelle de votre projet**

### **Clé API Frontend (publique) ✅**
```javascript
apiKey: "AIzaSyDPB8tHayuvKuhimMQPbJBBLvukFLJIZ8I"
```
- **Sécurisé** : peut être visible publiquement
- **Fonction** : identifie votre projet Firebase
- **Pas d'accès** : ne donne pas accès aux données

### **Clés server-side (privées) ✅**
```javascript
// Ces clés sont dans .env du backend (sécurisées) :
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
STRIPE_SECRET_KEY="sk_live_..."
```

## 🛡️ **Checklist de sécurité**

- [ ] Restrictions d'API configurées dans Google Cloud Console
- [ ] Règles Firestore restrictives (auth required)
- [ ] Domaines autorisés configurés dans Firebase Auth
- [ ] App Check activé (recommandé)
- [ ] Clés server-side dans .env backend uniquement
- [ ] Tests de sécurité effectués

## 📊 **Monitoring de sécurité**

### **Firebase Console - Usage**
- Surveiller les tentatives d'authentification
- Vérifier les accès Firestore suspects
- Monitorer les quotas d'API

### **Google Cloud Console - Logs**
- API calls suspects
- Tentatives d'accès non autorisés
- Erreurs d'authentification

## 🎯 **Conclusion**

**Votre configuration actuelle est SÉCURISÉE** ✅

1. **Clé API visible** = Normal pour Firebase frontend
2. **Sécurité** = Règles Firestore + Auth (implémentées ✅)
3. **Clés sensibles** = Backend uniquement (fait ✅)
4. **Best practices** = Respectées ✅

**Votre extension peut être distribuée en toute sécurité !** 🚀

---

## 📚 **Ressources officielles**

- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [Google Cloud API Security](https://cloud.google.com/docs/authentication/api-keys)
- [Chrome Extension Security](https://developer.chrome.com/docs/extensions/mv3/security/)

*Guide de sécurité pour Vibe n8n Extension - Firebase + Chrome Extension Best Practices* 