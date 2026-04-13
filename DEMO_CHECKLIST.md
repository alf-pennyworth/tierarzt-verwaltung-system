# Demo Checklist - Wednesday 2026-04-16

## Pre-Demo (Tuesday Night)

### Frontend
- [ ] `bun run dev` starts without errors
- [ ] Login flow works
- [ ] Patient CRUD works
- [ ] TAMG dashboard loads
- [ ] BVL export generates CSV

### API
- [ ] `cd api && bun run src/index.ts` starts
- [ ] `/health` returns `status: ok`
- [ ] `/portal` shows documentation
- [ ] `/transcribe` endpoint exists (requires auth)
- [ ] `/extract` endpoint exists (requires auth)
- [ ] `/soap` endpoint exists (requires auth)

### Database
- [ ] Supabase connection works
- [ ] RLS policies active (check in dashboard)
- [ ] 56 antibiotics seeded

### Security
- [ ] Rate limiting works (test with 20+ requests)
- [ ] CORS blocks random origins
- [ ] API key required for protected routes

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

## Contact

- Developer: Chef-Agent
- Owner: Konstantin
- Repository: tierarzt-verwaltung-system