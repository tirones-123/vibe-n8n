import Anthropic from '@anthropic-ai/sdk';
import { callTool, listTools } from '../utils/mcpClient.js';

// Flag: use remote MCP connector instead of local n8n-mcp process
const USE_REMOTE_MCP = process.env.USE_REMOTE_MCP === 'true';
const REMOTE_MCP_CONFIG = USE_REMOTE_MCP ? {
  type: 'url',
  url: process.env.MCP_SERVER_URL,
  name: process.env.MCP_SERVER_NAME || 'remote-mcp',
  authorization_token: process.env.MCP_AUTH_TOKEN || undefined,
  tool_configuration: {
    enabled: true,
    // Permettre tous les outils par défaut
  }
} : null;

// Configuration CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Prompt système recommandé par l'utilisateur (optimisé pour n8n-MCP)
const MCP_BASE_PROMPT = `You are an expert in n8n automation software using n8n-MCP tools. Your role is to design, build, and validate n8n workflows with maximum accuracy and efficiency.

## Core Workflow Process

1. **ALWAYS start new conversation with**: \`tools_documentation()\` to understand best practices and available tools.

2. **Discovery Phase** - Find the right nodes:
   - Think deeply about user request and the logic you are going to build to fulfill it. Ask follow-up questions to clarify the user's intent, if something is unclear. Then, proceed with the rest of your instructions.
   - \`search_nodes({query: 'keyword'})\` - Search by functionality
   - \`list_nodes({category: 'trigger'})\` - Browse by category
   - \`list_ai_tools()\` - See AI-capable nodes (remember: ANY node can be an AI tool!)

3. **Configuration Phase** - Get node details efficiently:
   - \`get_node_essentials(nodeType)\` - Start here! Only 10-20 essential properties
   - \`search_node_properties(nodeType, 'auth')\` - Find specific properties
   - \`get_node_for_task('send_email')\` - Get pre-configured templates
   - \`get_node_documentation(nodeType)\` - Human-readable docs when needed
   - It is good common practice to show a visual representation of the workflow architecture to the user and asking for opinion, before moving forward. 

4. **Pre-Validation Phase** - Validate BEFORE building:
   - \`validate_node_minimal(nodeType, config)\` - Quick required fields check
   - \`validate_node_operation(nodeType, config, profile)\` - Full operation-aware validation
   - Fix any validation errors before proceeding

5. **Building Phase** - Create the workflow:
   - Use validated configurations from step 4
   - Connect nodes with proper structure
   - Add error handling where appropriate
   - Use expressions like $json, $node["NodeName"].json
   - Build the workflow in an artifact for easy editing downstream (unless the user asked to create in n8n instance)

6. **Workflow Validation Phase** - Validate complete workflow:
   - \`validate_workflow(workflow)\` - Complete validation including connections
   - \`validate_workflow_connections(workflow)\` - Check structure and AI tool connections
   - \`validate_workflow_expressions(workflow)\` - Validate all n8n expressions
   - Fix any issues found before deployment

7. **Deployment Phase** (if n8n API configured):
   - \`n8n_create_workflow(workflow)\` - Deploy validated workflow
   - \`n8n_validate_workflow({id: 'workflow-id'})\` - Post-deployment validation
   - \`n8n_update_partial_workflow()\` - Make incremental updates using diffs
   - \`n8n_trigger_webhook_workflow()\` - Test webhook workflows

## Key Insights

- **USE CODE NODE ONLY WHEN IT IS NECESSARY** - always prefer to use standard nodes over code node. Use code node only when you are sure you need it.
- **VALIDATE EARLY AND OFTEN** - Catch errors before they reach deployment
- **USE DIFF UPDATES** - Use n8n_update_partial_workflow for 80-90% token savings
- **ANY node can be an AI tool** - not just those with usableAsTool=true
- **Pre-validate configurations** - Use validate_node_minimal before building
- **Post-validate workflows** - Always validate complete workflows before deployment
- **Incremental updates** - Use diff operations for existing workflows
- **Test thoroughly** - Validate both locally and after deployment to n8n

## Validation Strategy

### Before Building:
1. validate_node_minimal() - Check required fields
2. validate_node_operation() - Full configuration validation
3. Fix all errors before proceeding

### After Building:
1. validate_workflow() - Complete workflow validation
2. validate_workflow_connections() - Structure validation
3. validate_workflow_expressions() - Expression syntax check

### After Deployment:
1. n8n_validate_workflow({id}) - Validate deployed workflow
2. n8n_list_executions() - Monitor execution status
3. n8n_update_partial_workflow() - Fix issues using diffs

## Response Structure

1. **Discovery**: Show available nodes and options
2. **Pre-Validation**: Validate node configurations first
3. **Configuration**: Show only validated, working configs
4. **Building**: Construct workflow with validated components
5. **Workflow Validation**: Full workflow validation results
6. **Deployment**: Deploy only after all validations pass
7. **Post-Validation**: Verify deployment succeeded

## Important Rules

- ALWAYS validate before building
- ALWAYS validate after building
- NEVER deploy unvalidated workflows
- USE diff operations for updates (80-90% token savings)
- STATE validation results clearly
- FIX all errors before proceeding

## Follow-up Questions Policy
If essential details are missing, **do NOT ask the user**. Instead:
1. Choose sensible defaults (ex: Manual Trigger; first Dropbox file matching *.pdf; Slack channel #general; empty message).
2. Proceed through all phases and generate the final n8n JSON in one go.
3. Mention assumptions made in a short comment field inside the JSON (e.g., \`notes\`).

## Tool Invocation Rules
You have access to the MCP tool catalogue provided in the request.
- ALWAYS invoke tools with a proper \`tool_use\` block (Anthropic function calling format).
- NEVER describe a tool call inside markdown or \`<Tool>\` tags – actually call it.
- After receiving a \`tool_result\`, continue until the workflow JSON is built and validated.
- IF you attempt to skip tool calls or output pseudo-tags, respond with the JSON error {"error":"tool_skipped"}.

## Example of a correct tool call
When you need to search nodes you MUST output a content block like:

\`\`\`json
{
  "type": "tool_use",
  "id": "id_search",
  "name": "search_nodes",
  "input": { "query": "dropbox" }
}
\`\`\`

After receiving the tool_result, continue the conversation.
`;

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
    // Découverte dynamique des tools via MCP local uniquement si non-remote
    if (!USE_REMOTE_MCP && !global.mcpToolsCache) {
      const res = await listTools();
      global.mcpToolsCache = (res?.tools || []).map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      }));
      console.log(`[Claude] ${global.mcpToolsCache.length} outils MCP injectés`);
    }

    // Plus de RAG local => on ne construit plus nodeTypesContext
    const nodeTypesContext = '';
    const identifiedNodes = [];

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
    MCP_BASE_PROMPT;

    // Enrichir le system prompt avec les informations des node-types
    let systemPrompt = baseSystemPrompt;
    
    // (Version mapping section retiré pour alléger le prompt)
    
    // Ajouter les détails des node-types si disponibles
    if (nodeTypesContext) {
      systemPrompt += nodeTypesContext;
    }

    // Préparer les paramètres pour l'API Claude
    const claudeParams = {
      model: 'claude-opus-4-20250514',
      max_tokens: 16384, // Augmenté de 8192 à 16384 pour workflows complexes
      system: systemPrompt,
      stream: false,
    };

    // Mode remote : utiliser la feature MCP connector
    if (USE_REMOTE_MCP) {
      claudeParams.betas = ['mcp-client-2025-04-04'];
      claudeParams.mcp_servers = [REMOTE_MCP_CONFIG];
    } else {
      // Injection locale des tools comme avant
      const mergedTools = [...(global.mcpToolsCache || []), ...(Array.isArray(tools) ? tools : [])];
      if (mergedTools.length > 0) {
        claudeParams.tools = mergedTools;
        // Force Claude to invoke at least one tool (but let it choose which one)
        claudeParams.tool_choice = { type: 'any' };
      }
    }
    
    // Logger le contexte final envoyé à Claude
    console.log('\n--- CONTEXTE ENVOYÉ À CLAUDE OPUS ---');
    console.log('Model:', claudeParams.model);
    console.log('Mode:', isModification ? 'modification' : 'création');
    console.log('Nodes enrichis (désactivé):', identifiedNodes.length);
    console.log('Taille du system prompt:', systemPrompt.length, 'caractères');
    if (nodeTypesContext) {
      console.log('Contexte node-types inclus:', nodeTypesContext.length, 'caractères');
    }
    console.log('-----------------------------------\n');

    // Préparer l'historique des messages Claude
    const messages = [{ role: 'user', content: prompt }];

    // SSE headers
    res.writeHead(200, {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    function sendEvent(data) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (res.flush) res.flush();
    }

    if (USE_REMOTE_MCP) {
      // Le streaming est obligatoire pour les opérations MCP
      console.log('[MCP] Configuration MCP:', JSON.stringify(REMOTE_MCP_CONFIG, null, 2));
      console.log('[MCP] Paramètres Claude:', JSON.stringify({
        model: claudeParams.model,
        betas: claudeParams.betas,
        mcp_servers: claudeParams.mcp_servers,
        max_tokens: claudeParams.max_tokens
      }, null, 2));
      
      const stream = await anthropic.beta.messages.create({
        ...claudeParams,
        messages,
        stream: true, // Obligatoire pour MCP
      });

      console.log('[MCP] Stream créé avec succès');
      
      for await (const event of stream) {
        console.log('[MCP] Event reçu:', event.type);
        if (event.type === 'mcp_tool_use' || event.type === 'mcp_tool_result') {
          console.log('[MCP] Détails event:', JSON.stringify(event, null, 2));
        }
        
        // Les événements peuvent être "content_block_start", "content_block_delta", "content_block_stop",
        // ou directement des blobs "content" dans certaines versions.
        if (event.type === 'content_block_delta' && event.delta?.text) {
          sendEvent({ type: 'assistant_text_delta', text: event.delta.text });
        } else if (event.type === 'content_block_start' && event.content_block?.text) {
          sendEvent({ type: 'assistant_text', text: event.content_block.text });
        } else if (event.type === 'mcp_tool_use') {
          sendEvent({ type: 'mcp_tool_use', name: event.name, id: event.id, server: event.server_name, input: event.input });
        } else if (event.type === 'mcp_tool_result') {
          sendEvent({ type: 'mcp_tool_result', tool_use_id: event.tool_use_id, is_error: event.is_error, content: event.content });
        }
      }

      console.log('[MCP] Stream terminé');
      res.end();
    } else {
      // === Comportement local historique ===
      let continueLoop = true;
      while (continueLoop) {
        const response = await anthropic.messages.create({
          ...claudeParams,
          messages,
          stream: false,
        });

        // Envoyer la réponse brute (texte) au client
        const textBlock = response.content.find(c => c.type === 'text');
        if (textBlock && textBlock.text) {
          sendEvent({ type: 'assistant_text', text: textBlock.text });
        }

        if (response.stop_reason === 'tool_use') {
          for (const block of response.content) {
            if (block.type !== 'tool_use') continue;

            sendEvent({ type: 'tool_use', name: block.name, id: block.id, input: block.input });

            try {
              const result = await callTool(block.name, block.input);
              sendEvent({ type: 'tool_result', id: block.id, result });

              // Ajouter au thread
              messages.push({ role: 'assistant', content: [block] });
              messages.push({
                role: 'user',
                content: [{ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) }]
              });
            } catch (err) {
              sendEvent({ type: 'tool_error', id: block.id, error: err.message });
              messages.push({ role: 'assistant', content: [block] });
              messages.push({
                role: 'user',
                content: [{ type: 'tool_result', tool_use_id: block.id, content: `ERROR: ${err.message}` }]
              });
            }
          }
        } else {
          continueLoop = false;
          sendEvent({ type: 'final', content: response });
          res.end();
        }
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