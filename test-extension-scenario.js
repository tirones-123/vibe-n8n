import fetch from 'node-fetch';

// Configuration
const API_URL = process.env.RAILWAY_API_URL || 'https://vibe-n8n-production.up.railway.app/api/claude';
const API_KEY = process.env.BACKEND_API_KEY || 'd5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2';

// Simuler exactement la requête de l'extension Chrome
const testRequest = {
  prompt: "fais moi un workflow qui fais que quand maxime.marsal18@gmail.com m'envoi un mail sur ma boite gmail minfreestyle@gmail.com ça m'envoi un message sur slack avec son contenu",
  context: {},
  tools: [],
  mode: "create",
  versions: "none"  // C'est ce que l'extension envoie actuellement
};

console.log('🚀 Test du backend avec versions="none"');
console.log('URL:', API_URL);
console.log('\n📤 Requête envoyée:');
console.log(JSON.stringify(testRequest, null, 2));

async function testBackend() {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(testRequest)
    });

    if (!response.ok) {
      console.error('❌ Erreur HTTP:', response.status, response.statusText);
      const error = await response.text();
      console.error('Détails:', error);
      return;
    }

    console.log('\n✅ Réponse reçue (streaming):\n');
    
    // Lire le stream
    const reader = response.body;
    let buffer = '';
    
    reader.on('data', (chunk) => {
      buffer += chunk.toString();
      
      // Parser les événements SSE
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            // Afficher différents types d'événements
            if (data.type === 'message_start') {
              console.log('📝 Début de la réponse Claude...');
            } else if (data.type === 'content_block_delta') {
              process.stdout.write(data.delta?.text || '');
            } else if (data.type === 'message_stop') {
              console.log('\n\n✅ Réponse complète reçue');
            } else if (data.type === 'stream_end') {
              console.log('🏁 Stream terminé');
            }
          } catch (e) {
            // Ignorer les erreurs de parsing
          }
        }
      }
    });

    reader.on('end', () => {
      console.log('\n\n📊 Test terminé');
      console.log('\n💡 Pour voir les logs du serveur:');
      console.log('   railway logs | grep -A 20 "=== NOUVELLE"');
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Lancer le test
testBackend(); 