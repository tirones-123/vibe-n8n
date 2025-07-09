import Anthropic from '@anthropic-ai/sdk';
import { getNodeTypesByNames, getAllAvailableNodes } from './rag/node-types-rag.js';

// Configuration CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Prompt système amélioré avec support des versions
const IMPROVED_SYSTEM_PROMPT = `You are an expert n8n workflow builder. Your task is to create or modify n8n workflows based on user descriptions.

## CRITICAL VERSION HANDLING RULES

### Understanding n8n Node Versions
1. Each node has a "typeVersion" that determines its parameter structure
2. The documentation you receive matches the typeVersion - USE IT CORRECTLY
3. Different versions have COMPLETELY DIFFERENT structures

### MANDATORY: Match typeVersion with Documentation
When you receive node documentation:
- Check the "version" field in the documentation (e.g., version: [2, 2.1, 2.2])
- Check the "defaultVersion" field (e.g., defaultVersion: 2.2)
- **ALWAYS set typeVersion to match the defaultVersion from the documentation**
- If no defaultVersion, use the highest version number from the version array

### Version-Specific Rules

#### IF Node
- **Version 1**: Uses \`conditions\` with \`operation: "equal"\` (NO 's')
- **Version 2.x**: Uses \`conditions\` with filter structure and \`operator.operation: "equals"\` (WITH 's')
- NEVER mix structures between versions!

#### Gmail/Slack/Other Nodes  
- **Version 1**: Often simpler structure, may lack resource/operation
- **Version 2+**: Usually requires \`resource\` and \`operation\` fields
- Check the documentation structure to determine correct format

### When No Versions Provided
If the user's request doesn't specify versions:
1. Use the DEFAULT version from the documentation (check defaultVersion field)
2. **Set typeVersion to match this defaultVersion**
3. Use the parameter structure that corresponds to this version

### Common Mistakes to AVOID
1. ❌ Using "equals" in IF v1 (should be "equal")
2. ❌ Empty objects for required fields (e.g., \`filters: {}\`)
3. ❌ Missing resource/operation in v2+ nodes
4. ❌ Using v2 structure with typeVersion: 1
5. ❌ Not matching typeVersion with the documentation version

## RESPONSE FORMAT RULES

ALWAYS respond with a valid JSON object containing:
- nodes: Array of node objects
- connections: Connection mapping object

### Node Structure Requirements:
1. Each node MUST have a unique sequential ID starting from "1"
2. Use descriptive names (e.g., "Gmail Trigger", "Filter Emails", "Send to Slack")
3. Include ALL required fields based on the node type and version
4. **Set typeVersion to match the defaultVersion from documentation**
5. NEVER include empty or placeholder values

### Connection Rules:
- Format: "sourceNodeId": [["targetNodeId"]] 
- The first node should not appear as a key in connections
- Maintain logical flow from triggers through actions

### Required Fields by Node Type:
- Triggers: Must have valid trigger configuration
- Actions: Must have resource, operation (for v2+), and related parameters
- Logic nodes (IF, Switch): Must have valid conditions

## WORKFLOW GUIDELINES

1. **Email Workflows**: Use appropriate email nodes with proper authentication
2. **Scheduling**: Use Schedule Trigger for time-based automation  
3. **Webhooks**: Configure with proper HTTP methods and authentication
4. **Data Processing**: Include necessary transformation nodes
5. **Error Handling**: Consider error outputs where applicable

## IMPORTANT NOTES

- Generate ONLY the JSON response, no explanations
- Ensure all node IDs are strings ("1", "2", etc.)
- Validate that all required parameters are included
- Use the exact structure from the provided documentation
- **CRITICAL: Set typeVersion to match the version in the documentation you received**`;

// Fonction pour déterminer les bonnes versions par défaut

export default async function handler(req, res) {
  // Logger la requête entrante
  console.log('\n=== NOUVELLE REQUÊTE CLAUDE ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  if (req.method === 'POST' && req.body) {
    console.log('Body:', JSON.stringify({
      prompt: req.body.prompt,
      mode: req.body.mode,
      hasContext: !!req.body.context,
      hasTools: !!req.body.tools && req.body.tools.length > 0,
      versions: req.body.versions ? Object.keys(req.body.versions).length + ' nodes' : 'none'
    }, null, 2));
  }

  // Gérer les requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    // Appliquer les en-têtes CORS puis répondre
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
    return res.status(200).end();
  }

  // Vérifier la méthode HTTP
  if (req.method !== 'POST') {
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST method is accepted'
    });
  }

  // Vérifier l'authentification
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (!token || token !== process.env.BACKEND_API_KEY) {
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    });
  }

  // Valider le body de la requête
  const { prompt, context, tools, mode, versions } = req.body;
  
  if (!prompt || typeof prompt !== 'string') {
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
    return res.status(400).json({ 
      error: 'Bad Request',
      message: 'Missing or invalid prompt field'
    });
  }

  if (!context || typeof context !== 'object') {
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
    return res.status(400).json({ 
      error: 'Bad Request',
      message: 'Missing or invalid context field'
    });
  }

  if (!tools || !Array.isArray(tools)) {
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
    return res.status(400).json({ 
      error: 'Bad Request',
      message: 'Missing or invalid tools field'
    });
  }

  try {
    // Nouveau système : identifier les nodes mentionnés et récupérer leurs fiches
    let nodeTypesContext = '';
    let identifiedNodes = [];
    
    try {
      if (process.env.OPENAI_API_KEY && process.env.PINECONE_API_KEY) {
        console.log('Identification des nodes n8n mentionnés...');
        
        // Récupérer la liste complète des nodes disponibles
        const availableNodes = await getAllAvailableNodes();
        console.log(`📋 ${availableNodes.length} nodes disponibles dans le système`);
        
        // Créer une liste formatée pour Haiku
        const nodesList = availableNodes.map(n => ({
          name: n.shortName,
          displayName: n.displayName,
          isTrigger: n.isTrigger || false,
          description: n.description ? n.description.substring(0, 100) : ''
        }));
        
        // Étape 1 : Identifier les nodes mentionnés dans le prompt
        const anthropic = new Anthropic({
          apiKey: process.env.CLAUDE_API_KEY,
        });
        
        const identificationResponse = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307', // Modèle rapide pour l'identification
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `Here is the complete list of available n8n nodes:

${JSON.stringify(nodesList, null, 2)}

Analyze this user prompt and identify which nodes from the list above would be needed:

User prompt: "${prompt}"

Instructions:
- For email triggers, use nodes with "Trigger" in the name (e.g., "gmailTrigger")
- For sending messages, use the main node (e.g., "slack" not "slackTool")
- For conditions, use "if" node
- For filtering emails by sender, you might need "if" node
- Only return nodes that exist in the list above

Return ONLY a JSON array of node shortNames that match.
Return format: ["node1", "node2", ...]`
          }],
          temperature: 0
        });
        
        try {
          const responseText = identificationResponse.content[0].text.trim();
          console.log('Réponse Haiku brute:', responseText);
          identifiedNodes = JSON.parse(responseText);
          console.log('Nodes identifiés:', identifiedNodes);
        } catch (parseError) {
          console.error('Erreur parsing nodes:', parseError);
          console.error('Texte reçu:', identificationResponse.content[0].text);
          identifiedNodes = [];
        }
        
        // Étape 2 : Récupérer les fiches des nodes depuis Pinecone
        if (identifiedNodes.length > 0) {
          console.log('Récupération des fiches pour:', identifiedNodes);
          console.log('Avec versions:', versions);
          
          // Gérer le cas où versions est "none" ou pas un objet valide
          const versionsObject = (versions === 'none' || typeof versions !== 'object') ? {} : versions;
          
          const nodeDetails = await getNodeTypesByNames(identifiedNodes, versionsObject);
          
          if (nodeDetails.length > 0) {
            console.log(`✅ ${nodeDetails.length} fiches récupérées:`);
            nodeDetails.forEach(node => {
              console.log(`  - ${node.nodeName} v${node.version} (${node.fullData ? 'données complètes' : 'métadonnées uniquement'})`);
            });
            
            nodeTypesContext = '\n\n## Available Node Types Information\n\n';
            nodeTypesContext += '⚠️ IMPORTANT: Each node specification below includes its version. Match the typeVersion in your output with the structure provided!\n\n';
            
            nodeDetails.forEach(node => {
              nodeTypesContext += `### ${node.nodeName} (v${node.version})\n`;
              
              // Si on a les données complètes, les utiliser
              if (node.fullData) {
                // Ajouter des informations sur la version par défaut
                if (node.fullData.defaultVersion) {
                  nodeTypesContext += `**Default Version**: ${node.fullData.defaultVersion} `;
                  if (node.version === node.fullData.defaultVersion.toString()) {
                    nodeTypesContext += '✅ (This is the default version)\n';
                  } else {
                    nodeTypesContext += `⚠️ (Currently showing v${node.version})\n`;
                  }
                }
                
                // Ajouter des notes spécifiques pour certains nodes
                if (node.nodeName === 'if' && node.version === '1') {
                  nodeTypesContext += '**CRITICAL**: IF v1 uses `operation: "equal"` (NOT "equals"!)\n';
                } else if (node.nodeName === 'if' && node.version.startsWith('2')) {
                  nodeTypesContext += '**CRITICAL**: IF v2+ uses filter structure with `operator.operation: "equals"`\n';
                }
                
                if ((node.nodeName === 'slack' || node.nodeName === 'gmail') && parseFloat(node.version) >= 2) {
                  nodeTypesContext += '**IMPORTANT**: This version requires `resource` and `operation` fields\n';
                }
                
                nodeTypesContext += '\n```json\n';
                nodeTypesContext += JSON.stringify(node.fullData, null, 2);
                nodeTypesContext += '\n```\n\n';
              } else {
                // Fallback sur les métadonnées basiques
                nodeTypesContext += `Display Name: ${node.metadata.displayName}\n`;
                nodeTypesContext += `Description: ${node.metadata.description}\n`;
                nodeTypesContext += '\n';
              }
            });
            
            console.log(`${nodeDetails.length} fiches de nodes récupérées avec leurs métadonnées complètes`);
          } else {
            console.log('❌ Aucune fiche trouvée pour ces nodes');
          }
        }
      }
    } catch (ragError) {
      console.error('Erreur système node-types:', ragError);
      // Continuer sans le contexte des node-types
    }

    // Initialiser le client Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });

    // Préparer le system prompt avec le contexte actuel
    const isModification = mode === 'modify' && context && (context.nodes?.length > 0 || Object.keys(context).length > 1);
    
    const baseSystemPrompt = isModification ? 
    // Mode modification : utiliser les function calls
    `You are an AI assistant specialized in n8n workflow modifications. You can modify existing workflows using the available functions.

Current workflow context: ${JSON.stringify(context, null, 2)}

Use the functions to:
- Create nodes with createNode
- Modify existing nodes with updateNode  
- Connect nodes with connectNodes
- Delete nodes with deleteNode

Always respond in the user's language and briefly explain what you're doing.

Important guidelines:
- Only modify what is specifically requested
- Preserve existing configurations unless explicitly asked to change them
- Position new nodes logically based on existing nodes
- Use appropriate node types for the requested functionality
- Ensure connections flow logically from source to target
- Provide clear explanations of each action taken` 
    :
    // Mode création : générer JSON complet
    IMPROVED_SYSTEM_PROMPT;

    // Enrichir le system prompt avec les informations des node-types
    let systemPrompt = baseSystemPrompt;
    
    // Ajouter le mapping des versions si disponible
    if (versions && Object.keys(versions).length > 0) {
      systemPrompt += `\n\n## Node Version Mapping\nThe user's n8n instance has the following node versions available:\n${JSON.stringify(versions, null, 2)}\n\nIMPORTANT: When creating nodes, use the appropriate typeVersion based on this mapping to ensure compatibility.`;
    }
    
    // Ajouter les détails des node-types si disponibles
    if (nodeTypesContext) {
      systemPrompt += nodeTypesContext;
    }

    // Préparer les paramètres pour l'API Claude
    const claudeParams = {
      model: 'claude-opus-4-20250514',
      max_tokens: 16384, // Augmenté de 8192 à 16384 pour workflows complexes
      messages: [{ 
        role: 'user', 
        content: prompt 
      }],
      system: systemPrompt,
      thinking: {
        type: "enabled",
        budget_tokens: 6554
      },
      stream: true,
    };

    // Ajouter tools et tool_choice seulement s'il y a des outils ET si on est en mode modification
    if (tools && tools.length > 0 && isModification) {
      claudeParams.tools = tools;
      claudeParams.tool_choice = { type: 'auto' };
    }
    
    // Logger le contexte final envoyé à Claude
    console.log('\n--- CONTEXTE ENVOYÉ À CLAUDE OPUS ---');
    console.log('Model:', claudeParams.model);
    console.log('Mode:', isModification ? 'modification' : 'création');
    console.log('Nodes enrichis:', identifiedNodes.length > 0 ? identifiedNodes.join(', ') : 'aucun');
    console.log('Taille du system prompt:', systemPrompt.length, 'caractères');
    if (nodeTypesContext) {
      console.log('Contexte node-types inclus:', nodeTypesContext.length, 'caractères');
    }
    console.log('-----------------------------------\n');

    // Créer le stream avec l'API Claude
    const stream = await anthropic.messages.create(claudeParams);

    // Configurer les headers pour Server-Sent Events
    res.writeHead(200, {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Désactiver le buffering
    });

    // Transmettre le stream de Claude vers le client
    try {
      for await (const chunk of stream) {
        // Envoyer chaque chunk comme un événement SSE
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        
        // Flush pour s'assurer que les données sont envoyées immédiatement
        if (res.flush) res.flush();
      }

      // Envoyer un événement de fin personnalisé
      res.write(`data: ${JSON.stringify({ type: 'stream_end' })}\n\n`);
      res.end();
    } catch (streamError) {
      console.error('Stream error:', streamError);
      
      // Envoyer l'erreur dans le stream si possible
      if (!res.finished) {
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          error: 'Stream interrupted',
          message: streamError.message 
        })}\n\n`);
        res.end();
      }
    }
  } catch (error) {
    console.error('API Error:', error);
    
    // Si on n'a pas encore commencé à streamer
    if (!res.headersSent) {
      const statusCode = error.status || 500;
      const errorMessage = error.message || 'Internal server error';
      
      for (const [key, value] of Object.entries(corsHeaders)) {
        res.setHeader(key, value);
      }
      return res.status(statusCode).json({ 
        error: 'API Error',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      // Si on a déjà commencé à streamer, envoyer l'erreur dans le stream
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: 'API Error',
        message: error.message 
      })}\n\n`);
      res.end();
    }
  }
} 