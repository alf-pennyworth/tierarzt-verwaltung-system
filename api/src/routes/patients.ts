/**
 * Patients Router
 * 
 * GET  /patients     - List patients (paginated)
 * POST /patients     - Create patient
 * GET  /patients/:id - Get patient by ID
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono();

const PatientCreateSchema = z.object({
  name: z.string().min(1).max(200),
  species: z.string().min(1).max(100),
  breed: z.string().max(100).optional(),
  gender: z.enum(['male', 'female', 'unknown']).optional(),
  birth_date: z.string().date().optional().nullable(),
  owner_name: z.string().max(200).optional(),
  owner_phone: z.string().max(50).optional(),
  owner_email: z.string().email().optional().nullable(),
  owner_bnr15: z.string().max(15).optional(),
  notes: z.string().optional(),
});

const PatientQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  species: z.string().optional(),
  search: z.string().optional(),
});

// ============================================
// GET /patients - List patients
// ============================================

app.get('/', zValidator('query', PatientQuerySchema), async (c) => {
  const praxisId = c.get('praxisId');
  const { page, limit, species, search } = c.req.valid('query');
  const supabase = c.get('supabase');
  
  let query = supabase
    .from('patient')
    .select('*', { count: 'exact' })
    .eq('praxis_id', praxisId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  
  if (species) {
    query = query.eq('species', species);
  }
  if (search) {
    query = query.ilike('name', `%${search}%`);
  }
  
  const { data, count, error } = await query;
  
  if (error) {
    return c.json({ error: 'Failed to fetch patients', details: error.message }, 500);
  }
  
  return c.json({
    data,
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit),
    },
  });
});

// ============================================
// POST /patients - Create patient
// ============================================

app.post('/', zValidator('json', PatientCreateSchema), async (c) => {
  const praxisId = c.get('praxisId');
  const input = c.req.valid('json');
  const supabase = c.get('supabase');
  
  const { data, error } = await supabase
    .from('patient')
    .insert({
      praxis_id: praxisId,
      ...input,
    })
    .select()
    .single();
  
  if (error) {
    return c.json({ error: 'Failed to create patient', details: error.message }, 500);
  }
  
  return c.json({ data }, 201);
});

// ============================================
// GET /patients/:id - Get patient by ID
// ============================================

app.get('/:id', async (c) => {
  const praxisId = c.get('praxisId');
  const id = c.req.param('id');
  const supabase = c.get('supabase');
  
  // Validate UUID
  if (!z.string().uuid().safeParse(id).success) {
    return c.json({ error: 'Invalid patient ID' }, 400);
  }
  
  const { data, error } = await supabase
    .from('patient')
    .select('*')
    .eq('id', id)
    .eq('praxis_id', praxisId)
    .single();
  
  if (error || !data) {
    return c.json({ error: 'Patient not found' }, 404);
  }
  
  return c.json({ data });
});

// ============================================
// PUT /patients/:id - Update patient
// ============================================

app.put('/:id', zValidator('json', PatientCreateSchema.partial()), async (c) => {
  const praxisId = c.get('praxisId');
  const id = c.req.param('id');
  const input = c.req.valid('json');
  const supabase = c.get('supabase');
  
  // Validate UUID
  if (!z.string().uuid().safeParse(id).success) {
    return c.json({ error: 'Invalid patient ID' }, 400);
  }
  
  const { data, error } = await supabase
    .from('patient')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('praxis_id', praxisId)
    .select()
    .single();
  
  if (error) {
    return c.json({ error: 'Failed to update patient', details: error.message }, 500);
  }
  
  if (!data) {
    return c.json({ error: 'Patient not found' }, 404);
  }
  
  return c.json({ data });
});

// ============================================
// DELETE /patients/:id - Delete patient
// ============================================

app.delete('/:id', async (c) => {
  const praxisId = c.get('praxisId');
  const id = c.req.param('id');
  const supabase = c.get('supabase');
  
  // Validate UUID
  if (!z.string().uuid().safeParse(id).success) {
    return c.json({ error: 'Invalid patient ID' }, 400);
  }
  
  const { error } = await supabase
    .from('patient')
    .delete()
    .eq('id', id)
    .eq('praxis_id', praxisId);
  
  if (error) {
    return c.json({ error: 'Failed to delete patient', details: error.message }, 500);
  }
  
  return c.json({ success: true });
});

export default app;