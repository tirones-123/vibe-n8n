import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeWorkflowSizes() {
    console.log('🔍 Analyse des tailles des fichiers workflow...\n');
    
    const workflowsDir = path.join(__dirname, '..', 'workflows');
    const characterCounts = [];
    const largeFiles = [];
    let processedFiles = 0;
    let skippedFiles = 0;
    
    try {
        // Lire tous les fichiers du dossier workflows
        const files = await fs.readdir(workflowsDir);
        console.log(`📁 Trouvé ${files.length} fichiers dans le dossier workflows`);
        
        for (const filename of files) {
            const filePath = path.join(workflowsDir, filename);
            
            try {
                // Vérifier que c'est un fichier (pas un dossier)
                const stats = await fs.stat(filePath);
                if (!stats.isFile()) {
                    continue;
                }
                
                // Filtrer pour ne garder que les fichiers JSON
                if (!filename.toLowerCase().endsWith('.json')) {
                    skippedFiles++;
                    continue;
                }
                
                // Lire le contenu complet du fichier
                const content = await fs.readFile(filePath, 'utf8');
                const characterCount = content.length;
                
                // Stocker le nombre de caractères
                characterCounts.push(characterCount);
                
                // Vérifier si le fichier dépasse 30 000 caractères
                if (characterCount > 30000) {
                    largeFiles.push({
                        filename: filename,
                        size: characterCount
                    });
                }
                
                processedFiles++;
                
                // Afficher le progrès tous les 100 fichiers
                if (processedFiles % 100 === 0) {
                    console.log(`⏳ Traité ${processedFiles} fichiers...`);
                }
                
            } catch (error) {
                console.warn(`⚠️ Erreur lors de la lecture de ${filename}: ${error.message}`);
                skippedFiles++;
            }
        }
        
        console.log(`\n✅ Analyse terminée :`);
        console.log(`   - Fichiers traités : ${processedFiles}`);
        console.log(`   - Fichiers ignorés : ${skippedFiles}`);
        
        // Calculer et afficher la moyenne
        if (characterCounts.length > 0) {
            const totalCharacters = characterCounts.reduce((sum, count) => sum + count, 0);
            const averageCharacters = Math.round(totalCharacters / characterCounts.length);
            
            console.log(`\n📊 Statistiques :`);
            console.log(`   - Nombre total de caractères : ${totalCharacters.toLocaleString()}`);
            console.log(`   - Moyenne de caractères par fichier : ${averageCharacters.toLocaleString()}`);
            console.log(`   - Fichier le plus petit : ${Math.min(...characterCounts).toLocaleString()} caractères`);
            console.log(`   - Fichier le plus grand : ${Math.max(...characterCounts).toLocaleString()} caractères`);
            
            // Afficher les fichiers dépassant 30 000 caractères
            console.log(`\n📋 Fichiers dépassant 30 000 caractères (${largeFiles.length} fichiers) :`);
            
            if (largeFiles.length > 0) {
                // Trier par taille décroissante
                largeFiles.sort((a, b) => b.size - a.size);
                
                largeFiles.forEach((file, index) => {
                    console.log(`   ${index + 1}. ${file.filename} : ${file.size.toLocaleString()} caractères`);
                });
            } else {
                console.log('   Aucun fichier ne dépasse 30 000 caractères.');
            }
            
            // Statistiques supplémentaires
            const filesOver10k = characterCounts.filter(count => count > 10000).length;
            const filesOver20k = characterCounts.filter(count => count > 20000).length;
            
            console.log(`\n📈 Répartition par taille :`);
            console.log(`   - Fichiers > 10 000 caractères : ${filesOver10k}`);
            console.log(`   - Fichiers > 20 000 caractères : ${filesOver20k}`);
            console.log(`   - Fichiers > 30 000 caractères : ${largeFiles.length}`);
            
        } else {
            console.log('\n❌ Aucun fichier valide trouvé pour l\'analyse.');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'analyse :', error.message);
        process.exit(1);
    }
}

// Lancer l'analyse
analyzeWorkflowSizes().catch(error => {
    console.error('💥 Erreur critique :', error);
    process.exit(1);
}); 