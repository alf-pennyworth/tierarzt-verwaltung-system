# Accessibility Fixes - 2026-04-16

## Completed

### 1. aria-expanded on menu toggles (Navigation.tsx)
- Added `aria-expanded={isMenuOpen}` to both mobile and desktop menu toggle buttons
- Added German `aria-label="Menü öffnen"` to both buttons
- Added `aria-hidden="true"` to icon containers (decorative icons, not announced)

**Files changed:** `src/components/Navigation.tsx`

### 2. aria-sort on sortable columns (PatientList.tsx)
- Added `aria-sort` attribute to sortable column headers:
  - Name column: `aria-sort={sortConfig.field === 'name' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}`
  - Owner column: same pattern
  - Created column: same pattern
- Added German `aria-label` to sort buttons:
  - "Nach Name sortieren"
  - "Nach Besitzer sortieren"
  - "Nach Erstelldatum sortieren"

**Files changed:** `src/pages/PatientList.tsx`

### 3. Owner link keyboard accessibility (PatientList.tsx)
- Added `role="button"` to the owner name span
- Added `tabIndex={0}` for keyboard focus
- Added `aria-label={`Besitzer ${patient.besitzer.name} anzeigen`}` for context
- Added `onKeyDown` handler for Enter and Space keys
- Added `text-primary` class for visual affordance (link color)

**Files changed:** `src/pages/PatientList.tsx`

### 4. Table captions (German)
- PatientList.tsx: "Patientenliste mit {filteredPatients.length} Patienten, sortierbar nach Name, Besitzer und Erstelldatum"
- Owners.tsx: "Besitzerverzeichnis mit {owners.length} Besitzern"

Used `className="sr-only"` to hide visually while keeping for screen readers.

**Files changed:** `src/pages/PatientList.tsx`, `src/pages/Owners.tsx`

## Verification

- ✅ TypeScript compilation passes (`npx tsc --noEmit`)
- ✅ Production build succeeds (`npm run build`)
- ✅ Committed: `fa8e473`

## Keyboard Navigation Testing

To test:
1. Tab to menu button → should announce "Menü öffnen, collapsed/expanded"
2. Activate with Enter/Space → should toggle menu and announce expanded state
3. Tab through table headers → sort buttons should be focusable
4. Tab to owner name link → should be focusable, announce "Besitzer [Name] anzeigen"
5. Enter or Space on owner link → should navigate to owner detail page

## Notes

- All labels in German per app locale
- Screen reader only content uses `sr-only` utility class
- Icon-only buttons have aria-label for context
- Decorative icons hidden with aria-hidden