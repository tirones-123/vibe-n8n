import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Configuration
const WORKFLOWS_DIR = path.join(process.cwd(), 'workflows-rag-optimized');
const DESCRIPTIONS_DIR = path.join(process.cwd(), 'workflow-descriptions');
const BATCH_SIZE = 5; // Traiter 5 workflows en parallèle
const DELAY_BETWEEN_BATCHES = 2000; // 2 secondes entre les batches

// Initialiser OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Prompt système pour GPT-4 (même que dans le script principal)
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
 * Analyser un workflow avec GPT-4 (même fonction que dans le script principal)
 */
async function analyzeWorkflow(workflowData, filename) {
  try {
    console.log(`🔍 Ré-analyse de ${filename}...`);
    
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
      model: 'gpt-4o', // Using GPT-4 Omni for better analysis
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

    console.log(`✅ ${filename} ré-analysé avec succès`);
    
    return {
      filename,
      workflowName,
      description,
      metadata: {
        nodeCount: workflowSummary.nodeCount,
        nodeTypes: workflowSummary.nodeTypes,
        analysisDate: new Date().toISOString(),
        model: 'gpt-4o',
        retry: true
      }
    };

  } catch (error) {
    console.error(`❌ Erreur ré-analyse ${filename}:`, error.message);
    return {
      filename,
      workflowName: workflowData.name || filename,
      description: null,
      error: error.message,
      retry: true
    };
  }
}

/**
 * Identifier les workflows qui ont échoué avec "Connection error"
 */
async function identifyFailedWorkflows() {
  try {
    // Trouver le fichier de descriptions le plus récent
    const files = await fs.readdir(DESCRIPTIONS_DIR);
    const descriptionFiles = files.filter(f => f.startsWith('workflow-descriptions-') && f.endsWith('.json'));
    
    if (descriptionFiles.length === 0) {
      throw new Error('Aucun fichier de descriptions trouvé');
    }
    
    const latestFile = descriptionFiles.sort().reverse()[0];
    const descriptionsPath = path.join(DESCRIPTIONS_DIR, latestFile);
    
    console.log(`📄 Lecture du fichier: ${latestFile}`);
    
    // Charger les descriptions
    const descriptionsData = JSON.parse(await fs.readFile(descriptionsPath, 'utf-8'));
    
    // Identifier les workflows avec erreurs de connexion
    const failedWorkflows = descriptionsData.workflows.filter(w => 
      w.error && (
        w.error.includes('Connection error') ||
        w.error.includes('connection error') ||
        w.error.includes('Network error') ||
        w.error.includes('network error') ||
        w.error.includes('ENOTFOUND') ||
        w.error.includes('ECONNRESET') ||
        w.error.includes('timeout')
      )
    );
    
    console.log(`📊 Workflows échoués trouvés: ${failedWorkflows.length}`);
    failedWorkflows.forEach((w, i) => {
      console.log(`  ${i + 1}. ${w.filename} - Erreur: ${w.error}`);
    });
    
    return {
      descriptionsData,
      failedWorkflows,
      descriptionsPath
    };
    
  } catch (error) {
    console.error('❌ Erreur lecture fichier descriptions:', error.message);
    throw error;
  }
}

/**
 * Relancer l'analyse des workflows échoués
 */
async function retryFailedWorkflows() {
  console.log('🔄 Identification et reprise des workflows échoués');
  
  try {
    // Identifier les workflows échoués
    const { descriptionsData, failedWorkflows, descriptionsPath } = await identifyFailedWorkflows();
    
    if (failedWorkflows.length === 0) {
      console.log('🎉 Aucun workflow échoué à relancer !');
      return;
    }
    
    console.log(`🎯 ${failedWorkflows.length} workflows à relancer`);
    
    // Charger les contenus des workflows échoués
    const workflowsToRetry = [];
    
    for (const failedWorkflow of failedWorkflows) {
      try {
        const filePath = path.join(WORKFLOWS_DIR, failedWorkflow.filename);
        const content = await fs.readFile(filePath, 'utf-8');
        workflowsToRetry.push({ 
          filename: failedWorkflow.filename, 
          content,
          originalIndex: descriptionsData.workflows.findIndex(w => w.filename === failedWorkflow.filename)
        });
      } catch (error) {
        console.error(`❌ Impossible de charger ${failedWorkflow.filename}:`, error.message);
      }
    }
    
    console.log(`📖 ${workflowsToRetry.length} workflows chargés pour reprise`);
    
    // Traiter par batches
    const batches = [];
    for (let i = 0; i < workflowsToRetry.length; i += BATCH_SIZE) {
      batches.push(workflowsToRetry.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`🎯 Traitement en ${batches.length} batches de ${BATCH_SIZE} workflows max`);
    
    let totalSuccess = 0;
    let totalFailed = 0;
    
    for (let i = 0; i < batches.length; i++) {
      console.log(`\n📦 Batch ${i + 1}/${batches.length} - Reprise de ${batches[i].length} workflows...`);
      
      const promises = batches[i].map(async ({ filename, content, originalIndex }) => {
        try {
          const workflowData = JSON.parse(content);
          const result = await analyzeWorkflow(workflowData, filename);
          return { ...result, originalIndex };
        } catch (error) {
          console.error(`❌ Erreur parsing ${filename}:`, error.message);
          return {
            filename,
            workflowName: filename,
            description: null,
            error: `Parsing error: ${error.message}`,
            originalIndex
          };
        }
      });

      const results = await Promise.all(promises);
      
      // Mettre à jour le fichier de descriptions avec les nouveaux résultats
      for (const result of results) {
        if (result.originalIndex >= 0) {
          descriptionsData.workflows[result.originalIndex] = result;
        }
      }
      
      // Sauvegarder immédiatement
      await fs.writeFile(descriptionsPath, JSON.stringify(descriptionsData, null, 2));
      
      const batchSuccess = results.filter(r => r.description).length;
      const batchFailed = results.filter(r => !r.description).length;
      
      totalSuccess += batchSuccess;
      totalFailed += batchFailed;
      
      console.log(`✅ Batch ${i + 1} terminé: ${batchSuccess} succès, ${batchFailed} échecs`);
      console.log(`💾 Fichier mis à jour avec les nouvelles analyses`);
      
      // Délai entre les batches
      if (i < batches.length - 1) {
        console.log(`⏱️  Pause de ${DELAY_BETWEEN_BATCHES}ms...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    // Mettre à jour les statistiques globales
    descriptionsData.successful = descriptionsData.workflows.filter(w => w.description).length;
    descriptionsData.failed = descriptionsData.workflows.filter(w => !w.description).length;
    descriptionsData.lastRetryDate = new Date().toISOString();
    
    // Sauvegarder le fichier final
    await fs.writeFile(descriptionsPath, JSON.stringify(descriptionsData, null, 2));
    
    console.log('\n📊 REPRISE TERMINÉE:');
    console.log(`✅ Workflows relancés avec succès: ${totalSuccess}`);
    console.log(`❌ Workflows encore en échec: ${totalFailed}`);
    console.log(`📈 Total succès dans le fichier: ${descriptionsData.successful}`);
    console.log(`📉 Total échecs dans le fichier: ${descriptionsData.failed}`);
    console.log(`📝 Fichier mis à jour: ${descriptionsPath}`);
    
    if (totalFailed > 0) {
      console.log('\n⚠️  Quelques workflows ont encore échoué. Vérifiez les erreurs et relancez si nécessaire.');
    } else {
      console.log('\n🎉 Tous les workflows ont été analysés avec succès !');
      console.log('✅ Vous pouvez maintenant continuer avec le script principal si nécessaire.');
    }
    
  } catch (error) {
    console.error('❌ Erreur principale:', error);
    throw error;
  }
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  retryFailedWorkflows()
    .then(() => {
      console.log('\n🎯 Reprise terminée avec succès !');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Erreur fatale:', error.message);
      process.exit(1);
    });
}

export { retryFailedWorkflows, identifyFailedWorkflows }; 