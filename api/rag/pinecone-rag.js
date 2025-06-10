import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Configuration
const CHUNK_SIZE = 400; // tokens par chunk
const OVERLAP = 50; // tokens de chevauchement
const EMBEDDING_MODEL = 'text-embedding-3-small'; // Modèle économique d'OpenAI
const EMBEDDING_DIMENSION = 1536;
const TOP_K = 10; // nombre de chunks à retourner
const INDEX_NAME = 'n8n-docs'; // Nom de l'index Pinecone

class N8nPineconeRAG {
  constructor() {
    this.openai = null;
    this.pinecone = null;
    this.index = null;
    this.initialized = false;
    this.namespace = 'n8n-documentation';
  }

  // Initialisation des clients
  async initializeClients() {
    // OpenAI pour les embeddings uniquement
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for embeddings generation');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Pinecone pour le stockage vectoriel
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is required for vector storage');
    }

    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    // Vérifier si l'index existe, sinon le créer
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
        
        // Attendre que l'index soit prêt
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
      throw new Error('Timeout: l\'index Pinecone n\'est pas prêt après 5 minutes');
    }
  }

  // Découpage intelligent des documents
  async chunkDocuments(documents) {
    const chunks = [];
    
    for (const doc of documents) {
      const lines = doc.content.split('\n');
      let currentChunk = {
        content: '',
        metadata: {
          source: doc.source,
          type: doc.type,
          startLine: 0,
          endLine: 0,
          section: ''
        }
      };
      
      let tokenCount = 0;
      let currentSection = 'Introduction';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineTokens = this.estimateTokens(line);
        
        // Détection des sections importantes
        if (this.isSectionHeader(line)) {
          currentSection = this.extractSectionName(line);
          
          // Commencer un nouveau chunk si on a déjà du contenu
          if (currentChunk.content.length > 100) {
            chunks.push({ ...currentChunk });
            currentChunk = {
              content: '',
              metadata: {
                ...currentChunk.metadata,
                startLine: i,
                section: currentSection
              }
            };
            tokenCount = 0;
          }
        }
        
        // Ajouter la ligne au chunk actuel
        currentChunk.content += line + '\n';
        currentChunk.metadata.section = currentSection;
        tokenCount += lineTokens;
        
        // Si on dépasse la taille limite, créer un nouveau chunk
        if (tokenCount >= CHUNK_SIZE) {
          currentChunk.metadata.endLine = i;
          chunks.push({ ...currentChunk });
          
          // Nouveau chunk avec overlap
          const overlapLines = lines.slice(Math.max(0, i - 3), i + 1);
          currentChunk = {
            content: overlapLines.join('\n') + '\n',
            metadata: {
              ...currentChunk.metadata,
              startLine: Math.max(0, i - 3),
              section: currentSection
            }
          };
          tokenCount = this.estimateTokens(currentChunk.content);
        }
      }
      
      // Ajouter le dernier chunk
      if (currentChunk.content.trim()) {
        currentChunk.metadata.endLine = lines.length - 1;
        chunks.push(currentChunk);
      }
    }
    
    return chunks;
  }

  // Détection des en-têtes de section
  isSectionHeader(line) {
    return /^(#{1,3}\s|=+\s*Node|---+|```json|\*\*[A-Z]|[0-9]+\.)/.test(line);
  }

  // Extraction du nom de section
  extractSectionName(line) {
    // Nettoyer et extraire le nom de la section
    const cleaned = line.replace(/^[#=\-\*]+\s*/, '').replace(/\s*[#=\-\*]+$/, '').trim();
    return cleaned || 'General';
  }

  // Estimation du nombre de tokens
  estimateTokens(text) {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }

  // Génération des embeddings par batch
  async generateEmbeddings(chunks) {
    const embeddings = [];
    const batchSize = 20;
    
    console.log(`Génération des embeddings pour ${chunks.length} chunks...`);
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map(chunk => chunk.content);
      
      try {
        const response = await this.openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: texts,
        });
        
        embeddings.push(...response.data.map(item => item.embedding));
        
        console.log(`Embeddings générés: ${Math.min(i + batchSize, chunks.length)}/${chunks.length}`);
      } catch (error) {
        console.error('Erreur génération embeddings:', error);
        throw error;
      }
    }
    
    return embeddings;
  }

  // Indexation dans Pinecone
  async indexChunks(chunks, embeddings) {
    console.log('Indexation dans Pinecone...');
    
    const vectors = chunks.map((chunk, i) => ({
      id: this.generateChunkId(chunk, i),
      values: embeddings[i],
      metadata: {
        content: chunk.content.substring(0, 1000), // Limiter la taille pour les métadonnées
        source: chunk.metadata.source,
        type: chunk.metadata.type,
        section: chunk.metadata.section,
        startLine: chunk.metadata.startLine,
        endLine: chunk.metadata.endLine
      }
    }));
    
    // Indexer par batch de 100
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await this.index.namespace(this.namespace).upsert(batch);
      console.log(`Indexé: ${Math.min(i + batchSize, vectors.length)}/${vectors.length} chunks`);
    }
    
    console.log('Indexation terminée');
  }

  // Génération d'ID unique pour chaque chunk
  generateChunkId(chunk, index) {
    const hash = crypto.createHash('md5')
      .update(`${chunk.metadata.source}-${chunk.metadata.startLine}-${index}`)
      .digest('hex');
    return hash.substring(0, 16);
  }

  // Recherche de chunks pertinents
  async search(query, options = {}) {
    if (!this.initialized) {
      throw new Error('RAG not initialized. Call initialize() first.');
    }
    
    console.log(`Recherche: "${query}"`);
    
    // Générer l'embedding de la requête
    const queryResponse = await this.openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: query,
    });
    
    const queryEmbedding = queryResponse.data[0].embedding;
    
    // Construire le filtre Pinecone
    const filter = {};
    if (options.type) {
      filter.type = { $eq: options.type };
    }
    if (options.section) {
      filter.section = { $eq: options.section };
    }
    
    // Recherche dans Pinecone
    const searchResponse = await this.index.namespace(this.namespace).query({
      vector: queryEmbedding,
      topK: options.topK || TOP_K,
      includeMetadata: true,
      filter: Object.keys(filter).length > 0 ? filter : undefined
    });
    
    // Récupérer le contenu complet depuis les chunks originaux
    const results = await Promise.all(
      searchResponse.matches.map(async (match) => {
        // Lire le contenu complet depuis le fichier source
        const fullContent = await this.getFullChunkContent(
          match.metadata.source,
          match.metadata.startLine,
          match.metadata.endLine
        );
        
        return {
          content: fullContent || match.metadata.content,
          metadata: match.metadata,
          score: match.score
        };
      })
    );
    
    return results;
  }

  // Récupérer le contenu complet d'un chunk depuis le fichier source
  async getFullChunkContent(source, startLine, endLine) {
    try {
      const docPath = path.join(process.cwd(), 'doc-n8n', source);
      const content = await fs.readFile(docPath, 'utf-8');
      const lines = content.split('\n');
      return lines.slice(startLine, endLine + 1).join('\n');
    } catch (error) {
      console.error(`Erreur lecture fichier ${source}:`, error);
      return null;
    }
  }

  // Vérifier si les documents sont déjà indexés
  async isAlreadyIndexed() {
    try {
      const stats = await this.index.namespace(this.namespace).describeIndexStats();
      return stats.namespaces?.[this.namespace]?.vectorCount > 0;
    } catch (error) {
      return false;
    }
  }

  // Initialisation complète
  async initialize(forceReindex = false) {
    console.log('Initialisation du RAG Pinecone...');
    
    try {
      await this.initializeClients();
      
      // Vérifier si on doit réindexer
      const alreadyIndexed = await this.isAlreadyIndexed();
      
      if (alreadyIndexed && !forceReindex) {
        console.log('Documents déjà indexés dans Pinecone');
        this.initialized = true;
        return;
      }
      
      // Charger et indexer les documents
      const docDir = path.join(process.cwd(), 'doc-n8n');
      const documents = [];
      
      // Charger tous les documents
      const files = [
        { name: 'Guide_n8n.txt', type: 'guide' },
        { name: 'Tips_and_advices_n8n.txt', type: 'tips' },
        { name: 'exemple_nodes.txt', type: 'examples' }
      ];
      
      for (const file of files) {
        try {
          const content = await fs.readFile(
            path.join(docDir, file.name), 
            'utf-8'
          );
          documents.push({
            content,
            source: file.name,
            type: file.type
          });
          console.log(`Chargé: ${file.name} (${content.length} caractères)`);
        } catch (error) {
          console.error(`Erreur chargement ${file.name}:`, error);
        }
      }
      
      // Chunking
      console.log('Découpage des documents...');
      const chunks = await this.chunkDocuments(documents);
      console.log(`${chunks.length} chunks créés`);
      
      // Génération des embeddings
      const embeddings = await this.generateEmbeddings(chunks);
      
      // Indexation dans Pinecone
      await this.indexChunks(chunks, embeddings);
      
      this.initialized = true;
      console.log('RAG Pinecone initialisé avec succès');
      
    } catch (error) {
      console.error('Erreur initialisation RAG:', error);
      throw error;
    }
  }

  // Formater le contexte pour Claude
  formatContext(chunks) {
    let context = "Voici les informations pertinentes de la documentation n8n :\n\n";
    
    chunks.forEach((chunk, index) => {
      context += `--- Extrait ${index + 1} (${chunk.metadata.source} - ${chunk.metadata.section}) ---\n`;
      context += `Score de pertinence: ${(chunk.score * 100).toFixed(1)}%\n\n`;
      context += chunk.content;
      context += "\n\n";
    });
    
    return context;
  }

  // Statistiques de l'index
  async getStats() {
    try {
      const stats = await this.index.namespace(this.namespace).describeIndexStats();
      return {
        totalVectors: stats.namespaces?.[this.namespace]?.vectorCount || 0,
        indexSize: stats.totalVectorCount || 0,
        dimension: stats.dimension || EMBEDDING_DIMENSION
      };
    } catch (error) {
      console.error('Erreur récupération stats:', error);
      return null;
    }
  }
}

// Export singleton
export const n8nRAG = new N8nPineconeRAG();

// Fonction helper pour utiliser le RAG
export async function searchN8nDocs(query, options = {}) {
  if (!n8nRAG.initialized) {
    await n8nRAG.initialize();
  }
  
  const chunks = await n8nRAG.search(query, options);
  const context = n8nRAG.formatContext(chunks);
  const stats = await n8nRAG.getStats();
  
  return {
    context,
    chunks,
    stats
  };
} 