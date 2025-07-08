# Guide de Débogage - n8n AI Assistant Backend

## 🔍 Visualiser les Logs

### 1. En développement local

#### Option A : Logs en temps réel avec couleurs
```bash
npm run logs
```
Affiche les logs avec une mise en forme colorée :
- 🔵 Requêtes entrantes en cyan
- 🟢 Nodes identifiés en vert
- 🟣 Contexte envoyé à Claude en magenta
- 🔴 Erreurs en rouge

#### Option B : Logs simples
```bash
npm run dev
```

#### Option C : Via l'API HTTP
```bash
# Voir les 100 derniers logs
curl http://localhost:3000/api/logs

# Voir les 50 derniers logs
curl http://localhost:3000/api/logs?limit=50
```

### 2. Sur Railway

```bash
# Logs en temps réel
railway logs --follow

# Derniers 100 logs
railway logs --limit 100

# Filtrer par mot-clé
railway logs --filter "Nodes identifiés"
```

## 📊 Comprendre les Logs

### Structure d'une requête complète

1. **Requête entrante**
```
=== NOUVELLE REQUÊTE CLAUDE ===
Timestamp: 2024-01-15T10:30:00.000Z
Body: {
  "prompt": "fais moi un workflow...",
  "mode": "create",
  "versions": "12 nodes"
}
```

2. **Identification des nodes**
```
Réponse Haiku brute: ["gmail", "slack", "if"]
Nodes identifiés: ["gmail", "slack", "if"]
```

3. **Récupération des métadonnées**
```
Récupération des fiches pour: ["gmail", "slack", "if"]
✅ 3 fiches récupérées:
  - gmail v2 (données complètes)
  - slack v2 (données complètes)
  - if v1 (données complètes)
```

4. **Contexte envoyé à Claude**
```
--- CONTEXTE ENVOYÉ À CLAUDE OPUS ---
Model: claude-opus-4-20250514
Mode: création
Nodes enrichis: gmail, slack, if
Taille du system prompt: 15234 caractères
Contexte node-types inclus: 28456 caractères
```

## 🐛 Problèmes Courants

### 1. "The value 'equals' is not supported"

**Symptôme** : Le node IF/Filter affiche une erreur sur l'opération

**Cause** : Les métadonnées du node n'ont pas été chargées correctement

**Vérification** :
```bash
# Voir si le node "if" a été identifié
railway logs --filter "if"

# Vérifier si les fiches ont été récupérées
railway logs --filter "fiches récupérées"
```

**Solution** :
1. Vérifier que les variables d'environnement sont configurées :
   - `OPENAI_API_KEY`
   - `PINECONE_API_KEY`
2. Réindexer les nodes : `npm run update-nodes`

### 2. "The value '' is not supported"

**Symptôme** : Un node affiche une erreur sur une valeur vide

**Cause** : Propriété requise non configurée

**Vérification** :
```bash
# Voir le JSON généré
railway logs --filter "```json" -A 50
```

### 3. Nodes non reconnus

**Symptôme** : Claude génère des nodes avec des propriétés incorrectes

**Vérification** :
```bash
# Vérifier l'identification
railway logs --filter "Nodes identifiés"

# Si vide ou incorrect, vérifier Haiku
railway logs --filter "Réponse Haiku brute"
```

## 📈 Métriques Utiles

### Endpoint de statut
```bash
curl https://your-app.railway.app/api

# Réponse attendue :
{
  "status": "ok",
  "environment": {
    "claude_configured": true,
    "rag_available": true
  }
}
```

### Vérifier l'index Pinecone
```bash
# Via le script de test
npm run test:system
```

## 🔧 Mode Debug Avancé

### 1. Activer les logs détaillés

Ajouter dans `.env` :
```env
DEBUG=true
LOG_LEVEL=verbose
```

### 2. Tester une requête spécifique

```bash
# Créer un fichier test-request.json
{
  "prompt": "ton prompt ici",
  "context": {},
  "tools": [],
  "mode": "create",
  "versions": {
    "gmail": 2,
    "slack": 2
  }
}

# Envoyer la requête
curl -X POST http://localhost:3000/api/claude \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d @test-request.json
```

### 3. Analyser le workflow généré

1. Copier le JSON généré depuis les logs
2. Importer dans n8n
3. Vérifier chaque node individuellement
4. Noter les propriétés manquantes ou incorrectes

## 💡 Tips

1. **Toujours vérifier les versions** : L'extension doit envoyer le mapping des versions
2. **Logs Railway** : Utilisez `--filter` pour trouver rapidement l'info
3. **Volume Railway** : Les gros nodes sont stockés sur le volume, vérifier `/data/node-types/`
4. **Performance** : La première requête après déploiement est lente (cold start)

## 🆘 Support

Si le problème persiste :
1. Capturer les logs complets d'une requête
2. Noter la version de n8n utilisée
3. Vérifier que l'index est à jour : `npm run update-nodes` 