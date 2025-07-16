import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeOptimizedWorkflows() {
    console.log('📊 Analyse comparative des workflows optimisés...\n');
    
    const originalDir = path.join(__dirname, '..', 'workflows');
    const optimizedDir = path.join(__dirname, '..', 'workflows-rag-optimized');
    
    // Données pour les statistiques
    const originalStats = { files: 0, totalChars: 0, sizes: [] };
    const optimizedStats = { files: 0, totalChars: 0, sizes: [] };
    const comparisons = [];
    
    try {
        // Vérifier que le dossier optimisé existe
        try {
            await fs.access(optimizedDir);
        } catch {
            console.error('❌ Le dossier workflows-rag-optimized n\'existe pas !');
            console.log('💡 Exécutez d\'abord: node scripts/optimize-workflows-rag.js');
            return;
        }

        // Lire les fichiers des deux dossiers
        const originalFiles = await fs.readdir(originalDir);
        const optimizedFiles = await fs.readdir(optimizedDir);
        
        const originalJsonFiles = originalFiles.filter(f => f.toLowerCase().endsWith('.json'));
        const optimizedJsonFiles = optimizedFiles.filter(f => f.toLowerCase().endsWith('.json'));
        
        console.log(`📁 Fichiers originaux : ${originalJsonFiles.length}`);
        console.log(`📁 Fichiers optimisés : ${optimizedJsonFiles.length}\n`);

        // Analyser chaque fichier en parallèle
        for (const filename of originalJsonFiles) {
            const originalPath = path.join(originalDir, filename);
            const optimizedPath = path.join(optimizedDir, filename);
            
            try {
                // Lire les deux versions
                const [originalContent, optimizedContent] = await Promise.all([
                    fs.readFile(originalPath, 'utf8'),
                    fs.readFile(optimizedPath, 'utf8').catch(() => null) // En cas de fichier manquant
                ]);
                
                const originalSize = originalContent.length;
                originalStats.files++;
                originalStats.totalChars += originalSize;
                originalStats.sizes.push(originalSize);
                
                if (optimizedContent) {
                    const optimizedSize = optimizedContent.length;
                    optimizedStats.files++;
                    optimizedStats.totalChars += optimizedSize;
                    optimizedStats.sizes.push(optimizedSize);
                    
                    const reduction = originalSize - optimizedSize;
                    const reductionPercent = (reduction / originalSize * 100);
                    
                    comparisons.push({
                        filename,
                        originalSize,
                        optimizedSize,
                        reduction,
                        reductionPercent
                    });
                }
                
            } catch (error) {
                console.warn(`⚠️ Erreur avec ${filename}: ${error.message}`);
            }
        }

        // Afficher les statistiques globales
        console.log('📊 STATISTIQUES GLOBALES\n');
        
        console.log('📋 Fichiers originaux :');
        console.log(`   - Nombre : ${originalStats.files.toLocaleString()}`);
        console.log(`   - Taille totale : ${originalStats.totalChars.toLocaleString()} caractères`);
        console.log(`   - Moyenne : ${Math.round(originalStats.totalChars / originalStats.files).toLocaleString()} caractères`);
        console.log(`   - Min/Max : ${Math.min(...originalStats.sizes).toLocaleString()} / ${Math.max(...originalStats.sizes).toLocaleString()}`);
        
        console.log('\n📋 Fichiers optimisés :');
        console.log(`   - Nombre : ${optimizedStats.files.toLocaleString()}`);
        console.log(`   - Taille totale : ${optimizedStats.totalChars.toLocaleString()} caractères`);
        console.log(`   - Moyenne : ${Math.round(optimizedStats.totalChars / optimizedStats.files).toLocaleString()} caractères`);
        console.log(`   - Min/Max : ${Math.min(...optimizedStats.sizes).toLocaleString()} / ${Math.max(...optimizedStats.sizes).toLocaleString()}`);
        
        // Calculs d'optimisation
        const totalReduction = originalStats.totalChars - optimizedStats.totalChars;
        const totalReductionPercent = (totalReduction / originalStats.totalChars * 100);
        const avgReductionPercent = comparisons.reduce((sum, c) => sum + c.reductionPercent, 0) / comparisons.length;
        
        console.log('\n🎯 OPTIMISATION GLOBALE :');
        console.log(`   - Réduction totale : ${totalReduction.toLocaleString()} caractères (-${totalReductionPercent.toFixed(2)}%)`);
        console.log(`   - Réduction moyenne : ${avgReductionPercent.toFixed(2)}% par fichier`);
        console.log(`   - Tokens économisés (estimation) : ${Math.round(totalReduction / 4).toLocaleString()}`);

        // Top gains
        const topGains = comparisons
            .filter(c => c.reductionPercent > 20)
            .sort((a, b) => b.reductionPercent - a.reductionPercent)
            .slice(0, 20);
            
        console.log(`\n🏆 TOP 20 OPTIMISATIONS (${topGains.length} fichiers avec >20% de réduction) :`);
        topGains.forEach((item, index) => {
            const reduction = item.reductionPercent.toFixed(1);
            const before = item.originalSize.toLocaleString();
            const after = item.optimizedSize.toLocaleString();
            console.log(`   ${index + 1}. ${item.filename}`);
            console.log(`      ${before} → ${after} chars (-${reduction}%)`);
        });

        // Répartition des gains
        const ranges = [
            { min: 0, max: 10, count: 0, label: '0-10%' },
            { min: 10, max: 25, count: 0, label: '10-25%' },
            { min: 25, max: 50, count: 0, label: '25-50%' },
            { min: 50, max: 75, count: 0, label: '50-75%' },
            { min: 75, max: 100, count: 0, label: '75%+' }
        ];
        
        comparisons.forEach(comp => {
            const percent = comp.reductionPercent;
            for (const range of ranges) {
                if (percent >= range.min && percent < range.max) {
                    range.count++;
                    break;
                }
            }
        });

        console.log('\n📈 RÉPARTITION DES GAINS :');
        ranges.forEach(range => {
            const percentage = (range.count / comparisons.length * 100).toFixed(1);
            console.log(`   - ${range.label} : ${range.count} fichiers (${percentage}%)`);
        });

        // Statistiques avancées
        const largeFilesOriginal = originalStats.sizes.filter(size => size > 30000).length;
        const largeFilesOptimized = optimizedStats.sizes.filter(size => size > 30000).length;
        const avgSizeReduction = originalStats.totalChars / originalStats.files - optimizedStats.totalChars / optimizedStats.files;

        console.log('\n📋 IMPACT SUR LES GROS FICHIERS :');
        console.log(`   - Fichiers >30k chars avant : ${largeFilesOriginal}`);
        console.log(`   - Fichiers >30k chars après : ${largeFilesOptimized}`);
        console.log(`   - Réduction moyenne par fichier : ${Math.round(avgSizeReduction).toLocaleString()} caractères`);

        // Liste des fichiers optimisés > 30k
        const largeOptimizedFiles = comparisons
            .filter(c => c.optimizedSize > 30000)
            .sort((a, b) => b.optimizedSize - a.optimizedSize);
            
        console.log(`\n📋 FICHIERS OPTIMISÉS TOUJOURS >30k CARACTÈRES (${largeOptimizedFiles.length} fichiers) :`);
        largeOptimizedFiles.forEach((item, index) => {
            const reduction = item.reductionPercent.toFixed(1);
            const before = item.originalSize.toLocaleString();
            const after = item.optimizedSize.toLocaleString();
            console.log(`   ${index + 1}. ${item.filename}`);
            console.log(`      ${before} → ${after} chars (-${reduction}%)`);
        });

        // Calcul de la médiane
        const sortedOriginal = [...originalStats.sizes].sort((a, b) => a - b);
        const sortedOptimized = [...optimizedStats.sizes].sort((a, b) => a - b);
        
        const medianOriginal = sortedOriginal.length % 2 === 0
            ? (sortedOriginal[sortedOriginal.length / 2 - 1] + sortedOriginal[sortedOriginal.length / 2]) / 2
            : sortedOriginal[Math.floor(sortedOriginal.length / 2)];
            
        const medianOptimized = sortedOptimized.length % 2 === 0
            ? (sortedOptimized[sortedOptimized.length / 2 - 1] + sortedOptimized[sortedOptimized.length / 2]) / 2
            : sortedOptimized[Math.floor(sortedOptimized.length / 2)];

        console.log('\n📊 MÉDIANE DU NOMBRE DE CARACTÈRES :');
        console.log(`   - Médiane originale : ${Math.round(medianOriginal).toLocaleString()} caractères`);
        console.log(`   - Médiane optimisée : ${Math.round(medianOptimized).toLocaleString()} caractères`);
        console.log(`   - Réduction médiane : ${Math.round(medianOriginal - medianOptimized).toLocaleString()} caractères (-${((medianOriginal - medianOptimized) / medianOriginal * 100).toFixed(1)}%)`);

        // Percentiles supplémentaires
        const p25Original = sortedOriginal[Math.floor(sortedOriginal.length * 0.25)];
        const p75Original = sortedOriginal[Math.floor(sortedOriginal.length * 0.75)];
        const p90Original = sortedOriginal[Math.floor(sortedOriginal.length * 0.90)];
        
        const p25Optimized = sortedOptimized[Math.floor(sortedOptimized.length * 0.25)];
        const p75Optimized = sortedOptimized[Math.floor(sortedOptimized.length * 0.75)];
        const p90Optimized = sortedOptimized[Math.floor(sortedOptimized.length * 0.90)];

        console.log('\n📈 PERCENTILES DE TAILLE :');
        console.log(`   - P25 : ${p25Original.toLocaleString()} → ${p25Optimized.toLocaleString()} chars`);
        console.log(`   - P50 (médiane) : ${Math.round(medianOriginal).toLocaleString()} → ${Math.round(medianOptimized).toLocaleString()} chars`);
        console.log(`   - P75 : ${p75Original.toLocaleString()} → ${p75Optimized.toLocaleString()} chars`);
        console.log(`   - P90 : ${p90Original.toLocaleString()} → ${p90Optimized.toLocaleString()} chars`);

        console.log('\n💾 ESTIMATION POUR LE RAG :');
        const tokensSaved = Math.round(totalReduction / 4);
        const costSavedUSD = (tokensSaved * 0.00001).toFixed(2); // Estimation OpenAI pricing
        console.log(`   - Tokens économisés : ${tokensSaved.toLocaleString()}`);
        console.log(`   - Économie estimée : ~$${costSavedUSD} USD en tokens d'embedding`);
        console.log(`   - Gain en vitesse : ~${totalReductionPercent.toFixed(1)}% plus rapide pour les embeddings`);

    } catch (error) {
        console.error('❌ Erreur lors de l\'analyse :', error.message);
        process.exit(1);
    }
}

// Lancer l'analyse
analyzeOptimizedWorkflows().catch(error => {
    console.error('💥 Erreur critique :', error);
    process.exit(1);
}); 