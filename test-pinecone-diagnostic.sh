#!/bin/bash

# Charger le fichier .env s'il existe
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Variables d'environnement chargées depuis .env"
else
    echo "⚠️  Fichier .env non trouvé"
fi

# Créer un nom de fichier avec timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="debug/pinecone-diagnostic-${TIMESTAMP}.txt"

echo "🔍 === DIAGNOSTIC INDEXATION PINECONE ==="
echo "📝 Analyse de ce qui est réellement indexé dans Pinecone"
echo "⏰ Démarrage: $(date)"
echo "📄 Logs sauvegardés dans: $LOG_FILE"
echo ""

# Créer le dossier debug s'il n'existe pas
mkdir -p debug

# Vérifier que les variables d'environnement sont définies
if [ -z "$PINECONE_API_KEY" ] || [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ ERREUR: Variables d'environnement manquantes"
    echo "   Vérifiez: PINECONE_API_KEY, OPENAI_API_KEY"
    exit 1
fi

# Aller dans le répertoire du projet
cd "$(dirname "$0")"

echo "📁 Répertoire de travail: $(pwd)"
echo "📊 Index Pinecone: $PINECONE_WORKFLOW_INDEX"
echo "🔧 Lancement du diagnostic..."
echo ""

# Écrire les infos de base dans le fichier log
{
    echo "=== DIAGNOSTIC INDEXATION PINECONE ==="
    echo "Timestamp: $(date)"
    echo "Directory: $(pwd)"
    echo "Index: $PINECONE_WORKFLOW_INDEX"
    echo "Objectif: Comprendre pourquoi le workflow 'vide' est retourné"
    echo ""
    echo "=== LOGS DE SORTIE ==="
} > "$LOG_FILE"

# Lancer le diagnostic avec Node.js et rediriger toute la sortie vers le fichier
echo "⏳ Diagnostic en cours... (voir le fichier $LOG_FILE pour les logs détaillés)"
node scripts/test-pinecone-indexing.js 2>&1 | tee -a "$LOG_FILE"

# Résumé final dans le terminal
echo ""
echo "🏁 Diagnostic terminé: $(date)"
echo "📄 Tous les logs sont disponibles dans: $LOG_FILE"
echo "📁 Fichiers de résultats dans le dossier: debug/"
echo ""
echo "📋 Pour voir les résultats principaux:"
echo "   grep -A 5 'RÉSULTAT' $LOG_FILE"
echo ""
echo "📋 Pour voir l'analyse du workflow problématique:"
echo "   grep -A 10 'WORKFLOW PROBLÉMATIQUE' $LOG_FILE"
echo ""
echo "📋 Pour voir les recommandations:"
echo "   grep -A 10 'RECOMMANDATIONS' $LOG_FILE" 