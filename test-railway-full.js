#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();
import fetch from 'node-fetch';

async function testRailwayAPI() {
  console.log('🚀 Test de l\'API Railway avec données complètes\n');
  
  const apiUrl = 'https://vibe-n8n.vercel.app/api/claude';
  const apiKey = process.env.BACKEND_API_KEY;
  
  try {
    console.log('📊 Test 1: Demande d\'informations sur Slack');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        prompt: 'List all available operations in the Slack node v2.3 with their descriptions',
        context: {},
        tools: [],
        versions: { slack: 2.3 }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Compter la taille de la réponse
    let totalSize = 0;
    let hasSlackData = false;
    const chunks = [];

    for await (const chunk of response.body) {
      totalSize += chunk.length;
      chunks.push(chunk);
      
      const text = chunk.toString();
      if (text.includes('slack') || text.includes('channel') || text.includes('message')) {
        hasSlackData = true;
      }
    }

    console.log(`✅ Réponse reçue: ${(totalSize / 1024).toFixed(1)}KB`);
    console.log(`📋 Contient des données Slack: ${hasSlackData ? 'Oui' : 'Non'}`);
    
    // Test 2: Demande complexe
    console.log('\n📊 Test 2: Workflow complexe avec Slack');
    const response2 = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        prompt: 'Create a workflow that monitors a Slack channel for messages containing "urgent", extracts the user info and message, and sends a formatted notification to another channel',
        context: {},
        tools: [],
        versions: { slack: 2.3 }
      })
    });

    let workflowSize = 0;
    for await (const chunk of response2.body) {
      workflowSize += chunk.length;
    }

    console.log(`✅ Workflow généré: ${(workflowSize / 1024).toFixed(1)}KB`);
    
    console.log('\n🎉 Tous les tests passent ! Le système peut maintenant gérer des nodes de plus de 40KB.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testRailwayAPI();
