#!/bin/bash

echo "🚀 Test Streaming - Workflow Article SEO avec Perplexity"
echo "========================================================"

source .env

if [ -z "$BACKEND_API_KEY" ]; then
    echo "❌ BACKEND_API_KEY non définie dans .env"
    exit 1
fi

echo "📡 Envoi de la requête complexe au serveur..."
echo "Prompt: Workflow avec Webhook → Perplexity → GPT-4 → Google Doc → Email"
echo ""

# Créer un fichier JSON temporaire pour éviter les problèmes de caractères
cat > /tmp/test_request.json << 'EOF'
{
  "prompt": "Je veux un workflow n8n qui reçoit un sujet via un webhook, utilise l'API de Perplexity pour chercher des infos, résume les résultats avec GPT-4, puis génère un article SEO complet et me l'envoie par email dans un Google Doc."
}
EOF

# Faire la requête avec streaming
curl -N -X POST http://localhost:3000/api/claude \
  -H "Authorization: Bearer $BACKEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d @/tmp/test_request.json \
  --silent \
  --show-error

echo -e "\n\n✅ Test streaming terminé"

# Nettoyer
rm -f /tmp/test_request.json 