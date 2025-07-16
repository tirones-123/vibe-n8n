import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function emptyLargeWorkflows() {
    console.log('🗂️  Identification et vidage des fichiers >61 500 caractères...\n');
    
    const optimizedDir = path.join(__dirname, '..', 'workflows-rag-optimized');
    const threshold = 61500;
    
    let processedFiles = 0;
    let emptiedFiles = 0;
    let totalSizeReduced = 0;
    const emptiedList = [];

    try {
        const files = await fs.readdir(optimizedDir);
        console.log(`📁 Analyse de ${files.length} fichiers optimisés...\n`);
        
        for (const filename of files) {
            if (!filename.endsWith('.json')) continue;
            
            const filePath = path.join(optimizedDir, filename);
            processedFiles++;
            
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                const originalSize = content.length;
                
                if (originalSize > threshold) {
                    console.log(`🗑️  Vidage de ${filename} (${originalSize.toLocaleString()} chars)`);
                    
                    // Fichier complètement vide (JSON minimal)
                    const emptyContent = '{}';
                    await fs.writeFile(filePath, emptyContent);
                    
                    const newSize = emptyContent.length;
                    const sizeReduced = originalSize - newSize;
                    totalSizeReduced += sizeReduced;
                    emptiedFiles++;
                    
                    emptiedList.push({
                        filename,
                        originalSize,
                        newSize,
                        sizeReduced,
                        reductionPercent: ((sizeReduced / originalSize) * 100).toFixed(1)
                    });
                    
                    console.log(`   ✅ ${originalSize.toLocaleString()} → ${newSize.toLocaleString()} chars (-${((sizeReduced / originalSize) * 100).toFixed(1)}%)`);
                }
                
                if (processedFiles % 500 === 0) {
                    console.log(`⏳ Traité ${processedFiles}/${files.length} fichiers...`);
                }
                
            } catch (error) {
                console.error(`❌ Erreur avec ${filename}:`, error.message);
            }
        }
        
        console.log('\n📊 RÉSULTATS DU VIDAGE :');
        console.log(`   - Fichiers traités : ${processedFiles}`);
        console.log(`   - Fichiers vidés : ${emptiedFiles}`);
        console.log(`   - Taille totale économisée : ${totalSizeReduced.toLocaleString()} caractères`);
        console.log(`   - Tokens économisés (estimation) : ${Math.round(totalSizeReduced / 4).toLocaleString()}`);
        
        if (emptiedList.length > 0) {
            console.log('\n📋 LISTE DES FICHIERS VIDÉS :');
            emptiedList
                .sort((a, b) => b.originalSize - a.originalSize)
                .forEach((file, index) => {
                    console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${file.filename}`);
                    console.log(`       ${file.originalSize.toLocaleString()} → ${file.newSize.toLocaleString()} chars (-${file.reductionPercent}%)`);
                });
        }
        
        console.log('\n✅ Vidage terminé avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors du vidage:', error);
    }
}

emptyLargeWorkflows(); 