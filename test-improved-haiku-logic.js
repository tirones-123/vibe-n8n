#!/usr/bin/env node

/**
 * Test pour vérifier que Haiku identifie correctement les nodes
 * sans ajouter des IF inutiles pour des filtres simples
 */

const API_URL = 'http://localhost:3000/api/claude';
const API_KEY = process.env.BACKEND_API_KEY || 'test-key-123';

async function testHaikuLogic() {
  console.log('🧪 Test: Haiku Logic - Filtrage Gmail vers Slack');
  console.log('='.repeat(50));

  const testCases = [
    {
      name: 'Gmail → Slack (filtrage par expéditeur)',
      prompt: 'Crée un workflow qui envoie un message Slack quand je reçois un email de maxime@example.com',
      expectedNodes: ['gmailTrigger', 'slack'],
      shouldNotHave: ['if']
    },
    {
      name: 'Gmail → Slack (filtrage par sujet)',
      prompt: 'Crée un workflow qui envoie un message Slack pour les emails avec "URGENT" dans le sujet',
      expectedNodes: ['gmailTrigger', 'slack'],
      shouldNotHave: ['if']
    },
    {
      name: 'Gmail → Slack (simple)',
      prompt: 'Crée un workflow qui envoie tous les nouveaux emails vers Slack',
      expectedNodes: ['gmailTrigger', 'slack'],
      shouldNotHave: ['if']
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`Prompt: "${testCase.prompt}"`);
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: testCase.prompt,
          context: {},
          tools: [],
          mode: 'create',
          versions: 'none'
        })
      });

      if (!response.ok) {
        console.error(`❌ Erreur HTTP: ${response.status}`);
        continue;
      }

      let fullResponse = '';
      let workflow = null;
      
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
              if (data.type === 'content_block_delta' && data.delta?.text) {
                fullResponse += data.delta.text;
              }
            } catch (e) {
              // Ignorer les erreurs de parsing
            }
          }
        }
      }
      
      // Extraire le JSON du workflow
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          workflow = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error('❌ Erreur parsing JSON:', e.message);
          continue;
        }
      }
      
      if (!workflow || !workflow.nodes) {
        console.error('❌ Pas de workflow valide trouvé');
        continue;
      }
      
      // Analyser les nodes générés
      const generatedNodes = workflow.nodes.map(node => {
        const nodeType = node.type.split('.').pop();
        return {
          type: nodeType,
          name: node.name,
          typeVersion: node.typeVersion
        };
      });
      
      console.log(`📊 Nodes générés: ${generatedNodes.map(n => n.type).join(', ')}`);
      
      // Vérifier les nodes attendus
      let success = true;
      for (const expectedNode of testCase.expectedNodes) {
        const found = generatedNodes.some(n => n.type === expectedNode);
        if (found) {
          console.log(`✅ Node attendu trouvé: ${expectedNode}`);
        } else {
          console.log(`❌ Node attendu manquant: ${expectedNode}`);
          success = false;
        }
      }
      
      // Vérifier les nodes à éviter
      if (testCase.shouldNotHave) {
        for (const avoidNode of testCase.shouldNotHave) {
          const found = generatedNodes.some(n => n.type === avoidNode);
          if (!found) {
            console.log(`✅ Node correctement évité: ${avoidNode}`);
          } else {
            console.log(`❌ Node ajouté inutilement: ${avoidNode}`);
            success = false;
          }
        }
      }
      
      console.log(`\n📋 Résultat: ${success ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);
      console.log(`Nombre de nodes: ${generatedNodes.length}`);
      
      // Afficher les détails pour debug
      if (!success) {
        console.log('\n🔍 Détails des nodes:');
        generatedNodes.forEach((node, i) => {
          console.log(`  ${i + 1}. ${node.name} (${node.type} v${node.typeVersion})`);
        });
      }
      
    } catch (error) {
      console.error(`❌ Erreur: ${error.message}`);
    }
  }
}

// Exécuter le test
testHaikuLogic().catch(console.error); 