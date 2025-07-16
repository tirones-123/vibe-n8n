import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

export class WorkflowRAGService {
  constructor() {
    if (!process.env.PINECONE_API_KEY || !process.env.OPENAI_API_KEY || !process.env.CLAUDE_API_KEY) {
      throw new Error('Missing required environment variables for Workflow RAG service');
    }

    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY
    });

    const indexName = process.env.PINECONE_WORKFLOW_INDEX || 'n8n-workflows';
    this.index = this.pinecone.index(indexName);
    // Use relative path from the current file location
    this.workflowsDir = path.join(process.cwd(), 'workflows');
    // Optimized workflows for RAG context (Claude prompts)
    this.optimizedWorkflowsDir = path.join(process.cwd(), 'workflows-rag-optimized');
  }

  /**
   * Recherche des workflows similaires
   */
  async findSimilarWorkflows(description, topK = 5) {
    try {
      // Générer l'embedding pour la description
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: description,
        encoding_format: 'float'
      });

      const queryEmbedding = embeddingResponse.data[0].embedding;

      // Rechercher dans Pinecone
      const searchResults = await this.index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true
      });

      // Transformer les résultats
      const workflows = [];
      
      for (const match of searchResults.matches || []) {
        const workflow = {
          id: match.id,
          filename: match.metadata?.filename || '',
          name: match.metadata?.name || '',
          nodes: match.metadata?.nodes || [],
          relevanceScore: match.score || 0
        };
        
        // Charger le contenu complet du workflow
        try {
          // Load from optimized workflows only
          const optimizedFilePath = path.join(this.optimizedWorkflowsDir, workflow.filename);
          workflow.workflowContent = await fs.readFile(optimizedFilePath, 'utf-8');
          console.log(`✅ Loaded optimized workflow: ${workflow.filename}`);
        } catch (error) {
          console.log(`⏭️  Skipping workflow (not in optimized set): ${workflow.filename}`);
          // Skip this workflow - will use next one from Pinecone results
          continue;
        }
        
        workflows.push(workflow);
      }

      return workflows;

    } catch (error) {
      console.error('Error in findSimilarWorkflows:', error);
      throw error;
    }
  }

  /**
   * Génère un workflow basé sur des exemples similaires
   */
  async generateWorkflowFromExamples(description, options = {}) {
    const { topK = 3, workflowName = 'Generated Workflow' } = options;

    try {
      console.log('🔍 Searching for similar workflows...');
      
      // Trouver des workflows similaires
      const similarWorkflows = await this.findSimilarWorkflows(description, topK);
      
      if (similarWorkflows.length === 0) {
        return {
          success: false,
          error: 'No similar workflows found in the database'
        };
      }

      console.log(`Found ${similarWorkflows.length} similar workflows:`);
      similarWorkflows.forEach((w, i) => {
        console.log(`  ${i + 1}. ${w.name} (score: ${w.relevanceScore.toFixed(3)})`);
      });

      // Construire le prompt pour Claude
      const systemPrompt = `You are an n8n workflow expert. Based on the following similar workflow examples, create a new workflow that meets the user's requirement.

The workflow should:
- Be fully functional and ready to import into n8n
- Use appropriate nodes based on the user's needs
- Follow n8n workflow structure conventions
- Have proper connections between nodes
- Include all necessary configurations
- Use the exact node type formats from the examples (e.g., "nodes-base.webhook")
- Avoid using http request node when possible
- The references in the connections section must point to the name property of each node.

Respond with a JSON object containing both the workflow and an explanation:
{
  "workflow": { /* the complete n8n workflow JSON */ },
  "explanation": {
    "summary": "Brief description of what this workflow does",
    "flow": "Step-by-step explanation of the workflow flow",
    "nodes": "Description of key nodes and their roles",
    "notes": "Any important configuration notes or requirements"
  }
}`;

      // Construire le contexte avec les workflows d'exemple
      const examplesContext = similarWorkflows
        .filter(w => w.workflowContent)
        .map((w, i) => {
          const workflowData = JSON.parse(w.workflowContent);
          const nodeTypes = workflowData.nodes?.map((n) => n.type).join(', ') || 'Unknown';
          
          return `Example ${i + 1} (Similarity: ${w.relevanceScore.toFixed(3)}):
Filename: ${w.filename}
Nodes: ${nodeTypes}

Full JSON:
\`\`\`json
${w.workflowContent}
\`\`\``;
        }).join('\n\n---\n\n');

      const userPrompt = `"${description}"

Here are ${similarWorkflows.length} similar workflow examples for reference:

${examplesContext}

Based on these examples, create a new workflow that fulfills the user's requirement above.`;

      console.log(`\n📤 Sending to Claude with ${similarWorkflows.length} examples...`);

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
        await fs.writeFile(path.join(process.cwd(), 'debug', 'claude-prompt.json'), JSON.stringify(debugData, null, 2));
        console.log('💾 Debug: Prompt sauvegardé dans debug/claude-prompt.json');
      } catch (e) {
        console.log('⚠️  Debug: Impossible de sauvegarder le prompt');
      }

      // Appeler Claude
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',  // New Claude model
        max_tokens: 8000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      const generatedText = response.content[0]?.type === 'text' ? response.content[0].text : '';
      console.log('✅ Claude response received');

      // Parser le JSON
      try {
        // Extraire le JSON du texte
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : generatedText;
        const response = JSON.parse(jsonText);

        // Vérifier si on a la nouvelle structure avec workflow + explanation
        if (response.workflow && response.explanation) {
          // Nouvelle structure avec explication
          response.workflow.name = workflowName;
          
          return {
            success: true,
            workflow: response.workflow,
            explanation: response.explanation,
            similarWorkflows: similarWorkflows.map(w => w.name)
          };
        } else {
          // Ancienne structure - juste le workflow
          response.name = workflowName;
          
          return {
            success: true,
            workflow: response,
            explanation: {
              summary: "Workflow généré automatiquement",
              flow: "Flux de données selon les spécifications demandées",
              nodes: "Nodes sélectionnés en fonction des exemples similaires",
              notes: "Configurez les credentials nécessaires avant utilisation"
            },
            similarWorkflows: similarWorkflows.map(w => w.name)
          };
        }

      } catch (parseError) {
        console.error('Failed to parse generated JSON:', parseError);
        
        return {
          success: false,
          error: 'Failed to parse generated workflow JSON',
          workflow: generatedText,
          similarWorkflows: similarWorkflows.map(w => w.name)
        };
      }

    } catch (error) {
      console.error('Error in generateWorkflowFromExamples:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Génère un workflow avec streaming et callbacks de progression
   */
  async generateWorkflowFromExamplesWithStreaming(description, options = {}) {
    const { topK = 3, workflowName = 'Generated Workflow', onProgress } = options;

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
          message: 'Construction du contexte pour Claude...',
          workflows: similarWorkflows.map(w => w.name)
        });
      }

      // Construire le prompt pour Claude (même logique que la méthode originale)
      const systemPrompt = `You are an n8n workflow expert. Based on the following similar workflow examples, create a new workflow that meets the user's requirement.

The workflow should:
- Be fully functional and ready to import into n8n
- Use appropriate nodes based on the user's needs
- Follow n8n workflow structure conventions
- Have proper connections between nodes
- Include all necessary configurations
- Use the exact node type formats from the examples (e.g., "nodes-base.webhook")
- Avoid using http request node when possible
- The references in the connections section must point to the name property of each node.

Respond with a JSON object containing both the workflow and an explanation:
{
  "workflow": { /* the complete n8n workflow JSON */ },
  "explanation": {
    "summary": "Brief description of what this workflow does",
    "flow": "Step-by-step explanation of the workflow flow",
    "nodes": "Description of key nodes and their roles",
    "notes": "Any important configuration notes or requirements"
  }
}`;

      // Construire le contexte avec les workflows d'exemple
      const examplesContext = similarWorkflows
        .filter(w => w.workflowContent)
        .map((w, i) => {
          const workflowData = JSON.parse(w.workflowContent);
          const nodeTypes = workflowData.nodes?.map((n) => n.type).join(', ') || 'Unknown';
          
          return `Example ${i + 1} (Similarity: ${w.relevanceScore.toFixed(3)}):
Filename: ${w.filename}
Nodes: ${nodeTypes}

Full JSON:
\`\`\`json
${w.workflowContent}
\`\`\``;
        }).join('\n\n---\n\n');

      const userPrompt = `"${description}"

Here are ${similarWorkflows.length} similar workflow examples for reference:

${examplesContext}

Based on these examples, create a new workflow that fulfills the user's requirement above.`;

      if (onProgress) {
        onProgress('claude_call', { 
          message: 'Envoi de la requête à Claude AI...',
          promptLength: systemPrompt.length + userPrompt.length
        });
      }

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
        await fs.writeFile(path.join(process.cwd(), 'debug', 'claude-prompt.json'), JSON.stringify(debugData, null, 2));
        console.log('💾 Debug: Prompt sauvegardé dans debug/claude-prompt.json');
      } catch (e) {
        console.log('⚠️  Debug: Impossible de sauvegarder le prompt');
      }

      // Appeler Claude
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',  // New Claude model
        max_tokens: 8000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      if (onProgress) {
        onProgress('parsing', { message: 'Traitement de la réponse de Claude...' });
      }

      const generatedText = response.content[0]?.type === 'text' ? response.content[0].text : '';
      console.log('✅ Claude response received');

      // Parser le JSON
      try {
        // Extraire le JSON du texte
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : generatedText;
        const parsedResponse = JSON.parse(jsonText);

        // Vérifier si on a la nouvelle structure avec workflow + explanation
        if (parsedResponse.workflow && parsedResponse.explanation) {
          // Nouvelle structure avec explication
          parsedResponse.workflow.name = workflowName;
          
          if (onProgress) {
            onProgress('success', { 
              message: 'Workflow généré avec succès !',
              nodesCount: parsedResponse.workflow.nodes?.length || 0
            });
          }
          
          return {
            success: true,
            workflow: parsedResponse.workflow,
            explanation: parsedResponse.explanation,
            similarWorkflows: similarWorkflows.map(w => w.name)
          };
        } else {
          // Ancienne structure - juste le workflow
          parsedResponse.name = workflowName;
          
          if (onProgress) {
            onProgress('success', { 
              message: 'Workflow généré avec succès (format simple) !',
              nodesCount: parsedResponse.nodes?.length || 0
            });
          }
          
          return {
            success: true,
            workflow: parsedResponse,
            explanation: {
              summary: "Workflow généré automatiquement",
              flow: "Flux de données selon les spécifications demandées",
              nodes: "Nodes sélectionnés en fonction des exemples similaires",
              notes: "Configurez les credentials nécessaires avant utilisation"
            },
            similarWorkflows: similarWorkflows.map(w => w.name)
          };
        }

      } catch (parseError) {
        console.error('Failed to parse generated JSON:', parseError);
        
        if (onProgress) {
          onProgress('error', { message: 'Erreur lors du parsing de la réponse' });
        }
        
        return {
          success: false,
          error: 'Failed to parse generated workflow JSON',
          workflow: generatedText,
          similarWorkflows: similarWorkflows.map(w => w.name)
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