# API Documentation - n8n AI Assistant Backend

## 🌐 Vue d'ensemble

Le backend n8n AI Assistant est une API REST déployée sur Vercel qui fait le pont entre une extension Chrome et l'API Claude d'Anthropic. Il permet de créer et modifier des workflows n8n en langage naturel.

### URLs de production
- **Endpoint principal** : `https://vibe-n8n.vercel.app/api/claude`
- **Page de statut** : `https://vibe-n8n.vercel.app/api`
- **Repository** : https://github.com/tirones-123/vibe-n8n

---

## 🔐 Authentification

### Token requis
```javascript
const API_KEY = 'd5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2'
```

### Header d'authentification
```javascript
headers: {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
}
```

**⚠️ Important** : Le token doit être inclus dans **chaque requête**, sinon vous recevrez une erreur 401.

---

## 📡 Endpoints

### POST `/api/claude`

Génère une réponse Claude pour créer/modifier un workflow n8n.

#### Headers requis
```javascript
{
  'Authorization': 'Bearer d5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2',
  'Content-Type': 'application/json'
}
```

#### Body de la requête
```typescript
interface ClaudeRequest {
  prompt: string;           // Instruction en langage naturel
  context: WorkflowContext; // Contexte actuel du workflow
  tools: Tool[];           // Fonctions disponibles pour Claude
  mode?: 'create' | 'modify'; // Mode de génération
  versions?: Record<string, number>; // Mapping des versions des nodes
}
```

#### Réponse
- **Format** : Server-Sent Events (SSE)
- **Content-Type** : `text/event-stream`
- **Encoding** : UTF-8

---

## 📋 Types TypeScript

### WorkflowContext
```typescript
interface WorkflowContext {
  nodes?: Node[];
  connections?: Connection[];
  workflow?: {
    id?: string;
    name?: string;
    active?: boolean;
    settings?: object;
  };
  [key: string]: any; // Contexte flexible
}
```

### Node
```typescript
interface Node {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: object;
  credentials?: object;
  disabled?: boolean;
}
```

### Connection
```typescript
interface Connection {
  node: string;
  type: string;
  index: number;
}
```

### Tool (Fonction Claude)
```typescript
interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}
```

---

## 🛠️ Fonctions disponibles pour Claude

### createNode
Crée un nouveau nœud dans le workflow.
```typescript
{
  name: "createNode",
  description: "Create a new node in the workflow",
  input_schema: {
    type: "object",
    properties: {
      type: { type: "string", description: "Node type (e.g., 'n8n-nodes-base.httpRequest')" },
      position: { type: "array", items: { type: "number" }, description: "Position [x, y]" },
      parameters: { type: "object", description: "Node configuration parameters" }
    },
    required: ["type", "position"]
  }
}
```

### updateNode
Met à jour un nœud existant.
```typescript
{
  name: "updateNode",
  description: "Update an existing node",
  input_schema: {
    type: "object",
    properties: {
      nodeId: { type: "string", description: "ID of the node to update" },
      parameters: { type: "object", description: "New parameters to set" }
    },
    required: ["nodeId", "parameters"]
  }
}
```

### connectNodes
Connecte deux nœuds.
```typescript
{
  name: "connectNodes",
  description: "Connect two nodes together",
  input_schema: {
    type: "object",
    properties: {
      sourceNodeId: { type: "string", description: "Source node ID" },
      targetNodeId: { type: "string", description: "Target node ID" },
      sourceOutputIndex: { type: "number", description: "Source output index (default: 0)" },
      targetInputIndex: { type: "number", description: "Target input index (default: 0)" }
    },
    required: ["sourceNodeId", "targetNodeId"]
  }
}
```

### deleteNode
Supprime un nœud.
```typescript
{
  name: "deleteNode",
  description: "Delete a node from the workflow",
  input_schema: {
    type: "object",
    properties: {
      nodeId: { type: "string", description: "ID of the node to delete" }
    },
    required: ["nodeId"]
  }
}
```

---

## 📨 Format de réponse SSE

### Types d'événements
```typescript
// Début du message
{
  type: "message_start",
  message: {
    id: string,
    role: "assistant",
    model: "claude-sonnet-4-20250514",
    content: [],
    usage: { input_tokens: number, output_tokens: number }
  }
}

// Début du thinking (raisonnement)
{
  type: "content_block_start",
  index: number,
  content_block: {
    type: "thinking",
    thinking: "",
    signature: ""
  }
}

// Delta du thinking
{
  type: "content_block_delta",
  index: number,
  delta: {
    type: "thinking_delta",
    thinking: string
  }
}

// Début du texte de réponse
{
  type: "content_block_start",
  index: number,
  content_block: {
    type: "text",
    text: ""
  }
}

// Delta du texte
{
  type: "content_block_delta",
  index: number,
  delta: {
    type: "text_delta",
    text: string
  }
}

// Fin du message
{
  type: "message_stop"
}

// Fin du stream (ajouté par le backend)
{
  type: "stream_end"
}
```

---

## 💻 Exemples de code

### Requête basique
```javascript
const API_URL = 'https://vibe-n8n.vercel.app/api/claude';
const API_KEY = 'd5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2';

async function callClaude(prompt, context = {}, tools = []) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: prompt,
      context: context,
      tools: tools
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response;
}
```

### Lecture du stream SSE
```javascript
async function handleClaudeStream(prompt, context, tools) {
  const response = await callClaude(prompt, context, tools);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data.trim()) {
            try {
              const event = JSON.parse(data);
              handleEvent(event);
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function handleEvent(event) {
  switch (event.type) {
    case 'content_block_delta':
      if (event.delta.type === 'text_delta') {
        // Afficher le texte de Claude en temps réel
        console.log(event.delta.text);
      } else if (event.delta.type === 'thinking_delta') {
        // Afficher le raisonnement de Claude (optionnel)
        console.log('[Thinking]', event.delta.thinking);
      }
      break;
      
    case 'message_stop':
      console.log('Réponse terminée');
      break;
      
    case 'stream_end':
      console.log('Stream fermé');
      break;
  }
}
```

### Avec versions des nodes
```javascript
const versions = {
  "slack": 4,
  "httpRequest": 5,
  "gmail": 2,
  "schedule": 1,
  // ... récupéré depuis /rest/node-types de l'instance locale
};

const tools = [
  {
    name: "createNode",
    description: "Create a new node in the workflow",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Node type" },
        position: { type: "array", items: { type: "number" }, description: "Position [x, y]" },
        parameters: { type: "object", description: "Node parameters" }
      },
      required: ["type", "position"]
    }
  },
  {
    name: "connectNodes",
    description: "Connect two nodes",
    input_schema: {
      type: "object",
      properties: {
        sourceNodeId: { type: "string" },
        targetNodeId: { type: "string" },
        sourceOutputIndex: { type: "number", default: 0 },
        targetInputIndex: { type: "number", default: 0 }
      },
      required: ["sourceNodeId", "targetNodeId"]
    }
  }
  // ... autres outils
];

const context = {
  nodes: [
    {
      id: "node1",
      name: "Manual Trigger",
      type: "n8n-nodes-base.manualTrigger",
      position: [240, 300],
      parameters: {}
    }
  ],
  connections: {}
};

handleClaudeStream(
  "Ajoute un nœud HTTP Request qui appelle l'API GitHub",
  context,
  tools,
  'modify',
  versions
);
```

---

## ❌ Gestion des erreurs

### Codes d'erreur HTTP
```javascript
// 401 - Token invalide
{
  error: "Unauthorized",
  message: "Invalid or missing API key"
}

// 400 - Paramètres invalides
{
  error: "Bad Request",
  message: "Missing or invalid prompt field"
}

// 405 - Méthode non autorisée
{
  error: "Method not allowed", 
  message: "Only POST method is accepted"
}

// 500 - Erreur serveur
{
  error: "API Error",
  message: "Internal server error"
}
```

### Erreurs dans le stream
```javascript
// Erreur dans le stream SSE
{
  type: "error",
  error: "Stream interrupted",
  message: "Connection lost"
}
```

### Exemple de gestion
```javascript
async function safeClaudeCall(prompt, context, tools) {
  try {
    const response = await callClaude(prompt, context, tools);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`${error.error}: ${error.message}`);
    }
    
    return response;
  } catch (error) {
    console.error('Erreur API Claude:', error);
    // Gérer l'erreur (retry, fallback, etc.)
    throw error;
  }
}
```

---

## 🔧 Configuration

### Variables d'environnement (côté backend)
```bash
CLAUDE_API_KEY=sk-ant-... # Clé API Anthropic
BACKEND_API_KEY=d5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2
```

### Configuration extension Chrome
```javascript
const CONFIG = {
  API_URL: 'https://vibe-n8n.vercel.app/api/claude',
  API_KEY: 'd5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2',
  TIMEOUT: 30000, // 30 secondes
  MAX_RETRIES: 3
};
```

---


## 📊 Limites et quotas

### Backend (Vercel)
- **Timeout** : 30 secondes maximum
- **Mémoire** : 1024 MB
- **Concurrent requests** : Illimité (plan Pro)

### Claude API
- **Modèle** : claude-sonnet-4-20250514
- **Max tokens** : 8192 tokens de sortie
- **Thinking budget** : 6554 tokens
- **Rate limiting** : Géré par Anthropic

---

## 🚀 Exemples d'intégration

### Extension Chrome (Manifest V3)
```javascript
// background.js
chrome.action.onClicked.addListener(async (tab) => {
  try {
    const response = await callClaude(
      "Créé un workflow simple",
      { nodes: [], connections: {} },
      n8nTools
    );
    
    // Injecter le résultat dans n8n
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: injectWorkflow,
      args: [workflowData]
    });
  } catch (error) {
    console.error('Erreur:', error);
  }
});
```

### Intégration React
```jsx
import { useState, useEffect } from 'react';

function ClaudeChat() {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  
  const sendMessage = async (prompt) => {
    setLoading(true);
    setResponse('');
    
    try {
      const stream = await callClaude(prompt, context, tools);
      const reader = stream.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        // Parser et traiter les événements SSE
        parseSSEChunk(chunk, (event) => {
          if (event.type === 'content_block_delta' && 
              event.delta.type === 'text_delta') {
            setResponse(prev => prev + event.delta.text);
          }
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <div>{response}</div>
      {loading && <div>Génération en cours...</div>}
    </div>
  );
}
```

---

## 📝 Notes importantes

1. **CORS** : L'API accepte toutes les origines (`*`) pour permettre l'utilisation dans les extensions Chrome.

2. **Streaming** : Les réponses sont toujours en streaming pour une meilleure expérience utilisateur.

3. **Thinking** : Claude "réfléchit" avant de répondre, visible dans le stream avec `thinking_delta`.

4. **Authentification** : Le token doit être inclus dans chaque requête.

5. **Rate limiting** : Géré automatiquement par Anthropic, pas de limite côté backend.

6. **Retry logic** : Implémenter une logique de retry en cas d'erreur réseau.

---

## 🐛 Debug et monitoring

### Page de statut
Vérifiez `https://vibe-n8n.vercel.app/api` pour voir l'état des variables d'environnement.

### Logs Vercel
```bash
vercel logs --follow
```

### Test avec curl
```bash
curl -i -X POST https://vibe-n8n.vercel.app/api/claude \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer d5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2" \
  --data '{"prompt":"ping","context":{},"tools":[]}'
```

---

*Documentation générée le $(date) pour n8n AI Assistant Backend v1.0* 