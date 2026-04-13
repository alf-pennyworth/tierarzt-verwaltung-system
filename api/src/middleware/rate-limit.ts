/**
 * Rate Limiting Middleware
 * 
 * Implements per-API-key rate limiting using sliding window
 */

import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware
 * 
 * Default: 100 requests per minute per API key
 */
export function rateLimitMiddleware() {
  return createMiddleware(async (c: Context, next: Next) => {
    const apiKey = c.get('apiKey');
    
    if (!apiKey) {
      // No API key context, skip rate limiting (should not happen after auth)
      return next();
    }
    
    const keyPrefix = `ratelimit:${apiKey.id}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = apiKey.rateLimit || 100;
    
    // Get current entry
    let entry = rateLimitStore.get(keyPrefix);
    
    // Initialize or reset window
    if (!entry || entry.resetAt < now) {
      entry = {
        count: 0,
        resetAt: now + windowMs,
      };
    }
    
    // Increment count
    entry.count++;
    rateLimitStore.set(keyPrefix, entry);
    
    // Calculate remaining and reset time
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetTime = Math.ceil(entry.resetAt / 1000);
    
    // Set headers
    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(resetTime));
    
    // Check if rate limit exceeded
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      
      return c.json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retry_after: retryAfter,
        },
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      }, 429);
    }
    
    return next();
  });
}

/**
 * Custom rate limiter for specific endpoints
 */
export function customRateLimit(maxRequests: number, windowMs: number = 60000) {
  return createMiddleware(async (c: Context, next: Next) => {
    const apiKey = c.get('apiKey');
    const praxisId = c.get('praxisId');
    
    if (!apiKey) {
      return next();
    }
    
    // Use endpoint-specific key
    const keyPrefix = `ratelimit:${apiKey.id}:${c.req.path}`;
    const now = Date.now();
    
    let entry = rateLimitStore.get(keyPrefix);
    
    if (!entry || entry.resetAt < now) {
      entry = {
        count: 0,
        resetAt: now + windowMs,
      };
    }
    
    entry.count++;
    rateLimitStore.set(keyPrefix, entry);
    
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetTime = Math.ceil(entry.resetAt / 1000);
    
    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(resetTime));
    
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      
      return c.json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded for this endpoint. Try again in ${retryAfter} seconds.`,
          retry_after: retryAfter,
        },
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      }, 429);
    }
    
    return next();
  });
}

export { rateLimitStore };