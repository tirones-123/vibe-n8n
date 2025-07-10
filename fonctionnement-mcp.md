# Comprendre le fonctionnement du mcp pour n8n
_Exported on 10/07/2025 at 15:46:43 UTC+1 from Cursor (1.2.2)_

---

**User**

explique moi comment ce mcp marche pour generer les json n8n

---

**Cursor**

Je vais vous expliquer comment ce MCP (Model Context Protocol) fonctionne pour générer des JSON n8n. Laissez-moi d'abord explorer l'architecture du système.

Voici comment ce MCP (Model Context Protocol) fonctionne pour générer des JSON n8n :

## 📋 Vue d'ensemble du système

Ce MCP n8n agit comme une **interface intelligente** entre l'IA (Claude) et n8n. Il ne génère pas directement des JSON, mais **fournit tous les outils nécessaires** pour que l'IA puisse construire des workflows n8n valides.

## 🏗️ Architecture du système

### 1. **Base de données SQLite optimisée**
- **525 nœuds n8n** analysés et stockés
- **Propriétés essentielles** (10-20 au lieu de 200+)
- **Exemples de configuration** pré-calculés
- **Documentation officielle** intégrée
- **Templates de tâches** communes

### 2. **Processus de génération en 6 étapes**

#### **Phase 1 : Découverte** 🔍
```typescript
// L'IA découvre les nœuds disponibles
search_nodes({query: 'slack'})
list_nodes({category: 'trigger'})
list_ai_tools() // 263 nœuds AI détectés
```

#### **Phase 2 : Configuration** ⚙️
```typescript
// Récupération des propriétés essentielles
get_node_essentials('n8n-nodes-base.slack')
// Retourne seulement 10-20 propriétés importantes au lieu de 200+

// Templates pré-configurés
get_node_for_task('send_slack_message')
// Retourne une configuration prête à l'emploi
```

#### **Phase 3 : Pré-validation** ✅
```typescript
// Validation rapide des champs requis
validate_node_minimal('n8n-nodes-base.slack', {
  resource: 'message',
  operation: 'post'
})

// Validation complète avec profils
validate_node_operation('n8n-nodes-base.slack', config, 'runtime')
```

#### **Phase 4 : Construction** 🔧
L'IA construit le workflow JSON en utilisant les configurations validées :

```json
{
  "name": "Slack Notification",
  "nodes": [
    {
      "id": "webhook-1",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [250, 300],
      "parameters": {
        "path": "/notify",
        "httpMethod": "POST"
      }
    },
    {
      "id": "slack-1", 
      "name": "Slack",
      "type": "n8n-nodes-base.slack",
      "typeVersion": 2,
      "position": [450, 300],
      "parameters": {
        "resource": "message",
        "operation": "post",
        "channel": "#general",
        "text": "{{ $json.message }}"
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "Slack", "type": "main", "index": 0}]]
    }
  }
}
```

#### **Phase 5 : Validation du workflow** 🔍
```typescript
// Validation complète du workflow
validate_workflow(workflowJson)
validate_workflow_connections(workflowJson)
validate_workflow_expressions(workflowJson)
```

#### **Phase 6 : Déploiement** 🚀
```typescript
// Création dans n8n (si API configurée)
n8n_create_workflow(validatedWorkflow)

// Mise à jour par diff (économie de 80-90% de tokens)
n8n_update_partial_workflow({
  workflowId: id,
  operations: [
    {type: 'updateNode', nodeName: 'Slack', changes: {position: [600, 300]}}
  ]
})
```

## 🎯 Mécanismes clés

### **1. Génération d'exemples intelligente**
```typescript
// Classe ExampleGenerator avec exemples curés
'nodes-base.slack': {
  minimal: {
    resource: 'message',
    operation: 'post',
    channel: '#general',
    text: 'Hello from n8n!'
  },
  common: {
    resource: 'message',
    operation: 'post',
    channel: '#notifications',
    text: 'New order received!',
    attachments: [...]
  }
}
```

### **2. Templates de tâches**
```typescript
// Templates pré-configurés pour tâches communes
'send_slack_message': {
  nodeType: 'nodes-base.slack',
  configuration: {
    resource: 'message',
    operation: 'post',
    channel: '',
    text: ''
  },
  userMustProvide: [
    {property: 'channel', description: 'The Slack channel', example: '#general'},
    {property: 'text', description: 'The message text'}
  ]
}
```

### **3. Validation multi-niveaux**
```typescript
// Profiles de validation
'minimal'    // Seulement les champs requis
'runtime'    // Validation pour l'exécution
'ai-friendly' // Optimisé pour l'IA  
'strict'     // Validation complète
```

### **4. Système de diff pour mises à jour**
```typescript
// Opérations atomiques au lieu de remplacements complets
{
  type: 'addNode',
  node: { id: 'new-node', name: 'New Node', ... }
},
{
  type: 'addConnection',
  source: 'Webhook',
  target: 'New Node'
}
```

## 🔄 Flux de données

1. **Extraction initiale** → Base de données SQLite (525 nœuds)
2. **Requête IA** → Recherche sémantique dans la base
3. **Filtrage intelligent** → Propriétés essentielles uniquement
4. **Génération d'exemples** → Configurations valides
5. **Validation pré-construction** → Évite les erreurs
6. **Construction JSON** → Workflow n8n valide
7. **Validation post-construction** → Garantit la cohérence
8. **Déploiement** → API n8n ou artefact local

## 🎨 Avantages clés

- **95% moins de données** : 5KB au lieu de 100KB+ par nœud
- **Validation précoce** : Erreurs détectées avant la construction
- **Exemples concrets** : Configurations qui fonctionnent
- **Mise à jour incrémentale** : 80-90% d'économie de tokens
- **Support IA intégré** : 263 nœuds détectés comme outils IA

Le système transforme l'IA d'un "traducteur qui devine" en un "compositeur qui sait", permettant la création de workflows n8n robustes et validés.

```typescript
// L'IA découvre les nœuds disponibles
search_nodes({query: 'slack'})
list_nodes({category: 'trigger'})
list_ai_tools() // 263 nœuds AI détectés
```

```typescript
// Récupération des propriétés essentielles
get_node_essentials('n8n-nodes-base.slack')
// Retourne seulement 10-20 propriétés importantes au lieu de 200+

// Templates pré-configurés
get_node_for_task('send_slack_message')
// Retourne une configuration prête à l'emploi
```

```typescript
// Validation rapide des champs requis
validate_node_minimal('n8n-nodes-base.slack', {
  resource: 'message',
  operation: 'post'
})

// Validation complète avec profils
validate_node_operation('n8n-nodes-base.slack', config, 'runtime')
```

```json
{
  "name": "Slack Notification",
  "nodes": [
    {
      "id": "webhook-1",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [250, 300],
      "parameters": {
        "path": "/notify",
        "httpMethod": "POST"
      }
    },
    {
      "id": "slack-1", 
      "name": "Slack",
      "type": "n8n-nodes-base.slack",
      "typeVersion": 2,
      "position": [450, 300],
      "parameters": {
        "resource": "message",
        "operation": "post",
        "channel": "#general",
        "text": "{{ $json.message }}"
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "Slack", "type": "main", "index": 0}]]
    }
  }
}
```

```typescript
// Validation complète du workflow
validate_workflow(workflowJson)
validate_workflow_connections(workflowJson)
validate_workflow_expressions(workflowJson)
```

```typescript
// Création dans n8n (si API configurée)
n8n_create_workflow(validatedWorkflow)

// Mise à jour par diff (économie de 80-90% de tokens)
n8n_update_partial_workflow({
  workflowId: id,
  operations: [
    {type: 'updateNode', nodeName: 'Slack', changes: {position: [600, 300]}}
  ]
})
```

```typescript
// Classe ExampleGenerator avec exemples curés
'nodes-base.slack': {
  minimal: {
    resource: 'message',
    operation: 'post',
    channel: '#general',
    text: 'Hello from n8n!'
  },
  common: {
    resource: 'message',
    operation: 'post',
    channel: '#notifications',
    text: 'New order received!',
    attachments: [...]
  }
}
```

```typescript
// Templates pré-configurés pour tâches communes
'send_slack_message': {
  nodeType: 'nodes-base.slack',
  configuration: {
    resource: 'message',
    operation: 'post',
    channel: '',
    text: ''
  },
  userMustProvide: [
    {property: 'channel', description: 'The Slack channel', example: '#general'},
    {property: 'text', description: 'The message text'}
  ]
}
```

```typescript
// Profiles de validation
'minimal'    // Seulement les champs requis
'runtime'    // Validation pour l'exécution
'ai-friendly' // Optimisé pour l'IA  
'strict'     // Validation complète
```

```typescript
// Opérations atomiques au lieu de remplacements complets
{
  type: 'addNode',
  node: { id: 'new-node', name: 'New Node', ... }
},
{
  type: 'addConnection',
  source: 'Webhook',
  target: 'New Node'
}
```

---

**User**

fais moi un doc qui explique exactement comment marche ce mcp point par point, je veux le detail exacte du worflow entre la requete claude/llm à la création du json en donnant le chemin de tous les fichier et la strucutre de la base de donéee etc prends le temps de bien tout comprendre et n'ivente rien prend uniquement en information ceuq tu as dans ce projet

---

**Cursor**

# Documentation interne – Fonctionnement exact de n8n-MCP  
*(basé exclusivement sur les fichiers présents dans ce dépôt)*  

---

## 1. Vue d’ensemble

1. Claude (ou n’importe quel LLM) envoie une requête **MCP** au serveur n8n-MCP.  
   Ex. :  
   ```json
   {"name":"get_node_essentials","arguments":{"nodeType":"n8n-nodes-base.httpRequest"}}
   ```
2. Le binaire `n8n-mcp` (voir `src/mcp/index.ts`) démarre en mode **stdio** (par défaut) ou **http**.
3. Le cœur du serveur (`src/mcp/server.ts`, classe `N8NDocumentationMCPServer`)  
   a. charge la base SQLite `data/nodes.db` ;  
   b. instancie les services (repository, templates, cache…) ;  
   c. route la requête vers le **handler** approprié.  
4. Le handler exécute la logique demandée (lecture DB, validation, diff, appel API n8n…).  
5. Le serveur renvoie le JSON résultat sur stdout ⇒ Claude l’utilise pour construire ou valider un **workflow JSON n8n**.  
6. Quand le workflow est prêt, Claude appelle `n8n_create_workflow` (ou `n8n_update_partial_workflow`) ; le serveur contacte alors l’API n8n (`src/services/n8n-api-client.ts`) et stocke/active le workflow.

---

## 2. Entrée / Transport

| Étape | Code concerné | Rôle |
|-------|---------------|------|
| 1. Lancement | `src/mcp/index.ts` | Choix du mode (`stdio` ou `http`), gestion des erreurs globales. |
| 2. Transport stdio | `N8NDocumentationMCPServer.run()` dans `src/mcp/server.ts` | Boucle de lecture/écriture MCP. |
| 3. Transport HTTP (optionnel) | `src/http-server.ts` ou `src/http-server-single-session.ts` | Expose les mêmes handlers via REST. |

---

## 3. Routage & définition des outils

| Élément | Fichier | Contenu / rôle |
|---------|---------|----------------|
| Catalogue d’outils | `src/mcp/tools.ts` | Tableau `ToolDefinition[]` : nom, description, schéma JSON. |
| Documentation auto | `src/mcp/tools-documentation.ts` | Texte « tools_documentation ». |
| Outils de gestion n8n | `src/mcp/tools-n8n-manager.ts` | `n8n_create_workflow`, `n8n_update_partial_workflow`, etc. |
| Dispatch | `executeTool()` dans `src/mcp/server.ts` | `switch` qui appelle le handler correspondant. |
| Handlers | `src/mcp/handlers-*.ts` | Implémentations métier (création workflow, health-check…). |

---

## 4. Base de données `data/nodes.db`

### 4.1 Chemin et accès
* Fichier : `data/nodes.db` (SQLite)  
* Accès via **DatabaseAdapter** (`src/database/database-adapter.ts`)  
  * Essaie `better-sqlite3`, bascule sur `sql.js` si échec (no native deps).

### 4.2 Schéma minimal (`src/database/schema.sql`)
```sql
CREATE TABLE nodes (
  node_type TEXT PRIMARY KEY,
  package_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  development_style TEXT CHECK(development_style IN ('declarative','programmatic')),
  is_ai_tool INTEGER DEFAULT 0,
  is_trigger INTEGER DEFAULT 0,
  is_webhook INTEGER DEFAULT 0,
  is_versioned INTEGER DEFAULT 0,
  version TEXT,
  documentation TEXT,
  properties_schema TEXT,
  operations TEXT,
  credentials_required TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_package  ON nodes(package_name);
CREATE INDEX idx_ai_tool  ON nodes(is_ai_tool);
CREATE INDEX idx_category ON nodes(category);
```

### 4.3 Schéma étendu (rebuild offline)  
Généré par `NodeDocumentationService.initializeDatabase()` (`src/services/node-documentation-service.ts`) :  
* Même table `nodes` **mais** + de 40 colonnes supplémentaires (source_code, templates, example_workflow, etc.).  
* Tables `documentation_sources`, `extraction_stats`.  
* FTS 5 virtuel `nodes_fts` + triggers `nodes_ai / ad / au`.

### 4.4 Repository d’accès
* `src/database/node-repository.ts`  
  * Méthodes `getNode()`, `saveNode()`, `getAITools()`.  
  * (Dé)sérialise les colonnes JSON (`properties_schema`, `operations`, …).

---

## 5. Services utilisés pendant une requête

| Service | Fichier | Utilisation principale |
|---------|---------|------------------------|
| **PropertyFilter** | `src/services/property-filter.ts` | Sélection des propriétés essentielles / requises. |
| **ExampleGenerator** | `src/services/example-generator.ts` | Exemples `minimal`, `common`, `advanced` pour chaque node. |
| **TaskTemplates** | `src/services/task-templates.ts` | Pré-sets pour `get_node_for_task` et `list_tasks`. |
| **EnhancedConfigValidator** | `src/services/enhanced-config-validator.ts` | Validation des paramètres d’un node (`validate_node_operation`). |
| **WorkflowValidator** | `src/services/workflow-validator.ts` | Validation globale du JSON workflow (`validate_workflow`). |
| **WorkflowDiffEngine** | `src/services/workflow-diff-engine.ts` | Applique jusqu’à 5 opérations diff (`n8n_update_partial_workflow`). |
| **N8nApiClient** | `src/services/n8n-api-client.ts` | REST client vers `/api/v1` de n8n. |

---

## 6. Chaîne complète : de la requête Claude à la création d’un JSON n8n

| # | Action détaillée | Code impliqué |
|---|------------------|--------------|
| 1 | Claude envoie un JSON MCP (stdin) | `index.ts` lit sur `process.stdin` via `N8NDocumentationMCPServer.run()` |
| 2 | Parsing + dispatch dans `executeTool()` | `src/mcp/server.ts` |
| 3 | Par ex. `get_node_essentials` → `getNodeEssentials()` | Recherche dans **NodeRepository** puis filtre propriété, génère exemples. |
| 4 | Réponse JSON renvoyée par stdout → Claude | (stdio) |
| 5 | Claude compose une config node valide | (coté IA) |
| 6 | Pré-validation : `validate_node_operation` / `validate_node_minimal` | Méthodes internes → `EnhancedConfigValidator` |
| 7 | Claude génère l’objet **workflow JSON** (nodes + connections) | (coté IA) |
| 8 | Validation complète : `validate_workflow` | `WorkflowValidator.validateWorkflow()` |
| 9 | Déploiement : `n8n_create_workflow` | Handler `handleCreateWorkflow()` → `N8nApiClient.createWorkflow()` |
| 10 | Mises à jour futures : `n8n_update_partial_workflow` | `WorkflowDiffEngine.applyDiff()` puis `N8nApiClient.updateWorkflow()` |

---

## 7. Fichiers clés (chemins relatifs)

```
src/mcp/index.ts
src/mcp/server.ts
src/mcp/tools.ts
src/mcp/tools-documentation.ts
src/mcp/tools-n8n-manager.ts
src/mcp/handlers-n8n-manager.ts
src/mcp/handlers-workflow-diff.ts
src/database/database-adapter.ts
src/database/node-repository.ts
src/database/schema.sql
src/database/schema-optimized.sql
data/nodes.db
src/services/node-documentation-service.ts
src/services/example-generator.ts
src/services/task-templates.ts
src/services/property-filter.ts
src/services/enhanced-config-validator.ts
src/services/workflow-validator.ts
src/services/workflow-diff-engine.ts
src/services/n8n-api-client.ts
```

*(Tous les chemins sont confirmés dans le dépôt.)*

---

## 8. Points de cache & optimisation

* **SimpleCache** (`src/utils/simple-cache.ts`) : TTL 1 h pour `get_node_essentials`, etc.  
* **DatabaseAdapter** enregistre automatiquement sur disque (sql.js) toutes les 100 ms de calme.  
* **FTS 5** sur `nodes_fts` permet la recherche rapide (`search_nodes`).

---

## 9. Processus de reconstruction de la base (`npm run rebuild`)

1. `src/scripts/rebuild.ts` lance `NodeDocumentationService.rebuildDatabase()`  
2. Extraction du code source des nœuds (`utils/node-source-extractor.ts`)  
3. Scraping de la doc n8n (`utils/enhanced-documentation-fetcher.ts`)  
4. Stockage complet dans la table **nodes** (schéma étendu)  
5. Statistiques d’extraction enregistrées dans `extraction_stats`.

---

## 10. Résumé

Le serveur n8n-MCP :  
* expose > 30 outils MCP (documentation, validation, création, diff) ;  
* s’appuie sur une base SQLite pré-remplie (`data/nodes.db`) pour répondre quasi instantanément ;  
* valide chaque étape (nœud, workflow, diff) avant de toucher à votre instance n8n ;  
* interagit avec Claude par JSON strict, sans jamais mélanger logs et flux MCP en mode **stdio**.  

Cette documentation couvre **tous** les chemins de fichiers et la structure exacte de la base tels qu’ils apparaissent dans le dépôt.

```json
   {"name":"get_node_essentials","arguments":{"nodeType":"n8n-nodes-base.httpRequest"}}
```

```sql
CREATE TABLE nodes (
  node_type TEXT PRIMARY KEY,
  package_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  development_style TEXT CHECK(development_style IN ('declarative','programmatic')),
  is_ai_tool INTEGER DEFAULT 0,
  is_trigger INTEGER DEFAULT 0,
  is_webhook INTEGER DEFAULT 0,
  is_versioned INTEGER DEFAULT 0,
  version TEXT,
  documentation TEXT,
  properties_schema TEXT,
  operations TEXT,
  credentials_required TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_package  ON nodes(package_name);
CREATE INDEX idx_ai_tool  ON nodes(is_ai_tool);
CREATE INDEX idx_category ON nodes(category);
```

```plaintext
src/mcp/index.ts
src/mcp/server.ts
src/mcp/tools.ts
src/mcp/tools-documentation.ts
src/mcp/tools-n8n-manager.ts
src/mcp/handlers-n8n-manager.ts
src/mcp/handlers-workflow-diff.ts
src/database/database-adapter.ts
src/database/node-repository.ts
src/database/schema.sql
src/database/schema-optimized.sql
data/nodes.db
src/services/node-documentation-service.ts
src/services/example-generator.ts
src/services/task-templates.ts
src/services/property-filter.ts
src/services/enhanced-config-validator.ts
src/services/workflow-validator.ts
src/services/workflow-diff-engine.ts
src/services/n8n-api-client.ts
```

