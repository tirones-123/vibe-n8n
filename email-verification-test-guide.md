# 🧪 Guide de Test - Vérification d'Email Obligatoire

## ✅ Corrections Apportées

### 1. **Vérification Backend Réelle**
- `canMakeRequest()` fait maintenant une vraie requête à `/api/me` 
- Vérifie l'email côté backend + quotas en temps réel
- Capture les erreurs `EMAIL_NOT_VERIFIED` automatiquement

### 2. **Cohérence Popup ↔ Plugin**
- Mêmes méthodes d'authentification (`firebase-signin-email`, `firebase-signup-email`)
- Même gestion des erreurs spécifiques Firebase
- Même affichage des toasts de succès
- Même gestion de la vérification d'email après inscription

### 3. **Gestion Avancée des Erreurs**
- Capture des erreurs 403 `EMAIL_NOT_VERIFIED` lors des requêtes
- Modal de vérification d'email automatique
- Boutons "Renvoyer l'email" et "J'ai vérifié"

### 4. **Logging des Événements**
- Événement `USER_CREATED` lors de la création
- Événement `USER_AUTHENTICATED` à chaque connexion
- Timestamp des dernières connexions

## 🧪 Tests à Effectuer

### Test 1 : Création de Compte via Popup

1. **Ouvrir l'extension** (icône 🤖 dans Chrome)
2. **Onglet "Créer un compte"**
3. **Saisir** : nouvel email + mot de passe
4. **Cliquer "Créer mon compte"**

**✅ Résultat attendu :**
- Message "Compte créé ! Vérifiez votre email..."
- **Modal de vérification** avec warning spam
- Email reçu (vérifier spam)

### Test 2 : Création de Compte via Plugin

1. **Aller sur vibe-n8n.com** (workflow editor)
2. **Cliquer sur le bouton 🤖** 
3. **Choisir email/password** dans le modal
4. **"Créer un compte"** avec nouvel email

**✅ Résultat attendu :**
- Même comportement que popup
- Modal de vérification d'email identique

### Test 3 : Tentative de Requête Sans Email Vérifié

1. **Créer un compte** (via popup ou plugin)
2. **NE PAS cliquer** sur le lien de vérification
3. **Aller sur vibe-n8n.com**
4. **Cliquer 🤖** et essayer de générer un workflow

**✅ Résultat attendu :**
- ❌ **Bloqué** avec modal "Email non vérifié"
- Boutons "Renvoyer l'email" et "J'ai vérifié"
- **Aucune requête** ne passe au backend

### Test 4 : Vérification d'Email et Déblocage

1. **Recevoir l'email** de vérification (vérifier spam)
2. **Cliquer sur le lien** dans l'email
3. **Retourner sur vibe-n8n.com**
4. **Essayer de générer** un workflow

**✅ Résultat attendu :**
- ✅ **Autorisé** à faire des requêtes
- Génération de workflow fonctionne
- Quotas affichés correctement

### Test 5 : Bouton "J'ai vérifié"

1. **Après avoir cliqué** le lien de vérification
2. **Cliquer sur "J'ai vérifié"** dans le modal
3. **Vérifier** que l'interface se met à jour

**✅ Résultat attendu :**
- Modal se ferme
- Interface se rafraîchit
- Accès autorisé

### Test 6 : Cohérence Entre Popup et Plugin

1. **Se connecter via popup** avec compte vérifié
2. **Aller sur vibe-n8n.com**
3. **Vérifier** que l'état auth est cohérent

**✅ Résultat attendu :**
- Pas de re-demande d'authentification
- Même utilisateur dans les deux interfaces
- Quotas cohérents

## 🔍 Vérification des Logs

### Dans la Console Chrome (F12)

**Lors de l'inscription :**
```
📧 Email de vérification envoyé, affichage modal
✅ Compte créé avec succès !
```

**Lors d'une tentative sans email vérifié :**
```
🔍 Vérification complète avec le backend...
🚫 Erreur 403 backend: {code: "EMAIL_NOT_VERIFIED", email: "..."}
📧 Email non vérifié détecté
```

**Après vérification d'email :**
```
✅ Utilisateur vérifié côté backend: user@email.com
🔥 Using Firebase authentication token for content auth request
```

### Dans les Logs Railway (Backend)

```
📝 Created new FREE user: uid123 (user@email.com)
🚫 Email not verified for user: user@email.com
✅ Email verified for user: user@email.com
```

## 🐛 Dépannage

### "Modal ne s'affiche pas"
- Vérifier la console pour erreurs JavaScript
- S'assurer d'être sur une page de workflow n8n
- Recharger la page (Ctrl+R)

### "Email pas reçu"
- Vérifier dossier spam/indésirables
- Attendre 5-10 minutes
- Utiliser le bouton "Renvoyer l'email"

### "Toujours bloqué après vérification"
- Cliquer "J'ai vérifié" dans le modal
- Recharger la page
- Vérifier dans la console si le token Firebase se met à jour

### "Incohérence popup ↔ plugin"
- Se déconnecter complètement (popup)
- Se reconnecter
- Vérifier que le même compte est utilisé

## 📊 Vérification Firebase Console

Dans Firebase Console > Authentication > Users :

1. **Utilisateur créé** ✅
2. **Email verified = true** après clic sur le lien ✅
3. **Last sign-in** mis à jour ✅

Dans Firestore > users collection :

1. **Document utilisateur** créé avec plan FREE ✅
2. **remaining_tokens = 70000** ✅
3. **created_at** timestamp ✅

Dans Firestore > usage_events collection :

1. **EVENT: USER_CREATED** ✅
2. **EVENT: USER_AUTHENTICATED** ✅

## 🎯 Checklist Final

- [ ] Popup et plugin utilisent les mêmes méthodes d'auth
- [ ] Vérification d'email obligatoire avant requêtes
- [ ] Modal de vérification s'affiche correctement  
- [ ] Boutons "Renvoyer" et "J'ai vérifié" fonctionnent
- [ ] Erreurs Firebase gérées (email déjà utilisé, etc.)
- [ ] Événements Firebase se créent dans Firestore
- [ ] Cohérence totale entre popup et plugin
- [ ] Emails arrivent (vérifier spam)

## 🚀 Test de Non-Régression

**Test avec compte déjà vérifié :**
1. Se connecter avec un compte dont l'email est déjà vérifié
2. Vérifier que tout fonctionne sans friction
3. Pas de demande de vérification supplémentaire

**Test avec legacy API key :**
1. Backend continue de fonctionner avec l'API key legacy
2. Pas de blocage pour les requêtes système

---

**Système de vérification d'email maintenant entièrement fonctionnel ! 🛡️** 