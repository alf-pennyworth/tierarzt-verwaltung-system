-- ============================================================================
-- CORRECTED ANTIBIOTICS SEED DATA
-- Matches actual medikamente table schema
-- ============================================================================

-- First, ensure we have a default praxis for seed data
-- (Assuming praxis table exists and has at least one row)

INSERT INTO public.medikamente (
    id, 
    praxis_id,
    name, 
    manufacturer, 
    dosage_form, 
    strength, 
    unit, 
    category,
    description
)
SELECT
    gen_random_uuid(),
    COALESCE((SELECT id FROM public.praxis LIMIT 1), '00000000-0000-0000-0000-000000000000'),
    drug_name,
    'Generic',
    drug_form,
    'Standard',
    'mg',
    'antibiotic',
    drug_name_de
FROM (
    VALUES
    -- Penicillins
    ('Amoxicillin', 'Amoxicillin', 'Injektionslösung'),
    ('Amoxicillin/Clavulansäure', 'Amoxicillin/Clavulansäure', 'Tabletten'),
    ('Ampicillin', 'Ampicillin', 'Injektionslösung'),
    ('Benzylpenicillin', 'Benzylpenicillin', 'Pulver'),
    ('Piperacillin', 'Piperacillin', 'Injektionslösung'),
    
    -- Cephalosporins
    ('Ceftiofur', 'Ceftiofur', 'Injektionslösung'),
    ('Cefovecin', 'Cefovecin', 'Injektionslösung'),
    ('Cefquinom', 'Cefquinom', 'Injektionslösung'),
    ('Cefalexin', 'Cefalexin', 'Tabletten'),
    ('Cefapirin', 'Cefapirin', 'Injektionslösung'),
    
    -- Tetracyclines
    ('Oxytetracyclin', 'Oxytetracyclin', 'Injektionslösung'),
    ('Doxycyclin', 'Doxycyclin', 'Tabletten'),
    ('Chlortetracyclin', 'Chlortetracyclin', 'Pulver'),
    ('Tetracyclin', 'Tetracyclin', 'Tabletten'),
    
    -- Aminoglycosides
    ('Gentamicin', 'Gentamicin', 'Injektionslösung'),
    ('Amikacin', 'Amikacin', 'Injektionslösung'),
    ('Neomycin', 'Neomycin', 'Salbe'),
    ('Tobramycin', 'Tobramycin', 'Augentropfen'),
    
    -- Macrolides/Lincosamides
    ('Tylosin', 'Tylosin', 'Injektionslösung'),
    ('Tulathromycin', 'Tulathromycin', 'Injektionslösung'),
    ('Tilmicosin', 'Tilmicosin', 'Injektionslösung'),
    ('Lincomycin', 'Lincomycin', 'Injektionslösung'),
    ('Clindamycin', 'Clindamycin', 'Tabletten'),
    ('Erythromycin', 'Erythromycin', 'Tabletten'),
    ('Azithromycin', 'Azithromycin', 'Tabletten'),
    
    -- Fluoroquinolones
    ('Enrofloxacin', 'Enrofloxacin', 'Injektionslösung'),
    ('Marbofloxacin', 'Marbofloxacin', 'Tabletten'),
    ('Danofloxacin', 'Danofloxacin', 'Injektionslösung'),
    ('Difloxacin', 'Difloxacin', 'Tabletten'),
    ('Orbifloxacin', 'Orbifloxacin', 'Tabletten'),
    
    -- Sulfonamides
    ('Sulfadiazin/Trimethoprim', 'Sulfadiazin/Trimethoprim', 'Injektionslösung'),
    ('Sulfadimethoxin', 'Sulfadimethoxin', 'Tabletten'),
    ('Sulfadoxin/Trimethoprim', 'Sulfadoxin/Trimethoprim', 'Injektionslösung'),
    
    -- Polypeptides
    ('Colistin', 'Colistin', 'Pulver'),
    ('Bacitracin', 'Bacitracin', 'Salbe'),
    ('Polymyxin B', 'Polymyxin B', 'Salbe'),
    
    -- Nitroimidazoles
    ('Metronidazol', 'Metronidazol', 'Tabletten'),
    ('Ronidazol', 'Ronidazol', 'Pulver'),
    
    -- Others
    ('Rifampicin', 'Rifampicin', 'Kapseln'),
    ('Chloramphenicol', 'Chloramphenicol', 'Augentropfen'),
    ('Florfenicol', 'Florfenicol', 'Injektionslösung'),
    ('Thiamphenicol', 'Thiamphenicol', 'Injektionslösung'),
    ('Spectinomycin', 'Spectinomycin', 'Injektionslösung'),
    ('Tiamulin', 'Tiamulin', 'Pulver'),
    ('Fusidinsäure', 'Fusidinsäure', 'Salbe'),
    ('Mupirocin', 'Mupirocin', 'Salbe'),
    
    -- Common brands
    ('Convenia (Cefovecin)', 'Convenia', 'Injektionslösung'),
    ('Clavamox (Amoxicillin/Clavulanat)', 'Clavamox', 'Tabletten'),
    ('Baytril (Enrofloxacin)', 'Baytril', 'Injektionslösung'),
    ('Synulon (Clindamycin)', 'Synulon', 'Injektionslösung'),
    ('Marbocil (Marbofloxacin)', 'Marbocil', 'Tabletten'),
    ('Tylan (Tylosin)', 'Tylan', 'Injektionslösung'),
    ('Senza (Ceftriaxone)', 'Senza', 'Injektionslösung')
) AS t(drug_name, drug_name_de, drug_form);

-- Verify insertion
SELECT COUNT(*) as antibiotics_inserted FROM public.medikamente WHERE category = 'antibiotic';