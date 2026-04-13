-- Seed Data for Vet App Demo
-- Run this in Supabase SQL Editor

-- Get the existing praxis id
DO $$
DECLARE
    p_praxis_id UUID;
BEGIN
    -- Get the existing praxis
    SELECT id INTO p_praxis_id FROM public.praxis LIMIT 1;
    
    -- If no praxis exists, create one
    IF p_praxis_id IS NULL THEN
        INSERT INTO public.praxis (name, address, city, postal_code, phone, email)
        VALUES (
            'Tierarztpraxis Müller',
            'Hauptstraße 42',
            'Berlin',
            '10115',
            '+49 30 12345678',
            'info@tierarzt-mueller.de'
        ) RETURNING id INTO p_praxis_id;
    END IF;
END $$;

-- Insert sample patients
INSERT INTO public.patient (praxis_id, name, species, breed, gender, birth_date, owner_name, owner_phone)
SELECT 
    p.id,
    'Bello',
    'Hund',
    'Schäferhund',
    'männlich',
    '2020-03-15',
    'Max Mustermann',
    '+49 30 98765432'
FROM public.praxis p
WHERE NOT EXISTS (SELECT 1 FROM public.patient LIMIT 1);

INSERT INTO public.patient (praxis_id, name, species, breed, gender, birth_date, owner_name, owner_phone)
SELECT 
    p.id,
    'Mimi',
    'Katze',
    'Europäisch Kurzhaar',
    'weiblich',
    '2022-07-20',
    'Anna Schmidt',
    '+49 30 55566778'
FROM public.praxis p
WHERE NOT EXISTS (SELECT 1 FROM public.patient WHERE name = 'Mimi');

-- Insert sample medications (antibiotics)
INSERT INTO public.medikamente (praxis_id, name, active_ingredient, manufacturer, dosage_form, strength, unit, category)
SELECT 
    p.id,
    'Amoxicillin 500mg',
    'Amoxicillin',
    'Bayer Vital GmbH',
    'Tablette',
    '500',
    'mg',
    '["antibiotic", "antibakteriell"]'
FROM public.praxis p
WHERE NOT EXISTS (SELECT 1 FROM public.medikamente WHERE name = 'Amoxicillin 500mg');

INSERT INTO public.medikamente (praxis_id, name, active_ingredient, manufacturer, dosage_form, strength, unit, category)
SELECT 
    p.id,
    'Enrofloxacin 10%',
    'Enrofloxacin',
    'Bayer Vital GmbH',
    'Injektionslösung',
    '100',
    'mg/ml',
    '["antibiotic", "fluorchinolon"]'
FROM public.praxis p
WHERE NOT EXISTS (SELECT 1 FROM public.medikamente WHERE name = 'Enrofloxacin 10%');

INSERT INTO public.medikamente (praxis_id, name, active_ingredient, manufacturer, dosage_form, strength, unit, category)
SELECT 
    p.id,
    'Doxycyclin 200mg',
    'Doxycyclin',
    'WDT GmbH',
    'Tablette',
    '200',
    'mg',
    '["antibiotic", "tetracyclin"]'
FROM public.praxis p
WHERE NOT EXISTS (SELECT 1 FROM public.medikamente WHERE name = 'Doxycyclin 200mg');

INSERT INTO public.medikamente (praxis_id, name, active_ingredient, manufacturer, dosage_form, strength, unit, category)
SELECT 
    p.id,
    'Cefalexin 250mg',
    'Cefalexin',
    'CP-Pharma GmbH',
    'Tablette',
    '250',
    'mg',
    '["antibiotic", "cephalosporin"]'
FROM public.praxis p
WHERE NOT EXISTS (SELECT 1 FROM public.medikamente WHERE name = 'Cefalexin 250mg');

-- Insert sample antibiotic prescriptions
INSERT INTO public.antibiotic_prescriptions (
    praxis_id, patient_id, medication_id, vet_id,
    dosage, duration_days, indication, treatment_date
)
SELECT 
    p.id,
    pat.id,
    m.id,
    NULL,
    '500mg 2x täglich',
    7,
    'Atemwegsinfektion',
    CURRENT_DATE - INTERVAL '3 days'
FROM public.praxis p
CROSS JOIN public.patient pat
CROSS JOIN public.medikamente m
WHERE p.id = pat.praxis_id 
  AND m.name = 'Amoxicillin 500mg'
  AND pat.name = 'Bello'
  AND NOT EXISTS (SELECT 1 FROM public.antibiotic_prescriptions LIMIT 1);