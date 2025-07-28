/**
 * Test script pour la fonctionnalité Free Trial avec Firebase Anonymous Auth
 * Usage: node scripts/test-free-trial.js
 */

import { createWorkflowRAGService } from '../api/rag/workflow-rag-service.js';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function testFreeTrial() {
  console.log('🎁 === TEST FREE TRIAL FUNCTIONALITY ===\n');

  try {
    // 1. Test création utilisateur anonyme
    console.log('1️⃣ Testing anonymous user creation...');
    
    if (!admin.apps.length) {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : {
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

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com/`
      });
    }

    // Créer un utilisateur anonyme de test
    const testAnonymousUID = `test-anon-${Date.now()}`;
    const firebaseService = (await import('../api/services/firebase-service.js')).default;
    await firebaseService.initialize();

    const anonymousUser = await firebaseService.getOrCreateUser(
      testAnonymousUID,
      null,
      false,
      true  // isAnonymous = true
    );

    console.log('✅ Anonymous user created:', {
      uid: anonymousUser.uid,
      plan: anonymousUser.plan,
      remaining_tokens: anonymousUser.remaining_tokens,
      is_anonymous: anonymousUser.is_anonymous
    });

    // 2. Test RAG workflow generation
    console.log('\n2️⃣ Testing RAG workflow generation...');
    
    const ragService = createWorkflowRAGService();
    
    let workflowGenerated = false;
    let generationError = null;

    const result = await ragService.generateWorkflowFromExamplesWithStreaming(
      'Create a simple workflow with webhook trigger and Slack notification',
      {
        topK: 2,
        workflowName: 'Free Trial Test Workflow',
        onProgress: (stage, data) => {
          console.log(`  📡 ${stage}: ${data.message || 'Processing...'}`);
          
          if (stage === 'complete' && data.success) {
            workflowGenerated = true;
          }
          
          if (stage === 'error') {
            generationError = data.message;
          }
        }
      }
    );

    if (result.success && result.workflow) {
      console.log('✅ Workflow generated successfully:');
      console.log(`  - Nodes: ${result.workflow.nodes?.length || 0}`);
      console.log(`  - Connections: ${Object.keys(result.workflow.connections || {}).length}`);
      console.log(`  - Tokens used: ${result.tokensUsed?.input || 'N/A'} input, ${result.tokensUsed?.output || 'N/A'} output`);
    } else {
      console.log('❌ Workflow generation failed:', result.error);
      generationError = result.error;
    }

    // 3. Test quota depletion
    console.log('\n3️⃣ Testing quota depletion after free trial...');
    
    // Simuler l'utilisation du token
    if (result.tokensUsed && result.tokensUsed.input) {
      await firebaseService.updateUserTokens(
        testAnonymousUID,
        result.tokensUsed.input,
        result.tokensUsed.output || 0
      );
      
      const updatedUser = await firebaseService.getOrCreateUser(testAnonymousUID);
      console.log('✅ User quota updated:', {
        remaining_tokens: updatedUser.remaining_tokens,
        this_month_usage_tokens: updatedUser.this_month_usage_tokens
      });

      // Vérifier que l'utilisateur ne peut plus faire de requête
      const canMakeSecondRequest = await firebaseService.canUserMakeRequest(testAnonymousUID, 10000);
      console.log('✅ Second request check:', {
        allowed: canMakeSecondRequest.allowed,
        reason: canMakeSecondRequest.reason
      });

      if (!canMakeSecondRequest.allowed) {
        console.log('✅ Free trial correctly limits to 1 request');
      } else {
        console.log('⚠️ Warning: Anonymous user can still make requests');
      }
    }

    // 4. Test cleanup
    console.log('\n4️⃣ Cleaning up test user...');
    
    try {
      const db = admin.firestore();
      await db.collection('users').doc(testAnonymousUID).delete();
      console.log('✅ Test user cleaned up');
    } catch (cleanupError) {
      console.log('⚠️ Cleanup error (non-critical):', cleanupError.message);
    }

    console.log('\n🎉 === FREE TRIAL TEST COMPLETED ===');
    
    if (workflowGenerated && !generationError) {
      console.log('✅ All tests passed!');
      return true;
    } else {
      console.log('❌ Some tests failed');
      return false;
    }

  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  }
}

// Exécuter le test si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  testFreeTrial()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal test error:', error);
      process.exit(1);
    });
}

export { testFreeTrial }; 