-- TAMG (§57 Antibiotika-Minimierungsplan) Compliance Tracking
-- Track all antibiotic prescriptions for German veterinary practices

CREATE TABLE IF NOT EXISTS public.antibiotic_prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.praxis(id),
    patient_id UUID REFERENCES public.patient(id),
    treatment_id UUID REFERENCES public.behandlungen(id),
    
    -- Drug information
    drug_name TEXT NOT NULL,
    drug_id UUID REFERENCES public.medikamente(id), -- Link to existing medication if applicable
    atc_code TEXT, -- Anatomical Therapeutic Chemical Classification System code
    
    -- Prescription details
    amount DECIMAL NOT NULL,
    unit TEXT NOT NULL CHECK (unit IN ('mg', 'ml', 'g', 'tablet', 'capsule', 'application', 'piece')),
    dosage_form TEXT, -- e.g., 'tablet', 'injection', 'solution'
    strength TEXT, -- e.g., '50mg/ml'
    
    -- Animal information (required for TAMG reporting)
    animal_species TEXT NOT NULL,
    animal_count INTEGER DEFAULT 1 CHECK (animal_count > 0),
    animal_age_category TEXT CHECK (animal_age_category IN ('adult', 'juvenile', 'youngstock', 'other')),
    
    -- Treatment context
    diagnosis_code TEXT, -- ICD-10 or veterinary diagnosis code
    treatment_purpose TEXT CHECK (treatment_purpose IN ('therapy', 'prophylaxis', 'metaphylaxis')),
    treatment_duration_days INTEGER,
    
    -- Prescribing veterinarian
    prescribing_vet_id UUID REFERENCES auth.users(id),
    
    -- BVL reporting fields
    prescribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    bvl_reporting_period DATE, -- Quarterly reporting periods: Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec
    bvl_reported BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_antibiotic_prescriptions_practice ON public.antibiotic_prescriptions(practice_id);
CREATE INDEX IF NOT EXISTS idx_antibiotic_prescriptions_drug ON public.antibiotic_prescriptions(drug_name);
CREATE INDEX IF NOT EXISTS idx_antibiotic_prescriptions_date ON public.antibiotic_prescriptions(prescribed_at);
CREATE INDEX IF NOT EXISTS idx_antibiotic_prescriptions_animal ON public.antibiotic_prescriptions(animal_species);
CREATE INDEX IF NOT EXISTS idx_antibiotic_prescriptions_bvl_period ON public.antibiotic_prescriptions(bvl_reporting_period);
CREATE INDEX IF NOT EXISTS idx_antibiotic_prescriptions_bvl_reported ON public.antibiotic_prescriptions(bvl_reported);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_antibiotic_prescriptions_updated_at 
    BEFORE UPDATE ON public.antibiotic_prescriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE public.antibiotic_prescriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own practice's prescriptions"
    ON public.antibiotic_prescriptions
    FOR SELECT
    USING (
        practice_id IN (
            SELECT praxis_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert prescriptions for their own practice"
    ON public.antibiotic_prescriptions
    FOR INSERT
    WITH CHECK (
        practice_id IN (
            SELECT praxis_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update prescriptions for their own practice"
    ON public.antibiotic_prescriptions
    FOR UPDATE
    USING (
        practice_id IN (
            SELECT praxis_id 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- Comments for documentation
COMMENT ON TABLE public.antibiotic_prescriptions IS 'TAMG (§57) antibiotic prescription tracking for German veterinary practices';
COMMENT ON COLUMN public.antibiotic_prescriptions.atc_code IS 'Anatomical Therapeutic Chemical Classification System code';
COMMENT ON COLUMN public.antibiotic_prescriptions.animal_age_category IS 'Age category for animal grouping: adult, juvenile, youngstock, other';
COMMENT ON COLUMN public.antibiotic_prescriptions.treatment_purpose IS 'Purpose of treatment: therapy (treatment of disease), prophylaxis (prevention), metaphylaxis (prevention in groups)';
COMMENT ON COLUMN public.antibiotic_prescriptions.bvl_reporting_period IS 'Quarterly reporting period for BVL submissions';
COMMENT ON COLUMN public.antibiotic_prescriptions.bvl_reported IS 'Whether this prescription has been included in a BVL report';