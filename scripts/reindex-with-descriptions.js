import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Configuration
const DESCRIPTIONS_DIR = path.join(process.cwd(), 'workflow-descriptions');
const BATCH_SIZE = 100; // Embeddings par batch
const UPSERT_BATCH_SIZE = 50; // Vecteurs à upserter en une fois

// Configuration des index
const ORIGINAL_INDEX = process.env.PINECONE_WORKFLOW_INDEX || 'n8n-workflows';
const NEW_INDEX_NAME = `${ORIGINAL_INDEX}-descriptions`;

console.log(`📊 Index original: ${ORIGINAL_INDEX}`);
console.log(`🆕 Nouvel index: ${NEW_INDEX_NAME}`);

// Initialiser les services
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Créer un nouvel index Pinecone
 */
async function createNewIndex() {
  try {
    console.log(`🏗️ Création du nouvel index: ${NEW_INDEX_NAME}...`);
    
    // Vérifier si l'index existe déjà
    const indexList = await pinecone.listIndexes();
    const existingIndex = indexList.indexes?.find(idx => idx.name === NEW_INDEX_NAME);
    
    if (existingIndex) {
      console.log(`✅ L'index ${NEW_INDEX_NAME} existe déjà`);
      return pinecone.index(NEW_INDEX_NAME);
    }
    
    // Créer le nouvel index
    await pinecone.createIndex({
      name: NEW_INDEX_NAME,
      dimension: 1536, // text-embedding-3-small
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });
    
    console.log(`🎉 Index ${NEW_INDEX_NAME} créé avec succès !`);
    console.log(`⏳ Attente de l'initialisation (30 secondes)...`);
    
    // Attendre que l'index soit prêt
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    return pinecone.index(NEW_INDEX_NAME);
  } catch (error) {
    console.error(`❌ Erreur création index ${NEW_INDEX_NAME}:`, error.message);
    throw error;
  }
}

/**
 * Générer des embeddings pour un batch de descriptions
 */
async function generateEmbeddings(descriptions) {
  try {
    console.log(`🧠 Génération embeddings pour ${descriptions.length} descriptions...`);
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: descriptions,
      encoding_format: 'float'
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('❌ Erreur génération embeddings:', error.message);
    throw error;
  }
}

/**
 * Préparer les vecteurs pour Pinecone à partir des descriptions GPT-4
 */
function prepareVectors(workflowData, embeddings) {
  return workflowData.map((workflow, index) => {
    // Utiliser le nom du fichier comme ID (sans .json)
    const id = workflow.filename.replace('.json', '');
    
    // Créer un snippet de la description pour les métadonnées
    const descriptionSnippet = workflow.description.length > 200 
      ? workflow.description.substring(0, 200) + '...'
      : workflow.description;
    
    return {
      id,
      values: embeddings[index],
      metadata: {
        filename: workflow.filename,
        name: workflow.workflowName,
        description: workflow.description, // Description complète GPT-4
        descriptionSnippet, // Extrait pour l'affichage
        nodeCount: workflow.metadata?.nodeCount || 0,
        nodeTypes: workflow.metadata?.nodeTypes || [],
        analysisDate: workflow.metadata?.analysisDate,
        model: workflow.metadata?.model || 'gpt-4'
      }
    };
  });
}

/**
 * Upserter des vecteurs vers Pinecone par batches
 */
async function upsertVectors(index, vectors) {
  console.log(`📤 Upload de ${vectors.length} vecteurs vers ${NEW_INDEX_NAME}...`);
  
  // Traiter par batches
  for (let i = 0; i < vectors.length; i += UPSERT_BATCH_SIZE) {
    const batch = vectors.slice(i, i + UPSERT_BATCH_SIZE);
    const batchNum = Math.floor(i / UPSERT_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(vectors.length / UPSERT_BATCH_SIZE);
    
    console.log(`📦 Batch ${batchNum}/${totalBatches}: ${batch.length} vecteurs`);
    
    try {
      await index.upsert(batch);
      console.log(`✅ Batch ${batchNum} uploadé`);
      
      // Délai entre batches pour éviter rate limiting
      if (i + UPSERT_BATCH_SIZE < vectors.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ Erreur batch ${batchNum}:`, error.message);
      throw error;
    }
  }
}

/**
 * Trouver le fichier de descriptions le plus récent
 */
async function findLatestDescriptionsFile() {
  try {
    const files = await fs.readdir(DESCRIPTIONS_DIR);
    const descriptionFiles = files
      .filter(file => file.startsWith('workflow-descriptions-') && file.endsWith('.json'))
      .sort()
      .reverse(); // Plus récent en premier
    
    if (descriptionFiles.length === 0) {
      throw new Error('Aucun fichier de descriptions trouvé');
    }
    
    const latestFile = descriptionFiles[0];
    const filePath = path.join(DESCRIPTIONS_DIR, latestFile);
    
    console.log(`📄 Fichier de descriptions le plus récent: ${latestFile}`);
    return filePath;
  } catch (error) {
    console.error('❌ Erreur recherche fichier descriptions:', error.message);
    throw error;
  }
}

/**
 * Tester les recherches sur le nouvel index
 */
async function testNewIndex(index) {
  console.log('\n🧪 Tests de recherche sur le nouvel index...');
  
  const testQueries = [
    'automatisation email',
    'slack workflow', 
    'traitement de données CSV',
    'bot telegram',
    'synchronisation notion'
  ];
  
  for (const query of testQueries) {
    try {
      console.log(`\n🔍 Test: "${query}"`);
      
      // Générer embedding pour la requête
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
        encoding_format: 'float'
      });
      
      // Rechercher dans l'index
      const searchResults = await index.query({
        vector: embeddingResponse.data[0].embedding,
        topK: 3,
        includeMetadata: true
      });
      
      console.log(`  📊 ${searchResults.matches?.length || 0} résultats:`);
      searchResults.matches?.forEach((match, i) => {
        console.log(`    ${i + 1}. ${match.metadata?.name} (score: ${match.score?.toFixed(3)})`);
        console.log(`       📝 ${match.metadata?.descriptionSnippet}`);
      });
      
    } catch (error) {
      console.error(`❌ Erreur test "${query}":`, error.message);
    }
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 Démarrage de la réindexation avec descriptions GPT-4...\n');
  
  const startTime = Date.now();
  let totalProcessed = 0;
  let errors = [];

  try {
    // 1. Trouver et charger le fichier de descriptions
    console.log('📂 Chargement des descriptions...');
    const descriptionsFile = await findLatestDescriptionsFile();
    const descriptionsData = JSON.parse(await fs.readFile(descriptionsFile, 'utf-8'));
    
         console.log(`📊 Données chargées:`);
     console.log(`  📅 Date de génération: ${descriptionsData.generationDate}`);
     console.log(`  📈 Total workflows analysés: ${descriptionsData.totalWorkflows}`);
     console.log(`  ✅ Succès attendus: ${descriptionsData.successful}`);
     console.log(`  ❌ Échecs attendus: ${descriptionsData.failed}`);
     console.log(`  🤖 Modèle: ${descriptionsData.model}`);
     console.log(`  📄 Workflows dans le fichier: ${descriptionsData.workflows.length}`);
    
    // Filtrer les workflows avec descriptions valides uniquement
    console.log(`\n🔍 Filtrage des workflows avec descriptions valides...`);
    const workflowsWithDescriptions = descriptionsData.workflows.filter(workflow => {
      const hasValidDescription = workflow.description && 
                                typeof workflow.description === 'string' && 
                                workflow.description.trim().length > 0 &&
                                !workflow.description.includes('Connection error') &&
                                !workflow.description.includes('Failed to analyze');
      
      if (!hasValidDescription) {
        console.log(`⚠️  Skipping workflow "${workflow.filename}" - Invalid description:`, 
                   workflow.description ? workflow.description.substring(0, 100) + '...' : 'null/undefined');
      }
      
      return hasValidDescription;
    });
    
    console.log(`\n📋 ${workflowsWithDescriptions.length} workflows avec descriptions valides (${descriptionsData.workflows.length - workflowsWithDescriptions.length} exclus)`);
    
    // 2. Créer le nouvel index
    console.log('\n🏗️ Création du nouvel index...');
    const newIndex = await createNewIndex();
    
    // 3. Traiter par batches
    console.log('\n🔄 Début de la réindexation...');
    
    for (let i = 0; i < workflowsWithDescriptions.length; i += BATCH_SIZE) {
      const batch = workflowsWithDescriptions.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(workflowsWithDescriptions.length / BATCH_SIZE);
      
      console.log(`\n📦 Traitement batch ${batchNum}/${totalBatches} (${batch.length} workflows)`);
      
            try {
        // Préparer les descriptions pour embedding (batch est déjà filtré)
        const descriptions = batch.map(workflow => {
          // Combiner le nom et la description pour un embedding plus riche
          return `Workflow: ${workflow.workflowName}\n\nDescription: ${workflow.description}`;
        });
        
        // Générer les embeddings
        const embeddings = await generateEmbeddings(descriptions);
        
        // Préparer les vecteurs
        const vectors = prepareVectors(batch, embeddings);
        
        // Upserter vers Pinecone
        await upsertVectors(newIndex, vectors);
        
        totalProcessed += batch.length;
        console.log(`✅ Batch ${batchNum} terminé. Total traité: ${totalProcessed}/${workflowsWithDescriptions.length}`);
        
      } catch (error) {
        console.error(`❌ Erreur batch ${batchNum}:`, error.message);
        errors.push({
          batch: batchNum,
          error: error.message,
          workflows: batch.map(w => w.filename)
        });
      }
    }
    
    // 4. Vérifier les statistiques de l'index
    console.log('\n📊 Vérification de l\'index...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Attendre propagation
    
    const indexStats = await newIndex.describeIndexStats();
    console.log(`📈 Statistiques du nouvel index ${NEW_INDEX_NAME}:`);
    console.log(`  📊 Total vectors: ${indexStats.totalVectorCount}`);
    console.log(`  📏 Dimension: ${indexStats.dimension}`);
    
    // 5. Tests de recherche
    if (process.argv.includes('--test')) {
      await testNewIndex(newIndex);
    }
    
    // 6. Sauvegarder le rapport
    const report = {
      timestamp: new Date().toISOString(),
      originalIndex: ORIGINAL_INDEX,
      newIndex: NEW_INDEX_NAME,
      sourceFile: path.basename(descriptionsFile),
      totalWorkflows: workflowsWithDescriptions.length,
      processed: totalProcessed,
      errors: errors.length,
      indexStats,
      errors: errors
    };
    
    const reportPath = path.join(DESCRIPTIONS_DIR, `reindex-report-${new Date().toISOString().split('T')[0]}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // 7. Résultats finaux
    const duration = Math.round((Date.now() - startTime) / 1000);
    
         console.log('\n🎉 RÉINDEXATION TERMINÉE !');
     console.log(`⏱️  Durée: ${duration} secondes`);
     console.log(`📊 Workflows avec descriptions valides: ${workflowsWithDescriptions.length}`);
     console.log(`✅ Workflows indexés avec succès: ${totalProcessed}`);
     console.log(`❌ Batches avec erreurs: ${errors.length}`);
     console.log(`🆕 Nouvel index: ${NEW_INDEX_NAME}`);
     console.log(`📄 Rapport: ${reportPath}`);
    
    console.log('\n📋 PROCHAINES ÉTAPES:');
    console.log(`1. Mettre à jour votre .env:`);
    console.log(`   PINECONE_WORKFLOW_INDEX=${NEW_INDEX_NAME}`);
    console.log(`2. Redémarrer votre backend pour utiliser le nouvel index`);
    console.log(`3. Tester les recherches avec le nouvel index`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Erreurs rencontrées (voir ${reportPath}):`);
      errors.forEach(error => {
        console.log(`  - Batch ${error.batch}: ${error.error}`);
      });
    }

  } catch (error) {
    console.error('\n❌ ERREUR FATALE:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Mode test uniquement
if (process.argv.includes('--test-only')) {
  console.log('🧪 Mode test uniquement...');
  const index = pinecone.index(NEW_INDEX_NAME);
  await testNewIndex(index);
} else {
  // Exécution normale
  main().catch(console.error);
} 