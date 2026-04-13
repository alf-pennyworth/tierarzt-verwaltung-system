-- TAMG (Antibiotikaverbrauchsmengenerfassung) Compliance Module
-- Tracks antibiotic prescriptions for BVL reporting per Regulation (EU) 2019/6 Article 57

-- Animal species categories for TAMG reporting stages
CREATE TYPE public.tamg_animal_category AS ENUM (
  -- Stage 1 (since 2023)
  'cattle',      -- Rinder
  'pigs',        -- Schweine
  'chickens',    -- Hühner
  'turkeys',     -- Puten
  -- Stage 2 (from 2026)
  'ducks',       -- Enten
  'geese',       -- Gänse
  'sheep',       -- Schafe
  'goats',       -- Ziegen
  'fish',        -- Fische
  'horses',      -- Pferde
  'rabbits',     -- Kaninchen
  -- Stage 3 (from 2029, but required in Germany from 2025)
  'dogs',        -- Hunde
  'cats',        -- Katzen
  -- Other
  'other'        -- Sonstige
);

-- Antibiotic substance classes for categorization
CREATE TYPE public.antibiotic_class AS ENUM (
  'penicillins',           -- Penicilline
  'cephalosporins',        -- Cephalosporine
  'aminoglycosides',       -- Aminoglykoside
  'macrolides',           -- Makrolide
  'tetracyclines',        -- Tetracycline
  'fluoroquinolones',     -- Fluorchinolone
  'sulfonamides',         -- Sulfonamide
  'trimethoprim',         -- Trimethoprim
  'lincosamides',         -- Lincosamide
  'pleuromutilins',       -- Pleuromutiline
  'amphenicols',          -- Amphenicole
  'glycopeptides',        -- Glykopeptide
  'polymyxins',           -- Polymyxine
  'other'                 -- Sonstige
);

-- Route of administration
CREATE TYPE public.administration_route AS ENUM (
  'oral',           -- Oral
  'intravenous',    -- Intravenös
  'intramuscular',  -- Intramuskulär
  'subcutaneous',   -- Subkutan
  'topical',        -- Topisch/Lokal
  'intramammary',   -- Intramammär
  'intrauterine',   -- Intrauterin
  'inhalation',     -- Inhalation
  'other'           -- Sonstige
);

-- Main antibiotic prescriptions table
CREATE TABLE public.antibiotic_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  praxis_id UUID NOT NULL REFERENCES public.praxis(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patient(id) ON DELETE SET NULL,
  behandlung_id UUID REFERENCES public.behandlungen(id) ON DELETE SET NULL,
  
  -- Drug information
  drug_name TEXT NOT NULL,                    -- Handelsname
  active_substance TEXT NOT NULL,             -- Wirkstoff
  antibiotic_class public.antibiotic_class NOT NULL, -- Antibiotika-Klasse
  atc_code TEXT,                              -- ATCvet-Code (z.B. QJ01AA02)
  marketing_authorisation_number TEXT,        -- Zulassungsnummer
  package_id TEXT,                            -- Package-ID / UPD-PI
  batch_number TEXT,                          -- Chargennummer
  
  -- Quantity and dosing
  amount_prescribed NUMERIC NOT NULL,         -- Abgegebene Menge
  unit TEXT NOT NULL,                         -- Einheit (ml, mg, Tabletten, etc.)
  active_substance_amount_mg NUMERIC,         -- Wirkstoffmenge in mg (für BVL-Berechnung)
  concentration TEXT,                         -- Konzentration (z.B. "100 mg/ml")
  
  -- Animal information
  animal_species public.tamg_animal_category NOT NULL,
  animal_species_detail TEXT,                 -- Spezifischere Bezeichnung (z.B. "Milchkuh", "Mastschwein")
  animal_count INTEGER DEFAULT 1,             -- Anzahl behandelte Tiere
  animal_weight_kg NUMERIC,                   -- Durchschnittsgewicht in kg
  total_animal_weight_kg NUMERIC,             -- Gesamgewicht (animal_count × animal_weight_kg)
  age_category TEXT,                          -- Alterskategorie (z.B. "Ferkel", "Kuh")
  
  -- Treatment details
  diagnosis TEXT,                             -- Diagnose (Freitext)
  diagnosis_code TEXT,                        -- Diagnose-Code (falls verfügbar)
  indication TEXT,                            -- Indikationsgebiet
  route_of_administration public.administration_route,
  treatment_duration_days INTEGER,            -- Behandlungsdauer in Tagen
  daily_dose_mg NUMERIC,                      -- Tagesdosis in mg
  
  -- Prescription details
  prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
  prescribed_by UUID REFERENCES public.profiles(id), -- Verschreibender Tierarzt
  prescription_type TEXT DEFAULT 'therapeutic', -- therapeutic, prophylactic, metaphylactic
  
  -- Reporting status
  reported_to_bvl BOOLEAN DEFAULT FALSE,
  reported_at TIMESTAMP WITH TIME ZONE,
  report_batch_id UUID,                       -- Batch-ID für Sammelreports
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_amount CHECK (amount_prescribed > 0),
  CONSTRAINT valid_animal_count CHECK (animal_count > 0)
);

-- Index for efficient queries
CREATE INDEX idx_antibiotic_prescriptions_praxis ON public.antibiotic_prescriptions(praxis_id);
CREATE INDEX idx_antibiotic_prescriptions_patient ON public.antibiotic_prescriptions(patient_id);
CREATE INDEX idx_antibiotic_prescriptions_date ON public.antibiotic_prescriptions(prescription_date);
CREATE INDEX idx_antibiotic_prescriptions_species ON public.antibiotic_prescriptions(animal_species);
CREATE INDEX idx_antibiotic_prescriptions_class ON public.antibiotic_prescriptions(antibiotic_class);
CREATE INDEX idx_antibiotic_prescriptions_reported ON public.antibiotic_prescriptions(reported_to_bvl);

-- Antibiotic drug reference table (for auto-completion and validation)
CREATE TABLE public.antibiotic_drugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_name TEXT NOT NULL,
  active_substance TEXT NOT NULL,
  antibiotic_class public.antibiotic_class NOT NULL,
  atc_code TEXT,
  marketing_authorisation_number TEXT UNIQUE,
  package_id TEXT UNIQUE,
  package_description TEXT,
  manufacturer TEXT,
  dosage_form TEXT,                           -- Darreichungsform (Tablette, Injektionslösung, etc.)
  concentration TEXT,
  approved_species public.tamg_animal_category[], -- Zugelassene Tierarten
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_antibiotic_drugs_name ON public.antibiotic_drugs(drug_name);
CREATE INDEX idx_antibiotic_drugs_substance ON public.antibiotic_drugs(active_substance);

-- TAMG export batches table (for tracking exports)
CREATE TABLE public.tamg_export_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  praxis_id UUID NOT NULL REFERENCES public.praxis(id) ON DELETE CASCADE,
  export_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  format TEXT NOT NULL DEFAULT 'csv',          -- csv, xml
  file_path TEXT,                              -- Pfad zur exportierten Datei
  records_count INTEGER DEFAULT 0,
  total_amount_mg NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',               -- pending, completed, submitted
  submitted_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX idx_tamg_export_batches_praxis ON public.tamg_export_batches(praxis_id);
CREATE INDEX idx_tamg_export_batches_period ON public.tamg_export_batches(period_start, period_end);

-- Practice TAMG settings
CREATE TABLE public.tamg_practice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  praxis_id UUID NOT NULL UNIQUE REFERENCES public.praxis(id) ON DELETE CASCADE,
  
  -- BVL reporting identifiers
  bvl_betriebsnummer TEXT,                     -- Betriebsnummer für BVL
  hi_tier_user_id TEXT,                        -- HI-Tier Benutzerkennung
  
  -- Reporting preferences
  auto_export_enabled BOOLEAN DEFAULT FALSE,
  export_interval_days INTEGER DEFAULT 30,
  default_prescription_type TEXT DEFAULT 'therapeutic',
  
  -- Alert settings
  high_usage_threshold NUMERIC,               -- Schwellwert für Warnungen
  alert_email TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER antibiotic_prescriptions_updated_at
  BEFORE UPDATE ON public.antibiotic_prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER antibiotic_drugs_updated_at
  BEFORE UPDATE ON public.antibiotic_drugs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER tamg_practice_settings_updated_at
  BEFORE UPDATE ON public.tamg_practice_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate therapy frequency (Behandlungshäufigkeit)
-- Used for benchmarking per TAMG §57
CREATE OR REPLACE FUNCTION public.calculate_therapy_frequency(
  p_praxis_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS TABLE (
  animal_species public.tamg_animal_category,
  antibiotic_class public.antibiotic_class,
  total_prescriptions BIGINT,
  total_animals_treated BIGINT,
  total_substance_mg NUMERIC,
  therapy_frequency NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ap.animal_species,
    ap.antibiotic_class,
    COUNT(*)::BIGINT as total_prescriptions,
    SUM(ap.animal_count)::BIGINT as total_animals_treated,
    COALESCE(SUM(ap.active_substance_amount_mg), 0) as total_substance_mg,
    CASE 
      WHEN SUM(ap.total_animal_weight_kg) > 0 
      THEN COALESCE(SUM(ap.active_substance_amount_mg), 0) / SUM(ap.total_animal_weight_kg)
      ELSE 0 
    END as therapy_frequency
  FROM public.antibiotic_prescriptions ap
  WHERE ap.praxis_id = p_praxis_id
    AND ap.prescription_date >= p_period_start
    AND ap.prescription_date <= p_period_end
    AND ap.deleted_at IS NULL
  GROUP BY ap.animal_species, ap.antibiotic_class
  ORDER BY ap.animal_species, total_prescriptions DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get monthly usage summary
CREATE OR REPLACE FUNCTION public.get_monthly_antibiotic_usage(
  p_praxis_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  antibiotic_class public.antibiotic_class,
  drug_name TEXT,
  active_substance TEXT,
  prescription_count BIGINT,
  total_amount NUMERIC,
  total_animals BIGINT,
  species_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ap.antibiotic_class,
    ap.drug_name,
    ap.active_substance,
    COUNT(*)::BIGINT as prescription_count,
    SUM(ap.amount_prescribed) as total_amount,
    SUM(ap.animal_count)::BIGINT as total_animals,
    jsonb_agg(
      jsonb_build_object(
        'species', ap.animal_species,
        'count', ap.animal_count,
        'amount', ap.amount_prescribed
      )
    ) as species_breakdown
  FROM public.antibiotic_prescriptions ap
  WHERE ap.praxis_id = p_praxis_id
    AND EXTRACT(YEAR FROM ap.prescription_date) = p_year
    AND EXTRACT(MONTH FROM ap.prescription_date) = p_month
    AND ap.deleted_at IS NULL
  GROUP BY ap.antibiotic_class, ap.drug_name, ap.active_substance
  ORDER BY prescription_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security
ALTER TABLE public.antibiotic_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antibiotic_drugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tamg_export_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tamg_practice_settings ENABLE ROW LEVEL SECURITY;

-- Policies for antibiotic_prescriptions
CREATE POLICY "Users can view prescriptions from their practice"
  ON public.antibiotic_prescriptions FOR SELECT
  USING (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert prescriptions for their practice"
  ON public.antibiotic_prescriptions FOR INSERT
  WITH CHECK (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update prescriptions from their practice"
  ON public.antibiotic_prescriptions FOR UPDATE
  USING (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

-- Policies for antibiotic_drugs (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view antibiotic drugs"
  ON public.antibiotic_drugs FOR SELECT
  TO authenticated USING (true);

-- Policies for tamg_export_batches
CREATE POLICY "Users can view export batches from their practice"
  ON public.tamg_export_batches FOR SELECT
  USING (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create export batches for their practice"
  ON public.tamg_export_batches FOR INSERT
  WITH CHECK (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

-- Policies for tamg_practice_settings
CREATE POLICY "Users can view settings for their practice"
  ON public.tamg_practice_settings FOR SELECT
  USING (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update settings for their practice"
  ON public.tamg_practice_settings FOR UPDATE
  USING (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

-- Insert some common antibiotic drugs for reference
INSERT INTO public.antibiotic_drugs (drug_name, active_substance, antibiotic_class, atc_code, approved_species) VALUES
('Baytril', 'Enrofloxacin', 'fluoroquinolones', 'QJ01MA90', ARRAY['cattle', 'pigs', 'chickens', 'turkeys', 'dogs', 'cats']),
('Marbocyl', 'Marbofloxacin', 'fluoroquinolones', 'QJ01MA93', ARRAY['cattle', 'pigs', 'dogs', 'cats']),
('Nuflor', 'Florfenicol', 'amphenicols', 'QJ01BA90', ARRAY['cattle', 'pigs']),
('Excenel', 'Ceftiofur', 'cephalosporins', 'QJ01DD90', ARRAY['cattle', 'pigs', 'horses']),
('Tylan', 'Tylosin', 'macrolides', 'QJ01FA90', ARRAY['cattle', 'pigs', 'chickens', 'turkeys']),
('Vetmulin', 'Tiamulin', 'pleuromutilins', 'QJ01XX02', ARRAY['pigs', 'chickens', 'turkeys']),
('Aivlosin', 'Tylvalosin', 'macrolides', 'QJ01FA90', ARRAY['pigs', 'chickens']),
('Tetracyclin', 'Tetracycline', 'tetracyclines', 'QJ01AA07', ARRAY['cattle', 'pigs', 'chickens', 'turkeys', 'sheep', 'goats']),
('Amoxicillin', 'Amoxicillin', 'penicillins', 'QJ01CA04', ARRAY['cattle', 'pigs', 'dogs', 'cats']),
('Clamoxyl', 'Amoxicillin', 'penicillins', 'QJ01CA04', ARRAY['cattle', 'pigs', 'dogs', 'cats']),
('Synulox', 'Amoxicillin/Clavulanic acid', 'penicillins', 'QJ01CR50', ARRAY['cattle', 'pigs', 'dogs', 'cats']),
('Penicillin G', 'Benzylpenicillin', 'penicillins', 'QJ01CE01', ARRAY['cattle', 'pigs', 'sheep', 'horses']),
('Gentamicin', 'Gentamicin', 'aminoglycosides', 'QJ01GB03', ARRAY['cattle', 'pigs', 'dogs', 'cats']),
('Sulfadimidin', 'Sulfadimidine', 'sulfonamides', 'QJ01EQ02', ARRAY['cattle', 'pigs', 'chickens', 'turkeys']),
('Borgal', 'Sulfadiazine/Trimethoprim', 'sulfonamides', 'QJ01EQ90', ARRAY['cattle', 'pigs', 'horses', 'dogs', 'cats']),
('Lincomycin', 'Lincomycin', 'lincosamides', 'QJ01FF02', ARRAY['pigs', 'chickens', 'dogs', 'cats']),
('Colistin', 'Colistin', 'polymyxins', 'QJ01XB01', ARRAY['cattle', 'pigs', 'chickens', 'turkeys', 'rabbits']);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.antibiotic_prescriptions TO authenticated;
GRANT SELECT ON public.antibiotic_drugs TO authenticated;
GRANT ALL ON public.tamg_export_batches TO authenticated;
GRANT ALL ON public.tamg_practice_settings TO authenticated;