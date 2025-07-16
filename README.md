# 🚀 n8n Workflow RAG Backend

Backend API pour la génération de workflows n8n basé sur l'IA. Ce système utilise RAG (Retrieval-Augmented Generation) pour créer des workflows personnalisés en s'inspirant d'une base de 2055+ exemples réels.

## 🎯 Qu'est-ce que c'est ?

Ce backend permet de :
- **Décrire en langage naturel** le workflow n8n que vous voulez créer
- **Rechercher automatiquement** des workflows similaires dans une base vectorielle (Pinecone)
- **Générer un nouveau workflow** adapté à vos besoins avec Claude AI
- **Télécharger le workflow** prêt à importer dans n8n

## 🏗️ Architecture

```
cursor-n8n-backend/
├── api/
│   ├── claude.js               # API principale pour génération de workflows
│   ├── index.js               # Page d'accueil
│   └── rag/
│       └── workflow-rag-service.js  # Service RAG principal
├── workflows/                 # 2055 workflows d'exemple
└── vibe-n8n-chrome-extension/ # Extension Chrome (optionnelle)
```

## 🔧 Installation

### Prérequis

- Node.js (v16+)
- Clés API :
  - **Pinecone** : Pour la base de données vectorielle
  - **OpenAI** : Pour les embeddings
  - **Anthropic (Claude)** : Pour la génération de workflows

### Configuration

1. **Créer un fichier `.env`** à la racine :
```env
# Obligatoire pour le système RAG
PINECONE_API_KEY=votre_clé_pinecone
OPENAI_API_KEY=votre_clé_openai
CLAUDE_API_KEY=votre_clé_anthropic
PINECONE_WORKFLOW_INDEX=n8n-workflows

# Authentification backend
BACKEND_API_KEY=votre-token-securise
```

2. **Installer les dépendances** :
```bash
npm install
```

3. **Vérifier que l'index Pinecone existe** avec vos workflows indexés

## 🚀 Utilisation

### Démarrer le backend

```bash
npm run dev
# ou pour la production
npm start
```

Le backend démarre sur http://localhost:3000

### API Endpoints

#### Génération de workflow
```
POST /api/claude
```

**Headers requis :**
```javascript
{
  'Authorization': 'Bearer YOUR_BACKEND_API_KEY',
  'Content-Type': 'application/json'
}
```

**Body de la requête :**
```json
{
  "prompt": "Créer un workflow qui synchronise Slack avec Notion"
}
```

**Réponse :**
```json
{
  "prompt": "Créer un workflow qui synchronise Slack avec Notion",
  "timestamp": "2025-01-15T10:30:00Z",
  "pineconeResults": {
    "total": 5,
    "workflows": [...]
  },
  "generationResult": {
    "success": true,
    "workflow": {...},
    "basedOn": ["Workflow 1", "Workflow 2"]
  }
}
```

Le workflow complet est directement dans `generationResult.workflow` et peut être utilisé immédiatement.

### Exemples de prompts

- "Créer un workflow qui synchronise Slack avec Notion"
- "Bot Discord qui utilise ChatGPT pour répondre aux messages"
- "Automatiser la création d'articles de blog avec GPT-4 et Perplexity"
- "Workflow pour analyser des tweets et créer un rapport hebdomadaire"
- "Pipeline de traitement de fichiers CSV avec envoi par email"

## 🧠 Comment ça fonctionne ?

### 1. Embedding & Recherche
- Votre prompt est converti en vecteur avec OpenAI Embeddings (`text-embedding-3-small`)
- Pinecone recherche les workflows les plus similaires (top 10, score minimum 0.3)
- Les métadonnées incluent : nom, types de nœuds, description

### 2. Chargement des exemples
- Les 3 workflows les plus pertinents sont chargés depuis le disque
- Le JSON complet de chaque workflow est récupéré

### 3. Génération avec Claude
- Claude reçoit :
  - Votre description
  - Les 3 workflows d'exemple complets
  - Des instructions pour générer un nouveau workflow
- Claude génère un workflow JSON valide et fonctionnel

### 4. Réponse API
- Le workflow généré est renvoyé directement dans la réponse JSON
- Prêt à être utilisé immédiatement par le client

## 📊 Base de données

- **2055 workflows** d'exemples réels
- **Catégories variées** : automatisation, intégration, IA, données, etc.
- **Indexés dans Pinecone** avec embeddings OpenAI

## 🔍 Détails techniques

### Service RAG (`api/rag/workflow-rag-service.js`)

```javascript
// Recherche de workflows similaires
async findSimilarWorkflows(description, topK = 5)

// Génération basée sur des exemples
async generateWorkflowFromExamples(description, options)

// Recherche simple
async searchWorkflows(query, options)
```

### Modèles utilisés

- **Embeddings** : `text-embedding-3-small` (OpenAI)
- **Génération** : `claude-sonnet-4-20250514` (Anthropic)
- **Température** : 0.3 (pour des résultats cohérents)

## 📡 Déploiement sur Railway

Railway est recommandé car il n'a pas de limite de timeout.

### Déploiement rapide :

1. **Pusher sur GitHub**
```bash
git add .
git commit -m "Deploy RAG workflow system"
git push origin main
```

2. **Déployer sur Railway**
- Aller sur [railway.app](https://railway.app)
- "New Project" → "Deploy from GitHub repo"
- Sélectionner votre repository

3. **Configurer les variables**
Dans Railway, ajouter toutes les variables de votre `.env`

4. **URL publique**
Railway génère automatiquement une URL `https://your-app.railway.app/`

## 🔧 Configuration de l'extension Chrome

Si vous utilisez l'extension Chrome (optionnelle), mettre à jour `vibe-n8n-chrome-extension/src/config.js` :

```javascript
const CONFIG = {
  API_URL: 'https://your-app.railway.app/api/claude',
  API_KEY: 'your-backend-api-key',
};
```

## 📊 Monitoring et Debug

### Vérifier le statut
```bash
curl https://your-app.railway.app/api
```

Réponse attendue :
```json
{
  "status": "ok",
  "environment": "RAG Workflow Backend"
}
```

### Tester la génération
```bash
curl -X POST https://your-app.railway.app/api/claude \
  -H "Authorization: Bearer YOUR_BACKEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Créer un workflow simple avec un webhook trigger"
  }'
```

## 🚨 Troubleshooting

### Erreur "No similar workflows found"
- Vérifiez que l'index Pinecone contient des données
- Vérifiez les variables `PINECONE_API_KEY` et `PINECONE_WORKFLOW_INDEX`

### Erreur de génération Claude
- Vérifiez `CLAUDE_API_KEY`
- Vérifiez que vous avez suffisamment de crédits Claude

### Workflows introuvables
- Vérifiez que le dossier `workflows/` contient les 2055 fichiers JSON
- Vérifiez les permissions de lecture

### Variables d'environnement manquantes
```bash
# Vérifier la configuration
echo $PINECONE_API_KEY
echo $CLAUDE_API_KEY
echo $OPENAI_API_KEY
```

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
      "parameters": { ... }
    }
  ],
  "connections": {
    "Nom du nœud": {
      "main": [[{ "node": "Autre nœud", "type": "main", "index": 0 }]]
    }
  }
}
```

## 🚀 Évolutions possibles

- Interface web intégrée
- Support multi-langues
- Fine-tuning sur des workflows spécifiques
- Export direct vers n8n
- Validation avancée des workflows
- Indexation automatique de nouveaux workflows

## 📄 License

MIT License - Voir LICENSE pour plus de détails

---

## Migration depuis l'ancien système

Ce backend remplace entièrement l'ancien système MCP/node-types. Principales différences :

- ✅ **RAG Workflow** : Génération basée sur 2055 exemples réels
- ✅ **Claude Sonnet 4** : Modèle le plus récent d'Anthropic  
- ✅ **Simplicité** : Un seul endpoint `/api/claude`
- ✅ **Performance** : Recherche vectorielle optimisée
- ❌ **MCP obsolète** : Plus de dépendance aux outils MCP
- ❌ **Node-types** : Plus de système de récupération des métadonnées

Le nouveau système est plus simple, plus performant et génère des workflows directement utilisables. 