// test-mcp-client.js
// Script de test pour vérifier la communication MCP

import { callTool, listTools } from './utils/mcpClient.js';

async function testMCP() {
  console.log('=== Test du client MCP ===\n');
  
  try {
    // Test 1: Lister les outils disponibles
    console.log('1. Test listTools()...');
    const tools = await listTools();
    console.log(`✅ Outils MCP disponibles: ${tools.tools?.length || 0}`);
    if (tools.tools?.length > 0) {
      console.log('   Premiers outils:', tools.tools.slice(0, 5).map(t => t.name).join(', '));
    }
    
    // Test 2: Lister les nodes disponibles
    console.log('\n2. Test list_nodes...');
    const nodesList = await callTool('list_nodes', { limit: 10 });
    console.log('✅ list_nodes réussi');
    console.log('   Réponse:', JSON.stringify(nodesList, null, 2));
    
    // Test 3: Rechercher des nodes
    console.log('\n3. Test search_nodes...');
    const searchResult = await callTool('search_nodes', { 
      query: 'http',
      limit: 5
    });
    console.log('✅ search_nodes réussi');
    console.log('   Réponse:', JSON.stringify(searchResult, null, 2));
    
    // Test 4: Tester avec un node type correct
    console.log('\n4. Test get_node_essentials avec node type correct...');
    const result = await callTool('get_node_essentials', { 
      nodeType: 'nodes-base.slack'  // Utiliser un node type qu'on sait qui existe
    });
    console.log('✅ get_node_essentials réussi');
    console.log('   Réponse:', JSON.stringify(result, null, 2));
    
    console.log('\n🎉 Tous les tests MCP ont réussi !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test MCP:', error.message);
    console.error('Stack:', error.stack);
  }
  
  // Forcer la sortie
  process.exit(0);
}

testMCP(); 