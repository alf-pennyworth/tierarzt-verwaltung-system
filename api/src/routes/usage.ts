/**
 * Usage & Billing Router
 * 
 * Dashboard endpoints for API customers:
 * - GET /usage/current  - Current month usage
 * - GET /usage/history  - Historical usage (daily)
 * - GET /billing/plan   - Current subscription plan
 * - GET /billing/invoices - Invoice history
 */

import { Hono } from 'hono';

const app = new Hono();

// ============================================
// GET /usage/current - Live usage this month
// ============================================
app.get('/current', async (c) => {
  const praxisId = c.get('praxisId');
  const supabase = c.get('supabase');

  const { data, error } = await supabase
    .from('v_api_current_month_usage')
    .select('*')
    .eq('praxis_id', praxisId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return c.json({ error: 'Failed to fetch usage', details: error.message }, 500);
  }

  // Get subscription limits
  const { data: sub } = await supabase
    .from('api_subscriptions')
    .select('*, plan:api_billing_plans(*)')
    .eq('praxis_id', praxisId)
    .eq('status', 'active')
    .single();

  const limits = sub?.plan ? {
    monthly_requests: sub.plan.monthly_requests,
    monthly_audio_minutes: sub.plan.monthly_audio_minutes,
    rate_limit_rpm: sub.plan.rate_limit_rpm,
  } : null;

  return c.json({
    usage: data || {
      total_requests: 0,
      transcribe_requests: 0,
      extract_requests: 0,
      soap_requests: 0,
      total_audio_minutes: 0,
      avg_response_ms: 0,
      total_cost_eur: 0,
      error_count: 0,
      rate_limited_count: 0,
    },
    limits,
    quota_used_percent: limits ? {
      requests: limits.monthly_requests ? Math.round(((data?.total_requests || 0) / limits.monthly_requests) * 100) : 0,
      audio: limits.monthly_audio_minutes ? Math.round(((data?.total_audio_minutes || 0) / limits.monthly_audio_minutes) * 100) : 0,
    } : null,
  });
});

// ============================================
// GET /usage/history - Daily usage for charts
// ============================================
app.get('/history', async (c) => {
  const praxisId = c.get('praxisId');
  const supabase = c.get('supabase');
  const days = parseInt(c.req.query('days') || '30');

  const { data, error } = await supabase
    .from('api_usage_daily')
    .select('date, total_requests, total_transcribe_requests, total_audio_minutes, total_cost_eur, error_count')
    .eq('praxis_id', praxisId)
    .gte('date', new Date(Date.now() - days * 86400000).toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) {
    return c.json({ error: 'Failed to fetch history', details: error.message }, 500);
  }

  return c.json({ data: data || [] });
});

// ============================================
// GET /billing/plan - Current subscription
// ============================================
app.get('/plan', async (c) => {
  const praxisId = c.get('praxisId');
  const supabase = c.get('supabase');

  const { data, error } = await supabase
    .from('api_subscriptions')
    .select('*, plan:api_billing_plans(*)')
    .eq('praxis_id', praxisId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    return c.json({ error: 'Failed to fetch plan', details: error.message }, 500);
  }

  return c.json({ subscription: data || null, plans_available: null });
});

// ============================================
// GET /billing/plans - All available plans
// ============================================
app.get('/plans', async (c) => {
  const supabase = c.get('supabase');

  const { data, error } = await supabase
    .from('api_billing_plans')
    .select('*')
    .eq('is_active', true)
    .order('base_price_eur', { ascending: true });

  if (error) {
    return c.json({ error: 'Failed to fetch plans', details: error.message }, 500);
  }

  return c.json({ plans: data || [] });
});

// ============================================
// GET /billing/invoices - Invoice history
// ============================================
app.get('/invoices', async (c) => {
  const praxisId = c.get('praxisId');
  const supabase = c.get('supabase');

  const { data, error } = await supabase
    .from('api_invoices')
    .select('*')
    .eq('praxis_id', praxisId)
    .order('created_at', { ascending: false })
    .limit(24);

  if (error) {
    return c.json({ error: 'Failed to fetch invoices', details: error.message }, 500);
  }

  return c.json({ invoices: data || [] });
});

export default app;
