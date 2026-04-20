# CORS Edge Functions Fix - 2025-04-16

## Task
Fix CORS in Supabase Edge Functions to replace `Access-Control-Allow-Origin: '*'` with proper origin validation.

## What Was Done

### Created Shared CORS Module
- File: `supabase/functions/_shared/cors.ts`
- Features:
  - `corsHeaders(req)` - generates proper CORS headers for any request
  - `handleCors(req)` - handles OPTIONS preflight requests
  - `websocketCorsHeaders(req)` - CORS headers for WebSocket connections
  - Uses `CORS_ORIGIN` environment variable (comma-separated) for production origins
  - Includes sensible development origins (localhost variants)

### Updated Edge Functions

1. **telemedizin-signaling/index.ts**
   - Removed hardcoded `corsHeaders` object with `'*'` origin
   - Now uses `websocketCorsHeaders(req)` and `handleCors(req)`

2. **match-text/index.ts**
   - Removed hardcoded `corsHeaders` object with `'*'` origin
   - Now uses shared `corsHeaders(req)` and `handleCors(req)`

3. **transcribe/index.ts**
   - Removed inline `ALLOWED_ORIGINS` array
   - Removed inline `corsHeaders(origin)` function
   - Now uses shared `corsHeaders(req)` and `handleCors(req)`

4. **gemini/index.ts**
   - Removed inline `ALLOWED_ORIGINS` array
   - Removed inline `corsHeaders(origin)` function
   - Now uses shared `corsHeaders(req)` and `handleCors(req)`

## CORS_ORIGIN Environment Variable

To configure production origins, set `CORS_ORIGIN` in Supabase Edge Functions environment:

```
CORS_ORIGIN=https://vet-app.de,https://app.vet-app.de
```

If not set, defaults to development origins only.

## Commit

```
3638a18 fix(cors): replace wildcard CORS with proper origin validation in Edge Functions
```

## Pattern Match

The Edge Functions now use the same CORS pattern as the main API (`api/src/index.ts`), ensuring consistency across the application.