#!/bin/bash

echo "🧪 Test du cron en local"
echo "========================"
echo ""

# Simuler l'environnement Railway
export RAILWAY_ENVIRONMENT="production"

# Lancer le cron
node cron.js 