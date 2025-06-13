#!/bin/bash

echo "🧪 Test RAG avec Discord..."
echo "Requête : Workflow avec Webhook + Discord"
echo "=========================================="

curl -X POST http://localhost:3000/api/claude \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(grep BACKEND_API_KEY .env | cut -d '=' -f2)" \
  -d '{
    "prompt": "Crée un workflow qui écoute un webhook, transforme les données reçues et les envoie sur Discord",
    "context": {
      "nodes": [],
      "connections": {}
    },
    "tools": [],
    "mode": "create",
    "versions": {
      "webhook": 2,
      "discord": 3,
      "set": 4
    }
  }' \
  --no-buffer 