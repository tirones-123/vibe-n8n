# 🚀 n8n Workflow RAG Backend

Intelligent backend for generating n8n workflows based on AI and RAG (Retrieval-Augmented Generation). This system uses Claude 4 Sonnet and a vector database of 2055+ real workflows to create custom workflows from natural language descriptions.

## 🎯 What is this?

This backend allows you to:
- **Describe in natural language** the n8n workflow you want to create
- **Automatically search** similar workflows in a vector database (Pinecone)  
- **Generate a new workflow** adapted to your needs with Claude 4 Sonnet
- **Use directly** the generated workflow in n8n
- **Manage authentication** via Firebase with FREE/PRO plans
- **Quota system** with Stripe billing for usage beyond limits

## 🏗️ Architecture

```
cursor-n8n-backend/
├── server.js                   # Main Express server
├── api/
│   ├── claude.js              # Workflow generation API (RAG + SSE)
│   ├── pricing.js             # Pricing and Stripe billing API  
│   ├── rag/
│   │   └── workflow-rag-service.js  # Main RAG service
│   ├── services/
│   │   ├── firebase-service.js      # Firebase authentication service
│   │   └── stripe-service.js        # Stripe billing service
│   └── middleware/
│       └── auth.js            # Combined authentication middleware
├── workflows-rag-optimized/    # 2055+ workflows optimized for RAG
└── vibe-n8n-chrome-extension/ # Chrome extension with Firebase auth
```

## 🔧 Installation

### Prerequisites

- Node.js (v18+)  
- Required API keys:
  - **Anthropic (Claude)** : For workflow generation
  - **Pinecone** : For vector database  
  - **OpenAI** : For text-embedding-3-small embeddings
  - **Firebase** : For user authentication (optional)
  - **Stripe** : For billing (optional)

### Configuration

1. **Create a `.env` file** at the root:
```env
# Required for RAG system
CLAUDE_API_KEY=sk-ant-api03-...
PINECONE_API_KEY=your_pinecone_key  
OPENAI_API_KEY=sk-...
PINECONE_WORKFLOW_INDEX=n8n-workflows

# Legacy backend authentication (required)
BACKEND_API_KEY=your-secure-token

# Firebase (optional - for user auth)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com

# Stripe (optional - for billing)  
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# Environment
NODE_ENV=production
```

2. **Install dependencies**:
```bash
npm install
```

3. **Verify that the Pinecone index exists** with your 2055+ indexed workflows

## 🚀 Usage

### Start the backend

```bash
npm start
# or for development
npm run dev
```

The backend starts on http://localhost:3000  
**Production**: https://vibe-n8n-production.up.railway.app

### Main API Endpoints

#### 🤖 Workflow generation with streaming SSE
```
POST /api/claude
Authorization: Bearer YOUR_API_KEY (legacy) or Firebase ID Token
Content-Type: application/json

{
  "prompt": "Create a workflow that syncs Slack with Notion every hour"
}
```

**Streaming response (SSE)** with progress events:
- `setup` : Initialization
- `search` : Searching in Pinecone  
- `context_building` : Building context
- `claude_call` : Generation with Claude
- `complete` : Workflow finished

#### 🔐 Authentication and user profile
```
GET /api/me
Authorization: Bearer FIREBASE_ID_TOKEN

# Response with plan, quotas, usage
```

#### 💳 Create Stripe checkout session
```  
POST /api/create-checkout-session
Authorization: Bearer FIREBASE_ID_TOKEN

{
  "success_url": "https://...",
  "cancel_url": "https://..."
}
```

### Example prompts

#### Simple workflows
- "Create a workflow that sends an email every hour"
- "Simple workflow with a webhook trigger and Slack notification"
- "Automation that saves data to Google Sheets"

#### Complex workflows  
- "Sync Slack with Notion: get messages, create pages, Discord notification if error"
- "E-commerce pipeline: Shopify trigger → HubSpot → Slack notification → Gmail client email"
- "Discord bot with OpenAI that answers questions and saves to database"

#### Improvement mode  
```json
{
  "prompt": "Add email notification on error",
  "baseWorkflow": {
    "name": "My existing workflow", 
    "nodes": [...],
    "connections": {...}
  }
}
```

## 🧠 RAG System

### Generation pipeline

1. **Embedding** : Your prompt → OpenAI `text-embedding-3-small` vector
2. **Search** : Top 3 similar workflows in Pinecone (score > 0.3)
3. **Context** : Load complete workflows from `workflows-rag-optimized/`  
4. **Generation** : Claude 4 Sonnet with RAG context (temperature 0.3)
5. **Validation** : Complete and functional n8n workflow structure
6. **Streaming** : Progressive transmission via SSE with chunking if necessary

### Knowledge base
- **2055+ real workflows** optimized for RAG
- **GPT-4 descriptions** to improve semantic search  
- **Metadata** : node types, complexity, categories
- **Pinecone index** : Ultra-fast vector search

## ⚠️ Firebase Dynamic Links Migration (August 2025)

**Important**: Firebase Dynamic Links was shut down on August 25, 2025. This project has been updated to handle this change:

- ✅ **Email verification** now uses Firebase REST API (`sendOobCode`) directly in the Chrome extension
- ✅ **Authentication flows** are unaffected and continue to work normally  
- ❌ **Deprecated endpoint** `/api/send-verification-email` has been disabled (returns 410)

The Chrome extension handles email verification client-side and does not require any backend changes for this functionality.

For more information: [Firebase Dynamic Links Migration FAQ](https://firebase.google.com/support/dynamic-links-faq)

## 🔐 Authentication & Pricing

### Available plans

#### FREE
- **70,000 tokens** input per month
- AI workflow generation  
- Chrome extension
- Community support

#### PRO ($20/month)
- **1,500,000 tokens** input per month
- Optional usage-based billing after quota
- Priority support
- Advanced statistics

### Combined authentication
- **Firebase Auth** : New system with plans and quotas
- **Legacy API Key** : Compatibility with old system (unlimited tokens)

## 🚀 Deployment

### Railway (Production)

The backend is deployed on Railway with auto-scaling:

```bash
# Production URL  
https://vibe-n8n-production.up.railway.app

# Monitoring
Railway Dashboard with real-time logs
```

### Railway Configuration
1. **Connect GitHub repo** to Railway
2. **Environment variables** : Copy all variables from `.env`
3. **Auto-deploy** : Push to `main` triggers deployment

### Local (Development)
```bash
# Installation
npm install

# Configuration  
cp .env.example .env
# Complete .env with your API keys

# Start with hot-reload
npm run dev

# Tests
npm run test
npm run test:quick
```

## 🔧 Chrome Extension

The Chrome extension (`vibe-n8n-chrome-extension/`) integrates directly into n8n with:

- **Complete Firebase authentication**
- **Real-time quota management**  
- **Modern interface** inspired by VS Code
- **Native import** via copy-paste simulation
- **Custom domain support** for n8n

### Extension installation
1. Chrome → `chrome://extensions/`
2. Developer mode → "Load unpacked extension"  
3. Select `vibe-n8n-chrome-extension/`
4. Use on n8n.io or your personal instance

## 📊 Monitoring

### Health checks
```bash
# Global status
curl https://vibe-n8n-production.up.railway.app/api

# Detailed monitoring  
curl https://vibe-n8n-production.up.railway.app/api/status
```

### Performance metrics
- **Pinecone search** : 0.2-0.8s
- **Claude generation** : 5-30s  
- **Complete workflow** : 8-45s depending on complexity
- **Compression** : 60-80% reduction for workflows > 10KB

## 🔍 Troubleshooting

### Error "No similar workflows found"
- Check Pinecone index and 2055+ indexed workflows
- Variables `PINECONE_API_KEY` and `PINECONE_WORKFLOW_INDEX`

### Authentication fails
- **Firebase** : Check Firebase Admin SDK configuration
- **Legacy** : Check `BACKEND_API_KEY` in Authorization headers

### Claude generation fails  
- Check `CLAUDE_API_KEY` and Anthropic quotas
- Detailed logs in Railway Dashboard

### Workflows not found
- Check `workflows-rag-optimized/` folder (2055 JSON files)
- File system read permissions

## 🎯 n8n workflow structure

```json
{
  "name": "My Workflow",
  "nodes": [
    {
      "id": "unique-id", 
      "name": "Node name",
      "type": "n8n-nodes-base.webhook",
      "position": [x, y],
      "parameters": { ... },
      "typeVersion": 1.1
    }
  ],
  "connections": {
    "Node name": {
      "main": [[{ "node": "Other node", "type": "main", "index": 0 }]]
    }
  }
}
```

## 📄 License

MIT License - See LICENSE for more details

---

## 🚀 Migration from old system

This backend (v2.0) completely replaces the old system with:

- ✅ **Optimized RAG** : 2055+ real workflows vs old node-types
- ✅ **Claude 4 Sonnet** : Most advanced model  
- ✅ **Firebase Auth** : User and quota management
- ✅ **Stripe billing** : FREE/PRO plans with usage-based
- ✅ **Performance** : Vector search + SSE streaming
- ✅ **Modern extension** : Integrated interface with authentication

**Developed with ❤️ for the n8n community** 
*Intelligent RAG backend powered by Claude 4 Sonnet, Pinecone and 2055+ real workflows* 