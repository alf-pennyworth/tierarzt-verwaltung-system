-- Seed data for German Veterinary Antibiotics
-- Target table: public.medikamente (as per drug-api-integration.md and existing schema)
-- Note: Based on the schema found in migrations, the drug names go into 'medikamente' table.
-- The 'antibiotic_prescriptions' table links to this via drug_id.

INSERT INTO public.medikamente (id, product_name, product_name_de, atc_vet_code, is_antibiotic, pharmaceutical_form, available_in_de)
VALUES
-- Penicillins (QJ01A)
(gen_random_uuid(), 'Amoxicillin', 'Amoxicillin', 'QJ01A02', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Amoxicillin/Clavulanic Acid', 'Amoxicillin/Clavulansäure', 'QJ01A03', true, 'Tabletten', true),
(gen_random_uuid(), 'Ampicillin', 'Ampicillin', 'QJ01A01', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Benzylpenicillin', 'Benzylpenicillin', 'QJ01A01', true, 'Pulver zur Rekonstitution', true),
(gen_random_uuid(), 'Piperacillin', 'Piperacillin', 'QJ01A01', true, 'Injektionslösung', true),

-- Cephalosporins (QJ01B)
(gen_random_uuid(), 'Ceftiofur', 'Ceftiofur', 'QJ01B01', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Cefovecin', 'Cefovecin', 'QJ01B01', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Cefquinome', 'Cefquinom', 'QJ01B01', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Ceftizone', 'Ceftizon', 'QJ01B01', true, 'Injektionslösung', true),

-- Tetracyclines (QJ01C)
(gen_random_uuid(), 'Oxytetracycline', 'Oxytetracyclin', 'QJ01C01', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Doxycycline', 'Doxycyclin', 'QJ01C02', true, 'Tabletten', true),
(gen_random_uuid(), 'Chlortetracycline', 'Chlortetracyclin', 'QJ01C01', true, 'Pulver', true),

-- Aminoglycosides (QJ01D)
(gen_random_uuid(), 'Gentamicin', 'Gentamicin', 'QJ01D01', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Amikacin', 'Amikacin', 'QJ01D01', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Neomycin', 'Neomycin', 'QJ01D01', true, 'Salbe', true),
(gen_random_uuid(), 'Streptomycin', 'Streptomycin', 'QJ01D01', true, 'Injektionslösung', true),

-- Macrolides / Lincosamides (QJ01E / QJ01F)
(gen_random_uuid(), 'Tylosin', 'Tylosin', 'QJ01E01', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Tulathromycin', 'Tulathromycin', 'QJ01E01', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Tilmicosin', 'Tilmicosin', 'QJ01E01', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Lincomycin', 'Lincomycin', 'QJ01F01', true, 'Injektionslösung', true),

-- Fluoroquinolones (QJ01G)
(gen_random_uuid(), 'Enrofloxacin', 'Enrofloxacin', 'QJ01G01', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Marbofloxacin', 'Marbofloxacin', 'QJ01G01', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Florfenicol', 'Florfenicol', 'QJ01G01', true, 'Injektionslösung', true);
