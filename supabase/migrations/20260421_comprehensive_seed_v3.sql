-- Comprehensive Seed Data for Vet App Demo
-- Uses existing practices and demo user, adds rich test data

-- First, get the existing practice IDs and link demo user correctly
DO $$
DECLARE
    p1_id UUID;
    p2_id UUID;
    demo_id UUID := '257dd0a0-b46a-47eb-93df-43f646cdf259';
BEGIN
    -- Get existing practice IDs
    SELECT id INTO p1_id FROM public.praxis WHERE id = '00000000-0000-0000-0000-000000000001';
    SELECT id INTO p2_id FROM public.praxis WHERE name LIKE '%Demo%';

    -- Update demo user to link to practice 1
    IF p1_id IS NOT NULL THEN
        UPDATE public.profiles SET praxis_id = p1_id WHERE id = demo_id;
    END IF;
END $$;

-- ============================================
-- ADD MORE PRACTICES
-- ============================================

INSERT INTO public.praxis (id, name, address, city, postal_code, phone, email, bnr15)
VALUES
    ('00000000-0000-0000-0000-000000000002', 'Kleintierpraxis Dr. Schmidt', 'Marienplatz 5', 'München', '80331', '+49 89 55566677', 'kontakt@kleintier-schmidt.de', 'DE00000000002'),
    ('00000000-0000-0000-0000-000000000003', 'Tierklinik Nord', 'Hafenstraße 120', 'Hamburg', '20095', '+49 40 99988877', 'info@tierklinik-nord.de', 'DE00000000003')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    postal_code = EXCLUDED.postal_code,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    bnr15 = EXCLUDED.bnr15;

-- ============================================
-- PATIENTS (Practice 1 - where demo user is)
-- ============================================

INSERT INTO public.patient (id, praxis_id, name, species, breed, gender, birth_date, owner_name, owner_phone, owner_email, notes)
VALUES
    -- Dogs
    ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Bello', 'Hund', 'Schäferhund', 'männlich', '2020-03-15', 'Max Mustermann', '+49 30 98765432', 'max.mustermann@email.de', 'Gut erzogen, keine已知 Allergien'),
    ('a1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Luna', 'Hund', 'Labrador', 'weiblich', '2019-07-20', 'Anna Schmidt', '+49 30 55566778', 'anna.schmidt@email.de', 'Sehr aktiv, liebt apportieren'),
    ('a1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Rex', 'Hund', 'Malinois', 'männlich', '2021-01-10', 'Thomas Bauer', '+49 30 11122233', 'thomas.bauer@email.de', 'Polizeihund-Rentner'),
    ('a1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Molly', 'Hund', 'Golden Retriever', 'weiblich', '2022-04-05', 'Petra König', '+49 30 44455566', 'petra.koenig@email.de', 'Therapiehund'),
    ('a1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Charly', 'Hund', 'Mischling', 'männlich', '2018-11-30', 'Stefan Wolf', '+49 30 77788899', 'stefan.wolf@email.de', 'Aus dem Tierheim adoptiert'),
    -- Cats
    ('a1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Mimi', 'Katze', 'Europäisch Kurzhaar', 'weiblich', '2022-07-20', 'Anna Schmidt', '+49 30 55566778', 'anna.schmidt@email.de', 'Hauskatze, Indoor-only'),
    ('a1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Felix', 'Katze', 'Britisch Kurzhaar', 'männlich', '2020-02-14', 'Monika Hartmann', '+49 30 33344455', 'monika.hartmann@email.de', NULL),
    ('a1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Schnurri', 'Katze', 'Perser', 'weiblich', '2019-09-01', 'Klaus Neumann', '+49 30 22233344', 'klaus.neumann@email.de', 'Benötigt regelmäßige Augenpflege'),
    -- Small mammals
    ('a1000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Hoppel', 'Kaninchen', 'Holländer Loh', 'männlich', '2023-03-20', 'Lisa Jung', '+49 30 66677788', 'lisa.jung@email.de', NULL),
    ('a1000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Stups', 'Meerschweinchen', 'Glatthaar', 'weiblich', '2023-06-15', 'Tom Klein', '+49 30 88899900', 'tom.klein@email.de', NULL)
ON CONFLICT (id) DO NOTHING;

-- Practice 2 Patients (Munich)
INSERT INTO public.patient (id, praxis_id, name, species, breed, gender, birth_date, owner_name, owner_phone, owner_email, notes)
VALUES
    ('a2000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Buster', 'Hund', 'Beagle', 'männlich', '2019-05-10', 'Hans Gruber', '+49 89 11122233', 'hans.gruber@email.de', 'Jagdhund'),
    ('a2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Whiskers', 'Katze', 'Siam', 'männlich', '2021-08-15', 'Eva Braun', '+49 89 22233344', 'eva.braun@email.de', NULL),
    ('a2000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Rocky', 'Hund', 'Bulldogge', 'männlich', '2020-12-01', 'Peter Stein', '+49 89 33344455', 'peter.stein@email.de', 'Atemprobleme bekannt'),
    ('a2000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Susi', 'Katze', 'Maine Coon', 'weiblich', '2018-04-20', 'Maria Wagner', '+49 89 44455566', 'maria.wagner@email.de', 'Sehr groß und flauschig'),
    ('a2000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'Speedy', 'Kaninchen', 'Zwergkaninchen', 'männlich', '2022-10-30', 'Julia Hoffmann', '+49 89 55566677', 'julia.hoffmann@email.de', NULL)
ON CONFLICT (id) DO NOTHING;

-- Practice 3 Patients (Hamburg)
INSERT INTO public.patient (id, praxis_id, name, species, breed, gender, birth_date, owner_name, owner_phone, owner_email, notes)
VALUES
    ('a3000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Bruno', 'Hund', 'Rottweiler', 'männlich', '2017-06-15', 'Klaus Peters', '+49 40 11122233', 'klaus.peters@email.de', 'Wachhund'),
    ('a3000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Minka', 'Katze', 'Norwegische Waldkatze', 'weiblich', '2020-03-25', 'Sandra Müller', '+49 40 22233344', 'sandra.mueller@email.de', NULL),
    ('a3000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Duke', 'Hund', 'Dobermann', 'männlich', '2019-11-08', 'Frank Schulz', '+49 40 33344455', 'frank.schulz@email.de', 'Schutzimpfung fällig'),
    ('a3000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'Cleo', 'Katze', 'Abessinier', 'weiblich', '2021-07-10', 'Nicole Braun', '+49 40 44455566', 'nicole.braun@email.de', 'Sehr aktiv'),
    ('a3000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', 'Piekfein', 'Pferd', 'Hannoveraner', 'männlich', '2015-04-12', 'Reiterhof Nord', '+49 40 55566677', 'kontakt@reiterhof-nord.de', 'Turnierpferd')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- MEDICATIONS (Per Practice)
-- ============================================

-- Practice 1 Medications (using gen_random_uuid() for proper UUIDs)
INSERT INTO public.medikamente (praxis_id, name, manufacturer, dosage_form, strength, unit, current_stock, minimum_stock, unit_price, category)
SELECT '00000000-0000-0000-0000-000000000001', 'Amoxicillin 500mg', 'Bayer Vital GmbH', 'Tablette', '500', 'mg', 100, 20, 0.50, 'antibiotic' WHERE NOT EXISTS (SELECT 1 FROM public.medikamente WHERE name = 'Amoxicillin 500mg' AND praxis_id = '00000000-0000-0000-0000-000000000001')
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001', 'Enrofloxacin 10%', 'Bayer Vital GmbH', 'Injektionslösung', '100', 'mg/ml', 50, 10, 2.00, 'antibiotic' WHERE NOT EXISTS (SELECT 1 FROM public.medikamente WHERE name = 'Enrofloxacin 10%' AND praxis_id = '00000000-0000-0000-0000-000000000001')
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001', 'Doxycyclin 200mg', 'WDT GmbH', 'Tablette', '200', 'mg', 80, 15, 0.75, 'antibiotic' WHERE NOT EXISTS (SELECT 1 FROM public.medikamente WHERE name = 'Doxycyclin 200mg' AND praxis_id = '00000000-0000-0000-0000-000000000001')
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001', 'Cefalexin 250mg', 'CP-Pharma GmbH', 'Tablette', '250', 'mg', 60, 10, 0.60, 'antibiotic' WHERE NOT EXISTS (SELECT 1 FROM public.medikamente WHERE name = 'Cefalexin 250mg' AND praxis_id = '00000000-0000-0000-0000-000000000001')
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001', 'Meloxicam 1.5mg/ml', 'Boehringer Ingelheim', 'Suspension', '1.5', 'mg/ml', 30, 5, 1.50, 'antiinflammatory' WHERE NOT EXISTS (SELECT 1 FROM public.medikamente WHERE name = 'Meloxicam 1.5mg/ml' AND praxis_id = '00000000-0000-0000-0000-000000000001')
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001', 'Omeprazol 20mg', 'WDT GmbH', 'Kapsel', '20', 'mg', 40, 10, 0.30, 'gastrointestinal' WHERE NOT EXISTS (SELECT 1 FROM public.medikamente WHERE name = 'Omeprazol 20mg' AND praxis_id = '00000000-0000-0000-0000-000000000001');

-- Practice 2 Medications
INSERT INTO public.medikamente (praxis_id, name, manufacturer, dosage_form, strength, unit, current_stock, minimum_stock, unit_price, category)
SELECT '00000000-0000-0000-0000-000000000002', 'Amoxicillin 250mg', 'Bayer Vital GmbH', 'Tablette', '250', 'mg', 120, 30, 0.40, 'antibiotic' WHERE NOT EXISTS (SELECT 1 FROM public.medikamente WHERE name = 'Amoxicillin 250mg' AND praxis_id = '00000000-0000-0000-0000-000000000002')
UNION ALL
SELECT '00000000-0000-0000-0000-000000000002', 'Marbofloxacin 20mg', 'Vétoquinol', 'Tablette', '20', 'mg', 40, 10, 1.20, 'antibiotic' WHERE NOT EXISTS (SELECT 1 FROM public.medikamente WHERE name = 'Marbofloxacin 20mg' AND praxis_id = '00000000-0000-0000-0000-000000000002')
UNION ALL
SELECT '00000000-0000-0000-0000-000000000002', 'Carprofen 50mg', 'Zoetis', 'Tablette', '50', 'mg', 60, 15, 0.80, 'antiinflammatory' WHERE NOT EXISTS (SELECT 1 FROM public.medikamente WHERE name = 'Carprofen 50mg' AND praxis_id = '00000000-0000-0000-0000-000000000002');

-- Practice 3 Medications
INSERT INTO public.medikamente (praxis_id, name, manufacturer, dosage_form, strength, unit, current_stock, minimum_stock, unit_price, category)
SELECT '00000000-0000-0000-0000-000000000003', 'Penicillin G 1Mio', 'Bayer Vital GmbH', 'Injektionslösung', '1', 'Mio IE', 25, 5, 3.00, 'antibiotic' WHERE NOT EXISTS (SELECT 1 FROM public.medikamente WHERE name = 'Penicillin G 1Mio' AND praxis_id = '00000000-0000-0000-0000-000000000003')
UNION ALL
SELECT '00000000-0000-0000-0000-000000000003', 'Gentamicin 40mg/ml', 'Bayer Vital GmbH', 'Injektionslösung', '40', 'mg/ml', 20, 5, 2.50, 'antibiotic' WHERE NOT EXISTS (SELECT 1 FROM public.medikamente WHERE name = 'Gentamicin 40mg/ml' AND praxis_id = '00000000-0000-0000-0000-000000000003')
UNION ALL
SELECT '00000000-0000-0000-0000-000000000003', 'Sulfadimidin 33%', 'WDT GmbH', 'Injektionslösung', '330', 'mg/ml', 15, 3, 1.80, 'antibiotic' WHERE NOT EXISTS (SELECT 1 FROM public.medikamente WHERE name = 'Sulfadimidin 33%' AND praxis_id = '00000000-0000-0000-0000-000000000003');

-- ============================================
-- TREATMENTS (Behandlungen)
-- ============================================

-- Practice 1 Treatments
INSERT INTO public.behandlungen (id, praxis_id, patient_id, vet_id, diagnosis, treatment_date, notes)
VALUES
    ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '257dd0a0-b46a-47eb-93df-43f646cdf259', 'Otitis externa', CURRENT_DATE - INTERVAL '30 days', 'Rechtsseitige Ohrinfektion, Ohrreinigung durchgeführt'),
    ('b1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '257dd0a0-b46a-47eb-93df-43f646cdf259', 'Jahresimpfung', CURRENT_DATE - INTERVAL '15 days', 'DHPPi + Tollwut, keine Reaktion'),
    ('b1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', '257dd0a0-b46a-47-93df-43f646cdf259', 'Arthrose', CURRENT_DATE - INTERVAL '45 days', 'Röntgen durchgeführt, Arthrose beginnend'),
    ('b1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000006', '257dd0a0-b46a-47eb-93df-43f646cdf259', 'Zahnstein', CURRENT_DATE - INTERVAL '7 days', 'Milde Zahnsteinbildung, Zahnreinigung durchgeführt'),
    ('b1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000009', '257dd0a0-b46a-47eb-93df-43f646cdf259', 'Gesundheitscheck', CURRENT_DATE - INTERVAL '60 days', 'Kastration geplant'),
    ('b1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', '257dd0a0-b46a-47eb-93df-43f646cdf259', 'Hautinfektion', CURRENT_DATE - INTERVAL '10 days', 'Hautabschürfung nach Training, Antibiotikum verschrieben'),
    ('b1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', '257dd0a0-b46a-47eb-93df-43f646cdf259', 'Allergie', CURRENT_DATE - INTERVAL '20 days', 'Verdacht auf Futterallergie, Ausschlussdiät empfohlen'),
    ('b1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000007', '257dd0a0-b46a-47eb-93df-43f646cdf259', 'Impfung', CURRENT_DATE - INTERVAL '45 days', 'Katzenschnupfen-Impfung'),
    ('b1000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000010', '257dd0a0-b46a-47eb-93df-43f646cdf259', 'Gesundheitscheck', CURRENT_DATE - INTERVAL '90 days', 'Erstvorstellung, gesund')
ON CONFLICT (id) DO NOTHING;

-- Practice 2 Treatments (no vet_id - different practice)
INSERT INTO public.behandlungen (id, praxis_id, patient_id, diagnosis, treatment_date, notes)
VALUES
    ('b2000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', 'Zeckenbiss', CURRENT_DATE - INTERVAL '20 days', 'Zeckenentfernung, Desinfektion, keine Borreliose-Symptome'),
    ('b2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000002', 'Atemwegsinfektion', CURRENT_DATE - INTERVAL '5 days', 'Leichte Bronchitis'),
    ('b2000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000003', 'Jahrescheck', CURRENT_DATE - INTERVAL '90 days', 'Blutbild und Impfungen, alle Werte normal')
ON CONFLICT (id) DO NOTHING;

-- Practice 3 Treatments
INSERT INTO public.behandlungen (id, praxis_id, patient_id, diagnosis, treatment_date, notes)
VALUES
    ('b3000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000001', 'Hüftdysplasie', CURRENT_DATE - INTERVAL '100 days', 'Mittelgradige HD, Röntgen durchgeführt'),
    ('b3000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000005', 'Turniercheck', CURRENT_DATE - INTERVAL '180 days', 'Komplette Untersuchung, tüchtig für Turniere'),
    ('b3000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000003', 'Schnittwunde', CURRENT_DATE - INTERVAL '2 days', 'Pfotenverletzung, Wundversorgung')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ANTIBIOTIC PRESCRIPTIONS (TAMG Records)
-- ============================================

-- Practice 1 Antibiotic Prescriptions (demo user as vet)
-- Using subqueries to get medication IDs dynamically
INSERT INTO public.antibiotic_prescriptions (
    practice_id, patient_id, drug_name, drug_id, atc_code, amount, unit, dosage_form, strength,
    animal_species, animal_count, animal_age_category, diagnosis_code, treatment_purpose,
    treatment_duration_days, prescribing_vet_id, prescribed_at, bvl_reporting_period, bvl_reported
)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'Amoxicillin 500mg',
    m.id,
    'J01CA04', 14, 'Tabletten', 'Tablette', '500mg', 'Hund', 1, 'adult', 'J00', 'therapeutic', 7,
    '257dd0a0-b46a-47eb-93df-43f646cdf259',
    CURRENT_DATE - INTERVAL '90 days',
    CURRENT_DATE - INTERVAL '90 days',
    true
FROM public.medikamente m WHERE m.name = 'Amoxicillin 500mg' AND m.praxis_id = '00000000-0000-0000-0000-000000000001'
AND NOT EXISTS (SELECT 1 FROM public.antibiotic_prescriptions WHERE patient_id = 'a1000000-0000-0000-0000-000000000001' AND drug_name = 'Amoxicillin 500mg' AND prescribed_at = CURRENT_DATE - INTERVAL '90 days');

-- More antibiotic prescriptions without explicit IDs
INSERT INTO public.antibiotic_prescriptions (
    practice_id, patient_id, drug_name, atc_code, amount, unit, dosage_form, strength,
    animal_species, animal_count, animal_age_category, diagnosis_code, treatment_purpose,
    treatment_duration_days, prescribing_vet_id, prescribed_at, bvl_reporting_period, bvl_reported
)
SELECT '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'Amoxicillin 500mg', 'J01CA04', 20, 'Tabletten', 'Tablette', '500mg', 'Hund', 1, 'adult', 'L02', 'therapeutic', 10, '257dd0a0-b46a-47eb-93df-43f646cdf259', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '10 days', false WHERE NOT EXISTS (SELECT 1 FROM public.antibiotic_prescriptions WHERE patient_id = 'a1000000-0000-0000-0000-000000000003' LIMIT 1)
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'Amoxicillin 500mg', 'J01CA04', 10, 'Tabletten', 'Tablette', '500mg', 'Hund', 1, 'adult', 'N30', 'therapeutic', 5, '257dd0a0-b46a-47eb-93df-43f646cdf259', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '60 days', true WHERE NOT EXISTS (SELECT 1 FROM public.antibiotic_prescriptions WHERE patient_id = 'a1000000-0000-0000-0000-000000000002' LIMIT 1)
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000006', 'Enrofloxacin 10%', 'J01MA02', 7, 'ml', 'Injektionslösung', '100mg/ml', 'Katze', 1, 'adult', 'J06', 'therapeutic', 7, '257dd0a0-b46a-47eb-93df-43f646cdf259', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '45 days', true WHERE NOT EXISTS (SELECT 1 FROM public.antibiotic_prescriptions WHERE patient_id = 'a1000000-0000-0000-0000-000000000006' LIMIT 1)
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000009', 'Doxycyclin 200mg', 'J01AA02', 5, 'Tabletten', 'Tablette', '200mg', 'Kaninchen', 1, 'young', 'A44', 'therapeutic', 5, '257dd0a0-b46a-47eb-93df-43f646cdf259', CURRENT_DATE - INTERVAL '120 days', CURRENT_DATE - INTERVAL '120 days', true WHERE NOT EXISTS (SELECT 1 FROM public.antibiotic_prescriptions WHERE patient_id = 'a1000000-0000-0000-0000-000000000009' LIMIT 1)
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000007', 'Cefalexin 250mg', 'J01DB01', 10, 'Tabletten', 'Tablette', '250mg', 'Katze', 1, 'adult', 'J20', 'therapeutic', 7, '257dd0a0-b46a-47eb-93df-43f646cdf259', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '45 days', true WHERE NOT EXISTS (SELECT 1 FROM public.antibiotic_prescriptions WHERE patient_id = 'a1000000-0000-0000-0000-000000000007' LIMIT 1)
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'Enrofloxacin 10%', 'J01MA02', 5, 'ml', 'Injektionslösung', '100mg/ml', 'Hund', 1, 'adult', 'L00', 'therapeutic', 5, '257dd0a0-b46a-47eb-93df-43f646cdf259', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '10 days', false WHERE NOT EXISTS (SELECT 1 FROM public.antibiotic_prescriptions WHERE patient_id = 'a1000000-0000-0000-0000-000000000003' AND drug_name = 'Enrofloxacin 10%' LIMIT 1);

-- Practice 2 Antibiotic Prescriptions
INSERT INTO public.antibiotic_prescriptions (
    practice_id, patient_id, drug_name, atc_code, amount, unit, dosage_form, strength,
    animal_species, animal_count, animal_age_category, diagnosis_code, treatment_purpose,
    treatment_duration_days, prescribed_at, bvl_reporting_period, bvl_reported
)
SELECT '00000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000002', 'Marbofloxacin 20mg', 'J01MA03', 14, 'Tabletten', 'Tablette', '20mg', 'Katze', 1, 'adult', 'J20', 'therapeutic', 7, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '5 days', false WHERE NOT EXISTS (SELECT 1 FROM public.antibiotic_prescriptions WHERE patient_id = 'a2000000-0000-0000-0000-000000000002' LIMIT 1);

-- Practice 3 Antibiotic Prescriptions
INSERT INTO public.antibiotic_prescriptions (
    practice_id, patient_id, drug_name, atc_code, amount, unit, dosage_form, strength,
    animal_species, animal_count, animal_age_category, diagnosis_code, treatment_purpose,
    treatment_duration_days, prescribed_at, bvl_reporting_period, bvl_reported
)
SELECT '00000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000003', 'Penicillin G 1Mio', 'J01CE01', 10, 'ml', 'Injektionslösung', '1Mio IE', 'Hund', 1, 'adult', 'S01', 'therapeutic', 10, CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '2 days', false WHERE NOT EXISTS (SELECT 1 FROM public.antibiotic_prescriptions WHERE patient_id = 'a3000000-0000-0000-0000-000000000003' LIMIT 1)
UNION ALL
SELECT '00000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000005', 'Sulfadimidin 33%', 'J01EE01', 30, 'ml', 'Injektionslösung', '330mg/ml', 'Pferd', 1, 'adult', 'M79', 'therapeutic', 5, CURRENT_DATE - INTERVAL '180 days', CURRENT_DATE - INTERVAL '180 days', true WHERE NOT EXISTS (SELECT 1 FROM public.antibiotic_prescriptions WHERE patient_id = 'a3000000-0000-0000-0000-000000000005' LIMIT 1);

-- ============================================
-- API KEYS (For headless API testing)
-- ============================================

INSERT INTO public.api_keys (praxis_id, key_prefix, name, last_used_at, expires_at)
SELECT '00000000-0000-0000-0000-000000000001', 'vet_p1_', 'Test Key Praxis 1', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '365 days' WHERE NOT EXISTS (SELECT 1 FROM public.api_keys WHERE praxis_id = '00000000-0000-0000-0000-000000000001')
UNION ALL
SELECT '00000000-0000-0000-0000-000000000002', 'vet_p2_', 'Test Key Praxis 2', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '365 days' WHERE NOT EXISTS (SELECT 1 FROM public.api_keys WHERE praxis_id = '00000000-0000-0000-0000-000000000002')
UNION ALL
SELECT '00000000-0000-0000-0000-000000000003', 'vet_p3_', 'Test Key Praxis 3', NULL, CURRENT_DATE + INTERVAL '365 days' WHERE NOT EXISTS (SELECT 1 FROM public.api_keys WHERE praxis_id = '00000000-0000-0000-0000-000000000003');

-- ============================================
-- UPDATE DEMO USER NAME
-- ============================================

UPDATE public.profiles
SET full_name = 'Dr. Anna Müller'
WHERE id = '257dd0a0-b46a-47eb-93df-43f646cdf259';

-- ============================================
-- VERIFY DATA
-- ============================================

SELECT 'Practices' as category, COUNT(*) as count FROM public.praxis
UNION ALL
SELECT 'Profiles', COUNT(*) FROM public.profiles
UNION ALL
SELECT 'Patients', COUNT(*) FROM public.patient
UNION ALL
SELECT 'Treatments', COUNT(*) FROM public.behandlungen
UNION ALL
SELECT 'Antibiotic Prescriptions', COUNT(*) FROM public.antibiotic_prescriptions
UNION ALL
SELECT 'Medications', COUNT(*) FROM public.medikamente
UNION ALL
SELECT 'API Keys', COUNT(*) FROM public.api_keys;