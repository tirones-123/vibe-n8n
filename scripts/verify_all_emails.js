// WARNING ⚠️  Exécuter ce script marque TOUS les utilisateurs Firebase comme « emailVerified: true ».
// Ne l'utilisez que si vous comprenez parfaitement les implications sécurité.
// ---------------------------------------------------------------------------
// 1.  Ajoutez les variables d'environnement Firebase Admin (FIREBASE_PROJECT_ID,
//     FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL) dans votre shell ou .env.
// 2.  Exécutez :  node scripts/verify_all_emails.js
// 3.  Le script parcourt par lots de 1000 comptes et applique
//     admin.auth().updateUser(uid, { emailVerified: true })
// 4.  Met à jour également le champ 'email_verified' dans Firestore `users/{uid}`
// ---------------------------------------------------------------------------

import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const auth = admin.auth();
const db = admin.firestore();

async function markAllVerified() {
  console.log('🚀 Starting global email verification…');
  let nextPageToken = undefined;
  let total = 0;

  do {
    const list = await auth.listUsers(1000, nextPageToken);
    const updates = list.users.map(async (user) => {
      if (!user.emailVerified) {
        await auth.updateUser(user.uid, { emailVerified: true });
        // Firestore mirror
        try {
          await db.collection('users').doc(user.uid).update({
            email_verified: true,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (_) {/* ignore */}
        total++;
      }
    });
    await Promise.all(updates);
    nextPageToken = list.pageToken;
    console.log(`🔄 Batch done – processed ${list.users.length} users`);
  } while (nextPageToken);

  console.log(`✅ Completed. ${total} accounts marked verified.`);
  process.exit(0);
}

markAllVerified().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
