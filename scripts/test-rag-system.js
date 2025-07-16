import { createWorkflowRAGService } from '../api/rag/workflow-rag-service.js';
import dotenv from 'dotenv';
import path from 'path';

// Charger les variables d'environnement
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function testRAGSystem() {
  console.log('🧪 Test du système RAG Workflow\n');

  try {
    // Vérifier les variables d'environnement
    const requiredEnvVars = [
      'PINECONE_API_KEY',
      'OPENAI_API_KEY',
      'CLAUDE_API_KEY'
    ];

    console.log('📋 Vérification des variables d\'environnement...');
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.error(`❌ Variable manquante: ${envVar}`);
        process.exit(1);
      } else {
        console.log(`✅ ${envVar}: configurée`);
      }
    }

    // Initialiser le service RAG
    console.log('\n🔧 Initialisation du service RAG...');
    const ragService = createWorkflowRAGService();

    // Test de recherche
    console.log('\n🔍 Test de recherche de workflows similaires...');
    const searchQuery = 'workflow with Slack notification';
    const searchResults = await ragService.searchWorkflows(searchQuery, {
      topK: 3,
      minScore: 0.1
    });

    console.log(`Recherche: "${searchQuery}"`);
    console.log(`Résultats trouvés: ${searchResults.total}`);
    
    if (searchResults.results.length > 0) {
      searchResults.results.forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.name} (score: ${result.relevanceScore.toFixed(3)})`);
      });
    } else {
      console.log('⚠️  Aucun workflow trouvé - vérifiez l\'indexation Pinecone');
    }

    // Test de génération (optionnel si des workflows ont été trouvés)
    if (searchResults.results.length > 0) {
      console.log('\n🤖 Test de génération de workflow...');
      const generationResult = await ragService.generateWorkflowFromExamples(
        'Create a simple workflow that sends a Slack message',
        {
          topK: 2,
          workflowName: 'Test Generated Workflow'
        }
      );

      if (generationResult.success) {
        console.log('✅ Workflow généré avec succès !');
        console.log(`Basé sur: ${generationResult.similarWorkflows?.join(', ')}`);
        console.log(`Nodes dans le workflow: ${generationResult.workflow?.nodes?.length || 0}`);
      } else {
        console.log(`❌ Erreur de génération: ${generationResult.error}`);
      }
    }

    console.log('\n🎉 Test terminé avec succès !');

  } catch (error) {
    console.error('\n❌ Erreur durant le test:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Lancer le test
testRAGSystem(); 