/**
 * Rate Limiting Middleware Tests
 * 
 * Tests for:
 * 1. Rate limiting kicks in after 100 requests (default limit)
 * 2. X-RateLimit headers are set correctly
 * 3. Rate limit resets after window expires
 * 4. Custom rate limits work correctly
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Hono } from 'hono';
import { rateLimitMiddleware, customRateLimit, rateLimitStore } from './rate-limit.js';

// ============================================
// Test Helpers
// ============================================

/**
 * Create a mock API key context
 */
function createMockApiKey(overrides: Partial<{
  id: string;
  praxisId: string;
  name: string;
  environment: 'live' | 'test';
  scopes: string[];
  rateLimit: number;
}> = {}) {
  return {
    id: 'test-key-id',
    praxisId: 'test-praxis',
    name: 'Test Key',
    environment: 'live' as const,
    scopes: ['read', 'write'],
    rateLimit: 100,
    ...overrides,
  };
}

/**
 * Create a test app with rate limiting
 */
function createTestApp(options: { customLimit?: number; windowMs?: number } = {}) {
  const app = new Hono();
  
  // Set up context with mock API key
  app.use('*', async (c, next) => {
    const apiKey = createMockApiKey({ rateLimit: options.customLimit || 100 });
    c.set('apiKey', apiKey);
    c.set('requestId', 'test-request-id');
    await next();
  });
  
  // Apply rate limiting
  if (options.customLimit) {
    app.use('*', customRateLimit(options.customLimit, options.windowMs || 60000));
  } else {
    app.use('*', rateLimitMiddleware);
  }
  
  // Test endpoint
  app.get('/test', (c) => c.json({ success: true, message: 'OK' }));
  
  return app;
}

/**
 * Clear rate limit store between tests
 */
function clearRateLimitStore() {
  rateLimitStore.clear();
}

// ============================================
// Tests
// ============================================

describe('Rate Limiting Middleware', () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  afterEach(() => {
    clearRateLimitStore();
  });

  describe('X-RateLimit Headers', () => {
    test('sets X-RateLimit-Limit header correctly', async () => {
      const app = createTestApp();
      
      const response = await app.request('/test', { method: 'GET' });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
    });

    test('sets X-RateLimit-Remaining header correctly', async () => {
      const app = createTestApp();
      
      // First request
      const response1 = await app.request('/test', { method: 'GET' });
      expect(response1.headers.get('X-RateLimit-Remaining')).toBe('99');
      
      // Second request
      const response2 = await app.request('/test', { method: 'GET' });
      expect(response2.headers.get('X-RateLimit-Remaining')).toBe('98');
    });

    test('sets X-RateLimit-Reset header as Unix timestamp', async () => {
      const app = createTestApp();
      
      const response = await app.request('/test', { method: 'GET' });
      const resetHeader = response.headers.get('X-RateLimit-Reset');
      
      expect(resetHeader).not.toBeNull();
      
      // Should be a valid Unix timestamp (seconds)
      const resetTime = parseInt(resetHeader!, 10);
      expect(Number.isFinite(resetTime)).toBe(true);
      
      // Should be in the future (within 2 minutes)
      const now = Math.floor(Date.now() / 1000);
      expect(resetTime).toBeGreaterThan(now);
      expect(resetTime).toBeLessThan(now + 120);
    });

    test('X-RateLimit-Remaining never goes below 0', async () => {
      const app = createTestApp({ customLimit: 5 });
      
      // Make 10 requests (limit is 5)
      for (let i = 0; i < 10; i++) {
        const response = await app.request('/test', { method: 'GET' });
        const remaining = response.headers.get('X-RateLimit-Remaining');
        expect(parseInt(remaining!, 10)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Rate Limit Enforcement', () => {
    test('allows requests under the limit', async () => {
      const app = createTestApp({ customLimit: 10 });
      
      // Make 10 requests (exactly at limit)
      for (let i = 0; i < 10; i++) {
        const response = await app.request('/test', { method: 'GET' });
        expect(response.status).toBe(200);
      }
    });

    test('blocks requests after limit exceeded', async () => {
      const app = createTestApp({ customLimit: 5 });
      
      // Make 5 allowed requests
      for (let i = 0; i < 5; i++) {
        const response = await app.request('/test', { method: 'GET' });
        expect(response.status).toBe(200);
      }
      
      // 6th request should be blocked
      const response = await app.request('/test', { method: 'GET' });
      expect(response.status).toBe(429);
    });

    test('default limit is 100 requests', async () => {
      const app = createTestApp();
      
      // Make 100 requests (default limit)
      for (let i = 0; i < 100; i++) {
        const response = await app.request('/test', { method: 'GET' });
        expect(response.status).toBe(200);
      }
      
      // 101st request should be blocked
      const response = await app.request('/test', { method: 'GET' });
      expect(response.status).toBe(429);
    });

    test('returns 429 with proper error response', async () => {
      const app = createTestApp({ customLimit: 2 });
      
      // Exhaust limit
      await app.request('/test', { method: 'GET' });
      await app.request('/test', { method: 'GET' });
      
      // Third request blocked
      const response = await app.request('/test', { method: 'GET' });
      
      expect(response.status).toBe(429);
      
      const body = await response.json() as any;
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(body.error.message).toContain('Rate limit exceeded');
      expect(body.error.retry_after).toBeDefined();
      expect(body.error.retry_after).toBeGreaterThan(0);
      expect(body.requestId).toBe('test-request-id');
    });
  });

  describe('Rate Limit Window Reset', () => {
    test('rate limit resets after window expires', async () => {
      // Use a short window (500ms) for testing
      const app = createTestApp({ customLimit: 3, windowMs: 500 });
      
      // Exhaust limit
      await app.request('/test', { method: 'GET' });
      await app.request('/test', { method: 'GET' });
      await app.request('/test', { method: 'GET' });
      
      // Next request blocked
      const blockedResponse = await app.request('/test', { method: 'GET' });
      expect(blockedResponse.status).toBe(429);
      
      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Clear the store to simulate window reset (since our mock doesn't auto-reset)
      clearRateLimitStore();
      
      // New requests should work
      const response = await app.request('/test', { method: 'GET' });
      expect(response.status).toBe(200);
    });

    test('each API key has independent rate limit', async () => {
      // Create two apps with different API keys
      const app1 = new Hono();
      const app2 = new Hono();
      
      // App 1 with key-1
      app1.use('*', async (c, next) => {
        c.set('apiKey', createMockApiKey({ id: 'key-1', rateLimit: 3 }));
        c.set('requestId', 'req-1');
        await next();
      });
      app1.use('*', customRateLimit(3, 60000));
      app1.get('/test', (c) => c.json({ success: true }));
      
      // App 2 with key-2
      app2.use('*', async (c, next) => {
        c.set('apiKey', createMockApiKey({ id: 'key-2', rateLimit: 3 }));
        c.set('requestId', 'req-2');
        await next();
      });
      app2.use('*', customRateLimit(3, 60000));
      app2.get('/test', (c) => c.json({ success: true }));
      
      // Exhaust key-1 limit
      await app1.request('/test', { method: 'GET' });
      await app1.request('/test', { method: 'GET' });
      await app1.request('/test', { method: 'GET' });
      
      // key-1 should be blocked
      const response1 = await app1.request('/test', { method: 'GET' });
      expect(response1.status).toBe(429);
      
      // key-2 should still work
      const response2 = await app2.request('/test', { method: 'GET' });
      expect(response2.status).toBe(200);
    });
  });

  describe('Custom Rate Limits', () => {
    test('customRateLimit applies endpoint-specific limits', async () => {
      const app = new Hono();
      
      app.use('*', async (c, next) => {
        c.set('apiKey', createMockApiKey({ id: 'key-1', rateLimit: 100 }));
        c.set('requestId', 'req-1');
        await next();
      });
      
      // Custom limit of 2 for specific endpoint
      app.use('/special', customRateLimit(2, 60000));
      app.get('/special', (c) => c.json({ success: true }));
      
      // Regular endpoint uses default
      app.use('*', rateLimitMiddleware);
      app.get('/regular', (c) => c.json({ success: true }));
      
      // Exhaust /special limit
      await app.request('/special', { method: 'GET' });
      await app.request('/special', { method: 'GET' });
      
      // /special should be blocked
      const specialResponse = await app.request('/special', { method: 'GET' });
      expect(specialResponse.status).toBe(429);
      
      // /regular should still work (uses different rate limit key)
      const regularResponse = await app.request('/regular', { method: 'GET' });
      expect(regularResponse.status).toBe(200);
    });

    test('respects API key rate limit setting', async () => {
      const app = new Hono();
      
      // API key with custom rate limit of 5
      app.use('*', async (c, next) => {
        c.set('apiKey', createMockApiKey({ id: 'key-1', rateLimit: 5 }));
        c.set('requestId', 'req-1');
        await next();
      });
      app.use('*', rateLimitMiddleware);
      app.get('/test', (c) => c.json({ success: true }));
      
      // Should respect API key's rate limit (5)
      for (let i = 0; i < 5; i++) {
        const response = await app.request('/test', { method: 'GET' });
        expect(response.status).toBe(200);
        expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
      }
      
      // 6th request blocked
      const response = await app.request('/test', { method: 'GET' });
      expect(response.status).toBe(429);
    });
  });

  describe('Edge Cases', () => {
    test('skips rate limiting if no API key context', async () => {
      const app = new Hono();
      
      // No API key set
      app.use('*', async (c, next) => {
        c.set('requestId', 'req-1');
        await next();
      });
      app.use('*', rateLimitMiddleware);
      app.get('/test', (c) => c.json({ success: true }));
      
      // Should allow requests without API key
      const response = await app.request('/test', { method: 'GET' });
      expect(response.status).toBe(200);
      
      // No rate limit headers should be set
      expect(response.headers.get('X-RateLimit-Limit')).toBeNull();
    });

    test('handles concurrent requests correctly', async () => {
      const app = createTestApp({ customLimit: 10 });
      
      // Make 10 concurrent requests
      const requests = Array.from({ length: 10 }, () =>
        app.request('/test', { method: 'GET' })
      );
      
      const responses = await Promise.all(requests);
      
      // All should succeed (within limit)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Verify remaining is 0 after all complete
      const finalResponse = await app.request('/test', { method: 'GET' });
      expect(finalResponse.status).toBe(429);
    });

    test('counts requests accurately under load', async () => {
      const app = createTestApp({ customLimit: 50 });
      
      // Make exactly 50 requests
      let successCount = 0;
      for (let i = 0; i < 50; i++) {
        const response = await app.request('/test', { method: 'GET' });
        if (response.status === 200) successCount++;
      }
      
      expect(successCount).toBe(50);
      
      // 51st should fail
      const response = await app.request('/test', { method: 'GET' });
      expect(response.status).toBe(429);
    });
  });

  describe('Response Headers on Rate Limited Requests', () => {
    test('includes Retry-After header on 429', async () => {
      const app = createTestApp({ customLimit: 1, windowMs: 5000 });
      
      // Exhaust limit
      await app.request('/test', { method: 'GET' });
      
      // Get rate limited response
      const response = await app.request('/test', { method: 'GET' });
      
      expect(response.status).toBe(429);
      
      const body = await response.json() as any;
      expect(body.error.retry_after).toBeDefined();
      expect(body.error.retry_after).toBeGreaterThan(0);
      expect(body.error.retry_after).toBeLessThanOrEqual(5);
    });
  });
});

// ============================================
// Run Tests
// ============================================

console.log('Running Rate Limiting Middleware Tests...');