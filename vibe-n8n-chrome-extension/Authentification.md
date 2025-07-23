📚 **Documentation Complète – Authentification Firebase & Déconnexion**
**Extension Chrome : n8n AI Assistant – Workflow RAG**

---

### Sommaire

1. Introduction
2. Vue d’ensemble (Diagramme de séquence)
3. Fichiers et responsabilités
4. Cycle « Connexion » pas-à-pas
5. Cycle « Déconnexion » pas-à-pas
6. Détails des messages `chrome.runtime`
7. Points d’extension / options d’évolution
8. Dépannage courant

---

### 1. Introduction

L’extension utilise **Firebase Auth** dans un **offscreen document** (pattern officiel MV3) pour authentifier l’utilisateur via **Google Sign-In**. La popup et les pages de contenu dialoguent avec le **Service Worker** pour déterminer ou initier l’état de connexion.

---

### 2. Vue d’ensemble (Diagramme de séquence)

```
sequenceDiagram
  participant Popup
  participant Content
  participant SW as Service Worker (background.js)
  participant Off as Offscreen (offscreen.html + offscreen.js)
  participant Firebase

  Note over Popup,Content: Utilisation de chrome.runtime.sendMessage()

  Popup->>SW: firebase-signin-google
  SW->>SW: setupOffscreenDocument()
  SW->>Off: Création offscreen.html
  Popup-->>SW: Attente réponse

  Off->>Firebase: signInWithPopup()
  Firebase-->>Off: userCredential
  Off->>SW: { success:true, user }
  SW-->>Popup: { success:true, user }

  Content->>SW: firebase-get-user
  SW-->>Content: { success:true, user }

  Popup->>SW: firebase-signout
  SW->>Off: firebase-auth-signout
  Off->>Firebase: signOut()
  Firebase-->>Off: ok
  Off->>SW: { success:true }
  SW-->>Popup: { success:true }
  Content->>SW: firebase-get-user
  SW-->>Content: { success:false }
```

---

### 3. Fichiers et responsabilités

| Fichier                                  | Rôle principal       | Fonctions clés                                                                                                                                       |
| ---------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `background.js`                          | Service Worker (hub) | `setupOffscreenDocument`, `sendToOffscreen`, wrappers `firebaseSignInWithGoogle`, `firebaseSignOut`, gestion des messages `chrome.runtime.onMessage` |
| `offscreen.html`                         | Container invisible  | Héberge `offscreen.js`                                                                                                                               |
| `offscreen.js`                           | Script auth          | Dialogue entre SW ⬌ Firebase via iframe                                                                                                              |
| `content-auth-integration-standalone.js` | Intégration page n8n | Auth-check, modal connexion                                                                                                                          |
| `popup.js` / `popup.html`                | UI popup             | Boutons login/logout, affichage user                                                                                                                 |
| `background.js (RAG)`                    | Auth API             | `firebaseGetIdToken()` (JWT futur)                                                                                                                   |

---

### 4. Cycle « Connexion » – pas-à-pas

* **UI** : clic sur "Se connecter"
* **background.js** appelle `firebaseSignInWithGoogle()`

  * focus de la fenêtre via `chrome.windows.onCreated`
  * `sendToOffscreen({ type: 'firebase-auth-signin-google' })`
* **offscreen.js** envoie `postMessage({ initAuth:true })` à l’iframe
* **Firebase SDK** affiche la popup Google
* À validation : `userCredential` → réponse vers le SW → réponse UI
* **Content script** : `firebase-get-user` renvoie l’utilisateur si connecté

---

### 5. Cycle « Déconnexion » – pas-à-pas

* **UI** : clic sur "Se déconnecter"
* **background.js** appelle `firebaseSignOut()` → `sendToOffscreen(...)`
* **offscreen.js** traite `firebase-auth-signout` puis relaye `signOut()` vers Firebase
* **Retour SW** : `{ success:true }`
* **UI** nettoie le cache et réactive le bouton « Se connecter »
* **Content script** voit l’utilisateur comme déconnecté

---

### 6. Détails des messages `chrome.runtime`

| Message                       | Émetteur ➜ Récepteur | Payload | Réponse attendue              |
| ----------------------------- | -------------------- | ------- | ----------------------------- |
| `firebase-signin-google`      | Popup ➜ SW           | `{}`    | `{ success, user }`           |
| `firebase-signout`            | Popup ➜ SW           | `{}`    | `{ success }`                 |
| `firebase-get-user`           | Content ➜ SW         | `{}`    | `{ success, user }` ou `user` |
| `firebase-auth-signin-google` | SW ➜ Offscreen       | `{}`    | idem                          |
| `firebase-auth-signout`       | SW ➜ Offscreen       | `{}`    | `{ success }`                 |
| `firebase-auth-get-user`      | SW ➜ Offscreen       | `{}`    | `{ success, user }`           |

*Autres : `firebase-get-token`, `firebase-signin-email`, non utilisés ici.*

---

### 7. Points d’extension / évolutions possibles

* 🔐 **Jetons d’accès** : Passer au JWT avec `firebaseGetIdToken()`
* 🔁 **Multi-provider** : Email/Password, GitHub (offscreen prêt)
* 💾 **Persistance** : Sauvegarder `currentUser` dans `chrome.storage.local`
* 🔍 **Sécurité** : Vérification des domaines autorisés Firebase + CSP MV3 renforcée

---

### 8. Dépannage courant

| Symptôme                        | Cause                   | Correctif                                 |
| ------------------------------- | ----------------------- | ----------------------------------------- |
| Popup Google derrière           | Pas de `focus()`        | `chrome.windows.onCreated`                |
| Bouton « Se connecter » visible | `firebase-get-user` KO  | Appel explicite dans `checkAuthStatus()`  |
| Déconnexion inefficace          | `currentUser` pas reset | Patch handler signout dans `offscreen.js` |
| `auth/cancelled-popup-request`  | Clics multiples         | UI désactive bouton                       |
| 403 Sentry                      | Aucun impact            | Désactiver Sentry si besoin               |

---

### Références

* [Firebase Auth for Chrome Extensions (official doc)](https://firebase.google.com/docs/auth/web/cordova)
* Code :

  * `vibe-n8n-chrome-extension/src/background.js`
  * `vibe-n8n-chrome-extension/offscreen.js`
  * `vibe-n8n-chrome-extension/src/content-auth-integration-standalone.js`
  * `vibe-n8n-chrome-extension/src/popup.js`

📄 **Fin de la documentation** – Pense à l’exporter en `.md` ou PDF !
