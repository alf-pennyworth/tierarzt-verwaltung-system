# BVL Export Scheduling Reminder - Implementation

**Date:** 2025-04-16
**Task:** Add BVL export scheduling reminder to Vet App

## Completed Features

### 1. BVL Quarterly Deadline Calculation (`src/lib/bvl-deadlines.ts`)
- Utility functions for calculating BVL reporting deadlines
- Quarterly periods: Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec)
- Reporting deadlines:
  - Q1 data → due June 30
  - Q2 data → due September 30
  - Q3 data → due December 31
  - Q4 data → due March 31 (next year)
- Human-readable time remaining (e.g., "2 Wochen", "1 Monat")
- Urgency detection (within 14 days = urgent)
- Overdue detection

### 2. BVL Reminder Component (`src/components/tamg/BVLReminder.tsx`)
- Two modes:
  - **Compact mode**: Small card for main dashboard
  - **Full mode**: Detailed view for TAMG page
- Shows:
  - Current reporting quarter and deadline
  - Countdown to deadline
  - Number of unreported prescriptions
  - Export history (last 5 exports from `tamg_export_batches` table)
  - Visual warnings for urgent/overdue deadlines

### 3. Dashboard Integration
- **TAMG Dashboard (`TAMGDashboard.tsx`)**: Full BVL reminder at top of page
- **Main Dashboard (`Index.tsx`)**: Compact BVL deadline widget after stats cards

### 4. Export History Tracking
- Modified `BVLExport.tsx` to save export records to `tamg_export_batches` table
- Tracks:
  - Export date
  - Period start/end
  - Records count
  - Status (pending/completed/submitted)

### 5. Test Coverage
- `bvl-deadlines.test.ts`: 41 tests covering:
  - Quarter calculations
  - Deadline calculations
  - Time remaining formatting
  - Urgency/overdue detection
  - German date formatting

## Files Changed
- `src/lib/bvl-deadlines.ts` (new)
- `src/lib/bvl-deadlines.test.ts` (new)
- `src/components/tamg/BVLReminder.tsx` (new)
- `src/components/tamg/index.ts` (updated exports)
- `src/components/tamg/TAMGDashboard.tsx` (added BVLReminder)
- `src/components/tamg/BVLExport.tsx` (save export history)
- `src/pages/Index.tsx` (added compact BVL reminder)

## Database Schema
Uses existing `tamg_export_batches` table:
```sql
CREATE TABLE public.tamg_export_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  praxis_id UUID NOT NULL REFERENCES public.praxis(id) ON DELETE CASCADE,
  export_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  format TEXT NOT NULL DEFAULT 'csv',
  file_path TEXT,
  records_count INTEGER DEFAULT 0,
  total_amount_mg NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);
```

## German Labels
All UI text uses German labels:
- "BVL-Meldezeitraum" (BVL reporting period)
- "Meldefrist" (reporting deadline)
- "Unberichtete Verschreibungen" (unreported prescriptions)
- "Export-Historie" (export history)
- Urgency warnings in German

## Build Status
- TypeScript: ✓ Compiles successfully
- Tests: ✓ 77 tests passing
- Build: ✓ Production build successful