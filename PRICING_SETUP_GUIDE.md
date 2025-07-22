# Guide de Configuration du Système de Pricing

Ce guide explique comment configurer le système de pricing avec Firebase (authentification + base de données) et Stripe (paiements) pour le backend n8n Workflow RAG.

## 🏗️ Architecture du Système

```
👤 Utilisateur Frontend
    ↓ (Firebase Auth Token)
📱 Extension Chrome / Frontend
    ↓ (API Calls)
🖥️ Backend n8n RAG
    ↓ (Vérification quota)
🔥 Firebase Firestore
    ↓ (Paiements)
💳 Stripe
```

## 📋 Plans et Quotas

| Plan | Prix | Tokens inclus/mois | Dépassement |
|------|------|-------------------|-------------|
| **FREE** | 0 US$ | 70,000 tokens input | ❌ Bloqué |
| **PRO** | 20 US$ | 1,000,000 tokens input | 0,20 US$ / 10,000 tokens |

## 🔥 Configuration Firebase

### 1. Créer le projet Firebase

1. Aller sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquer sur "Ajouter un projet"
3. Nommer le projet : `vibe-n8n-production`
4. Activer Google Analytics (optionnel)

### 2. Configurer Authentication

1. Dans la console Firebase, aller à **Authentication**
2. Cliquer sur "Commencer"
3. Onglet **Sign-in method**
4. Activer **E-mail/Mot de passe**
5. Activer **Lien d'e-mail (connexion sans mot de passe)** (optionnel)

### 3. Configurer Firestore Database

1. Aller à **Firestore Database**
2. Cliquer "Créer une base de données"
3. Choisir **Mode production**
4. Sélectionner la région (ex: europe-west1)

### 4. Configurer les règles de sécurité

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Usage events are write-only
    match /usage_events/{document} {
      allow write: if request.auth != null;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 5. Générer la clé de service

1. Aller à **Paramètres du projet** (⚙️)
2. Onglet **Comptes de service**
3. Cliquer **Générer une nouvelle clé privée**
4. Télécharger le fichier JSON

### 6. Variables d'environnement Firebase

```bash
# Extraire les valeurs du fichier JSON téléchargé
FIREBASE_PROJECT_ID=vibe-n8n-production
FIREBASE_PRIVATE_KEY_ID=abc123...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkq...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@vibe-n8n-production.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789...
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40vibe-n8n-production.iam.gserviceaccount.com
```

## 💳 Configuration Stripe

### 1. Créer le compte Stripe

1. Aller sur [Stripe Dashboard](https://dashboard.stripe.com/)
2. Créer un compte
3. Compléter la vérification d'identité
4. Passer en mode **Live** après les tests

### 2. Créer le produit "Vibe Pro"

1. Aller à **Produits** dans le dashboard
2. Cliquer **Ajouter un produit**
3. Nom : `Vibe Pro`
4. Description : `Plan Pro pour génération de workflows n8n avec IA`
5. **Tarification récurrente** :
   - Prix : `20 US$`
   - Facturation : `Mensuelle`
   - Modèle de tarification : `Forfaitaire`

### 3. Configurer Usage-Based Billing

1. Aller à **Billing > Meters**
2. Cliquer **Create meter**
3. Nom : `vibe_input_tokens`
4. Nom d'affichage : `Input Tokens`
5. Unité : `token`
6. Granularité : `1`

### 4. Créer le prix usage-based

1. Retourner au produit **Vibe Pro**
2. Ajouter un nouveau prix :
   - Type : **Usage-based**
   - Meter : `vibe_input_tokens`
   - Prix : `0.00002 US$ par token` (soit 0.20$ pour 10,000 tokens)

### 5. Configurer les Webhooks

1. Aller à **Développeurs > Webhooks**
2. Cliquer **Ajouter un endpoint**
3. URL : `https://votre-domaine.railway.app/api/stripe-webhook`
4. Événements à écouter :
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

### 6. Variables d'environnement Stripe

```bash
# Clés API (dans Développeurs > Clés API)
STRIPE_SECRET_KEY=sk_test_xxxxx  # ou sk_live_xxxxx en production

# Webhook secret (dans le webhook créé)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# IDs des produits/prix (dans Produits)
STRIPE_VIBE_PRO_PRODUCT_ID=prod_xxxxx
STRIPE_VIBE_PRO_PRICE_ID=price_xxxxx

# ID du meter (dans Billing > Meters)
STRIPE_VIBE_INPUT_TOKENS_METER_ID=mtr_xxxxx
```

## 🚀 Test de Configuration

### 1. Vérifier Firebase

```bash
curl https://votre-backend.railway.app/api/status
```

Réponse attendue :
```json
{
  "configuration": {
    "firebase_configured": true,
    "pricing_ready": true
  }
}
```

### 2. Tester l'authentification

```javascript
// Test d'authentification Firebase (frontend)
import { signInWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth();
const user = await signInWithEmailAndPassword(auth, 'test@example.com', 'password');
const token = await user.user.getIdToken();

// Test API backend
const response = await fetch('/api/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 3. Tester Stripe Checkout

```bash
curl -X POST https://votre-backend.railway.app/api/create-checkout-session \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "success_url": "https://yourapp.com/success",
    "cancel_url": "https://yourapp.com/cancel"
  }'
```

## 📊 Structure Base de Données Firebase

### Collection `users`

```javascript
{
  uid: "firebase_user_id",
  email: "user@example.com",
  plan: "FREE" | "PRO",
  remaining_tokens: 70000,
  this_month_usage_tokens: 0,
  this_month_usage_usd: 0,
  total_tokens_used: 0,
  total_output_tokens: 0,
  stripe_customer_id: "cus_xxxxx",
  stripe_subscription_id: "sub_xxxxx",
  usage_based_enabled: false,
  usage_limit_usd: 0,
  created_at: Timestamp,
  updated_at: Timestamp,
  last_reset_at: Timestamp
}
```

### Collection `usage_events`

```javascript
{
  uid: "firebase_user_id",
  event_type: "workflow_generation",
  metadata: {
    input_tokens: 15000,
    output_tokens: 2500,
    workflow_size: 45678,
    mode: "generation",
    duration: 8500
  },
  timestamp: Timestamp
}
```

## 🔒 Sécurité

### Variables d'environnement sensibles

```bash
# ❌ JAMAIS dans le code
# ✅ Toujours dans les variables d'environnement

# Firebase
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Headers de sécurité

Le backend inclut automatiquement :
- CORS configuré
- Validation des tokens Firebase
- Vérification des webhooks Stripe
- Sanitisation des inputs

## 🛠️ Déploiement Production

### 1. Variables Railway

```bash
# Dans Railway Dashboard > Variables
FIREBASE_PROJECT_ID=vibe-n8n-production
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@vibe-n8n-production.iam.gserviceaccount.com
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
# ... autres variables
```

### 2. Mettre à jour les URLs Stripe

1. Webhooks : `https://vibe-n8n-production.up.railway.app/api/stripe-webhook`
2. Success URL : `https://votre-frontend.com/success`
3. Cancel URL : `https://votre-frontend.com/cancel`

### 3. Configuration Frontend

```javascript
// Extension Chrome / Frontend
const CONFIG = {
  API_URL: 'https://vibe-n8n-production.up.railway.app',
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyXXXXXX",
    authDomain: "vibe-n8n-production.firebaseapp.com",
    projectId: "vibe-n8n-production",
    // ...
  }
};
```

## 📈 Monitoring

### Logs à surveiller

```bash
# Succès d'authentification
✅ Firebase Service initialized
📝 Created new FREE user: user123

# Paiements Stripe
💳 Checkout session created for user123: cs_xxxxx
📨 Processed webhook: upgrade_to_pro for user user123

# Usage tracking
📊 Updated tokens for user123: -15000 input, +2500 output tokens
📊 Reported 15000 tokens to Stripe for cus_xxxxx
```

### Métriques importantes

- Taux de conversion FREE → PRO
- Usage moyen par utilisateur
- Revenus usage-based
- Erreurs d'authentification
- Échecs de webhook

## 🔧 Dépannage

### Erreurs courantes

#### "Firebase Service Account not found"
```bash
# Vérifier les variables
echo $FIREBASE_PROJECT_ID
echo $FIREBASE_CLIENT_EMAIL
```

#### "Stripe webhook signature verification failed"
```bash
# Vérifier le webhook secret
echo $STRIPE_WEBHOOK_SECRET
```

#### "User quota check failed"
```bash
# Vérifier Firestore permissions
# Vérifier les règles de sécurité
```

### Debug mode

```bash
# Activer les logs détaillés
export DEBUG=1
npm start
```

## 📞 Support

- 🔥 Firebase : [Console](https://console.firebase.google.com/) | [Docs](https://firebase.google.com/docs)
- 💳 Stripe : [Dashboard](https://dashboard.stripe.com/) | [Docs](https://stripe.com/docs)
- 🚂 Railway : [Dashboard](https://railway.app/) | [Docs](https://docs.railway.app/)

---

**Configuration complète** ✅ Firebase + Stripe + Railway
**Prêt pour la production** 🚀 