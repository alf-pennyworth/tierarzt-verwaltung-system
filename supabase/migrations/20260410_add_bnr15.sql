-- Add BNR15 (Betriebsnummer) to praxis table for BVL compliance
-- BNR15 is the 15-digit operation number required for TAMG reporting

ALTER TABLE public.praxis 
ADD COLUMN IF NOT EXISTS bnr15 TEXT;

-- Add BNR15 to patient table for owner operation numbers (multi-farm scenarios)
ALTER TABLE public.patient
ADD COLUMN IF NOT EXISTS owner_bnr15 TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_praxis_bnr15 ON public.praxis(bnr15);
CREATE INDEX IF NOT EXISTS idx_patient_bnr15 ON public.patient(owner_bnr15);

-- Update test practice with a placeholder BNR15
UPDATE public.praxis 
SET bnr15 = '09 000 000 00 001' 
WHERE id = '00000000-0000-0000-0000-000000000001';