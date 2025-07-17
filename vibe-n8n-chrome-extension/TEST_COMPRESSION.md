# 🧪 Test de Compression - Extension Chrome

Ce guide vous aide à **tester et valider** la nouvelle logique de compression/décompression pour les gros workflows.

## 🎯 **Objectif**

Valider que l'extension Chrome peut recevoir et décompresser des workflows compressés depuis le backend.

## 🔧 **Setup de test**

### **1. Backend en production**
```bash
# Vérifier que le backend compression fonctionne
curl -X POST https://your-backend.railway.app/api/claude \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Créer un workflow complexe avec 10+ nœuds pour l'\''e-commerce"}'
```

### **2. Extension Chrome**
1. Recharger l'extension (chrome://extensions)
2. Aller sur n8n.cloud ou votre instance n8n
3. Ouvrir Chrome DevTools → Console
4. Filtrer par : `📨|🗜️|✅|❌`

## 📊 **Tests à effectuer**

### **Test 1 : Workflow moyen (compression)**
**Prompt :** 
```
Créer un workflow complexe qui synchronise Slack avec Notion, traite les messages avec OpenAI, sauvegarde dans Airtable, et envoie des notifications Discord avec gestion d'erreurs
```

**Logs attendus côté extension :**
```javascript
// Background.js
📡 Événement reçu: compressed_complete | Data: {"success":true,"compressed":true,...
🗜️ Événement compressed_complete reçu: {success: true, compressed: true, ...}
✅ Workflow compressé reçu, décompression...

// Option A (service worker réussit)
✅ Workflow décompressé avec succès via service worker

// Option B (fallback content script)  
❌ Erreur décompression service worker: ...
🔄 Fallback: Envoi au content script pour décompression

// Content.js (si fallback)
🗜️ Décompression fallback demandée par le service worker
🗜️ Début décompression fallback, taille: XXXX chars
📦 Données décodées base64, taille: XXXX bytes
✅ window.DecompressionStream disponible
✅ Décompression fallback réussie, taille finale: XXXX chars
```

### **Test 2 : Workflow volumineux (chunking)**
**Prompt :**
```
Créer une plateforme e-commerce complète : gestion commandes → inventaire → paiements → shipping → emails → analytics → reporting → BI → CRM → support → notifications → backups → monitoring → compliance → multi-tenant → API gateway → microservices orchestration avec gestion d'erreurs avancée
```

**Logs attendus :**
```javascript
📡 Événement reçu: chunking_start | Data: {"message":"Envoi du workflow en X parties...",...
📦 Début réception chunks: X parties
📦 Chunk reçu: 1/X
📦 Chunk reçu: 2/X
...
📦 Chunk reçu: X/X (X/X)
✅ Tous les chunks reçus, assemblage...
✅ Workflow assemblé avec succès
```

## 🚨 **Points de validation**

### **✅ Succès attendu**
1. **Backend** : Compression activée `🗜️ Compressed: X.XKB → Y.YKB`
2. **Extension** : Événement `compressed_complete` reçu
3. **Décompression** : Réussie (service worker OU fallback)
4. **Import n8n** : Workflow visible dans l'éditeur
5. **UI** : Message de succès avec détails

### **❌ Échecs possibles**

#### **A. Événement pas reçu**
```javascript
// Symptôme : Extension reste sur "Recherche..."
// Solution : Vérifier les logs backend pour "compressed_complete"
```

#### **B. Décompression échoue**
```javascript
// Symptôme
❌ Erreur décompression service worker: ...
❌ Erreur décompression fallback: DecompressionStream non disponible

// Solution
- Mettre à jour Chrome (version 103+ requise)
- Ou utiliser un autre navigateur récent
```

#### **C. Parsing JSON échoue**
```javascript
// Symptôme  
❌ Erreur de décompression: Unexpected token

// Solution
- Vérifier les logs backend pour la taille des données
- Workflow peut-être trop volumineux (>500KB)
```

## 🔍 **Debug étape par étape**

### **1. Vérifier la réception SSE**
```javascript
// Dans Chrome DevTools, onglet Console
// Filtrer par "📡 Événement reçu"

// Doit montrer la séquence :
📡 Événement reçu: setup
📡 Événement reçu: search  
📡 Événement reçu: context_building
📡 Événement reçu: claude_call
📡 Événement reçu: compression
📡 Événement reçu: compressed_complete  // ← CRITIQUE
```

### **2. Vérifier le contenu des données**
```javascript
// Chercher ce log spécifique :
🗜️ Événement compressed_complete reçu: {success: true, compressed: true, data: "H4sI...", originalSize: XXXX}

// data doit être une string base64 qui commence par "H4sI" (gzip signature)
// originalSize doit être > 0
```

### **3. Tester la décompression manuellement**
```javascript
// Dans Chrome DevTools Console, coller et exécuter :
const testDecompression = async (base64Data) => {
  try {
    const compressed = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const stream = new DecompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    writer.write(compressed);
    writer.close();
    
    const chunks = [];
    let done = false;
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) chunks.push(value);
    }
    
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    const decompressed = new TextDecoder().decode(result);
    console.log('✅ Test décompression réussi, taille:', decompressed.length);
    return JSON.parse(decompressed);
  } catch (error) {
    console.error('❌ Test décompression échoué:', error);
  }
};

// Utiliser avec les données reçues
// testDecompression("H4sI...votre_data_base64...");
```

## 📈 **Métriques de performance**

### **Tailles typiques attendues**
- **Petit workflow** (1-5 nœuds) : 2-8KB → pas de compression
- **Workflow moyen** (6-15 nœuds) : 10-50KB → compression gzip
- **Gros workflow** (15+ nœuds) : 50-200KB → compression gzip  
- **Workflow énorme** (30+ nœuds) : >200KB → chunking

### **Ratios de compression**
- **Texte JSON** : 60-80% de réduction typique
- **Exemple** : 45KB → 12KB (73% de réduction)

## 🚀 **Commandes rapides**

```bash
# Test backend local
curl -X POST http://localhost:3000/api/claude \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "workflow complexe test compression"}'

# Vérifier la config extension  
chrome://extensions → n8n AI Assistant → Détails → Inspecter les vues

# Recharger l'extension
chrome://extensions → Recharger

# Debug logs
Chrome DevTools → Console → Filter: "📨|🗜️|✅|❌"
```

## ✅ **Validation finale**

**Le test est réussi si :**
1. 🔍 Logs de compression visibles côté backend
2. 📡 Événement `compressed_complete` reçu côté extension  
3. 🗜️ Décompression réussie (service worker ou fallback)
4. 📥 Workflow importé automatiquement dans n8n
5. 👁️ Interface utilisateur montre le succès avec détails

**En cas d'échec, suivre le guide de troubleshooting dans `LARGE_WORKFLOWS_TROUBLESHOOTING.md`** 