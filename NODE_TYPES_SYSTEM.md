# Système de Gestion des Node-Types n8n

## Vue d'ensemble

Le backend utilise maintenant un système optimisé pour gérer les node-types n8n. Au lieu d'indexer de la documentation statique, nous indexons directement les métadonnées des nodes disponibles dans n8n.

## Architecture

### 1. Mise à jour hebdomadaire (Job Cron Railway)

- **Fréquence** : Tous les lundis à 3h00 UTC
- **Processus** :
  1. Démarre un conteneur Docker `n8n:latest`
  2. Appelle `/rest/node-types` pour récupérer tous les nodes
  3. Génère des embeddings pour chaque node
  4. Upsert dans Pinecone avec l'ID `nodeName|vX`
  5. Archive le mapping des versions

### 2. Extension Chrome (côté client)

Au chargement de la page n8n :
```javascript
// Récupère les node-types de l'instance locale
const response = await fetch('http://localhost:5678/rest/node-types');
const nodeTypes = await response.json();

// Construit le mapping des versions
const versions = {};
Object.entries(nodeTypes).forEach(([name, data]) => {
  const maxVersion = Math.max(...Object.keys(data).map(v => parseFloat(v)));
  versions[name] = maxVersion;
});

// Cache pour les requêtes futures
localStorage.setItem('n8n-node-versions', JSON.stringify(versions));
```

### 3. Backend API

Lors d'une requête :
```javascript
POST /api/claude
{
  "prompt": "Créer un workflow qui envoie un message Slack",
  "context": {...},
  "tools": [...],
  "versions": {
    "slack": 4,
    "httpRequest": 3,
    // ... mapping complet
  }
}
```

Le backend :
1. Identifie les nodes mentionnés via Claude Haiku
2. Récupère les fiches exactes depuis Pinecone
3. Enrichit le contexte pour Claude Opus
4. Génère le workflow avec les bonnes versions

## Commandes

### Mise à jour manuelle des node-types

```bash
# Depuis une instance n8n locale (http://localhost:5678)
npm run update-nodes

# Avec Docker (démarre n8n temporairement)
npm run update-nodes:docker
```

### Vérifier l'état de l'index

```bash
curl http://localhost:3000/api
```

## Structure des données

### Dans Pinecone

Chaque node est stocké avec :
- **ID** : `nodeName|vX` (ex: `slack|v4`)
- **Embedding** : Vecteur de 1536 dimensions
- **Métadonnées** :
  ```json
  {
    "nodeName": "slack",
    "displayName": "Slack",
    "description": "Send messages to Slack",
    "version": 4,
    "group": ["communication"],
    "properties": [
      {
        "name": "channel",
        "displayName": "Channel",
        "type": "string",
        "required": true
      }
    ]
  }
  ```

### Archive locale

Les mappings sont archivés dans `/archives/node-types/` :
```json
{
  "slack": 4,
  "discord": 3,
  "httpRequest": 5,
  // ...
}
```

## Avantages

1. **Toujours à jour** : Synchronisation hebdomadaire avec n8n:latest
2. **Compatibilité garantie** : Utilise les versions exactes de l'instance utilisateur
3. **Performance** : ~3k tokens pour le mapping complet vs 20k+ pour la doc
4. **Précision** : Métadonnées exactes des nodes, pas d'approximation

## Configuration Railway

Le fichier `railway.toml` configure :
- Le cron job hebdomadaire
- Les health checks
- La politique de redémarrage

## Variables d'environnement

```env
# Obligatoires
CLAUDE_API_KEY=sk-ant-...
BACKEND_API_KEY=...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...

# Optionnelles
N8N_VERSION=latest  # Version de n8n pour les mises à jour
N8N_PORT=5678      # Port pour n8n temporaire
```

## Monitoring

- Les logs Railway montrent les mises à jour hebdomadaires
- L'endpoint `/api` affiche les stats de l'index
- Les archives permettent de tracer l'évolution des versions 