#!/bin/bash
# Quick smoke test for API
# Run: ./scripts/smoke-test.sh

set -e

API_URL="${API_URL:-http://localhost:3001}"
PASS=0
FAIL=0

echo "🧪 API Smoke Tests"
echo "=================="

# Test 1: Health
echo -n "Health check... "
if curl -s "$API_URL/health" | grep -q '"status":"ok"'; then
  echo "✅"
  ((PASS++))
else
  echo "❌"
  ((FAIL++))
fi

# Test 2: Portal
echo -n "Portal page... "
if curl -s "$API_URL/portal" | grep -q "Vet App API"; then
  echo "✅"
  ((PASS++))
else
  echo "❌"
  ((FAIL++))
fi

# Test 3: OpenAPI
echo -n "OpenAPI spec... "
if curl -s "$API_URL/openapi.json" | grep -q '"openapi":"3.0.0"'; then
  echo "✅"
  ((PASS++))
else
  echo "❌"
  ((FAIL++))
fi

# Test 4: Auth required
echo -n "Auth middleware... "
if curl -s -o /dev/null -w "%{http_code}" "$API_URL/patients" | grep -q "401"; then
  echo "✅"
  ((PASS++))
else
  echo "❌"
  ((FAIL++))
fi

# Test 5: 404 handler
echo -n "404 handler... "
if curl -s -o /dev/null -w "%{http_code}" "$API_URL/nonexistent" | grep -q "404"; then
  echo "✅"
  ((PASS++))
else
  echo "❌"
  ((FAIL++))
fi

echo ""
echo "=================="
echo "Results: $PASS passed, $FAIL failed"

if [ $FAIL -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi