/**
 * Script pour la popup
 */

document.addEventListener('DOMContentLoaded', () => {
  const openN8nButton = document.getElementById('open-n8n');

  // Ouvrir n8n
  openN8nButton.addEventListener('click', async () => {
    // Chercher un onglet n8n existant
    const tabs = await chrome.tabs.query({});
    const n8nTab = tabs.find(tab => 
      tab.url?.includes('n8n.io') || 
      tab.url?.includes('localhost:5678') ||
      tab.url?.includes('localhost:5679')
    );

    if (n8nTab) {
      // Activer l'onglet existant
      chrome.tabs.update(n8nTab.id, { active: true });
      chrome.windows.update(n8nTab.windowId, { focused: true });
    } else {
      // Ouvrir un nouvel onglet
      chrome.tabs.create({ url: 'https://app.n8n.io' });
    }

    // Fermer la popup
    window.close();
  });
}); 