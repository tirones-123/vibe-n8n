# 🧪 Instructions de Test - Extension Chrome n8n AI Assistant

## 📋 Prérequis

- Chrome ou navigateur Chromium
- Accès à une instance n8n (cloud ou self-hosted)
- Node.js (pour les tests automatisés)

## 🚀 Tests Rapides (5 minutes)

### 1. Test Backend Automatisé
```bash
# Test de connexion et fonctionnalités de base
node quick-test.js
```

**Résultats attendus :**
- ✅ Connexion réussie
- ✅ Workflow simple généré (< 10s)
- ✅ Workflow complexe avec services multiples
- ✅ Limites étendues utilisées (> 8192 tokens)

### 2. Test Interface Web
```bash
# Ouvrir dans un navigateur
open integration-test.html
```

**Tests à effectuer :**
1. Cliquer "🔗 Tester la Connexion"
2. Lancer "Workflow Simple"
3. Lancer "Workflow Complexe"
4. Vérifier les métriques temps réel

## 🔧 Installation Extension

### 1. Chargement en Mode Développeur
1. Ouvrir Chrome → `chrome://extensions/`
2. Activer "Mode développeur"
3. Cliquer "Charger l'extension non empaquetée"
4. Sélectionner le dossier `cursor-n8n/`

### 2. Vérification Installation
- L'icône 🤖 apparaît dans la barre d'extensions
- Clic sur l'icône → popup "n8n AI Assistant"

## 🎯 Tests Fonctionnels sur n8n

### 1. Test Création Workflow

**Étapes :**
1. Aller sur `https://app.n8n.io` ou votre instance
2. Créer un nouveau workflow
3. Cliquer le bouton bleu 🤖 en bas à droite
4. Taper : `"Crée un workflow qui récupère des emails Gmail et les envoie sur Slack"`

**Résultats attendus :**
- ✅ Mode "Création" détecté
- ✅ Workflow JSON généré
- ✅ Import automatique dans n8n
- ✅ Nodes Gmail et Slack créés
- ✅ Connexions établies

### 2. Test Modification Workflow

**Étapes :**
1. Avec un workflow existant (2+ nodes)
2. Ouvrir l'assistant IA
3. Taper : `"Ajoute un nœud Discord après le nœud Slack"`

**Résultats attendus :**
- ✅ Mode "Modification" détecté
- ✅ Tool calls exécutés
- ✅ Nœud Discord ajouté
- ✅ Connexion créée
- ✅ Animation visuelle

### 3. Test Workflow Complexe

**Prompt de test :**
```
Crée un workflow complexe qui :
1. Se déclenche toutes les heures
2. Récupère des données depuis une API REST
3. Les transforme et filtre
4. Sauvegarde dans Notion
5. Envoie un résumé sur Slack
6. Notifie Discord en cas d'erreur
7. Log dans un fichier
```

**Résultats attendus :**
- ✅ 7+ nœuds créés
- ✅ Toutes les connexions établies
- ✅ Paramètres détaillés (grâce aux métadonnées étendues)
- ✅ Gestion d'erreurs incluse
- ✅ Pas de troncature (16384 tokens)

## 📊 Vérification des Nouvelles Fonctionnalités

### 1. Système Hybride Pinecone + Volume

**Indicateurs dans les logs backend :**
```
✅ "Nodes identifiés: notion, slack, discord, hubspot"
✅ "X fiches de nodes récupérées avec leurs métadonnées complètes"
✅ "Node chargé: notion (280KB)"
✅ "Utilisation du volume pour données étendues"
```

### 2. Limites Augmentées (16384 tokens)

**Test de limite :**
- Workflow avec 8+ services intégrés
- Vérifier que la réponse n'est pas tronquée
- Tokens utilisés > 8192

### 3. Métadonnées Étendues

**Vérifications :**
- Nodes Notion avec tous les paramètres
- Configurations OAuth complètes
- Propriétés avancées des services

## 🐛 Tests d'Erreur

### 1. Gestion des Erreurs Réseau
```javascript
// Tester avec backend inaccessible
// Modifier temporairement CONFIG.API_URL dans src/config.js
```

### 2. Gestion d'Authentification
```javascript
// Tester avec clé API invalide
// Résultat attendu: Erreur 401 gérée gracieusement
```

### 3. Timeout et Retry
```javascript
// Workflow très complexe pour tester les timeouts
// Vérifier la gestion des déconnexions
```

## 📈 Métriques de Performance

### Temps de Réponse Attendus
- **Connexion** : < 2 secondes
- **Workflow simple** : 3-8 secondes
- **Workflow complexe** : 8-15 secondes
- **Modifications** : 2-5 secondes

### Utilisation Mémoire
- **Extension** : < 50 MB
- **Cache localStorage** : < 100 KB
- **Pas de fuites mémoire**

## 🔍 Debugging

### Logs Chrome DevTools
```javascript
// Ouvrir F12 → Console
// Rechercher les logs :
console.log('🎯 Mode détecté: create/modify');
console.log('📊 Versions reçues: X nodes');
console.log('🚀 Fonctionnalités backend supportées');
```

### Logs Extension
```javascript
// Background script
chrome.runtime.onMessage.addListener(...);

// Content script  
window.postMessage({ type: 'GET_WORKFLOW_CONTEXT' });

// Inject script
console.log('💉 inject.js: Script injecté CHARGÉ !');
```

## ⚠️ Problèmes Courants

### Extension ne se charge pas
- Vérifier le mode développeur activé
- Recharger l'extension dans chrome://extensions/
- Vérifier les erreurs dans la console

### Bouton 🤖 n'apparaît pas
- Vérifier que vous êtes sur une page de workflow n8n
- Recharger la page (Ctrl+R)
- Vérifier les domaines autorisés dans manifest.json

### Pinia non trouvé
- Attendre le chargement complet de n8n
- Vérifier que vous êtes en mode édition de workflow
- Essayer de recharger la page

### Versions non récupérées
- Vérifier l'accès à /rest/node-types
- Fallback via script injecté activé
- Cache localStorage vérifié

## 📝 Rapport de Test

### Template de Rapport
```markdown
## Test Report - $(date)

### Configuration
- Extension Version: 1.0.0
- Browser: Chrome $(version)
- n8n Instance: $(url)
- Backend: Railway

### Tests Passed
- [ ] Connexion backend
- [ ] Workflow simple
- [ ] Workflow complexe  
- [ ] Modifications
- [ ] Gestion erreurs
- [ ] Performance

### Issues Found
- None / List issues

### Recommendations
- List recommendations
```

## 🎯 Critères de Validation

### ✅ Extension Prête pour Production
- Tous les tests fonctionnels passent
- Performance acceptable (< 15s pour workflows complexes)
- Gestion d'erreurs robuste
- Compatibilité avec nouvelles fonctionnalités backend
- Pas de régression par rapport à la version précédente

### 🚀 Prêt pour Déploiement
- Tests automatisés passent
- Tests manuels validés
- Métriques de performance respectées
- Documentation à jour
- Rapport de test complet

---

**Note** : Ces tests valident la compatibilité avec le nouveau système backend hybride Pinecone + Volume et les limites étendues à 16384 tokens. 