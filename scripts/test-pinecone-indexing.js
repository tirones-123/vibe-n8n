import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

// Configuration
const TEST_PROMPT = "Je veux un workflow n8n qui reçoit un sujet via un webhook, utilise l'API de Perplexity pour chercher des infos, résume les résultats avec GPT-4, puis génère un article SEO complet et me l'envoie par email dans un Google Doc.";

async function diagnosticPineconeIndexing() {
  console.log('🔍 === DIAGNOSTIC INDEXATION PINECONE ===');
  console.log(`📝 Test prompt: "${TEST_PROMPT}"`);
  console.log(`📊 Index utilisé: ${process.env.PINECONE_WORKFLOW_INDEX}`);
  console.log('');

  // Initialiser les services
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
  });

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const index = pinecone.index(process.env.PINECONE_WORKFLOW_INDEX);

  try {
    // 1. Vérifier les stats de l'index
    console.log('📊 === STATS INDEX PINECONE ===');
    const stats = await index.describeIndexStats();
    console.log(`📈 Total vecteurs: ${stats.totalVectorCount}`);
    console.log(`🗃️ Namespaces: ${Object.keys(stats.namespaces || {}).length}`);
    console.log('');

    // 2. Générer l'embedding du prompt test
    console.log('🧠 === GÉNÉRATION EMBEDDING ===');
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: TEST_PROMPT,
      encoding_format: 'float'
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    console.log(`✅ Embedding généré: ${queryEmbedding.length} dimensions`);
    console.log('');

    // 3. Rechercher dans Pinecone avec plus de détails
    console.log('🔍 === RECHERCHE PINECONE DÉTAILLÉE ===');
    const searchResults = await index.query({
      vector: queryEmbedding,
      topK: 10, // Plus de résultats pour analyse
      includeMetadata: true
    });

    console.log(`📊 Trouvé ${searchResults.matches?.length || 0} résultats:`);
    console.log('');

    // 4. Analyser chaque résultat
    if (searchResults.matches) {
      for (let i = 0; i < searchResults.matches.length; i++) {
        const match = searchResults.matches[i];
        
        console.log(`🎯 === RÉSULTAT ${i + 1} ===`);
        console.log(`📄 ID: ${match.id}`);
        console.log(`📊 Score: ${match.score.toFixed(4)}`);
        console.log(`📁 Filename: ${match.metadata?.filename || 'N/A'}`);
        console.log(`🏷️ Name: ${match.metadata?.name || 'N/A'}`);
        console.log(`🔢 Node count: ${match.metadata?.nodeCount || 0}`);
        console.log(`🔧 Node types: ${(match.metadata?.nodeTypes || []).slice(0, 3).join(', ')}`);
        
        // Afficher la description (ce qui est indexé)
        if (match.metadata?.description) {
          const desc = match.metadata.description;
          console.log(`📝 Description indexée (${desc.length} chars):`);
          console.log(`   "${desc.substring(0, 300)}${desc.length > 300 ? '...' : ''}"`);
        }
        
        if (match.metadata?.descriptionSnippet) {
          console.log(`💡 Snippet: "${match.metadata.descriptionSnippet}"`);
        }
        
        console.log('');
      }
    }

    // 5. Analyser le workflow problématique spécifiquement
    console.log('🚨 === ANALYSE WORKFLOW PROBLÉMATIQUE ===');
    const problematicWorkflow = searchResults.matches?.find(m => 
      m.metadata?.name?.includes('Auto-Post') && m.metadata?.name?.includes('vide')
    );
    
    if (problematicWorkflow) {
      console.log(`❗ Workflow problématique trouvé avec score: ${problematicWorkflow.score.toFixed(4)}`);
      console.log(`📝 Description complète:`);
      console.log(problematicWorkflow.metadata.description);
      console.log('');
      
      // Analyser pourquoi il a matché
      console.log('🔍 === ANALYSE DE CORRESPONDANCE ===');
      const description = problematicWorkflow.metadata.description.toLowerCase();
      const prompt = TEST_PROMPT.toLowerCase();
      
      const commonWords = ['google', 'api', 'workflow', 'automation', 'content', 'data', 'request'];
      const matches = commonWords.filter(word => 
        description.includes(word) && prompt.includes(word)
      );
      
      console.log(`🎯 Mots-clés communs: ${matches.join(', ')}`);
      
      if (description.includes('google')) console.log(`   📊 "Google" trouvé dans description`);
      if (description.includes('api')) console.log(`   📊 "API" trouvé dans description`);
      if (description.includes('content')) console.log(`   📊 "Content" trouvé dans description`);
      
    } else {
      console.log('✅ Workflow problématique non trouvé dans le top 10');
    }

    // 6. Recommandations
    console.log('💡 === RECOMMANDATIONS ===');
    console.log('1. Les descriptions GPT-4 sont bien indexées (pas les JSON bruts)');
    console.log('2. Le problème vient de descriptions trop généralistes');
    console.log('3. Solutions possibles :');
    console.log('   - Améliorer les descriptions GPT-4 pour être plus spécifiques');
    console.log('   - Ajouter des mots-clés négatifs dans la recherche');
    console.log('   - Filtrer les workflows "vides" ou incomplètes');
    console.log('   - Augmenter le seuil de score minimum');

    // 7. Sauvegarder les résultats
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(process.cwd(), 'debug', `pinecone-diagnostic-${timestamp}.json`);
    
    const diagnosticData = {
      prompt: TEST_PROMPT,
      indexStats: stats,
      searchResults: searchResults.matches?.map(m => ({
        id: m.id,
        score: m.score,
        metadata: m.metadata
      })),
      problematicWorkflow: problematicWorkflow ? {
        id: problematicWorkflow.id,
        score: problematicWorkflow.score,
        name: problematicWorkflow.metadata?.name,
        description: problematicWorkflow.metadata?.description
      } : null
    };
    
    await fs.writeFile(outputFile, JSON.stringify(diagnosticData, null, 2));
    console.log(`💾 Diagnostic complet sauvegardé: ${outputFile}`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
}

// Exécuter le diagnostic
diagnosticPineconeIndexing().catch(console.error); 