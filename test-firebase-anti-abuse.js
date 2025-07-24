// Script de test pour les mécanismes anti-abus Firebase
// À utiliser dans la console du Service Worker de l'extension Chrome

console.log('🧪 === TEST ANTI-ABUS FIREBASE ===');

// Test 1: Email temporaire (doit être marqué comme high risk)
async function testTemporaryEmail() {
    console.log('\n🔬 TEST 1: Email temporaire (high risk)');
    
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'firebase-signup-email',
            data: {
                email: 'test' + Date.now() + '@tempmail.org',
                password: 'password123'
            }
        });
        
        console.log('📧 Email temporaire response:', response);
        
        if (response.success || response.user) {
            console.log('✅ Compte créé, mais devrait avoir des tokens limités');
            console.log('🔍 Vérifiez dans Firebase: risk_level = "high", tokens = 5000');
        } else {
            console.log('❌ Création échouée:', response.error);
        }
    } catch (error) {
        console.error('❌ Erreur test email temporaire:', error);
    }
}

// Test 2: Email pattern suspect (doit être marqué comme medium risk)
async function testSuspiciousPattern() {
    console.log('\n🔬 TEST 2: Pattern email suspect (medium risk)');
    
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'firebase-signup-email',
            data: {
                email: 'test' + Math.floor(Math.random() * 10000) + '@gmail.com',
                password: 'password123'
            }
        });
        
        console.log('🔍 Email pattern suspect response:', response);
        
        if (response.success || response.user) {
            console.log('✅ Compte créé, devrait avoir tokens réduits');
            console.log('🔍 Vérifiez dans Firebase: risk_level = "medium", tokens = 30000');
        } else {
            console.log('❌ Création échouée:', response.error);
        }
    } catch (error) {
        console.error('❌ Erreur test pattern suspect:', error);
    }
}

// Test 3: Email normal (doit être low risk)
async function testNormalEmail() {
    console.log('\n🔬 TEST 3: Email normal (low risk)');
    
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'firebase-signup-email',
            data: {
                email: 'user.normal.' + Date.now() + '@gmail.com',
                password: 'password123'
            }
        });
        
        console.log('📧 Email normal response:', response);
        
        if (response.success || response.user) {
            console.log('✅ Compte créé, devrait avoir tokens complets');
            console.log('🔍 Vérifiez dans Firebase: risk_level = "low", tokens = 70000');
        } else {
            console.log('❌ Création échouée:', response.error);
        }
    } catch (error) {
        console.error('❌ Erreur test email normal:', error);
    }
}

// Test 4: Test authentification et quota
async function testAuthAndQuota() {
    console.log('\n🔬 TEST 4: Authentification et vérification quota');
    
    try {
        // Récupérer l'utilisateur actuel
        const currentUser = await firebaseGetCurrentUser();
        console.log('👤 Utilisateur actuel:', currentUser);
        
        if (currentUser && currentUser.success !== false) {
            // Récupérer le token Firebase
            const token = await firebaseGetIdToken();
            console.log('🎫 Token reçu:', typeof token, token ? token.substring(0, 50) + '...' : 'null');
            
            if (token && typeof token === 'string') {
                // Tester une requête avec le token
                console.log('🚀 Test requête API avec Firebase token...');
                
                const apiResponse = await fetch('https://vibe-n8n-production.up.railway.app/api/claude', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'X-Auth-Method': 'FIREBASE'
                    },
                    body: JSON.stringify({
                        prompt: 'Test anti-abuse system - quota check'
                    })
                });
                
                console.log('📊 API Response status:', apiResponse.status);
                
                if (apiResponse.status === 429) {
                    const errorData = await apiResponse.json();
                    console.log('🚫 Quota bloqué:', errorData);
                    
                    if (errorData.code === 'EMAIL_VERIFICATION_REQUIRED') {
                        console.log('📧 Vérification email requise - système anti-abus actif !');
                    }
                } else if (apiResponse.status === 200) {
                    console.log('✅ Requête autorisée');
                    // Lire la première ligne de la réponse SSE
                    const reader = apiResponse.body.getReader();
                    const decoder = new TextDecoder();
                    const { value } = await reader.read();
                    if (value) {
                        const chunk = decoder.decode(value);
                        console.log('📡 Premier chunk SSE:', chunk.substring(0, 200) + '...');
                    }
                    reader.cancel();
                } else {
                    const errorText = await apiResponse.text();
                    console.log('❌ Erreur API:', apiResponse.status, errorText);
                }
            } else {
                console.log('❌ Token Firebase invalide');
            }
        } else {
            console.log('❌ Utilisateur non connecté');
        }
    } catch (error) {
        console.error('❌ Erreur test auth et quota:', error);
    }
}

// Test 5: Vérifier les logs de sécurité
async function testSecurityLogs() {
    console.log('\n🔬 TEST 5: Instructions pour vérifier logs sécurité');
    
    console.log('📝 Pour vérifier les logs de sécurité dans Firestore:');
    console.log('1. Allez sur https://console.firebase.google.com');
    console.log('2. Sélectionnez votre projet');
    console.log('3. Firestore Database > security_events');
    console.log('4. Cherchez les événements récents:');
    console.log('   - account_creation_risk_assessment');
    console.log('   - multiple_users_same_ip');
    console.log('   - email_verification_completed');
    console.log('');
    console.log('📊 Logs Railway:');
    console.log('1. Allez sur https://railway.app');
    console.log('2. Votre projet > vibe-n8n-production');
    console.log('3. Onglet "Logs"');
    console.log('4. Cherchez les messages:');
    console.log('   - 🚨 High risk account detected');
    console.log('   - ⚠️ Medium risk account detected');
    console.log('   - 🚨 Suspicious IP activity');
}

// Exécuter tous les tests
async function runAllAntiAbuseTests() {
    console.log('🚀 Démarrage de tous les tests anti-abus...');
    
    await testNormalEmail();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testSuspiciousPattern();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testTemporaryEmail();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testAuthAndQuota();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    testSecurityLogs();
    
    console.log('\n🏁 Tests terminés !');
    console.log('📋 Vérifiez maintenant:');
    console.log('   1. Firebase Console (Firestore security_events)');
    console.log('   2. Railway Logs');
    console.log('   3. Comptes créés avec différents risk_levels');
    console.log('   4. Quotas différentiels selon le risque');
}

// Exposer les fonctions pour utilisation manuelle
globalThis.testTemporaryEmail = testTemporaryEmail;
globalThis.testSuspiciousPattern = testSuspiciousPattern;
globalThis.testNormalEmail = testNormalEmail;
globalThis.testAuthAndQuota = testAuthAndQuota;
globalThis.testSecurityLogs = testSecurityLogs;
globalThis.runAllAntiAbuseTests = runAllAntiAbuseTests;

console.log('\n📋 Fonctions disponibles:');
console.log('  testTemporaryEmail() - Test email temporaire');
console.log('  testSuspiciousPattern() - Test pattern suspect');
console.log('  testNormalEmail() - Test email normal');
console.log('  testAuthAndQuota() - Test auth et quota');
console.log('  testSecurityLogs() - Instructions logs');
console.log('  runAllAntiAbuseTests() - Tous les tests');
console.log('\n💡 Utilisez: runAllAntiAbuseTests() pour tout tester'); 