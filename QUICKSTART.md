# Vet App - Quick Reference

## Start Development

```bash
cd /home/node/.openclaw/workspace/vet-app-repo
bun run dev
```

## Run Tests

```bash
bun test
```

## Build for Production

```bash
bun run build
```

## Start API

```bash
cd api
bun run src/index.ts
```

## API Quick Test

```bash
curl http://localhost:3001/health
```

## Database Migrations

Apply in order:
1. `20260409_base_schema.sql`
2. `20260409_combined_migration.sql`
3. `20260409_tamg_antibiotic_prescriptions.sql`
4. `20260410_add_bnr15.sql`
5. `20260411_production_rls.sql`
6. `20260412_seed_antibiotics.sql`

## Key Files

| File | Purpose |
|------|---------|
| `src/pages/TAMG.tsx` | TAMG dashboard |
| `src/components/tamg/BVLExport.tsx` | CSV export |
| `api/src/index.ts` | REST API entry |
| `api/src/routes/ai.ts` | AI endpoints |
| `supabase/migrations/` | Database schema |

## Environment Variables

Required in `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Required in Supabase secrets:
- `ASSEMBLYAI_API_KEY`
- `GEMINI_API_KEY`

## Demo Checklist

- [ ] Frontend builds
- [ ] Tests pass
- [ ] API starts
- [ ] Health check returns ok
- [ ] TAMG dashboard loads
- [ ] BVL export works