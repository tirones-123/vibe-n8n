import { createWorkflowRAGService } from '../api/rag/workflow-rag-service.js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Charger les variables d'environnement
dotenv.config({ path: path.join(process.cwd(), '.env') });

const testPrompt = `Je veux que tu me crées un workflow n8n complet (JSON prêt à importer) qui fait ceci :

1. Reçoit une requête via webhook contenant un sujet d'article (ex : "intelligence artificielle et éducation")
2. Envoie ce sujet à l'API Perplexity pour obtenir les 5 meilleures sources d'info
3. Résume ces sources via GPT-4 avec un prompt structuré
4. Génère un article de blog optimisé SEO de 1000 mots avec titre, H1, H2, meta-description, et mots-clés
5. Crée un document Google Doc avec cet article et le partage par email

Utilise uniquement des nodes disponibles dans n8n.

Résultat attendu : un document Google avec l'article généré + envoi par email`;

async function testWithDetailedLogging() {
  console.log('🧪 Test avec logging détaillé du RAG\n');

  try {
    // Vérifier les variables d'environnement
    const requiredEnvVars = ['PINECONE_API_KEY', 'OPENAI_API_KEY', 'CLAUDE_API_KEY'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.error(`❌ Variable manquante: ${envVar}`);
        process.exit(1);
      }
    }

    console.log('✅ Variables d\'environnement OK');
    console.log('\n📝 Prompt de test:');
    console.log('=' .repeat(80));
    console.log(testPrompt);
    console.log('=' .repeat(80));

    // Initialiser le service RAG
    const ragService = createWorkflowRAGService();

    console.log('\n🔍 ÉTAPE 1: Recherche Pinecone...');
    const searchResult = await ragService.searchWorkflows(testPrompt, {
      topK: 10,
      minScore: 0.3
    });

    console.log(`Workflows trouvés: ${searchResult.total}`);
    searchResult.results.forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.name} (score: ${result.relevanceScore.toFixed(3)})`);
      console.log(`     Fichier: ${result.filename}`);
      console.log(`     Nodes: ${result.nodes.join(', ')}`);
    });

    console.log('\n🤖 ÉTAPE 2: Recherche des workflows similaires détaillés...');
    const similarWorkflows = await ragService.findSimilarWorkflows(testPrompt, 3);
    
    console.log(`Workflows chargés pour contexte: ${similarWorkflows.length}`);
    
    // Log détaillé des workflows utilisés comme contexte
    for (let i = 0; i < similarWorkflows.length; i++) {
      const w = similarWorkflows[i];
      console.log(`\n--- WORKFLOW ${i + 1} UTILISÉ COMME CONTEXTE ---`);
      console.log(`Nom: ${w.name}`);
      console.log(`Fichier: ${w.filename}`);
      console.log(`Score: ${w.relevanceScore.toFixed(3)}`);
      console.log(`Taille du contenu: ${w.workflowContent?.length || 0} caractères`);
      
      if (w.workflowContent) {
        try {
          const workflowData = JSON.parse(w.workflowContent);
          console.log(`Nombre de nodes: ${workflowData.nodes?.length || 0}`);
          const nodeTypes = workflowData.nodes?.map(n => n.type).slice(0, 5) || [];
          console.log(`Types de nodes (5 premiers): ${nodeTypes.join(', ')}`);
        } catch (e) {
          console.log('Erreur parsing JSON workflow');
        }
      }
    }

    console.log('\n📤 ÉTAPE 3: Construction du prompt pour Claude...');

    // Construire le même contexte que dans le service
    const systemPrompt = `You are an n8n workflow expert. Based on the following similar workflow examples, create a new workflow that meets the user's requirement.

The workflow should:
- Be fully functional and ready to import into n8n
- Use appropriate nodes based on the user's needs
- Follow n8n workflow structure conventions
- Have proper connections between nodes
- Include all necessary configurations
- Use the exact node type formats from the examples (e.g., "nodes-base.webhook")
- Avoid using http request node when possible
- Use native nodes when possible that you can see in the examples
- The references in the connections section must point to the name property of each node.

Respond with ONLY valid JSON for the workflow. No explanations or markdown, just the workflow JSON.`;

    const examplesContext = similarWorkflows
      .filter(w => w.workflowContent)
      .map((w, i) => {
        const workflowData = JSON.parse(w.workflowContent);
        const nodeTypes = workflowData.nodes?.map((n) => n.type).join(', ') || 'Unknown';
        
        return `Example ${i + 1} (Similarity: ${w.relevanceScore.toFixed(3)}):
Filename: ${w.filename}
Nodes: ${nodeTypes}

Full JSON:
\`\`\`json
${w.workflowContent}
\`\`\``;
      }).join('\n\n---\n\n');

    const userPrompt = `"${testPrompt}"

Here are ${similarWorkflows.length} similar workflow examples for reference:

${examplesContext}

Based on these examples, create a new workflow that fulfills the user's requirement above.`;

    // Sauvegarder le prompt complet pour inspection
    const logData = {
      timestamp: new Date().toISOString(),
      originalPrompt: testPrompt,
      systemPrompt: systemPrompt,
      userPrompt: userPrompt,
      contextWorkflows: similarWorkflows.map(w => ({
        name: w.name,
        filename: w.filename,
        score: w.relevanceScore,
        contentLength: w.workflowContent?.length || 0
      })),
      stats: {
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
        totalPromptLength: systemPrompt.length + userPrompt.length,
        examplesContextLength: examplesContext.length
      }
    };

    await fs.writeFile('test-claude-prompt-log.json', JSON.stringify(logData, null, 2));

    console.log('\n📊 STATISTIQUES DU PROMPT:');
    console.log(`System prompt: ${logData.stats.systemPromptLength} caractères`);
    console.log(`User prompt: ${logData.stats.userPromptLength} caractères`);
    console.log(`Total prompt: ${logData.stats.totalPromptLength} caractères`);
    console.log(`Contexte exemples: ${logData.stats.examplesContextLength} caractères`);

    console.log('\n💾 Prompt complet sauvegardé dans: test-claude-prompt-log.json');
    console.log('📤 Envoi à Claude maintenant...');

    // Générer le workflow avec le même service
    const generationResult = await ragService.generateWorkflowFromExamples(testPrompt, {
      topK: 3,
      workflowName: 'Blog Article Generation Workflow'
    });

    console.log('\n✅ RÉSULTAT FINAL:');
    if (generationResult.success) {
      console.log('🎉 Workflow généré avec succès !');
      console.log(`Basé sur: ${generationResult.similarWorkflows?.join(', ')}`);
      console.log(`Nodes dans le workflow: ${generationResult.workflow?.nodes?.length || 0}`);
      
      // Sauvegarder le workflow généré
      await fs.writeFile('test-generated-workflow.json', JSON.stringify(generationResult.workflow, null, 2));
      console.log('💾 Workflow sauvegardé dans: test-generated-workflow.json');
    } else {
      console.log(`❌ Erreur de génération: ${generationResult.error}`);
    }

    console.log('\n🔍 Fichiers générés pour inspection:');
    console.log('- test-claude-prompt-log.json (prompt complet envoyé à Claude)');
    if (generationResult.success) {
      console.log('- test-generated-workflow.json (workflow généré)');
    }

  } catch (error) {
    console.error('\n❌ Erreur durant le test:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Lancer le test
testWithDetailedLogging(); 