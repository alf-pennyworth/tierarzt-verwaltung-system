-- COMBINED MIGRATION - Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/szwtfzhxmlczavkuvfjw/sql

-- Part 1: Base Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Practices (Tierarztpraxis)
CREATE TABLE IF NOT EXISTS public.praxis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users/Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    praxis_id UUID REFERENCES public.praxis(id),
    full_name TEXT,
    role TEXT DEFAULT 'vet',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patients (Tiere)
CREATE TABLE IF NOT EXISTS public.patient (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    praxis_id UUID NOT NULL REFERENCES public.praxis(id),
    name TEXT NOT NULL,
    species TEXT NOT NULL,
    breed TEXT,
    gender TEXT,
    birth_date DATE,
    owner_name TEXT,
    owner_phone TEXT,
    owner_email TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Treatments (Behandlungen)
CREATE TABLE IF NOT EXISTS public.behandlungen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    praxis_id UUID NOT NULL REFERENCES public.praxis(id),
    patient_id UUID NOT NULL REFERENCES public.patient(id),
    vet_id UUID REFERENCES auth.users(id),
    diagnosis TEXT,
    treatment_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medications (Medikamente)
CREATE TABLE IF NOT EXISTS public.medikamente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    praxis_id UUID NOT NULL REFERENCES public.praxis(id),
    name TEXT NOT NULL,
    manufacturer TEXT,
    dosage_form TEXT,
    strength TEXT,
    unit TEXT,
    current_stock INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 0,
    unit_price NUMERIC,
    expiry_date DATE,
    location TEXT,
    sku TEXT,
    category TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_praxis_updated_at BEFORE UPDATE ON public.praxis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patient_updated_at BEFORE UPDATE ON public.patient FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_behandlungen_updated_at BEFORE UPDATE ON public.behandlungen FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_medikamente_updated_at BEFORE UPDATE ON public.medikamente FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.praxis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behandlungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medikamente ENABLE ROW LEVEL SECURITY;

-- RLS Policies (open for testing, tighten for production)
CREATE POLICY "Open access" ON public.praxis FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open access" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open access" ON public.patient FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open access" ON public.behandlungen FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open access" ON public.medikamente FOR ALL USING (true) WITH CHECK (true);

-- Insert a test practice
INSERT INTO public.praxis (id, name, address, city, postal_code, phone, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Tierarztpraxis', 'Musterstraße 1', 'Berlin', '10115', '+49 30 123456', 'test@tierarzt.de')
ON CONFLICT (id) DO NOTHING;

-- Part 2: TAMG Antibiotic Prescriptions Table
CREATE TABLE IF NOT EXISTS public.antibiotic_prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.praxis(id),
    patient_id UUID REFERENCES public.patient(id),
    treatment_id UUID REFERENCES public.behandlungen(id),
    
    -- Drug information
    drug_name TEXT NOT NULL,
    drug_id UUID REFERENCES public.medikamente(id),
    atc_code TEXT,
    
    -- Prescription details
    amount DECIMAL NOT NULL,
    unit TEXT NOT NULL CHECK (unit IN ('mg', 'ml', 'g', 'tablet', 'capsule', 'application', 'piece')),
    dosage_form TEXT,
    strength TEXT,
    
    -- Animal information (required for TAMG reporting)
    animal_species TEXT NOT NULL,
    animal_count INTEGER DEFAULT 1 CHECK (animal_count > 0),
    animal_age_category TEXT CHECK (animal_age_category IN ('adult', 'juvenile', 'youngstock', 'other')),
    
    -- Treatment context
    diagnosis_code TEXT,
    treatment_purpose TEXT CHECK (treatment_purpose IN ('therapy', 'prophylaxis', 'metaphylaxis')),
    treatment_duration_days INTEGER,
    
    -- Prescribing veterinarian
    prescribing_vet_id UUID,
    
    -- BVL reporting fields
    prescribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    bvl_reporting_period DATE,
    bvl_reported BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_antibiotic_prescriptions_practice ON public.antibiotic_prescriptions(practice_id);
CREATE INDEX IF NOT EXISTS idx_antibiotic_prescriptions_drug ON public.antibiotic_prescriptions(drug_name);
CREATE INDEX IF NOT EXISTS idx_antibiotic_prescriptions_date ON public.antibiotic_prescriptions(prescribed_at);
CREATE INDEX IF NOT EXISTS idx_antibiotic_prescriptions_animal ON public.antibiotic_prescriptions(animal_species);
CREATE INDEX IF NOT EXISTS idx_antibiotic_prescriptions_bvl_period ON public.antibiotic_prescriptions(bvl_reporting_period);
CREATE INDEX IF NOT EXISTS idx_antibiotic_prescriptions_bvl_reported ON public.antibiotic_prescriptions(bvl_reported);

-- Trigger for updated_at
CREATE TRIGGER update_antibiotic_prescriptions_updated_at 
    BEFORE UPDATE ON public.antibiotic_prescriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for antibiotic_prescriptions
ALTER TABLE public.antibiotic_prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access" ON public.antibiotic_prescriptions FOR ALL USING (true) WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.antibiotic_prescriptions IS 'TAMG (§57) antibiotic prescription tracking for German veterinary practices';
COMMENT ON COLUMN public.antibiotic_prescriptions.atc_code IS 'Anatomical Therapeutic Chemical Classification System code';
COMMENT ON COLUMN public.antibiotic_prescriptions.treatment_purpose IS 'Purpose: therapy, prophylaxis, or metaphylaxis';
COMMENT ON COLUMN public.antibiotic_prescriptions.bvl_reporting_period IS 'Quarterly reporting period for BVL submissions';