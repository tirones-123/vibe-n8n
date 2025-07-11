// analyze-mcp-response.js
// Script pour analyser la réponse MCP et extraire les informations

import fs from 'fs';

function analyzeMCPResponse(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extraire les lignes de données SSE (Server-Sent Events)
    const dataLines = content.split('\n').filter(line => line.startsWith('data: '));
    
    console.log('=== ANALYSE DE LA RÉPONSE MCP ===\n');
    console.log(`📊 Total de lignes de données: ${dataLines.length}\n`);
    
    const toolsUsed = [];
    const toolResults = [];
    let assistantText = '';
    let finalWorkflow = null;
    
    dataLines.forEach((line, index) => {
      try {
        const data = JSON.parse(line.substring(6)); // Enlever "data: "
        
        if (data.type === 'tool_use') {
          toolsUsed.push({
            name: data.name,
            id: data.id,
            input: data.input
          });
          console.log(`🔧 Outil ${toolsUsed.length}: ${data.name}`);
          console.log(`   Input:`, JSON.stringify(data.input, null, 2));
        }
        
        if (data.type === 'tool_result') {
          const result = data.result;
          toolResults.push({
            id: data.id,
            result: result
          });
          
          // Trouver l'outil correspondant
          const tool = toolsUsed.find(t => t.id === data.id);
          if (tool) {
            console.log(`📋 Résultat de ${tool.name}:`);
            if (result.content && result.content[0] && result.content[0].text) {
              const text = result.content[0].text;
              // Essayer de parser le JSON si possible
              try {
                const parsedData = JSON.parse(text);
                if (parsedData.nodes || parsedData.results || parsedData.nodeType) {
                  console.log(`   Données structurées reçues`);
                  if (parsedData.results) {
                    console.log(`   - ${parsedData.results.length} résultats trouvés`);
                  }
                  if (parsedData.nodeType) {
                    console.log(`   - Node: ${parsedData.displayName || parsedData.nodeType}`);
                  }
                } else {
                  console.log(`   Texte:`, text.substring(0, 100) + '...');
                }
              } catch (e) {
                console.log(`   Texte:`, text.substring(0, 100) + '...');
              }
            }
          }
        }
        
        if (data.type === 'assistant_text') {
          assistantText += data.text;
        }
        
        if (data.type === 'final') {
          console.log(`\n🎯 Réponse finale reçue`);
          if (data.content && data.content.content) {
            const finalContent = data.content.content;
            const textBlock = finalContent.find(block => block.type === 'text');
            if (textBlock) {
              // Chercher du JSON dans le texte final
              const jsonMatch = textBlock.text.match(/\{[\s\S]*"nodes"[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  finalWorkflow = JSON.parse(jsonMatch[0]);
                  console.log(`   ✅ Workflow JSON trouvé !`);
                } catch (e) {
                  console.log(`   ❌ JSON invalide dans la réponse finale`);
                }
              }
            }
          }
        }
        
      } catch (e) {
        // Ignorer les lignes non-JSON
      }
    });
    
    console.log(`\n=== RÉSUMÉ ===`);
    console.log(`🔧 Outils utilisés: ${toolsUsed.length}`);
    console.log(`📋 Résultats reçus: ${toolResults.length}`);
    console.log(`📝 Outils dans l'ordre:`);
    toolsUsed.forEach((tool, i) => {
      console.log(`   ${i + 1}. ${tool.name} ${JSON.stringify(tool.input)}`);
    });
    
    if (finalWorkflow) {
      console.log(`\n🎯 WORKFLOW FINAL GÉNÉRÉ:`);
      console.log(`   - Nodes: ${finalWorkflow.nodes?.length || 0}`);
      console.log(`   - Connections: ${Object.keys(finalWorkflow.connections || {}).length}`);
      
      if (finalWorkflow.nodes) {
        console.log(`   - Types de nodes:`);
        finalWorkflow.nodes.forEach(node => {
          console.log(`     • ${node.name}: ${node.type}`);
        });
      }
      
      console.log(`\n📄 JSON complet:`);
      console.log(JSON.stringify(finalWorkflow, null, 2));
    }
    
    return {
      toolsUsed,
      toolResults,
      assistantText,
      finalWorkflow
    };
    
  } catch (error) {
    console.error('Erreur lors de l\'analyse:', error.message);
    return null;
  }
}

// Analyser le fichier
const result = analyzeMCPResponse('test-complex-response.json');
if (result) {
  console.log('\n✅ Analyse terminée avec succès !');
} else {
  console.log('\n❌ Erreur lors de l\'analyse');
} 