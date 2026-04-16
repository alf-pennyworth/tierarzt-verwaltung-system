# Demo Rehearsal Report

**Date:** 2026-04-16
**Prepared by:** Subagent (demo-rehearsal)

## Executive Summary

The demo rehearsal revealed several critical issues that need to be addressed before the Saturday demo:

1. **Demo user does not exist** - Cannot login with demo@tierarzt-app.de
2. **Database schema mismatch** - Health check references non-existent `antibiotics` table
3. **Bun dependency** - Project requires Bun but only Node.js is available in this environment
4. **Environment loading issues** - ES module imports prevent proper env var initialization

## Issues Found

### 🔴 CRITICAL: Demo User Not Created

**Problem:** The demo credentials `demo@tierarzt-app.de / demo123456` do not exist in Supabase Auth.

**Impact:** Cannot perform login step of demo script.

**Evidence:**
```
curl -X POST ".../auth/v1/token?grant_type=password" \
  -d '{"email":"demo@tierarzt-app.de","password":"demo123456"}'

Response: {"code":400,"error_code":"invalid_credentials","msg":"Invalid login credentials"}
```

**Fix Required:**
- Create demo user in Supabase Auth
- Or update the demo script with valid credentials

### 🔴 CRITICAL: Database Schema Mismatch

**Problem:** The API health check queries `antibiotics` table, but the database has `medikamente` table instead.

**Location:** `/api/src/index.ts` - health check endpoint

**Current Code:**
```typescript
const { count, error } = await supabase
  .from('antibiotics')
  .select('*', { count: 'exact', head: true });
```

**Impact:** Health check shows `database: {status: "error", antibiotics: 0}` even though antibiotics data exists in `medikamente` table.

**Fix Required:**
```typescript
const { data, error } = await supabase
  .from('medikamente')
  .select('id')
  .contains('category', ['antibiotic']);

const antibioticCount = data?.length || 0;
```

### 🟡 MEDIUM: Environment Variable Loading

**Problem:** ES modules load imports before code runs, causing environment variables to be undefined when modules initialize.

**Impact:** API crashes with "supabaseUrl is required" when accessing protected endpoints.

**Workaround Created:** `api/run-server.mts` - loads env vars before importing app.

**Fix Required:** The original Bun server properly loads env vars. For Node.js, either:
1. Use the `run-server.mts` wrapper script
2. Install and use Bun in production

### 🟡 MEDIUM: Demo Data Script Issues

**Problem:** `scripts/demo-data.sh` references `antibiotics` table which doesn't exist.

**Location:** Line ~135 in demo-data.sh

```bash
ANTIBIOTICS_COUNT=$(curl -s "$SUPABASE_URL/rest/v1/antibiotics?select=count" ...
```

**Fix Required:** Update to query `medikamente` table with category filter.

## Services Status

### Frontend (Port 8080)
- ✅ Running via `npm run dev`
- ✅ Vite dev server responsive
- ⚠️ Cannot test login without demo user

### API (Port 3001)
- ✅ Running via `npx tsx run-server.mts` (workaround)
- ✅ Health endpoint working
- ✅ Auth middleware working
- ✅ Protected endpoints require API key
- ❌ Health check shows wrong antibiotic count (schema issue)

## Database Status

**Tables Found:**
- `praxis` - 1 practice exists (Test Tierarztpraxis)
- `profiles` - Empty (no users)
- `patient` - Not checked
- `medikamente` - Multiple antibiotics exist
- `antibiotic_prescriptions` - Not checked
- `api_keys` - Not checked
- `behandlungen` - Exists

**Tables Missing:**
- `antibiotics` - Referenced by health check but doesn't exist

## What Was Verified

### ✅ Working
1. Frontend starts successfully
2. API starts successfully (with workaround)
3. API health endpoint returns 200
4. API auth middleware correctly rejects unauthenticated requests
5. Supabase connection works (can query `medikamente`)

### ❌ Not Verified (Blocked)
1. Login flow - no demo user exists
2. Dashboard navigation - requires login
3. TAMG module - requires auth
4. New prescription creation - requires auth
5. BVL export - requires auth

### ❌ Known Broken
1. Health check antibiotic count always 0
2. Demo data script queries wrong table

## Recommendations

### Before Demo

1. **Create demo user** in Supabase Auth
   - Email: demo@tierarzt-app.de
   - Password: demo123456
   - Associate with practice ID: 00000000-0000-0000-0000-000000000001

2. **Fix health check** to query correct table

3. **Install Bun** or use the Node.js wrapper for API

4. **Run demo data script** after fixing table references

### For Demo Script

The demo script should be updated:
- Section 2.1 (Login) - Verify credentials work before demo
- Section 2.3 (TAMG Dashboard) - Ensure prescriptions exist
- Section 2.6 (API Portal) - Verify `/portal` endpoint works

## Files Modified

1. `api/src/server.ts` - Created Node.js server adapter
2. `api/run-server.mts` - Created env-loading wrapper
3. `api/src/index.ts` - Changed `const port` to `export const port`

## Appendix: Test Commands

```bash
# Check frontend
curl http://localhost:8080

# Check API health
curl http://localhost:3001/health

# Test antibiotics endpoint (requires API key)
curl http://localhost:3001/tamg/antibiotics \
  -H "Authorization: Bearer vet_live_xxx"

# Check Supabase directly
curl "https://szwtfzhxmlczavkuvfjw.supabase.co/rest/v1/medikamente?select=*&limit=5" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY"

# Test login
curl -X POST "https://szwtfzhxmlczavkuvfjw.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@tierarzt-app.de","password":"demo123456"}'
```

---

**End of Report**