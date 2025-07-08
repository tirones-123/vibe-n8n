import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import fetch from 'node-fetch';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

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
    
    // Configuration du stockage des données complètes
    // Railway monte les volumes dans le path spécifié par RAILWAY_VOLUME_MOUNT_PATH
    this.storageDir = process.env.RAILWAY_VOLUME_MOUNT_PATH 
      ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'node-types')
      : path.join(process.cwd(), 'data', 'node-types');
    
    console.log(`📁 Stockage des node-types: ${this.storageDir}`);
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

  // Sauvegarder les données complètes d'un node sur le volume
  async saveNodeToVolume(nodeId, nodeData) {
    try {
      // Créer le dossier si nécessaire
      await fs.mkdir(this.storageDir, { recursive: true });
      
      // Utiliser un nom de fichier sûr en remplaçant les caractères problématiques
      const safeFilename = nodeId.replace(/[|:]/g, '_') + '.json';
      const filepath = path.join(this.storageDir, safeFilename);
      
      // Sauvegarder les données complètes
      await fs.writeFile(filepath, JSON.stringify(nodeData, null, 2));
      
      console.log(`💾 Node sauvegardé: ${nodeId} (${JSON.stringify(nodeData).length} caractères)`);
      
      return filepath;
    } catch (error) {
      console.error(`Erreur sauvegarde node ${nodeId}:`, error);
      throw error;
    }
  }

  // Charger les données complètes d'un node depuis le volume
  async loadNodeFromVolume(nodeId) {
    try {
      const safeFilename = nodeId.replace(/[|:]/g, '_') + '.json';
      const filepath = path.join(this.storageDir, safeFilename);
      
      const data = await fs.readFile(filepath, 'utf8');
      const nodeData = JSON.parse(data);
      
      console.log(`📖 Node chargé: ${nodeId} (${data.length} caractères)`);
      
      return nodeData;
    } catch (error) {
      console.error(`Erreur chargement node ${nodeId}:`, error);
      return null;
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
    
    console.log(`🚀 Début de la génération des embeddings (${Math.ceil(nodes.length / batchSize)} batches)...`);
    const startTime = Date.now();
    
    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, i + batchSize);
      const contents = batch.map(node => node.content);
      
      try {
        const batchStartTime = Date.now();
        console.log(`  Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(nodes.length / batchSize)} - Génération...`);
        
        const response = await this.openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: contents,
        });
        
        const batchTime = Date.now() - batchStartTime;
        console.log(`  ✓ Batch terminé en ${(batchTime / 1000).toFixed(1)}s`);
        
        // Créer les vecteurs pour Pinecone ET sauvegarder sur le volume
        for (let j = 0; j < batch.length; j++) {
          const node = batch[j];
          
          // Sauvegarder les données complètes sur le volume
          await this.saveNodeToVolume(node.id, node.rawData);
          
          // Créer le vecteur pour Pinecone avec des métadonnées minimales
          vectors.push({
            id: node.id,
            values: response.data[j].embedding,
            metadata: {
              // Métadonnées essentielles pour la recherche
              nodeName: node.metadata.nodeName,
              displayName: node.metadata.displayName,
              description: node.metadata.description,
              version: node.metadata.version,
              group: node.metadata.group,
              icon: node.metadata.icon,
              documentationUrl: node.metadata.documentationUrl,
              propertiesCount: node.metadata.propertiesCount,
              hasCredentials: node.metadata.hasCredentials,
              // Contenu textuel limité pour la recherche
              content: node.content.substring(0, 1000),
              // Indicateur que les données complètes sont sur le volume
              hasFullDataOnVolume: true
            }
          });
        }
        
        console.log(`Embeddings générés: ${Math.min(i + batchSize, nodes.length)}/${nodes.length}`);
      } catch (error) {
        console.error(`❌ Erreur batch embeddings ${Math.floor(i / batchSize) + 1}:`, error.message);
        // Continuer avec les autres batches
      }
    }
    
    const totalEmbeddingTime = Date.now() - startTime;
    console.log(`✅ Génération des embeddings terminée en ${(totalEmbeddingTime / 1000).toFixed(1)}s`);
    
    // Supprimer l'ancien namespace et recréer avec les nouvelles données
    try {
      await this.index.namespace(NAMESPACE).deleteAll();
    } catch (error) {
      // Ignorer si le namespace n'existe pas
    }
    
    // Indexer par batch dans Pinecone
    const indexBatchSize = 100;
    console.log(`\n🚀 Début de l'indexation dans Pinecone (${Math.ceil(vectors.length / indexBatchSize)} batches)...`);
    const indexStartTime = Date.now();
    
    for (let i = 0; i < vectors.length; i += indexBatchSize) {
      const batch = vectors.slice(i, i + indexBatchSize);
      const batchStartTime = Date.now();
      console.log(`  Batch ${Math.floor(i / indexBatchSize) + 1}/${Math.ceil(vectors.length / indexBatchSize)} - Indexation...`);
      
      try {
        await this.index.namespace(NAMESPACE).upsert(batch);
        const batchTime = Date.now() - batchStartTime;
        console.log(`  ✓ Batch indexé en ${(batchTime / 1000).toFixed(1)}s`);
        console.log(`Indexé: ${Math.min(i + indexBatchSize, vectors.length)}/${vectors.length} nodes`);
      } catch (error) {
        console.error(`❌ Erreur indexation batch ${Math.floor(i / indexBatchSize) + 1}:`, error.message);
      }
    }
    
    const totalIndexTime = Date.now() - indexStartTime;
    console.log(`✅ Indexation terminée en ${(totalIndexTime / 1000).toFixed(1)}s`);
    
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
      
      let found = false;
      
      for (const possibleName of possibleNames) {
        // Si pas de version spécifiée, essayer de trouver la dernière version depuis le volume
        if (!version) {
          try {
            // Lister les fichiers du volume pour ce node
            const files = await fs.readdir(this.storageDir);
            const nodeFiles = files.filter(f => {
              const prefix = possibleName.replace(/[|:]/g, '_') + '_v';
              return f.startsWith(prefix) && f.endsWith('.json');
            });
            
            if (nodeFiles.length > 0) {
              // Extraire les versions et prendre la plus haute
              const versions = nodeFiles.map(f => {
                const match = f.match(/_v([\d.]+)\.json$/);
                return match ? match[1] : null;
              }).filter(v => v !== null);
              
              if (versions.length > 0) {
                // Trier les versions pour prendre la plus haute
                // Comparer les versions en tenant compte des points (ex: 2.3 > 2.1 > 1)
                const maxVersion = versions.sort((a, b) => {
                  const aParts = a.split('.').map(Number);
                  const bParts = b.split('.').map(Number);
                  
                  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                    const aPart = aParts[i] || 0;
                    const bPart = bParts[i] || 0;
                    if (aPart !== bPart) {
                      return bPart - aPart; // Ordre décroissant
                    }
                  }
                  return 0;
                })[0];
                
                const nodeId = `${possibleName}|v${maxVersion}`;
                
                console.log(`📌 Pas de version spécifiée pour ${nodeName}, utilisation de v${maxVersion} (trouvée sur le volume)`);
                
                // Charger les données depuis le volume
                const fullData = await this.loadNodeFromVolume(nodeId);
                
                if (fullData) {
                  console.log(`✅ Données complètes chargées depuis le volume pour ${nodeName} v${maxVersion} (${JSON.stringify(fullData).length} caractères)`);
                  
                  // Essayer de récupérer les métadonnées depuis Pinecone si possible
                  let metadata = {
                    nodeName: possibleName,
                    displayName: fullData.displayName || possibleName,
                    description: fullData.description || '',
                    version: maxVersion,
                    group: fullData.group || []
                  };
                  
                  try {
                    const response = await this.index.namespace(NAMESPACE).fetch([nodeId]);
                    if (response.records && response.records[nodeId]) {
                      metadata = response.records[nodeId].metadata || metadata;
                    }
                  } catch (error) {
                    // Ignorer l'erreur, utiliser les métadonnées par défaut
                  }
                  
                  results.push({
                    nodeName,
                    version: maxVersion,
                    metadata,
                    fullData
                  });
                  
                  found = true;
                  break;
                }
              }
            }
          } catch (error) {
            console.error(`Erreur recherche versions pour ${possibleName}:`, error);
          }
        } else {
          // Version spécifiée, utiliser l'ancien code
          const nodeId = `${possibleName}|v${version}`;
          
          try {
            // Récupérer directement par ID depuis Pinecone
            const response = await this.index.namespace(NAMESPACE).fetch([nodeId]);
            
            if (response.records && response.records[nodeId]) {
              const record = response.records[nodeId];
              
              // Charger les données complètes depuis le volume
              let fullData = null;
              
              if (record.metadata.hasFullDataOnVolume) {
                // Charger depuis le volume
                fullData = await this.loadNodeFromVolume(nodeId);
                
                if (fullData) {
                  console.log(`✅ Données complètes chargées depuis le volume pour ${nodeName} v${version} (${JSON.stringify(fullData).length} caractères)`);
                } else {
                  console.warn(`⚠️  Données non trouvées sur le volume pour ${nodeId}, utilisation des métadonnées Pinecone`);
                  // Fallback: essayer de reconstruire depuis les métadonnées
                  fullData = {
                    name: record.metadata.nodeName,
                    displayName: record.metadata.displayName,
                    description: record.metadata.description,
                    version: record.metadata.version,
                    group: record.metadata.group
                  };
                }
              } else {
                // Ancien système: essayer de parser depuis fullData si présent
                try {
                  if (record.metadata.fullData) {
                    fullData = JSON.parse(record.metadata.fullData);
                    console.log(`📦 Données récupérées depuis Pinecone pour ${nodeName} v${version} (legacy)`);
                  }
                } catch (error) {
                  console.error(`Erreur parsing fullData pour ${nodeName}:`, error.message);
                }
              }
              
              results.push({
                nodeName,
                version,
                metadata: record.metadata,
                fullData
              });
              
              found = true;
              break; // On a trouvé le node, pas besoin de continuer
            }
          } catch (error) {
            console.error(`Erreur récupération ${nodeId}:`, error);
          }
        }
      }
      
      if (!found) {
        console.warn(`⚠️  Node non trouvé: ${nodeName} v${version || 'any'}`);
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
    
    return await Promise.all(searchResponse.matches.map(async (match) => {
      let fullData = null;
      
      if (match.metadata.hasFullDataOnVolume) {
        // Charger depuis le volume
        const nodeId = match.id;
        fullData = await this.loadNodeFromVolume(nodeId);
        
        if (!fullData) {
          console.warn(`⚠️  Données non trouvées sur le volume pour ${nodeId}`);
          // Fallback avec les métadonnées
          fullData = {
            name: match.metadata.nodeName,
            displayName: match.metadata.displayName,
            description: match.metadata.description,
            version: match.metadata.version,
            group: match.metadata.group
          };
        }
      } else {
        // Ancien système: essayer de parser depuis fullData
        try {
          if (match.metadata.fullData) {
            fullData = JSON.parse(match.metadata.fullData);
          }
        } catch (error) {
          console.error(`Erreur parsing fullData pour ${match.metadata.nodeName}:`, error.message);
        }
      }
      
      return {
        nodeName: match.metadata.nodeName,
        score: match.score,
        metadata: match.metadata,
        fullData
      };
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
        totalNodes: stats.namespaces?.[NAMESPACE]?.recordCount || stats.namespaces?.[NAMESPACE]?.vectorCount || 0,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erreur stats:', error);
      return null;
    }
  }

  // Fonction pour tronquer un JSON de manière sûre
  truncateJsonSafely(jsonString, maxLength = 39900) {  // MAXIMUM Pinecone (~40KB)
    if (jsonString.length <= maxLength) {
      return jsonString;
    }
    
    try {
      const obj = JSON.parse(jsonString);
      
      // Essayer de réduire progressivement le contenu
      const reducedObj = { ...obj };
      
      // Garder plus de propriétés (20 au lieu de 10)
      if (reducedObj.properties && Array.isArray(reducedObj.properties)) {
        // Garder plus de propriétés avec plus de détails
        reducedObj.properties = reducedObj.properties.slice(0, 20).map(prop => ({
          displayName: prop.displayName,
          name: prop.name,
          type: prop.type,
          description: prop.description?.substring(0, 500) || '',  // Plus de description
          required: prop.required,
          default: prop.default,
          options: prop.options ? (Array.isArray(prop.options) ? prop.options.slice(0, 10) : prop.options) : undefined,
          typeOptions: prop.typeOptions,
          displayOptions: prop.displayOptions
        }));
      }
      
      // Garder les options importantes au lieu de les supprimer
      if (reducedObj.options && typeof reducedObj.options === 'object') {
        // Garder les options mais limiter leur taille si nécessaire
        if (JSON.stringify(reducedObj.options).length > 5000) {
          reducedObj.options = { ...reducedObj.options };
          // Simplifier seulement si vraiment nécessaire
        }
      }
      
      const reducedJson = JSON.stringify(reducedObj);
      
      if (reducedJson.length <= maxLength) {
        return reducedJson;
      }
      
      // Si c'est encore trop gros, réduire les descriptions mais garder la structure
      if (reducedObj.properties) {
        reducedObj.properties = reducedObj.properties.slice(0, 15).map(prop => ({
          displayName: prop.displayName,
          name: prop.name,
          type: prop.type,
          description: prop.description?.substring(0, 100) || '',  // Descriptions plus courtes
          required: prop.required,
          default: prop.default
        }));
      }
      
      const finalJson = JSON.stringify(reducedObj);
      
      if (finalJson.length <= maxLength) {
        return finalJson;
      }
      
      // Dernier recours : garder l'essentiel mais avec plus de propriétés
      const minimal = {
        name: obj.name,
        displayName: obj.displayName,
        description: obj.description,
        version: obj.version,
        group: obj.group,
        inputs: obj.inputs,
        outputs: obj.outputs,
        credentials: obj.credentials,
        properties: obj.properties?.slice(0, 10).map(prop => ({
          displayName: prop.displayName,
          name: prop.name,
          type: prop.type,
          required: prop.required
        })) || []
      };
      
      return JSON.stringify(minimal);
      
    } catch (error) {
      console.error('Erreur lors de la troncature JSON:', error);
      // Fallback: tronquer brutalement mais garder plus de contenu
      return jsonString.substring(0, maxLength - 100) + '..."TRUNCATED"}';
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