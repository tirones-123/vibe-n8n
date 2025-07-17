#!/usr/bin/env node

/**
 * Script de test pour les gros workflows
 * Simule la génération et transmission de workflows volumineux
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

const CONFIG = {
  API_URL: process.env.API_URL || 'http://localhost:3000/api/claude',
  API_KEY: process.env.BACKEND_API_KEY || 'your-api-key',
  TIMEOUT: 900000 // 15 minutes
};

// Tests pour différentes tailles de workflows
const TEST_CASES = [
  {
    name: 'Small Workflow',
    prompt: 'Créer un simple webhook qui envoie un email',
    expectedSize: '<10KB'
  },
  {
    name: 'Medium Workflow',
    prompt: 'Créer un workflow complexe qui synchronise Slack avec Notion, traite les messages avec OpenAI, sauvegarde dans Airtable, et envoie des notifications Discord',
    expectedSize: '10-50KB'
  },
  {
    name: 'Large Workflow',
    prompt: 'Créer un système complet de gestion de leads : webhook → validation → enrichissement Clearbit → scoring IA → CRM → email automation → reporting → Slack notifications → backup S3 → monitoring → analytics',
    expectedSize: '>50KB'
  },
  {
    name: 'Huge Workflow',
    prompt: 'Créer une plateforme e-commerce complète : gestion commandes → inventaire → paiements → shipping → emails → analytics → reporting → BI → CRM → support → notifications → backups → monitoring → compliance → multi-tenant → API gateway → microservices orchestration',
    expectedSize: '>100KB'
  }
];

async function testWorkflowGeneration(testCase) {
  console.log(`\n🧪 === TEST: ${testCase.name} ===`);
  console.log(`📝 Prompt: ${testCase.prompt.substring(0, 100)}...`);
  console.log(`📏 Taille attendue: ${testCase.expectedSize}`);
  
  const startTime = Date.now();
  let chunks = [];
  let compressionUsed = false;
  let chunkingUsed = false;
  let errors = [];

  try {
    console.log('🚀 Envoi de la requête...');
    
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.API_KEY}`
      },
      body: JSON.stringify({
        prompt: testCase.prompt
      }),
      timeout: CONFIG.TIMEOUT
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('📡 Lecture du stream SSE...');
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let workflow = null;
    let explanation = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6));
            console.log(`📨 Event: ${event.type}`);
            
            switch (event.type) {
              case 'compression':
                compressionUsed = true;
                console.log(`🗜️ Compression activée pour ${event.data.nodesCount} nœuds`);
                break;
                
              case 'chunking_start':
                chunkingUsed = true;
                console.log(`📦 Chunking activé: ${event.data.totalChunks} parties`);
                break;
                
              case 'chunk':
                chunks.push({
                  index: event.data.index,
                  size: event.data.data.length
                });
                console.log(`📦 Chunk ${event.data.index + 1}/${event.data.total}: ${event.data.data.length} chars`);
                break;
                
              case 'compressed_complete':
                console.log(`✅ Workflow compressé reçu`);
                workflow = { compressed: true, size: event.data.data.length };
                break;
                
              case 'complete':
                console.log(`✅ Workflow direct reçu`);
                workflow = event.data.workflow;
                explanation = event.data.explanation;
                break;
                
              case 'error':
                errors.push(event.data.error);
                console.error(`❌ Erreur: ${event.data.error}`);
                break;
            }
          } catch (e) {
            console.warn(`⚠️ Parse error: ${e.message}`);
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    
    // Analyse des résultats
    let workflowSize = 0;
    if (workflow) {
      if (workflow.compressed) {
        workflowSize = workflow.size;
      } else {
        const jsonString = JSON.stringify(workflow);
        workflowSize = Buffer.byteLength(jsonString, 'utf8');
      }
    }

    console.log(`\n📊 === RÉSULTATS ${testCase.name} ===`);
    console.log(`⏱️ Durée: ${(duration / 1000).toFixed(1)}s`);
    console.log(`📏 Taille workflow: ${(workflowSize / 1024).toFixed(1)}KB`);
    console.log(`🗜️ Compression utilisée: ${compressionUsed ? '✅' : '❌'}`);
    console.log(`📦 Chunking utilisé: ${chunkingUsed ? '✅' : '❌'}`);
    console.log(`📦 Nombre de chunks: ${chunks.length}`);
    console.log(`❌ Erreurs: ${errors.length}`);
    
    if (workflow && !workflow.compressed) {
      console.log(`📊 Nœuds générés: ${workflow.nodes?.length || 0}`);
      console.log(`🔗 Connexions: ${Object.keys(workflow.connections || {}).length}`);
    }

    // Sauvegarder pour analyse
    const result = {
      testCase: testCase.name,
      duration,
      workflowSize,
      compressionUsed,
      chunkingUsed,
      chunksCount: chunks.length,
      chunks,
      errorsCount: errors.length,
      errors,
      workflow: workflow && !workflow.compressed ? workflow : null,
      explanation,
      timestamp: new Date().toISOString()
    };

    await fs.writeFile(
      path.join(process.cwd(), 'debug', `test-${testCase.name.toLowerCase().replace(/\s+/g, '-')}.json`),
      JSON.stringify(result, null, 2)
    );

    return result;

  } catch (error) {
    console.error(`❌ Erreur test ${testCase.name}:`, error.message);
    return {
      testCase: testCase.name,
      error: error.message,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }
}

async function runAllTests() {
  console.log('🧪 === TESTS DE GROS WORKFLOWS ===');
  console.log(`🌐 API URL: ${CONFIG.API_URL}`);
  console.log(`⏰ Timeout: ${CONFIG.TIMEOUT}ms`);
  
  const results = [];
  
  // Créer le dossier debug si nécessaire
  try {
    await fs.mkdir(path.join(process.cwd(), 'debug'), { recursive: true });
  } catch (e) {}

  for (const testCase of TEST_CASES) {
    const result = await testWorkflowGeneration(testCase);
    results.push(result);
    
    // Pause entre les tests
    console.log('⏳ Pause de 5 secondes...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Résumé final
  console.log('\n📊 === RÉSUMÉ FINAL ===');
  const summary = {
    totalTests: results.length,
    successful: results.filter(r => !r.error).length,
    failed: results.filter(r => r.error).length,
    compressionUsed: results.filter(r => r.compressionUsed).length,
    chunkingUsed: results.filter(r => r.chunkingUsed).length,
    averageDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
    totalErrors: results.reduce((sum, r) => sum + (r.errorsCount || 0), 0),
    results
  };

  console.log(`✅ Tests réussis: ${summary.successful}/${summary.totalTests}`);
  console.log(`🗜️ Compression utilisée: ${summary.compressionUsed} fois`);
  console.log(`📦 Chunking utilisé: ${summary.chunkingUsed} fois`);
  console.log(`⏱️ Durée moyenne: ${(summary.averageDuration / 1000).toFixed(1)}s`);
  console.log(`❌ Total erreurs: ${summary.totalErrors}`);

  // Sauvegarder le résumé
  await fs.writeFile(
    path.join(process.cwd(), 'debug', 'test-summary.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log('\n💾 Résultats sauvegardés dans debug/');
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
} 