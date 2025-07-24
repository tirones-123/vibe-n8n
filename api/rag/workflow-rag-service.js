import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export class WorkflowRAGService {
  constructor() {
    if (!process.env.PINECONE_API_KEY || !process.env.OPENAI_API_KEY || !process.env.CLAUDE_API_KEY) {
      throw new Error('Missing required environment variables for Workflow RAG service');
    }

    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 600000, // 10 minutes pour embeddings
    });

    this.anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
      timeout: 900000, // 15 minutes pour génération Claude
    });

    const indexName = process.env.PINECONE_WORKFLOW_INDEX || 'n8n-workflows';
    this.index = this.pinecone.index(indexName);
    // Use relative path from the current file location
    this.workflowsDir = path.join(process.cwd(), 'workflows');
    // Optimized workflows for RAG context (Claude prompts)
    this.optimizedWorkflowsDir = path.join(process.cwd(), 'workflows-rag-optimized');
    
    console.log(`📂 Optimized workflows directory: ${this.optimizedWorkflowsDir}`);
    
    // Configuration pour gros workflows
    this.MAX_CHUNK_SIZE = 32768; // 32KB par chunk SSE
    this.COMPRESSION_THRESHOLD = 10240; // Compresser si > 10KB
  }

  /**
   * Compresse et découpe un gros workflow pour transmission SSE
   */
  async prepareWorkflowForTransmission(workflow, explanation) {
    const fullPayload = {
      workflow,
      explanation
    };
    
    const jsonString = JSON.stringify(fullPayload);
    const sizeKB = Buffer.byteLength(jsonString, 'utf8') / 1024;
    
    console.log(`📊 Workflow size: ${sizeKB.toFixed(1)}KB`);
    
    // Si petit workflow, envoi direct
    if (sizeKB < this.COMPRESSION_THRESHOLD / 1024) {
      return {
        type: 'direct',
        chunks: [fullPayload]
      };
    }
    
    // Compression pour workflows moyens (10KB - 100KB)
    if (sizeKB < 100) {
      try {
        const compressed = await gzip(jsonString);
        const compressedSize = compressed.length / 1024;
        console.log(`🗜️ Compressed: ${sizeKB.toFixed(1)}KB → ${compressedSize.toFixed(1)}KB`);
        
        return {
          type: 'compressed',
          chunks: [{
            compressed: true,
            data: compressed.toString('base64'),
            originalSize: jsonString.length
          }]
        };
      } catch (error) {
        console.error('❌ Compression failed:', error);
        // Fallback au chunking
      }
    }
    
    // Chunking pour très gros workflows (>100KB)
    console.log(`📦 Chunking large workflow (${sizeKB.toFixed(1)}KB)`);
    const chunks = [];
    const chunkSize = this.MAX_CHUNK_SIZE;
    
    for (let i = 0; i < jsonString.length; i += chunkSize) {
      const chunk = jsonString.slice(i, i + chunkSize);
      chunks.push({
        index: Math.floor(i / chunkSize),
        total: Math.ceil(jsonString.length / chunkSize),
        data: chunk,
        isLast: i + chunkSize >= jsonString.length
      });
    }
    
    console.log(`📦 Created ${chunks.length} chunks`);
    
    return {
      type: 'chunked',
      chunks
    };
  }

  /**
   * Envoie le workflow selon le type de transmission
   */
  async sendWorkflowTransmission(transmission, onProgress) {
    if (!onProgress) return;

    switch (transmission.type) {
      case 'direct':
        // Envoi direct - petit workflow
        if (onProgress) {
          onProgress('complete', {
            message: 'Workflow généré avec succès !',
            success: true,
            workflow: transmission.chunks[0].workflow,
            explanation: transmission.chunks[0].explanation
          });
        }
        break;

      case 'compressed':
        // Envoi compressé - workflow moyen
        if (onProgress) {
          onProgress('compressed_complete', {
            message: 'Workflow compressé généré avec succès !',
            success: true,
            compressed: true,
            data: transmission.chunks[0].data,
            originalSize: transmission.chunks[0].originalSize
          });
        }
        break;

      case 'chunked':
        // Envoi par chunks - gros workflow
        const chunks = transmission.chunks;
        
        // Envoyer l'info de début de chunking
        if (onProgress) {
          onProgress('chunking_start', {
            message: `Envoi du workflow en ${chunks.length} parties...`,
            totalChunks: chunks.length
          });
        }
        
        // Envoyer chaque chunk avec un délai
        for (const chunk of chunks) {
          if (onProgress) {
            onProgress('chunk', {
              message: `Partie ${chunk.index + 1}/${chunk.total}`,
              index: chunk.index,
              total: chunk.total,
              data: chunk.data,
              isLast: chunk.isLast
            });
          }
          
          // Délai entre chunks pour éviter l'overflow
          if (!chunk.isLast) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        // Signal de fin
        if (onProgress) {
          onProgress('chunking_complete', {
            message: 'Workflow volumineux transmis avec succès !',
            totalChunks: chunks.length
          });
        }
        break;

      default:
        console.error('❌ Type de transmission inconnu:', transmission.type);
    }
  }

  /**
   * Recherche des workflows similaires basée sur les descriptions GPT-4
   */
  async findSimilarWorkflows(description, topK = 5) {
    try {
      // Vérifier d'abord que le répertoire existe
      try {
        const files = await fs.readdir(this.optimizedWorkflowsDir);
        console.log(`📁 Optimized workflows directory contains ${files.length} files`);
        if (files.length < 10) {
          console.log(`📄 Sample files: ${files.slice(0, 5).join(', ')}...`);
        }
      } catch (dirError) {
        console.error(`❌ Cannot access optimized workflows directory: ${dirError.message}`);
      }
      
      // Générer l'embedding pour la description utilisateur
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: description,
        encoding_format: 'float'
      });

      const queryEmbedding = embeddingResponse.data[0].embedding;

      // Rechercher dans Pinecone (maintenant indexé avec descriptions GPT-4)
      const searchResults = await this.index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true
      });

      // Transformer les résultats
      const workflows = [];
      
      console.log(`🔍 Pinecone found ${searchResults.matches?.length || 0} matches for "${description.substring(0, 100)}..."`);
      console.log(`📊 Recherche basée sur descriptions GPT-4:`);
      if (searchResults.matches) {
        searchResults.matches.forEach((match, i) => {
          console.log(`  ${i + 1}. Score: ${match.score.toFixed(3)} - "${match.metadata?.name || 'Unknown'}" (${match.metadata?.filename})`);
          if (match.metadata?.descriptionSnippet) {
            console.log(`      📝 "${match.metadata.descriptionSnippet.substring(0, 120)}..."`);
          }
        });
      }
      
      for (const match of searchResults.matches || []) {
        const workflow = {
          id: match.id,
          filename: match.metadata?.filename || '',
          name: match.metadata?.name || '',
          description: match.metadata?.description || '',
          descriptionSnippet: match.metadata?.descriptionSnippet || '',
          nodeCount: match.metadata?.nodeCount || 0,
          nodeTypes: match.metadata?.nodeTypes || [],
          relevanceScore: match.score || 0
        };
        
              console.log(`📝 Match ${workflows.length + 1}: "${workflow.name}" (score: ${workflow.relevanceScore.toFixed(3)}) → file: "${workflow.filename}"`);
      console.log(`    📊 ${workflow.nodeCount} nœuds: ${workflow.nodeTypes.slice(0, 3).join(', ')}${workflow.nodeTypes.length > 3 ? '...' : ''}`);
      
      // Charger le contenu JSON complet du workflow depuis workflows-rag-optimized
      try {
        const optimizedFilePath = path.join(this.optimizedWorkflowsDir, workflow.filename);
        console.log(`🔍 Loading RAG workflow file: "${workflow.filename}"`);
        workflow.workflowContent = await fs.readFile(optimizedFilePath, 'utf-8');
        console.log(`✅ Successfully loaded RAG file: "${workflow.filename}" → "${workflow.name}" - ${workflow.workflowContent.length} chars`);
          
          // Valider que c'est du JSON valide
          try {
            const parsedWorkflow = JSON.parse(workflow.workflowContent);
            if (!parsedWorkflow.nodes || !Array.isArray(parsedWorkflow.nodes)) {
              throw new Error('Structure workflow invalide');
            }
            console.log(`    ✅ JSON valide avec ${parsedWorkflow.nodes.length} nœuds`);
          } catch (jsonError) {
            console.error(`❌ JSON invalide pour ${workflow.filename}:`, jsonError.message);
            continue;
          }
          
        } catch (error) {
          console.log(`❌ Failed to load workflow JSON "${workflow.filename}": ${error.message}`);
          console.log(`⏭️  Skipping workflow: "${workflow.name}" (${workflow.filename})`);
          // Skip this workflow - will use next one from Pinecone results
          continue;
        }
        
        workflows.push(workflow);
      }

      console.log(`\n📊 FINAL RESULT: ${workflows.length} workflows successfully loaded with GPT-4 descriptions:`);
      workflows.forEach((w, i) => {
        console.log(`  ${i + 1}. "${w.name}" (${w.filename}) - score: ${w.relevanceScore.toFixed(3)}`);
        console.log(`      📝 ${w.descriptionSnippet.substring(0, 100)}...`);
      });

      return workflows;

    } catch (error) {
      console.error('Error in findSimilarWorkflows:', error);
      throw error;
    }
  }

  /**
   * Génère un workflow avec streaming et callbacks de progression
   */
  async generateWorkflowFromExamplesWithStreaming(description, options = {}) {
    const { topK = 3, workflowName = 'Generated Workflow', baseWorkflow = null, onProgress } = options;

    try {
      if (onProgress) {
        onProgress('search', { message: 'Recherche de workflows similaires...' });
      }
      
      // Trouver des workflows similaires
      const similarWorkflows = await this.findSimilarWorkflows(description, topK);
      
      if (similarWorkflows.length === 0) {
        return {
          success: false,
          error: 'No similar workflows found in the database'
        };
      }

      if (onProgress) {
        onProgress('context_building', { 
          message: 'Construction du contexte pour IA...',
          workflows: similarWorkflows.map(w => w.name)
        });
      }

      // Construire le prompt système adapté selon le mode
      let systemPrompt;
      if (baseWorkflow) {
        // Mode amélioration d'un workflow existant
        systemPrompt = `You are an n8n workflow expert. You need to analyze and improve an existing workflow based on user requirements and similar workflow examples.

The current workflow has ${baseWorkflow.nodes?.length || 0} nodes and you should:
- Keep the useful parts of the existing workflow
- Change only what the user asks for
- Add or modify nodes as needed
- Use appropriate nodes based on the user's needs
- Have proper connections between nodes
- Include all necessary configurations
- Use the exact node type formats from the examples (e.g., "nodes-base.webhook")
- Avoid using http request node when possible
- The references in the connections section must point to the name property of each node.

Current workflow to improve:
\`\`\`json
${JSON.stringify(baseWorkflow, null, 2)}
\`\`\`

Use the similar workflow examples below as inspiration for improvements, but maintain the core functionality of the original workflow.

Respond with a JSON object containing both the improved workflow and an explanation:
{
  "workflow": { /* the fullimproved n8n workflow JSON */ },
  "explanation": {
    "summary": "Brief description of the improvements made",
    "changes": "List of specific changes and improvements",
    "notes": "Any important configuration notes or requirements"
  }
}

When you output JSON it must ALWAYS be strictly valid:
  • Use double quotes ("") for all keys and string values.
  • Do NOT include trailing commas.
  • Do NOT include comments inside the JSON.
  • Escape special characters properly (e.g. newlines \n).
  • The final answer MUST be a single JSON object, nothing before or after.`;
      } else {
        // Mode création d'un nouveau workflow
        systemPrompt = `You are an n8n workflow expert. Based on the following similar workflow examples, create a new workflow that meets the user's requirement.

The workflow should:
- Be fully functional and ready to import into n8n
- Follow n8n workflow structure conventions
- DO not use http request node, Use it only if it's absolutely necessary.
- Use appropriate nodes based on the user's needs, take the examples as reference. 
- Use all the parameters of the nodes need and follow it writing order of the exemples.
- Have proper connections between nodes
- Include all necessary configurations
- Use the exact node type formats from the examples (e.g., "nodes-base.webhook")
- The references in the connections section must point to the name property of each node.

Respond with a JSON object containing both the workflow and an explanation:
{
  "workflow": { /* the complete n8n workflow JSON */ },
  "explanation": {
    "summary": "Brief description of what this workflow does",
    "flow": "Step-by-step explanation of the workflow flow",
    "notes": "Any important configuration notes or requirements"
  }
}
When you output JSON it must ALWAYS be strictly valid:
  • Use double quotes ("") for all keys and string values.
  • Do NOT include trailing commas.
  • Do NOT include comments inside the JSON.
  • Escape special characters properly (e.g. newlines \n).
  • The final answer MUST be a single JSON object, nothing before or after.`;
      }

      // Construire le contexte enrichi avec les workflows d'exemple
      const examplesContext = similarWorkflows
        .filter(w => w.workflowContent)
        .map((w, i) => {
          const workflowData = JSON.parse(w.workflowContent);
          const nodeTypes = workflowData.nodes?.map((n) => n.type).join(', ') || 'Unknown';
          
          return `Example ${i + 1} (Relevance: ${w.relevanceScore.toFixed(3)}):
Workflow Name: ${w.name}
Filename: ${w.filename}
Nodes: ${nodeTypes}

GPT-4 Functional Description:
${w.description || 'No description available'}

Technical Implementation (JSON):
\`\`\`json
${w.workflowContent}
\`\`\``;
        }).join('\n\n---\n\n');

      const userPrompt = `"${description}"

Here are ${similarWorkflows.length} similar workflow examples for reference:

${examplesContext}

${baseWorkflow ? 
        `Based on these examples and the current workflow provided above, create an improved version that fulfills the user's requirement.` :
        `Based on these examples, create a new workflow that fulfills the user's requirement above.`}`;

      if (onProgress) {
        onProgress('claude_call', { 
          message: baseWorkflow ? 'Amélioration du workflow avec AI...' : 'Envoi de la requête à AI...',
          promptLength: systemPrompt.length + userPrompt.length
        });
      }

      // LOGS DÉTAILLÉS DES PROMPTS
      console.log(`\n🤖 === CLAUDE PROMPTS ===`);
      console.log(`📝 System Prompt (${systemPrompt.length} chars):`);
      console.log(systemPrompt);
      console.log(`\n📋 User Prompt (${userPrompt.length} chars):`);
      console.log(userPrompt);
      console.log(`\n🔢 Total prompt length: ${systemPrompt.length + userPrompt.length} chars`);
      console.log(`📊 RAG workflows used in prompt: ${similarWorkflows.length}`);
      console.log(`📂 RAG filenames: ${similarWorkflows.map(w => w.filename).join(', ')}`);
      console.log(`📁 === RAG FILES INCLUDED IN PROMPT ===`);
      similarWorkflows.forEach((w, i) => {
        console.log(`  📄 ${i + 1}. FILE: "${w.filename}" → WORKFLOW: "${w.name}"`);
        console.log(`       ├─ Score: ${w.relevanceScore.toFixed(3)}`);
        console.log(`       ├─ Content: ${w.workflowContent.length} chars`);
        console.log(`       └─ Nodes: ${w.nodeCount} (${w.nodeTypes.slice(0, 3).join(', ')}${w.nodeTypes.length > 3 ? '...' : ''})`);
      });
      console.log(`🤖 === END PROMPTS ===\n`);

      // LOGGING TEMPORAIRE : Sauvegarder le prompt complet pour debug
      const debugData = {
        timestamp: new Date().toISOString(),
        description,
        systemPrompt,
        userPrompt,
        similarWorkflows: similarWorkflows.map(w => ({
          name: w.name,
          filename: w.filename,
          score: w.relevanceScore,
          contentLength: w.workflowContent?.length || 0
        })),
        stats: {
          systemPromptLength: systemPrompt.length,
          userPromptLength: userPrompt.length,
          totalLength: systemPrompt.length + userPrompt.length
        }
      };
      
      try {
        // Créer le dossier debug s'il n'existe pas
        const debugDir = path.join(process.cwd(), 'debug');
        await fs.mkdir(debugDir, { recursive: true });
        
        await fs.writeFile(path.join(debugDir, 'claude-prompt-streaming.json'), JSON.stringify(debugData, null, 2));
        await fs.writeFile(path.join(debugDir, 'system-prompt-streaming.txt'), systemPrompt);
        await fs.writeFile(path.join(debugDir, 'user-prompt-streaming.txt'), userPrompt);
        console.log('💾 Debug: Prompts streaming sauvegardés dans debug/');
      } catch (e) {
        console.log('⚠️  Debug: Impossible de sauvegarder les prompts streaming:', e.message);
      }

      // Appeler Claude
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',  // New Claude model
        max_tokens: 18000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      // Extract token usage information
      const tokensUsed = {
        input: response.usage?.input_tokens || 0,
        output: response.usage?.output_tokens || 0
      };

      console.log(`📊 Tokens utilisés: ${tokensUsed.input} input, ${tokensUsed.output} output`);

      if (onProgress) {
        onProgress('parsing', { message: 'Traitement de la réponse...' });
      }

      const generatedText = response.content[0]?.type === 'text' ? response.content[0].text : '';
      console.log('✅ AI response received');
      
      // LOGS DÉTAILLÉS DE LA RÉPONSE
      console.log(`\n🤖 === CLAUDE RESPONSE ===`);
      console.log(`📜 Raw response (${generatedText.length} chars):`);
      console.log(generatedText);
      console.log(`🤖 === END RESPONSE ===\n`);

      // Parser le JSON avec amélioration robustesse
      try {
        // Extraire le JSON du texte
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        let jsonText = jsonMatch ? jsonMatch[0] : generatedText;
        
        // Sauvegarder la réponse brute pour debug
        try {
          // Créer le dossier debug s'il n'existe pas
          const debugDir = path.join(process.cwd(), 'debug');
          await fs.mkdir(debugDir, { recursive: true });
          
          await fs.writeFile(path.join(debugDir, 'claude-raw-response.txt'), generatedText);
          await fs.writeFile(path.join(debugDir, 'claude-extracted-json.txt'), jsonText);
          console.log('💾 Debug: Réponse brute sauvegardée dans debug/');
        } catch (e) {
          console.log('⚠️  Debug: Impossible de sauvegarder la réponse:', e.message);
        }
        
        // Nettoyer le JSON en supprimant les éventuels caractères parasites
        jsonText = jsonText.trim();
        
        // Tentative de parsing
        const parsedResponse = JSON.parse(jsonText);

        // Vérifier si on a la nouvelle structure avec workflow + explanation
        if (parsedResponse.workflow && parsedResponse.explanation) {
          // Nouvelle structure avec explication
          parsedResponse.workflow.name = workflowName;
          
          if (onProgress) {
            onProgress('compression', { 
              message: 'Préparation du workflow pour transmission...',
              nodesCount: parsedResponse.workflow.nodes?.length || 0
            });
          }
          
          // Préparer la transmission (compression/chunking si nécessaire)
          const transmission = await this.prepareWorkflowForTransmission(
            parsedResponse.workflow, 
            parsedResponse.explanation
          );
          
          // Envoyer selon le type de transmission
          await this.sendWorkflowTransmission(transmission, onProgress);
          
          return {
            success: true,
            workflow: parsedResponse.workflow,
            explanation: parsedResponse.explanation,
            similarWorkflows: similarWorkflows.map(w => w.name),
            similarWorkflowFiles: similarWorkflows.map(w => w.filename),
            transmissionType: transmission.type,
            tokensUsed
          };
        } else {
          // Ancienne structure - juste le workflow
          parsedResponse.name = workflowName;
          
          const explanation = {
            summary: "Workflow généré automatiquement",
            flow: "Flux de données selon les spécifications demandées",
            nodes: "Nodes sélectionnés en fonction des exemples similaires",
            notes: "Configurez les credentials nécessaires avant utilisation"
          };
          
          if (onProgress) {
            onProgress('compression', { 
              message: 'Préparation du workflow pour transmission...',
              nodesCount: parsedResponse.nodes?.length || 0
            });
          }
          
          // Préparer la transmission
          const transmission = await this.prepareWorkflowForTransmission(
            parsedResponse, 
            explanation
          );
          
          // Envoyer selon le type de transmission
          await this.sendWorkflowTransmission(transmission, onProgress);
          
          return {
            success: true,
            workflow: parsedResponse,
            explanation,
            similarWorkflows: similarWorkflows.map(w => w.name),
            transmissionType: transmission.type,
            tokensUsed
          };
        }

      } catch (parseError) {
        console.error('❌ Failed to parse generated JSON:', parseError.message);
        console.error('📍 Error position:', parseError.message);
        
        if (onProgress) {
          onProgress('error', { message: 'Erreur lors du parsing de la réponse JSON' });
        }
        
        // Essayer de réparer le JSON automatiquement
        let jsonText = generatedText.match(/\{[\s\S]*\}/)?.[0] || generatedText;
        
        try {
          // Tentatives de réparation courantes
          console.log('🔧 Tentative de réparation du JSON...');
          
          // 1. Supprimer les virgules en trop avant }
          jsonText = jsonText.replace(/,\s*}/g, '}');
          jsonText = jsonText.replace(/,\s*]/g, ']');
          
          // 2. Ajouter des virgules manquantes (très basique)
          // Cette partie pourrait être étendue selon les erreurs observées
          
          const repairedResponse = JSON.parse(jsonText);
          console.log('✅ JSON réparé avec succès !');
          
          if (repairedResponse.workflow && repairedResponse.explanation) {
            repairedResponse.workflow.name = workflowName;
            
            if (onProgress) {
              onProgress('success', { 
                message: 'Workflow généré avec succès (après réparation JSON) !',
                nodesCount: repairedResponse.workflow.nodes?.length || 0
              });
            }
            
            return {
              success: true,
              workflow: repairedResponse.workflow,
              explanation: repairedResponse.explanation,
              similarWorkflows: similarWorkflows.map(w => w.name),
              similarWorkflowFiles: similarWorkflows.map(w => w.filename),
              repaired: true
            };
          }
          
        } catch (repairError) {
          console.error('❌ Impossible de réparer le JSON:', repairError.message);

          // --- Nouveau fallback : parsing « unsafe » via Function ---
          try {
            console.log('⚠️ Tentative de parsing unsafe via Function()');
            const unsafeParsed = Function('"use strict"; return (' + jsonText + ')')();

            console.log('✅ Parsing unsafe réussi');

            // Déterminer la structure obtenue
            const finalWorkflow = unsafeParsed.workflow ? unsafeParsed.workflow : unsafeParsed;
            const finalExplanation = unsafeParsed.explanation || {
              summary: 'Workflow généré (parsing unsafe)',
              notes: 'Ce workflow a été parsé avec une méthode tolérante ; vérifiez-le avant usage.'
            };

            finalWorkflow.name = workflowName;

            if (onProgress) {
              onProgress('warning', { message: 'Workflow parsé via fallback unsafe – peut contenir des erreurs.' });
            }

            // Préparer la transmission
            const transmission = await this.prepareWorkflowForTransmission(finalWorkflow, finalExplanation);
            await this.sendWorkflowTransmission(transmission, onProgress);

            return {
              success: true,
              workflow: finalWorkflow,
              explanation: finalExplanation,
              similarWorkflows: similarWorkflows.map(w => w.name),
              similarWorkflowFiles: similarWorkflows.map(w => w.filename),
              repaired: true,
              unsafe: true,
              transmissionType: transmission.type
            };

          } catch (unsafeError) {
            console.error('❌ Parsing unsafe échoué:', unsafeError.message);
          }
        }
        
        return {
          success: false,
          error: `Failed to parse generated workflow JSON: ${parseError.message}`,
          rawResponse: generatedText,
          similarWorkflows: similarWorkflows.map(w => w.name),
          similarWorkflowFiles: similarWorkflows.map(w => w.filename)
        };
      }

    } catch (error) {
      console.error('Error in generateWorkflowFromExamplesWithStreaming:', error);
      
      if (onProgress) {
        onProgress('error', { message: 'Erreur lors de la génération', error: error.message });
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Recherche simple de workflows
   */
  async searchWorkflows(query, options = {}) {
    const { topK = 10, minScore = 0.5 } = options;

    const results = await this.findSimilarWorkflows(query, topK);
    
    // Filtrer par score minimum
    const filteredResults = results.filter(r => r.relevanceScore >= minScore);
    
    return {
      results: filteredResults,
      total: filteredResults.length
    };
  }
}

// Fonction utilitaire pour créer une instance du service
export function createWorkflowRAGService() {
  return new WorkflowRAGService();
} 