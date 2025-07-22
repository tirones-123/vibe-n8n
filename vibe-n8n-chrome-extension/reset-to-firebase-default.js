// 🔥 RESET FIREBASE AUTH PAR DÉFAUT
console.log('🔄 === RESET FIREBASE AUTH PAR DÉFAUT ===');

// Supprimer la préférence Legacy et revenir au défaut Firebase
function resetToFirebaseDefault() {
  console.log('🔄 Reset vers Firebase Auth par défaut...');
  
  // Supprimer la préférence stockée (revient au défaut = Firebase)
  localStorage.removeItem('n8n-ai-use-firebase');
  
  // Forcer le mode Firebase
  window.useFirebaseAuth = true;
  
  console.log('✅ Préférence Legacy supprimée');
  console.log('🔥 Mode Firebase Auth activé par défaut');
  
  // Recharger pour appliquer
  setTimeout(() => {
    console.log('🔄 Rechargement pour appliquer...');
    location.reload();
  }, 1000);
}

// Vérifier le mode actuel
const currentMode = localStorage.getItem('n8n-ai-use-firebase');
const isLegacyMode = currentMode === 'false';

console.log('📊 Mode actuel:', isLegacyMode ? 'Legacy' : 'Firebase Auth');

if (isLegacyMode) {
  console.log('⚠️ Mode Legacy détecté');
  console.log('🔄 Pour revenir à Firebase Auth (défaut): resetToFirebaseDefault()');
} else {
  console.log('✅ Mode Firebase Auth déjà actif');
}

// Exposer la fonction
window.resetToFirebaseDefault = resetToFirebaseDefault; 