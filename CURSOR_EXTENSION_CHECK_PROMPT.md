# 🔍 Vérification de l'Extension Chrome n8n AI Assistant

## Contexte
Le backend vient d'être mis à jour avec des améliorations majeures pour gérer les limitations de Pinecone et améliorer les performances. Je dois vérifier que l'extension Chrome fonctionne correctement avec ces changements.

## 🚀 Changements Backend Importants

### 1. **Système de Volume pour Données Illimitées**
- Les métadonnées des nodes n8n > 40KB sont maintenant stockées sur un volume persistant
- Pinecone ne stocke plus que les métadonnées minimales pour la recherche
- Les données complètes (jusqu'à 280KB pour Notion) sont chargées depuis le volume

### 2. **Limites Augmentées**
- Output tokens : 8192 → 16384 (permet des workflows 2x plus grands)
- Protection : maximum 10 nodes chargés simultanément pour éviter de dépasser les 200k tokens d'entrée

### 3. **Backend API**
- URL locale : `http://localhost:3000/api/claude`
- URL production : `https://vibe-n8n.vercel.app/api/claude`
- Headers requis : `Authorization: Bearer ${API_KEY}`

## 📋 Checklist de Vérification

### 1. **Configuration de Base**
- [ ] Vérifier que `src/config.js` a la bonne URL du backend
- [ ] Vérifier que l'API_KEY est correctement configurée
- [ ] Tester la connexion au backend avec le bouton de test

### 2. **Test de Création de Workflow**
Créer un workflow complexe qui utilise des gros nodes :
```
"Crée un workflow qui :
1. Se déclenche toutes les heures
2. Récupère des données depuis une API
3. Les sauvegarde dans Notion dans une database
4. Envoie un message Slack avec un résumé
5. Notifie sur Discord si erreur"
```

**Points à vérifier :**
- [ ] Les nodes Notion et Slack sont correctement configurés avec toutes leurs propriétés
- [ ] Le workflow généré est valide et importable dans n8n
- [ ] La réponse n'est pas tronquée (grâce aux 16384 tokens)

### 3. **Test de Modification de Workflow**
Avec un workflow existant, tester :
```
"Ajoute une intégration HubSpot qui crée un contact avec les données de Notion"
```

**Points à vérifier :**
- [ ] Le RAG identifie et charge les métadonnées de HubSpot
- [ ] Les tool functions sont appelées correctement
- [ ] Le workflow existant est préservé

### 4. **Test de Performance**
- [ ] Mesurer le temps de réponse pour un workflow simple (~2-3s attendu)
- [ ] Mesurer le temps pour un workflow complexe (5+ nodes)
- [ ] Vérifier que le streaming fonctionne (réponse progressive)

### 5. **Test des Limites**
Tenter de créer un workflow très complexe :
```
"Crée un workflow qui intègre Slack, Notion, HubSpot, Salesforce, Microsoft Outlook, 
Zoho CRM, Discord, Telegram et WhatsApp pour une synchronisation complète"
```

**Comportement attendu :**
- [ ] Le système charge au maximum 10 nodes
- [ ] Pas d'erreur de dépassement de limite
- [ ] Workflow fonctionnel malgré la complexité

### 6. **Vérification des Logs**
Dans la console du backend, vérifier :
- [ ] "Nodes identifiés: [...]" apparaît
- [ ] "X fiches de nodes récupérées avec leurs métadonnées complètes"
- [ ] "Node chargé: nom-du-node (XXX caractères)"

### 7. **Tests d'Erreur**
- [ ] Tester avec une mauvaise API key → Erreur 401
- [ ] Tester sans connexion internet → Message d'erreur approprié
- [ ] Tester avec un node inexistant → Gestion gracieuse

## 🛠️ Actions Correctives si Nécessaire

### Si les métadonnées ne se chargent pas :
1. Vérifier que le backend a bien `OPENAI_API_KEY` et `PINECONE_API_KEY`
2. Vérifier que l'extension envoie le mapping `versions` dans la requête
3. Logs backend : chercher "Erreur système node-types"

### Si la réponse est tronquée :
1. Vérifier que `max_tokens: 16384` dans `api/claude.js`
2. Vérifier la taille du workflow généré

### Si le streaming ne fonctionne pas :
1. Vérifier les headers CORS dans le backend
2. Vérifier que l'extension parse correctement les Server-Sent Events

## 📊 Rapport de Test

Après les tests, créer un rapport avec :
1. Version de l'extension testée
2. Environnement (local/production)
3. Résultats de chaque test
4. Problèmes identifiés
5. Suggestions d'amélioration

## 💡 Améliorations Suggérées pour l'Extension

1. **Indicateur de progression** : Afficher quels nodes sont en train d'être chargés
2. **Estimation de complexité** : Prévenir si trop de nodes sont demandés
3. **Cache local** : Stocker les workflows générés récemment
4. **Mode debug** : Option pour voir les données RAG dans la console

---

**Note importante** : Le backend utilise maintenant un système hybride Pinecone + Volume qui permet de gérer des nodes jusqu'à 280KB (Notion). L'extension doit continuer à fonctionner normalement, mais avec de bien meilleures performances pour les workflows complexes. 