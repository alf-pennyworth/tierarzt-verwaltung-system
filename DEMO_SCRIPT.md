# Demo Script - Vet Transcription System (TAMG-Compliant)
## Saturday 2026-04-18 | 5 Minutes

---

## 1. Opening: Problem Statement (30 seconds)

**German:**
> "Tierärzte in Deutschland müssen seit 2023 den Antibiotikaeinsatz nach dem Tierarzneimittelgesetz (TAMG) dokumentieren und an das BVL melden. Viele Praxen nutzen dafür Excel-Listen oder Papier – fehleranfällig und zeitraubend."

**English:**
> "German veterinarians must document antibiotic usage under the TAMG law since 2023 and report to the BVL. Many practices still use Excel or paper – error-prone and time-consuming."

**Key pain points to mention:**
- Manual documentation takes 10-15 minutes per prescription
- BVL CSV format is complex (Windows-1252 encoding, specific field names)
- Risk of errors in reporting → fines up to €50,000
- No integration with existing practice software

**Our solution:**
> "Das Vet Transcription System automatisiert die TAMG-Dokumentation und BVL-Meldung vollständig."

---

## 2. Demo Flow (4 minutes)

### 2.1 Login (30 seconds)

**Action:** Navigate to `/auth`

**Narration:**
> "Ich logge mich mit meinem Tierarzt-Account ein. Das System nutzt Supabase Auth – sicher und DSGVO-konform."

**Key features:**
- Email/password authentication
- Practice-based access (each vet belongs to a practice)
- Optional: Show invite flow (if time permits)

**Click:** Login button → redirects to main dashboard

---

### 2.2 Dashboard & Navigation (30 seconds)

**Action:** Show the modules navigation page (`/`)

**Narration:**
> "Nach dem Login sehen wir das Hauptmenü. Wir haben Module für Patientenverwaltung, Transkription, Termine, Bestandsmanagement – und hier das TAMG-Modul."

**Key features to highlight:**
- Clean, modern UI (shadcn/ui components)
- German localization
- Role-based access (vet vs. owner views)

**Click:** Navigate to TAMG module (left sidebar)

---

### 2.3 TAMG Dashboard (45 seconds)

**Action:** Show TAMG dashboard (`/tamg`)

**Narration:**
> "Das TAMG-Dashboard zeigt auf einen Blick alle Antibiotika-Verschreibungen der letzten 30 Tage. Wir sehen Statistiken nach Wirkstoffklasse und Tierart."

**Key features:**
- Overview statistics (prescriptions by antibiotic class, animal species)
- Time range filter (7, 30, 90 days)
- Visual charts (pie chart for antibiotic classes, bar chart for species)
- Prescription list with BVL reporting status

**Talking points:**
- "Penicilline sind am häufigsten verschrieben"
- "Alle Verschreibungen sind bereits für das BVL vorbereitet"
- Click on a prescription → show details (if time)

---

### 2.4 New Prescription (60 seconds)

**Action:** Click "Neue Verschreibung" tab (`/tamg/new`)

**Narration:**
> "Jetzt lege ich eine neue Antibiotika-Verschreibung an. Das System bietet 46 vordefinierte Antibiotika an – alle in Deutschland zugelassenen Wirkstoffe."

**Step-by-step:**
1. **Select patient:** "Bello (Hund)" from dropdown
   - "Das System lädt automatisch alle Patienten der Praxis"

2. **Select antibiotic:** "Amoxicillin 500mg"
   - "Wir haben 46 Antibiotika in der Datenbank, mit Wirkstoff, ATC-Code und zugelassenen Tierarten"

3. **Fill details:**
   - Menge: 10 Tabletten
   - Tierart: "Hunde" (auto-filled from patient)
   - Tieranzahl: 1
   - Behandlungsdauer: 7 Tage
   - Verabreichungsweg: "Oral"
   - Diagnose: "Hautinfektion"
   - Indikation: "Therapie"

4. **Submit:** Click "Speichern"

**Narration:**
> "Mit einem Klick ist die Verschreibung gespeichert – alle TAMG-Pflichtfelder sind erfasst. Das System validiert automatisch alle Eingaben."

---

### 2.5 BVL Export (45 seconds)

**Action:** Click "BVL-Export" tab (`/tamg/export`)

**Narration:**
> "Für die BVL-Meldung wählen wir den Zeitraum und generieren den CSV-Export. Das Format ist exakt nach BVL-Vorgaben – Windows-1252-Encoding, Semikolon als Trennzeichen."

**Step-by-step:**
1. **Select date range:** "01.04.2026 - 30.04.2026"
2. **Click:** "Export starten"
3. **Show:** CSV file downloads automatically

**Talking points:**
- "Das CSV hat die korrekten BVL-Feldnamen: BNR15, BNR15_HA, TAMB_FORM, etc."
- "Encoding ist Windows-1252 – wichtig für Umlaute (ä, ö, ü)"
- "Die Datei kann direkt in das HI-Tier-Portal hochgeladen werden"

**Optional (if API demo works):**
> "Wir können den Export auch über die API automatisieren – dazu gleich mehr."

---

### 2.6 API Portal (30 seconds) [Optional/Backup]

**Action:** Open new tab → `http://localhost:3001/portal`

**Narration:**
> "Für Integrationen bieten wir eine Headless API. Praxisverwaltungssysteme können direkt auf unsere Endpunkte zugreifen."

**Key endpoints:**
- `GET /tamg/prescriptions` - List all prescriptions
- `POST /tamg/prescriptions` - Create new prescription
- `GET /tamg/export` - BVL CSV export
- `GET /tamg/antibiotics` - List 46 antibiotics

**Talking point:**
> "API-Keys können Praxis-Admins im Portal selbst erstellen und verwalten."

---

## 3. Key Features Summary (30 seconds)

**Mention briefly:**
- ✅ **TAMG-konform:** Alle Pflichtfelder erfasst, BVL-Format eingehalten
- ✅ **Zeitersparnis:** ~10 Minuten pro Verschreibung vs. 1-2 Minuten
- ✅ **Sicherheit:** RLS-Policies, API-Auth, DSGVO-konform
- ✅ **Integration:** Headless API für Dritt-Systeme
- ✅ **46 Antibiotika:** Vorkonfigurierte Datenbank

---

## 4. Q&A (30 seconds)

**Prepared answers:**

**Q: Was kostet das System?**
> "SaaS-Modell mit monatlicher Gebühr pro Praxis. Preisgestaltung folgt."

**Q: Funktioniert es offline?**
> "Derzeit online-only. Offline-Modus für mobile Einsätze ist geplant."

**Q: Kann ich meine bestehenden Daten importieren?**
> "Ja, CSV-Import für Patienten und Bestände ist möglich."

**Q: Welche Tierarten werden unterstützt?**
> "Alle 14 TAMG-Tierarten – von Rind/Schwein bis Hund/Katze."

**Q: Wo liegen die Daten?**
> "Supabase-Hosting in der EU (Frankfurt), DSGVO-konform."

---

## Backup Plan

If live demo fails:

### Screenshot Placeholders

Prepare screenshots of:
1. Login page (`/auth`)
2. Main dashboard with modules navigation
3. TAMG dashboard with charts
4. New prescription form (filled)
5. BVL export page with date picker
6. API portal (`/portal`)

### Pre-written Narration

> "Ich zeige Ihnen Screenshots der wichtigsten Funktionen..."

### Pre-seeded Demo Data

Run `./scripts/demo-data.sh` before demo to ensure:
- Practice: "Tierarztpraxis Demo"
- User: demo@vet-app.de / password123
- 5 patients (Bello, Mimi, Rex, Luna, Charly)
- 3 antibiotic prescriptions in last 30 days

---

## Technical Notes for Demo Preparation

### Start services (Friday night):

```bash
# Terminal 1: API
cd vet-app-repo/api
bun run src/index.ts

# Terminal 2: Frontend
cd vet-app-repo
bun run dev
```

### Verify endpoints:
- `curl http://localhost:3001/health` → {"status":"ok"}
- `curl http://localhost:3001/portal` → HTML page
- `curl http://localhost:3001/tamg/antibiotics` → 46 drugs

### Demo credentials:
- Email: demo@tierarzt-app.de
- Password: demo123456

### Database state:
- Practice: "Tierarztpraxis Müller", Berlin
- BNR15: DE000123456789 (example)
- 46 antibiotics seeded
- 5 demo patients
- 3 demo prescriptions

---

## Contact

- Developer: Chef-Agent
- Owner: Konstantin
- Repository: tierarzt-verwaltung-system
- Demo Date: Saturday 2026-04-18