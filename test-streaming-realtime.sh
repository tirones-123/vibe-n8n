#!/bin/bash

echo "🌊 Test Streaming TEMPS RÉEL - Optimisé"
echo "======================================="

source .env

if [ -z "$BACKEND_API_KEY" ]; then
    echo "❌ BACKEND_API_KEY non définie dans .env"
    exit 1
fi

echo "📡 Streaming en temps réel avec flush forcé..."
echo "Prompt: Workflow Perplexity → GPT-4 → Google Doc → Email"
echo ""

# Options curl optimisées pour le streaming temps réel
curl -N --no-buffer --line-buffered -X POST http://localhost:3000/api/claude \
  -H "Authorization: Bearer $BACKEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Je veux un workflow n8n qui reçoit un sujet via un webhook, utilise l API de Perplexity pour chercher des infos, résume les résultats avec GPT-4, puis génère un article SEO complet et me l envoie par email dans un Google Doc."
  }' \
  --show-error | while IFS= read -r line; do
    echo "[$(date '+%H:%M:%S')] $line"
    # Force flush du output
    exec >&-
    exec >&1
  done

echo -e "\n\n✅ Test streaming temps réel terminé" 