#!/usr/bin/env node

/**
 * Test d'authentification Firebase avec un vrai token
 * Vérifie que l'API backend fonctionne avec Firebase Auth
 */

import fetch from 'node-fetch';

// Configuration Firebase (comme dans l'extension)
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDPB8tHayuvKuhimMQPbJBBLvukFLJIZ8I",
  authDomain: "vibe-n8n-7e40d.firebaseapp.com",
  projectId: "vibe-n8n-7e40d"
};

const API_URL = 'https://vibe-n8n-production.up.railway.app/api/claude';
const LEGACY_API_KEY = 'd5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2';

// Fonction pour s'authentifier avec Firebase (email/password pour test)
async function getFirebaseIdToken(email, password) {
  console.log('🔐 Authentification Firebase...');
  
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_CONFIG.apiKey}`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Firebase auth failed: ${error.error?.message || 'Unknown error'}`);
  }
  
  const data = await response.json();
  console.log('✅ Firebase auth successful:', data.email);
  
  return {
    idToken: data.idToken,
    email: data.email,
    uid: data.localId,
    refreshToken: data.refreshToken
  };
}

// Test avec token Firebase
async function testWithFirebaseToken(idToken, userEmail) {
  console.log('\n🧪 Test API avec token Firebase...');
  console.log('👤 User:', userEmail);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'test auth firebase'
      })
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      console.log('✅ API responded successfully with Firebase token');
      
      // Lire quelques lignes du stream pour vérifier (Node.js style)
      let data = '';
      let lineCount = 0;
      
      for await (const chunk of response.body) {
        data += chunk.toString();
        const lines = data.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            console.log('📡 SSE:', line.substring(0, 100) + '...');
            lineCount++;
            if (lineCount >= 5) break;
          }
        }
        
        if (lineCount >= 5) break;
      }
      
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ API error response:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return false;
  }
}

// Test avec clé legacy pour comparaison
async function testWithLegacyKey() {
  console.log('\n🧪 Test API avec clé legacy (comparaison)...');
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LEGACY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'test auth legacy'
      })
    });
    
    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      console.log('✅ API responded successfully with legacy key');
      
      // Lire quelques lignes du stream (Node.js style)
      let data = '';
      let lineCount = 0;
      
      for await (const chunk of response.body) {
        data += chunk.toString();
        const lines = data.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            console.log('📡 SSE:', line.substring(0, 100) + '...');
            lineCount++;
            if (lineCount >= 3) break;
          }
        }
        
        if (lineCount >= 3) break;
      }
      
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ API error response:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return false;
  }
}

// Test du endpoint /api/me avec token Firebase
async function testUserInfoEndpoint(idToken) {
  console.log('\n🧪 Test endpoint /api/me avec token Firebase...');
  
  try {
    const response = await fetch('https://vibe-n8n-production.up.railway.app/api/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      const userData = await response.json();
      console.log('✅ User info retrieved:');
      console.log('  - UID:', userData.user?.uid);
      console.log('  - Email:', userData.user?.email);
      console.log('  - Plan:', userData.user?.plan);
      console.log('  - Tokens restants:', userData.user?.remaining_tokens?.toLocaleString());
      console.log('  - Usage ce mois:', userData.user?.this_month_usage_tokens?.toLocaleString());
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ /api/me error:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ /api/me request failed:', error.message);
    return false;
  }
}

// Fonction principale
async function main() {
  console.log('🧪 Test d\'authentification Firebase vs Backend API');
  console.log('=================================================');
  
  const testEmail = process.argv[2];
  const testPassword = process.argv[3];
  
  if (!testEmail || !testPassword) {
    console.log('❌ Usage: node test-firebase-auth.js <email> <password>');
    console.log('💡 Example: node test-firebase-auth.js test@example.com mypassword');
    console.log('\n🔑 Ou testez juste avec la clé legacy:');
    return testWithLegacyKey();
  }
  
  try {
    // Étape 1: Authentification Firebase
    const firebaseAuth = await getFirebaseIdToken(testEmail, testPassword);
    
    // Étape 2: Test API avec token Firebase
    const apiFirebaseSuccess = await testWithFirebaseToken(firebaseAuth.idToken, firebaseAuth.email);
    
    // Étape 3: Test endpoint /api/me
    const userInfoSuccess = await testUserInfoEndpoint(firebaseAuth.idToken);
    
    // Étape 4: Test comparatif avec legacy
    const apiLegacySuccess = await testWithLegacyKey();
    
    // Résumé
    console.log('\n📊 RÉSUMÉ DES TESTS:');
    console.log('✅ Firebase Auth:', '✅ OK');
    console.log('✅ API avec Firebase token:', apiFirebaseSuccess ? '✅ OK' : '❌ FAIL');
    console.log('✅ User info endpoint:', userInfoSuccess ? '✅ OK' : '❌ FAIL');
    console.log('✅ API avec legacy key:', apiLegacySuccess ? '✅ OK' : '❌ FAIL');
    
    if (apiFirebaseSuccess && userInfoSuccess && apiLegacySuccess) {
      console.log('\n🎉 TOUS LES TESTS PASSENT ! L\'authentification Firebase fonctionne parfaitement.');
    } else {
      console.log('\n⚠️  Certains tests ont échoué. Vérifiez les logs ci-dessus.');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Fallback sur test legacy
    console.log('\n🔄 Fallback: Test avec clé legacy seulement...');
    await testWithLegacyKey();
  }
}

// Exécuter le test
main().catch(console.error); 