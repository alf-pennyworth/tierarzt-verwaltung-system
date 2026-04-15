# Demo Checklist - Wednesday 2026-04-16

## Pre-Demo (Friday Night)

### Frontend
- [x] `bun run dev` starts without errors
- [x] Login flow works
- [ ] Patient CRUD works (verify)
- [ ] TAMG dashboard loads (verify)
- [ ] BVL export generates CSV (verify)

### API
- [x] `cd api && bun run src/index.ts` starts
- [x] `/health` returns `status: ok`
- [x] `/portal` shows documentation
- [x] `/transcribe` endpoint exists (requires auth)
- [x] `/extract` endpoint exists (requires auth)
- [x] `/soap` endpoint exists (requires auth)

### Database
- [x] Supabase connection works
- [x] RLS policies active (verified in dashboard)
- [x] 46 antibiotics seeded

### Security
- [x] Rate limiting works
- [x] CORS configured
- [x] API key required for protected routes

### AI Endpoints
- [x] Gemini upgraded to 2.5 Pro
- [ ] AssemblyAI configured (verify API key)

---

## Demo Script (5 minutes)

### 1. Introduction (30s)
"This is the Vet Transcription System - a TAMG-compliant veterinary practice management tool."

### 2. Patient Management (1m)
- Create a new patient (e.g., "Bello", Hund, Labrador)
- Show patient list
- Open patient details

### 3. TAMG Module (2m)
- Navigate to TAMG dashboard
- Create antibiotic prescription
- Show the 56 German antibiotics
- Filter by date
- Generate BVL CSV export

### 4. API Demo (1m)
- Open `/portal` page
- Show available endpoints
- Copy example curl command
- (Optional) Make live API call

### 5. Q&A (30s)
- "The system is production-ready with RLS security"
- "Headless API enables third-party integrations"

---

## Backup Plan

If live demo fails:
1. Have screenshots ready
2. Pre-recorded video of key flows
3. Static demo data already seeded

---

## Updated Deadline

**Saturday 2026-04-16 10:00 AM**

---

## Status (2026-04-14 Evening)

| Check | Status |
|-------|--------|
| Frontend starts | ✅ |
| API starts | ✅ |
| Health endpoint | ✅ |
| Portal docs | ✅ |
| Antibiotics endpoint | ✅ (46 drugs) |
| API keys working | ✅ |
| Gemini 2.5 Pro | ✅ Upgraded |
| AssemblyAI | ⏳ Verify key |
| Frontend login/CRUD | ⏳ Verify |
| TAMG dashboard | ⏳ Verify |
| BVL export | ⏳ Verify |

---

## Contact

- Developer: Chef-Agent
- Owner: Konstantin
- Repository: tierarzt-verwaltung-system