import Anthropic from '@anthropic-ai/sdk';

// Configuration CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
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
  const { prompt, context, tools, mode } = req.body;
  
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
    // Initialiser le client Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });

    // Préparer le system prompt avec le contexte actuel
    const isModification = mode === 'modify' && context && (context.nodes?.length > 0 || Object.keys(context).length > 1);
    
    const systemPrompt = isModification ? 
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
    `# Overview
You are an AI agent responsible for generating fully importable n8n workflow JSON files from
natural language task descriptions. Your goal is to translate user requirements into properly
configured workflows using n8n nodes.

## Context
- Inputs will be natural language descriptions of triggers, applications, logic, and desired outputs.
- Workflows may span all types of use cases (e.g., automation, integrations, data transformation, notifications).
- Output must be valid n8n JSON, ready for import.
- All nodes must be properly connected, error-handled, and include placeholder credentials where needed.
- Include inline documentation using Sticky Notes where clarification or context is helpful.
- Maintain clean structure: all nodes should reference upstream data explicitly using expressions (e.g., \`{{\$json["field"]}}\`).

## Current Workflow Context
${JSON.stringify(context, null, 2)}

## Instructions
1. Parse the input and extract key workflow components: trigger, actions, logic, and output.
2. Assign the appropriate n8n nodes for each step in the workflow.
3. Configure each node:
   - Use realistic placeholder data.
   - Reference upstream nodes with proper expressions.
   - Wrap logic with error handling nodes (try/catch structure if needed).
4. Use \`Sticky Note\` nodes to add documentation where logic or configuration may need clarification.
5. Ensure final nodes mark workflow completion explicitly.
6. Validate structure to confirm JSON is formatted correctly for n8n import.
7. Always respond in the user's language and briefly explain what you're doing.

## Node Configuration Guidelines
- Position new nodes logically based on existing nodes
- Use appropriate node types for the requested functionality
- Ensure connections flow logically from source to target
- Use expressions like \`{{\$node["NodeName"].json["field"]}}\` to reference upstream data cleanly
- Include basic error handling using IF or Try/Catch nodes
- Avoid hard-coded credentials - use placeholder values
- Each workflow must conclude with a node marking it complete

## Output Format
CRITICAL: You MUST ALWAYS return the workflow JSON in this EXACT format:

1. First, a brief explanation text in the user's language (optional but recommended)
2. Then the JSON inside a markdown code block with \`\`\`json

Example:
Je vais créer un workflow qui envoie un email tous les matins à 9h.

\`\`\`json
{
  "nodes": [...],
  "connections": {...},
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "name": "Morning Email Workflow",
  "active": false,
  "id": "workflow_123"
}
\`\`\`

NEVER send the JSON alone or without the markdown code block.
NEVER send the JSON in plain text.
ALWAYS use the \`\`\`json markdown format.

## Examples
- Input: "When a Google Sheet is updated, send the row data to Discord and log it in Airtable."
- Output: Complete JSON with:
  - Trigger: Google Sheets
  - Actions: Discord + Airtable
  - Sticky Note: Describes which columns are expected
  - Proper field references like \`{{\$json["row"]["name"]}}\`

## Important Notes
- Always ask clarifying questions if inputs are vague or missing key elements
- Code must include error handling and avoid hard-coded credentials
- Ensure all nodes are linked correctly in \`connections\`
- The JSON must be valid and importable in n8n

---`;

    // Préparer les paramètres pour l'API Claude
    const claudeParams = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
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

    // Créer le stream avec l'API Claude
    const stream = await anthropic.messages.create(claudeParams);

    // Configurer les headers pour Server-Sent Events
    res.writeHead(200, {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Désactiver le buffering pour Vercel
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