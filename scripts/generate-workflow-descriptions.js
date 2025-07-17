import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const WORKFLOWS_DIR = path.join(process.cwd(), 'workflows-rag-optimized');
const OUTPUT_DIR = path.join(process.cwd(), 'workflow-descriptions');
const BATCH_SIZE = 5; // Traiter 5 workflows en parallèle
const DELAY_BETWEEN_BATCHES = 2000; // 2 secondes entre les batches

// Initialiser OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Prompt système pour GPT-4
const ANALYSIS_PROMPT = `You are an n8n automation expert. Analyze this workflow JSON and generate a detailed and precise description in English.

The description must be structured as follows:

**Main Objective:** [In one sentence, what does this workflow do]

**Trigger:** [How the workflow starts - webhook, cron, manual, etc.]

**Detailed Flow:**
1. [Step 1 with involved node]
2. [Step 2 with involved node]
3. [...]

**Services/APIs Used:** [List of external services - Slack, Gmail, etc.]

**Use Cases:** [In what contexts would this workflow be useful]

**Key Features:** [Transformations, conditions, loops, etc.]

Be precise about the actual actions performed and data manipulated. Use natural language and avoid excessive technical jargon.`;

/**
 * Analyser un workflow avec GPT-4
 */
async function analyzeWorkflow(workflowData, filename) {
  try {
    console.log(`🔍 Analyse de ${filename}...`);
    
    // Extraire les informations clés du workflow
    const nodeTypes = workflowData.nodes?.map(n => n.type) || [];
    const nodeNames = workflowData.nodes?.map(n => n.name) || [];
    const workflowName = workflowData.name || filename.replace('.json', '');
    
    // Créer un résumé structuré pour GPT-4
    const workflowSummary = {
      name: workflowName,
      nodeCount: workflowData.nodes?.length || 0,
      nodeTypes: [...new Set(nodeTypes)],
      nodeNames: nodeNames,
      connections: Object.keys(workflowData.connections || {}),
      settings: workflowData.settings || {}
    };
    
    const prompt = `Workflow JSON to analyze:
Name: ${workflowName}
Number of nodes: ${workflowSummary.nodeCount}
Node types: ${workflowSummary.nodeTypes.join(', ')}

Complete JSON:
${JSON.stringify(workflowData, null, 2)}

Generate a detailed description following the requested format.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1', // Using GPT-4.1 for better analysis
      messages: [
        { role: 'system', content: ANALYSIS_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1, // Low for consistent descriptions
      max_tokens: 2000
    });

    const description = response.choices[0]?.message?.content;
    
    if (!description) {
      throw new Error('No description generated');
    }

    console.log(`✅ ${filename} analysé`);
    
    return {
      filename,
      workflowName,
      description,
      metadata: {
        nodeCount: workflowSummary.nodeCount,
        nodeTypes: workflowSummary.nodeTypes,
        analysisDate: new Date().toISOString(),
        model: 'gpt-4.1'
      }
    };

  } catch (error) {
    console.error(`❌ Erreur analyse ${filename}:`, error.message);
    return {
      filename,
      workflowName: workflowData.name || filename,
      description: null,
      error: error.message
    };
  }
}

/**
 * Traiter un batch de workflows
 */
async function processBatch(workflows, batchIndex, outputFile) {
  console.log(`\n📦 Batch ${batchIndex + 1} - Traitement de ${workflows.length} workflows...`);
  
  const promises = workflows.map(async ({ filename, content }) => {
    try {
      const workflowData = JSON.parse(content);
      return await analyzeWorkflow(workflowData, filename);
    } catch (error) {
      console.error(`❌ Erreur parsing ${filename}:`, error.message);
      return {
        filename,
        workflowName: filename,
        description: null,
        error: `Parsing error: ${error.message}`
      };
    }
  });

  const results = await Promise.all(promises);
  
  // Statistiques du batch
  const successful = results.filter(r => r.description).length;
  const failed = results.filter(r => !r.description).length;
  
  console.log(`✅ Batch ${batchIndex + 1} terminé: ${successful} succès, ${failed} échecs`);
  
  // Sauvegarder immédiatement ce batch
  await saveBatchResults(results, batchIndex, outputFile);
  
  return results;
}

/**
 * Sauvegarder les résultats d'un batch immédiatement
 */
async function saveBatchResults(batchResults, batchIndex, outputFile) {
  try {
    // Lire le fichier existant ou créer une nouvelle structure
    let existingData;
    try {
      const existingContent = await fs.readFile(outputFile, 'utf-8');
      existingData = JSON.parse(existingContent);
    } catch (error) {
      // Fichier n'existe pas encore, créer une nouvelle structure
      existingData = {
        generationDate: new Date().toISOString(),
        totalWorkflows: 0,
        successful: 0,
        failed: 0,
        model: 'gpt-4.1',
        workflows: [],
        lastBatchProcessed: -1,
        isComplete: false
      };
    }
    
    // Ajouter les nouveaux résultats
    existingData.workflows.push(...batchResults);
    existingData.totalWorkflows = existingData.workflows.length;
    existingData.successful = existingData.workflows.filter(w => w.description).length;
    existingData.failed = existingData.workflows.filter(w => !w.description).length;
    existingData.lastBatchProcessed = batchIndex;
    existingData.lastUpdate = new Date().toISOString();
    
    // Sauvegarder
    await fs.writeFile(outputFile, JSON.stringify(existingData, null, 2));
    console.log(`💾 Sauvegarde: ${existingData.successful} workflows analysés (batch ${batchIndex + 1})`);
    
  } catch (error) {
    console.error('❌ Erreur sauvegarde batch:', error.message);
  }
}

/**
 * Charger les résultats existants pour reprise
 */
async function loadExistingResults(outputFile) {
  try {
    const existingContent = await fs.readFile(outputFile, 'utf-8');
    const existingData = JSON.parse(existingContent);
    
    if (existingData.isComplete) {
      console.log(`✅ Fichier déjà complet trouvé: ${existingData.successful}/${existingData.totalWorkflows} workflows`);
      return { completed: true, data: existingData };
    }
    
    console.log(`🔄 Reprise détectée: ${existingData.successful} workflows déjà analysés`);
    console.log(`📊 Dernier batch traité: ${existingData.lastBatchProcessed + 1}`);
    
    // Retourner les noms de fichiers déjà traités
    const processedFilenames = existingData.workflows.map(w => w.filename);
    return { 
      completed: false, 
      data: existingData, 
      processedFilenames,
      lastBatch: existingData.lastBatchProcessed 
    };
    
  } catch (error) {
    // Pas de fichier existant
    return { completed: false, data: null, processedFilenames: [], lastBatch: -1 };
  }
}

/**
 * Script principal
 */
async function main() {
  console.log('🚀 Génération des descriptions de workflows avec GPT-4');
  
  try {
    // Vérifier les variables d'environnement
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY manquante dans .env');
    }
    
    // Créer le dossier de sortie
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Lister tous les fichiers JSON
    console.log(`📁 Lecture du dossier: ${WORKFLOWS_DIR}`);
    const files = await fs.readdir(WORKFLOWS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    console.log(`📊 ${jsonFiles.length} workflows trouvés`);
    
    // Charger tous les contenus
    console.log('📖 Chargement des workflows...');
    const workflows = [];
    
    for (const filename of jsonFiles) {
      try {
        const filePath = path.join(WORKFLOWS_DIR, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        workflows.push({ filename, content });
      } catch (error) {
        console.error(`❌ Erreur lecture ${filename}:`, error.message);
      }
    }
    
    console.log(`✅ ${workflows.length} workflows chargés`);
    
    // Préparer le fichier de sortie avec reprise possible
    const timestamp = new Date().toISOString().split('T')[0];
    const outputFile = path.join(OUTPUT_DIR, `workflow-descriptions-${timestamp}.json`);
    
    // Vérifier s'il y a un fichier existant à reprendre
    const existingResults = await loadExistingResults(outputFile);
    
    if (existingResults.completed) {
      console.log('🎉 Les descriptions sont déjà complètes !');
      return;
    }
    
    let allResults = existingResults.data ? existingResults.data.workflows : [];
    let workflowsToProcess = workflows;
    let startBatch = 0;
    
    // Filtrer les workflows déjà traités
    if (existingResults.processedFilenames.length > 0) {
      console.log(`🔄 Reprise : ${existingResults.processedFilenames.length} workflows déjà traités`);
      workflowsToProcess = workflows.filter(w => !existingResults.processedFilenames.includes(w.filename));
      startBatch = existingResults.lastBatch + 1;
      console.log(`📊 ${workflowsToProcess.length} workflows restants à traiter`);
    }
    
    // Traiter par batches
    const batches = [];
    
    for (let i = 0; i < workflowsToProcess.length; i += BATCH_SIZE) {
      batches.push(workflowsToProcess.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`🎯 Traitement en ${batches.length} batches de ${BATCH_SIZE} workflows max`);
    if (startBatch > 0) {
      console.log(`🔄 Reprise à partir du batch ${startBatch + 1}`);
    }
    
    for (let i = 0; i < batches.length; i++) {
      const actualBatchIndex = startBatch + i;
      const batchResults = await processBatch(batches[i], actualBatchIndex, outputFile);
      allResults.push(...batchResults);
      
      // Délai entre les batches pour respecter les rate limits
      if (i < batches.length - 1) {
        console.log(`⏱️  Pause de ${DELAY_BETWEEN_BATCHES}ms...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    // Marquer comme terminé et sauvegarder les résultats finaux
    const finalOutput = {
      generationDate: new Date().toISOString(),
      totalWorkflows: allResults.length,
      successful: allResults.filter(r => r.description).length,
      failed: allResults.filter(r => !r.description).length,
      model: 'gpt-4.1',
      workflows: allResults,
      isComplete: true,
      completedAt: new Date().toISOString()
    };
    
    await fs.writeFile(outputFile, JSON.stringify(finalOutput, null, 2));
    
    // Statistiques finales
    console.log('\n📊 STATISTIQUES FINALES:');
    console.log(`✅ Total workflows: ${finalOutput.totalWorkflows}`);
    console.log(`🎉 Succès: ${finalOutput.successful}`);
    console.log(`❌ Échecs: ${finalOutput.failed}`);
    console.log(`📝 Fichier sauvegardé: ${outputFile}`);
    
    // Sauvegarder aussi les échecs pour debug
    const failures = allResults.filter(r => !r.description);
    if (failures.length > 0) {
      const failuresTimestamp = new Date().toISOString().split('T')[0];
      const failuresFile = path.join(OUTPUT_DIR, `failures-${failuresTimestamp}.json`);
      await fs.writeFile(failuresFile, JSON.stringify(failures, null, 2));
      console.log(`🔍 Échecs détaillés: ${failuresFile}`);
    }
    
    // Aperçu de quelques descriptions
    const successful = allResults.filter(r => r.description);
    if (successful.length > 0) {
      console.log('\n📋 APERÇU DES DESCRIPTIONS GÉNÉRÉES:');
      successful.slice(0, 3).forEach((result, i) => {
        console.log(`\n${i + 1}. ${result.workflowName}:`);
        console.log(result.description.substring(0, 200) + '...');
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur principale:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { analyzeWorkflow, main }; 