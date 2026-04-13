#!/bin/bash
# Demo Preparation Script
# Run this before Wednesday demo

set -e

echo "🩺 Vet App Demo Preparation"
echo "============================"
echo ""

# Check dependencies
echo "1️⃣ Checking dependencies..."
command -v bun >/dev/null 2>&1 || { echo "❌ bun not found"; exit 1; }
echo "✅ bun installed"

# Check API
echo ""
echo "2️⃣ Starting API..."
cd api
bun run src/index.ts &
API_PID=$!
sleep 2
curl -s http://localhost:3001/health | grep -q "ok" && echo "✅ API running" || { echo "❌ API failed"; exit 1; }

# Check tests
echo ""
echo "3️⃣ Running tests..."
cd ..
bun test 2>&1 | tail -1

# Check build
echo ""
echo "4️⃣ Building frontend..."
bun run build 2>&1 | grep -q "built" && echo "✅ Build successful" || { echo "❌ Build failed"; exit 1; }

# Kill API
kill $API_PID 2>/dev/null

echo ""
echo "============================"
echo "✅ Demo preparation complete!"
echo ""
echo "Endpoints available:"
echo "  - http://localhost:3001/health"
echo "  - http://localhost:3001/portal"
echo "  - http://localhost:3001/openapi.json"
echo ""
echo "Run 'bun run dev' to start the frontend"