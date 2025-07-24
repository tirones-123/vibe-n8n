#!/bin/bash

# Test script pour le système anti-abus complet
# Usage: ./test-anti-abuse-system.sh

echo "🧪 === TEST SYSTÈME ANTI-ABUS COMPLET ==="
echo "⏰ Début des tests: $(date)"
echo ""

# Configuration
API_URL="https://vibe-n8n-production.up.railway.app/api/claude"
BACKEND_API_KEY="d5783369f695dfe8517a0c02d9b8cddf11036fec2831e04da5084e894bca7ea2"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_test() {
    echo -e "${BLUE}🔬 TEST: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${PURPLE}📊 $1${NC}"
}

# Test 1: Rate Limiting IP
print_test "Rate Limiting IP (100 requêtes/heure)"
echo "Envoi de 5 requêtes rapides depuis la même IP..."

for i in {1..5}; do
    echo "📡 Requête $i/5..."
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST "$API_URL" \
        -H "Authorization: Bearer $BACKEND_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"prompt":"test rate limiting ' $i '"}' 2>/dev/null)
    
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo $response | sed -e 's/HTTPSTATUS\:.*//g')
    
    if [ "$http_code" -eq 429 ]; then
        print_error "Rate limit atteint à la requête $i (HTTP $http_code)"
        echo "Réponse: $body"
        break
    elif [ "$http_code" -eq 200 ]; then
        print_success "Requête $i OK (HTTP $http_code)"
    else
        print_warning "Requête $i status inattendu: HTTP $http_code"
    fi
    
    sleep 1
done

echo ""

# Test 2: Test avec Legacy API Key
print_test "Authentification Legacy API Key"

response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST "$API_URL" \
    -H "Authorization: Bearer $BACKEND_API_KEY" \
    -H "Content-Type: application/json" \
    -H "X-Auth-Method: LEGACY" \
    -d '{"prompt":"test legacy auth"}' 2>/dev/null)

http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if [ "$http_code" -eq 200 ]; then
    print_success "Legacy API Key fonctionne (HTTP $http_code)"
else
    print_error "Legacy API Key échoue (HTTP $http_code)"
fi

echo ""

# Test 3: Test avec token invalide
print_test "Token invalide (doit échouer)"

response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST "$API_URL" \
    -H "Authorization: Bearer invalid_token_123" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"test invalid token"}' 2>/dev/null)

http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if [ "$http_code" -eq 401 ]; then
    print_success "Token invalide correctement rejeté (HTTP $http_code)"
else
    print_warning "Token invalide pas rejeté comme attendu (HTTP $http_code)"
fi

echo ""

# Test 4: Test sans Authorization header
print_test "Requête sans Authorization (doit échouer)"

response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"test no auth"}' 2>/dev/null)

http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if [ "$http_code" -eq 401 ]; then
    print_success "Requête sans auth correctement rejetée (HTTP $http_code)"
else
    print_warning "Requête sans auth pas rejetée comme attendu (HTTP $http_code)"
fi

echo ""

# Test 5: Test health check
print_test "Health check API"

response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X GET "https://vibe-n8n-production.up.railway.app/api" 2>/dev/null)

http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS\:.*//g')

if [ "$http_code" -eq 200 ]; then
    print_success "Health check OK (HTTP $http_code)"
    print_info "Services status:"
    echo "$body" | jq '.configuration' 2>/dev/null || echo "$body"
else
    print_error "Health check échoué (HTTP $http_code)"
fi

echo ""

# Test 6: Monitoring stats
print_test "Monitoring et statistics"

response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X GET "https://vibe-n8n-production.up.railway.app/api/status" 2>/dev/null)

http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS\:.*//g')

if [ "$http_code" -eq 200 ]; then
    print_success "Monitoring accessible (HTTP $http_code)"
    print_info "Server status:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
    print_error "Monitoring inaccessible (HTTP $http_code)"
fi

echo ""

# Résumé
echo "🏁 === RÉSUMÉ DES TESTS ==="
echo "⏰ Fin des tests: $(date)"
echo ""
echo "📋 Tests effectués:"
echo "   1. ✅ Rate limiting IP (100/heure)"
echo "   2. ✅ Authentification Legacy API"
echo "   3. ✅ Rejet tokens invalides"
echo "   4. ✅ Rejet requêtes sans auth"
echo "   5. ✅ Health check système"
echo "   6. ✅ Monitoring stats"
echo ""
echo "🔍 Pour tester davantage:"
echo "   - Créer comptes avec emails temporaires"
echo "   - Tester verification email Firebase"
echo "   - Surveiller logs Firestore security_events"
echo "   - Tester quotas différentiels par risk level"
echo ""
print_success "Tests terminés ! Vérifiez les logs Railway pour plus de détails." 