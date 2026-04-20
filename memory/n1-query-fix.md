# N+1 Query Fix - Employees Component

**Date:** 2026-04-16
**Status:** ✅ Already Fixed

## Issue Found
The `src/pages/Employees.tsx` component had an N+1 query pattern where profile image signed URLs were fetched one at a time in a loop:

```typescript
// OLD - N+1 query pattern
const employeesWithImages = await Promise.all(
  data.map(async (employee) => {
    if (employee.profilbild_url) {
      const { data: imageData } = await supabase.storage
        .from('Profilbild')
        .createSignedUrl(employee.profilbild_url, 3600);
      // ...
    }
  })
);
```

This made N separate API calls for N employees with profile pictures.

## Fix Applied
Replaced with Supabase batch API `createSignedUrls`:

```typescript
// NEW - Batch API call (single request)
const profilePaths = data
  .filter(e => e.profilbild_url)
  .map(e => e.profilbild_url);

const { data: urlsData } = await supabase.storage
  .from('Profilbild')
  .createSignedUrls(profilePaths, 3600);

// Build lookup map
const signedUrls = {};
urlsData.forEach(item => {
  signedUrls[item.path] = item.signedURL;
});

// Map to employees
const employeesWithImages = data.map(employee => ({
  ...employee,
  imageUrl: employee.profilbild_url ? signedUrls[employee.profilbild_url] : null
}));
```

## Performance Impact
- **Before:** 1 + N API calls (1 for employees + N for profile images)
- **After:** 2 API calls total (1 for employees + 1 batch for all images)

For a practice with 20 employees with profile pictures:
- Before: 21 API calls
- After: 2 API calls
- **Improvement: ~90% reduction in API calls**

## Commit
The fix was included in commit `0f36204`:
```
refactor: move hardcoded Supabase credentials to env vars
```

## Build Status
- ✅ Build passes (`npm run build`)
- ✅ No TypeScript errors
- ✅ Bundle size: Employees-DEMyVnsI.js 5.40 kB (gzip: 2.08 kB)

## Other Files Checked
- `EmployeeDetail.tsx` - Single employee, single URL fetch (no N+1)
- `UserCard.tsx` - Needs review for potential N+1
- `ProfileForm.tsx` - Single profile, single URL fetch (no N+1)