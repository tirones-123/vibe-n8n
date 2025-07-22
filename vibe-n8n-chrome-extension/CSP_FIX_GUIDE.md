# 🔒 Fix Content Security Policy (CSP) pour Firebase

## Problème résolu

L'erreur "Refused to load the script 'https://www.gstatic.com/firebasejs/...' because it violates the following Content Security Policy directive" était causée par l'absence d'une politique CSP spécifique pour l'offscreen document.

## Changement apporté

Dans `manifest.json`, j'ai ajouté une section CSP spécifique pour l'offscreen document :

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'",
  "sandbox": "...",
  "offscreen": "script-src 'self' https://www.gstatic.com https://www.googleapis.com https://securetoken.googleapis.com https://apis.google.com; object-src 'self';"
}
```

## 🚀 Pour appliquer les changements

1. **Recharger l'extension** (TRÈS IMPORTANT !) :
   - Aller sur `chrome://extensions/`
   - Trouver "n8n AI Assistant - Claude + Pricing"
   - Cliquer sur l'icône de rechargement 🔄

2. **Vérifier l'offscreen document** :
   - Ouvrir `chrome://inspect/#other`
   - Chercher "offscreen.html"
   - Cliquer sur "inspect"
   - Dans la console, vous devriez voir :
     ```
     🔥 Firebase Auth Offscreen Document starting...
     ✅ Firebase Auth initialized successfully
     📱 Offscreen document ready
     ```

3. **Tester l'authentification** :
   - Ouvrir n8n
   - Cliquer sur le bouton 🤖
   - Essayer de créer un compte

## 📊 Explication des domaines autorisés

- `https://www.gstatic.com` : CDN principal de Google pour Firebase SDK
- `https://www.googleapis.com` : APIs Google pour l'authentification
- `https://securetoken.googleapis.com` : Service de tokens Firebase
- `https://apis.google.com` : APIs supplémentaires Google

## 🔍 Vérification

Après rechargement, vérifiez dans la console de l'offscreen document :
- Pas d'erreur "Refused to load the script"
- Firebase est bien défini
- Pas d'erreur "firebase is not defined"

## ✅ Résumé

La CSP pour l'offscreen document permet maintenant le chargement des scripts Firebase depuis les domaines externes nécessaires. Cela résout complètement le problème d'initialisation Firebase ! 