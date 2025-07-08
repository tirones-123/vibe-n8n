#!/bin/bash

echo "🧪 Test des données complètes de Slack"
echo "======================================="
echo ""

# Test RAG direct via l'endpoint Claude
echo "📊 Test 1: Récupération directe via Claude avec RAG"
curl -s http://localhost:3000/api/claude \
  -H "Content-Type: application/json" \
  -H "x-api-key: $BACKEND_API_KEY" \
  -d '{
    "message": "Montre-moi toutes les opérations disponibles dans le node Slack",
    "nodeNames": ["slack"],
    "useRAG": true
  }' | jq -r '.nodeTypes[0].rawData' | wc -c

echo ""
echo "📏 Taille des données Slack reçues (en caractères)"
echo ""

# Test via Claude
echo "🤖 Test 2: Question à Claude sur Slack"
curl -sN http://localhost:3000/api/claude \
  -H "Content-Type: application/json" \
  -H "x-api-key: $BACKEND_API_KEY" \
  -d '{
    "message": "Liste toutes les opérations du node Slack v2.3",
    "useRAG": true
  }' | head -40

