# 🚀 n8n Workflow RAG Backend

Backend intelligent pour la génération de workflows n8n basé sur l'IA et RAG (Retrieval-Augmented Generation). Ce système utilise Claude 4 Sonnet et une base vectorielle de 2055+ workflows réels pour créer des workflows personnalisés en langage naturel.

## 🎯 Qu'est-ce que c'est ?

Ce backend permet de :
- **Décrire en langage naturel** le workflow n8n que vous voulez créer
- **Rechercher automatiquement** des workflows similaires dans une base vectorielle (Pinecone)  
- **Générer un nouveau workflow** adapté à vos besoins avec Claude 4 Sonnet
- **Utiliser directement** le workflow généré dans n8n
- **Gérer l'authentification** via Firebase avec plans FREE/PRO
- **Système de quotas** avec facturation Stripe pour usage dépassé

## 🏗️ Architecture

```
cursor-n8n-backend/
├── server.js                   # Serveur Express principal
├── api/
│   ├── claude.js              # API génération workflows (RAG + SSE)
│   ├── pricing.js             # API pricing et facturation Stripe  
│   ├── rag/
│   │   └── workflow-rag-service.js  # Service RAG principal
│   ├── services/
│   │   ├── firebase-service.js      # Service authentification Firebase
│   │   └── stripe-service.js        # Service facturation Stripe
│   └── middleware/
│       └── auth.js            # Middleware authentification combiné
├── workflows-rag-optimized/    # 2055+ workflows optimisés pour RAG
└── vibe-n8n-chrome-extension/ # Extension Chrome avec Firebase auth
```

## 🔧 Installation

### Prérequis

- Node.js (v18+)  
- Clés API requises :
  - **Anthropic (Claude)** : Pour la génération de workflows
  - **Pinecone** : Pour la base de données vectorielle  
  - **OpenAI** : Pour les embeddings text-embedding-3-small
  - **Firebase** : Pour l'authentification utilisateur (optionnel)
  - **Stripe** : Pour la facturation (optionnel)

### Configuration

1. **Créer un fichier `.env`** à la racine :
```env
# Obligatoire pour le système RAG
CLAUDE_API_KEY=sk-ant-api03-...
PINECONE_API_KEY=votre_clé_pinecone  
OPENAI_API_KEY=sk-...
PINECONE_WORKFLOW_INDEX=n8n-workflows

# Authentification backend legacy (requis)
BACKEND_API_KEY=votre-token-securise

# Firebase (optionnel - pour auth utilisateur)
FIREBASE_PROJECT_ID=votre-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@votre-project.iam.gserviceaccount.com

# Stripe (optionnel - pour facturation)  
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# Environnement
NODE_ENV=production
```

2. **Installer les dépendances** :
```bash
npm install
```

3. **Vérifier que l'index Pinecone existe** avec vos 2055+ workflows indexés

## 🚀 Utilisation

### Démarrer le backend

```bash
npm start
# ou pour le développement
npm run dev
```

Le backend démarre sur http://localhost:3000  
**Production** : https://vibe-n8n-production.up.railway.app

### API Endpoints Principaux

#### 🤖 Génération de workflows avec streaming SSE
```
POST /api/claude
Authorization: Bearer YOUR_API_KEY (legacy) ou Firebase ID Token
Content-Type: application/json

{
  "prompt": "Créer un workflow qui synchronise Slack avec Notion toutes les heures"
}
```

**Réponse streaming (SSE)** avec événements de progression :
- `setup` : Initialisation
- `search` : Recherche dans Pinecone  
- `context_building` : Construction du contexte
- `claude_call` : Génération avec Claude
- `complete` : Workflow terminé

#### 🔐 Authentification et profil utilisateur
```
GET /api/me
Authorization: Bearer FIREBASE_ID_TOKEN

# Réponse avec plan, quotas, usage
```

#### 💳 Création session checkout Stripe
```  
POST /api/create-checkout-session
Authorization: Bearer FIREBASE_ID_TOKEN

{
  "success_url": "https://...",
  "cancel_url": "https://..."
}
```

### Exemples de prompts

#### Workflows simples
- "Créer un workflow qui envoie un email toutes les heures"
- "Workflow simple avec un trigger webhook et notification Slack"
- "Automatisation qui sauvegarde des données dans Google Sheets"

#### Workflows complexes  
- "Synchroniser Slack avec Notion : récupérer messages, créer pages, notification Discord si erreur"
- "Pipeline e-commerce : trigger Shopify → HubSpot → notification Slack → email client Gmail"
- "Bot Discord avec OpenAI qui répond aux questions et sauvegarde dans base de données"

#### Mode amélioration  
```json
{
  "prompt": "Ajoute une notification par email en cas d'erreur",
  "baseWorkflow": {
    "name": "Mon workflow existant", 
    "nodes": [...],
    "connections": {...}
  }
}
```

## 🧠 Système RAG

### Pipeline de génération

1. **Embedding** : Votre prompt → vecteur OpenAI `text-embedding-3-small`
2. **Recherche** : Top 3 workflows similaires dans Pinecone (score > 0.3)
3. **Contexte** : Chargement des workflows complets depuis `workflows-rag-optimized/`  
4. **Génération** : Claude 4 Sonnet avec contexte RAG (température 0.3)
5. **Validation** : Structure workflow n8n complète et fonctionnelle
6. **Streaming** : Transmission progressive via SSE avec chunking si nécessaire

### Base de connaissances
- **2055+ workflows** réels optimisés pour RAG
- **Descriptions GPT-4** pour améliorer la recherche sémantique  
- **Métadonnées** : types de nœuds, complexité, catégories
- **Index Pinecone** : Recherche vectorielle ultra-rapide

## 🔐 Authentification & Pricing

### Plans disponibles

#### FREE
- **70,000 tokens** input par mois
- Génération workflows IA  
- Extension Chrome
- Support communautaire

#### PRO ($20/mois)
- **1,000,000 tokens** input par mois
- Usage-based billing optionnel après quota
- Support prioritaire
- Statistiques avancées

### Authentification combinée
- **Firebase Auth** : Nouveau système avec plans et quotas
- **Legacy API Key** : Compatibilité avec ancien système (tokens illimités)

## 🚀 Déploiement

### Railway (Production)

Le backend est déployé sur Railway avec auto-scaling :

```bash
# URL de production  
https://vibe-n8n-production.up.railway.app

# Monitoring
Railway Dashboard avec logs temps réel
```

### Configuration Railway
1. **Connecter le repo** GitHub à Railway
2. **Variables d'environnement** : Copier toutes les variables de `.env`
3. **Auto-deploy** : Push sur `main` déclenche le déploiement

### Local (Développement)
```bash
# Installation
npm install

# Configuration  
cp .env.example .env
# Compléter .env avec vos clés API

# Démarrage avec hot-reload
npm run dev

# Tests
npm run test
npm run test:quick
```

## 🔧 Extension Chrome

L'extension Chrome (`vibe-n8n-chrome-extension/`) s'intègre directement dans n8n avec :

- **Authentification Firebase** complète
- **Gestion des quotas** en temps réel  
- **Interface moderne** inspirée VS Code
- **Import natif** via simulation copier-coller
- **Support domaines personnalisés** n8n

### Installation extension
1. Chrome → `chrome://extensions/`
2. Mode développeur → "Charger extension non empaquetée"  
3. Sélectionner `vibe-n8n-chrome-extension/`
4. Utiliser sur n8n.io ou votre instance personnelle

## 📊 Monitoring

### Health checks
```bash
# Statut global
curl https://vibe-n8n-production.up.railway.app/api

# Monitoring détaillé  
curl https://vibe-n8n-production.up.railway.app/api/status
```

### Métriques performance
- **Recherche Pinecone** : 0.2-0.8s
- **Génération Claude** : 5-30s  
- **Workflow complet** : 8-45s selon complexité
- **Compression** : Réduction 60-80% pour workflows > 10KB

## 🔍 Troubleshooting

### Erreur "No similar workflows found"
- Vérifier l'index Pinecone et les 2055+ workflows indexés
- Variables `PINECONE_API_KEY` et `PINECONE_WORKFLOW_INDEX`

### Authentification échoue
- **Firebase** : Vérifier la configuration Firebase Admin SDK
- **Legacy** : Vérifier `BACKEND_API_KEY` dans headers Authorization

### Génération Claude échoue  
- Vérifier `CLAUDE_API_KEY` et quotas Anthropic
- Logs détaillés dans Railway Dashboard

### Workflows introuvables
- Vérifier dossier `workflows-rag-optimized/` (2055 fichiers JSON)
- Permissions de lecture sur le système de fichiers

## 🎯 Structure d'un workflow n8n

```json
{
  "name": "Mon Workflow",
  "nodes": [
    {
      "id": "unique-id", 
      "name": "Nom du nœud",
      "type": "n8n-nodes-base.webhook",
      "position": [x, y],
      "parameters": { ... },
      "typeVersion": 1.1
    }
  ],
  "connections": {
    "Nom du nœud": {
      "main": [[{ "node": "Autre nœud", "type": "main", "index": 0 }]]
    }
  }
}
```

## 📄 License

MIT License - Voir LICENSE pour plus de détails

---

## 🚀 Migration depuis l'ancien système

Ce backend (v2.0) remplace entièrement l'ancien système avec :

- ✅ **RAG optimisé** : 2055+ workflows réels vs anciens node-types
- ✅ **Claude 4 Sonnet** : Modèle le plus avancé  
- ✅ **Firebase Auth** : Gestion utilisateurs et quotas
- ✅ **Stripe billing** : Plans FREE/PRO avec usage-based
- ✅ **Performance** : Recherche vectorielle + streaming SSE
- ✅ **Extension moderne** : Interface intégrée avec authentification

**Développé avec ❤️ pour la communauté n8n** 
*Backend RAG intelligent alimenté par Claude 4 Sonnet, Pinecone et 2055+ workflows réels* 