#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

async function testRAGSimple() {
  console.log('🚂 Test RAG Railway - Version simple');
  console.log('====================================\n');
  
  const response = await fetch('https://vibe-n8n-production.up.railway.app/api/claude', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.BACKEND_API_KEY}`
    },
    body: JSON.stringify({
      prompt: "Crée un workflow simple avec HTTP Request pour GitHub + Slack. Dis-moi quelles métadonnées de nodes tu as reçues.",
      context: {nodes: [], connections: {}},
      tools: [],
      mode: 'create',
      versions: {httpRequest: 1, slack: 1, manualTrigger: 1}
    })
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  let inputTokens = 0;
  let thinking = '';
  let textResponse = '';
  let foundMetadata = false;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          
          if (data.type === 'message_start') {
            inputTokens = data.message.usage.input_tokens;
            console.log(`🔢 Input tokens: ${inputTokens}`);
          }
          
          if (data.type === 'content_block_delta' && data.delta.type === 'thinking_delta') {
            thinking += data.delta.thinking;
          }
          
          if (data.type === 'content_block_delta' && data.delta.type === 'text_delta') {
            textResponse += data.delta.text;
            // Afficher en temps réel
            process.stdout.write(data.delta.text);
          }
          
        } catch (e) {
          // Ignorer les erreurs de parsing
        }
      }
    }
  }
  
  console.log('\n\n📈 ANALYSE DES MÉTADONNÉES RAG:');
  console.log('===============================');
  console.log(`Input tokens: ${inputTokens}`);
  console.log(`Tokens RAG estimés: ~${inputTokens - 200}`);
  
  // Analyser le thinking pour les métadonnées
  if (thinking) {
    console.log('\n🤔 THINKING - Extrait des métadonnées:');
    console.log('-------------------------------------');
    
    const thinkingLines = thinking.split('\n');
    let metadataSection = false;
    
    for (const line of thinkingLines) {
      if (line.toLowerCase().includes('metadata') || 
          line.toLowerCase().includes('information') || 
          line.toLowerCase().includes('properties') ||
          line.toLowerCase().includes('httprequest') ||
          line.toLowerCase().includes('slack')) {
        console.log(`> ${line.trim()}`);
        metadataSection = true;
      }
    }
    
    if (!metadataSection) {
      console.log('Premier extrait du thinking:');
      console.log(thinking.substring(0, 500) + '...');
    }
  }
  
  console.log('\n✅ Test terminé!');
}

testRAGSimple(); 