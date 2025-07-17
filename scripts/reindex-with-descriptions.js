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

// Initialiser les services
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
 * Préparer les vecteurs pour Pinecone
 */
function prepareVectors(workflowData, embeddings) {
  return workflowData.map((workflow, index) => {
    // Utiliser le nom du fichier comme ID (sans .json)
    const id = workflow.filename.replace('.json', '');
    
    return {
      id: id,
      values: embeddings[index],
      metadata: {
        filename: workflow.filename,
        name: workflow.workflowName,
        description: workflow.description,
        nodeCount: workflow.metadata?.nodeCount || 0,
        nodeTypes: workflow.metadata?.nodeTypes || [],
        analysisDate: workflow.metadata?.analysisDate,
        model: workflow.metadata?.model || 'gpt-4o',
        // Ajouter les premiers mots de la description pour la recherche rapide
        descriptionSnippet: workflow.description?.substring(0, 500) || '',
        // Indexer aussi les types de nœuds pour la recherche
        nodesString: (workflow.metadata?.nodeTypes || []).join(', ')
      }
    };
  });
}

/**
 * Upserter les vecteurs dans Pinecone
 */
async function upsertVectors(index, vectors) {
  try {
    console.log(`📤 Upload de ${vectors.length} vecteurs vers Pinecone...`);
    
    // Upserter par batches
    for (let i = 0; i < vectors.length; i += UPSERT_BATCH_SIZE) {
      const batch = vectors.slice(i, i + UPSERT_BATCH_SIZE);
      
      await index.upsert(batch);
      
      console.log(`  ✅ Batch ${Math.floor(i / UPSERT_BATCH_SIZE) + 1}/${Math.ceil(vectors.length / UPSERT_BATCH_SIZE)} uploadé`);
      
      // Petite pause pour éviter le rate limiting
      if (i + UPSERT_BATCH_SIZE < vectors.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`🎉 ${vectors.length} vecteurs uploadés avec succès`);
    
  } catch (error) {
    console.error('❌ Erreur upload Pinecone:', error.message);
    throw error;
  }
}

/**
 * Script principal de réindexation
 */
async function main() {
  console.log('🚀 Réindexation Pinecone avec descriptions GPT-4');
  
  try {
    // Vérifier les variables d'environnement
    if (!process.env.PINECONE_API_KEY || !process.env.OPENAI_API_KEY) {
      throw new Error('Variables d\'environnement manquantes: PINECONE_API_KEY et/ou OPENAI_API_KEY');
    }
    
    // Trouver le fichier de descriptions le plus récent
    console.log(`📁 Lecture du dossier: ${DESCRIPTIONS_DIR}`);
    const files = await fs.readdir(DESCRIPTIONS_DIR);
    const descriptionFiles = files.filter(f => f.startsWith('workflow-descriptions-') && f.endsWith('.json'));
    
    if (descriptionFiles.length === 0) {
      throw new Error('Aucun fichier de descriptions trouvé. Exécutez d\'abord generate-workflow-descriptions.js');
    }
    
    // Prendre le plus récent
    const latestFile = descriptionFiles.sort().reverse()[0];
    const descriptionsPath = path.join(DESCRIPTIONS_DIR, latestFile);
    
    console.log(`📄 Utilisation du fichier: ${latestFile}`);
    
    // Charger les descriptions
    const descriptionsData = JSON.parse(await fs.readFile(descriptionsPath, 'utf-8'));
    const workflows = descriptionsData.workflows.filter(w => w.description); // Seuls les workflows avec descriptions
    
    console.log(`📊 ${workflows.length} workflows avec descriptions trouvés`);
    
    if (workflows.length === 0) {
      throw new Error('Aucun workflow avec description valide trouvé');
    }
    
    // Connecter à Pinecone
    const indexName = process.env.PINECONE_WORKFLOW_INDEX || 'n8n-workflows';
    console.log(`🔌 Connexion à l'index Pinecone: ${indexName}`);
    
    const index = pinecone.index(indexName);
    
    // Vérifier les stats de l'index actuel
    try {
      const stats = await index.describeIndexStats();
      console.log(`📊 Index actuel: ${stats.totalVectorCount} vecteurs`);
      
      // Optionnel: vider l'index avant réindexation
      console.log('🗑️  Note: Vous pouvez vider l\'index existant si nécessaire');
    } catch (error) {
      console.log('⚠️  Impossible de récupérer les stats de l\'index (normal si nouveau)');
    }
    
    // Traiter par batches pour les embeddings
    const allVectors = [];
    
    for (let i = 0; i < workflows.length; i += BATCH_SIZE) {
      const batch = workflows.slice(i, i + BATCH_SIZE);
      const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(workflows.length / BATCH_SIZE);
      
      console.log(`\n📦 Batch ${batchIndex}/${totalBatches} - ${batch.length} workflows`);
      
      // Extraire les descriptions pour les embeddings
      const descriptions = batch.map(w => {
        // Combiner le nom et la description pour un embedding plus riche
        return `${w.workflowName}\n\n${w.description}`;
      });
      
      // Générer les embeddings
      const embeddings = await generateEmbeddings(descriptions);
      
      // Préparer les vecteurs
      const vectors = prepareVectors(batch, embeddings);
      allVectors.push(...vectors);
      
      console.log(`✅ Batch ${batchIndex} traité`);
      
      // Pause entre les batches
      if (i + BATCH_SIZE < workflows.length) {
        console.log('⏱️  Pause 1s...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\n🎯 ${allVectors.length} vecteurs préparés, upload vers Pinecone...`);
    
    // Upserter tous les vecteurs
    await upsertVectors(index, allVectors);
    
    // Vérifier les nouvelles stats
    console.log('\n⏱️  Attente de la synchronisation Pinecone...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
      const newStats = await index.describeIndexStats();
      console.log(`📊 Nouvel index: ${newStats.totalVectorCount} vecteurs`);
    } catch (error) {
      console.log('⚠️  Impossible de vérifier les nouvelles stats');
    }
    
    // Sauvegarder un rapport de réindexation
    const reportPath = path.join(DESCRIPTIONS_DIR, `reindex-report-${new Date().toISOString().split('T')[0]}.json`);
    const report = {
      reindexDate: new Date().toISOString(),
      sourceFile: latestFile,
      totalWorkflows: workflows.length,
      successfulVectors: allVectors.length,
      indexName: indexName,
      model: 'text-embedding-3-small',
      batchSize: BATCH_SIZE,
      upsertBatchSize: UPSERT_BATCH_SIZE
    };
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n🎉 RÉINDEXATION TERMINÉE AVEC SUCCÈS !');
    console.log(`📊 ${allVectors.length} workflows indexés avec leurs descriptions GPT-4`);
    console.log(`📝 Rapport sauvegardé: ${reportPath}`);
    console.log('\n💡 Votre système RAG va maintenant être beaucoup plus précis !');
    
  } catch (error) {
    console.error('❌ Erreur principale:', error);
    process.exit(1);
  }
}

// Test de recherche après réindexation
async function testSearch(query = "workflow qui envoie des emails automatiquement") {
  try {
    console.log(`\n🔍 Test de recherche: "${query}"`);
    
    // Générer embedding pour la requête
    const queryEmbedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      encoding_format: 'float'
    });
    
    // Rechercher dans Pinecone
    const indexName = process.env.PINECONE_WORKFLOW_INDEX || 'n8n-workflows';
    const index = pinecone.index(indexName);
    
    const searchResults = await index.query({
      vector: queryEmbedding.data[0].embedding,
      topK: 5,
      includeMetadata: true
    });
    
    console.log(`📋 ${searchResults.matches?.length || 0} résultats trouvés:`);
    
    if (searchResults.matches) {
      searchResults.matches.forEach((match, i) => {
        console.log(`\n${i + 1}. ${match.metadata?.name} (score: ${match.score.toFixed(3)})`);
        console.log(`   📁 ${match.metadata?.filename}`);
        console.log(`   📝 ${match.metadata?.descriptionSnippet?.substring(0, 150)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur test recherche:', error.message);
  }
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(() => {
    // Test optionnel après réindexation
    if (process.argv.includes('--test')) {
      return testSearch();
    }
  });
}

export { main, testSearch }; 