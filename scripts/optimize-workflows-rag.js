import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Optimise intelligemment le jsCode en truncant les gros arrays
 * tout en gardant la structure pour Claude
 */
function optimizeJsCode(jsCode) {
    // Si le code est trop petit, pas d'optimisation
    if (jsCode.length <= 20000) {
        return jsCode;
    }

    try {
        // Rechercher les patterns d'arrays volumineux
        const arrayPatterns = [
            // Pattern: let/const variable = [ ... gros array ... ]
            /(?:let|const|var)\s+(\w+)\s*=\s*\[\s*\n([\s\S]*?)\n\s*\]/g,
            // Pattern: variable = [ ... gros array ... ]
            /(\w+)\s*=\s*\[\s*\n([\s\S]*?)\n\s*\]/g
        ];

        let optimizedCode = jsCode;

        for (const pattern of arrayPatterns) {
            optimizedCode = optimizedCode.replace(pattern, (match, varName, arrayContent) => {
                // Si l'array fait moins de 10k chars, on garde tel quel
                if (arrayContent.length < 10000) {
                    return match;
                }

                // Analyser la structure des éléments
                const lines = arrayContent.trim().split('\n');
                const elements = [];
                let currentElement = '';
                let braceCount = 0;

                for (const line of lines) {
                    currentElement += line + '\n';
                    
                    // Compter les accolades pour détecter les objets complets
                    for (const char of line) {
                        if (char === '{') braceCount++;
                        if (char === '}') braceCount--;
                    }

                    // Si on a un élément complet (accolades équilibrées et virgule)
                    if (braceCount === 0 && (line.includes('},') || line.includes('}'))) {
                        elements.push(currentElement.trim());
                        currentElement = '';
                    }

                    // Limiter à 5 éléments d'exemple
                    if (elements.length >= 5) {
                        break;
                    }
                }

                // Construire la version optimisée
                const sampleElements = elements.slice(0, 3);
                const totalOriginalElements = lines.filter(line => line.includes('{')).length;
                const remainingCount = totalOriginalElements - sampleElements.length;

                let optimizedArray = '';
                if (varName) {
                    // C'est une déclaration de variable
                    optimizedArray = `let ${varName} = [\n`;
                } else {
                    // C'est une assignation
                    optimizedArray = `${varName} = [\n`;
                }

                // Ajouter les éléments d'exemple
                sampleElements.forEach((element, index) => {
                    optimizedArray += '    ' + element;
                    if (index < sampleElements.length - 1) {
                        optimizedArray += ',\n';
                    }
                });

                // Ajouter le commentaire explicatif
                if (remainingCount > 0) {
                    optimizedArray += `,\n    // ... (${remainingCount} more similar items with same structure)`;
                }

                optimizedArray += '\n]';

                return optimizedArray;
            });
        }

        // Si le code est encore trop gros, truncation générale
        if (optimizedCode.length > 20000) {
            const halfPoint = Math.floor(optimizedCode.length / 2);
            const truncationPoint = optimizedCode.indexOf('\n', halfPoint);
            
            if (truncationPoint > -1) {
                const firstHalf = optimizedCode.substring(0, truncationPoint);
                const secondHalf = optimizedCode.substring(optimizedCode.lastIndexOf('\n', optimizedCode.length - 1000));
                
                optimizedCode = firstHalf + 
                    '\n\n// ... (large data section truncated for RAG optimization) ...\n\n' + 
                    secondHalf;
            }
        }

        return optimizedCode;

    } catch (error) {
        // En cas d'erreur de parsing, truncation simple
        if (jsCode.length > 20000) {
            return jsCode.substring(0, 19000) + 
                '\n\n// ... (code truncated for RAG optimization) ...';
        }
        return jsCode;
    }
}

async function optimizeWorkflowForRAG() {
    console.log('🔧 Optimisation RAG ultra-restrictive des workflows...\n');
    
    const workflowsDir = path.join(__dirname, '..', 'workflows');
    const outputDir = path.join(__dirname, '..', 'workflows-rag-optimized');
    
    let processedFiles = 0;
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    let errors = 0;

    try {
        // Créer le dossier de sortie
        await fs.mkdir(outputDir, { recursive: true });
        console.log(`📁 Dossier de sortie créé : ${outputDir}\n`);

        // Lire tous les fichiers
        const files = await fs.readdir(workflowsDir);
        const jsonFiles = files.filter(f => f.toLowerCase().endsWith('.json'));
        
        console.log(`🔍 Trouvé ${jsonFiles.length} fichiers JSON à traiter\n`);

        for (const filename of jsonFiles) {
            const inputPath = path.join(workflowsDir, filename);
            const outputPath = path.join(outputDir, filename);
            
            try {
                // Lire le fichier original
                const originalContent = await fs.readFile(inputPath, 'utf8');
                const originalSize = originalContent.length;
                totalOriginalSize += originalSize;

                // Parser le JSON
                const workflow = JSON.parse(originalContent);
                
                // Détecter si on a des gros jsCode à optimiser
                const hasLargeJsCode = workflow.nodes?.some(node => 
                    node.parameters?.jsCode && node.parameters.jsCode.length > 20000
                );
                
                // ===== OPTIMISATIONS ULTRA-RESTRICTIVES =====
                
                // 1. Optimiser meta (SEULEMENT ce qui est spécifié)
                if (workflow.meta) {
                    // Remplacer instanceId par placeholder
                    if (workflow.meta.instanceId) {
                        workflow.meta.instanceId = '<UUID-chain>';
                    }
                    
                    // Supprimer templateCredsSetupCompleted SEULEMENT
                    if ('templateCredsSetupCompleted' in workflow.meta) {
                        delete workflow.meta.templateCredsSetupCompleted;
                    }
                }
                
                // 2. Supprimer versionId au niveau racine
                if ('versionId' in workflow) {
                    delete workflow.versionId;
                }
                
                // 3. Supprimer pinData au niveau racine
                if ('pinData' in workflow) {
                    delete workflow.pinData;
                }
                
                // 4. Supprimer TOUS les sticky notes
                if (workflow.nodes && Array.isArray(workflow.nodes)) {
                    workflow.nodes = workflow.nodes.filter(node => 
                        node.type !== 'n8n-nodes-base.stickyNote'
                    );
                }
                
                // 5. Optimiser les gros jsCode (truncation intelligente des arrays)
                if (workflow.nodes && Array.isArray(workflow.nodes)) {
                    workflow.nodes.forEach(node => {
                        if (node.parameters && node.parameters.jsCode && typeof node.parameters.jsCode === 'string') {
                            const jsCode = node.parameters.jsCode;
                            if (jsCode.length > 20000) {
                                node.parameters.jsCode = optimizeJsCode(jsCode);
                            }
                        }
                    });
                }
                
                // 6. Masquer les credentials réelles (remplacer par placeholders)
                if (workflow.nodes && Array.isArray(workflow.nodes)) {
                    workflow.nodes.forEach(node => {
                        if (node.credentials && typeof node.credentials === 'object') {
                            // Remplacer les credentials par des placeholders
                            for (const [credType, credValue] of Object.entries(node.credentials)) {
                                if (typeof credValue === 'string') {
                                    node.credentials[credType] = `<${credType}-placeholder>`;
                                } else if (typeof credValue === 'object' && credValue.id) {
                                    node.credentials[credType] = {
                                        ...credValue,
                                        id: `<${credType}-id>`,
                                        name: credValue.name || `<${credType}-name>`
                                    };
                                }
                            }
                        }
                    });
                }
                
                // ===== FIN DES OPTIMISATIONS =====
                
                // Sérialiser le JSON optimisé
                const optimizedContent = JSON.stringify(workflow, null, 2);
                const optimizedSize = optimizedContent.length;
                totalOptimizedSize += optimizedSize;

                // Sauvegarder le fichier optimisé
                await fs.writeFile(outputPath, optimizedContent, 'utf8');
                
                processedFiles++;
                
                // Log du progrès détaillé
                const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
                if (processedFiles % 100 === 0) {
                    console.log(`⏳ Traité ${processedFiles}/${jsonFiles.length} fichiers...`);
                }
                
                // Log des gros gains (incluant jsCode optimization)
                if (parseFloat(reduction) > 10) {
                    const jsCodeIndicator = hasLargeJsCode ? ' [jsCode optimized]' : '';
                    console.log(`📉 ${filename}: ${originalSize} → ${optimizedSize} chars (-${reduction}%)${jsCodeIndicator}`);
                }
                
            } catch (error) {
                console.error(`❌ Erreur avec ${filename}:`, error.message);
                errors++;
            }
        }

        // Statistiques finales
        console.log(`\n✅ Optimisation terminée :`);
        console.log(`   - Fichiers traités : ${processedFiles}`);
        console.log(`   - Erreurs : ${errors}`);
        console.log(`   - Taille originale totale : ${totalOriginalSize.toLocaleString()} caractères`);
        console.log(`   - Taille optimisée totale : ${totalOptimizedSize.toLocaleString()} caractères`);
        
        const totalReduction = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(2);
        const savedChars = totalOriginalSize - totalOptimizedSize;
        
        console.log(`   - Réduction totale : ${totalReduction}% (${savedChars.toLocaleString()} caractères économisés)`);
        
        // Estimation des tokens économisés (approximation : 1 token ≈ 4 caractères)
        const estimatedTokensSaved = Math.round(savedChars / 4);
        console.log(`   - Tokens économisés (estimation) : ${estimatedTokensSaved.toLocaleString()}`);
        
        console.log(`\n📂 Fichiers optimisés sauvegardés dans : ${outputDir}`);
        
        // Vérification d'intégrité sur quelques fichiers
        console.log(`\n🔍 Vérification d'intégrité sur 5 fichiers aléatoires...`);
        const sampleFiles = jsonFiles.slice(0, 5);
        
        for (const filename of sampleFiles) {
            try {
                const optimizedPath = path.join(outputDir, filename);
                const optimizedContent = await fs.readFile(optimizedPath, 'utf8');
                const optimized = JSON.parse(optimizedContent);
                
                // Vérifications de base
                const hasNodes = optimized.nodes && Array.isArray(optimized.nodes);
                const hasConnections = optimized.connections && typeof optimized.connections === 'object';
                const noVersionId = !('versionId' in optimized);
                const noPinData = !('pinData' in optimized);
                
                console.log(`   ✅ ${filename}: nodes=${hasNodes}, connections=${hasConnections}, clean=${noVersionId && noPinData}`);
                
            } catch (error) {
                console.log(`   ❌ ${filename}: Erreur de vérification`);
            }
        }

    } catch (error) {
        console.error('❌ Erreur générale :', error.message);
        process.exit(1);
    }
}

// Lancer l'optimisation
optimizeWorkflowForRAG().catch(error => {
    console.error('💥 Erreur critique :', error);
    process.exit(1);
}); 