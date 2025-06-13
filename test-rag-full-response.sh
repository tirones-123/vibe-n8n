#!/bin/bash

echo "🧪 Test RAG avec capture de la réponse complète"
echo "================================================"
echo "httpRequest: v4.2"
echo "slack: v2.3"
echo ""

# Créer un fichier temporaire pour capturer la réponse
TEMP_FILE=$(mktemp)

echo "📡 Envoi de la requête..."
echo ""

# Faire la requête et capturer toute la réponse
curl -s -X POST http://localhost:3000/api/claude \
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
  }' > "$TEMP_FILE"

echo "📊 Analyse de la réponse..."
echo ""

# Extraire les métriques
INPUT_TOKENS=$(grep -o '"input_tokens":[0-9]*' "$TEMP_FILE" | head -1 | cut -d':' -f2)
OUTPUT_TOKENS=$(grep -o '"output_tokens":[0-9]*' "$TEMP_FILE" | tail -1 | cut -d':' -f2)

echo "📈 Métriques:"
echo "- Tokens d'entrée : $INPUT_TOKENS (incluant les métadonnées des nodes)"
echo "- Tokens de sortie : $OUTPUT_TOKENS"
echo ""

# Extraire le JSON du workflow
echo "🔍 Extraction du workflow JSON..."
echo ""

# Extraire tout le contenu entre ```json et ```
sed -n '/```json/,/```/{//!p;}' "$TEMP_FILE" > workflow.json

# Vérifier si on a trouvé du JSON
if [ -s workflow.json ]; then
    echo "✅ Workflow JSON généré :"
    echo "========================"
    cat workflow.json | jq '.' 2>/dev/null || cat workflow.json
    echo ""
    echo "========================"
    
    # Afficher quelques détails
    echo ""
    echo "📋 Résumé du workflow :"
    NODES_COUNT=$(cat workflow.json | jq '.nodes | length' 2>/dev/null || echo "?")
    echo "- Nombre de nodes : $NODES_COUNT"
    
    # Afficher les nodes
    echo "- Nodes créés :"
    cat workflow.json | jq -r '.nodes[] | "  • \(.name) (\(.type) v\(.typeVersion))"' 2>/dev/null || echo "  (Erreur parsing)"
else
    echo "❌ Aucun JSON trouvé dans la réponse"
    echo ""
    echo "📄 Réponse brute (dernières lignes) :"
    tail -20 "$TEMP_FILE"
fi

# Nettoyer
rm -f "$TEMP_FILE" workflow.json 