/**
 * TAMG (Antibiotic Tracking) Router
 * 
 * GET  /tamg/prescriptions    - List antibiotic prescriptions
 * POST /tamg/prescriptions    - Create prescription
 * GET  /tamg/export          - BVL CSV export
 * GET  /tamg/antibiotics      - List available antibiotics
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono();

const PrescriptionCreateSchema = z.object({
  patient_id: z.string().uuid(),
  drug_name: z.string().min(1),
  drug_id: z.string().uuid().optional(),
  amount: z.number().positive(),
  unit: z.string().default('ST'),
  treatment_duration_days: z.number().min(1).max(90),
  animal_count: z.number().min(1).default(1),
  treatment_purpose: z.enum(['Therapie', 'Metaphylaxe', 'Prophylaxe']).optional(),
});

const ExportQuerySchema = z.object({
  start_date: z.string().date(),
  end_date: z.string().date(),
  format: z.enum(['csv', 'json']).default('csv'),
});

// GET /tamg/prescriptions
app.get('/prescriptions', async (c) => {
  const praxisId = c.get('praxisId');
  const supabase = c.get('supabase');
  
  const { data, error } = await supabase
    .from('antibiotic_prescriptions')
    .select('*, patient:patient_id(name, species)')
    .eq('practice_id', praxisId)
    .order('prescribed_at', { ascending: false });
  
  if (error) {
    return c.json({ error: 'Failed to fetch prescriptions', details: error.message }, 500);
  }
  
  return c.json({ data });
});

// POST /tamg/prescriptions
app.post('/prescriptions', zValidator('json', PrescriptionCreateSchema), async (c) => {
  const praxisId = c.get('praxisId');
  const input = c.req.valid('json');
  const supabase = c.get('supabase');
  
  // Get patient species
  const { data: patient } = await supabase
    .from('patient')
    .select('species')
    .eq('id', input.patient_id)
    .single();
  
  const { data, error } = await supabase
    .from('antibiotic_prescriptions')
    .insert({
      practice_id: praxisId,
      ...input,
      animal_species: patient?.species || 'Unbekannt',
      prescribed_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    return c.json({ error: 'Failed to create prescription', details: error.message }, 500);
  }
  
  return c.json({ data }, 201);
});

// GET /tamg/export - BVL CSV export
app.get('/export', zValidator('query', ExportQuerySchema), async (c) => {
  const praxisId = c.get('praxisId');
  const { start_date, end_date, format } = c.req.valid('query');
  const supabase = c.get('supabase');
  
  // Get praxis BNR15
  const { data: praxis } = await supabase
    .from('praxis')
    .select('bnr15')
    .eq('id', praxisId)
    .single();
  
  const { data: prescriptions, error } = await supabase
    .from('antibiotic_prescriptions')
    .select('*, patient:patient_id(owner_bnr15)')
    .eq('practice_id', praxisId)
    .gte('prescribed_at', start_date)
    .lte('prescribed_at', end_date + 'T23:59:59')
    .order('prescribed_at');
  
  if (error) {
    return c.json({ error: 'Failed to fetch prescriptions', details: error.message }, 500);
  }
  
  if (format === 'json') {
    return c.json({ data: prescriptions });
  }
  
  // Build BVL CSV
  const header = 'BNR15;BNR15_HA;TAMB_FORM;TAMX_TIANZ;TAMA_NAME;TAMX_AWMEN;TAMX_AW_ME;TAMX_AWDAT;TAMX_LFNR;TAMX_BEHAT';
  const rows = (prescriptions || []).map((p: any, i: number) => [
    praxis?.bnr15 || '09 000 000 00 001',
    p.patient?.owner_bnr15 || '09 000 000 00 002',
    getUsageForm(p.animal_species),
    p.animal_count || 1,
    p.drug_name,
    p.amount,
    p.unit || 'ST',
    new Date(p.prescribed_at).toISOString().split('T')[0],
    (i + 1).toString().padStart(5, '0'),
    p.treatment_duration_days,
  ].join(';'));
  
  const csv = [header, ...rows].join('\r\n');
  
  return c.body(csv, 200, {
    'Content-Type': 'text/csv; charset=windows-1252',
    'Content-Disposition': `attachment; filename="BVL_Export_${start_date}_${end_date}.csv"`,
  });
});

// GET /tamg/antibiotics - List available antibiotics
app.get('/antibiotics', async (c) => {
  const supabase = c.get('supabase');
  
  // Simple query - filter client-side for reliability
  const { data, error } = await supabase
    .from('medikamente')
    .select('id, name, manufacturer, dosage_form, strength, unit, category')
    .limit(100);
  
  if (error) {
    return c.json({ error: 'Failed to fetch antibiotics', details: error.message }, 500);
  }
  
  // Filter for antibiotics (client-side since JSON contains is tricky)
  const antibiotics = (data || []).filter((m: any) => 
    m.category?.includes('antibiotic')
  );
  
  return c.json({ data: antibiotics, total: antibiotics.length });
});

function getUsageForm(species: string): string {
  const forms: Record<string, string> = {
    'Hund': 'HUNDE',
    'Katze': 'KATZEN',
    'Pferd': 'PFERDE',
    'Rind': 'RINDER',
    'Schwein': 'SCHWEINE',
    'Schaf': 'SCHAFE',
    'Ziege': 'ZIEGEN',
    'Geflügel': 'GEFLUEGEL',
  };
  return forms[species] || 'SONSTIGE';
}

export default app;