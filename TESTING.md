# Vet App - Testing Instructions

## Prerequisites

```bash
# Ensure bun is installed
export PATH="$HOME/.bun/bin:$PATH"

# Navigate to project
cd /home/node/.openclaw/workspace/vet-app-repo
```

## Unit Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test src/lib/bvl-export.test.ts

# Run with coverage
bun test --coverage
```

**Expected:** 31 tests passing

## Build Check

```bash
# Production build
bun run build

# Development server
bun run dev --host 0.0.0.0 --port 8080
```

**Expected:** Build succeeds in ~7 seconds

## API Testing

### Start the API

```bash
cd api
bun run src/index.ts
```

### Health Check

```bash
curl http://localhost:3001/health
```

**Expected:**
```json
{"status":"ok","timestamp":"...","version":"1.0.0","endpoints":[...]}
```

### Portal

```bash
curl http://localhost:3001/portal
```

**Expected:** HTML documentation page

### OpenAPI Spec

```bash
curl http://localhost:3001/openapi.json | jq .
```

### AI Endpoints (require auth)

```bash
# Test without auth (should fail)
curl -X POST http://localhost:3001/transcribe \
  -H "Content-Type: application/json" \
  -d '{"audio_url": "https://example.com/audio.mp3"}'

# Expected: 401 Unauthorized
```

## E2E Flow Test

### 1. Start Services

```bash
# Terminal 1: API
cd api && bun run src/index.ts

# Terminal 2: Frontend
bun run dev
```

### 2. Test Patient Flow

1. Open http://localhost:8080
2. Login with test credentials
3. Navigate to Patients
4. Create new patient
5. View patient details
6. Edit patient
7. Delete patient

### 3. Test TAMG Flow

1. Navigate to TAMG dashboard
2. Create antibiotic prescription
3. Filter prescriptions
4. Generate BVL CSV export
5. Download and verify CSV format

## Integration Testing

### Transcription (requires AssemblyAI key)

```bash
curl -X POST http://localhost:3001/transcribe \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: your_key" \
  -d '{"audio_url": "https://example.com/audio.mp3"}'
```

### Medical Extraction

```bash
curl -X POST http://localhost:3001/extract \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: your_key" \
  -d '{"transcript": "Der Patient zeigt Symptome von..."}'
```

### SOAP Generation

```bash
curl -X POST http://localhost:3001/soap \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: your_key" \
  -d '{"transcript": "Der Patient zeigt...", "language": "de"}'
```

## Rate Limit Testing

```bash
# Hit rate limit (10 requests for transcribe)
for i in {1..15}; do
  curl -s http://localhost:3001/transcribe \
    -H "X-Api-Key: test" \
    -d '{}' | jq -r '.error.code // .status'
done

# Expected: After 10, get RATE_LIMIT_EXCEEDED
```

## Security Checklist

- [ ] No secrets in git history
- [ ] CORS blocks random origins
- [ ] Rate limiting active
- [ ] Auth required for protected routes
- [ ] HTTPS only in production