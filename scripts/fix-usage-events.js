#!/usr/bin/env node

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🔧 Fix Firebase usage_events collection...');

try {
  // Initialize Firebase Admin
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
  };

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  }

  const db = admin.firestore();

  console.log('🔍 Checking if usage_events collection exists...');

  // Try to create a dummy usage event to force collection creation
  const eventRef = db.collection('usage_events').doc();
  
  await eventRef.set({
    uid: 'system',
    event_type: 'collection_recreated',
    metadata: {
      timestamp: new Date().toISOString(),
      reason: 'Collection was deleted and needed to be recreated'
    },
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log('✅ Created dummy usage event to recreate collection');

  // Now delete the dummy event
  await eventRef.delete();
  console.log('🗑️ Removed dummy event');

  console.log('✅ usage_events collection should now be working!');
  console.log('💡 Try making a workflow generation request to test');

  process.exit(0);

} catch (error) {
  console.error('❌ Error fixing usage_events collection:', error);
  process.exit(1);
} 