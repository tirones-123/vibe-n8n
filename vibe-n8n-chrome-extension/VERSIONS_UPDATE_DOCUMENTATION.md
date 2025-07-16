# Documentation - Mise à jour du système de versions

## 📋 Résumé des changements

L'extension Chrome n8n AI Assistant a été mise à jour pour supporter le nouveau système de gestion dynamique des versions des nodes. Le backend utilise maintenant les métadonnées exactes des nodes récupérées depuis n8n au lieu d'une documentation statique.

## 🔄 Changements apportés

### 1. **content.js** - Script principal

#### Nouvelles fonctions ajoutées :

- **`fetchNodeVersions()`** : Récupère les versions des nodes depuis l'API n8n `/rest/node-types`
  - Gère les erreurs CORS et d'authentification
  - Fallback vers le script injecté si l'API n'est pas accessible
  - Cache les résultats dans localStorage (24h)

- **`fetchNodeVersionsViaInject()`** : Alternative pour récupérer les versions via le script injecté
  - Utilisé quand l'API REST est bloquée (CORS, auth)
  - Communique avec inject.js via postMessage

- **`ensureNodeVersions()`** : Gestionnaire de cache intelligent
  - Vérifie d'abord la mémoire
  - Puis le cache localStorage
  - Récupère de nouvelles versions si nécessaire

#### Modifications :

- **`sendMessage()`** : Maintenant asynchrone, récupère et envoie les versions avec chaque requête
- **`init()`** : Charge les versions en arrière-plan au démarrage

### 2. **background.js** - Service Worker

#### Modifications :

- **Message listener** : Accepte maintenant le paramètre `versions` depuis content.js
- **`handleClaudeRequest()`** : 
  - Signature mise à jour pour accepter `versions`
  - Inclut les versions dans le `requestBody` envoyé à l'API
  - Logs ajoutés pour le debug

### 3. **inject.js** - Script injecté

#### Nouvelles fonctions :

- **`sendNodeVersions()`** : Récupère les versions depuis les stores Pinia
  - Essaie 3 méthodes différentes :
    1. Via `nodeTypesStore` de Pinia
    2. Via `window.n8n.nodeTypes` (si disponible)
    3. Via l'API REST depuis le contexte de la page

#### Modifications :

- Nouveau handler pour le message `GET_NODE_VERSIONS`

## 📊 Format des données

### Versions envoyées au backend :
```json
{
  "slack": 4,
  "httpRequest": 5,
  "gmail": 2,
  "webhook": 3,
  "n8n-nodes-base.slack": 4,
  "n8n-nodes-base.httpRequest": 5,
  // ... ~300+ nodes
}
```

### Requête complète vers le backend :
```json
{
  "prompt": "Crée un workflow qui...",
  "context": {
    "nodes": [...],
    "connections": {...}
  },
  "mode": "create",
  "tools": [...],
  "versions": {
    "slack": 4,
    "httpRequest": 5,
    // ...
  }
}
```

## 🔐 Gestion des cas d'erreur

1. **API inaccessible** : Fallback vers inject script
2. **CORS bloqué** : Utilise inject script dans le contexte de la page
3. **Authentification échouée** : Tente via inject script
4. **Aucune version trouvée** : Envoie `null` (backend utilisera latest)
5. **Cache expiré** : Récupère de nouvelles versions

## 💾 Système de cache

- **Durée** : 24 heures
- **Stockage** : localStorage
- **Clés** :
  - `n8n-ai-node-versions` : Les versions
  - `n8n-ai-node-versions-timestamp` : Timestamp de mise en cache

## 🚀 Performance

- Les versions sont chargées **une seule fois** au démarrage
- Cache en mémoire pour les requêtes suivantes
- Récupération asynchrone en arrière-plan
- ~3k tokens ajoutés par requête (acceptable)

## 🧪 Tests recommandés

1. **Instance locale** : Vérifier que `/rest/node-types` fonctionne
2. **n8n Cloud** : Vérifier le fallback via inject script
3. **Cache** : Vérifier la persistance après rechargement
4. **Erreurs** : Tester avec API bloquée/indisponible

## 📈 Bénéfices

- ✅ Workflows générés compatibles avec l'instance de l'utilisateur
- ✅ Utilisation des bonnes `typeVersion` pour chaque node
- ✅ Pas d'erreurs de compatibilité
- ✅ Support de toutes les instances n8n (cloud, self-hosted)
- ✅ Résilience avec multiples méthodes de récupération 