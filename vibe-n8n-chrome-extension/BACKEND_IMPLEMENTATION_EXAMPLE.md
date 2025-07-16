# Exemple d'implémentation du Backend sur Vercel

Voici un exemple de ce à quoi devrait ressembler le code du backend :

## Structure des fichiers

```
n8n-ai-backend/
├── api/
│   └── claude.js
├── package.json
├── vercel.json
├── .env.example
└── README.md
```

## api/claude.js

```javascript
import Anthropic from '@anthropic-ai/sdk';

// Configuration CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  // Gérer les requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeaders(corsHeaders).end();
  }

  // Vérifier la méthode
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vérifier l'authentification
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (token !== process.env.BACKEND_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Valider le body
  const { prompt, context, tools } = req.body;
  
  if (!prompt || !context || !tools) {
    return res.status(400).json({ 
      error: 'Missing required fields: prompt, context, tools' 
    });
  }

  try {
    // Initialiser Claude
    const anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });

    // Préparer le system prompt
    const systemPrompt = `You are an AI assistant specialized in n8n. You can create and modify workflows using the available functions.
Current workflow context: ${JSON.stringify(context)}

Use the functions to:
- Create nodes with createNode
- Modify existing nodes with updateNode
- Connect nodes with connectNodes
- Delete nodes with deleteNode

Always respond in the user's language and briefly explain what you're doing.`;

    // Créer le stream
    const stream = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
      system: systemPrompt,
      tools: tools,
      tool_choice: { type: 'auto' },
      stream: true,
    });

    // Configurer les headers pour SSE
    res.writeHead(200, {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Transmettre le stream
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error('Error:', error);
    
    // Si on a déjà commencé à streamer, on ne peut plus changer les headers
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    } else {
      // Envoyer l'erreur dans le stream
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: error.message 
      })}\n\n`);
      res.end();
    }
  }
}
```

## package.json

```json
{
  "name": "n8n-ai-backend",
  "version": "1.0.0",
  "description": "Backend API for n8n AI Assistant Chrome Extension",
  "type": "module",
  "scripts": {
    "dev": "vercel dev",
    "deploy": "vercel --prod"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.24.3"
  },
  "devDependencies": {
    "vercel": "^34.2.7"
  }
}
```

## vercel.json

```json
{
  "functions": {
    "api/claude.js": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
        { "key": "Access-Control-Allow-Headers", "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" }
      ]
    }
  ]
}
```

## .env.example

```env
# Clé API Claude (Anthropic)
CLAUDE_API_KEY=sk-ant-api03-xxxxxxxxxxxxx

# Token d'authentification pour le backend
BACKEND_API_KEY=your-secret-backend-key-here
```

## README.md

```markdown
# n8n AI Assistant Backend

Backend API pour l'extension Chrome n8n AI Assistant.

## Installation

1. Cloner le repository
```bash
git clone <your-repo>
cd n8n-ai-backend
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer les variables d'environnement
```bash
cp .env.example .env.local
# Éditer .env.local avec vos clés
```

## Déploiement sur Vercel

### Option 1: Via CLI

1. Installer Vercel CLI
```bash
npm i -g vercel
```

2. Déployer
```bash
vercel
```

3. Configurer les variables d'environnement
```bash
vercel env add CLAUDE_API_KEY
vercel env add BACKEND_API_KEY
```

### Option 2: Via GitHub

1. Pusher le code sur GitHub
2. Connecter le repo sur vercel.com
3. Ajouter les variables d'environnement dans le dashboard
4. Déployer automatiquement à chaque push

## Configuration de l'extension

Une fois déployé, mettez à jour `src/config.js` dans l'extension :

```javascript
const CONFIG = {
  API_URL: 'https://your-project.vercel.app/api/claude',
  API_KEY: 'your-backend-api-key',
};
```

## Test local

```bash
npm run dev
# API disponible sur http://localhost:3000/api/claude
```

## Endpoints

### POST /api/claude

Headers requis:
- `Authorization: Bearer YOUR_BACKEND_API_KEY`
- `Content-Type: application/json`

Body:
```json
{
  "prompt": "string",
  "context": { "nodes": [], "connections": {} },
  "tools": []
}
```

Réponse: Server-Sent Events (text/event-stream)
```

## Points importants pour l'implémentation

1. **Gestion du streaming** : Le code transmet directement le stream de Claude
2. **CORS** : Configuration pour autoriser l'extension Chrome
3. **Timeout** : Configuré à 30 secondes (plan Pro Vercel requis pour plus)
4. **Error handling** : Gère les erreurs avant et pendant le streaming
5. **Type module** : Utilise ES modules pour compatibilité avec le SDK Anthropic 