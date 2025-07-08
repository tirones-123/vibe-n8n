#!/bin/bash

# Script pour voir les logs du backend en temps réel

echo "🔍 Visualisation des logs du backend n8n AI Assistant"
echo "Appuyez sur Ctrl+C pour arrêter"
echo ""

# Si on est sur Railway, afficher les logs Railway
if [ ! -z "$RAILWAY_ENVIRONMENT" ]; then
    echo "Environnement Railway détecté - utilisez 'railway logs' pour voir les logs"
    exit 0
fi

# Sinon, afficher les logs locaux
if [ "$1" == "http" ]; then
    # Mode HTTP - récupérer les logs via l'API
    echo "Récupération des logs via HTTP..."
    while true; do
        curl -s http://localhost:3000/api/logs?limit=50 | jq -r '.logs[] | "\(.timestamp) - \(.message)"'
        sleep 2
    done
else
    # Mode direct - lancer le serveur et afficher les logs
    npm run dev
fi 