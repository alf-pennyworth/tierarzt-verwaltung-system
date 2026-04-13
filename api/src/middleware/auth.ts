/**
 * API Key Authentication Middleware
 * 
 * Validates API keys and loads praxis context
 */

import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { sha256 } from 'bun';

interface ApiKeyData {
  id: string;
  praxisId: string;
  name: string;
  environment: 'live' | 'test';
  scopes: string[];
  rateLimit: number;
}

declare module 'hono' {
  interface ContextVariableMap {
    apiKey: ApiKeyData;
    praxisId: string;
    requestId: string;
  }
}

/**
 * Extract API key from Authorization header
 */
function extractApiKey(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }
  
  const key = parts[1];
  
  // Validate key format: vet_live_ or vet_test_ prefix
  if (!key.startsWith('vet_live_') && !key.startsWith('vet_test_')) {
    return null;
  }
  
  return key;
}

/**
 * Hash API key for database lookup
 */
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get key prefix for lookup (first 12 chars)
 */
function getKeyPrefix(key: string): string {
  return key.substring(0, 12);
}

/**
 * Validate API key against database
 */
async function validateApiKey(key: string): Promise<ApiKeyData | null> {
  // TODO: Replace with actual database query
  // For now, return mock data for testing
  
  const keyHash = await hashApiKey(key);
  const keyPrefix = getKeyPrefix(key);
  
  // Mock: Accept test key
  if (key === 'vet_test_1234567890abcdefghijklmno') {
    return {
      id: '00000000-0000-0000-0000-000000000001',
      praxisId: '00000000-0000-0000-0000-000000000001',
      name: 'Test API Key',
      environment: 'test',
      scopes: ['read', 'write'],
      rateLimit: 100,
    };
  }
  
  // TODO: Query database
  // const result = await db.query.apiKeys.findFirst({
  //   where: and(
  //     eq(apiKeys.keyPrefix, keyPrefix),
  //     eq(apiKeys.keyHash, keyHash),
  //     isNull(apiKeys.revokedAt),
  //     or(
  //       isNull(apiKeys.expiresAt),
  //       gt(apiKeys.expiresAt, new Date())
  //     )
  //   )
  // });
  
  return null;
}

/**
 * Authentication middleware
 */
export function authMiddleware() {
  return createMiddleware(async (c: Context, next: Next) => {
    // Generate request ID
    const requestId = crypto.randomUUID();
    c.set('requestId', requestId);
    
    // Skip auth for health endpoints
    if (c.req.path === '/health' || c.req.path === '/health/ready') {
      return next();
    }
    
    // Extract Authorization header
    const authHeader = c.req.header('Authorization');
    const apiKey = extractApiKey(authHeader);
    
    if (!apiKey) {
      return c.json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Missing or invalid Authorization header. Use: Authorization: Bearer vet_live_...',
        },
        requestId,
        timestamp: new Date().toISOString(),
      }, 401);
    }
    
    // Validate API key
    const keyData = await validateApiKey(apiKey);
    
    if (!keyData) {
      return c.json({
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key. Check your key or generate a new one.',
        },
        requestId,
        timestamp: new Date().toISOString(),
      }, 401);
    }
    
    // Set context
    c.set('apiKey', keyData);
    c.set('praxisId', keyData.praxisId);
    
    // Update last used timestamp (async, don't wait)
    // TODO: db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, keyData.id));
    
    return next();
  });
}

/**
 * Scope checking middleware factory
 */
export function requireScope(...requiredScopes: string[]) {
  return createMiddleware(async (c: Context, next: Next) => {
    const apiKey = c.get('apiKey');
    
    if (!apiKey) {
      return c.json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Not authenticated',
        },
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      }, 401);
    }
    
    const hasScope = requiredScopes.some(scope => apiKey.scopes.includes(scope));
    
    if (!hasScope) {
      return c.json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: `Insufficient permissions. Required scope: ${requiredScopes.join(' or ')}`,
        },
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      }, 403);
    }
    
    return next();
  });
}

export type { ApiKeyData };