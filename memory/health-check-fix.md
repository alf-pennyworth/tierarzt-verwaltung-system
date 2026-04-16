# Health Check Fix - 2026-04-16

## Problem
The health check endpoint was querying a non-existent `antibiotics` table instead of the actual `medikamente` table with a category filter.

## Root Cause
- The antibiotics data is stored in `medikamente` table with `category = 'antibiotika'`
- The health check was using `.from('antibiotics')` which doesn't exist
- The demo-data.sh script also referenced the wrong table

## Files Fixed

### 1. api/src/index.ts (lines 142-153)
**Before:**
```typescript
const { count, error } = await supabase
  .from('antibiotics')
  .select('*', { count: 'exact', head: true });
```

**After:**
```typescript
const { count, error } = await supabase
  .from('medikamente')
  .select('*', { count: 'exact', head: true })
  .eq('category', 'antibiotika');
```

### 2. scripts/demo-data.sh (lines 123-133)
**Before:**
```bash
ANTIBIOTICS_COUNT=$(curl -s "$SUPABASE_URL/rest/v1/antibiotics?select=count" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Prefer: count=exact" | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")
```

**After:**
```bash
ANTIBIOTICS_COUNT=$(curl -s "$SUPABASE_URL/rest/v1/medikamente?select=count&category=eq.antibiotika" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Prefer: count=exact" | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")
```

Also fixed the migration filename reference from `20260412_seed_antibiotics.sql` to `20260410_seed_data.sql`.

## Commit
```
fcf2a72 fix: health check uses medikamente table with category filter
```

## Verification Needed
The health check endpoint `/health` should now return the correct count of antibiotics from the `medikamente` table where `category='antibiotika'`.

To verify:
```bash
curl http://localhost:3001/health | jq .database
```

Expected output should include the correct count of antibiotics (not 0 or an error).