import { config } from 'dotenv';
import { createWorkflowRAGService } from '../api/rag/workflow-rag-service.js';
import fs from 'fs/promises';
import path from 'path';

// Charger les variables d'environnement
config();

async function testRAGOptimized() {
  console.log('🧪 Test du système RAG avec workflows optimisés\n');
  
  try {
    const ragService = createWorkflowRAGService();
    
    // Liste de prompts de test variés
    const testPrompts = [
      "Créer un workflow qui synchronise Slack avec Notion",
      "Bot Discord qui utilise ChatGPT pour répondre aux messages", 
      "Workflow pour analyser des tweets et créer un rapport",
      "Pipeline de traitement de fichiers CSV avec envoi par email",
      "Automatiser la création d'articles de blog avec GPT-4",
      "Workflow de monitoring avec alertes Telegram",
      "Synchronisation bidirectionnelle Google Sheets et Airtable"
    ];
    
    const results = [];
    
    for (let i = 0; i < testPrompts.length; i++) {
      const prompt = testPrompts[i];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🎯 TEST ${i + 1}/${testPrompts.length}`);
      console.log(`📝 Prompt: "${prompt}"`);
      console.log(`${'='.repeat(60)}\n`);
      
      try {
        // Étape 1: Recherche des workflows similaires
        console.log('🔍 1. Recherche Pinecone...');
        const similarWorkflows = await ragService.findSimilarWorkflows(prompt, 10);
        
        console.log(`📊 Pinecone a trouvé ${similarWorkflows.length} workflows:`);
        similarWorkflows.forEach((w, idx) => {
          console.log(`  ${idx + 1}. ${w.name} (score: ${w.relevanceScore.toFixed(3)})`);
        });
        
        // Étape 2: Analyse du chargement
        console.log('\n📁 2. Chargement des workflows optimisés...');
        let loadedCount = 0;
        let skippedCount = 0;
        let totalChars = 0;
        let loadedWorkflows = [];
        
        for (const workflow of similarWorkflows) {
          if (workflow.workflowContent) {
            loadedCount++;
            totalChars += workflow.workflowContent.length;
            loadedWorkflows.push({
              name: workflow.name,
              filename: workflow.filename,
              chars: workflow.workflowContent.length,
              score: workflow.relevanceScore,
              workflowContent: workflow.workflowContent
            });
            console.log(`  ✅ ${workflow.filename} (${workflow.workflowContent.length} chars)`);
          } else {
            skippedCount++;
            console.log(`  ⏭️  ${workflow.filename} (skippé)`);
          }
        }
        
        // Étape 3: Construction du contexte pour Claude
        console.log('\n🤖 3. Préparation du contexte Claude...');
        
        // Simuler la construction du prompt (comme dans generateWorkflowFromExamplesWithStreaming)
        const systemPrompt = `You are an n8n workflow expert. Based on the following similar workflow examples, create a new workflow that meets the user's requirement.

The workflow should:
- Be fully functional and ready to import into n8n
- Use appropriate nodes based on the user's needs
- Follow n8n workflow structure conventions
- Have proper connections between nodes
- Include all necessary configurations
- Use the exact node type formats from the examples (e.g., "nodes-base.webhook")
- Avoid using http request node when possible
- The references in the connections section must point to the name property of each node.

Respond with a JSON object containing both the workflow and an explanation:
{
  "workflow": { /* the complete n8n workflow JSON */ },
  "explanation": {
    "summary": "Brief description of what this workflow does",
    "flow": "Step-by-step explanation of the workflow flow",
    "nodes": "Description of key nodes and their roles",
    "notes": "Any important configuration notes or requirements"
  }
}`;

        const examplesContext = loadedWorkflows
          .slice(0, 3) // Top 3 comme dans le vrai système
          .map((w, i) => {
            const workflowData = JSON.parse(w.workflowContent || '{}');
            const nodeTypes = workflowData.nodes?.map((n) => n.type).join(', ') || 'Unknown';
            
            return `Example ${i + 1} (Similarity: ${w.score.toFixed(3)}):
Filename: ${w.filename}
Nodes: ${nodeTypes}

Full JSON:
\`\`\`json
${w.workflowContent}
\`\`\``;
          }).join('\n\n---\n\n');

        const userPrompt = `"${prompt}"

Here are ${Math.min(loadedWorkflows.length, 3)} similar workflow examples for reference:

${examplesContext}

Based on these examples, create a new workflow that fulfills the user's requirement above.`;

        // Debug - vérifier les tailles réelles
        console.log(`\n🔍 Debug tailles:`);
        console.log(`  System prompt: ${systemPrompt.length} chars`);
        console.log(`  Examples context: ${examplesContext.length} chars`);
        console.log(`  User prompt: ${userPrompt.length} chars`);
        console.log(`  Total réel: ${systemPrompt.length + userPrompt.length} chars`);

        // Statistiques
        const stats = {
          prompt,
          pineconeResults: similarWorkflows.length,
          loadedWorkflows: loadedCount,
          skippedWorkflows: skippedCount,
          totalCharsInContext: totalChars,
          examplesContextChars: examplesContext.length,
          systemPromptChars: systemPrompt.length,
          userPromptChars: userPrompt.length,
          totalPromptChars: systemPrompt.length + userPrompt.length,
          topWorkflows: loadedWorkflows.slice(0, 3).map(w => ({
            name: w.name,
            chars: w.chars,
            score: w.score
          }))
        };
        
        results.push(stats);
        
        console.log(`\n📈 Statistiques:`);
        console.log(`  🔍 Workflows Pinecone: ${stats.pineconeResults}`);
        console.log(`  ✅ Workflows chargés: ${stats.loadedWorkflows}`);
        console.log(`  ⏭️  Workflows skippés: ${stats.skippedWorkflows}`);
        console.log(`  📝 Caractères total contexte: ${stats.totalCharsInContext.toLocaleString()}`);
        console.log(`  📋 Contexte exemples pour Claude: ${stats.examplesContextChars.toLocaleString()}`);
        console.log(`  🤖 Caractères prompt système: ${stats.systemPromptChars.toLocaleString()}`);
        console.log(`  👤 Caractères prompt utilisateur: ${stats.userPromptChars.toLocaleString()}`);
        console.log(`  🔥 TOTAL envoyé à Claude: ${stats.totalPromptChars.toLocaleString()}`);
        
        if (stats.loadedWorkflows < 3) {
          console.log(`  ⚠️  Attention: Seulement ${stats.loadedWorkflows} workflows utilisés (< 3)`);
        }
        
      } catch (error) {
        console.error(`❌ Erreur test ${i + 1}:`, error.message);
        results.push({
          prompt,
          error: error.message
        });
      }
    }
    
    // Résumé final
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 RÉSUMÉ GLOBAL');
    console.log(`${'='.repeat(80)}\n`);
    
    const validResults = results.filter(r => !r.error);
    
    if (validResults.length > 0) {
      const avgPromptSize = validResults.reduce((sum, r) => sum + r.totalPromptChars, 0) / validResults.length;
      const avgContextSize = validResults.reduce((sum, r) => sum + r.examplesContextChars, 0) / validResults.length;
      const avgLoadedWorkflows = validResults.reduce((sum, r) => sum + r.loadedWorkflows, 0) / validResults.length;
      const avgSkippedWorkflows = validResults.reduce((sum, r) => sum + r.skippedWorkflows, 0) / validResults.length;
      const maxPromptSize = Math.max(...validResults.map(r => r.totalPromptChars));
      const minPromptSize = Math.min(...validResults.map(r => r.totalPromptChars));
      
      console.log(`📈 Statistiques moyennes:`);
      console.log(`  🤖 Taille moyenne prompt Claude: ${Math.round(avgPromptSize).toLocaleString()} caractères`);
      console.log(`  📋 Taille moyenne contexte exemples: ${Math.round(avgContextSize).toLocaleString()} caractères`);
      console.log(`  📏 Taille min/max: ${minPromptSize.toLocaleString()} / ${maxPromptSize.toLocaleString()}`);
      console.log(`  ✅ Workflows chargés (moyenne): ${avgLoadedWorkflows.toFixed(1)}`);
      console.log(`  ⏭️  Workflows skippés (moyenne): ${avgSkippedWorkflows.toFixed(1)}`);
      
      // Calcul du ratio d'optimisation
      const avgTotalChars = validResults.reduce((sum, r) => sum + r.totalCharsInContext, 0) / validResults.length;
      const optimizationRatio = ((avgTotalChars - avgContextSize) / avgTotalChars * 100).toFixed(1);
      console.log(`  📊 Optimisation: ${optimizationRatio}% de réduction (${Math.round(avgTotalChars).toLocaleString()} → ${Math.round(avgContextSize).toLocaleString()} chars)`);
      
      // Analyse des workflows les plus utilisés
      const allTopWorkflows = validResults.flatMap(r => r.topWorkflows || []);
      const workflowUsage = {};
      allTopWorkflows.forEach(w => {
        workflowUsage[w.name] = (workflowUsage[w.name] || 0) + 1;
      });
      
      console.log(`\n🏆 Workflows les plus utilisés:`);
      Object.entries(workflowUsage)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([name, count]) => {
          console.log(`  ${count}x ${name}`);
        });
    }
    
    // Sauvegarder les résultats détaillés
    const reportPath = path.join(process.cwd(), 'debug', 'rag-optimized-test-report.json');
    await fs.writeFile(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: results.length,
        successfulTests: validResults.length,
        failedTests: results.length - validResults.length
      },
      results
    }, null, 2));
    
    console.log(`\n💾 Rapport détaillé sauvegardé: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Erreur globale:', error);
  }
}

// Exécuter le test
testRAGOptimized().catch(console.error); 