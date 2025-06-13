#!/bin/bash

# Test du système RAG avec une requête Claude
# Cette requête mentionne des nodes spécifiques pour tester la récupération des métadonnées

echo "🧪 Test du système RAG avec Claude..."
echo "Requête : Workflow avec HTTP Request + Slack"
echo "==========================================="

curl -X POST http://localhost:3000/api/claude \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(grep BACKEND_API_KEY .env | cut -d '=' -f2)" \
  -d '{
    "prompt": "Crée un workflow simple avec un HTTP Request qui appelle l API GitHub pour récupérer les informations d un utilisateur, puis envoie le résultat sur Slack",
    "context": {
      "nodes": [],
      "connections": {}
    },
    "tools": [],
    "mode": "create",
    "versions": {
      "httpRequest": 5,
      "slack": 4,
      "manualTrigger": 1
    }
  }' \
  --no-buffer 