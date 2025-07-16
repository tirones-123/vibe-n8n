#!/bin/bash

echo "🚀 Test du streaming SSE avec curl"
echo "=================================="

# Vérifier que les variables d'environnement sont présentes
if [ -z "$BACKEND_API_KEY" ]; then
    echo "❌ BACKEND_API_KEY non définie dans .env"
    exit 1
fi

echo "📡 Connexion au serveur localhost:3000..."

# Test avec un prompt simple
curl -N -X POST http://localhost:3000/api/claude \
  -H "Authorization: Bearer $BACKEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Créer un workflow simple avec webhook trigger et HTTP Request vers une API"
  }' \
  --silent \
  --show-error

echo -e "\n\n✅ Test streaming terminé" 