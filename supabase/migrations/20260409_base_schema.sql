-- Base schema for tierarzt-verwaltung-system
-- Run this FIRST in Supabase SQL Editor

-- Enable UUID extension
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

-- Basic RLS policies (users can only access their own practice's data)
CREATE POLICY "Users can view their own practice" ON public.praxis FOR SELECT USING (id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can view their own practice's patients" ON public.patient FOR SELECT USING (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can view their own practice's treatments" ON public.behandlungen FOR SELECT USING (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can view their own practice's medications" ON public.medikamente FOR SELECT USING (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

-- Insert a default practice for testing
INSERT INTO public.praxis (id, name, address, city, postal_code, phone, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Tierarztpraxis', 'Musterstraße 1', 'Berlin', '10115', '+49 30 123456', 'test@tierarzt.de');

-- Enable public anon access for testing (adjust for production)
CREATE POLICY "Public anon can insert" ON public.praxis FOR INSERT WITH CHECK (true);
CREATE POLICY "Public anon can update" ON public.praxis FOR UPDATE USING (true);
CREATE POLICY "Public anon can insert patients" ON public.patient FOR INSERT WITH CHECK (true);
CREATE POLICY "Public anon can update patients" ON public.patient FOR UPDATE USING (true);
CREATE POLICY "Public anon can insert treatments" ON public.behandlungen FOR INSERT WITH CHECK (true);
CREATE POLICY "Public anon can update treatments" ON public.behandlungen FOR UPDATE USING (true);
CREATE POLICY "Public anon can insert medications" ON public.medikamente FOR INSERT WITH CHECK (true);
CREATE POLICY "Public anon can update medications" ON public.medikamente FOR UPDATE USING (true);