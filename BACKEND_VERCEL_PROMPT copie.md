# Prompt pour créer le Backend n8n AI Assistant sur Vercel

## Contexte du projet

Je développe une extension Chrome pour n8n (plateforme d'automatisation) qui ajoute un assistant IA dans l'interface. L'extension permet aux utilisateurs de créer et modifier des workflows n8n en langage naturel grâce à Claude 3 Sonnet.

L'extension Chrome communique avec un backend (que tu vas créer) qui fait le pont avec l'API Claude d'Anthropic. Le backend doit être déployé sur Vercel pour sa simplicité.

## Architecture actuelle

### Extension Chrome (déjà développée)
- Injecte un panneau de chat dans l'interface n8n
- Capture le contexte du workflow actuel (nœuds et connexions)
- Envoie les requêtes au backend avec le prompt utilisateur
- Reçoit les réponses en streaming et les tool calls
- Exécute les tool calls directement dans n8n via le store Pinia

### Communication Extension ↔ Backend
L'extension envoie des requêtes POST à l'endpoint du backend avec :
```json
{
  "prompt": "Crée un workflow qui récupère les emails et les envoie sur Slack",
  "context": {
    "nodes": [
      {
        "id": "node_123",
        "name": "Start",
        "type": "n8n-nodes-base.start",
        "position": [250, 300],
        "parameters": {}
      }
    ],
    "connections": {}
  },
  "tools": [
    {
      "name": "createNode",
      "description": "Créer un nouveau nœud dans le workflow n8n",
      "parameters": {
        "type": "object",
        "properties": {
          "nodeType": { "type": "string", "description": "Type du nœud (ex: 'n8n-nodes-base.slack')" },
          "name": { "type": "string", "description": "Nom du nœud" },
          "position": { 
            "type": "object",
            "properties": {
              "x": { "type": "number" },
              "y": { "type": "number" }
            },
            "required": ["x", "y"]
          },
          "params": { "type": "object", "description": "Paramètres spécifiques au nœud" }
        },
        "required": ["nodeType", "name", "position"]
      }
    },
    {
      "name": "updateNode",
      "description": "Modifier un nœud existant",
      "parameters": {
        "type": "object",
        "properties": {
          "nodeId": { "type": "string", "description": "ID du nœud à modifier" },
          "nodeType": { "type": "string", "description": "Nouveau type (optionnel)" },
          "name": { "type": "string", "description": "Nouveau nom (optionnel)" },
          "params": { "type": "object", "description": "Nouveaux paramètres (optionnel)" }
        },
        "required": ["nodeId"]
      }
    },
    {
      "name": "connectNodes",
      "description": "Connecter deux nœuds",
      "parameters": {
        "type": "object",
        "properties": {
          "sourceId": { "type": "string", "description": "ID du nœud source" },
          "targetId": { "type": "string", "description": "ID du nœud cible" },
          "sourceOutput": { "type": "string", "description": "Nom de la sortie source (défaut: 'main')" },
          "targetInput": { "type": "string", "description": "Nom de l'entrée cible (défaut: 'main')" }
        },
        "required": ["sourceId", "targetId"]
      }
    },
    {
      "name": "deleteNode",
      "description": "Supprimer un nœud",
      "parameters": {
        "type": "object",
        "properties": {
          "nodeId": { "type": "string", "description": "ID du nœud à supprimer" }
        },
        "required": ["nodeId"]
      }
    }
  ]
}
```

## Ce que le backend doit faire

1. **Recevoir les requêtes** de l'extension Chrome
2. **Authentifier** avec un Bearer token simple (défini dans les variables d'environnement)
3. **Appeler l'API Claude** avec :
   - Le prompt utilisateur
   - Un system prompt qui explique le contexte n8n
   - Les tools (functions) disponibles
   - Le mode streaming activé
4. **Transmettre le stream** de Claude vers l'extension en Server-Sent Events (SSE)
5. **Gérer les erreurs** proprement

## Spécifications techniques

### Endpoint
- `POST /api/claude`
- Headers requis : `Authorization: Bearer YOUR_API_KEY`
- Content-Type : `application/json`
- Réponse : `text/event-stream` (SSE)

### Variables d'environnement nécessaires
- `CLAUDE_API_KEY` : Clé API Anthropic (sk-ant-...)
- `BACKEND_API_KEY` : Token pour authentifier les requêtes de l'extension

### System Prompt pour Claude
```
You are an AI assistant specialized in n8n. You can create and modify workflows using the available functions.
Current workflow context: [INJECT CONTEXT HERE]

Use the functions to:
- Create nodes with createNode
- Modify existing nodes with updateNode
- Connect nodes with connectNodes
- Delete nodes with deleteNode

Always respond in the user's language and briefly explain what you're doing.
```

### Format du streaming SSE
L'extension s'attend à recevoir les événements dans le même format que l'API Claude :
```
data: {"type":"message_start","message":{"id":"msg_...","type":"message","role":"assistant",...}}

data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Je vais créer"}}

data: {"type":"tool_use","index":1,"tool_use":{"id":"toolu_...","name":"createNode","input":{"nodeType":"n8n-nodes-base.gmail","name":"Gmail","position":{"x":400,"y":300}}}}

data: {"type":"message_stop"}
```

## Structure du projet Vercel

```
n8n-ai-backend/
├── api/
│   └── claude.js       # Endpoint principal
├── package.json
├── vercel.json         # Configuration Vercel
├── .env.local          # Variables d'environnement (local)
└── README.md
```

## Exigences importantes

1. **CORS** : Autoriser toutes les origines (*) pour que l'extension puisse communiquer
2. **Streaming** : Utiliser les Server-Sent Events pour transmettre le stream de Claude
3. **Timeout** : Vercel a un timeout de 10 secondes pour les fonctions gratuites, donc gérer cela
4. **Error handling** : Retourner des erreurs JSON claires en cas de problème
5. **Validation** : Valider que le body contient prompt, context et tools

## Déploiement sur Vercel

Le déploiement doit être le plus simple possible :
1. `vercel` dans le terminal
2. Configurer les variables d'environnement dans le dashboard Vercel
3. C'est tout !

## Code à produire

Crée le code complet pour :
1. `api/claude.js` - L'endpoint serverless
2. `package.json` - Avec les dépendances nécessaires
3. `vercel.json` - Configuration pour les CORS et timeouts
4. `README.md` - Instructions de déploiement
5. `.env.example` - Exemple des variables d'environnement

Le code doit être production-ready, avec une bonne gestion d'erreurs et optimisé pour Vercel. 