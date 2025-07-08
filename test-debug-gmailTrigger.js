import fs from 'fs/promises';
import path from 'path';

console.log('🔍 Debug: Pourquoi gmailTrigger n\'est pas trouvé ?\n');

const storageDir = './data/node-types';

// Les formats testés
const nodeName = 'gmailTrigger';
const possibleNames = [
  nodeName, // nom court (ex: httpRequest)
  `n8n-nodes-base.${nodeName}`, // nom standard n8n
  `@n8n/n8n-nodes-langchain.${nodeName}`, // nodes langchain
];

console.log('📋 Formats testés:');
possibleNames.forEach((name, i) => {
  const prefix = name.replace(/[|:]/g, '_') + '_v';
  console.log(`  ${i+1}. "${name}" → prefix: "${prefix}"`);
});

// Lister tous les fichiers
const files = await fs.readdir(storageDir);
console.log(`\n📁 Total de fichiers dans ${storageDir}: ${files.length}`);

// Chercher les fichiers gmail
const gmailFiles = files.filter(f => f.toLowerCase().includes('gmail'));
console.log(`\n📧 Fichiers contenant "gmail": ${gmailFiles.length}`);
gmailFiles.forEach(f => console.log(`  - ${f}`));

// Pour chaque format possible
console.log('\n🔎 Test de correspondance:');
for (const possibleName of possibleNames) {
  const prefix = possibleName.replace(/[|:]/g, '_') + '_v';
  console.log(`\n  Format: "${possibleName}"`);
  console.log(`  Prefix: "${prefix}"`);
  
  const matchingFiles = files.filter(f => {
    return f.startsWith(prefix) && f.endsWith('.json');
  });
  
  if (matchingFiles.length > 0) {
    console.log(`  ✅ Fichiers trouvés: ${matchingFiles.length}`);
    matchingFiles.forEach(f => console.log(`     - ${f}`));
  } else {
    console.log(`  ❌ Aucun fichier trouvé`);
    
    // Vérifier pourquoi
    const startsWith = files.filter(f => f.startsWith(prefix));
    if (startsWith.length > 0) {
      console.log(`     ⚠️  Fichiers commençant par "${prefix}": ${startsWith.length}`);
      startsWith.forEach(f => console.log(`        - ${f}`));
    }
    
    // Vérifier avec une recherche plus flexible
    const contains = files.filter(f => f.includes(possibleName.replace(/[|:]/g, '_')));
    if (contains.length > 0) {
      console.log(`     💡 Fichiers contenant "${possibleName.replace(/[|:]/g, '_')}": ${contains.length}`);
      contains.forEach(f => console.log(`        - ${f}`));
    }
  }
} 