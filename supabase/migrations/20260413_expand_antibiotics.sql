-- ============================================================================
-- EXTENDED ANTIBIOTICS SEED DATA
-- Targets ~50 total antibiotic medications for production testing
-- ============================================================================

INSERT INTO public.medikamente (name, active_ingredient, category, dosage_form, unit)
VALUES 
-- Penicillins (Beta-lactams)
('Amoxicillin', 'Amoxicillin', '{"antibiotic", "penicillin"}', 'tablet', 'mg'),
('Amoxicillin/Clavulanate', 'Amoxicillin + Clavulanate', '{"antibiotic", "penicillin"}', 'tablet', 'mg'),
('Ampicillin', 'Ampicillin', '{"antibiotic", "penicillin"}', 'injection', 'ml'),
('Penicillin G', 'Benzylpenicillin', '{"antibiotic", "penicillin"}', 'injection', 'ml'),
('Ticarcillin', 'Ticarcillin', '{"antibiotic", "penicillin"}', 'injection', 'ml'),

-- Cephalosporins
('Cefalexin', 'Cefalexin', '{"antibiotic", "cephalosporin"}', 'tablet', 'mg'),
('Ceftriaxone', 'Ceftriaxone', '{"antibiotic", "cephalosporin"}', 'injection', 'mg'),
('Cefovecin', 'Cefovecin', '{"antibiotic", "cephalosporin"}', 'injection', 'ml'),
('Cephapirin', 'Cephapirin', '{"antibiotic", "cephalosporin"}', 'injection', 'ml'),
('Cefquinome', 'Cefquinome', '{"antibiotic", "cephalosporin"}', 'injection', 'ml'),
('Cefotaxime', 'Cefotaxime', '{"antibiotic", "cephalosporin"}', 'injection', 'mg'),

-- Tetracyclines
('Doxycycline', 'Doxycycline', '{"antibiotic", "tetracycline"}', 'tablet', 'mg'),
('Oxytetracycline', 'Oxytetracycline', '{"antibiotic", "tetracycline"}', 'injection', 'ml'),
('Tetracycline', 'Tetracycline', '{"antibiotic", "tetracycline"}', 'tablet', 'mg'),
('Minocycline', 'Minocycline', '{"antibiotic", "tetracycline"}', 'tablet', 'mg'),

-- Aminoglycosides
('Gentamicin', 'Gentamicin', '{"antibiotic", "aminoglycoside"}', 'injection', 'ml'),
('Amikacin', 'Amikacin', '{"antibiotic", "aminoglycoside"}', 'injection', 'ml'),
('Neomycin', 'Neomycin', '{"antibiotic", "aminoglycoside"}', 'ointment', 'g'),
('Tobramycin', 'Tobramycin', '{"antibiotic", "aminoglycoside"}', 'injection', 'ml'),
('Kanamycin', 'Kanamycin', '{"antibiotic", "aminoglycoside"}', 'injection', 'ml'),

-- Macrolides & Lincosamides
('Clarithromycin', 'Clarithromycin', '{"antibiotic", "macrolide"}', 'tablet', 'mg'),
('Azithromycin', 'Azithromycin', '{"antibiotic", "macrolide"}', 'tablet', 'mg'),
('Erythromycin', 'Erythromycin', '{"antibiotic", "macrolide"}', 'tablet', 'mg'),
('Tylosin', 'Tylosin', '{"antibiotic", "macrolide"}', 'injection', 'ml'),
('Clindamycin', 'Clindamycin', '{"antibiotic", "lincosamide"}', 'injection', 'ml'),
('Lincomycin', 'Lincomycin', '{"antibiotic", "lincosamide"}', 'injection', 'ml'),

-- Fluoroquinolones
('Enrofloxacin', 'Enrofloxacin', '{"antibiotic", "fluoroquinolone"}', 'injection', 'ml'),
('Marbofloxacin', 'Marbofloxacin', '{"antibiotic", "fluoroquinolone"}', 'tablet', 'mg'),
('Pradofloxacin', 'Pradofloxacin', '{"antibiotic", "fluoroquinolone"}', 'injection', 'ml'),
('Ciprofloxacin', 'Ciprofloxacin', '{"antibiotic", "fluoroquinolone"}', 'tablet', 'mg'),
('Norfloxacin', 'Norfloxacin', '{"antibiotic", "fluoroquinolone"}', 'tablet', 'mg'),

-- Sulfonamides & Trimethoprim
('Trimethoprim-Sulfadiazine', 'Trimethoprim + Sulfadiazine', '{"antibiotic", "sulfonamide"}', 'tablet', 'mg'),
('Sulfamethizine', 'Sulfamethizine', '{"antibiotic", "sulfonamide"}', 'injection', 'ml'),
('Sulfadiazine', 'Sulfadiazine', '{"antibiotic", "sulfonamide"}', 'tablet', 'mg'),
('Sulfadoxine', 'Sulfadoxine', '{"antibiotic", "sulfonamide"}', 'injection', 'ml'),

-- Other/Miscellaneous
('Metronidazole', 'Metronidazole', '{"antibiotic", "nitroimidazole"}', 'tablet', 'mg'),
('Chloramphenicol', 'Chloramphenicol', '{"antibiotic", "phenicol"}', 'injection', 'ml'),
('Fusidic Acid', 'Fusidic Acid', '{"antibiotic", "other"}', 'ointment', 'g'),
('Neomycin/Bacitracin', 'Neomycin + Bacitracin', '{"antibiotic", "other"}', 'ointment', 'g'),
('Trimethoprim', 'Trimethoprim', '{"antibiotic", "other"}', 'tablet', 'mg'),

-- Common Veterinary Brands (Placeholders)
('Synulon', 'Tetracycline', '{"antibiotic", "tetracycline"}', 'injection', 'ml'),
('Convenia', 'Cefovecin', '{"antibiotic", 'cephalosporin'}', 'injection', 'ml'),
('Clavamox', 'Amoxicillin + Clavulanate', '{"antibiotic", 'penicillin'}', 'tablet', 'mg'),
('Baytril', 'Enrofloxacin', '{"antibiotic", 'fluoroquinolone'}', 'injection', 'ml'),
('Senza', 'Ceftriaxone', '{"antibiotic", 'cephalosporin'}', 'injection', 'mg'),
('Tylan', 'Tylosin', '{"antibiotic", 'macrolide'}', 'injection', 'ml'),
('Marbocil', 'Marbofloxacin', '{"antibiotic", 'fluoroquinolone'}', 'tablet', 'mg'),
('Amezin', 'Amoxicillin', '{"antibiotic", 'penicillin'}', 'tablet', 'mg'),
('Cefovet', 'Cefovecin', '{"antibiotic", 'cephalosporin'}', 'injection', 'ml'),
('Gentacin', 'Gentamicin', '{"antibiotic", 'aminoglycoside'}', 'injection', 'ml');
