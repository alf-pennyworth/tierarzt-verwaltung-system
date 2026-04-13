/**
 * API Key Management Router
 * 
 * Self-service portal for practice admins to:
 * - Create API keys
 * - View/revoke existing keys
 * - Set rate limits and scopes
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono();

// Schemas
const CreateKeySchema = z.object({
  name: z.string().min(1).max(100),
  environment: z.enum(['live', 'test']).default('live'),
  scopes: z.array(z.enum(['read', 'write', 'transcribe', 'admin'])).default(['read', 'write']),
  rate_limit: z.number().min(10).max(1000).default(100),
  expires_in_days: z.number().min(1).max(365).optional(),
});

// Generate secure API key
async function generateApiKey(environment: string): Promise<{ key: string; prefix: string; hash: string }> {
  // Generate random bytes
  const randomBytes = new Uint8Array(24);
  crypto.getRandomValues(randomBytes);
  
  // Base64 encode and make URL-safe
  const random = btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, 'a')
    .replace(/\//g, 'b')
    .replace(/=/g, '');
  
  const key = `vet_${environment}_${random}`;
  const prefix = key.substring(0, 12);
  
  // Hash the key
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return { key, prefix, hash };
}

// ============================================
// GET /api-keys - List all keys for practice
// ============================================
app.get('/', async (c) => {
  const praxisId = c.get('praxisId');
  const supabase = c.get('supabase');
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, environment, scopes, rate_limit, last_used_at, expires_at, revoked_at, created_at')
    .eq('praxis_id', praxisId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });
  
  if (error) {
    return c.json({ error: 'Failed to fetch API keys', details: error.message }, 500);
  }
  
  return c.json({ data });
});

// ============================================
// POST /api-keys - Create new API key
// ============================================
app.post('/', zValidator('json', CreateKeySchema), async (c) => {
  const praxisId = c.get('praxisId');
  const input = c.req.valid('json');
  const supabase = c.get('supabase');
  
  const { key, prefix, hash } = await generateApiKey(input.environment);
  
  const expiresAt = input.expires_in_days 
    ? new Date(Date.now() + input.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
    : null;
  
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      praxis_id: praxisId,
      name: input.name,
      key_prefix: prefix,
      key_hash: hash,
      environment: input.environment,
      scopes: input.scopes,
      rate_limit: input.rate_limit,
      expires_at: expiresAt,
    })
    .select('id, name, environment, scopes, rate_limit, expires_at, created_at')
    .single();
  
  if (error) {
    return c.json({ error: 'Failed to create API key', details: error.message }, 500);
  }
  
  // Return the key ONCE - cannot be retrieved again
  return c.json({
    ...data,
    key, // Only shown once!
    warning: '⚠️ Store this key securely. It cannot be retrieved again.',
  }, 201);
});

// ============================================
// DELETE /api-keys/:id - Revoke API key
// ============================================
app.delete('/:id', async (c) => {
  const praxisId = c.get('praxisId');
  const keyId = c.req.param('id');
  const supabase = c.get('supabase');
  
  // Soft delete - set revoked_at
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('praxis_id', praxisId)
    .is('revoked_at', null);
  
  if (error) {
    return c.json({ error: 'Failed to revoke API key', details: error.message }, 500);
  }
  
  return c.json({ success: true, message: 'API key revoked' });
});

export default app;