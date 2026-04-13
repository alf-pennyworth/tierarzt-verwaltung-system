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
(gen_random_uuid(), 'Florfenicol', 'Florfenicol', 'QJ01G01', true, 'Injektionslösung', true),

-- Sulfonamides (QJ01E/QJ01Q)
(gen_random_uuid(), 'Sulfadiazin/Trimethoprim', 'Sulfadiazin/Trimethoprim', 'QJ01E01', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Sulfadimethoxin', 'Sulfadimethoxin', 'QJ01E02', true, 'Tabletten', true),
(gen_random_uuid(), 'Sulfadoxin/Trimethoprim', 'Sulfadoxin/Trimethoprim', 'QJ01E01', true, 'Injektionslösung', true),

-- Polypeptides (QJ01X)
(gen_random_uuid(), 'Colistin', 'Colistin', 'QJ01X01', true, 'Oralpulver', true),
(gen_random_uuid(), 'Bacitracin', 'Bacitracin', 'QJ01X02', true, 'Salbe', true),

-- Nitroimidazoles (QJ01XW)
(gen_random_uuid(), 'Metronidazol', 'Metronidazol', 'QJ01XW01', true, 'Tabletten', true),
(gen_random_uuid(), 'Ronidazol', 'Ronidazol', 'QJ01XW02', true, 'Pulver', true),

-- Nitrofuranes
(gen_random_uuid(), 'Nitrofurantoin', 'Nitrofurantoin', 'QJ01X02', true, 'Tabletten', true),

-- Others (QJ01X)
(gen_random_uuid(), 'Rifampicin', 'Rifampicin', 'QJ04A', true, 'Kapseln', true),
(gen_random_uuid(), 'Spiramycin', 'Spiramycin', 'QJ01E02', true, 'Tabletten', true),
(gen_random_uuid(), 'Josamycin', 'Josamycin', 'QJ01F01', true, 'Tabletten', true),

-- Combination antibiotics
(gen_random_uuid(), 'Amoxicillin/Sulbactam', 'Amoxicillin/Sulbactam', 'QJ01A03', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Penicillin/Streptomycin', 'Penicillin/Streptomycin', 'QJ01A01', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Tylosin/Sulfadimethoxin', 'Tylosin/Sulfadimethoxin', 'QJ01E01', true, 'Pulver', true),

-- Additional common German veterinary antibiotics
(gen_random_uuid(), 'Cefalexin', 'Cefalexin', 'QJ01B02', true, 'Tabletten', true),
(gen_random_uuid(), 'Cefapirin', 'Cefapirin', 'QJ01B01', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Danofloxacin', 'Danofloxacin', 'QJ01G01', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Difloxacin', 'Difloxacin', 'QJ01G01', true, 'Tabletten', true),
(gen_random_uuid(), 'Orbifloxacin', 'Orbifloxacin', 'QJ01G01', true, 'Tabletten', true),
(gen_random_uuid(), 'Spectinomycin', 'Spectinomycin', 'QJ01X03', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Tiamulin', 'Tiamulin', 'QJ01X04', true, 'Pulver', true),
(gen_random_uuid(), 'Valnemulin', 'Valnemulin', 'QJ01X04', true, 'Pulver', true),
(gen_random_uuid(), 'Thiamphenicol', 'Thiamphenicol', 'QJ01G01', true, 'Injektionslösung', true),
(gen_random_uuid(), 'Clindamycin', 'Clindamycin', 'QJ01F01', true, 'Tabletten', true),
(gen_random_uuid(), 'Erythromycin', 'Erythromycin', 'QJ01E01', true, 'Tabletten', true),
(gen_random_uuid(), 'Azithromycin', 'Azithromycin', 'QJ01E01', true, 'Tabletten', true),
(gen_random_uuid(), 'Claritromycin', 'Clarithromycin', 'QJ01E01', true, 'Tabletten', true),

-- Topical antibiotics
(gen_random_uuid(), 'Bacitracin/Zink', 'Bacitracin/Zink', 'QJ01X02', true, 'Salbe', true),
(gen_random_uuid(), 'Fusidinsäure', 'Fusidinsäure', 'QJ01X05', true, 'Salbe', true),
(gen_random_uuid(), 'Mupirocin', 'Mupirocin', 'QJ01X06', true, 'Salbe', true),
(gen_random_uuid(), 'Polymyxin B', 'Polymyxin B', 'QJ01X01', true, 'Salbe', true),
(gen_random_uuid(), 'Tobramycin', 'Tobramycin', 'QJ01D01', true, 'Augentropfen', true),
(gen_random_uuid(), 'Chloramphenicol', 'Chloramphenicol', 'QJ01C01', true, 'Augentropfen', true);
