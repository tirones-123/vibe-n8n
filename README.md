# n8n AI Assistant Backend

Backend API pour l'extension Chrome n8n AI Assistant. Ce backend fait le pont entre l'extension Chrome et l'API Claude d'Anthropic pour permettre la création et modification de workflows n8n en langage naturel.

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+ installé
- Un compte Anthropic avec accès à l'API Claude
- Un compte Vercel (gratuit)

### Installation locale

1. **Cloner le repository**
```bash
git clone <your-repo-url>
cd n8n-ai-backend
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
cp env.example .env.local
```

Éditer `.env.local` et ajouter vos clés :
- `CLAUDE_API_KEY` : Votre clé API Anthropic (obtenir sur https://console.anthropic.com/)
- `BACKEND_API_KEY` : Un token sécurisé de votre choix

4. **Lancer en développement**
```bash
npm run dev
```

L'API sera disponible sur `http://localhost:3000/api/claude`

## 📦 Déploiement sur Vercel

### Option 1 : Via Vercel CLI (Recommandé)

1. **Installer Vercel CLI**
```bash
npm i -g vercel
```

2. **Déployer**
```bash
vercel
```

Suivre les instructions :
- Confirmer le déploiement
- Choisir un nom de projet
- Laisser les paramètres par défaut

3. **Configurer les variables d'environnement**
```bash
# Ajouter la clé API Claude
vercel env add CLAUDE_API_KEY production

# Ajouter le token d'authentification
vercel env add BACKEND_API_KEY production
```

4. **Redéployer avec les variables**
```bash
vercel --prod
```

### Option 2 : Via GitHub + Vercel Dashboard

1. **Pusher sur GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo>
git push -u origin main
```

2. **Connecter sur Vercel**
- Aller sur https://vercel.com/dashboard
- Cliquer sur "New Project"
- Importer le repository GitHub
- Configurer les variables d'environnement dans l'interface
- Déployer

## 🔧 Configuration de l'extension Chrome

Une fois le backend déployé, mettre à jour la configuration dans l'extension :

```javascript
// Dans src/config.js de l'extension
const CONFIG = {
  API_URL: 'https://your-project-name.vercel.app/api/claude',
  API_KEY: 'your-backend-api-key', // Le même que BACKEND_API_KEY
};
```

## 📡 Utilisation de l'API

### Endpoint

```
POST https://your-project.vercel.app/api/claude
```

### Headers requis

```
Authorization: Bearer YOUR_BACKEND_API_KEY
Content-Type: application/json
```

### Body de la requête

```json
{
  "prompt": "Crée un workflow qui envoie un email tous les matins",
  "context": {
    "nodes": [...],
    "connections": {...}
  },
  "tools": [...]
}
```

### Réponse

La réponse est un stream Server-Sent Events (SSE) qui transmet en temps réel :
- Les messages texte de Claude
- Les appels de fonctions (tool calls)
- Les erreurs éventuelles

## 🛠️ Développement

### Structure du projet

```
n8n-ai-backend/
├── api/
│   └── claude.js       # Endpoint principal
├── package.json        # Dépendances
├── vercel.json        # Configuration Vercel
├── env.example        # Exemple de variables
└── README.md          # Ce fichier
```

### Scripts disponibles

- `npm run dev` : Lance le serveur de développement
- `npm run deploy` : Déploie en production
- `npm run logs` : Affiche les logs Vercel

### Gestion des erreurs

Le backend gère plusieurs types d'erreurs :
- 401 : Token d'authentification invalide
- 400 : Paramètres manquants ou invalides
- 500 : Erreur API Claude ou serveur

## 🔒 Sécurité

- **Authentication** : Toutes les requêtes doivent inclure un Bearer token
- **CORS** : Configuré pour accepter les requêtes de toutes les origines (nécessaire pour l'extension)
- **Rate limiting** : Géré automatiquement par Vercel et Anthropic
- **Validation** : Tous les inputs sont validés avant traitement

## 📊 Monitoring

### Logs Vercel

```bash
# Voir les logs en temps réel
npm run logs

# Ou directement avec Vercel CLI
vercel logs --follow
```

### Dashboard Vercel

Accéder aux métriques et logs sur https://vercel.com/dashboard

## 🚨 Troubleshooting

### L'extension ne peut pas se connecter

1. Vérifier que l'URL du backend est correcte dans l'extension
2. Vérifier que le token d'authentification correspond
3. Vérifier les CORS dans les logs

### Erreur 401 Unauthorized

- Vérifier que `BACKEND_API_KEY` est bien configuré sur Vercel
- Vérifier que le token dans l'extension correspond

### Timeout sur Vercel

- Le plan gratuit limite à 10 secondes
- Le plan Pro permet jusqu'à 300 secondes
- Notre configuration utilise 30 secondes (nécessite plan Pro)

### Stream interrompu

- Vérifier la stabilité de la connexion
- Vérifier les logs pour des erreurs API Claude

## 📝 Notes importantes

1. **Limites Vercel** : 
   - Plan gratuit : 10 secondes de timeout
   - Plan Pro : Jusqu'à 300 secondes
   - Notre config : 30 secondes

2. **Coûts API Claude** :
   - Claude 3 Sonnet : ~$3 per million input tokens
   - Surveiller l'usage sur https://console.anthropic.com/

3. **Performance** :
   - Le streaming SSE assure une réponse en temps réel
   - La mémoire est configurée à 1024 MB pour de meilleures performances

## 🤝 Support

Pour toute question ou problème :
1. Vérifier les logs Vercel
2. Consulter la documentation Anthropic
3. Ouvrir une issue sur GitHub

## 📄 License

MIT License - Voir LICENSE pour plus de détails 