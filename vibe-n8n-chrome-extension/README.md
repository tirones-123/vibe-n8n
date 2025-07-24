# n8n AI Assistant - Extension Chrome

Extension Chrome intelligente qui intègre le système de génération de workflows RAG directement dans l'interface n8n. Générez des workflows complets en langage naturel basés sur 2055+ exemples réels avec authentification Firebase et système de quotas.

## 🚀 Fonctionnalités

### 🤖 Génération IA avancée
- **Assistant RAG intégré** : Génération basée sur 2055+ workflows réels
- **Claude 4 Sonnet** : IA de dernière génération d'Anthropic
- **Streaming temps réel** : Suivi de la génération avec feedback de progression
- **Mode amélioration** : Modifier des workflows existants

### 🔐 Authentification moderne  
- **Firebase Auth** : Connexion sécurisée avec Google
- **Plans FREE/PRO** : Gestion des quotas automatique
- **Suivi d'usage** : Visualisation des tokens consommés

### 💫 Interface native n8n
- **Import automatique** : Simulation du copier-coller natif n8n
- **Support multi-domaines** : Fonctionne sur n8n.io, n8n.cloud, et instances personnelles
- **Design moderne** : Interface inspirée VS Code avec thèmes adaptatifs
- **Validation complète** : Workflows générés entièrement compatibles n8n

## 📋 Plans et Quotas

### Plan FREE
- **70,000 tokens** input par mois
- Génération de workflows IA
- Extension Chrome complète
- Support communautaire

### Plan PRO ($20/mois)
- **1,500,000 tokens** input par mois  
- Usage-based billing optionnel après quota
- Support prioritaire
- Statistiques d'usage avancées

**Estimation** : 1 workflow simple ≈ 8,000-15,000 tokens

## 🛠️ Installation

### 1. Installation de l'extension

1. **Télécharger** : Clonez ou téléchargez ce repository
2. **Chrome** : Accédez à `chrome://extensions/`
3. **Mode développeur** : Activez le toggle en haut à droite
4. **Charger l'extension** : Cliquez "Charger l'extension non empaquetée"
5. **Sélectionner** : Choisissez le dossier `vibe-n8n-chrome-extension/`
6. **Confirmé** : L'icône 🤖 apparaît dans votre barre d'extensions

### 2. Premier usage

1. **Ouvrez n8n** dans votre navigateur (n8n.io, n8n.cloud, ou votre instance)
2. **Naviguez** vers un workflow (nouveau ou existant)
3. **Cliquez** sur le bouton bleu 🤖 en bas à droite
4. **Connectez-vous** via Google (Firebase Auth)
5. **Commencez** à décrire vos workflows !

## 🎯 Utilisation

### Génération de nouveaux workflows

1. **Ouvrez** n8n et créez un nouveau workflow
2. **Cliquez** sur le bouton 🤖 
3. **Décrivez** votre workflow en langage naturel
4. **Attendez** la génération (streaming en temps réel)
5. **Le workflow** est automatiquement importé via simulation copier-coller

### Amélioration de workflows existants

1. **Ouvrez** un workflow existant dans n8n
2. **Cliquez** sur le bouton 🤖
3. **Décrivez** les améliorations souhaitées
4. **Le workflow** modifié remplace automatiquement l'original

### Exemples de descriptions

#### Workflows simples
```
"Crée un workflow qui envoie un email toutes les heures"
"Webhook trigger qui notifie Slack quand on reçoit des données"
"Automatisation qui sauvegarde des nouvelles dans Google Sheets"
```

#### Workflows complexes
```
"Pipeline e-commerce complet : 
- Trigger sur nouveaux produits Shopify
- Mise à jour automatique dans HubSpot  
- Notification équipe via Slack
- Email de confirmation client via Gmail
- Gestion d'erreurs avec alertes Discord"
```

#### Mode amélioration
```
"Ajoute une notification par email en cas d'erreur"
"Intègre une validation des données avant traitement"
"Ajoute un délai de 5 minutes entre chaque étape"
```

## 🔧 Configuration

### Backend (Production)

L'extension est préconfigurée pour fonctionner avec le backend production :

```javascript
// vibe-n8n-chrome-extension/src/config.js
const CONFIG = {
  // Backend production Railway
  API_URL: 'https://vibe-n8n-production.up.railway.app/api/claude',
  API_BASE_URL: 'https://vibe-n8n-production.up.railway.app',
  
  // Firebase configuration
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyDPB8tHayuvKuhimMQPbJBBLvukFLJIZ8I",
    authDomain: "vibe-n8n-7e40d.firebaseapp.com",
    projectId: "vibe-n8n-7e40d",
    // ... autres paramètres Firebase
  },
  
  // Fonctionnalités activées
  FEATURES: {
    FIREBASE_AUTH: true,
    PRICING_SYSTEM: true,
    SUBSCRIPTION_PLANS: true,
    RAG_WORKFLOW_GENERATION: true,
    STREAMING_RESPONSE: true
  }
};
```

### Domaines personnalisés

Pour activer l'extension sur votre instance n8n personnelle :

1. **Naviguez** vers votre instance n8n
2. **Cliquez** sur l'icône 🤖 dans la barre d'outils Chrome
3. **Cliquez** "Activer sur ce domaine"
4. **Le domaine** est automatiquement sauvegardé

## 🏗️ Architecture technique

### Structure des fichiers

```
vibe-n8n-chrome-extension/
├── manifest.json                    # Manifest V3 - Configuration extension
├── popup.html                       # Interface popup activation domaines
├── offscreen.html                   # Container Firebase Auth
├── src/
│   ├── background.js               # Service Worker - Communication backend
│   ├── content.js                  # Interface utilisateur principale
│   ├── inject.js                   # Accès Pinia n8n + import natif
│   ├── popup.js                    # Popup activation domaines
│   ├── config.js                   # Configuration centralisée
│   └── content-auth-integration-standalone.js
├── styles/
│   ├── panel.css                   # Interface principale
│   ├── popup.css                   # Styles popup
│   └── auth.css                    # Styles authentification
└── assets/
    └── icon*.png                   # Icônes extension (16, 48, 128px)
```

### Workflow de génération

```mermaid
graph TD
    A[👤 Description utilisateur] --> B[🤖 Extension Chrome]
    B --> C[🔐 Authentification Firebase]
    C --> D[📡 Backend Railway RAG]
    D --> E[🔍 Recherche Pinecone]
    E --> F[📚 Top 3 workflows similaires]
    F --> G[🤖 Génération Claude 4 Sonnet]
    G --> H[✅ Validation workflow n8n]
    H --> I[📋 Simulation copier-coller natif]
    I --> J[📥 Import automatique dans n8n]
```

### Authentification Firebase

L'extension utilise le pattern officiel Manifest V3 pour l'authentification :

```javascript
// Offscreen document pour Firebase Auth
// src/background.js gère la communication
// Firebase Auth avec Google Sign-In
// Tokens gérés automatiquement
// Quotas synchronisés en temps réel
```

## 💻 Fonctionnalités avancées

### 🎯 Import natif (Simulation copier-coller)

L'extension simule exactement le comportement natif de n8n :

```javascript
// 1. Met le workflow JSON dans le clipboard
await navigator.clipboard.writeText(workflowJSON);

// 2. Focus sur l'éditeur n8n
const editorCanvas = document.querySelector('[data-test-id="canvas"]');
editorCanvas.focus();

// 3. Simule Ctrl+V natif
const pasteEvent = new ClipboardEvent('paste', {
  clipboardData: new DataTransfer()
});
editorCanvas.dispatchEvent(pasteEvent);
```

### 🔄 Streaming avec feedback

```javascript
// Écoute des événements SSE du backend
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'setup':
      updateUI('Initialisation du service RAG...');
      break;
    case 'search':
      updateUI('Recherche de workflows similaires...');
      break;
    case 'claude_call':
      updateUI('Génération avec Claude 4 Sonnet...');
      break;
    case 'complete':
      importWorkflow(data.data.workflow);
      break;
  }
};
```

### ✅ Validation complète

L'extension valide les workflows comme n8n :

```javascript
// Validation de la structure
validateWorkflowStructure(workflow);

// Validation des nœuds
workflow.nodes.forEach(node => validateNode(node));

// Validation des connexions
validateConnections(workflow.connections);

// Correction automatique si nécessaire
fixCommonIssues(workflow);
```

## 📊 Interface utilisateur

### Panel principal

- **Chat interface** moderne avec messages
- **Indicateurs de progression** temps réel
- **Historique** des dernières générations
- **Informations quotas** (tokens restants, plan)
- **Boutons d'action** rapides

### Authentification

- **Modal Firebase** intégrée
- **Connexion Google** en un clic
- **Gestion d'erreurs** avec feedback utilisateur
- **État de connexion** persistant

### Gestion des quotas

- **Barre de progression** tokens utilisés
- **Notifications** quand quota bas
- **Lien upgrade** vers plan PRO
- **Statistiques d'usage** détaillées

## 🔍 Dépannage

### L'extension ne se charge pas

**Symptômes** : Bouton 🤖 n'apparaît pas
**Solutions** :
1. Vérifiez que vous êtes sur une page de workflow n8n
2. Rechargez la page (Ctrl+R)
3. Vérifiez l'extension dans `chrome://extensions/`
4. Pour domaines personnalisés, utilisez la popup d'activation

### Problèmes d'authentification

**Symptômes** : "Connexion échouée" ou "Token expiré"
**Solutions** :
1. Cliquez "Se déconnecter" puis reconnectez-vous
2. Vérifiez que les popups ne sont pas bloquées
3. Autorisez l'accès clipboard dans Chrome
4. Videz le cache de l'extension

### Les workflows ne s'importent pas

**Symptômes** : Génération réussie mais rien ne se passe
**Solutions** :
1. Vérifiez les permissions d'édition n8n
2. Assurez-vous d'être sur une page d'édition de workflow
3. Regardez la console Chrome (F12) pour les erreurs
4. Réessayez avec un workflow plus simple

### Quota épuisé

**Symptômes** : "Quota exceeded" ou génération bloquée
**Solutions** :
1. Attendez le reset mensuel (plan FREE)
2. Passez au plan PRO pour plus de tokens
3. Vérifiez vos statistiques d'usage dans l'interface

### Debug avancé

Pour activer les logs détaillés :

```javascript
// Dans la console Chrome (F12)
localStorage.setItem('n8n-ai-debug', 'true');
// Rechargez la page
```

## 🚀 Développement

### Configuration locale

Pour développer avec un backend local :

```javascript
// src/config.js
const CONFIG = {
  API_URL: 'http://localhost:3000/api/claude',
  API_BASE_URL: 'http://localhost:3000',
  // ... autres paramètres inchangés
};
```

### Tests

```bash
# Démarrer le backend local
cd ../
npm run dev

# Recharger l'extension dans chrome://extensions/
# Tester sur n8n.io ou instance locale
```

### Structure de développement

- **background.js** : Service Worker principal (communication backend)
- **content.js** : Interface utilisateur intégrée dans n8n (3600+ lignes)
- **inject.js** : Accès au store Pinia de n8n (1500+ lignes)
- **popup.js** : Interface d'activation domaines personnalisés

## 🔒 Sécurité et confidentialité

### Données utilisateur
- **Aucune sauvegarde** des workflows générés côté serveur
- **Authentification Firebase** sécurisée avec tokens courts
- **Communications HTTPS** exclusivement
- **Pas de tracking** publicitaire ou analytique

### Permissions
- **activeTab** : Interaction avec l'onglet n8n actuel uniquement
- **scripting** : Injection de scripts dans n8n
- **storage** : Sauvegarde préférences utilisateur localement
- **offscreen** : Firebase Auth dans document isolé

## 📄 License

MIT License - Compatible avec l'écosystème n8n open source.

## 🙏 Support

- **Documentation** : Ce README et documentation API
- **Issues** : GitHub Issues pour bugs et suggestions
- **Community** : Discord n8n pour support communautaire
- **Pro Support** : Support prioritaire pour utilisateurs PRO

---

**Développé avec ❤️ pour la communauté n8n**

*Extension Chrome intelligente alimentée par Claude 4 Sonnet, Firebase Auth et plus de 2055 workflows réels* 