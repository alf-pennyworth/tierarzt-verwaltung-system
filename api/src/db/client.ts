/**
 * Database client for Vet API
 * Connects to Supabase Postgres directly
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { patients, treatments, medications, antibioticPrescriptions } from './schema.js';

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.warn('No DATABASE_URL or SUPABASE_DB_URL set - API will use mock data');
}

// Create connection pool
const client = connectionString 
  ? postgres(connectionString, { 
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    })
  : null;

export const db = client ? drizzle(client) : null;

// Re-export schemas
export * from './schema.js';