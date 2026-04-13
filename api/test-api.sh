#!/bin/bash
# Vet API Test Script
# Run this to verify the API works correctly

set -e

API_URL="${API_URL:-http://localhost:3001}"
API_KEY="${API_KEY:-test_key}"

echo "🧪 Testing Vet API at $API_URL"
echo ""

# Health check
echo "1️⃣ Health check..."
curl -s "$API_URL/health" | jq .
echo ""

# OpenAPI spec
echo "2️⃣ OpenAPI spec..."
curl -s "$API_URL/openapi.json" | jq '.info'
echo ""

# Portal
echo "3️⃣ Portal page..."
curl -s "$API_URL/portal" | head -5
echo "..."
echo ""

# Test authenticated endpoints (will fail without real auth)
echo "4️⃣ Patients (requires auth)..."
curl -s -H "X-Api-Key: $API_KEY" "$API_URL/patients" | jq . || echo "Expected: auth error"
echo ""

echo "✅ API is running!"
echo ""
echo "To test with real auth:"
echo "  1. Create an API key through the web app"
echo "  2. Run: API_KEY=vet_your_key_here ./test-api.sh"