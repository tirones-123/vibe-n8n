# n8n Workflow RAG Backend API

Backend intelligent pour la génération de workflows n8n basé sur RAG (Retrieval-Augmented Generation) avec Claude 4 Sonnet, Pinecone et plus de 2055 exemples de workflows réels.

## 🚀 Vue d'ensemble

Ce backend fournit une API REST avec streaming SSE pour générer des workflows n8n complets basés sur des descriptions en langage naturel. Il utilise un système RAG sophistiqué qui :

1. **Recherche sémantique** dans 2055+ workflows indexés dans Pinecone
2. **Sélectionne les 3 meilleurs exemples** les plus pertinents
3. **Génère un workflow complet** avec Claude 4 Sonnet
4. **Valide et optimise** la structure pour n8n
5. **Streaming temps réel** avec feedback de progression

## 📊 Architecture

```mermaid
graph TD
    A[Extension Chrome] --> B[API Claude /api/claude]
    B --> C[Workflow RAG Service]
    C --> D[Pinecone Vector Search]
    C --> E[Claude 4 Sonnet]
    C --> F[OpenAI Embeddings]
    D --> G[2055+ Workflows DB]
    C --> H[SSE Streaming Response]
    H --> A
```

## 📁 Structure des fichiers

```
api/
├── README.md                    # Ce fichier
├── index.js                     # Routes principales et health checks
├── claude.js                    # Handler principal génération workflows
└── rag/
    └── workflow-rag-service.js   # Service RAG complet (Pinecone + Claude)
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

# Authentification backend (requis)
BACKEND_API_KEY=your-secure-backend-key

# Optionnel
NODE_ENV=production
```

### Dépendances

```json
{
  "@pinecone-database/pinecone": "^3.0.0",
  "@anthropic-ai/sdk": "^0.27.0",
  "openai": "^4.63.0"
}
```

## 🌐 Endpoints API

### `POST /api/claude`

**Génération de workflows avec streaming SSE**

#### Headers requis
```
Authorization: Bearer YOUR_BACKEND_API_KEY
Content-Type: application/json
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
data: {"type": "chunk", "data": {"index": 4, "total": 5, "data": "...", "isLast": true}}

data: {"type": "chunking_complete", "data": {"message": "Workflow transmis avec succès!", "totalChunks": 5}}
```

### `GET /api`

**Health check et informations**

```json
{
  "status": "ok",
  "environment": "RAG Workflow Backend",
  "timestamp": "2025-01-17T10:30:00.000Z",
  "endpoints": {
    "/api/claude": "POST - Génération de workflows (SSE)",
    "/api/fallback": "POST - Récupération fallback",
    "/api/status": "GET - Monitoring du système"
  }
}
```

### `GET /api/status`

**Monitoring du système**

```json
{
  "status": "operational",
  "timestamp": "2025-01-17T10:30:00.000Z",
  "uptime": 86400.123,
  "memory": {
    "rss": 134217728,
    "heapTotal": 67108864,
    "heapUsed": 45088768,
    "external": 2097152
  },
  "environment": "production"
}
```

### `POST /api/fallback`

**Récupération fallback pour gros workflows**

```json
{
  "sessionId": "session_1705491234567_abc123",
  "action": "get_workflow"
}
```

## 🎯 Système RAG Détaillé

### 1. Base de connaissances
- **2055+ workflows** réels indexés dans Pinecone
- **Descriptions GPT-4** pour chaque workflow
- **Embeddings text-embedding-3-small** pour recherche sémantique
- **Métadonnées** : types de nœuds, complexité, domaine d'application

### 2. Pipeline de génération

#### Étape 1 : Recherche sémantique
```javascript
// Génération embedding de la requête utilisateur
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: userDescription
});

// Recherche dans Pinecone (top 3)
const results = await pinecone.query({
  vector: embedding,
  topK: 3,
  includeMetadata: true
});
```

#### Étape 2 : Construction du contexte
```javascript
// Chargement des workflows complets depuis workflows-rag-optimized/
const workflows = await Promise.all(
  results.matches.map(match => 
    fs.readFile(`workflows-rag-optimized/${match.metadata.filename}`)
  )
);
```

#### Étape 3 : Génération Claude
```javascript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 18000,
  temperature: 0.3,
  system: systemPrompt,
  messages: [{ role: 'user', content: userPrompt }]
});
```

### 3. Optimisations de transmission

**Petits workflows (< 10KB)**
- Envoi direct JSON

**Workflows moyens (10KB - 100KB)**
- Compression gzip + base64
- Décompression côté client

**Gros workflows (> 100KB)**
- Découpage en chunks de 32KB
- Transmission séquentielle avec délais
- Réassemblage côté client

## 📊 Monitoring et Statistiques

Le backend maintient des statistiques en temps réel :

```javascript
let requestStats = {
  total: 0,           // Nombre total de requêtes
  success: 0,         // Requêtes réussies
  errors: 0,          // Requêtes échouées
  largeWorkflows: 0,  // Workflows > 50KB
  compressionUsed: 0, // Fois où compression utilisée
  chunkingUsed: 0     // Fois où chunking utilisé
};
```

### Logs détaillés

Chaque requête produit des logs complets :

```
🚀 === WORKFLOW RAG REQUEST 42 ===
📊 Stats actuelles: {total: 42, success: 38, errors: 4}
📝 Prompt: "Crée un workflow qui..."
🔄 Mode détecté: GENERATION
🔍 Pinecone: 3 workflows trouvés
🤖 Claude: 15420 chars de prompt
📦 Workflow: 45KB (compression activée)
✅ Succès en 8.5s
```

## 🚀 Déploiement

### Railway (Production)

1. **Connecter le repo** à Railway
2. **Configurer les variables** d'environnement
3. **Déployer** automatiquement

```bash
# URL de production
https://vibe-n8n-production.up.railway.app
```

### Vercel (Backup)

```bash
# Déploiement
vercel --prod

# URL de backup
https://vibe-n8n.vercel.app
```

### Local (Développement)

```bash
# Installation
npm install

# Configuration
cp .env.example .env
# Éditer .env avec vos clés API

# Démarrage
npm start

# URL locale
http://localhost:3000
```

## 🔧 Configuration avancée

### Timeouts optimisés

```javascript
// OpenAI (embeddings)
timeout: 600000,  // 10 minutes

// Claude (génération)
timeout: 900000,  // 15 minutes

// Pinecone (recherche)
timeout: 30000,   // 30 secondes
```

### Limites de transmission

```javascript
const CONFIG = {
  MAX_CHUNK_SIZE: 32768,      // 32KB par chunk SSE
  COMPRESSION_THRESHOLD: 10240, // Compresser si > 10KB
  LARGE_WORKFLOW_THRESHOLD: 50000 // Considéré comme "gros" si > 50KB
};
```

## 📝 Exemples d'utilisation

### Générer un workflow simple

```bash
curl -X POST https://vibe-n8n-production.up.railway.app/api/claude \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Workflow simple qui envoie un email de test toutes les heures"
  }'
```

### Améliorer un workflow existant

```bash
curl -X POST https://vibe-n8n-production.up.railway.app/api/claude \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Ajoute une notification Slack en cas d'erreur",
    "baseWorkflow": {
      "name": "Mon workflow",
      "nodes": [...],
      "connections": {...}
    }
  }'
```

### Écouter le streaming SSE

```javascript
const eventSource = new EventSource(
  'https://vibe-n8n-production.up.railway.app/api/claude',
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    }
  }
);

eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Étape:', data.type, data.data.message);
  
  if (data.type === 'complete') {
    console.log('Workflow généré:', data.data.workflow);
  }
};
```

## 🔍 Dépannage

### Problèmes courants

#### "Missing required environment variables"
- **Cause** : Variables d'environnement manquantes
- **Solution** : Vérifiez `.env` et Railway/Vercel settings

#### "Pinecone index not found"
- **Cause** : Index Pinecone mal configuré
- **Solution** : Vérifiez `PINECONE_WORKFLOW_INDEX=n8n-workflows`

#### "Claude API rate limit"
- **Cause** : Limite de taux Claude dépassée
- **Solution** : Attendez ou augmentez les limites

#### "Workflow too large for SSE"
- **Cause** : Workflow > 1MB même après compression
- **Solution** : Le système utilise automatiquement le chunking

### Debug logs

```bash
# Activer les logs détaillés
export DEBUG=1

# Vérifier les fichiers debug générés
ls debug/
# claude-prompt-streaming.json
# claude-raw-response.txt
# system-prompt-streaming.txt
# user-prompt-streaming.txt
```

### Health checks

```bash
# Vérifier le statut du backend
curl https://vibe-n8n-production.up.railway.app/api/status

# Vérifier les endpoints
curl https://vibe-n8n-production.up.railway.app/api
```

## 📊 Performance

### Métriques typiques

| Métrique | Valeur typique |
|----------|----------------|
| Temps de recherche Pinecone | 0.2 - 0.8s |
| Temps de génération Claude | 5 - 30s |
| Workflow simple (< 10KB) | 8 - 15s |
| Workflow moyen (10-100KB) | 12 - 25s |
| Gros workflow (> 100KB) | 20 - 45s |

### Optimisations

- **Cache Pinecone** : Résultats mis en cache 5min
- **Streaming Claude** : Réponse en temps réel
- **Compression gzip** : Réduction 60-80% de la taille
- **Chunking adaptatif** : Transmission progressive

## 🔒 Sécurité

### Authentification

- **Bearer token** requis pour toutes les requêtes
- **CORS** configuré pour domaines autorisés
- **Rate limiting** côté Claude et Pinecone

### Validation

- **Input sanitization** des prompts utilisateur
- **JSON validation** des workflows générés
- **Size limits** pour éviter les abus

## 📄 License

MIT License - Compatible avec l'écosystème n8n open source.

---

**Développé avec ❤️ pour la communauté n8n**

*Backend RAG intelligent alimenté par Claude 4 Sonnet, Pinecone et 2055+ workflows réels* 