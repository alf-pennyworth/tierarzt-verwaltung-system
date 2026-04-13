-- ============================================================================
-- PRODUCTION RLS & SECURITY HARDENING
-- ============================================================================
-- This migration replaces the insecure "USING (true)" policies with proper
-- multi-tenant isolation based on praxis_id.
--
-- SECURITY MODEL:
-- - Each user belongs to one praxis (practice) via profiles.praxis_id
-- - Users can ONLY access data from their own praxis
-- - Service role bypasses RLS for admin operations
-- - Audit logging tracks all data changes
--
-- Run this AFTER all other migrations in production.
-- ============================================================================

-- ============================================================================
-- STEP 1: CLEANUP - Drop all existing insecure policies
-- ============================================================================

-- Drop "Open access" policies from combined migration
DROP POLICY IF EXISTS "Open access" ON public.praxis;
DROP POLICY IF EXISTS "Open access" ON public.profiles;
DROP POLICY IF EXISTS "Open access" ON public.patient;
DROP POLICY IF EXISTS "Open access" ON public.behandlungen;
DROP POLICY IF EXISTS "Open access" ON public.medikamente;
DROP POLICY IF EXISTS "Open access" ON public.antibiotic_prescriptions;

-- Drop other legacy policies from base_schema.sql
DROP POLICY IF EXISTS "Users can view their own practice" ON public.praxis;
DROP POLICY IF EXISTS "Users can view their own practice's patients" ON public.patient;
DROP POLICY IF EXISTS "Users can view their own practice's treatments" ON public.behandlungen;
DROP POLICY IF EXISTS "Users can view their own practice's medications" ON public.medikamente;
DROP POLICY IF EXISTS "Public anon can insert" ON public.praxis;
DROP POLICY IF EXISTS "Public anon can update" ON public.praxis;
DROP POLICY IF EXISTS "Public anon can insert patients" ON public.patient;
DROP POLICY IF EXISTS "Public anon can update patients" ON public.patient;
DROP POLICY IF EXISTS "Public anon can insert treatments" ON public.behandlungen;
DROP POLICY IF EXISTS "Public anon can update treatments" ON public.behandlungen;
DROP POLICY IF EXISTS "Public anon can insert medications" ON public.medikamente;
DROP POLICY IF EXISTS "Public anon can update medications" ON public.medikamente;

-- Drop policies from tamg migration (these were better but let's standardize)
DROP POLICY IF EXISTS "Users can view their own practice's prescriptions" ON public.antibiotic_prescriptions;
DROP POLICY IF EXISTS "Users can insert prescriptions for their own practice" ON public.antibiotic_prescriptions;
DROP POLICY IF EXISTS "Users can update prescriptions for their own practice" ON public.antibiotic_prescriptions;

-- ============================================================================
-- STEP 2: HELPER FUNCTIONS
-- ============================================================================

-- Function to get the current user's praxis_id
-- Used in RLS policies for tenant isolation
CREATE OR REPLACE FUNCTION public.get_current_praxis_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT praxis_id 
    FROM public.profiles 
    WHERE id = auth.uid();
$$;

-- Function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT auth.uid() IS NOT NULL;
$$;

-- Function to check if user is a service role (for admin operations)
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claims', true)::json->>'role',
        ''
    ) = 'service_role';
$$;

-- ============================================================================
-- STEP 3: PRAXIS TABLE POLICIES
-- ============================================================================
-- Users can only see and modify their own praxis

CREATE POLICY "praxis_select_own"
    ON public.praxis FOR SELECT
    USING (
        id = public.get_current_praxis_id()
        OR public.is_service_role()
    );

CREATE POLICY "praxis_update_own"
    ON public.praxis FOR UPDATE
    USING (
        id = public.get_current_praxis_id()
        OR public.is_service_role()
    );

-- No INSERT or DELETE for regular users - praxis creation is admin-only
-- Service role can do everything via is_service_role() check

-- ============================================================================
-- STEP 4: PROFILES TABLE POLICIES
-- ============================================================================
-- Users can view profiles in their own praxis, but only modify their own

CREATE POLICY "profiles_select_own_praxis"
    ON public.profiles FOR SELECT
    USING (
        praxis_id = public.get_current_praxis_id()
        OR public.is_service_role()
    );

CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (
        id = auth.uid()
        OR public.is_service_role()
    )
    WITH CHECK (
        id = auth.uid()
        OR public.is_service_role()
    );

-- INSERT handled by trigger on auth.users (handle_new_user)
-- No DELETE for regular users

-- ============================================================================
-- STEP 5: PATIENT TABLE POLICIES
-- ============================================================================

CREATE POLICY "patient_select_own_praxis"
    ON public.patient FOR SELECT
    USING (
        praxis_id = public.get_current_praxis_id()
        OR public.is_service_role()
    );

CREATE POLICY "patient_insert_own_praxis"
    ON public.patient FOR INSERT
    WITH CHECK (
        praxis_id = public.get_current_praxis_id()
        OR public.is_service_role()
    );

CREATE POLICY "patient_update_own_praxis"
    ON public.patient FOR UPDATE
    USING (
        praxis_id = public.get_current_praxis_id()
        OR public.is_service_role()
    )
    WITH CHECK (
        praxis_id = public.get_current_praxis_id()
        OR public.is_service_role()
    );

CREATE POLICY "patient_delete_own_praxis"
    ON public.patient FOR DELETE
    USING (
        praxis_id = public.get_current_praxis_id()
        OR public.is_service_role()
    );

-- ============================================================================
-- STEP 6: BEHANDLUNGEN (TREATMENTS) TABLE POLICIES
-- ============================================================================

CREATE POLICY "behandlungen_select_own_praxis"
    ON public.behandlungen FOR SELECT
    USING (
        praxis_id = public.get_current_praxis_id()
        OR public.is_service_role()
    );

CREATE POLICY "behandlungen_insert_own_praxis"
    ON public.behandlungen FOR INSERT
    WITH CHECK (
        praxis_id = public.get_current_praxis_id()
        OR public.is_service_role()
    );

CREATE POLICY "behandlungen_update_own_praxis"
    ON public.behandlungen FOR UPDATE
    USING (
        praxis_id = public.get_current_praxis_id()
        OR public.is_service_role()
    )
    WITH CHECK (
        praxis_id = public.get_current_praxis_id()
        OR public.is_service_role()
    );

CREATE POLICY "behandlungen_delete_own_praxis"
    ON public.behandlungen FOR DELETE
    USING (
        praxis_id = public.get_current_praxis_id()
        OR public.is_service_role()
    );

-- ============================================================================
-- STEP 7: MEDIKAMENTE (MEDICATIONS) TABLE POLICIES
-- ============================================================================

CREATE POLICY "medikamente_select_own_praxis"
    ON public.medikamente FOR SELECT
    USING (
        praxis_id = public.get_current_praxis_id()
        OR public.is_service_role()
    );

CREATE POLICY "medikamente_insert_own_praxis"
    ON public.medikamente FOR INSERT
    WITH CHECK (
        praxis_id = public.get_current_praxis_id()
        OR public.is_service_role()
    );

CREATE POLICY "medikamente_update_own_praxis"
    ON public.medikamente FOR UPDATE
    USING (
        praxis_id = public.get_current_praxis_id()
        OR public.is_service_role()
    )
    WITH CHECK (
        praxis_id = public.get_current_praxis_id()
        OR public.is_service_role()
    );

CREATE POLICY "medikamente_delete_own_praxis"
    ON public.medikamente FOR DELETE
    USING (
        praxis_id = public.get_current_praxis_id()
        OR public.is_service_role()
    );

-- ============================================================================
-- STEP 8: ANTIBIOTIC_PRESCRIPTIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY "antibiotic_prescriptions_select_own_praxis"
    ON public.antibiotic_prescriptions FOR SELECT
    USING (
        practice_id = public.get_current_praxis_id()
        OR public.is_service_role()
    );

CREATE POLICY "antibiotic_prescriptions_insert_own_praxis"
    ON public.antibiotic_prescriptions FOR INSERT
    WITH CHECK (
        practice_id = public.get_current_praxis_id()
        OR public.is_service_role()
    );

CREATE POLICY "antibiotic_prescriptions_update_own_praxis"
    ON public.antibiotic_prescriptions FOR UPDATE
    USING (
        practice_id = public.get_current_praxis_id()
        OR public.is_service_role()
    )
    WITH CHECK (
        practice_id = public.get_current_praxis_id()
        OR public.is_service_role()
    );

CREATE POLICY "antibiotic_prescriptions_delete_own_praxis"
    ON public.antibiotic_prescriptions FOR DELETE
    USING (
        practice_id = public.get_current_praxis_id()
        OR public.is_service_role()
    );

-- ============================================================================
-- STEP 9: AUDIT LOGGING
-- ============================================================================

-- Create audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Who made the change
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    praxis_id UUID,
    
    -- What changed
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    
    -- The data
    old_values JSONB,
    new_values JSONB,
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id TEXT
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_praxis ON public.audit_log(praxis_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON public.audit_log(table_name, record_id);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can read audit logs (admins via Supabase dashboard)
CREATE POLICY "audit_log_service_only"
    ON public.audit_log FOR ALL
    USING (public.is_service_role())
    WITH CHECK (public.is_service_role());

-- Audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    old_rec JSONB;
    new_rec JSONB;
BEGIN
    -- Get old and new values
    IF TG_OP = 'DELETE' THEN
        old_rec := to_jsonb(OLD);
        new_rec := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        old_rec := to_jsonb(OLD);
        new_rec := to_jsonb(NEW);
    ELSE -- INSERT
        old_rec := NULL;
        new_rec := to_jsonb(NEW);
    END IF;
    
    -- Insert audit record
    INSERT INTO public.audit_log (
        user_id,
        user_email,
        praxis_id,
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        ip_address,
        user_agent,
        request_id
    )
    SELECT
        auth.uid(),
        auth.jwt()->>'email',
        COALESCE(
            -- Try to get praxis_id from the record
            CASE
                WHEN TG_TABLE_NAME IN ('patient', 'behandlungen', 'medikamente') THEN
                    (new_rec->>'praxis_id')::UUID
                WHEN TG_TABLE_NAME = 'antibiotic_prescriptions' THEN
                    (new_rec->>'practice_id')::UUID
                WHEN TG_TABLE_NAME = 'profiles' THEN
                    (new_rec->>'praxis_id')::UUID
                ELSE NULL
            END,
            -- Fallback to user's praxis_id
            public.get_current_praxis_id()
        ),
        TG_TABLE_NAME,
        CASE
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        TG_OP,
        old_rec,
        new_rec,
        NULL, -- IP address not available in trigger context
        NULL, -- User agent not available in trigger context
        NULL  -- Request ID not available in trigger context
    WHERE auth.uid() IS NOT NULL; -- Only log authenticated actions
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- Apply audit triggers to sensitive tables
-- Note: We use AFTER triggers to ensure we have the final state

-- Patient audit trigger
DROP TRIGGER IF EXISTS audit_patient ON public.patient;
CREATE TRIGGER audit_patient
    AFTER INSERT OR UPDATE OR DELETE ON public.patient
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_func();

-- Behandlungen audit trigger
DROP TRIGGER IF EXISTS audit_behandlungen ON public.behandlungen;
CREATE TRIGGER audit_behandlungen
    AFTER INSERT OR UPDATE OR DELETE ON public.behandlungen
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_func();

-- Medikamente audit trigger
DROP TRIGGER IF EXISTS audit_medikamente ON public.medikamente;
CREATE TRIGGER audit_medikamente
    AFTER INSERT OR UPDATE OR DELETE ON public.medikamente
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_func();

-- Antibiotic prescriptions audit trigger (important for compliance)
DROP TRIGGER IF EXISTS audit_antibiotic_prescriptions ON public.antibiotic_prescriptions;
CREATE TRIGGER audit_antibiotic_prescriptions
    AFTER INSERT OR UPDATE OR DELETE ON public.antibiotic_prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_func();

-- Profiles audit trigger
DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_func();

-- ============================================================================
-- STEP 10: ADDITIONAL SECURITY MEASURES
-- ============================================================================

-- Ensure RLS is enabled on all tables
ALTER TABLE public.praxis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behandlungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medikamente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antibiotic_prescriptions ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (good practice)
ALTER TABLE public.praxis FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.patient FORCE ROW LEVEL SECURITY;
ALTER TABLE public.behandlungen FORCE ROW LEVEL SECURITY;
ALTER TABLE public.medikamente FORCE ROW LEVEL SECURITY;
ALTER TABLE public.antibiotic_prescriptions FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 11: UPDATE handle_new_user FOR BETTER SECURITY
-- ============================================================================

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, praxis_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'vet',
    COALESCE((new.raw_user_meta_data->>'praxis_id')::uuid, NULL)
  );
  RETURN new;
END;
$$;

-- ============================================================================
-- VERIFICATION QUERIES (run these after migration)
-- ============================================================================
-- SELECT * FROM pg_policies WHERE tablename IN ('praxis', 'profiles', 'patient', 'behandlungen', 'medikamente', 'antibiotic_prescriptions', 'audit_log');
-- SELECT * FROM audit_log LIMIT 1;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.audit_log IS 'Comprehensive audit trail for all data modifications in the system. Essential for compliance and debugging.';
COMMENT ON FUNCTION public.get_current_praxis_id() IS 'Returns the praxis_id of the currently authenticated user. Core function for multi-tenant isolation.';
COMMENT ON FUNCTION public.is_service_role() IS 'Checks if the current request is from a service role (admin operations).';
COMMENT ON FUNCTION public.audit_trigger_func() IS 'Generic audit trigger that logs all INSERT/UPDATE/DELETE operations to audit_log table.';

-- End of migration