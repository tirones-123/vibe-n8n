// Test script pour vérifier l'intégration MCP avec Claude
import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:3000/api/claude';
const API_KEY = process.env.BACKEND_API_KEY;

if (!API_KEY) {
  console.error('❌ BACKEND_API_KEY manquant dans les variables d\'environnement');
  process.exit(1);
}

async function testMcpIntegration() {
  console.log('🧪 Test de l\'intégration MCP avec Claude...\n');

  const testData = {
    prompt: "Peux-tu utiliser search_nodes pour chercher des nodes Trello et me dire ce que tu trouves ?",
    context: {
      nodes: [],
      connections: {}
    },
    tools: [],
    mode: "create"
  };

  try {
    console.log('📡 Envoi de la requête à Claude...');
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('✅ Connexion établie, lecture du stream...\n');
    
    // Lire le stream SSE
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            switch (data.type) {
              case 'assistant_text':
              case 'assistant_text_delta':
                process.stdout.write(data.text || '');
                break;
                
              case 'mcp_tool_use':
                console.log(`\n🔧 [MCP] Utilisation de l'outil: ${data.name}`);
                console.log(`📝 [MCP] Serveur: ${data.server}`);
                console.log(`📋 [MCP] Paramètres:`, JSON.stringify(data.input, null, 2));
                break;
                
              case 'mcp_tool_result':
                console.log(`\n✅ [MCP] Résultat reçu pour l'outil ${data.tool_use_id}`);
                if (data.is_error) {
                  console.log(`❌ [MCP] Erreur:`, data.content);
                } else {
                  console.log(`📊 [MCP] Données reçues (${JSON.stringify(data.content).length} caractères)`);
                }
                break;
                
              case 'error':
                console.log(`\n❌ Erreur: ${data.message}`);
                break;
            }
          } catch (e) {
            // Ignorer les lignes malformées
          }
        }
      }
    }
    
    console.log('\n\n✅ Test terminé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    process.exit(1);
  }
}

testMcpIntegration(); 