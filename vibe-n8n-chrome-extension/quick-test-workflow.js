// 🧪 TEST RAPIDE GÉNÉRATION WORKFLOW
console.log('🧪 === TEST GÉNÉRATION WORKFLOW ===');

// Simuler un clic sur le bouton AI
function testWorkflowGeneration() {
  console.log('🚀 Test de génération de workflow...');
  
  // 1. Chercher le bouton AI
  const aiButton = document.querySelector('[data-test-id="ask-assistant-floating-button"], .floating-button, .ai-assistant-button');
  if (aiButton) {
    console.log('✅ Bouton AI trouvé:', aiButton);
    
    // Simuler le clic
    aiButton.click();
    
    // Attendre que le panneau s'ouvre
    setTimeout(() => {
      // 2. Chercher la zone de texte
      const textarea = document.querySelector('.ai-chat-input, [placeholder*="workflow"], textarea, input[type="text"]');
      if (textarea) {
        console.log('✅ Zone de texte trouvée:', textarea);
        
        // 3. Injecter le prompt de test
        const testPrompt = "Crée un workflow simple avec un trigger manuel et un nœud HTTP";
        textarea.value = testPrompt;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        
        // 4. Chercher le bouton d'envoi
        setTimeout(() => {
          const sendButton = document.querySelector('.send-button, [type="submit"], button[disabled="false"]');
          if (sendButton) {
            console.log('✅ Bouton d\'envoi trouvé:', sendButton);
            console.log('🚀 Lancement de la génération...');
            sendButton.click();
          } else {
            console.log('❌ Bouton d\'envoi non trouvé');
            // Simuler l'envoi via touche Entrée
            const enterEvent = new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              bubbles: true
            });
            textarea.dispatchEvent(enterEvent);
          }
        }, 500);
        
      } else {
        console.log('❌ Zone de texte non trouvée');
        console.log('📋 Éléments disponibles:', document.querySelectorAll('input, textarea'));
      }
    }, 1000);
    
  } else {
    console.log('❌ Bouton AI non trouvé');
    console.log('📋 Boutons disponibles:', document.querySelectorAll('button, [role="button"]'));
  }
}

// Analyser l'état actuel de la page
function analyzeCurrentState() {
  console.log('🔍 === ANALYSE ÉTAT ACTUEL ===');
  console.log('🌐 URL:', window.location.href);
  console.log('📄 Titre:', document.title);
  
  // Chercher des éléments de l'extension
  const aiElements = document.querySelectorAll('[class*="ai"], [data-test-id*="ai"], [class*="assistant"]');
  console.log('🤖 Éléments AI trouvés:', aiElements.length);
  aiElements.forEach((el, i) => {
    console.log(`  ${i + 1}. ${el.tagName} - ${el.className} - ${el.id}`);
  });
  
  // Chercher des boutons
  const buttons = document.querySelectorAll('button, [role="button"]');
  console.log('🔘 Boutons trouvés:', buttons.length);
  
  // Chercher le bouton flottant spécifiquement
  const floatingButton = document.querySelector('.floating-button, [class*="floating"]');
  if (floatingButton) {
    console.log('✅ Bouton flottant trouvé:', floatingButton);
  } else {
    console.log('❌ Aucun bouton flottant trouvé');
  }
  
  // Vérifier le statut de l'extension
  console.log('📦 Extension status:');
  console.log('  useFirebaseAuth:', window.useFirebaseAuth);
  console.log('  contentAuthIntegration:', !!window.contentAuthIntegration);
  console.log('  authService:', !!window.authService);
  
  // Vérifier les éléments n8n
  const n8nElements = document.querySelectorAll('[data-test-id*="workflow"], [class*="canvas"], [class*="editor"]');
  console.log('🔧 Éléments n8n trouvés:', n8nElements.length);
}

// Lancer l'analyse
analyzeCurrentState();

// Proposer le test
console.log('');
console.log('🚀 Pour tester la génération de workflow:');
console.log('   testWorkflowGeneration()');
console.log('');

// Exposer la fonction
window.testWorkflowGeneration = testWorkflowGeneration; 