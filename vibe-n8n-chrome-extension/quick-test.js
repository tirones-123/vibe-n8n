#!/usr/bin/env node

/**
 * Script de test rapide pour l'extension n8n AI Assistant
 * Valide les fonctionnalités principales avec le nouveau backend
 */

const CONFIG = {
  API_URL: 'https://vibe-n8n-production.up.railway.app/api/claude',
  API_KEY: 'd5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2'
};

// Polyfill pour fetch en Node.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const MOCK_VERSIONS = {
  "slack": 4,
  "notion": 2,
  "httpRequest": 5,
  "schedule": 1,
  "gmail": 2,
  "discord": 1,
  "hubspot": 1
};

async function quickTest() {
  console.log('🚀 Test rapide de l\'extension n8n AI Assistant');
  console.log('=' .repeat(50));
  
  // Test 1: Connexion
  console.log('\n1️⃣ Test de connexion...');
  try {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.API_KEY}`
      },
      body: JSON.stringify({
        prompt: "ping",
        context: { nodes: [], connections: {} },
        mode: "create",
        tools: [],
        versions: MOCK_VERSIONS
      })
    });

    if (response.ok) {
      console.log('✅ Connexion réussie');
    } else {
      console.log('❌ Erreur connexion:', response.status);
      return;
    }
  } catch (error) {
    console.log('❌ Erreur réseau:', error.message);
    return;
  }

  // Test 2: Workflow simple
  console.log('\n2️⃣ Test workflow simple...');
  try {
    const startTime = Date.now();
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.API_KEY}`
      },
      body: JSON.stringify({
        prompt: "Crée un workflow simple avec un trigger manuel et une requête HTTP",
        context: { nodes: [], connections: {} },
        mode: "create",
        tools: [],
        versions: MOCK_VERSIONS
      })
    });

    if (response.ok) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let content = '';
      let eventCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              eventCount++;
              if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
                content += data.delta.text;
              }
            } catch (e) {
              // Ignorer erreurs parsing
            }
          }
        }
      }

      const duration = Date.now() - startTime;
      console.log('✅ Workflow simple généré');
      console.log(`   Temps: ${duration}ms`);
      console.log(`   Événements: ${eventCount}`);
      console.log(`   Taille: ${content.length} caractères`);
      console.log(`   Tokens estimés: ${Math.round(content.length / 4)}`);
      
      // Vérifier la structure
      const hasNodes = content.includes('nodes');
      const hasConnections = content.includes('connections');
      console.log(`   Structure: ${hasNodes && hasConnections ? '✅' : '❌'}`);
      
    } else {
      console.log('❌ Erreur workflow simple:', response.status);
    }
  } catch (error) {
    console.log('❌ Erreur test workflow:', error.message);
  }

  // Test 3: Workflow complexe
  console.log('\n3️⃣ Test workflow complexe...');
  try {
    const startTime = Date.now();
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.API_KEY}`
      },
      body: JSON.stringify({
        prompt: "Crée un workflow complexe qui intègre Notion, Slack, Discord et HubSpot avec un trigger schedule",
        context: { nodes: [], connections: {} },
        mode: "create",
        tools: [],
        versions: MOCK_VERSIONS
      })
    });

    if (response.ok) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let content = '';
      let eventCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              eventCount++;
              if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
                content += data.delta.text;
              }
            } catch (e) {
              // Ignorer erreurs parsing
            }
          }
        }
      }

      const duration = Date.now() - startTime;
      console.log('✅ Workflow complexe généré');
      console.log(`   Temps: ${duration}ms`);
      console.log(`   Événements: ${eventCount}`);
      console.log(`   Taille: ${content.length} caractères`);
      console.log(`   Tokens estimés: ${Math.round(content.length / 4)}`);
      
      // Vérifier les services
      const hasNotion = content.toLowerCase().includes('notion');
      const hasSlack = content.toLowerCase().includes('slack');
      const hasDiscord = content.toLowerCase().includes('discord');
      const hasHubspot = content.toLowerCase().includes('hubspot');
      
      console.log(`   Services détectés:`);
      console.log(`     Notion: ${hasNotion ? '✅' : '❌'}`);
      console.log(`     Slack: ${hasSlack ? '✅' : '❌'}`);
      console.log(`     Discord: ${hasDiscord ? '✅' : '❌'}`);
      console.log(`     HubSpot: ${hasHubspot ? '✅' : '❌'}`);
      
      // Test des limites étendues
      const tokensUsed = Math.round(content.length / 4);
      const limitTest = tokensUsed > 8192 ? '✅ Limites étendues utilisées' : '⚠️ Sous les anciennes limites';
      console.log(`   ${limitTest} (${tokensUsed}/16384 tokens)`);
      
    } else {
      console.log('❌ Erreur workflow complexe:', response.status);
    }
  } catch (error) {
    console.log('❌ Erreur test complexe:', error.message);
  }

  console.log('\n' + '=' .repeat(50));
  console.log('🎉 Test rapide terminé !');
  console.log('\nPour des tests plus approfondis:');
  console.log('- Ouvrir integration-test.html dans un navigateur');
  console.log('- Charger l\'extension dans Chrome');
  console.log('- Tester sur une vraie page n8n');
}

// Exécuter le test
if (require.main === module) {
  quickTest().catch(console.error);
}

module.exports = { quickTest }; 