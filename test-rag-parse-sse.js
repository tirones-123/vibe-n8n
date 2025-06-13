import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testRAGWithFullResponse() {
  console.log('🧪 Test RAG avec capture de la réponse complète');
  console.log('================================================');
  console.log('httpRequest: v4.2');
  console.log('slack: v2.3\n');

  const API_KEY = process.env.BACKEND_API_KEY;
  
  try {
    console.log('📡 Envoi de la requête...\n');
    
    const response = await axios.post(
      'http://localhost:3000/api/claude',
      {
        prompt: "Crée un workflow simple avec un HTTP Request qui appelle l'API GitHub pour récupérer les informations d'un utilisateur, puis envoie le résultat sur Slack",
        context: {
          nodes: [],
          connections: {}
        },
        tools: [],
        mode: 'create',
        versions: {
          httpRequest: 4.2,
          slack: 2.3,
          manualTrigger: 1
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    );

    let fullText = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let thinkingText = '';

    // Parser les événements SSE
    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            // Capturer les métriques
            if (data.type === 'message_start') {
              inputTokens = data.message.usage.input_tokens;
            }
            
            // Capturer le thinking
            if (data.type === 'content_block_delta' && data.delta.type === 'thinking_delta') {
              thinkingText += data.delta.thinking;
            }
            
            // Capturer le texte de la réponse
            if (data.type === 'content_block_delta' && data.delta.type === 'text_delta') {
              fullText += data.delta.text;
            }
            
            // Capturer les tokens de sortie
            if (data.type === 'message_delta' && data.usage) {
              outputTokens = data.usage.output_tokens;
            }
          } catch (e) {
            // Ignorer les erreurs de parsing
          }
        }
      }
    });

    // Attendre la fin du stream
    await new Promise((resolve) => {
      response.data.on('end', resolve);
    });

    console.log('📊 Analyse de la réponse...\n');
    
    console.log('📈 Métriques:');
    console.log(`- Tokens d'entrée : ${inputTokens} (incluant les métadonnées des nodes)`);
    console.log(`- Tokens de sortie : ${outputTokens}\n`);
    
    // Afficher le thinking (optionnel)
    if (thinkingText) {
      console.log('🤔 Raisonnement de Claude:');
      console.log(thinkingText.slice(0, 200) + '...\n');
    }
    
    // Extraire le JSON du workflow
    const jsonMatch = fullText.match(/```json\n([\s\S]*?)\n```/);
    
    if (jsonMatch && jsonMatch[1]) {
      const workflowJson = JSON.parse(jsonMatch[1]);
      
      console.log('✅ Workflow JSON généré :');
      console.log('========================');
      console.log(JSON.stringify(workflowJson, null, 2));
      console.log('========================\n');
      
      console.log('📋 Résumé du workflow :');
      console.log(`- Nom : ${workflowJson.name || 'Sans nom'}`);
      console.log(`- Nombre de nodes : ${workflowJson.nodes?.length || 0}`);
      
      if (workflowJson.nodes?.length > 0) {
        console.log('- Nodes créés :');
        workflowJson.nodes.forEach(node => {
          console.log(`  • ${node.name} (${node.type} v${node.typeVersion})`);
        });
      }
      
      // Vérifier les versions utilisées
      console.log('\n🔍 Vérification des versions :');
      workflowJson.nodes?.forEach(node => {
        if (node.type.includes('httpRequest')) {
          console.log(`  ✓ HTTP Request utilise la version ${node.typeVersion} (demandé: 4.2)`);
        }
        if (node.type.includes('slack')) {
          console.log(`  ✓ Slack utilise la version ${node.typeVersion} (demandé: 2.3)`);
        }
      });
      
    } else {
      console.log('❌ Aucun JSON trouvé dans la réponse');
      console.log('\n📄 Extrait de la réponse :');
      console.log(fullText.slice(0, 500) + '...');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

testRAGWithFullResponse(); 