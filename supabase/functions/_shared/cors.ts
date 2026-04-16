/**
 * CORS Configuration for Supabase Edge Functions
 * 
 * Matches the main API's CORS_ORIGIN pattern for consistency.
 * 
 * Usage:
 * ```typescript
 * import { corsHeaders, handleCors } from '../_shared/cors.ts'
 * 
 * serve(async (req) => {
 *   // Handle CORS preflight
 *   const corsResponse = handleCors(req)
 *   if (corsResponse) return corsResponse
 *   
 *   // ... your logic
 *   
 *   return new Response(JSON.stringify(data), {
 *     headers: corsHeaders(req)
 *   })
 * })
 * ```
 */

/**
 * Default development origins
 */
const DEV_ORIGINS = [
  'http://localhost:5173',   // Vite dev server
  'http://localhost:8080',   // Alternative dev port
  'http://localhost:8081',   // Another dev port
  'http://localhost:3001',   // API server (self-reference)
  'http://127.0.0.1:5173',   // 127.0.0.1 variants
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:3001',
  'https://vet-app.supabase.co', // Supabase hosted
]

/**
 * Get allowed origins from environment or defaults
 */
function getAllowedOrigins(): string[] {
  // Production origins from CORS_ORIGIN env var (comma-separated)
  const corsOrigin = Deno.env.get('CORS_ORIGIN')
  if (corsOrigin) {
    const prodOrigins = corsOrigin.split(',').map(s => s.trim()).filter(Boolean)
    return [...DEV_ORIGINS, ...prodOrigins]
  }
  return DEV_ORIGINS
}

/**
 * Get the allowed origin for a request
 */
export function getAllowedOrigin(req: Request): string {
  const allowed = getAllowedOrigins()
  const origin = req.headers.get('origin')
  
  // If no origin header, return first allowed origin
  if (!origin) return allowed[0]
  
  // Return the origin if allowed, otherwise fallback
  return allowed.includes(origin) ? origin : allowed[0]
}

/**
 * Generate CORS headers for a request
 */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = getAllowedOrigin(req)
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }
}

/**
 * Handle CORS preflight requests
 * Returns a Response if this is a preflight, null otherwise
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(req)
    })
  }
  return null
}

/**
 * CORS headers specifically for WebSocket connections
 * (fewer headers needed for WebSocket upgrade)
 */
export function websocketCorsHeaders(req: Request): Record<string, string> {
  const origin = getAllowedOrigin(req)
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}