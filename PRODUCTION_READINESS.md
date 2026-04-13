# Production Readiness Checklist

## Pre-Launch Status - Monday 2026-04-13

### ✅ Completed

- [x] RLS policies applied and verified
- [x] API build successful (14 endpoints)
- [x] Frontend build successful (~1.5MB bundle)
- [x] 31/31 tests passing
- [x] 11 commits since Thursday
- [x] Security audit passed
- [x] E2E test documentation
- [x] Demo preparation scripts
- [x] 46 antibiotics seeded
- [x] UPD integration code ready

### 🔲 Remaining Before Wednesday Launch

#### Tuesday Priority

1. **CORS Configuration**
   - [ ] Add production domain to allowed origins
   - [ ] Test cross-origin requests

2. **Environment Variables**
   - [ ] Verify all required env vars documented
   - [ ] Set up production `.env` template

3. **Demo Rehearsal**
   - [ ] Run through full demo flow
   - [ ] Test BVL export with sample data
   - [ ] Verify AI transcription endpoint

4. **UPD Registration**
   - [ ] Register at EMA Account Management
   - [ ] Request UPD API access
   - [ ] Store credentials in `.env`

#### Wednesday Morning

5. **Final Smoke Tests**
   - [ ] `bun test` passes
   - [ ] `bun run build` succeeds
   - [ ] API health check
   - [ ] Frontend loads

6. **Go Live**
   - [ ] Deploy to production
   - [ ] Verify public access
   - [ ] Monitor for errors

---

## Required Environment Variables

```bash
# Supabase (required)
VITE_SUPABASE_URL=https://szwtfzhxmlczavkuvfjw.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# AI APIs (required for AI endpoints)
VITE_ASSEMBLYAI_API_KEY=<assemblyai-key>
VITE_GEMINI_API_KEY=<gemini-key>

# UPD API (optional - for drug sync)
VITE_UPD_CLIENT_ID=<client-id>
VITE_UPD_CLIENT_SECRET=<client-secret>

# API Server
PORT=3001
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api-keys` | List API keys |
| POST | `/api-keys` | Create API key |
| GET | `/patients` | List patients |
| POST | `/patients` | Create patient |
| GET | `/treatments` | List treatments |
| POST | `/treatments` | Create treatment |
| GET | `/tamg/prescriptions` | List antibiotic prescriptions |
| POST | `/tamg/prescriptions` | Create prescription |
| GET | `/tamg/export` | BVL export CSV |
| GET | `/tamg/antibiotics` | List antibiotics |
| POST | `/transcribe` | AI transcription (AssemblyAI) |
| POST | `/extract` | AI extraction (Gemini) |
| POST | `/soap` | AI SOAP note generation |

---

## Security Notes

- RLS policies require authenticated users
- Service role key only used server-side
- Anon key returns empty array without auth token
- API keys stored hashed in database

---

## Post-Launch

1. Monitor usage metrics
2. Collect user feedback
3. Plan VetiData integration (UPD + VetGeni/Plumb's)
4. Add more antibiotics from UPD sync
5. Expand species support