#!/bin/bash

echo "🧪 Test RAG avec les BONNES versions"
echo "=========================================="
echo "httpRequest: v4.2 (au lieu de v5)"
echo "slack: v2.3 (au lieu de v4)"
echo ""

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
      "httpRequest": 4.2,
      "slack": 2.3,
      "manualTrigger": 1
    }
  }' \
  --no-buffer 2>&1 | head -50 