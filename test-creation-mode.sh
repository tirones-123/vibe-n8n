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
LOG_FILE="debug/test-creation-logs-${TIMESTAMP}.txt"

echo "🧪 === TEST MODE CRÉATION WORKFLOW N8N ==="
echo "📝 Prompt: Workflow SEO avec Perplexity + GPT-4 + Google Doc"
echo "⏰ Démarrage: $(date)"
echo "📄 Logs sauvegardés dans: $LOG_FILE"
echo ""

# Créer le dossier debug s'il n'existe pas
mkdir -p debug

# Fonction pour écrire dans le terminal ET dans le fichier
log_and_display() {
    echo "$1" | tee -a "$LOG_FILE"
}

# Vérifier que les variables d'environnement sont définies
if [ -z "$PINECONE_API_KEY" ] || [ -z "$OPENAI_API_KEY" ] || [ -z "$CLAUDE_API_KEY" ]; then
    log_and_display "❌ ERREUR: Variables d'environnement manquantes"
    log_and_display "   Vérifiez: PINECONE_API_KEY, OPENAI_API_KEY, CLAUDE_API_KEY"
    exit 1
fi

# Aller dans le répertoire du projet
cd "$(dirname "$0")"

log_and_display "📁 Répertoire de travail: $(pwd)"
log_and_display "🔧 Lancement du test..."
log_and_display ""

# Écrire les infos de base dans le fichier log
{
    echo "=== TEST CRÉATION WORKFLOW N8N ==="
    echo "Timestamp: $(date)"
    echo "Directory: $(pwd)"
    echo "Prompt: Je veux un workflow n8n qui reçoit un sujet via un webhook, utilise l'API de Perplexity pour chercher des infos, résume les résultats avec GPT-4, puis génère un article SEO complet et me l'envoie par email dans un Google Doc."
    echo ""
    echo "=== LOGS DE SORTIE ==="
} > "$LOG_FILE"

# Lancer le test avec Node.js et rediriger toute la sortie vers le fichier
echo "⏳ Test en cours... (voir le fichier $LOG_FILE pour les logs détaillés)"
node scripts/test-creation-mode.js 2>&1 | tee -a "$LOG_FILE"

# Ajouter un résumé final dans le terminal
echo ""
echo "🏁 Test terminé: $(date)"
echo "📄 Tous les logs sont disponibles dans: $LOG_FILE"
echo "📁 Fichiers de résultats dans le dossier: debug/"
echo ""
echo "📋 Pour voir les logs complets:"
echo "   cat $LOG_FILE"
echo ""
echo "📋 Pour voir juste les noms des fichiers RAG utilisés:"
echo "   grep 'RAG filenames:' $LOG_FILE" 