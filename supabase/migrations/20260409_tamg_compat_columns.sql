-- Migration to ensure compatibility with existing TAMG components
-- Adds any missing columns and views for backward compatibility

-- Add columns that existing components expect if they don't exist
DO $$
BEGIN
  -- Add practice_id as alias for praxis_id (component compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'antibiotic_prescriptions' 
    AND column_name = 'practice_id'
  ) THEN
    ALTER TABLE public.antibiotic_prescriptions ADD COLUMN practice_id UUID;
    
    -- Update practice_id to mirror praxis_id
    UPDATE public.antibiotic_prescriptions SET practice_id = praxis_id WHERE practice_id IS NULL;
  END IF;

  -- Add prescribed_at timestamp (component uses this)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'antibiotic_prescriptions' 
    AND column_name = 'prescribed_at'
  ) THEN
    ALTER TABLE public.antibiotic_prescriptions ADD COLUMN prescribed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add amount column (component uses this as alias for amount_prescribed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'antibiotic_prescriptions' 
    AND column_name = 'amount'
  ) THEN
    ALTER TABLE public.antibiotic_prescriptions ADD COLUMN amount NUMERIC;
  END IF;

  -- Add treatment_purpose column (component uses this)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'antibiotic_prescriptions' 
    AND column_name = 'treatment_purpose'
  ) THEN
    ALTER TABLE public.antibiotic_prescriptions ADD COLUMN treatment_purpose TEXT;
  END IF;

  -- Add drug_id for linking to medication
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'antibiotic_prescriptions' 
    AND column_name = 'drug_id'
  ) THEN
    ALTER TABLE public.antibiotic_prescriptions ADD COLUMN drug_id UUID REFERENCES public.medikamente(id);
  END IF;

  -- Add prescribing_vet_id for backward compatibility
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'antibiotic_prescriptions' 
    AND column_name = 'prescribing_vet_id'
  ) THEN
    ALTER TABLE public.antibiotic_prescriptions ADD COLUMN prescribing_vet_id UUID REFERENCES public.profiles(id);
  END IF;
END $$;

-- Create trigger to sync columns
CREATE OR REPLACE FUNCTION public.sync_antibiotic_prescription_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync practice_id from praxis_id
  NEW.practice_id := NEW.praxis_id;
  
  -- Sync prescribed_at from prescription_date
  NEW.prescribed_at := NEW.prescription_date::timestamp with time zone;
  
  -- Sync amount from amount_prescribed
  NEW.amount := NEW.amount_prescribed;
  
  -- Sync prescribing_vet_id from prescribed_by
  NEW.prescribing_vet_id := NEW.prescribed_by;
  
  -- Map prescription_type to treatment_purpose
  IF NEW.prescription_type = 'therapeutic' THEN
    NEW.treatment_purpose := 'therapy';
  ELSIF NEW.prescription_type = 'prophylactic' THEN
    NEW.treatment_purpose := 'prophylaxis';
  ELSIF NEW.prescription_type = 'metaphylactic' THEN
    NEW.treatment_purpose := 'metaphylaxis';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS sync_antibiotic_prescription_columns_trigger ON public.antibiotic_prescriptions;
CREATE TRIGGER sync_antibiotic_prescription_columns_trigger
  BEFORE INSERT OR UPDATE ON public.antibiotic_prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_antibiotic_prescription_columns();

-- Create indexes for compatibility columns
CREATE INDEX IF NOT EXISTS idx_antibiotic_prescriptions_practice ON public.antibiotic_prescriptions(practice_id);
CREATE INDEX IF NOT EXISTS idx_antibiotic_prescriptions_prescribed_at ON public.antibiotic_prescriptions(prescribed_at);

-- Add view for backward compatibility
CREATE OR REPLACE VIEW public.antibiotic_prescriptions_compat AS
SELECT 
  id,
  practice_id,
  praxis_id,
  patient_id,
  behandlung_id,
  drug_name,
  drug_id,
  active_substance,
  antibiotic_class,
  amount,
  amount_prescribed,
  unit,
  animal_species,
  animal_count,
  treatment_duration_days,
  treatment_purpose,
  prescription_type,
  diagnosis,
  indication,
  prescribed_at,
  prescription_date,
  prescribed_by,
  prescribing_vet_id,
  reported_to_bvl,
  bvl_reported,
  reported_at,
  report_batch_id,
  notes,
  created_at,
  updated_at,
  created_by,
  deleted_at
FROM public.antibiotic_prescriptions
WHERE deleted_at IS NULL;

-- Add column to praxis table for BVL Betriebsnummer if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'praxis' 
    AND column_name = 'bvl_betriebsnummer'
  ) THEN
    ALTER TABLE public.praxis ADD COLUMN bvl_betriebsnummer TEXT;
    COMMENT ON COLUMN public.praxis.bvl_betriebsnummer IS 'BVL 15-stellige Betriebsnummer für TAMG-Meldungen';
  END IF;
END $$;