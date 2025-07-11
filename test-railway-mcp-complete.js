#!/usr/bin/env node

/**
 * Test complet du backend Railway avec MCP
 * Vérifie : API Claude, MCP tools, génération workflow n8n
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Configuration
const RAILWAY_URL = 'https://vibe-n8n-production.up.railway.app';
const API_KEY = 'd5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2';

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`${title}`, 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logStep(step, message) {
  log(`[${step}] ${message}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Fonction pour envoyer une requête à l'API
async function sendRequest(prompt, context = {}, tools = [], mode = 'create') {
  const response = await fetch(`${RAILWAY_URL}/api/claude`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      context,
      tools,
      mode
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response;
}

// Fonction pour parser le stream SSE
async function parseSSEStream(response) {
  const results = {
    assistantTexts: [],
    toolUses: [],
    toolResults: [],
    toolErrors: [],
    finalContent: null,
    rawEvents: []
  };

  let buffer = '';
  
  return new Promise((resolve, reject) => {
    response.body.on('data', (chunk) => {
      buffer += chunk.toString();
      
      // Traiter les événements SSE
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Garder la dernière ligne partielle
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            results.rawEvents.push(data);
            
            switch (data.type) {
              case 'assistant_text':
                results.assistantTexts.push(data.text);
                break;
              case 'tool_use':
                results.toolUses.push({
                  name: data.name,
                  id: data.id,
                  input: data.input
                });
                break;
              case 'tool_result':
                results.toolResults.push({
                  id: data.id,
                  result: data.result
                });
                break;
              case 'tool_error':
                results.toolErrors.push({
                  id: data.id,
                  error: data.error
                });
                break;
              case 'final':
                results.finalContent = data.content;
                break;
            }
          } catch (err) {
            logWarning(`Erreur parsing SSE: ${err.message}`);
          }
        }
      }
    });
    
    response.body.on('end', () => {
      resolve(results);
    });
    
    response.body.on('error', (err) => {
      reject(err);
    });
  });
}

// Test 1: Vérifier le statut de l'API
async function testAPIStatus() {
  logSection('TEST 1: Statut de l\'API');
  
  try {
    logStep('1.1', 'Vérification du endpoint de statut...');
    const response = await fetch(`${RAILWAY_URL}/api`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    logSuccess('API accessible');
    
    // Vérifier la configuration
    logStep('1.2', 'Vérification de la configuration...');
    log(JSON.stringify(data, null, 2), 'white');
    
    if (data.environment?.claude_configured) {
      logSuccess('Claude API configurée');
    } else {
      logError('Claude API non configurée');
    }
    
    if (data.environment?.backend_auth_configured) {
      logSuccess('Authentification backend configurée');
    } else {
      logError('Authentification backend non configurée');
    }
    
    return data;
    
  } catch (error) {
    logError(`Erreur lors du test de statut: ${error.message}`);
    throw error;
  }
}

// Test 2: Test simple sans MCP tools
async function testSimpleRequest() {
  logSection('TEST 2: Requête simple (sans MCP tools)');
  
  try {
    logStep('2.1', 'Envoi d\'une requête simple...');
    const prompt = "Dis-moi bonjour et explique brièvement ce que tu peux faire avec n8n.";
    
    const response = await sendRequest(prompt);
    const results = await parseSSEStream(response);
    
    logStep('2.2', 'Analyse des résultats...');
    log(`Textes assistant: ${results.assistantTexts.length}`, 'white');
    log(`Tool uses: ${results.toolUses.length}`, 'white');
    log(`Tool results: ${results.toolResults.length}`, 'white');
    log(`Tool errors: ${results.toolErrors.length}`, 'white');
    
    if (results.assistantTexts.length > 0) {
      logSuccess('Réponse reçue de Claude');
      log('Réponse:', 'white');
      log(results.assistantTexts.join('\n'), 'white');
    } else {
      logError('Aucune réponse de Claude');
    }
    
    return results;
    
  } catch (error) {
    logError(`Erreur lors du test simple: ${error.message}`);
    throw error;
  }
}

// Test 3: Test avec MCP tools
async function testMCPTools() {
  logSection('TEST 3: Test avec MCP tools');
  
  try {
    logStep('3.1', 'Envoi d\'une requête qui devrait déclencher des MCP tools...');
    const prompt = `Crée un workflow n8n simple qui :
1. Se déclenche avec un webhook
2. Envoie les données reçues vers Slack dans le channel #general
3. Sauvegarde aussi les données dans un fichier Google Drive

Utilise les outils MCP pour rechercher les bons nodes et créer le workflow complet.`;
    
    const response = await sendRequest(prompt);
    const results = await parseSSEStream(response);
    
    logStep('3.2', 'Analyse des appels MCP...');
    log(`Textes assistant: ${results.assistantTexts.length}`, 'white');
    log(`Tool uses: ${results.toolUses.length}`, 'white');
    log(`Tool results: ${results.toolResults.length}`, 'white');
    log(`Tool errors: ${results.toolErrors.length}`, 'white');
    
    // Détails des tool uses
    if (results.toolUses.length > 0) {
      logSuccess(`${results.toolUses.length} appels MCP tools détectés`);
      results.toolUses.forEach((toolUse, index) => {
        log(`\n--- Tool Use ${index + 1} ---`, 'yellow');
        log(`Nom: ${toolUse.name}`, 'white');
        log(`ID: ${toolUse.id}`, 'white');
        log(`Input: ${JSON.stringify(toolUse.input, null, 2)}`, 'white');
      });
    } else {
      logError('Aucun appel MCP tool détecté');
    }
    
    // Détails des tool results
    if (results.toolResults.length > 0) {
      logSuccess(`${results.toolResults.length} résultats MCP reçus`);
      results.toolResults.forEach((toolResult, index) => {
        log(`\n--- Tool Result ${index + 1} ---`, 'yellow');
        log(`ID: ${toolResult.id}`, 'white');
        log(`Result: ${JSON.stringify(toolResult.result, null, 2).substring(0, 500)}...`, 'white');
      });
    } else {
      logError('Aucun résultat MCP reçu');
    }
    
    // Erreurs MCP
    if (results.toolErrors.length > 0) {
      logError(`${results.toolErrors.length} erreurs MCP détectées`);
      results.toolErrors.forEach((toolError, index) => {
        log(`\n--- Tool Error ${index + 1} ---`, 'red');
        log(`ID: ${toolError.id}`, 'white');
        log(`Error: ${toolError.error}`, 'red');
      });
    }
    
    // Réponse finale
    if (results.assistantTexts.length > 0) {
      logSuccess('Réponse finale de Claude');
      log('Réponse complète:', 'white');
      log(results.assistantTexts.join('\n'), 'white');
    }
    
    return results;
    
  } catch (error) {
    logError(`Erreur lors du test MCP: ${error.message}`);
    throw error;
  }
}

// Test 4: Test workflow complet
async function testWorkflowGeneration() {
  logSection('TEST 4: Génération de workflow n8n complet');
  
  try {
    logStep('4.1', 'Demande de génération d\'un workflow complet...');
    const prompt = `Crée un workflow n8n complet pour automatiser cette tâche :

OBJECTIF: Monitoring automatique des mentions de ma marque sur Twitter

WORKFLOW SOUHAITÉ:
1. Trigger: Vérifier toutes les heures s'il y a de nouvelles mentions
2. Recherche: Chercher les tweets mentionnant "MonEntreprise" ou "@MonCompte"
3. Filtrage: Ignorer les retweets et ne garder que les tweets originaux
4. Analyse: Analyser le sentiment (positif/négatif) avec l'IA
5. Notification: Envoyer un résumé par email si des mentions importantes sont trouvées
6. Sauvegarde: Stocker toutes les mentions dans une base de données

Utilise les outils MCP pour :
- Rechercher les bons nodes Twitter/X
- Trouver les nodes d'analyse de sentiment
- Configurer les nodes email et base de données
- Valider le workflow final

Génère le JSON n8n complet et fonctionnel.`;
    
    const response = await sendRequest(prompt);
    const results = await parseSSEStream(response);
    
    logStep('4.2', 'Analyse des résultats...');
    log(`Total d'événements SSE: ${results.rawEvents.length}`, 'white');
    log(`Tool uses: ${results.toolUses.length}`, 'white');
    log(`Tool results: ${results.toolResults.length}`, 'white');
    
    // Sauvegarder tous les événements
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const eventsFile = `test-railway-events-${timestamp}.json`;
    fs.writeFileSync(eventsFile, JSON.stringify(results.rawEvents, null, 2));
    logSuccess(`Événements sauvegardés dans ${eventsFile}`);
    
    // Chercher le JSON n8n dans les réponses
    logStep('4.3', 'Recherche du JSON n8n généré...');
    const fullResponse = results.assistantTexts.join('\n');
    
    // Patterns pour détecter le JSON n8n
    const jsonPatterns = [
      /```json\s*(\{[\s\S]*?\})\s*```/g,
      /```\s*(\{[\s\S]*?"nodes"[\s\S]*?\})\s*```/g,
      /(\{[\s\S]*?"nodes"[\s\S]*?"connections"[\s\S]*?\})/g
    ];
    
    let workflowJSON = null;
    
    for (const pattern of jsonPatterns) {
      const matches = fullResponse.matchAll(pattern);
      for (const match of matches) {
        try {
          const jsonStr = match[1];
          const parsed = JSON.parse(jsonStr);
          if (parsed.nodes && parsed.connections) {
            workflowJSON = parsed;
            logSuccess('JSON n8n trouvé et validé');
            break;
          }
        } catch (err) {
          // Continuer la recherche
        }
      }
      if (workflowJSON) break;
    }
    
    if (workflowJSON) {
      // Sauvegarder le workflow
      const workflowFile = `workflow-generated-${timestamp}.json`;
      fs.writeFileSync(workflowFile, JSON.stringify(workflowJSON, null, 2));
      logSuccess(`Workflow n8n sauvegardé dans ${workflowFile}`);
      
      // Analyser le workflow
      logStep('4.4', 'Analyse du workflow généré...');
      log(`Nombre de nodes: ${workflowJSON.nodes?.length || 0}`, 'white');
      log(`Nombre de connections: ${Object.keys(workflowJSON.connections || {}).length}`, 'white');
      
      if (workflowJSON.nodes) {
        log('\nNodes du workflow:', 'yellow');
        workflowJSON.nodes.forEach((node, index) => {
          log(`  ${index + 1}. ${node.name} (${node.type})`, 'white');
        });
      }
      
      // Vérifier la structure
      const hasValidStructure = workflowJSON.nodes && 
                               Array.isArray(workflowJSON.nodes) && 
                               workflowJSON.connections &&
                               typeof workflowJSON.connections === 'object';
      
      if (hasValidStructure) {
        logSuccess('Structure du workflow valide');
      } else {
        logError('Structure du workflow invalide');
      }
      
    } else {
      logError('Aucun JSON n8n valide trouvé dans la réponse');
      
      // Sauvegarder la réponse complète pour debug
      const responseFile = `response-debug-${timestamp}.txt`;
      fs.writeFileSync(responseFile, fullResponse);
      logWarning(`Réponse complète sauvegardée dans ${responseFile} pour debug`);
    }
    
    return {
      ...results,
      workflowJSON,
      fullResponse
    };
    
  } catch (error) {
    logError(`Erreur lors de la génération de workflow: ${error.message}`);
    throw error;
  }
}

// Fonction principale
async function runCompleteTest() {
  logSection('TEST COMPLET RAILWAY MCP');
  log(`URL: ${RAILWAY_URL}`, 'white');
  log(`Timestamp: ${new Date().toISOString()}`, 'white');
  
  const results = {};
  
  try {
    // Test 1: Statut API
    results.status = await testAPIStatus();
    
    // Test 2: Requête simple
    results.simple = await testSimpleRequest();
    
    // Test 3: MCP Tools
    results.mcp = await testMCPTools();
    
    // Test 4: Workflow complet
    results.workflow = await testWorkflowGeneration();
    
    logSection('RÉSUMÉ DES TESTS');
    
    // Résumé global
    logSuccess('✅ Tous les tests terminés avec succès');
    
    log('\n📊 STATISTIQUES:', 'cyan');
    log(`- API accessible: ${results.status ? '✅' : '❌'}`, 'white');
    log(`- Réponse simple: ${results.simple?.assistantTexts?.length > 0 ? '✅' : '❌'}`, 'white');
    log(`- Appels MCP: ${results.mcp?.toolUses?.length || 0}`, 'white');
    log(`- Résultats MCP: ${results.mcp?.toolResults?.length || 0}`, 'white');
    log(`- Erreurs MCP: ${results.mcp?.toolErrors?.length || 0}`, 'white');
    log(`- Workflow généré: ${results.workflow?.workflowJSON ? '✅' : '❌'}`, 'white');
    
    if (results.workflow?.workflowJSON) {
      log('\n🎯 WORKFLOW FINAL:', 'cyan');
      log(`- Nodes: ${results.workflow.workflowJSON.nodes?.length || 0}`, 'white');
      log(`- Connections: ${Object.keys(results.workflow.workflowJSON.connections || {}).length}`, 'white');
      log(`- Structure valide: ✅`, 'white');
    }
    
  } catch (error) {
    logError(`Test échoué: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Exécuter le test
if (import.meta.url === `file://${process.argv[1]}`) {
  runCompleteTest();
}

export { runCompleteTest }; 