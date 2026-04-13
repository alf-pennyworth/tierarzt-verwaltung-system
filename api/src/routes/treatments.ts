/**
 * Treatments Router
 * 
 * GET  /treatments              - List treatments
 * POST /treatments              - Create treatment
 * GET  /treatments/:id          - Get treatment by ID
 * PATCH /treatments/:id         - Update treatment
 * DELETE /treatments/:id        - Delete treatment
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono();

const TreatmentCreateSchema = z.object({
  patient_id: z.string().uuid(),
  treatment_date: z.string().datetime().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  transcript_text: z.string().optional(),
  soap_notes: z.string().optional(),
});

const TreatmentQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  patient_id: z.string().uuid().optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
});

// GET /treatments
app.get('/', zValidator('query', TreatmentQuerySchema), async (c) => {
  const praxisId = c.get('praxisId');
  const { page, limit, patient_id, start_date, end_date } = c.req.valid('query');
  const supabase = c.get('supabase');
  
  let query = supabase
    .from('behandlungen')
    .select('*, patient:patient_id(name, species)', { count: 'exact' })
    .eq('praxis_id', praxisId)
    .order('treatment_date', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  
  if (patient_id) {
    query = query.eq('patient_id', patient_id);
  }
  if (start_date) {
    query = query.gte('treatment_date', start_date);
  }
  if (end_date) {
    query = query.lte('treatment_date', end_date);
  }
  
  const { data, count, error } = await query;
  
  if (error) {
    return c.json({ error: 'Failed to fetch treatments' }, 500);
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

// POST /treatments
app.post('/', zValidator('json', TreatmentCreateSchema), async (c) => {
  const praxisId = c.get('praxisId');
  const input = c.req.valid('json');
  const supabase = c.get('supabase');
  
  const { data, error } = await supabase
    .from('behandlungen')
    .insert({
      praxis_id: praxisId,
      ...input,
      treatment_date: input.treatment_date || new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    return c.json({ error: 'Failed to create treatment' }, 500);
  }
  
  return c.json({ data }, 201);
});

// GET /treatments/:id
app.get('/:id', async (c) => {
  const praxisId = c.get('praxisId');
  const treatmentId = c.req.param('id');
  const supabase = c.get('supabase');
  
  const { data, error } = await supabase
    .from('behandlungen')
    .select('*, patient:patient_id(*)')
    .eq('id', treatmentId)
    .eq('praxis_id', praxisId)
    .single();
  
  if (error || !data) {
    return c.json({ error: 'Treatment not found' }, 404);
  }
  
  return c.json({ data });
});

// DELETE /treatments/:id
app.delete('/:id', async (c) => {
  const praxisId = c.get('praxisId');
  const treatmentId = c.req.param('id');
  const supabase = c.get('supabase');
  
  const { error } = await supabase
    .from('behandlungen')
    .delete()
    .eq('id', treatmentId)
    .eq('praxis_id', praxisId);
  
  if (error) {
    return c.json({ error: 'Failed to delete treatment' }, 500);
  }
  
  return c.json({ success: true });
});

export default app;