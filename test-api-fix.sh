#!/bin/bash

echo "🧪 Test de l'API fixée - vibe-n8n-production.up.railway.app"
echo "================================================="

# Test 1: Health check
echo "📋 Test 1: Health check"
curl -s "https://vibe-n8n-production.up.railway.app/api" | jq .
echo -e "\n"

# Test 2: Status check
echo "📊 Test 2: Status check"
curl -s "https://vibe-n8n-production.up.railway.app/api/status" | jq .
echo -e "\n"

# Test 3: API Claude avec legacy key
echo "🤖 Test 3: API Claude avec legacy key (ping test)"
curl -N -s \
  -H "Authorization: Bearer d5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"ping test simple"}' \
  "https://vibe-n8n-production.up.railway.app/api/claude" | head -20

echo -e "\n\n✅ Tests terminés!" 