/**
 * Rate Limiter for Supabase Edge Functions
 * 
 * Uses a simple in-memory approach with cleanup.
 * For production at scale, consider using Upstash Redis or similar.
 * 
 * Usage:
 * ```typescript
 * import { rateLimiter } from './_shared/rate-limiter.ts'
 * 
 * const limiter = rateLimiter({
 *   windowMs: 60 * 1000, // 1 minute
 *   maxRequests: 10
 * })
 * 
 * const userId = auth.uid()
 * const allowed = await limiter.check(userId)
 * if (!allowed) {
 *   return new Response('Rate limit exceeded', { status: 429 })
 * }
 * ```
 */

export interface RateLimitConfig {
  windowMs: number        // Time window in milliseconds
  maxRequests: number     // Max requests per window
  cleanupIntervalMs?: number // How often to cleanup old entries
}

export interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimiter {
  check(key: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }>
  reset(key: string): void
}

// In-memory store (resets on function cold start, which is acceptable for basic rate limiting)
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Creates a rate limiter instance
 */
export function rateLimiter(config: RateLimitConfig): RateLimiter {
  const { windowMs, maxRequests, cleanupIntervalMs = 60 * 1000 } = config

  // Cleanup old entries periodically
  let lastCleanup = Date.now()
  
  const cleanup = () => {
    const now = Date.now()
    if (now - lastCleanup > cleanupIntervalMs) {
      for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < now) {
          rateLimitStore.delete(key)
        }
      }
      lastCleanup = now
    }
  }

  return {
    async check(key: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
      cleanup()
      
      const now = Date.now()
      const entry = rateLimitStore.get(key)

      if (!entry || entry.resetAt < now) {
        // New window
        const newEntry: RateLimitEntry = {
          count: 1,
          resetAt: now + windowMs
        }
        rateLimitStore.set(key, newEntry)
        return {
          allowed: true,
          remaining: maxRequests - 1,
          resetAt: newEntry.resetAt
        }
      }

      if (entry.count >= maxRequests) {
        // Rate limit exceeded
        return {
          allowed: false,
          remaining: 0,
          resetAt: entry.resetAt
        }
      }

      // Increment count
      entry.count++
      return {
        allowed: true,
        remaining: maxRequests - entry.count,
        resetAt: entry.resetAt
      }
    },

    reset(key: string): void {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Helper to extract user ID from request headers
 */
export function getUserIdFromRequest(req: Request): string | null {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  
  // In Supabase Edge Functions, the JWT is already validated
  // We can use the user's IP + User-Agent as fallback identifier
  const forwardedFor = req.headers.get('x-forwarded-for')
  const userAgent = req.headers.get('user-agent')
  
  // Use IP as key if no auth (for unauthenticated endpoints)
  if (forwardedFor) {
    return `ip:${forwardedFor.split(',')[0].trim()}`
  }
  
  return null
}

/**
 * Rate limit response helper
 */
export function rateLimitResponse(remaining: number, resetAt: number): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetAt.toString()
      }
    }
  )
}

/**
 * Example usage in an Edge Function:
 * 
 * ```typescript
 * import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
 * import { rateLimiter, getUserIdFromRequest, rateLimitResponse } from "./_shared/rate-limiter.ts"
 * 
 * const limiter = rateLimiter({
 *   windowMs: 60 * 1000, // 1 minute
 *   maxRequests: 10      // 10 requests per minute
 * })
 * 
 * serve(async (req) => {
 *   if (req.method === 'OPTIONS') {
 *     return new Response(null, { headers: corsHeaders })
 *   }
 * 
 *   // Get user identifier (from auth or IP)
 *   const userId = getUserIdFromRequest(req) || 'anonymous'
 *   
 *   // Check rate limit
 *   const { allowed, remaining, resetAt } = await limiter.check(userId)
 *   
 *   if (!allowed) {
 *     return rateLimitResponse(remaining, resetAt)
 *   }
 * 
 *   // ... rest of your function logic
 *   return new Response(JSON.stringify({ data: 'ok' }), {
 *     headers: {
 *       ...corsHeaders,
 *       'X-RateLimit-Remaining': remaining.toString()
 *     }
 *   })
 * })
 * ```
 */