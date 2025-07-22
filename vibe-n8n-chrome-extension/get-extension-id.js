// Script pour récupérer l'ID de l'extension Chrome
// À exécuter dans la console de la page de background de l'extension

console.log('🆔 Extension ID:', chrome.runtime.id);
console.log('🔗 Firebase domain to add:', `chrome-extension://${chrome.runtime.id}`);
console.log('');
console.log('📋 Copiez cette URL dans Firebase Console > Authentication > Settings > Authorized domains:');
console.log(`chrome-extension://${chrome.runtime.id}`); 