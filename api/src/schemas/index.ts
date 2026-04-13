/**
 * Zod Schemas for API Validation
 * 
 * All request/response schemas for the Vet API
 */

import { z } from 'zod';

// ============================================
// Common Schemas
// ============================================

export const UUIDSchema = z.string().uuid();
export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');
export const DateTimeSchema = z.string().datetime();

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      total_pages: z.number(),
    }),
    links: z.object({
      first: z.string().optional(),
      prev: z.string().nullable().optional(),
      self: z.string().optional(),
      next: z.string().nullable().optional(),
      last: z.string().optional(),
    }).optional(),
  });

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.object({
      field: z.string().optional(),
      message: z.string(),
    })).optional(),
  }),
  requestId: z.string(),
  timestamp: z.string(),
});

// ============================================
// Patient Schemas
// ============================================

export const SpeciesEnum = z.enum([
  'Hund',
  'Katze',
  'Pferd',
  'Kaninchen',
  'Vogel',
  'Reptil',
  'Fisch',
  'Nagetier',
  'Sonstige',
]);

export const GenderEnum = z.enum(['male', 'female', 'unknown']);

export const PatientCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  species: SpeciesEnum,
  breed: z.string().max(100).optional(),
  gender: GenderEnum.optional(),
  birth_date: DateSchema.optional(),
  owner_name: z.string().min(1, 'Owner name is required').max(200),
  owner_phone: z.string().max(50).optional(),
  owner_email: z.string().email('Invalid email').optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
});

export const PatientUpdateSchema = PatientCreateSchema.partial();

export const PatientResponseSchema = z.object({
  id: UUIDSchema,
  praxis_id: UUIDSchema,
  name: z.string(),
  species: SpeciesEnum,
  breed: z.string().nullable(),
  gender: GenderEnum.nullable(),
  birth_date: DateSchema.nullable(),
  owner_name: z.string(),
  owner_phone: z.string().nullable(),
  owner_email: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

export const PatientListSchema = PaginatedResponseSchema(PatientResponseSchema);

export const PatientQuerySchema = PaginationSchema.extend({
  species: SpeciesEnum.optional(),
  search: z.string().max(100).optional(),
});

// ============================================
// Treatment Schemas
// ============================================

export const TreatmentCreateSchema = z.object({
  patient_id: UUIDSchema,
  diagnosis: z.string().max(2000).optional(),
  treatment_date: DateSchema.default(() => new Date().toISOString().split('T')[0]),
  notes: z.string().max(5000).optional(),
  medications: z.array(z.object({
    medication_id: UUIDSchema.optional(),
    name: z.string().max(200),
    dosage: z.string().max(100).optional(),
    frequency: z.string().max(100).optional(),
    duration_days: z.number().int().min(1).optional(),
  })).optional(),
});

export const TreatmentResponseSchema = z.object({
  id: UUIDSchema,
  praxis_id: UUIDSchema,
  patient_id: UUIDSchema,
  vet_id: UUIDSchema.nullable(),
  diagnosis: z.string().nullable(),
  treatment_date: DateSchema,
  notes: z.string().nullable(),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

// ============================================
// Medication Schemas
// ============================================

export const MedicationQuerySchema = PaginationSchema.extend({
  category: z.string().max(100).optional(),
  search: z.string().max(100).optional(),
  low_stock: z.coerce.boolean().optional(),
});

export const MedicationResponseSchema = z.object({
  id: UUIDSchema,
  praxis_id: UUIDSchema,
  name: z.string(),
  manufacturer: z.string().nullable(),
  dosage_form: z.string().nullable(),
  strength: z.string().nullable(),
  unit: z.string().nullable(),
  current_stock: z.number().int().nullable(),
  minimum_stock: z.number().int().nullable(),
  unit_price: z.number().nullable(),
  expiry_date: DateSchema.nullable(),
  location: z.string().nullable(),
  sku: z.string().nullable(),
  category: z.string().nullable(),
  description: z.string().nullable(),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

export const MedicationListSchema = PaginatedResponseSchema(MedicationResponseSchema);

// ============================================
// TAMG (Antibiotic Prescription) Schemas
// ============================================

export const TreatmentPurposeEnum = z.enum(['therapy', 'prophylaxis', 'metaphylaxis']);
export const AnimalAgeCategoryEnum = z.enum(['adult', 'juvenile', 'youngstock', 'other']);
export const UnitEnum = z.enum(['mg', 'ml', 'g', 'tablet', 'capsule', 'application', 'piece']);

export const AntibioticPrescriptionCreateSchema = z.object({
  patient_id: UUIDSchema.optional(),
  treatment_id: UUIDSchema.optional(),
  drug_name: z.string().min(1, 'Drug name is required').max(200),
  drug_id: UUIDSchema.optional(),
  atc_code: z.string().max(20).optional(),
  amount: z.number().positive('Amount must be positive'),
  unit: UnitEnum,
  dosage_form: z.string().max(100).optional(),
  strength: z.string().max(100).optional(),
  animal_species: z.string().min(1, 'Animal species is required').max(100),
  animal_count: z.number().int().min(1).default(1),
  animal_age_category: AnimalAgeCategoryEnum.optional(),
  diagnosis_code: z.string().max(50).optional(),
  treatment_purpose: TreatmentPurposeEnum.default('therapy'),
  treatment_duration_days: z.number().int().min(1).optional(),
  prescribed_at: DateTimeSchema.default(() => new Date().toISOString()),
});

export const AntibioticPrescriptionResponseSchema = z.object({
  id: UUIDSchema,
  practice_id: UUIDSchema,
  patient_id: UUIDSchema.nullable(),
  treatment_id: UUIDSchema.nullable(),
  drug_name: z.string(),
  drug_id: UUIDSchema.nullable(),
  atc_code: z.string().nullable(),
  amount: z.number(),
  unit: UnitEnum,
  dosage_form: z.string().nullable(),
  strength: z.string().nullable(),
  animal_species: z.string(),
  animal_count: z.number(),
  animal_age_category: AnimalAgeCategoryEnum.nullable(),
  diagnosis_code: z.string().nullable(),
  treatment_purpose: TreatmentPurposeEnum.nullable(),
  treatment_duration_days: z.number().nullable(),
  prescribing_vet_id: UUIDSchema.nullable(),
  prescribed_at: DateTimeSchema,
  bvl_reporting_period: DateSchema.nullable(),
  bvl_reported: z.boolean(),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

export const AntibioticPrescriptionQuerySchema = PaginationSchema.extend({
  start_date: DateSchema.optional(),
  end_date: DateSchema.optional(),
  animal_species: z.string().max(100).optional(),
  reported: z.coerce.boolean().optional(),
});

// ============================================
// BVL Export Schemas
// ============================================

export const BVLExportQuerySchema = z.object({
  start_date: DateSchema,
  end_date: DateSchema,
  format: z.enum(['csv', 'json']).default('csv'),
  mark_reported: z.coerce.boolean().default(false),
});

// ============================================
// Transcription Schemas
// ============================================

export const TranscribeRequestSchema = z.object({
  audio: z.string().min(1, 'Audio data is required'), // Base64-encoded audio
  language: z.string().length(2).default('de'),
  extract_entities: z.boolean().default(true),
});

export const EntitySchema = z.object({
  text: z.string(),
  entity_type: z.string(),
  start: z.number().int(),
  end: z.number().int(),
});

export const TranscribeResponseSchema = z.object({
  id: UUIDSchema,
  text: z.string(),
  entities: z.array(EntitySchema).optional(),
  created_at: DateTimeSchema,
});

// ============================================
// Type Exports
// ============================================

export type PatientCreate = z.infer<typeof PatientCreateSchema>;
export type PatientUpdate = z.infer<typeof PatientUpdateSchema>;
export type PatientResponse = z.infer<typeof PatientResponseSchema>;
export type PatientQuery = z.infer<typeof PatientQuerySchema>;

export type TreatmentCreate = z.infer<typeof TreatmentCreateSchema>;
export type TreatmentResponse = z.infer<typeof TreatmentResponseSchema>;

export type MedicationQuery = z.infer<typeof MedicationQuerySchema>;
export type MedicationResponse = z.infer<typeof MedicationResponseSchema>;

export type AntibioticPrescriptionCreate = z.infer<typeof AntibioticPrescriptionCreateSchema>;
export type AntibioticPrescriptionResponse = z.infer<typeof AntibioticPrescriptionResponseSchema>;
export type AntibioticPrescriptionQuery = z.infer<typeof AntibioticPrescriptionQuerySchema>;

export type BVLExportQuery = z.infer<typeof BVLExportQuerySchema>;

export type TranscribeRequest = z.infer<typeof TranscribeRequestSchema>;
export type TranscribeResponse = z.infer<typeof TranscribeResponseSchema>;
export type Entity = z.infer<typeof EntitySchema>;