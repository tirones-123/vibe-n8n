import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import fetch from 'node-fetch';
import axios from 'axios';

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
  async fetchNodeTypes() {
    try {
      const n8nUrl = this.n8nInstanceUrl || process.env.N8N_INSTANCE_URL || 'https://primary-production-fc906.up.railway.app';
      const endpoint = `${n8nUrl}/types/nodes.json`;
      
      console.log(`Récupération des node-types depuis ${endpoint}...`);
      
      const response = await axios.get(endpoint, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'n8n-node-types-updater/1.0'
        },
        timeout: 30000
      });
      
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // The response is already an array of node types
      const nodeTypes = response.data;
      
      if (!Array.isArray(nodeTypes)) {
        throw new Error('Expected an array of node types');
      }
      
      console.log(`✅ ${nodeTypes.length} node-types récupérés`);
      
      return nodeTypes;
    } catch (error) {
      console.error('Erreur récupération node-types:', error);
      throw error;
    }
  }

  // Formater les données d'un node pour l'indexation
  formatNodeForIndexing(nodeData) {
    const nodeName = nodeData.name;
    const displayName = nodeData.displayName || nodeName;
    const description = nodeData.description || 'No description';
    // Gérer le cas où version peut être un tableau
    const version = Array.isArray(nodeData.version) ? 
                    Math.max(...nodeData.version) : 
                    (nodeData.version || 1);
    const group = nodeData.group || [];
    
    // Construire le contenu textuel pour l'embedding
    const content = [
      `Node: ${nodeName}`,
      `Display Name: ${displayName}`,
      `Description: ${description}`,
      `Group: ${group.join(', ') || 'Uncategorized'}`,
      `Version: ${version}`,
      ''
    ];
    
    // Ajouter les propriétés importantes
    if (nodeData.properties && Array.isArray(nodeData.properties)) {
      content.push('Properties:');
      nodeData.properties.forEach(prop => {
        content.push(`- ${prop.displayName || prop.name}: ${prop.description || prop.type || ''}`);
      });
    }
    
    // Ajouter les inputs/outputs (gérer les différents formats)
    if (nodeData.inputs) {
      content.push('', 'Inputs:');
      if (Array.isArray(nodeData.inputs)) {
        content.push(nodeData.inputs.join(', '));
      } else {
        content.push(JSON.stringify(nodeData.inputs));
      }
    }
    
    if (nodeData.outputs) {
      content.push('', 'Outputs:');
      if (Array.isArray(nodeData.outputs)) {
        content.push(nodeData.outputs.join(', '));
      } else {
        content.push(JSON.stringify(nodeData.outputs));
      }
    }
    
    // Ajouter les credentials si présentes
    if (nodeData.credentials?.length) {
      content.push('', 'Credentials:');
      nodeData.credentials.forEach(cred => {
        content.push(`- ${cred.displayName || cred.name}`);
      });
    }
    
    return {
      id: `${nodeName}|v${version}`,
      content: content.join('\n'),
      metadata: {
        nodeName,
        displayName,
        description,
        version,
        group,
        // Gérer le cas où icon peut être un objet ou une string
        icon: typeof nodeData.icon === 'string' ? nodeData.icon : 
              typeof nodeData.iconUrl === 'string' ? nodeData.iconUrl : 
              nodeData.icon?.light || nodeData.icon?.dark || '',
        documentationUrl: nodeData.documentationUrl || nodeData.codex?.resources?.primaryDocumentation?.[0]?.url || '',
        // Simplifier les propriétés pour Pinecone (pas d'objets complexes)
        propertiesCount: nodeData.properties?.length || 0,
        hasCredentials: (nodeData.credentials?.length || 0) > 0
      },
      rawData: nodeData
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
  async indexNodeTypes(nodeTypesArray) {
    console.log('Indexation des node-types dans Pinecone...');
    
    if (!Array.isArray(nodeTypesArray)) {
      throw new Error('nodeTypesArray doit être un tableau');
    }
    
    const nodes = [];
    
    // Préparer les données pour chaque node
    for (const nodeData of nodeTypesArray) {
      try {
        const formattedNode = this.formatNodeForIndexing(nodeData);
        nodes.push(formattedNode);
      } catch (error) {
        console.error(`Erreur formatage ${nodeData.name}:`, error);
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
              // Stocker les données complètes en JSON string (limite Pinecone: ~40KB par metadata)
              fullData: JSON.stringify(node.rawData).substring(0, 35000)
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
      
      // Essayer plusieurs formats de noms
      const possibleNames = [
        nodeName, // nom court (ex: httpRequest)
        `n8n-nodes-base.${nodeName}`, // nom standard n8n
        `@n8n/n8n-nodes-langchain.${nodeName}`, // nodes langchain
      ];
      
      for (const possibleName of possibleNames) {
        const nodeId = version ? `${possibleName}|v${version}` : null;
        
        if (nodeId) {
          try {
            // Récupérer directement par ID
            const response = await this.index.namespace(NAMESPACE).fetch([nodeId]);
            
            if (response.records && response.records[nodeId]) {
            const record = response.records[nodeId];
            let fullData = null;
            try {
              if (record.metadata.fullData) {
                fullData = JSON.parse(record.metadata.fullData);
              }
            } catch (error) {
              console.error(`Erreur parsing fullData pour ${nodeName}:`, error.message);
            }
            
              results.push({
                nodeName,
                version,
                metadata: record.metadata,
                fullData
              });
              
              // On a trouvé le node, pas besoin de continuer
              break;
            }
          } catch (error) {
            console.error(`Erreur récupération ${nodeId}:`, error);
          }
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
    
    return searchResponse.matches.map(match => {
      let fullData = null;
      try {
        if (match.metadata.fullData) {
          fullData = JSON.parse(match.metadata.fullData);
        }
      } catch (error) {
        console.error(`Erreur parsing fullData pour ${match.metadata.nodeName}:`, error.message);
      }
      
      return {
        nodeName: match.metadata.nodeName,
        score: match.score,
        metadata: match.metadata,
        fullData
      };
    });
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
export async function updateNodeTypesIndex() {
  await nodeTypesRAG.initialize();
  
  // Récupérer les node-types
  const nodeTypes = await nodeTypesRAG.fetchNodeTypes();
  
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