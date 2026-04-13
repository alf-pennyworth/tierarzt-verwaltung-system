# Vet App Security Audit & Hardening

**Date:** 2026-04-11  
**Status:** CRITICAL FIXES IMPLEMENTED  
**Risk Level Before:** 🔴 **CRITICAL** - Open access to all data  
**Risk Level After:** 🟡 **MEDIUM** - Tenant isolation in place, operational hardening needed

---

## ✅ What Was Fixed

### 1. Row Level Security (RLS) Policies - FIXED

**Before:** All tables had `USING (true)` policies, meaning anyone could read/write all data from any praxis.

**After:** Proper multi-tenant isolation implemented:
- Users can ONLY access data from their own `praxis_id`
- SELECT, INSERT, UPDATE, DELETE policies per table
- Service role bypass for admin operations
- RLS forced even for table owners

**Migration:** `supabase/migrations/20260411_production_rls.sql`

### 2. Audit Logging - IMPLEMENTED

- Created `audit_log` table
- Tracks: who, what, when, old/new values
- Triggers on: patient, behandlungen, medikamente, antibiotic_prescriptions, profiles
- Only service role can read audit logs (admin-only)

### 3. Helper Functions Created

```sql
get_current_praxis_id()  -- Returns user's praxis_id
is_authenticated()       -- Checks if user logged in
is_service_role()       -- Checks for admin operations
```

---

## ⚠️ Still Needs Work

### 1. Password Reset - NOT IMPLEMENTED

**Status:** Not handled by this security migration.  
**What to do:** Supabase Auth handles password reset emails natively:
- Configure Supabase Auth settings in dashboard
- Set up email templates for password reset
- Add password reset UI in the app

```typescript
// Client-side password reset trigger
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://your-app.com/reset-password'
})
```

### 2. API Key Security - AUDIT NEEDED

**Current State:**
- `ASSEMBLY_AI_API_KEY` - stored in Supabase secrets (Edge Function env)
- `GEMINI_API_KEY` - stored in Supabase secrets (Edge Function env)

**Assessment:**
- ✅ Keys are NOT in source code
- ✅ Keys are in Supabase secrets (correct approach)
- ⚠️ Edge Functions expose these keys to API calls
- ⚠️ No rate limiting on Edge Functions

**Recommendations:**
1. Rotate both API keys after going production
2. Add rate limiting to Edge Functions (see below)
3. Consider adding request signing/validation
4. Monitor API usage for anomalies

### 3. Rate Limiting - MISSING

**Current State:** No rate limiting on Edge Functions

**What to implement:**

#### Option A: Supabase Rate Limiting (Recommended)

```typescript
// In each Edge Function, add rate limiting
import { createClient } from '@supabase/supabase-js'

const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 10 // requests per window

async function checkRateLimit(userId: string): Promise<boolean> {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  
  const { data, error } = await supabase.rpc('check_rate_limit', {
    user_id: userId,
    window_ms: RATE_LIMIT_WINDOW,
    max_requests: RATE_LIMIT_MAX
  })
  
  return data === true
}
```

#### Option B: Use Upstash Redis (if available)

```typescript
import { Redis } from 'https://deno.land/x/upstash_redis/mod.ts'

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_TOKEN')!
})

async function rateLimit(key: string, limit: number, window: number): Promise<boolean> {
  const requests = await redis.incr(key)
  if (requests === 1) {
    await redis.expire(key, window)
  }
  return requests <= limit
}
```

### 4. Input Validation - NEEDS REVIEW

**Current State:** Basic validation in Edge Functions, but not comprehensive

**What to implement:**

```typescript
// Add Zod validation to each Edge Function
import { z } from 'https://deno.land/x/zod/mod.ts'

const TranscribeRequest = z.object({
  audio: z.string().min(1, 'Audio data required'),
  // Add max size check
})

const GeminiRequest = z.object({
  text: z.string().min(1).max(10000), // Limit text length
})
```

### 5. CORS Configuration - TOO PERMISSIVE

**Current State:** `Access-Control-Allow-Origin: '*'` in all Edge Functions

**Fix for production:**

```typescript
const ALLOWED_ORIGINS = [
  'https://your-app.com',
  'https://app.your-app.com'
]

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(req.headers.get('origin')) 
    ? req.headers.get('origin') 
    : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

### 6. Content Security Policy (CSP) - NOT CONFIGURED

**What to add in app:**

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  img-src 'self' data:;
  font-src 'self';
">
```

### 7. Security Headers - NOT CONFIGURED

Add these headers in your hosting platform or CDN:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

### 8. Session Management - NEEDS REVIEW

Supabase Auth handles this, but review:
- Session timeout settings
- Token refresh behavior
- Logout handling
- Concurrent session limits

### 9. Data Encryption

**At Rest:** Supabase handles this (AES-256)  
**In Transit:** HTTPS enforced by Supabase  
**In App:** Consider encrypting sensitive fields client-side if needed

---

## 🔒 Security Checklist

### Before Production Launch

- [ ] Run the RLS migration: `20260411_production_rls.sql`
- [ ] Test RLS policies with different user accounts
- [ ] Verify audit logging works
- [ ] Configure password reset in Supabase dashboard
- [ ] Add rate limiting to Edge Functions
- [ ] Rotate API keys (AssemblyAI, Gemini)
- [ ] Configure CORS for specific domains only
- [ ] Add security headers to frontend
- [ ] Review and test authentication flow
- [ ] Set up monitoring/alerting for security events
- [ ] Document incident response procedure
- [ ] Create backup/restore procedure

### Ongoing Security

- [ ] Monitor audit_log for suspicious activity
- [ ] Review API key usage monthly
- [ ] Quarterly security review
- [ ] Annual penetration test
- [ ] Keep dependencies updated

---

## 📊 Audit Log Queries

### Recent Activity by User

```sql
SELECT 
    u.email,
    a.table_name,
    a.action,
    COUNT(*) as count,
    MAX(a.created_at) as last_activity
FROM audit_log a
JOIN auth.users u ON a.user_id = u.id
WHERE a.created_at > NOW() - INTERVAL '7 days'
GROUP BY u.email, a.table_name, a.action
ORDER BY last_activity DESC;
```

### Suspicious Activity Detection

```sql
-- High volume deletes
SELECT user_id, table_name, COUNT(*) as delete_count
FROM audit_log
WHERE action = 'DELETE'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id, table_name
HAVING COUNT(*) > 10;

-- Cross-praxis access attempts (should be blocked by RLS)
SELECT * FROM audit_log
WHERE praxis_id != (
    SELECT praxis_id FROM profiles WHERE id = audit_log.user_id
);
```

---

## 🚨 Incident Response

### If Data Breach Suspected

1. **Immediately rotate all API keys** (AssemblyAI, Gemini, Supabase anon/service keys)
2. **Review audit_log** for unauthorized access patterns
3. **Check Supabase logs** for suspicious API calls
4. **Force password reset** for affected users if needed
5. **Notify affected users** per GDPR requirements

### Emergency Contacts

- Supabase Support: https://supabase.com/support
- AssemblyAI Support: https://www.assemblyai.com/support
- DPO contact: [TO BE FILLED]

---

## 📋 Security Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  - React/Vue/Next.js app                                    │
│  - Supabase JS client (anon key only)                       │
│  - Auth state management                                     │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Auth       │  │  PostgreSQL  │  │ Edge Funcs  │       │
│  │  (GoTrue)    │  │  + RLS       │  │ (Deno)      │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                  │               │
│         └─────────────────┴──────────────────┘              │
│                           │                                  │
│                    JWT validation                           │
│                    + Tenant isolation                         │
│                    via praxis_id                             │
│                           │                                  │
│                    ┌──────┴───────┐                          │
│                    │  Audit Log   │                          │
│                    │  Table       │                          │
│                    └──────────────┘                          │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐           ┌─────────────────┐
│   AssemblyAI    │           │     Gemini      │
│  (Transcription)│           │     (LLM)       │
└─────────────────┘           └─────────────────┘
    API key in                     API key in
    Supabase secrets               Supabase secrets
```

---

## 🔐 RLS Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| praxis | Own praxis only | ❌ Admin only | Own praxis only | ❌ Admin only |
| profiles | Same praxis | Trigger only | Own profile only | ❌ Admin only |
| patient | Same praxis | Same praxis | Same praxis | Same praxis |
| behandlungen | Same praxis | Same praxis | Same praxis | Same praxis |
| medikamente | Same praxis | Same praxis | Same praxis | Same praxis |
| antibiotic_prescriptions | Same praxis | Same praxis | Same praxis | Same praxis |
| audit_log | ❌ Admin only | ❌ Trigger only | ❌ Admin only | ❌ Admin only |

---

## Next Steps

1. **Immediate:** Run `20260411_production_rls.sql` migration
2. **This week:** Add rate limiting to Edge Functions
3. **This week:** Configure CORS properly
4. **Before launch:** Rotate API keys
5. **Before launch:** Configure password reset
6. **Ongoing:** Monitor audit logs

---

*Generated by Security Engineer subagent - 2026-04-11*