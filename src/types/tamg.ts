// TAMG (Antibiotikaverbrauchsmengenerfassung) Types
// German veterinary antibiotic usage tracking for BVL compliance

// Animal species categories for TAMG reporting stages
export type TamgAnimalCategory =
  // Stage 1 (since 2023)
  | 'cattle'      // Rinder
  | 'pigs'        // Schweine
  | 'chickens'    // Hühner
  | 'turkeys'     // Puten
  // Stage 2 (from 2026)
  | 'ducks'       // Enten
  | 'geese'       // Gänse
  | 'sheep'       // Schafe
  | 'goats'       // Ziegen
  | 'fish'        // Fische
  | 'horses'      // Pferde
  | 'rabbits'     // Kaninchen
  // Stage 3 (from 2029, but required in Germany from 2025)
  | 'dogs'        // Hunde
  | 'cats'        // Katzen
  // Other
  | 'other';      // Sonstige

export const TAMG_ANIMAL_CATEGORIES: Record<TamgAnimalCategory, { de: string; en: string; stage: number }> = {
  cattle: { de: 'Rinder', en: 'Cattle', stage: 1 },
  pigs: { de: 'Schweine', en: 'Pigs', stage: 1 },
  chickens: { de: 'Hühner', en: 'Chickens', stage: 1 },
  turkeys: { de: 'Puten', en: 'Turkeys', stage: 1 },
  ducks: { de: 'Enten', en: 'Ducks', stage: 2 },
  geese: { de: 'Gänse', en: 'Geese', stage: 2 },
  sheep: { de: 'Schafe', en: 'Sheep', stage: 2 },
  goats: { de: 'Ziegen', en: 'Goats', stage: 2 },
  fish: { de: 'Fische', en: 'Fish', stage: 2 },
  horses: { de: 'Pferde', en: 'Horses', stage: 2 },
  rabbits: { de: 'Kaninchen', en: 'Rabbits', stage: 2 },
  dogs: { de: 'Hunde', en: 'Dogs', stage: 3 },
  cats: { de: 'Katzen', en: 'Cats', stage: 3 },
  other: { de: 'Sonstige', en: 'Other', stage: 0 },
};

// Antibiotic substance classes for categorization
export type AntibioticClass =
  | 'penicillins'
  | 'cephalosporins'
  | 'aminoglycosides'
  | 'macrolides'
  | 'tetracyclines'
  | 'fluoroquinolones'
  | 'sulfonamides'
  | 'trimethoprim'
  | 'lincosamides'
  | 'pleuromutilins'
  | 'amphenicols'
  | 'glycopeptides'
  | 'polymyxins'
  | 'other';

export const ANTIBIOTIC_CLASSES: Record<AntibioticClass, { de: string; en: string }> = {
  penicillins: { de: 'Penicilline', en: 'Penicillins' },
  cephalosporins: { de: 'Cephalosporine', en: 'Cephalosporins' },
  aminoglycosides: { de: 'Aminoglykoside', en: 'Aminoglycosides' },
  macrolides: { de: 'Makrolide', en: 'Macrolides' },
  tetracyclines: { de: 'Tetracycline', en: 'Tetracyclines' },
  fluoroquinolones: { de: 'Fluorchinolone', en: 'Fluoroquinolones' },
  sulfonamides: { de: 'Sulfonamide', en: 'Sulfonamides' },
  trimethoprim: { de: 'Trimethoprim', en: 'Trimethoprim' },
  lincosamides: { de: 'Lincosamide', en: 'Lincosamides' },
  pleuromutilins: { de: 'Pleuromutiline', en: 'Pleuromutilins' },
  amphenicols: { de: 'Amphenicole', en: 'Amphenicols' },
  glycopeptides: { de: 'Glykopeptide', en: 'Glycopeptides' },
  polymyxins: { de: 'Polymyxine', en: 'Polymyxins' },
  other: { de: 'Sonstige', en: 'Other' },
};

// Route of administration
export type AdministrationRoute =
  | 'oral'
  | 'intravenous'
  | 'intramuscular'
  | 'subcutaneous'
  | 'topical'
  | 'intramammary'
  | 'intrauterine'
  | 'inhalation'
  | 'other';

export const ADMINISTRATION_ROUTES: Record<AdministrationRoute, { de: string; en: string }> = {
  oral: { de: 'Oral', en: 'Oral' },
  intravenous: { de: 'Intravenös', en: 'Intravenous' },
  intramuscular: { de: 'Intramuskulär', en: 'Intramuscular' },
  subcutaneous: { de: 'Subkutan', en: 'Subcutaneous' },
  topical: { de: 'Topisch/Lokal', en: 'Topical' },
  intramammary: { de: 'Intramammär', en: 'Intramammary' },
  intrauterine: { de: 'Intrauterin', en: 'Intrauterine' },
  inhalation: { de: 'Inhalation', en: 'Inhalation' },
  other: { de: 'Sonstige', en: 'Other' },
};

// Prescription type
export type PrescriptionType = 'therapeutic' | 'prophylactic' | 'metaphylactic';

export const PRESCRIPTION_TYPES: Record<PrescriptionType, { de: string; en: string }> = {
  therapeutic: { de: 'Therapeutisch', en: 'Therapeutic' },
  prophylactic: { de: 'Prophylaktisch', en: 'Prophylactic' },
  metaphylactic: { de: 'Metaphylaktisch', en: 'Metaphylactic' },
};

// Antibiotic prescription record
export interface AntibioticPrescription {
  id: string;
  praxis_id: string;
  patient_id: string | null;
  behandlung_id: string | null;
  
  // Drug information
  drug_name: string;
  active_substance: string;
  antibiotic_class: AntibioticClass;
  atc_code: string | null;
  marketing_authorisation_number: string | null;
  package_id: string | null;
  batch_number: string | null;
  
  // Quantity and dosing
  amount_prescribed: number;
  unit: string;
  active_substance_amount_mg: number | null;
  concentration: string | null;
  
  // Animal information
  animal_species: TamgAnimalCategory;
  animal_species_detail: string | null;
  animal_count: number;
  animal_weight_kg: number | null;
  total_animal_weight_kg: number | null;
  age_category: string | null;
  
  // Treatment details
  diagnosis: string | null;
  diagnosis_code: string | null;
  indication: string | null;
  route_of_administration: AdministrationRoute | null;
  treatment_duration_days: number | null;
  daily_dose_mg: number | null;
  
  // Prescription details
  prescription_date: string;
  prescribed_by: string | null;
  prescription_type: PrescriptionType;
  
  // Reporting status
  reported_to_bvl: boolean;
  reported_at: string | null;
  report_batch_id: string | null;
  
  // Metadata
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

// Antibiotic drug reference
export interface AntibioticDrug {
  id: string;
  drug_name: string;
  active_substance: string;
  antibiotic_class: AntibioticClass;
  atc_code: string | null;
  marketing_authorisation_number: string | null;
  package_id: string | null;
  package_description: string | null;
  manufacturer: string | null;
  dosage_form: string | null;
  concentration: string | null;
  approved_species: TamgAnimalCategory[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// TAMG export batch
export interface TamgExportBatch {
  id: string;
  praxis_id: string;
  export_date: string;
  period_start: string;
  period_end: string;
  format: 'csv' | 'xml';
  file_path: string | null;
  records_count: number;
  total_amount_mg: number;
  status: 'pending' | 'completed' | 'submitted';
  submitted_at: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

// Practice TAMG settings
export interface TamgPracticeSettings {
  id: string;
  praxis_id: string;
  bvl_betriebsnummer: string | null;
  hi_tier_user_id: string | null;
  auto_export_enabled: boolean;
  export_interval_days: number;
  default_prescription_type: string;
  high_usage_threshold: number | null;
  alert_email: string | null;
  created_at: string;
  updated_at: string;
}

// Monthly usage summary
export interface MonthlyUsageSummary {
  antibiotic_class: AntibioticClass;
  drug_name: string;
  active_substance: string;
  prescription_count: number;
  total_amount: number;
  total_animals: number;
  species_breakdown: Array<{
    species: TamgAnimalCategory;
    count: number;
    amount: number;
  }>;
}

// Therapy frequency (for benchmarking)
export interface TherapyFrequency {
  animal_species: TamgAnimalCategory;
  antibiotic_class: AntibioticClass;
  total_prescriptions: number;
  total_animals_treated: number;
  total_substance_mg: number;
  therapy_frequency: number;
}

// BVL Export format (CSV structure)
export interface BvlExportRecord {
  // Basic identification
  report_id: string;
  reporting_period: string;
  practice_id: string;
  
  // Drug information
  drug_name: string;
  active_substance: string;
  atc_code: string;
  package_id: string;
  
  // Quantity
  amount_prescribed: number;
  unit: string;
  active_substance_amount_mg: number;
  
  // Animal information
  animal_species: string;
  animal_species_code: string;
  animal_count: number;
  total_weight_kg: number;
  
  // Treatment
  prescription_date: string;
  diagnosis: string;
  prescription_type: string;
  
  // Reporting metadata
  created_at: string;
}