import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import fetch from 'node-fetch';

// Configuration
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536;
const INDEX_NAME = 'n8n-node-types';
const NAMESPACE = 'node-types-latest';

class NodeTypesRAG {
  constructor() {
    this.openai = null;
    this.pinecone = null;
    this.index = null;
    this.initialized = false;
  }

  // Initialisation des clients
  async initializeClients() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for embeddings generation');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is required for vector storage');
    }

    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    // Vérifier/créer l'index
    try {
      const indexes = await this.pinecone.listIndexes();
      const indexExists = indexes.indexes?.some(idx => idx.name === INDEX_NAME);
      
      if (!indexExists) {
        console.log(`Création de l'index Pinecone '${INDEX_NAME}'...`);
        await this.pinecone.createIndex({
          name: INDEX_NAME,
          dimension: EMBEDDING_DIMENSION,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });
        
        await this.waitForIndexReady();
      }
      
      this.index = this.pinecone.index(INDEX_NAME);
      console.log(`Index Pinecone '${INDEX_NAME}' prêt`);
      
    } catch (error) {
      console.error('Erreur Pinecone:', error);
      throw error;
    }
  }

  // Attendre que l'index soit prêt
  async waitForIndexReady() {
    let ready = false;
    let attempts = 0;
    
    while (!ready && attempts < 60) {
      try {
        const description = await this.pinecone.describeIndex(INDEX_NAME);
        ready = description.status?.ready;
        
        if (!ready) {
          console.log('En attente que l\'index soit prêt...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (error) {
        console.log('Index pas encore disponible...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      attempts++;
    }
    
    if (!ready) {
      throw new Error('Timeout: l\'index n\'est pas prêt après 5 minutes');
    }
  }

  // Récupérer les node-types depuis n8n
  async fetchNodeTypes(n8nUrl = 'http://localhost:5678') {
    try {
      console.log(`Récupération des node-types depuis ${n8nUrl}/rest/node-types...`);
      const response = await fetch(`${n8nUrl}/rest/node-types`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`${Object.keys(data).length} node-types récupérés`);
      
      return data;
    } catch (error) {
      console.error('Erreur récupération node-types:', error);
      throw error;
    }
  }

  // Formater les données d'un node pour l'indexation
  formatNodeForIndexing(nodeName, nodeData) {
    // Extraire la version la plus haute
    const versions = Object.keys(nodeData).map(v => parseFloat(v)).sort((a, b) => b - a);
    const latestVersion = versions[0];
    const latestNodeData = nodeData[latestVersion];
    
    // Construire le contenu textuel pour l'embedding
    const content = [
      `Node: ${nodeName}`,
      `Display Name: ${latestNodeData.displayName}`,
      `Description: ${latestNodeData.description || 'No description'}`,
      `Group: ${latestNodeData.group?.join(', ') || 'Uncategorized'}`,
      `Version: ${latestVersion}`,
      '',
      'Properties:'
    ];
    
    // Ajouter les propriétés importantes
    if (latestNodeData.properties) {
      latestNodeData.properties.forEach(prop => {
        content.push(`- ${prop.displayName}: ${prop.description || prop.name}`);
      });
    }
    
    // Ajouter les inputs/outputs
    if (latestNodeData.inputs?.length) {
      content.push('', 'Inputs:');
      content.push(latestNodeData.inputs.join(', '));
    }
    
    if (latestNodeData.outputs?.length) {
      content.push('', 'Outputs:');
      content.push(latestNodeData.outputs.join(', '));
    }
    
    return {
      id: `${nodeName}|v${latestVersion}`,
      content: content.join('\n'),
      metadata: {
        nodeName,
        displayName: latestNodeData.displayName,
        description: latestNodeData.description || '',
        version: latestVersion,
        group: latestNodeData.group || [],
        icon: latestNodeData.icon,
        documentationUrl: latestNodeData.documentationUrl,
        properties: latestNodeData.properties?.map(p => ({
          name: p.name,
          displayName: p.displayName,
          type: p.type,
          required: p.required || false
        })) || []
      },
      rawData: latestNodeData
    };
  }

  // Générer l'embedding pour un node
  async generateNodeEmbedding(nodeContent) {
    try {
      const response = await this.openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: nodeContent,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Erreur génération embedding:', error);
      throw error;
    }
  }

  // Indexer tous les node-types
  async indexNodeTypes(nodeTypes) {
    console.log('Indexation des node-types dans Pinecone...');
    
    const nodes = [];
    const nodeNames = Object.keys(nodeTypes);
    
    // Préparer les données pour chaque node
    for (const nodeName of nodeNames) {
      try {
        const formattedNode = this.formatNodeForIndexing(nodeName, nodeTypes[nodeName]);
        nodes.push(formattedNode);
      } catch (error) {
        console.error(`Erreur formatage ${nodeName}:`, error);
      }
    }
    
    console.log(`${nodes.length} nodes à indexer`);
    
    // Générer les embeddings par batch
    const batchSize = 20;
    const vectors = [];
    
    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, i + batchSize);
      const contents = batch.map(node => node.content);
      
      try {
        const response = await this.openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: contents,
        });
        
        // Créer les vecteurs pour Pinecone
        batch.forEach((node, idx) => {
          vectors.push({
            id: node.id,
            values: response.data[idx].embedding,
            metadata: {
              ...node.metadata,
              content: node.content.substring(0, 1000), // Limiter pour les métadonnées
              fullData: JSON.stringify(node.rawData).substring(0, 3000) // Données complètes limitées
            }
          });
        });
        
        console.log(`Embeddings générés: ${Math.min(i + batchSize, nodes.length)}/${nodes.length}`);
      } catch (error) {
        console.error('Erreur batch embeddings:', error);
      }
    }
    
    // Supprimer l'ancien namespace et recréer avec les nouvelles données
    try {
      await this.index.namespace(NAMESPACE).deleteAll();
    } catch (error) {
      // Ignorer si le namespace n'existe pas
    }
    
    // Indexer par batch dans Pinecone
    const indexBatchSize = 100;
    for (let i = 0; i < vectors.length; i += indexBatchSize) {
      const batch = vectors.slice(i, i + indexBatchSize);
      await this.index.namespace(NAMESPACE).upsert(batch);
      console.log(`Indexé: ${Math.min(i + indexBatchSize, vectors.length)}/${vectors.length} nodes`);
    }
    
    console.log('Indexation terminée');
    
    // Retourner un mapping simple des versions
    const versionsMap = {};
    nodes.forEach(node => {
      versionsMap[node.metadata.nodeName] = node.metadata.version;
    });
    
    return versionsMap;
  }

  // Rechercher des nodes par leurs noms exacts
  async fetchNodesByNames(nodeNames, versions = {}) {
    const results = [];
    
    for (const nodeName of nodeNames) {
      const version = versions[nodeName];
      const nodeId = version ? `${nodeName}|v${version}` : null;
      
      if (nodeId) {
        try {
          // Récupérer directement par ID
          const response = await this.index.namespace(NAMESPACE).fetch([nodeId]);
          
          if (response.records && response.records[nodeId]) {
            const record = response.records[nodeId];
            results.push({
              nodeName,
              version,
              metadata: record.metadata,
              fullData: record.metadata.fullData ? JSON.parse(record.metadata.fullData) : null
            });
          }
        } catch (error) {
          console.error(`Erreur récupération ${nodeId}:`, error);
        }
      }
    }
    
    return results;
  }

  // Recherche sémantique de nodes (optionnel, pour des cas avancés)
  async searchNodes(query, topK = 5) {
    const queryResponse = await this.openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: query,
    });
    
    const searchResponse = await this.index.namespace(NAMESPACE).query({
      vector: queryResponse.data[0].embedding,
      topK,
      includeMetadata: true
    });
    
    return searchResponse.matches.map(match => ({
      nodeName: match.metadata.nodeName,
      score: match.score,
      metadata: match.metadata,
      fullData: match.metadata.fullData ? JSON.parse(match.metadata.fullData) : null
    }));
  }

  // Initialisation
  async initialize() {
    if (this.initialized) return;
    
    console.log('Initialisation du NodeTypes RAG...');
    await this.initializeClients();
    this.initialized = true;
  }

  // Statistiques
  async getStats() {
    try {
      const stats = await this.index.namespace(NAMESPACE).describeIndexStats();
      return {
        totalNodes: stats.namespaces?.[NAMESPACE]?.vectorCount || 0,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erreur stats:', error);
      return null;
    }
  }
}

// Export singleton
export const nodeTypesRAG = new NodeTypesRAG();

// Fonction helper pour mettre à jour les node-types
export async function updateNodeTypesIndex(n8nUrl = 'http://localhost:5678') {
  await nodeTypesRAG.initialize();
  
  // Récupérer les node-types
  const nodeTypes = await nodeTypesRAG.fetchNodeTypes(n8nUrl);
  
  // Indexer dans Pinecone
  const versionsMap = await nodeTypesRAG.indexNodeTypes(nodeTypes);
  
  const stats = await nodeTypesRAG.getStats();
  
  return {
    versionsMap,
    stats,
    nodesCount: Object.keys(versionsMap).length
  };
}

// Fonction helper pour récupérer des nodes spécifiques
export async function getNodeTypesByNames(nodeNames, versions = {}) {
  await nodeTypesRAG.initialize();
  return await nodeTypesRAG.fetchNodesByNames(nodeNames, versions);
} 