import dotenv from 'dotenv';
import { createWorkflowRAGService } from '../api/rag/workflow-rag-service.js';
import fs from 'fs/promises';
import path from 'path';

// Charger les variables d'environnement
dotenv.config();

// Configuration du test
const TEST_PROMPT = "Je veux un workflow n8n qui reçoit un sujet via un webhook, utilise l'API de Perplexity pour chercher des infos, résume les résultats avec GPT-4, puis génère un article SEO complet et me l'envoie par email dans un Google Doc.";

async function testCreationMode() {
  console.log('🧪 === TEST MODE CRÉATION ===');
  console.log(`📝 Prompt: "${TEST_PROMPT}"`);
  console.log(`⏰ Début: ${new Date().toISOString()}`);
  
  const startTime = Date.now();
  
  // Collecter tous les logs de progression
  const progressLogs = [];
  const ragFilesUsed = [];
  
  // Callback pour capturer les logs
  const onProgress = (stage, data) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      stage,
      data
    };
    progressLogs.push(logEntry);
    
    console.log(`\n📊 [${stage.toUpperCase()}] ${data.message || 'Event'}`);
    
    // Capturer les workflows similaires trouvés
    if (stage === 'context_building' && data.workflows) {
      console.log(`📁 Workflows trouvés: ${data.workflows.join(', ')}`);
      ragFilesUsed.push(...data.workflows);
    }
    
    // Afficher d'autres détails selon le stage
    switch (stage) {
      case 'search':
        console.log(`   🔍 Recherche en cours...`);
        break;
      case 'context_building':
        console.log(`   🏗️ ${data.workflows?.length || 0} workflows chargés`);
        break;
      case 'claude_call':
        console.log(`   🤖 Prompt: ${data.promptLength} caractères`);
        break;
      case 'compression':
        console.log(`   🗜️ Workflow: ${data.nodesCount} nœuds`);
        break;
      case 'complete':
        console.log(`   ✅ Workflow généré avec succès!`);
        break;
      case 'error':
        console.log(`   ❌ Erreur: ${data.message || data.error}`);
        break;
    }
  };

  try {
    // Initialiser le service RAG
    console.log('\n🔧 Initialisation du service RAG...');
    const ragService = createWorkflowRAGService();
    console.log('✅ Service RAG initialisé');

    // Générer le workflow (MODE CRÉATION - pas de baseWorkflow)
    console.log('\n🚀 Génération du workflow...');
    const result = await ragService.generateWorkflowFromExamplesWithStreaming(
      TEST_PROMPT,
      {
        topK: 3,
        workflowName: 'Test Workflow SEO',
        baseWorkflow: null, // MODE CRÉATION
        onProgress
      }
    );

    const duration = Date.now() - startTime;
    
    // Analyser les résultats
    console.log('\n🎯 === RÉSULTATS ===');
    console.log(`⏱️ Durée totale: ${(duration / 1000).toFixed(1)}s`);
    console.log(`✅ Succès: ${result.success}`);
    
    if (result.success) {
      console.log(`📊 Nœuds générés: ${result.workflow?.nodes?.length || 0}`);
      console.log(`🔗 Connexions: ${Object.keys(result.workflow?.connections || {}).length}`);
      console.log(`📁 Fichiers RAG utilisés: ${ragFilesUsed.length}`);
      
      // Afficher les fichiers RAG utilisés
      console.log('\n📁 === FICHIERS RAG UTILISÉS ===');
      ragFilesUsed.forEach((filename, i) => {
        console.log(`${i + 1}. ${filename}`);
      });
      
      // Afficher un aperçu de l'explication
      if (result.explanation) {
        console.log('\n📝 === EXPLICATION ===');
        console.log(`Résumé: ${result.explanation.summary}`);
        console.log(`Flow: ${result.explanation.flow}`);
        console.log(`Nœuds: ${result.explanation.nodes}`);
        console.log(`Notes: ${result.explanation.notes}`);
      }
      
      // Sauvegarder les résultats
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputDir = path.join(process.cwd(), 'debug');
      
      try {
        await fs.mkdir(outputDir, { recursive: true });
        
        // Sauvegarder le workflow généré
        const workflowFile = path.join(outputDir, `test-creation-workflow-${timestamp}.json`);
        await fs.writeFile(workflowFile, JSON.stringify(result.workflow, null, 2));
        console.log(`💾 Workflow sauvegardé: ${workflowFile}`);
        
        // Sauvegarder l'explication
        const explanationFile = path.join(outputDir, `test-creation-explanation-${timestamp}.json`);
        await fs.writeFile(explanationFile, JSON.stringify(result.explanation, null, 2));
        console.log(`💾 Explication sauvegardée: ${explanationFile}`);
        
        // Sauvegarder les logs complets
        const logsFile = path.join(outputDir, `test-creation-logs-${timestamp}.json`);
        const completeLog = {
          prompt: TEST_PROMPT,
          duration,
          success: result.success,
          ragFilesUsed,
          progressLogs,
          result,
          stats: {
            nodes: result.workflow?.nodes?.length || 0,
            connections: Object.keys(result.workflow?.connections || {}).length,
            transmissionType: result.transmissionType
          }
        };
        await fs.writeFile(logsFile, JSON.stringify(completeLog, null, 2));
        console.log(`💾 Logs complets sauvegardés: ${logsFile}`);
        
      } catch (saveError) {
        console.error('❌ Erreur sauvegarde:', saveError.message);
      }
      
    } else {
      console.log(`❌ Erreur: ${result.error}`);
      if (result.rawResponse) {
        console.log(`📜 Réponse brute: ${result.rawResponse.substring(0, 500)}...`);
      }
    }
    
    // Afficher les workflows similaires utilisés
    if (result.similarWorkflows && result.similarWorkflows.length > 0) {
      console.log('\n🔍 === WORKFLOWS SIMILAIRES UTILISÉS ===');
      result.similarWorkflows.forEach((name, i) => {
        console.log(`${i + 1}. ${name}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ === ERREUR CRITIQUE ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    
    // Sauvegarder l'erreur pour debug
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const errorFile = path.join(process.cwd(), 'debug', `test-creation-error-${timestamp}.json`);
      await fs.writeFile(errorFile, JSON.stringify({
        error: error.message,
        stack: error.stack,
        prompt: TEST_PROMPT,
        progressLogs,
        ragFilesUsed
      }, null, 2));
      console.log(`💾 Erreur sauvegardée: ${errorFile}`);
    } catch (saveError) {
      console.error('❌ Impossible de sauvegarder l\'erreur:', saveError.message);
    }
  }
  
  console.log('\n🏁 === FIN DU TEST ===');
}

// Exécuter le test
testCreationMode().catch(console.error); 