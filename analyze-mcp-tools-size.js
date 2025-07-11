#!/usr/bin/env node

/**
 * Analyse la taille des outils MCP et propose des optimisations
 */

import { listTools } from './utils/mcpClient.js';

async function analyzeMCPToolsSize() {
  console.log('🔍 Analyse de la taille des outils MCP...\n');
  
  try {
    // Récupérer tous les outils MCP
    const result = await listTools();
    const tools = result?.tools || [];
    
    console.log(`📊 Nombre total d'outils MCP: ${tools.length}`);
    
    // Analyser chaque outil
    let totalSize = 0;
    const toolSizes = [];
    
    for (const tool of tools) {
      const toolData = {
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      };
      
      const toolJson = JSON.stringify(toolData);
      const toolSize = Buffer.byteLength(toolJson, 'utf8');
      totalSize += toolSize;
      
      toolSizes.push({
        name: tool.name,
        size: toolSize,
        sizeKB: (toolSize / 1024).toFixed(2),
        description: tool.description?.substring(0, 100) + '...'
      });
    }
    
    // Trier par taille décroissante
    toolSizes.sort((a, b) => b.size - a.size);
    
    console.log(`\n📏 Taille totale des outils MCP: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`📏 Taille moyenne par outil: ${(totalSize / tools.length / 1024).toFixed(2)} KB`);
    
    // Estimer les tokens (approximation: 1 token ≈ 4 caractères)
    const estimatedTokens = Math.ceil(totalSize / 4);
    console.log(`🎯 Tokens estimés: ~${estimatedTokens.toLocaleString()}`);
    
    console.log('\n🔝 Top 10 des outils les plus volumineux:');
    console.log('─'.repeat(80));
    toolSizes.slice(0, 10).forEach((tool, index) => {
      console.log(`${index + 1}. ${tool.name.padEnd(30)} ${tool.sizeKB.padStart(8)} KB`);
      console.log(`   ${tool.description}`);
    });
    
    console.log('\n💡 Analyse des problèmes:');
    
    // Problème 1: Tous les outils injectés
    console.log('❌ PROBLÈME 1: Tous les outils sont injectés dans chaque requête');
    console.log(`   - ${tools.length} outils × ${(totalSize / tools.length / 1024).toFixed(2)} KB = ${(totalSize / 1024).toFixed(2)} KB par requête`);
    console.log(`   - Cela consomme ~${estimatedTokens.toLocaleString()} tokens avant même le prompt utilisateur`);
    
    // Problème 2: Schémas détaillés
    console.log('\n❌ PROBLÈME 2: Schémas input_schema très détaillés');
    const bigSchemas = toolSizes.filter(t => t.size > 2048); // > 2KB
    console.log(`   - ${bigSchemas.length} outils ont des schémas > 2KB`);
    console.log(`   - Les plus gros: ${bigSchemas.slice(0, 3).map(t => `${t.name} (${t.sizeKB}KB)`).join(', ')}`);
    
    console.log('\n🔧 SOLUTIONS PROPOSÉES:');
    
    console.log('\n✅ SOLUTION 1: Injection sélective des outils');
    console.log('   - Ne charger que les outils nécessaires selon le prompt');
    console.log('   - Exemple: si prompt mentionne "Slack", charger uniquement les outils Slack');
    console.log('   - Réduction estimée: 80-90%');
    
    console.log('\n✅ SOLUTION 2: Schémas simplifiés');
    console.log('   - Garder uniquement les paramètres essentiels');
    console.log('   - Supprimer les descriptions longues');
    console.log('   - Réduction estimée: 50-70%');
    
    console.log('\n✅ SOLUTION 3: Cache intelligent');
    console.log('   - Charger les outils à la demande');
    console.log('   - Cacher les outils utilisés récemment');
    console.log('   - Réduction estimée: 60-80%');
    
    console.log('\n✅ SOLUTION 4: Outils de base seulement');
    console.log('   - Commencer avec 5-10 outils essentiels');
    console.log('   - Charger les autres à la demande');
    console.log('   - Réduction estimée: 90-95%');
    
    // Calculer l'impact sur les tokens
    const currentTokenUsage = estimatedTokens;
    const optimizedTokenUsage = Math.ceil(currentTokenUsage * 0.1); // 10% avec optimisation
    const tokenSavings = currentTokenUsage - optimizedTokenUsage;
    
    console.log('\n📈 IMPACT SUR LES TOKENS:');
    console.log(`   - Actuellement: ~${currentTokenUsage.toLocaleString()} tokens par requête`);
    console.log(`   - Avec optimisation: ~${optimizedTokenUsage.toLocaleString()} tokens par requête`);
    console.log(`   - Économie: ${tokenSavings.toLocaleString()} tokens (${((tokenSavings / currentTokenUsage) * 100).toFixed(1)}%)`);
    
    console.log('\n🎯 RECOMMANDATION IMMÉDIATE:');
    console.log('   1. Implémenter la SOLUTION 4 (outils de base seulement)');
    console.log('   2. Ajouter un mécanisme de chargement à la demande');
    console.log('   3. Surveiller l\'usage des tokens dans les logs');
    
    return {
      totalTools: tools.length,
      totalSizeKB: totalSize / 1024,
      estimatedTokens,
      toolSizes,
      recommendations: [
        'Injection sélective des outils',
        'Schémas simplifiés',
        'Cache intelligent',
        'Outils de base seulement'
      ]
    };
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error.message);
    console.error('💡 Assurez-vous que le serveur MCP est démarré');
    return null;
  }
}

// Exécuter l'analyse
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeMCPToolsSize().then(result => {
    if (result) {
      console.log('\n✅ Analyse terminée avec succès');
      process.exit(0);
    } else {
      console.log('\n❌ Analyse échouée');
      process.exit(1);
    }
  });
}

export { analyzeMCPToolsSize }; 