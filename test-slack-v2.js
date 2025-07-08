#!/usr/bin/env node

import fetch from 'node-fetch';

async function testSlackRAG() {
  console.log('🧪 Test des données complètes de Slack\n');
  
  const apiKey = 'd5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2';
  
  try {
    // Test 1: Obtenir les infos de Slack
    const response = await fetch('http://localhost:3000/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        prompt: 'Show me all available operations in the Slack node with their descriptions',
        context: {},
        tools: [],
        versions: { slack: 2.3 }
      })
    });

    // Lire le stream de réponse
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let slackDataFound = false;
    let dataSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'content_block_delta' && data.delta?.text) {
              if (data.delta.text.includes('slack') || data.delta.text.includes('operations')) {
                slackDataFound = true;
              }
              dataSize += data.delta.text.length;
            }
          } catch (e) {
            // Ignorer les erreurs de parsing
          }
        }
      }
    }

    console.log('✅ Réponse reçue avec succès');
    console.log(`📏 Taille totale de la réponse: ${dataSize} caractères`);
    console.log(`🔍 Données Slack trouvées: ${slackDataFound ? 'Oui' : 'Non'}`);
    
    // Test 2: Vérifier directement le RAG
    const { getNodeTypesByNames } = await import('./api/rag/node-types-rag.js');
    const nodeDetails = await getNodeTypesByNames(['slack'], { slack: 2.3 });
    
    if (nodeDetails.length > 0) {
      const slackNode = nodeDetails[0];
      console.log('\n📊 Données Slack depuis le RAG:');
      console.log(`- Nom: ${slackNode.nodeName}`);
      console.log(`- Version: ${slackNode.version}`);
      console.log(`- Taille des données complètes: ${JSON.stringify(slackNode.fullData).length} caractères`);
      console.log(`- Nombre d\'opérations: ${slackNode.fullData?.properties?.resource?.options?.length || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testSlackRAG();
