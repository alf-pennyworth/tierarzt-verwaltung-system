# Production Setup Required

## Database Migrations

Run these SQL migrations in Supabase Dashboard SQL Editor:

### 1. Add BNR15 Columns (Required for BVL Compliance)

```sql
-- Add BNR15 (Betriebsnummer) to praxis table
ALTER TABLE public.praxis 
ADD COLUMN IF NOT EXISTS bnr15 TEXT;

-- Add BNR15 to patient table for owner operation numbers
ALTER TABLE public.patient
ADD COLUMN IF NOT EXISTS owner_bnr15 TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_praxis_bnr15 ON public.praxis(bnr15);
CREATE INDEX IF NOT EXISTS idx_patient_bnr15 ON public.patient(owner_bnr15);

-- Update test practice with placeholder
UPDATE public.praxis 
SET bnr15 = '09 000 000 00 001' 
WHERE id = '00000000-0000-0000-0000-000000000001';
```

## Environment Setup

1. Set production Supabase credentials in `.env`
2. Configure Row Level Security policies for production
3. Remove test data seed migration for production deployment

## Authentication

1. Configure Supabase Auth providers
2. Set up proper user roles (vet, admin, staff)
3. Implement proper RLS policies based on praxis_id

## BVL Integration

1. Obtain real BNR15 numbers for each practice
2. Configure HI-Tier API credentials (if using direct submission)
3. Set up scheduled exports for compliance deadlines

## ATC Codes

1. Import WHO ATC Vet classification for antibiotic categorization
2. Map drug names to ATC codes automatically
3. Consider EU UPD API integration for drug database population (see `memory/vetidata-alternatives.md`)