# n8n AI Assistant Backend

Backend API pour l'extension Chrome n8n AI Assistant. Ce backend fait le pont entre l'extension Chrome et l'API Claude d'Anthropic pour permettre la création et modification de workflows n8n en langage naturel.

## 🚀 Fonctionnalités

- **Génération de workflows n8n** : Création de workflows complets à partir de descriptions en langage naturel
- **Modification intelligente** : Modification de workflows existants avec des commandes naturelles
- **Node-Types dynamiques** : Synchronisation hebdomadaire avec n8n:latest pour toujours avoir les derniers nodes
- **Compatibilité garantie** : Utilise les versions exactes des nodes de votre instance n8n
- **Streaming en temps réel** : Réponses en streaming via Server-Sent Events
- **Sécurisé** : Authentification par token Bearer

## 📋 Prérequis

- Node.js 18+ installé
- Un compte Anthropic avec accès à l'API Claude
- (Optionnel mais recommandé) Un compte OpenAI pour les embeddings
- (Optionnel mais recommandé) Un compte Pinecone pour le stockage vectoriel
- Un compte Railway pour le déploiement

## 🛠️ Installation

### 1. Cloner le repository
```bash
git clone <your-repo-url>
cd cursor-n8n-backend
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer les variables d'environnement
```bash
cp env.example .env
```

Éditer `.env` et ajouter vos clés :

#### Configuration minimale (sans RAG)
```env
# OBLIGATOIRE
CLAUDE_API_KEY=sk-ant-api03-...  # Obtenir sur https://console.anthropic.com/
BACKEND_API_KEY=your-secure-token  # Générer avec: openssl rand -hex 32
```

#### Configuration complète (avec RAG Pinecone)
```env
# OBLIGATOIRE
CLAUDE_API_KEY=sk-ant-api03-...
BACKEND_API_KEY=your-secure-token

# RAG (recommandé pour de meilleures réponses)
OPENAI_API_KEY=sk-...  # Pour générer les embeddings
PINECONE_API_KEY=...   # Stockage vectoriel (gratuit jusqu'à 100k vecteurs)
```

### 4. Lancer en développement
```bash
npm run dev
```

L'API sera disponible sur `http://localhost:3000/api/claude`

## 🔍 Configuration du système Node-Types

Le système Node-Types synchronise automatiquement les métadonnées des nodes n8n pour garantir la compatibilité.

### Étapes de configuration :

1. **Créer un compte Pinecone gratuit**
   - Aller sur [pinecone.io](https://www.pinecone.io/)
   - Le plan gratuit permet 100k vecteurs (largement suffisant)

2. **Obtenir une clé OpenAI**
   - Nécessaire pour générer les embeddings des nodes
   - Coût minimal (~$0.01 pour indexer tous les nodes)

3. **Première indexation**
   ```bash
   # Si vous avez n8n en local
   npm run update-nodes
   
   # Sinon, avec Docker
   npm run update-nodes:docker
   ```

4. **Mise à jour automatique**
   - Railway exécute automatiquement `npm run cron:weekly` tous les lundis
   - Les nodes sont toujours synchronisés avec n8n:latest

### Fonctionnement :

1. **Récupération** : Appel à `/rest/node-types` de n8n pour obtenir tous les nodes
2. **Indexation** : Chaque node est stocké avec son ID unique `nodeName|vX`
3. **Identification** : Claude Haiku identifie les nodes mentionnés dans le prompt
4. **Enrichissement** : Les métadonnées exactes sont ajoutées au contexte
5. **Génération** : Claude Opus crée le workflow avec les bonnes versions

## 📦 Déploiement sur Railway

Railway est recommandé car il n'a pas de limite de timeout (contrairement à Vercel).

### Déploiement rapide :

1. **Pusher sur GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Déployer sur Railway**
- Aller sur [railway.app](https://railway.app)
- "New Project" → "Deploy from GitHub repo"
- Sélectionner votre repository

3. **Configurer les variables**
Dans Railway, ajouter toutes les variables de votre `.env`

4. **URL publique**
Railway génère automatiquement une URL comme `https://your-app.railway.app`

## 📡 Utilisation de l'API

### Endpoint principal
```
POST https://your-app.railway.app/api/claude
```

### Headers requis
```javascript
{
  'Authorization': 'Bearer YOUR_BACKEND_API_KEY',
  'Content-Type': 'application/json'
}
```

### Body de la requête
```json
{
  "prompt": "Crée un workflow qui envoie un email tous les matins",
  "context": {
    "nodes": [],
    "connections": {}
  },
  "tools": [],
  "mode": "create",
  "versions": {
    "gmail": 2,
    "schedule": 1,
    "httpRequest": 5
    // ... mapping complet des versions
  }
}
```

### Exemple avec cURL
```bash
curl -X POST https://your-app.railway.app/api/claude \
  -H "Authorization: Bearer YOUR_BACKEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Crée un workflow simple avec un webhook trigger",
    "context": {},
    "tools": [],
    "mode": "create"
  }'
```

## 🔧 Configuration de l'extension Chrome

Mettre à jour `src/config.js` dans l'extension :

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
  "environment": {
    "claude_configured": true,
    "backend_auth_configured": true,
    "openai_configured": true,
    "pinecone_configured": true,
    "rag_available": true
  }
}
```

### Logs Railway
```bash
railway logs --follow
```

## 🚨 Troubleshooting

### Les node-types ne se chargent pas
1. Vérifier que `OPENAI_API_KEY` et `PINECONE_API_KEY` sont configurées
2. Exécuter `npm run update-nodes` pour indexer manuellement
3. Vérifier que n8n est accessible sur le port configuré

### Erreur "Index not found" Pinecone
- L'index sera créé automatiquement lors de la première mise à jour
- Attendre 1-2 minutes que l'index soit prêt

### Versions incorrectes
- L'extension doit envoyer le mapping `versions` dans chaque requête
- Vérifier que l'extension récupère bien les node-types au chargement

### Performances lentes
- La première requête après déploiement peut être lente (cold start)
- L'indexation initiale prend 2-3 minutes
- Les requêtes suivantes sont rapides (~1-2s)

## 🎯 Optimisations possibles

1. **Cache local** : Ajouter Redis pour cacher les embeddings fréquents
2. **Modèle d'embeddings** : Utiliser `text-embedding-3-large` pour plus de précision
3. **Chunking** : Ajuster `CHUNK_SIZE` selon vos besoins
4. **Filtres** : Utiliser les métadonnées Pinecone pour filtrer par type de node

## 📄 License

MIT License - Voir LICENSE pour plus de détails 