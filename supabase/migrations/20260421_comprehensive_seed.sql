-- Comprehensive Seed Data for Vet App Demo
-- Creates multiple practices, employees, patients, treatments, and antibiotic records
-- For full multitenancy testing

-- ============================================
-- PRACTICES (Multi-tenant)
-- ============================================

-- Practice 1: Tierarztpraxis Müller (Berlin) - existing
INSERT INTO public.praxis (id, name, address, city, postal_code, phone, email, bnr15)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Tierarztpraxis Dr. Müller',
    'Hauptstraße 42',
    'Berlin',
    '10115',
    '+49 30 12345678',
    'info@tierarzt-mueller.de',
    'DE00000000001'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    postal_code = EXCLUDED.postal_code,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    bnr15 = EXCLUDED.bnr15;

-- Practice 2: Kleintierpraxis Schmidt (Munich)
INSERT INTO public.praxis (id, name, address, city, postal_code, phone, email, bnr15)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Kleintierpraxis Dr. Schmidt',
    'Marienplatz 5',
    'München',
    '80331',
    '+49 89 55566677',
    'kontakt@kleintier-schmidt.de',
    'DE00000000002'
) ON CONFLICT (id) DO NOTHING;

-- Practice 3: Tierklinik Nord (Hamburg)
INSERT INTO public.praxis (id, name, address, city, postal_code, phone, email, bnr15)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'Tierklinik Nord',
    'Hafenstraße 120',
    'Hamburg',
    '20095',
    '+49 40 99988877',
    'info@tierklinik-nord.de',
    'DE00000000003'
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- EMPLOYEES / PROFILES (Per Practice)
-- ============================================

-- Practice 1 Employees (Berlin)
INSERT INTO public.profiles (id, praxis_id, full_name, role, email)
VALUES
    -- Demo user
    ('257dd0a0-b46a-47eb-93df-43f646cdf259', '00000000-0000-0000-0000-000000000001', 'Dr. Anna Müller', 'vet', 'anna.mueller@tierarzt-mueller.de'),
    -- Additional vets
    ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Dr. Thomas Weber', 'vet', 'thomas.weber@tierarzt-mueller.de'),
    ('11111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000001', 'Dr. Lisa Braun', 'vet', 'lisa.braun@tierarzt-mueller.de'),
    -- Assistants
    ('11111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000001', 'Sarah Hoffmann', 'assistant', 'sarah.hoffmann@tierarzt-mueller.de'),
    ('11111111-1111-1111-1111-111111111114', '00000000-0000-0000-0000-000000000001', 'Michael Klein', 'assistant', 'michael.klein@tierarzt-mueller.de'),
    -- Admin
    ('11111111-1111-1111-1111-111111111115', '00000000-0000-0000-0000-000000000001', 'Petra Richter', 'admin', 'petra.richter@tierarzt-mueller.de')
ON CONFLICT (id) DO UPDATE SET
    praxis_id = EXCLUDED.praxis_id,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    email = EXCLUDED.email;

-- Practice 2 Employees (Munich)
INSERT INTO public.profiles (id, praxis_id, full_name, role, email)
VALUES
    ('22222222-2222-2222-2222-222222222221', '00000000-0000-0000-0000-000000000002', 'Dr. Klaus Schmidt', 'vet', 'klaus.schmidt@kleintier-schmidt.de'),
    ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', 'Dr. Maria Fischer', 'vet', 'maria.fischer@kleintier-schmidt.de'),
    ('22222222-2222-2222-2222-222222222223', '00000000-0000-0000-0000-000000000002', 'Julia Meyer', 'assistant', 'julia.meyer@kleintier-schmidt.de'),
    ('22222222-2222-2222-2222-222222222224', '00000000-0000-0000-0000-000000000002', 'Andreas Wolf', 'admin', 'andreas.wolf@kleintier-schmidt.de')
ON CONFLICT (id) DO NOTHING;

-- Practice 3 Employees (Hamburg)
INSERT INTO public.profiles (id, praxis_id, full_name, role, email)
VALUES
    ('33333333-3333-3333-3333-333333333331', '00000000-0000-0000-0000-000000000003', 'Dr. Heinrich Lange', 'vet', 'heinrich.lange@tierklinik-nord.de'),
    ('33333333-3333-3333-3333-333333333332', '00000000-0000-0000-0000-000000000003', 'Dr. Sabine Köhler', 'vet', 'sabine.koehler@tierklinik-nord.de'),
    ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000003', 'Dr. Peter Zimmermann', 'vet', 'peter.zimmermann@tierklinik-nord.de'),
    ('33333333-3333-3333-3333-333333333334', '00000000-0000-0000-0000-000000000003', 'Nina Schulz', 'assistant', 'nina.schulz@tierklinik-nord.de'),
    ('33333333-3333-3333-3333-333333333335', '00000000-0000-0000-0000-000000000003', 'Torsten Krause', 'assistant', 'torsten.krause@tierklinik-nord.de')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PATIENTS (Per Practice)
-- ============================================

-- Practice 1 Patients (Berlin)
INSERT INTO public.patient (id, praxis_id, name, species, breed, gender, birth_date, owner_name, owner_phone, owner_email, weight_kg, chip_number, notes)
VALUES
    -- Dogs
    ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Bello', 'Hund', 'Schäferhund', 'männlich', '2020-03-15', 'Max Mustermann', '+49 30 98765432', 'max.mustermann@email.de', 32.5, 'DE0000000001', 'Gut erzogen, keine已知 Allergien'),
    ('a1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Luna', 'Hund', 'Labrador', 'weiblich', '2019-07-20', 'Anna Schmidt', '+49 30 55566778', 'anna.schmidt@email.de', 28.0, 'DE0000000002', 'Sehr aktiv, liebt apportieren'),
    ('a1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Rex', 'Hund', 'Malinois', 'männlich', '2021-01-10', 'Thomas Bauer', '+49 30 11122233', 'thomas.bauer@email.de', 25.0, 'DE0000000003', 'Polizeihund-Rentner'),
    ('a1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Molly', 'Hund', 'Golden Retriever', 'weiblich', '2022-04-05', 'Petra König', '+49 30 44455566', 'petra.koenig@email.de', 30.0, 'DE0000000004', 'Therapiehund'),
    ('a1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Charly', 'Hund', 'Mischling', 'männlich', '2018-11-30', 'Stefan Wolf', '+49 30 77788899', 'stefan.wolf@email.de', 18.5, 'DE0000000005', 'Aus dem Tierheim adoptiert'),
    -- Cats
    ('a1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Mimi', 'Katze', 'Europäisch Kurzhaar', 'weiblich', '2022-07-20', 'Anna Schmidt', '+49 30 55566778', 'anna.schmidt@email.de', 4.2, 'DE0000000006', 'Hauskatze, Indoor-only'),
    ('a1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Felix', 'Katze', 'Britisch Kurzhaar', 'männlich', '2020-02-14', 'Monika Hartmann', '+49 30 33344455', 'monika.hartmann@email.de', 6.8, 'DE0000000007', NULL),
    ('a1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Schnurri', 'Katze', 'Perser', 'weiblich', '2019-09-01', 'Klaus Neumann', '+49 30 22233344', 'klaus.neumann@email.de', 3.5, 'DE0000000008', 'Benötigt regelmäßige Augenpflege'),
    -- Small mammals
    ('a1000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Hoppel', 'Kaninchen', 'Holländer Loh', 'männlich', '2023-03-20', 'Lisa Jung', '+49 30 66677788', 'lisa.jung@email.de', 2.1, 'DE0000000009', NULL),
    ('a1000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Stups', 'Meerschweinchen', 'Glatthaar', 'weiblich', '2023-06-15', 'Tom Klein', '+49 30 88899900', 'tom.klein@email.de', 0.9, 'DE0000000010', NULL)
ON CONFLICT (id) DO NOTHING;

-- Practice 2 Patients (Munich)
INSERT INTO public.patient (id, praxis_id, name, species, breed, gender, birth_date, owner_name, owner_phone, owner_email, weight_kg, chip_number, notes)
VALUES
    ('a2000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Buster', 'Hund', 'Beagle', 'männlich', '2019-05-10', 'Hans Gruber', '+49 89 11122233', 'hans.gruber@email.de', 14.0, 'DE0000000011', 'Jagdhund'),
    ('a2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Whiskers', 'Katze', 'Siam', 'männlich', '2021-08-15', 'Eva Braun', '+49 89 22233344', 'eva.braun@email.de', 5.5, 'DE0000000012', NULL),
    ('a2000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Rocky', 'Hund', 'Bulldogge', 'männlich', '2020-12-01', 'Peter Stein', '+49 89 33344455', 'peter.stein@email.de', 22.0, 'DE0000000013', 'Atemprobleme bekannt'),
    ('a2000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Susi', 'Katze', 'Maine Coon', 'weiblich', '2018-04-20', 'Maria Wagner', '+49 89 44455566', 'maria.wagner@email.de', 8.0, 'DE0000000014', 'Sehr groß und flauschig'),
    ('a2000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'Speedy', 'Kaninchen', 'Zwergkaninchen', 'männlich', '2022-10-30', 'Julia Hoffmann', '+49 89 55566677', 'julia.hoffmann@email.de', 1.5, 'DE0000000015', NULL)
ON CONFLICT (id) DO NOTHING;

-- Practice 3 Patients (Hamburg)
INSERT INTO public.patient (id, praxis_id, name, species, breed, gender, birth_date, owner_name, owner_phone, owner_email, weight_kg, chip_number, notes)
VALUES
    ('a3000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Bruno', 'Hund', 'Rottweiler', 'männlich', '2017-06-15', 'Klaus Peters', '+49 40 11122233', 'klaus.peters@email.de', 45.0, 'DE0000000016', 'Wachhund'),
    ('a3000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Minka', 'Katze', 'Norwegische Waldkatze', 'weiblich', '2020-03-25', 'Sandra Müller', '+49 40 22233344', 'sandra.mueller@email.de', 6.5, 'DE0000000017', NULL),
    ('a3000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Duke', 'Hund', 'Dobermann', 'männlich', '2019-11-08', 'Frank Schulz', '+49 40 33344455', 'frank.schulz@email.de', 38.0, 'DE0000000018', 'Schutzimpfung fällig'),
    ('a3000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'Cleo', 'Katze', 'Abessinier', 'weiblich', '2021-07-10', 'Nicole Braun', '+49 40 44455566', 'nicole.braun@email.de', 3.8, 'DE0000000019', 'Sehr aktiv'),
    ('a3000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', 'Piekfein', 'Pferd', 'Hannoveraner', 'männlich', '2015-04-12', 'Reiterhof Nord', '+49 40 55566677', 'kontakt@reiterhof-nord.de', 550.0, 'DE0000000020', 'Turnierpferd')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- TREATMENTS (Behandlungen)
-- ============================================

-- Practice 1 Treatments
INSERT INTO public.behandlungen (id, praxis_id, patient_id, vet_id, treatment_date, diagnosis, treatment, notes, follow_up_date)
VALUES
    ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '257dd0a0-b46a-47eb-93df-43f646cdf259', CURRENT_DATE - INTERVAL '30 days', 'Otitis externa', 'Ohrreinigung, Ohrentropfen', 'Rechtsseitige Ohrinfektion', CURRENT_DATE - INTERVAL '23 days'),
    ('b1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '257dd0a0-b46a-47eb-93df-43f646cdf259', CURRENT_DATE - INTERVAL '15 days', 'Jahresimpfung', 'DHPPi + Tollwut', 'Routineimpfung, keine Reaktion', NULL),
    ('b1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '45 days', 'Gelenkprobleme', 'Röntgen, Schmerzmittel', 'Arthrose beginnend, Gewichtsreduktion empfohlen', CURRENT_DATE - INTERVAL '15 days'),
    ('b1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000006', '257dd0a0-b46a-47eb-93df-43f646cdf259', CURRENT_DATE - INTERVAL '7 days', 'Zahnstein', 'Zahnreinigung unter Narkose', 'Milde Zahnsteinbildung, empfohlen jährliche Reinigung', CURRENT_DATE + INTERVAL '180 days'),
    ('b1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111112', CURRENT_DATE - INTERVAL '60 days', 'Gesundheitscheck', 'Kastration geplant', 'Kastration für nächsten Monat vereinbart', CURRENT_DATE - INTERVAL '30 days'),
    ('b1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', '257dd0a0-b46a-47eb-93df-43f646cdf259', CURRENT_DATE - INTERVAL '10 days', 'Hautinfektion', 'Antibiotikum, Verband', 'Hautabschürfung nach Training', CURRENT_DATE - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- Practice 2 Treatments
INSERT INTO public.behandlungen (id, praxis_id, patient_id, vet_id, treatment_date, diagnosis, treatment, notes, follow_up_date)
VALUES
    ('b2000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222221', CURRENT_DATE - INTERVAL '20 days', 'Zeckenbiss', 'Zeckenentfernung, Desinfektion', 'Keine Borreliose-Symptome', NULL),
    ('b2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '5 days', 'Atemwegsinfektion', 'Antibiotikum, Ruhe', 'Leichte Bronchitis', CURRENT_DATE + INTERVAL '7 days'),
    ('b2000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222221', CURRENT_DATE - INTERVAL '90 days', 'Jahrescheck', 'Blutbild, Impfungen', 'Alle Werte normal', NULL)
ON CONFLICT (id) DO NOTHING;

-- Practice 3 Treatments
INSERT INTO public.behandlungen (id, praxis_id, patient_id, vet_id, treatment_date, diagnosis, treatment, notes, follow_up_date)
VALUES
    ('b3000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333331', CURRENT_DATE - INTERVAL '100 days', 'Hüftdysplasie', 'Röntgen, Schmerzmanagement', 'Mittelgradige HD, Physiotherapie empfohlen', CURRENT_DATE - INTERVAL '10 days'),
    ('b3000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000005', '33333333-3333-3333-3333-333333333332', CURRENT_DATE - INTERVAL '180 days', 'Turniercheck', 'Komplette Untersuchung', 'Tüchtig für Turniere', NULL),
    ('b3000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333331', CURRENT_DATE - INTERVAL '2 days', 'Schnittwunde', 'Wundversorgung, Antibiotikum', 'Pfotenverletzung, gut verheilt', CURRENT_DATE + INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ANTIBIOTIC PRESCRIPTIONS (TAMG Records)
-- ============================================

-- Get medication IDs dynamically
DO $$
DECLARE
    p1_amox UUID;
    p1_enro UUID;
    p1_doxy UUID;
    p1_cefa UUID;
    p2_amox UUID;
    p3_amox UUID;
    p3_enro UUID;
BEGIN
    -- Get medication IDs
    SELECT id INTO p1_amox FROM public.medikamente WHERE name = 'Amoxicillin 500mg' AND praxis_id = '00000000-0000-0000-0000-000000000001' LIMIT 1;
    SELECT id INTO p1_enro FROM public.medikamente WHERE name = 'Enrofloxacin 10%' AND praxis_id = '00000000-0000-0000-0000-000000000001' LIMIT 1;
    SELECT id INTO p1_doxy FROM public.medikamente WHERE name = 'Doxycyclin 200mg' AND praxis_id = '00000000-0000-0000-0000-000000000001' LIMIT 1;
    SELECT id INTO p1_cefa FROM public.medikamente WHERE name = 'Cefalexin 250mg' AND praxis_id = '00000000-0000-0000-0000-000000000001' LIMIT 1;

    -- Practice 1 Antibiotic Prescriptions
    IF p1_amox IS NOT NULL THEN
        INSERT INTO public.antibiotic_prescriptions (
            praxis_id, patient_id, medication_id, vet_id,
            dosage, duration_days, indication, treatment_date,
            batch_number, withdrawal_period_meat_days, withdrawal_period_milk_days
        ) VALUES
            ('00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', p1_amox, '257dd0a0-b46a-47eb-93df-43f646cdf259', '500mg 2x täglich', 7, 'Atemwegsinfektion', CURRENT_DATE - INTERVAL '90 days', 'B001', 14, 3),
            ('00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', p1_amox, '257dd0a0-b46a-47eb-93df-43f646cdf259', '500mg 2x täglich', 10, 'Hautinfektion', CURRENT_DATE - INTERVAL '10 days', 'B002', 14, 3),
            ('00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', p1_amox, '11111111-1111-1111-1111-111111111111', '500mg 2x täglich', 5, 'Blasenentzündung', CURRENT_DATE - INTERVAL '60 days', 'B003', 14, 3);
    END IF;

    IF p1_enro IS NOT NULL THEN
        INSERT INTO public.antibiotic_prescriptions (
            praxis_id, patient_id, medication_id, vet_id,
            dosage, duration_days, indication, treatment_date,
            batch_number, withdrawal_period_meat_days, withdrawal_period_milk_days
        ) VALUES
            ('00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000006', p1_enro, '257dd0a0-b46a-47eb-93df-43f646cdf259', '5mg/kg 1x täglich', 7, 'Atemwegsinfektion', CURRENT_DATE - INTERVAL '45 days', 'E001', 28, 14);
    END IF;

    IF p1_doxy IS NOT NULL THEN
        INSERT INTO public.antibiotic_prescriptions (
            praxis_id, patient_id, medication_id, vet_id,
            dosage, duration_days, indication, treatment_date,
            batch_number, withdrawal_period_meat_days, withdrawal_period_milk_days
        ) VALUES
            ('00000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000009', p1_doxy, '11111111-1111-1111-1111-111111111112', '5mg/kg 2x täglich', 5, 'Pasteurella-Infektion', CURRENT_DATE - INTERVAL '120 days', 'D001', 7, 0);
    END IF;

END $$;

-- Practice 2 Antibiotic Prescriptions
INSERT INTO public.antibiotic_prescriptions (
    praxis_id, patient_id, vet_id,
    dosage, duration_days, indication, treatment_date,
    batch_number, withdrawal_period_meat_days, withdrawal_period_milk_days
)
SELECT
    '00000000-0000-0000-0000-000000000002',
    'a2000000-0000-0000-0000-000000000002',
    '22222222-2222-2222-2222-222222222222',
    '50mg/kg 2x täglich',
    7,
    'Atemwegsinfektion',
    CURRENT_DATE - INTERVAL '5 days',
    'M001',
    14,
    3
WHERE NOT EXISTS (
    SELECT 1 FROM public.antibiotic_prescriptions
    WHERE praxis_id = '00000000-0000-0000-0000-000000000002'
    AND patient_id = 'a2000000-0000-0000-0000-000000000002'
);

-- Practice 3 Antibiotic Prescriptions
INSERT INTO public.antibiotic_prescriptions (
    praxis_id, patient_id, vet_id,
    dosage, duration_days, indication, treatment_date,
    batch_number, withdrawal_period_meat_days, withdrawal_period_milk_days
)
SELECT
    '00000000-0000-0000-0000-000000000003',
    'a3000000-0000-0000-0000-000000000003',
    '33333333-3333-3333-3333-333333333331',
    '500mg 2x täglich',
    10,
    'Wundinfektion',
    CURRENT_DATE - INTERVAL '2 days',
    'H001',
    14,
    3
WHERE NOT EXISTS (
    SELECT 1 FROM public.antibiotic_prescriptions
    WHERE praxis_id = '00000000-0000-0000-0000-000000000003'
    AND patient_id = 'a3000000-0000-0000-0000-000000000003'
);

-- ============================================
-- TAMG PRACTICE SETTINGS
-- ============================================

INSERT INTO public.tamg_practice_settings (praxis_id, bnr15, practice_type, reporting_enabled, last_export_date)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'DE00000000001', 'kleintier', true, CURRENT_DATE - INTERVAL '30 days'),
    ('00000000-0000-0000-0000-000000000002', 'DE00000000002', 'kleintier', true, CURRENT_DATE - INTERVAL '60 days'),
    ('00000000-0000-0000-0000-000000000003', 'gemischt', 'DE00000000003', true, NULL)
ON CONFLICT (praxis_id) DO UPDATE SET
    bnr15 = EXCLUDED.bnr15,
    practice_type = EXCLUDED.practice_type,
    reporting_enabled = EXCLUDED.reporting_enabled;

-- ============================================
-- TAMG EXPORT BATCHES (Historical exports)
-- ============================================

INSERT INTO public.tamg_export_batches (id, praxis_id, exported_by, export_date, record_count, quarter, year, file_path)
VALUES
    ('c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '257dd0a0-b46a-47eb-93df-43f646cdf259', CURRENT_DATE - INTERVAL '90 days', 3, 1, EXTRACT(YEAR FROM CURRENT_DATE)::int, '/exports/2024_Q1_praxis1.csv'),
    ('c1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '257dd0a0-b46a-47eb-93df-43f646cdf259', CURRENT_DATE - INTERVAL '30 days', 2, 2, EXTRACT(YEAR FROM CURRENT_DATE)::int, '/exports/2024_Q2_praxis1.csv'),
    ('c2000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222221', CURRENT_DATE - INTERVAL '60 days', 1, 1, EXTRACT(YEAR FROM CURRENT_DATE)::int, '/exports/2024_Q1_praxis2.csv')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- AUDIT LOG ENTRIES
-- ============================================

INSERT INTO public.audit_log (praxis_id, user_id, action, entity_type, entity_id, details)
VALUES
    ('00000000-0000-0000-0000-000000000001', '257dd0a0-b46a-47eb-93df-43f646cdf259', 'CREATE', 'patient', 'a1000000-0000-0000-0000-000000000001', '{"name": "Bello", "species": "Hund"}'),
    ('00000000-0000-0000-0000-000000000001', '257dd0a0-b46a-47eb-93df-43f646cdf259', 'CREATE', 'antibiotic_prescription', NULL, '{"medication": "Amoxicillin", "indication": "Atemwegsinfektion"}'),
    ('00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222221', 'CREATE', 'patient', 'a2000000-0000-0000-0000-000000000001', '{"name": "Buster", "species": "Hund"}'),
    ('00000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333331', 'EXPORT', 'tamg_batch', 'c1000000-0000-0000-0000-000000000001', '{"quarter": 1, "year": 2024}')
ON CONFLICT DO NOTHING;

-- ============================================
-- API KEYS (For headless API testing)
-- ============================================

INSERT INTO public.api_keys (id, praxis_id, key_hash, key_prefix, name, permissions, last_used_at, expires_at)
VALUES
    ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', encode(sha256('vet_test_praxis1_key_12345'::bytea), 'hex'), 'vet_test_', 'Test Key Praxis 1', '["read", "write"]', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '365 days'),
    ('d1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', encode(sha256('vet_test_praxis2_key_67890'::bytea), 'hex'), 'vet_test_', 'Test Key Praxis 2', '["read"]', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '365 days')
ON CONFLICT (id) DO NOTHING;

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
SELECT 'API Keys', COUNT(*) FROM public.api_keys
UNION ALL
SELECT 'Export Batches', COUNT(*) FROM public.tamg_export_batches;