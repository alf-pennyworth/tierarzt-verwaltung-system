/**
 * Database schema matching Supabase tables
 */

import { pgTable, uuid, text, timestamp, boolean, integer, date } from 'drizzle-orm/pg-core';

// Praxis (practice)
export const praxis = pgTable('praxis', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  bnr15: text('bnr15'), // BVL operation number
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Profiles (users)
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  full_name: text('full_name'),
  role: text('role').default('vet'),
  praxis_id: uuid('praxis_id').references(() => praxis.id),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Patients
export const patients = pgTable('patient', {
  id: uuid('id').primaryKey().defaultRandom(),
  praxis_id: uuid('praxis_id').notNull().references(() => praxis.id),
  name: text('name').notNull(),
  species: text('species').notNull(),
  breed: text('breed'),
  gender: text('gender'),
  birth_date: date('birth_date'),
  owner_name: text('owner_name'),
  owner_phone: text('owner_phone'),
  owner_email: text('owner_email'),
  owner_address: text('owner_address'),
  owner_bnr15: text('owner_bnr15'), // Owner operation number for BVL
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Treatments (Behandlungen)
export const treatments = pgTable('behandlungen', {
  id: uuid('id').primaryKey().defaultRandom(),
  praxis_id: uuid('praxis_id').notNull().references(() => praxis.id),
  patient_id: uuid('patient_id').notNull().references(() => patients.id),
  treatment_date: timestamp('treatment_date').defaultNow(),
  diagnosis: text('diagnosis'),
  notes: text('notes'),
  transcript_text: text('transcript_text'),
  soap_notes: text('soap_notes'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Medications (Medikamente)
export const medications = pgTable('medikamente', {
  id: uuid('id').primaryKey().defaultRandom(),
  praxis_id: uuid('praxis_id').references(() => praxis.id),
  product_name: text('product_name').notNull(),
  product_name_de: text('product_name_de'),
  atc_vet_code: text('atc_vet_code'),
  is_antibiotic: boolean('is_antibiotic').default(false),
  pharmaceutical_form: text('pharmaceutical_form'),
  available_in_de: boolean('available_in_de').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Antibiotic Prescriptions (TAMG)
export const antibioticPrescriptions = pgTable('antibiotic_prescriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  practice_id: uuid('practice_id').notNull().references(() => praxis.id),
  patient_id: uuid('patient_id').notNull().references(() => patients.id),
  drug_name: text('drug_name').notNull(),
  drug_id: uuid('drug_id').references(() => medications.id),
  amount: integer('amount'),
  unit: text('unit'),
  treatment_duration_days: integer('treatment_duration_days'),
  animal_species: text('animal_species'),
  animal_count: integer('animal_count').default(1),
  treatment_purpose: text('treatment_purpose'),
  prescribed_at: timestamp('prescribed_at').defaultNow(),
  bvl_reported: boolean('bvl_reported').default(false),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// API Keys (for headless access)
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  praxis_id: uuid('praxis_id').notNull().references(() => praxis.id),
  key_hash: text('key_hash').notNull(),
  name: text('name').notNull(),
  scopes: text('scopes').array().default(['read']),
  rate_limit: integer('rate_limit').default(100),
  last_used_at: timestamp('last_used_at'),
  expires_at: timestamp('expires_at'),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Type exports
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type Treatment = typeof treatments.$inferSelect;
export type Medication = typeof medications.$inferSelect;
export type AntibioticPrescription = typeof antibioticPrescriptions.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;