import { supabase } from '@/integrations/supabase/client';
import type {
  AntibioticPrescription,
  AntibioticDrug,
  TamgExportBatch,
  TamgPracticeSettings,
  MonthlyUsageSummary,
  TherapyFrequency,
  TamgAnimalCategory,
  AntibioticClass,
  BvlExportRecord,
} from '@/types/tamg';

/**
 * TAMG (Antibiotikaverbrauchsmengenerfassung) Service
 * Handles antibiotic prescription tracking and BVL reporting compliance
 */

// ============================================
// Antibiotic Prescriptions
// ============================================

export interface CreatePrescriptionInput {
  patient_id?: string;
  behandlung_id?: string;
  drug_name: string;
  active_substance: string;
  antibiotic_class: AntibioticClass;
  atc_code?: string;
  marketing_authorisation_number?: string;
  package_id?: string;
  batch_number?: string;
  amount_prescribed: number;
  unit: string;
  active_substance_amount_mg?: number;
  concentration?: string;
  animal_species: TamgAnimalCategory;
  animal_species_detail?: string;
  animal_count: number;
  animal_weight_kg?: number;
  age_category?: string;
  diagnosis?: string;
  diagnosis_code?: string;
  indication?: string;
  route_of_administration?: string;
  treatment_duration_days?: number;
  daily_dose_mg?: number;
  prescription_date: string;
  prescription_type?: 'therapeutic' | 'prophylactic' | 'metaphylactic';
  notes?: string;
}

/**
 * Create a new antibiotic prescription record
 */
export async function createPrescription(
  praxisId: string,
  userId: string,
  input: CreatePrescriptionInput
): Promise<AntibioticPrescription> {
  // Calculate total weight if animal weight is provided
  const totalWeight = input.animal_weight_kg
    ? input.animal_weight_kg * input.animal_count
    : null;

  const { data, error } = await supabase
    .from('antibiotic_prescriptions')
    .insert({
      praxis_id: praxisId,
      created_by: userId,
      ...input,
      total_animal_weight_kg: totalWeight,
      prescription_type: input.prescription_type || 'therapeutic',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get prescriptions for a practice with filtering
 */
export interface GetPrescriptionsFilters {
  patient_id?: string;
  animal_species?: TamgAnimalCategory;
  antibiotic_class?: AntibioticClass;
  date_from?: string;
  date_to?: string;
  reported?: boolean;
}

export async function getPrescriptions(
  praxisId: string,
  filters?: GetPrescriptionsFilters
): Promise<AntibioticPrescription[]> {
  let query = supabase
    .from('antibiotic_prescriptions')
    .select('*')
    .eq('praxis_id', praxisId)
    .is('deleted_at', null)
    .order('prescription_date', { ascending: false });

  if (filters?.patient_id) {
    query = query.eq('patient_id', filters.patient_id);
  }
  if (filters?.animal_species) {
    query = query.eq('animal_species', filters.animal_species);
  }
  if (filters?.antibiotic_class) {
    query = query.eq('antibiotic_class', filters.antibiotic_class);
  }
  if (filters?.date_from) {
    query = query.gte('prescription_date', filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte('prescription_date', filters.date_to);
  }
  if (filters?.reported !== undefined) {
    query = query.eq('reported_to_bvl', filters.reported);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Get a single prescription by ID
 */
export async function getPrescriptionById(id: string): Promise<AntibioticPrescription | null> {
  const { data, error } = await supabase
    .from('antibiotic_prescriptions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Update a prescription
 */
export async function updatePrescription(
  id: string,
  updates: Partial<CreatePrescriptionInput>
): Promise<AntibioticPrescription> {
  const { data, error } = await supabase
    .from('antibiotic_prescriptions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Soft delete a prescription
 */
export async function deletePrescription(id: string): Promise<void> {
  const { error } = await supabase
    .from('antibiotic_prescriptions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// Antibiotic Drug Reference
// ============================================

/**
 * Search antibiotic drugs for autocomplete
 */
export async function searchAntibioticDrugs(
  searchTerm: string,
  species?: TamgAnimalCategory
): Promise<AntibioticDrug[]> {
  let query = supabase
    .from('antibiotic_drugs')
    .select('*')
    .eq('is_active', true)
    .or(`drug_name.ilike.%${searchTerm}%,active_substance.ilike.%${searchTerm}%`)
    .limit(20);

  const { data, error } = await query;
  if (error) throw error;

  // Filter by approved species if provided
  if (species) {
    return data.filter(drug => 
      !drug.approved_species || drug.approved_species.includes(species)
    );
  }

  return data;
}

/**
 * Get all antibiotic drugs
 */
export async function getAllAntibioticDrugs(): Promise<AntibioticDrug[]> {
  const { data, error } = await supabase
    .from('antibiotic_drugs')
    .select('*')
    .eq('is_active', true)
    .order('drug_name');

  if (error) throw error;
  return data;
}

/**
 * Get antibiotic class statistics for a practice
 */
export async function getAntibioticClassStats(
  praxisId: string,
  year: number,
  month?: number
): Promise<Array<{ antibiotic_class: AntibioticClass; count: number; total_amount: number }>> {
  let query = supabase
    .from('antibiotic_prescriptions')
    .select('antibiotic_class, amount_prescribed')
    .eq('praxis_id', praxisId)
    .is('deleted_at', null);

  if (month !== undefined) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    query = query.gte('prescription_date', startDate).lte('prescription_date', endDate);
  } else {
    query = query.gte('prescription_date', `${year}-01-01`).lte('prescription_date', `${year}-12-31`);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Aggregate by class
  const stats = new Map<AntibioticClass, { count: number; total_amount: number }>();
  
  for (const row of data) {
    const existing = stats.get(row.antibiotic_class) || { count: 0, total_amount: 0 };
    existing.count += 1;
    existing.total_amount += row.amount_prescribed;
    stats.set(row.antibiotic_class, existing);
  }

  return Array.from(stats.entries()).map(([antibiotic_class, { count, total_amount }]) => ({
    antibiotic_class,
    count,
    total_amount,
  }));
}

// ============================================
// Monthly Usage & Analytics
// ============================================

/**
 * Get monthly usage summary
 */
export async function getMonthlyUsage(
  praxisId: string,
  year: number,
  month: number
): Promise<MonthlyUsageSummary[]> {
  const { data, error } = await supabase.rpc('get_monthly_antibiotic_usage', {
    p_praxis_id: praxisId,
    p_year: year,
    p_month: month,
  });

  if (error) throw error;
  return data;
}

/**
 * Calculate therapy frequency for benchmarking
 */
export async function getTherapyFrequency(
  praxisId: string,
  periodStart: string,
  periodEnd: string
): Promise<TherapyFrequency[]> {
  const { data, error } = await supabase.rpc('calculate_therapy_frequency', {
    p_praxis_id: praxisId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
  });

  if (error) throw error;
  return data;
}

/**
 * Get usage trends over time
 */
export async function getUsageTrends(
  praxisId: string,
  months: number = 12
): Promise<Array<{ month: string; prescriptions: number; total_animals: number }>> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  const { data, error } = await supabase
    .from('antibiotic_prescriptions')
    .select('prescription_date, animal_count')
    .eq('praxis_id', praxisId)
    .is('deleted_at', null)
    .gte('prescription_date', startDate.toISOString().split('T')[0]);

  if (error) throw error;

  // Aggregate by month
  const monthlyData = new Map<string, { prescriptions: number; total_animals: number }>();
  
  for (const row of data) {
    const month = row.prescription_date.substring(0, 7); // YYYY-MM
    const existing = monthlyData.get(month) || { prescriptions: 0, total_animals: 0 };
    existing.prescriptions += 1;
    existing.total_animals += row.animal_count;
    monthlyData.set(month, existing);
  }

  return Array.from(monthlyData.entries())
    .map(([month, stats]) => ({
      month,
      ...stats,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

// ============================================
// BVL Export Functions
// ============================================

/**
 * Generate CSV export for BVL reporting
 */
export function generateBvlCsv(prescriptions: AntibioticPrescription[]): string {
  const headers = [
    'Berichtszeitraum',
    'Betriebsnummer',
    'Arzneimittelname',
    'Wirkstoff',
    'ATC-Code',
    'Packungs-ID',
    'Menge',
    'Einheit',
    'Wirkstoffmenge (mg)',
    'Tierart',
    'Anzahl Tiere',
    'Gesamtgewicht (kg)',
    'Behandlungsdatum',
    'Diagnose',
    'Verordnungstyp',
    'Erstellt am',
  ];

  const rows = prescriptions.map(p => [
    p.prescription_date.substring(0, 7), // YYYY-MM
    '', // Betriebsnummer will be filled from settings
    p.drug_name,
    p.active_substance,
    p.atc_code || '',
    p.package_id || '',
    p.amount_prescribed.toString(),
    p.unit,
    p.active_substance_amount_mg?.toString() || '',
    p.animal_species,
    p.animal_count.toString(),
    p.total_animal_weight_kg?.toString() || '',
    p.prescription_date,
    p.diagnosis || '',
    p.prescription_type,
    p.created_at,
  ]);

  return [
    headers.join(';'),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(';')),
  ].join('\n');
}

/**
 * Generate XML export for BVL reporting (HI-Tier format)
 */
export function generateBvlXml(
  prescriptions: AntibioticPrescription[],
  practiceSettings: TamgPracticeSettings
): string {
  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<TAMG_Meldung xmlns="http://www.bvl.bund.de/tamg">
  <Betriebsdaten>
    <Betriebsnummer>${practiceSettings.bvl_betriebsnummer || ''}</Betriebsnummer>
    <HI_Tier_User_ID>${practiceSettings.hi_tier_user_id || ''}</HI_Tier_User_ID>
  </Betriebsdaten>
  <Arzneimittelverwendungen>`;

  const xmlEntries = prescriptions.map(p => `
    <Verwendung>
      <Arzneimittel>
        <Handelsname>${escapeXml(p.drug_name)}</Handelsname>
        <Wirkstoff>${escapeXml(p.active_substance)}</Wirkstoff>
        <ATC_Code>${p.atc_code || ''}</ATC_Code>
        <Packungs_ID>${p.package_id || ''}</Packungs_ID>
        <Zulassungsnummer>${p.marketing_authorisation_number || ''}</Zulassungsnummer>
      </Arzneimittel>
      <Menge>
        <Wert>${p.amount_prescribed}</Wert>
        <Einheit>${p.unit}</Einheit>
        <Wirkstoffmenge_mg>${p.active_substance_amount_mg || 0}</Wirkstoffmenge_mg>
      </Menge>
      <Tierdaten>
        <Tierart>${p.animal_species}</Tierart>
        <Tierart_Detail>${p.animal_species_detail || ''}</Tierart_Detail>
        <Anzahl>${p.animal_count}</Anzahl>
        <Gewicht_kg>${p.animal_weight_kg || 0}</Gewicht_kg>
        <Gesamtgewicht_kg>${p.total_animal_weight_kg || 0}</Gesamtgewicht_kg>
        <Alterskategorie>${p.age_category || ''}</Alterskategorie>
      </Tierdaten>
      <Behandlung>
        <Datum>${p.prescription_date}</Datum>
        <Diagnose>${escapeXml(p.diagnosis || '')}</Diagnose>
        <Diagnose_Code>${p.diagnosis_code || ''}</Diagnose_Code>
        <Indikation>${escapeXml(p.indication || '')}</Indikation>
        <Applikationsart>${p.route_of_administration || ''}</Applikationsart>
        <Behandlungsdauer_Tage>${p.treatment_duration_days || ''}</Behandlungsdauer_Tage>
        <Tagesdosis_mg>${p.daily_dose_mg || ''}</Tagesdosis_mg>
        <Verordnungstyp>${p.prescription_type}</Verordnungstyp>
      </Behandlung>
    </Verwendung>`).join('');

  const xmlFooter = `
  </Arzneimittelverwendungen>
</TAMG_Meldung>`;

  return xmlHeader + xmlEntries + xmlFooter;
}

/**
 * Create an export batch record
 */
export async function createExportBatch(
  praxisId: string,
  userId: string,
  periodStart: string,
  periodEnd: string,
  format: 'csv' | 'xml'
): Promise<TamgExportBatch> {
  const { data, error } = await supabase
    .from('tamg_export_batches')
    .insert({
      praxis_id: praxisId,
      created_by: userId,
      period_start: periodStart,
      period_end: periodEnd,
      format,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark prescriptions as reported
 */
export async function markPrescriptionsAsReported(
  prescriptionIds: string[],
  batchId: string
): Promise<void> {
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('antibiotic_prescriptions')
    .update({
      reported_to_bvl: true,
      reported_at: now,
      report_batch_id: batchId,
    })
    .in('id', prescriptionIds);

  if (error) throw error;
}

/**
 * Get unreported prescriptions
 */
export async function getUnreportedPrescriptions(
  praxisId: string
): Promise<AntibioticPrescription[]> {
  const { data, error } = await supabase
    .from('antibiotic_prescriptions')
    .select('*')
    .eq('praxis_id', praxisId)
    .eq('reported_to_bvl', false)
    .is('deleted_at', null)
    .order('prescription_date', { ascending: true });

  if (error) throw error;
  return data;
}

// ============================================
// Practice Settings
// ============================================

/**
 * Get TAMG settings for a practice
 */
export async function getPracticeSettings(
  praxisId: string
): Promise<TamgPracticeSettings | null> {
  const { data, error } = await supabase
    .from('tamg_practice_settings')
    .select('*')
    .eq('praxis_id', praxisId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Create or update practice TAMG settings
 */
export async function upsertPracticeSettings(
  praxisId: string,
  settings: Partial<Omit<TamgPracticeSettings, 'id' | 'praxis_id' | 'created_at' | 'updated_at'>>
): Promise<TamgPracticeSettings> {
  const { data, error } = await supabase
    .from('tamg_practice_settings')
    .upsert({
      praxis_id: praxisId,
      ...settings,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Calculate active substance amount from concentration
 */
export function calculateActiveSubstanceAmount(
  amountPrescribed: number,
  concentration: string | undefined | null
): number | null {
  if (!concentration) return null;
  
  // Parse concentration like "100 mg/ml" or "50 mg/tablet"
  const match = concentration.match(/^(\d+(?:\.\d+)?)\s*mg\s*\/\s*(ml|tablet|g)$/i);
  if (!match) return null;
  
  const [, amount, unit] = match;
  const concentrationValue = parseFloat(amount);
  
  if (unit.toLowerCase() === 'ml' || unit.toLowerCase() === 'g') {
    // For liquid: amount_prescribed is in ml/g
    return amountPrescribed * concentrationValue;
  } else if (unit.toLowerCase() === 'tablet') {
    // For tablets: amount_prescribed is number of tablets
    return amountPrescribed * concentrationValue;
  }
  
  return null;
}

/**
 * Get German name for animal species
 */
export function getAnimalSpeciesName(species: TamgAnimalCategory): string {
  const names: Record<TamgAnimalCategory, string> = {
    cattle: 'Rinder',
    pigs: 'Schweine',
    chickens: 'Hühner',
    turkeys: 'Puten',
    ducks: 'Enten',
    geese: 'Gänse',
    sheep: 'Schafe',
    goats: 'Ziegen',
    fish: 'Fische',
    horses: 'Pferde',
    rabbits: 'Kaninchen',
    dogs: 'Hunde',
    cats: 'Katzen',
    other: 'Sonstige',
  };
  return names[species];
}

/**
 * Get German name for antibiotic class
 */
export function getAntibioticClassName(antibioticClass: AntibioticClass): string {
  const names: Record<AntibioticClass, string> = {
    penicillins: 'Penicilline',
    cephalosporins: 'Cephalosporine',
    aminoglycosides: 'Aminoglykoside',
    macrolides: 'Makrolide',
    tetracyclines: 'Tetracycline',
    fluoroquinolones: 'Fluorchinolone',
    sulfonamides: 'Sulfonamide',
    trimethoprim: 'Trimethoprim',
    lincosamides: 'Lincosamide',
    pleuromutilins: 'Pleuromutiline',
    amphenicols: 'Amphenicole',
    glycopeptides: 'Glykopeptide',
    polymyxins: 'Polymyxine',
    other: 'Sonstige',
  };
  return names[antibioticClass];
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}