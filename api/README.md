# n8n Workflow RAG Backend API

Backend intelligent pour la génération de workflows n8n basé sur RAG (Retrieval-Augmented Generation) avec Claude 4 Sonnet, Pinecone et plus de 2055 workflows réels. Inclut authentification Firebase et système de pricing Stripe.

## 🚀 Vue d'ensemble

Ce backend fournit une API REST avec streaming SSE pour générer des workflows n8n complets basés sur des descriptions en langage naturel. Il combine :

1. **Système RAG avancé** : Recherche sémantique dans 2055+ workflows indexés
2. **Claude 4 Sonnet** : Génération de workflows intelligente avec contexte
3. **Authentification Firebase** : Gestion utilisateurs avec plans FREE/PRO
4. **Facturation Stripe** : Quotas et usage-based billing
5. **Streaming SSE** : Réponses en temps réel avec feedback de progression

## 📊 Architecture

```mermaid
graph TD
    A[Extension Chrome / Client] --> B[API Backend]
    B --> C[Auth: Firebase + Legacy]
    B --> D[Workflow RAG Service]
    D --> E[Pinecone Vector Search]
    D --> F[Claude 4 Sonnet]
    D --> G[OpenAI Embeddings]
    E --> H[2055+ Workflows DB]
    B --> I[Stripe Billing]
    B --> J[SSE Streaming Response]
    J --> A
```

## 📁 Structure des fichiers

```
api/
├── README.md                    # Ce fichier
├── index.js                     # Health checks et routes de base
├── claude.js                    # Endpoint principal génération workflows (SSE)
├── pricing.js                   # Endpoints facturation et profil utilisateur
├── middleware/
│   └── auth.js                  # Authentification combinée (Firebase + Legacy)
├── services/
│   ├── firebase-service.js      # Service Firebase (auth + quotas)
│   └── stripe-service.js        # Service Stripe (facturation)
└── rag/
    └── workflow-rag-service.js  # Service RAG complet (Pinecone + Claude)
```

## 🛠️ Configuration requise

### Variables d'environnement

```bash
# Claude API (requis)
CLAUDE_API_KEY=sk-ant-api03-...

# Pinecone Vector Database (requis)
PINECONE_API_KEY=your-pinecone-key
PINECONE_WORKFLOW_INDEX=n8n-workflows

# OpenAI pour embeddings (requis)
OPENAI_API_KEY=sk-...

# Authentification backend legacy (requis)
BACKEND_API_KEY=your-secure-backend-key

# Firebase Admin SDK (optionnel - pour auth utilisateur)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com

# Stripe (optionnel - pour facturation)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# Environnement
NODE_ENV=production
```

### Dépendances principales

```json
{
  "@anthropic-ai/sdk": "^0.56.0",
  "@pinecone-database/pinecone": "^4.1.0",
  "openai": "^4.104.0",
  "firebase-admin": "^12.0.0",
  "stripe": "^14.0.0",
  "express": "^4.18.2"
}
```

## 🌐 Endpoints API

### `POST /api/claude`

**Génération de workflows avec streaming SSE**

#### Authentification

**Option 1 : Legacy API Key**
```
Authorization: Bearer d5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2
```

**Option 2 : Firebase ID Token**
```
Authorization: Bearer FIREBASE_ID_TOKEN
```

#### Payload - Mode Génération (nouveau workflow)
```json
{
  "prompt": "Crée un workflow qui synchronise Slack avec Notion toutes les heures"
}
```

#### Payload - Mode Amélioration (workflow existant)
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

#### Réponse Streaming (SSE)

**Événements de progression :**
```
data: {"type": "setup", "data": {"message": "Initialisation du service RAG..."}}

data: {"type": "search", "data": {"message": "Recherche de workflows similaires..."}}

data: {"type": "context_building", "data": {"message": "Construction du contexte...", "workflows": ["Workflow 1", "Workflow 2"]}}

data: {"type": "claude_call", "data": {"message": "Génération avec Claude 4 Sonnet...", "promptLength": 15420}}

data: {"type": "parsing", "data": {"message": "Traitement de la réponse..."}}
```

**Workflow simple (< 10KB) :**
```
data: {"type": "complete", "data": {"success": true, "workflow": {...}, "explanation": {...}}}
```

**Workflow moyen (10-100KB) :**
```
data: {"type": "compression", "data": {"message": "Compression du workflow...", "nodesCount": 15}}

data: {"type": "compressed_complete", "data": {"success": true, "compressed": true, "data": "base64...", "originalSize": 25600}}
```

**Gros workflow (> 100KB) :**
```
data: {"type": "chunking_start", "data": {"message": "Envoi en 5 parties...", "totalChunks": 5}}

data: {"type": "chunk", "data": {"index": 0, "total": 5, "data": "...", "isLast": false}}
...
data: {"type": "chunking_complete", "data": {"message": "Workflow transmis avec succès!", "totalChunks": 5}}
```

### `GET /api/me`

**Profil utilisateur avec quotas (Firebase Auth requis)**

```json
{
  "uid": "firebase-user-id",
  "email": "user@example.com",
  "plan": "PRO",
  "remaining_tokens": 850000,
  "usage_percentage": 15,
  "subscription": {
    "status": "active",
    "current_period_end": "2025-02-17T00:00:00Z"
  }
}
```

### `POST /api/create-checkout-session`

**Création session Stripe pour upgrade PRO (Firebase Auth requis)**

```json
{
  "success_url": "https://app.example.com/success",
  "cancel_url": "https://app.example.com/cancel"
}
```

**Réponse :**
```json
{
  "session_id": "cs_test_...",
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "customer_id": "cus_..."
}
```

### `POST /api/report-usage`

**Rapport d'usage après génération (Firebase Auth requis)**

```json
{
  "input_tokens": 15000,
  "output_tokens": 3000
}
```

### `POST /api/stripe-webhook`

**Webhook Stripe pour gestion des abonnements**

Headers requis : `stripe-signature`
Body : Raw webhook data

### `GET /api/pricing`

**Informations sur les plans et tarifs**

```json
{
  "plans": {
    "free": {
      "name": "Free",
      "price_usd": 0,
      "tokens_included": 70000,
      "features": [...]
    },
    "pro": {
      "name": "Pro", 
      "price_usd": 20,
      "tokens_included": 1000000,
      "overage_rate": 0.00002,
      "features": [...]
    }
  }
}
```

### `GET /api` et `GET /api/status`

**Health checks et monitoring**

```json
{
  "status": "operational",
  "timestamp": "2025-01-17T10:30:00.000Z",
  "uptime": 86400.123,
  "memory": {...},
  "environment": "production"
}
```

## 🎯 Système RAG Détaillé

### 1. Base de connaissances
- **2055+ workflows** réels optimisés dans `workflows-rag-optimized/`
- **Descriptions GPT-4** pour chaque workflow améliorer la recherche
- **Embeddings text-embedding-3-small** pour recherche sémantique
- **Index Pinecone** avec métadonnées : types de nœuds, complexité, domaines

### 2. Pipeline de génération

#### Étape 1 : Recherche sémantique
```javascript
// Génération embedding de la requête utilisateur
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: userDescription,
  timeout: 600000
});

// Recherche dans Pinecone (top 3, score > 0.3)
const results = await pinecone.query({
  vector: embedding.data[0].embedding,
  topK: 3,
  includeMetadata: true
});
```

#### Étape 2 : Construction du contexte
```javascript
// Chargement des workflows complets optimisés pour RAG
const workflows = await Promise.all(
  results.matches.map(match => 
    fs.readFile(`workflows-rag-optimized/${match.metadata.filename}`)
  )
);
```

#### Étape 3 : Génération Claude
```javascript
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 18000,
  temperature: 0.3,
  system: systemPrompt,
  messages: [{ role: 'user', content: contextualPrompt }],
  timeout: 900000
});
```

### 3. Optimisations de transmission

Le système adapte automatiquement la méthode de transmission selon la taille :

- **< 10KB** : Envoi direct JSON
- **10-100KB** : Compression gzip + base64 
- **> 100KB** : Découpage en chunks de 32KB avec transmission séquentielle

## 📊 Authentification & Quotas

### Plans utilisateur

#### FREE
- **70,000 tokens** input par mois
- Remise à zéro automatique chaque mois
- Toutes les fonctionnalités de base

#### PRO ($20/mois) 
- **1,000,000 tokens** input par mois
- Usage-based billing optionnel après quota épuisé
- Statistiques avancées et support prioritaire

### Système d'authentification hybride

```javascript
// L'API accepte deux types d'authentification :

// 1. Legacy API Key (compatibilité)
Authorization: Bearer d5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2

// 2. Firebase ID Token (nouveau système)
Authorization: Bearer FIREBASE_ID_TOKEN

// Le middleware auth.js détecte automatiquement le type
```

## 🚀 Déploiement

### Railway (Production)

Le backend est déployé sur Railway avec configuration automatique :

```bash
# URL production
https://vibe-n8n-production.up.railway.app

# Auto-deployment depuis GitHub
git push origin main  # Déclenche le déploiement
```

### Configuration Railway

1. **Variables d'environnement** : Toutes les vars de `.env`
2. **Auto-scaling** : Gestion automatique de la charge
3. **Logs temps réel** : Monitoring via Railway Dashboard

### Local (Développement)

```bash
# Installation
npm install

# Configuration
cp .env.example .env
# Compléter avec vos clés API

# Démarrage
npm run dev    # Avec hot-reload
npm start      # Production

# Tests
npm run test
npm run test:quick
```

## 📊 Monitoring et Performance

### Métriques typiques

| Opération | Temps typique |
|-----------|---------------|
| Recherche Pinecone | 0.2 - 0.8s |
| Génération Claude | 5 - 30s |
| Workflow complet | 8 - 45s |
| Compression | < 1s |
| Chunking | 2-5s |

### Monitoring en temps réel

```javascript
// Stats maintenues en mémoire
let requestStats = {
  total: 0,
  success: 0,
  errors: 0,
  largeWorkflows: 0,
  compressionUsed: 0,
  chunkingUsed: 0,
  tokenQuotaBlocked: 0
};
```

### Health checks

```bash
# Vérifier le statut global
curl https://vibe-n8n-production.up.railway.app/api/status

# Tester la génération (avec legacy key)
curl -X POST https://vibe-n8n-production.up.railway.app/api/claude \
  -H "Authorization: Bearer d5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Workflow simple avec webhook trigger"}'
```

## 🔍 Dépannage

### Problèmes courants

#### "Missing required environment variables"
- **Cause** : Variables Claude, Pinecone ou OpenAI manquantes
- **Solution** : Vérifier `.env` et configuration Railway

#### "Pinecone index not found" 
- **Cause** : Index `n8n-workflows` introuvable
- **Solution** : Vérifier `PINECONE_WORKFLOW_INDEX` et que l'index existe

#### "Authentication service not available"
- **Cause** : Firebase mal configuré (acceptable pour mode legacy)
- **Solution** : Utiliser l'API key legacy ou configurer Firebase

#### "Invalid Firebase token" / "Invalid API key"
- **Cause** : Token expired ou clé invalide
- **Solution** : Renouveler le token Firebase ou vérifier l'API key

#### "Quota exceeded"
- **Cause** : Utilisateur a épuisé ses tokens mensuels
- **Solution** : Upgrade vers PRO ou attendre reset mensuel

### Debug avancé

```bash
# Logs détaillés sur Railway Dashboard
# Ou localement avec DEBUG=1

export DEBUG=1
npm run dev

# Fichiers de debug générés dans debug/
ls debug/
# claude-prompt-streaming.json
# claude-raw-response.txt
# system-prompt-streaming.txt
```

## 🔒 Sécurité

### Authentification
- **Bearer tokens** obligatoires pour toutes les requêtes
- **Firebase ID tokens** vérifiés côté serveur
- **Legacy API key** pour compatibilité (tokens illimités)

### Validation
- **Input sanitization** des prompts utilisateur
- **JSON validation** des workflows générés  
- **Rate limiting** automatique via quotas
- **CORS** configuré pour domaines autorisés

### Facturation
- **Webhooks Stripe** sécurisés avec signature
- **Quotas** appliqués en temps réel
- **Usage tracking** précis avec Firebase

## 🎯 Intégration Client

### Extension Chrome

L'extension Chrome s'intègre directement avec cette API :

```javascript
// Configuration dans vibe-n8n-chrome-extension/src/config.js
const CONFIG = {
  API_URL: 'https://vibe-n8n-production.up.railway.app/api/claude',
  API_BASE_URL: 'https://vibe-n8n-production.up.railway.app',
  LEGACY_API_KEY: 'd5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2'
};
```

### Écoute SSE côté client

```javascript
const eventSource = new EventSource(apiUrl, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'setup':
      console.log('Initialisation...');
      break;
    case 'search':
      console.log('Recherche dans Pinecone...');
      break;
    case 'complete':
      console.log('Workflow généré:', data.data.workflow);
      break;
  }
};
```

## 📄 License

MIT License - Compatible avec l'écosystème n8n open source.

---

**Développé avec ❤️ pour la communauté n8n**

*API RAG intelligente alimentée par Claude 4 Sonnet, Pinecone et 2055+ workflows réels* 