# 🚨 Guide de Troubleshooting - Gros Workflows

Ce guide vous aide à diagnostiquer et résoudre les problèmes de transmission des **gros workflows** entre le backend et l'extension Chrome.

## 🔍 **Symptômes identifiés**

- ✅ Backend génère le workflow correctement
- ❌ Extension Chrome ne reçoit rien
- ⏳ Timeout côté extension
- 📡 Perte de connexion SSE

## 🛠️ **Solutions implémentées**

### **1. Compression automatique**
- **Seuil** : Workflows > 10KB sont compressés automatiquement
- **Technique** : gzip + base64 encoding
- **Logs backend** : `🗜️ Compressed: 50.2KB → 12.1KB`

### **2. Chunking intelligent**
- **Seuil** : Workflows > 100KB sont découpés en chunks de 32KB
- **Technique** : JSON chunking avec reassemblage côté client
- **Logs backend** : `📦 Created 5 chunks`

### **3. Timeouts étendus**
```javascript
// Avant (5 min) → Après (10 min)
streamingTimeoutMs: 600000 

// Avant (15 min) → Après (30 min) 
timeoutMs: 1800000
```

### **4. Monitoring en temps réel**
```javascript
// Stats backend automatiques
{
  total: 25,
  success: 23,
  errors: 2,
  largeWorkflows: 8,
  compressionUsed: 12,
  chunkingUsed: 3
}
```

## 📊 **Diagnostic - À surveiller**

### **Backend Logs**
```bash
# Workflow size detection
📊 Workflow size: 75.3KB

# Transmission type decision
🗜️ Compression activated
# ou
📦 Chunking activated: 3 parts

# Session tracking
🔑 Session créée: session_1234567890_abc
✅ Session terminée: 45.2s, 75.3KB, compressed
```

### **Extension Logs**
```javascript
// Chrome DevTools Console
📦 Chunk reçu: 2/3 (2/3)
✅ Tous les chunks reçus, assemblage...
✅ Workflow assemblé avec succès
```

### **Network Tab**
- **Connexion SSE** : Doit rester ouverte pendant toute la génération
- **Taille des chunks** : < 32KB par chunk
- **Events reçus** : `setup` → `search` → `claude_call` → `compression`/`chunking` → `complete`

## 🧪 **Tests de validation**

### **Script de test automatisé**
```bash
# Tester différentes tailles de workflows
node scripts/test-large-workflow.js

# Résultats attendus
✅ Tests réussis: 4/4
🗜️ Compression utilisée: 2 fois  
📦 Chunking utilisé: 1 fois
```

### **Tests manuels par taille**

| Taille | Type | Mécanisme | Temps attendu |
|--------|------|-----------|---------------|
| < 10KB | Small | Direct | 30-60s |
| 10-100KB | Medium | Compression | 60-180s |
| > 100KB | Large | Chunking | 180-600s |

## 🔧 **Debugging étape par étape**

### **1. Vérifier la génération backend**
```bash
# Logs à chercher
🚀 === WORKFLOW RAG REQUEST 
📝 Prompt reçu: Créer un workflow...
🤖 Claude response received
📊 Workflow size: X.XKB
```

### **2. Vérifier la transmission**
```bash
# Type de transmission utilisé
🗜️ Compression: 45.2KB → 12.1KB
# ou  
📦 Chunking: Created 3 chunks
```

### **3. Vérifier la réception extension**
```javascript
// Dans Chrome DevTools
// Onglet Console, filtrer par "📨"
📨 Event: compression
📨 Event: compressed_complete
// ou
📨 Event: chunking_start  
📨 Event: chunk (plusieurs fois)
```

### **4. Vérifier l'assemblage**
```javascript
// Extension should show
✅ Workflow décompressé avec succès
// ou
✅ Workflow assemblé (3 parties)
```

## 🚨 **Points de défaillance critiques**

### **A. Timeout backend**
```bash
# Symptôme
❌ Timeout: La génération prend trop de temps (30 min)

# Solution
- Réduire la complexité du prompt
- Vérifier les crédits Claude
- Redémarrer le backend
```

### **B. Parsing JSON côté extension**
```javascript
// Symptôme  
❌ Parse error: Unexpected token

# Solution
- Vérifier les logs de chunking
- Vérifier que tous les chunks sont reçus
- Redémarrer l'extension
```

### **C. Buffer overflow SSE**
```javascript
// Symptôme
❌ Erreur écriture SSE: write after end

# Solution  
- Workflow trop volumineux (>500KB)
- Utiliser l'API de fallback
```

### **D. Décompression échouée**
```javascript
// Symptôme
❌ Decompression failed: invalid gzip data

# Solution
- Vérifier que Chrome supporte DecompressionStream
- Fallback vers API REST
```

## 🔄 **Stratégies de fallback**

### **1. API de récupération manuelle**
```javascript
// Si SSE échoue, utiliser l'endpoint fallback
POST /api/fallback
{
  "sessionId": "session_1234567890_abc",
  "action": "get_workflow"
}
```

### **2. Retry automatique**
```javascript
// Extension - retry après 30s si pas de réponse
setTimeout(() => {
  if (!workflowReceived) {
    tryFallbackAPI(sessionId);
  }
}, 30000);
```

### **3. Simplification du prompt**
```javascript
// Si échec répété, suggérer à l'utilisateur
"Votre demande est très complexe. Essayez de la diviser en plusieurs workflows plus simples."
```

## 📈 **Monitoring en production**

### **Métriques à surveiller**
```javascript
// Backend stats
successRate = success / total
largeWorkflowRatio = largeWorkflows / total  
compressionEfficiency = compressionUsed / largeWorkflows

// Seuils d'alerte
if (successRate < 0.9) → Alerte
if (largeWorkflowRatio > 0.5) → Optimisation needed
```

### **Health checks automatiques**
```bash
# Endpoint de monitoring
curl https://your-backend.railway.app/api/status

# Réponse attendue
{
  "status": "operational", 
  "uptime": 3600,
  "memory": {...}
}
```

## 🎯 **Optimisations recommandées**

### **1. Production**
- Utiliser Redis au lieu du cache Map pour le fallback
- Implémenter de la compression côté serveur (nginx gzip)
- Ajouter un CDN pour les workflows statiques

### **2. UX**
- Progress bar granulaire pendant le chunking
- Estimation du temps restant basée sur la taille
- Option "workflow simplifié" si timeout

### **3. Performance**
- Précharger les workflows similaires populaires
- Cache des embeddings fréquents
- Compression différentielle (delta encoding)

## 🚀 **Commandes de test rapide**

```bash
# Test local
API_URL=http://localhost:3000/api/claude npm run test:large

# Test production  
API_URL=https://your-backend.railway.app/api/claude npm run test:large

# Debug backend
npm run dev | grep "📊\|🗜️\|📦"

# Debug extension
# Chrome DevTools → Console → Filter: "📨|✅|❌"
```

Ce guide vous donne tous les outils pour diagnostiquer et résoudre les problèmes de gros workflows. Les solutions sont déjà implémentées - il suffit de suivre les logs pour identifier le point de défaillance ! 🔧 