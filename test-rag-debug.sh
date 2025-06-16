#!/bin/bash

echo "🔍 Test de debug du RAG - Voir les métadonnées envoyées"
echo "=========================================="

# Test simple qui devrait récupérer les métadonnées de HTTP Request
curl -X POST http://localhost:3000/api/claude \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(grep BACKEND_API_KEY .env | cut -d '=' -f2)" \
  -d '{
    "prompt": "DEBUG: Montre-moi simplement les métadonnées du node HTTP Request que tu as en contexte",
    "context": {
      "nodes": [],
      "connections": {}
    },
    "tools": [],
    "mode": "create",
    "versions": {
      "httpRequest": 5
    }
  }' \
  --no-buffer 2>&1 | grep -E "(fiches de nodes|Available Node Types|httpRequest)"

  #jeklmzjkfedlmfze