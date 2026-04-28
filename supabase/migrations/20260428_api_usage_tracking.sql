-- =====================================================
-- API Usage & Billing Tables for TierarztOS
-- Created: 2026-04-28
-- Tables: api_usage_log, api_usage_daily, api_billing_plans, api_subscriptions
-- =====================================================

-- 1. REQUEST LOG (Detaillierte API-Aufrufe)
CREATE TABLE IF NOT EXISTS public.api_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    praxis_id UUID NOT NULL REFERENCES public.praxis(id),
    api_key_id UUID REFERENCES public.api_keys(id),
    
    -- Request Details
    endpoint TEXT NOT NULL,           -- z.B. "/ai/transcribe"
    method TEXT NOT NULL,             -- GET, POST, DELETE
    status_code INTEGER,              -- 200, 429, 500 etc.
    response_time_ms INTEGER,         -- Latenz in ms
    audio_duration_secs REAL,         -- Für Transkription: Audiolänge
    
    -- Costs
    cost_per_unit DECIMAL(10,6),      -- € pro Einheit
    units_consumed DECIMAL(10,2),     -- Verbrauchte Einheiten
    total_cost DECIMAL(10,6),         -- Gesamtkosten dieser Anfrage
    
    -- Meta
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_log_praxis ON public.api_usage_log(praxis_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_created ON public.api_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_log_endpoint ON public.api_usage_log(endpoint);

-- RLS
ALTER TABLE public.api_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "API usage visible to practice" ON public.api_usage_log
    FOR SELECT USING (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Service can insert usage" ON public.api_usage_log
    FOR INSERT WITH CHECK (TRUE);

-- 2. DAILY AGGREGATIONS (Für Dashboard-Charts)
CREATE TABLE IF NOT EXISTS public.api_usage_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    praxis_id UUID NOT NULL REFERENCES public.praxis(id),
    date DATE NOT NULL,
    
    -- Aggregierte Metriken
    total_requests INTEGER DEFAULT 0,
    total_transcribe_requests INTEGER DEFAULT 0,
    total_extract_requests INTEGER DEFAULT 0,
    total_soap_requests INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER,
    total_audio_minutes REAL DEFAULT 0,
    
    -- Finanzen
    total_cost_eur DECIMAL(10,6) DEFAULT 0,
    
    -- Fehler
    error_count INTEGER DEFAULT 0,
    rate_limited_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(praxis_id, date)
);

CREATE INDEX IF NOT EXISTS idx_usage_daily_praxis ON public.api_usage_daily(praxis_id);
CREATE INDEX IF NOT EXISTS idx_usage_daily_date ON public.api_usage_daily(date);

ALTER TABLE public.api_usage_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Daily usage visible to practice" ON public.api_usage_daily
    FOR SELECT USING (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

-- 3. BILLING PLANS
CREATE TABLE IF NOT EXISTS public.api_billing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                -- "Starter", "Professional", "Enterprise"
    slug TEXT UNIQUE NOT NULL,         -- "starter", "professional", "enterprise"
    description TEXT,
    
    -- Limits
    monthly_requests INTEGER,          -- oder NULL für unlimited
    monthly_audio_minutes INTEGER,
    rate_limit_rpm INTEGER DEFAULT 100,
    
    -- Costs
    base_price_eur DECIMAL(10,2),      -- Monatliche Grundgebühr
    transcribe_cost_per_min DECIMAL(10,6),  -- € pro Minute Audio
    extract_cost_per_request DECIMAL(10,6),
    soap_cost_per_request DECIMAL(10,6),
    
    -- Features
    included_scopes TEXT[] DEFAULT ARRAY['read', 'write'],
    features TEXT[],
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.api_billing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view billing plans" ON public.api_billing_plans
    FOR SELECT USING (TRUE);

-- Seed: Standard-Pläne
INSERT INTO public.api_billing_plans (name, slug, description, monthly_requests, monthly_audio_minutes, rate_limit_rpm, base_price_eur, transcribe_cost_per_min, extract_cost_per_request, soap_cost_per_request, included_scopes, features)
VALUES
    ('Starter', 'starter', 
     'Für kleine Praxen und Einzeltierärzte',
     5000, 300, 60, 49.00, 0.08, 0.01, 0.02,
     ARRAY['read', 'write'],
     ARRAY['Patientenverwaltung', 'Behandlungen', 'Transkription (5h/Monat)', 'Basis-Support']),
     
    ('Professional', 'professional', 
     'Für mittelständische Praxen mit mehreren Tierärzten',
     20000, 1200, 200, 149.00, 0.06, 0.005, 0.01,
     ARRAY['read', 'write', 'transcribe'],
     ARRAY['Alles in Starter', 'Transkription (20h/Monat)', 'Entity Extraction', 'SOAP-Generierung', 'Priority-Support', 'TAMG-Export']),
     
    ('Enterprise', 'enterprise', 
     'Für Tierkliniken und Praxisketten',
     100000, null, 1000, 399.00, 0.04, 0.002, 0.005,
     ARRAY['read', 'write', 'transcribe', 'admin'],
     ARRAY['Alles in Professional', 'Unlimitierte Transkription', 'Telemedizin-API', 'Custom Integrationen', 'SLA-Garantie', 'Dedicated Support', 'White-Label Option'])
ON CONFLICT (slug) DO UPDATE SET
    description = EXCLUDED.description,
    features = EXCLUDED.features,
    updated_at = NOW();

-- 4. SUBSCRIPTIONS (Praxis-Abos)
CREATE TABLE IF NOT EXISTS public.api_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    praxis_id UUID NOT NULL REFERENCES public.praxis(id),
    plan_id UUID NOT NULL REFERENCES public.api_billing_plans(id),
    
    -- Status
    status TEXT DEFAULT 'active',      -- active, cancelled, past_due, trialing
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    
    -- Billing Cycle
    current_period_start DATE NOT NULL,
    current_period_end DATE NOT NULL,
    
    -- Payment
    payment_method TEXT,
    last_payment_at TIMESTAMP WITH TIME ZONE,
    next_payment_at TIMESTAMP WITH TIME ZONE,
    
    -- Overage Tracking
    overage_requests INTEGER DEFAULT 0,
    overage_audio_minutes REAL DEFAULT 0,
    overage_cost_eur DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_praxis ON public.api_subscriptions(praxis_id);

ALTER TABLE public.api_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subscriptions visible to practice" ON public.api_subscriptions
    FOR SELECT USING (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

-- 5. MONTHLY INVOICES (Für API-Nutzung)
CREATE TABLE IF NOT EXISTS public.api_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.api_subscriptions(id),
    praxis_id UUID NOT NULL REFERENCES public.praxis(id),
    
    -- Invoice Details
    invoice_number TEXT UNIQUE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Breakdown
    base_fee_eur DECIMAL(10,2),
    transcribe_cost_eur DECIMAL(10,2),
    extract_cost_eur DECIMAL(10,2),
    soap_cost_eur DECIMAL(10,2),
    overage_cost_eur DECIMAL(10,2),
    total_eur DECIMAL(10,2),
    
    -- Status
    status TEXT DEFAULT 'pending',     -- pending, paid, overdue, cancelled
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Usage Summary
    total_requests INTEGER,
    total_audio_minutes REAL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_invoice_praxis ON public.api_invoices(praxis_id);
CREATE INDEX IF NOT EXISTS idx_api_invoice_period ON public.api_invoices(period_start, period_end);

ALTER TABLE public.api_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invoices visible to practice" ON public.api_invoices
    FOR SELECT USING (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

-- =====================================================
-- VIEW: Aktuelle Nutzung (diesen Monat)
-- =====================================================
CREATE OR REPLACE VIEW public.v_api_current_month_usage AS
SELECT 
    praxis_id,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE endpoint LIKE '%transcribe%') as transcribe_requests,
    COUNT(*) FILTER (WHERE endpoint LIKE '%extract%') as extract_requests,
    COUNT(*) FILTER (WHERE endpoint LIKE '%soap%') as soap_requests,
    COALESCE(SUM(audio_duration_secs)/60, 0) as total_audio_minutes,
    COALESCE(AVG(response_time_ms), 0) as avg_response_ms,
    COALESCE(SUM(total_cost), 0) as total_cost_eur,
    COUNT(*) FILTER (WHERE status_code >= 400) as error_count,
    COUNT(*) FILTER (WHERE status_code = 429) as rate_limited_count
FROM public.api_usage_log
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY praxis_id;

-- =====================================================
-- FUNCTION: Tägliche Aggregation updaten
-- =====================================================
CREATE OR REPLACE FUNCTION public.refresh_daily_usage(target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS void AS $$
BEGIN
    INSERT INTO public.api_usage_daily (
        praxis_id, date, total_requests, 
        total_transcribe_requests, total_extract_requests, total_soap_requests,
        avg_response_time_ms, total_audio_minutes,
        total_cost_eur, error_count, rate_limited_count
    )
    SELECT 
        praxis_id,
        target_date,
        COUNT(*),
        COUNT(*) FILTER (WHERE endpoint LIKE '%transcribe%'),
        COUNT(*) FILTER (WHERE endpoint LIKE '%extract%'),
        COUNT(*) FILTER (WHERE endpoint LIKE '%soap%'),
        AVG(response_time_ms)::INTEGER,
        COALESCE(SUM(audio_duration_secs)/60, 0),
        COALESCE(SUM(total_cost), 0),
        COUNT(*) FILTER (WHERE status_code >= 400),
        COUNT(*) FILTER (WHERE status_code = 429)
    FROM public.api_usage_log
    WHERE created_at::DATE = target_date
    GROUP BY praxis_id
    ON CONFLICT (praxis_id, date) 
    DO UPDATE SET
        total_requests = EXCLUDED.total_requests,
        total_transcribe_requests = EXCLUDED.total_transcribe_requests,
        total_extract_requests = EXCLUDED.total_extract_requests,
        total_soap_requests = EXCLUDED.total_soap_requests,
        avg_response_time_ms = EXCLUDED.avg_response_time_ms,
        total_audio_minutes = EXCLUDED.total_audio_minutes,
        total_cost_eur = EXCLUDED.total_cost_eur,
        error_count = EXCLUDED.error_count,
        rate_limited_count = EXCLUDED.rate_limited_count,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-log usage when billing_invoices or api_invoices created
CREATE OR REPLACE FUNCTION public.update_subscription_usage()
RETURNS trigger AS $$
BEGIN
    -- Update overage counters on subscription
    UPDATE public.api_subscriptions
    SET 
        overage_requests = GREATEST(0, 
            (SELECT COALESCE(SUM(total_requests), 0) FROM public.api_usage_daily 
             WHERE praxis_id = NEW.praxis_id AND date >= DATE_TRUNC('month', CURRENT_DATE))
            - (SELECT COALESCE(monthly_requests, 999999999) FROM public.api_billing_plans WHERE id = plan_id)
        ),
        overage_audio_minutes = GREATEST(0, 
            (SELECT COALESCE(SUM(total_audio_minutes), 0) FROM public.api_usage_daily 
             WHERE praxis_id = NEW.praxis_id AND date >= DATE_TRUNC('month', CURRENT_DATE))
            - (SELECT COALESCE(monthly_audio_minutes, 999999999) FROM public.api_billing_plans WHERE id = plan_id)
        ),
        updated_at = NOW()
    WHERE praxis_id = NEW.praxis_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_subscription_usage
    AFTER INSERT ON public.api_usage_log
    FOR EACH ROW EXECUTE FUNCTION public.update_subscription_usage();
