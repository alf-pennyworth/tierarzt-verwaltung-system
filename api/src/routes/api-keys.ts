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
import { nanoid } from 'nanoid';
import { createHash, randomBytes } from 'crypto';

const app = new Hono();

// Schemas
const CreateKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(['read', 'write', 'transcribe', 'admin'])).default(['read']),
  rate_limit: z.number().min(10).max(1000).default(100),
  expires_in_days: z.number().min(1).max(365).optional(),
});

const UpdateKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  scopes: z.array(z.enum(['read', 'write', 'transcribe', 'admin'])).optional(),
  rate_limit: z.number().min(10).max(1000).optional(),
  is_active: z.boolean().optional(),
});

// Generate secure API key
function generateApiKey(): { key: string; hash: string } {
  const rawKey = `vet_${nanoid(32)}`;
  const hash = createHash('sha256').update(rawKey).digest('hex');
  return { key: rawKey, hash };
}

// ============================================
// GET /api-keys - List all keys for practice
// ============================================
app.get('/', async (c) => {
  const praxisId = c.get('praxisId');
  const supabase = c.get('supabase');
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, scopes, rate_limit, last_used_at, expires_at, is_active, created_at')
    .eq('praxis_id', praxisId)
    .order('created_at', { ascending: false });
  
  if (error) {
    return c.json({ error: 'Failed to fetch API keys' }, 500);
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
  
  const { key, hash } = generateApiKey();
  
  const expiresAt = input.expires_in_days 
    ? new Date(Date.now() + input.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
    : null;
  
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      praxis_id: praxisId,
      key_hash: hash,
      name: input.name,
      scopes: input.scopes,
      rate_limit: input.rate_limit,
      expires_at: expiresAt,
      is_active: true,
    })
    .select('id, name, scopes, rate_limit, expires_at, created_at')
    .single();
  
  if (error) {
    return c.json({ error: 'Failed to create API key' }, 500);
  }
  
  // Return the key ONCE - cannot be retrieved again
  return c.json({
    ...data,
    key, // Only shown once!
    warning: 'Store this key securely. It cannot be retrieved again.',
  }, 201);
});

// ============================================
// DELETE /api-keys/:id - Revoke API key
// ============================================
app.delete('/:id', async (c) => {
  const praxisId = c.get('praxisId');
  const keyId = c.req.param('id');
  const supabase = c.get('supabase');
  
  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', keyId)
    .eq('praxis_id', praxisId);
  
  if (error) {
    return c.json({ error: 'Failed to revoke API key' }, 500);
  }
  
  return c.json({ success: true, message: 'API key revoked' });
});

// ============================================
// PATCH /api-keys/:id - Update API key
// ============================================
app.patch('/:id', zValidator('json', UpdateKeySchema), async (c) => {
  const praxisId = c.get('praxisId');
  const keyId = c.req.param('id');
  const input = c.req.valid('json');
  const supabase = c.get('supabase');
  
  const { data, error } = await supabase
    .from('api_keys')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', keyId)
    .eq('praxis_id', praxisId)
    .select('id, name, scopes, rate_limit, is_active, expires_at')
    .single();
  
  if (error) {
    return c.json({ error: 'Failed to update API key' }, 500);
  }
  
  return c.json({ data });
});

export default app;