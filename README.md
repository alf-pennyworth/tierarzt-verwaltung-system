# Vet Transcription System

A TAMG-compliant veterinary practice management system with antibiotic tracking and BVL reporting for German veterinarians.

## Features

- **TAMG Module:** Antibiotic prescription tracking compliant with German Tierarzneimittelgesetz
- **BVL Export:** CSV export in BVL format (Windows-1252 encoding)
- **AI Integration:** Transcription, extraction, and SOAP note generation (AssemblyAI + Gemini 2.5 Pro)
- **Headless API:** REST API for third-party integrations
- **Multi-tenant:** Row-level security for practice isolation

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Start API (separate terminal)
cd api && bun run src/index.ts
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check + database status |
| GET | `/portal` | API documentation |
| GET | `/api-keys` | List API keys |
| POST | `/api-keys` | Create API key |
| GET | `/patients` | List patients |
| POST | `/patients` | Create patient |
| GET | `/treatments` | List treatments |
| POST | `/treatments` | Create treatment |
| GET | `/tamg/prescriptions` | List antibiotic prescriptions |
| POST | `/tamg/prescriptions` | Create prescription |
| GET | `/tamg/export` | BVL CSV export |
| GET | `/tamg/antibiotics` | List 46 antibiotics |
| POST | `/transcribe` | Audio transcription (AssemblyAI) |
| POST | `/extract` | Medical data extraction (Gemini 2.5 Pro) |
| POST | `/soap` | SOAP note generation (Gemini 2.5 Pro) |

## Environment Variables

```bash
# Supabase (required)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# AI APIs (required for AI endpoints)
ASSEMBLYAI_API_KEY=xxx
GEMINI_API_KEY=xxx

# Optional: UPD drug database integration
UPD_CLIENT_ID=xxx
UPD_CLIENT_SECRET=xxx
```

## Testing

```bash
# Run all tests
bun test

# Run API tests only
cd api && bun test
```

## Demo

See `DEMO_SCRIPT.md` for demo walkthrough and `scripts/demo-data.sh` for test data setup.

---

**Built with:** React, TypeScript, Supabase, Hono, AssemblyAI, Gemini 2.5 Pro

---

# Original Lovable Project Info
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/3f9001c1-c4fc-41ca-b0bf-d70fc8874677) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)
