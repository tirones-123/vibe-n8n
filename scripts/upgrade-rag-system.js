import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { analyzeWorkflow, main as generateDescriptions } from './generate-workflow-descriptions.js';
import { main as reindexPinecone, testSearch } from './reindex-with-descriptions.js';

// Charger les variables d'environnement
dotenv.config();

/**
 * Script maître pour mettre à niveau le système RAG avec descriptions GPT-4
 */

const WORKFLOWS_DIR = path.join(process.cwd(), 'workflows-rag-optimized');
const DESCRIPTIONS_DIR = path.join(process.cwd(), 'workflow-descriptions');

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Vérifier les prérequis
 */
async function checkPrerequisites() {
  colorLog('blue', '\n🔍 Vérification des prérequis...');
  
  const requiredEnvVars = ['OPENAI_API_KEY', 'PINECONE_API_KEY', 'PINECONE_WORKFLOW_INDEX'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    colorLog('red', `❌ Variables d'environnement manquantes: ${missingVars.join(', ')}`);
    colorLog('yellow', '💡 Assurez-vous que votre fichier .env contient toutes les clés API nécessaires');
    process.exit(1);
  }
  
  // Vérifier que le dossier workflows-rag-optimized existe
  try {
    const files = await fs.readdir(WORKFLOWS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    colorLog('green', `✅ ${jsonFiles.length} workflows trouvés dans ${WORKFLOWS_DIR}`);
    
    if (jsonFiles.length === 0) {
      colorLog('red', '❌ Aucun workflow JSON trouvé');
      process.exit(1);
    }
  } catch (error) {
    colorLog('red', `❌ Impossible d'accéder au dossier ${WORKFLOWS_DIR}: ${error.message}`);
    process.exit(1);
  }
  
  colorLog('green', '✅ Tous les prérequis sont remplis');
}

/**
 * Étape 1: Générer les descriptions GPT-4
 */
async function step1_GenerateDescriptions() {
  colorLog('cyan', '\n🚀 ÉTAPE 1: Génération des descriptions GPT-4');
  colorLog('yellow', '⏱️  Cette étape peut prendre 10-30 minutes selon le nombre de workflows...');
  
  try {
    await generateDescriptions();
    colorLog('green', '✅ Descriptions générées avec succès');
    
    // Vérifier le fichier de sortie
    const files = await fs.readdir(DESCRIPTIONS_DIR);
    const descriptionFiles = files.filter(f => f.startsWith('workflow-descriptions-') && f.endsWith('.json'));
    
    if (descriptionFiles.length > 0) {
      const latestFile = descriptionFiles.sort().reverse()[0];
      const filePath = path.join(DESCRIPTIONS_DIR, latestFile);
      const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      
      colorLog('green', `📊 ${data.successful}/${data.totalWorkflows} workflows analysés avec succès`);
      colorLog('green', `📁 Fichier créé: ${latestFile}`);
      
      if (data.failed > 0) {
        colorLog('yellow', `⚠️  ${data.failed} workflows ont échoué (voir failures-xxx.json pour détails)`);
      }
      
      return true;
    } else {
      throw new Error('Aucun fichier de descriptions trouvé après génération');
    }
    
  } catch (error) {
    colorLog('red', `❌ Erreur génération descriptions: ${error.message}`);
    return false;
  }
}

/**
 * Étape 2: Réindexer Pinecone
 */
async function step2_ReindexPinecone() {
  colorLog('cyan', '\n🚀 ÉTAPE 2: Réindexation Pinecone avec descriptions');
  colorLog('yellow', '⏱️  Cette étape peut prendre 5-15 minutes...');
  
  try {
    await reindexPinecone();
    colorLog('green', '✅ Réindexation Pinecone terminée avec succès');
    return true;
  } catch (error) {
    colorLog('red', `❌ Erreur réindexation Pinecone: ${error.message}`);
    return false;
  }
}

/**
 * Étape 3: Test du nouveau système
 */
async function step3_TestNewSystem() {
  colorLog('cyan', '\n🚀 ÉTAPE 3: Test du nouveau système RAG');
  
  const testQueries = [
    "workflow qui envoie des emails automatiquement",
    "automatisation slack avec notifications",
    "traitement de fichiers CSV avec analyse",
    "webhook pour intégration API",
    "workflow de sauvegarde automatique"
  ];
  
  colorLog('blue', '🔍 Tests de recherche avec différentes requêtes...');
  
  for (const query of testQueries) {
    try {
      colorLog('yellow', `\n🎯 Test: "${query}"`);
      await testSearch(query);
    } catch (error) {
      colorLog('red', `❌ Erreur test "${query}": ${error.message}`);
    }
  }
  
  colorLog('green', '✅ Tests terminés');
}

/**
 * Afficher les statistiques finales
 */
async function showFinalStats() {
  colorLog('magenta', '\n📊 STATISTIQUES FINALES');
  
  try {
    // Stats des descriptions
    const files = await fs.readdir(DESCRIPTIONS_DIR);
    const descriptionFiles = files.filter(f => f.startsWith('workflow-descriptions-') && f.endsWith('.json'));
    
    if (descriptionFiles.length > 0) {
      const latestFile = descriptionFiles.sort().reverse()[0];
      const filePath = path.join(DESCRIPTIONS_DIR, latestFile);
      const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      
      colorLog('green', `📝 Descriptions GPT-4: ${data.successful}/${data.totalWorkflows} workflows`);
      colorLog('green', `🤖 Modèle utilisé: ${data.model}`);
      colorLog('green', `📅 Date génération: ${data.generationDate}`);
    }
    
    // Stats de réindexation
    const reindexFiles = files.filter(f => f.startsWith('reindex-report-') && f.endsWith('.json'));
    if (reindexFiles.length > 0) {
      const latestReindex = reindexFiles.sort().reverse()[0];
      const reindexPath = path.join(DESCRIPTIONS_DIR, latestReindex);
      const reindexData = JSON.parse(await fs.readFile(reindexPath, 'utf-8'));
      
      colorLog('green', `🔄 Réindexation: ${reindexData.successfulVectors} vecteurs dans Pinecone`);
      colorLog('green', `📊 Index: ${reindexData.indexName}`);
      colorLog('green', `🧠 Modèle embeddings: ${reindexData.model}`);
    }
    
    colorLog('cyan', '\n🎉 MISE À NIVEAU TERMINÉE AVEC SUCCÈS !');
    colorLog('bright', '\n💡 Votre système RAG est maintenant basé sur des descriptions GPT-4 détaillées.');
    colorLog('bright', '   Les recherches seront beaucoup plus précises et pertinentes !');
    
  } catch (error) {
    colorLog('yellow', '⚠️  Impossible d\'afficher les statistiques finales');
  }
}

/**
 * Script principal
 */
async function main() {
  console.clear();
  colorLog('bright', '🚀 MISE À NIVEAU DU SYSTÈME RAG VERS DESCRIPTIONS GPT-4');
  colorLog('bright', '='.repeat(60));
  
  colorLog('blue', `
📋 Ce script va:
1. 🤖 Analyser tous vos workflows avec GPT-4 pour générer des descriptions détaillées
2. 🔄 Réindexer Pinecone avec ces descriptions au lieu des JSON bruts  
3. 🧪 Tester le nouveau système pour vérifier les améliorations
4. 📊 Afficher les statistiques de performance

⚡ Avantages attendus:
- Recherches sémantiques plus précises
- Meilleure correspondance entre prompts utilisateur et workflows
- Contexte plus riche pour Claude lors de la génération
`);

  const startTime = Date.now();
  
  try {
    // Vérifications préliminaires
    await checkPrerequisites();
    
    // Étape 1: Générer descriptions
    colorLog('bright', '\n' + '='.repeat(60));
    const step1Success = await step1_GenerateDescriptions();
    if (!step1Success) {
      colorLog('red', '❌ Impossible de continuer sans descriptions');
      process.exit(1);
    }
    
    // Étape 2: Réindexer Pinecone
    colorLog('bright', '\n' + '='.repeat(60));
    const step2Success = await step2_ReindexPinecone();
    if (!step2Success) {
      colorLog('yellow', '⚠️  Réindexation échouée, mais les descriptions sont générées');
    }
    
    // Étape 3: Tests
    if (step2Success) {
      colorLog('bright', '\n' + '='.repeat(60));
      await step3_TestNewSystem();
    }
    
    // Statistiques finales
    colorLog('bright', '\n' + '='.repeat(60));
    await showFinalStats();
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    colorLog('green', `\n⏱️  Durée totale: ${Math.floor(duration / 60)}min ${duration % 60}s`);
    
  } catch (error) {
    colorLog('red', `\n❌ Erreur critique: ${error.message}`);
    colorLog('red', error.stack);
    process.exit(1);
  }
}

// Options de ligne de commande
if (process.argv.includes('--descriptions-only')) {
  console.log('🎯 Mode: Génération descriptions uniquement');
  checkPrerequisites().then(() => step1_GenerateDescriptions());
} else if (process.argv.includes('--reindex-only')) {
  console.log('🎯 Mode: Réindexation uniquement');
  checkPrerequisites().then(() => step2_ReindexPinecone());
} else if (process.argv.includes('--test-only')) {
  console.log('🎯 Mode: Test uniquement');
  step3_TestNewSystem();
} else {
  // Exécution complète
  main();
}

export { main, step1_GenerateDescriptions, step2_ReindexPinecone, step3_TestNewSystem }; 