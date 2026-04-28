# TierarztOS — Kompletter Status & Test-Guide
**Stand:** 27. April 2026

---

## ✅ WAS JETZT FUNKTIONIERT (WebApp)

### Kern-Features (Bereit für Produktion)

| Feature | Status | Test-Methode |
|---------|--------|--------------|
| **Auth / Login** | ✅ Produktionsreif | `/auth` → Test-User: `test@tierarzt.de` / `test12345` |
| **Patientenverwaltung** | ✅ Produktionsreif | `/patients` → Patient anlegen, suchen, bearbeiten |
| **Behandlungen** | ✅ Produktionsreif | Patient öffnen → Behandlung hinzufügen |
| **KI-Transkription** | ✅ Produktionsreif | `/transcription` → Mikrofon erlauben → Sprache aufzeichnen |
| **TAMG-Dokumentation** | ✅ Produktionsreif | `/tamg` → Antibiotika verschreiben → CSV Export testen |
| **Arzneimittel-DB** | ✅ Produktionsreif | `/drugs` → Medikament suchen (EU UPD) |
| **GOÄ-V Abrechnung** | ✅ Frontend bereit | `/billing/goae-v` → Positionen hinzufügen → Rechnung erstellen |
| **Dashboard** | ✅ Basis funktioniert | `/dashboard` → Widgets anzeigen |
| **CSV Export** | ✅ Produktionsreif | `/csv-export` → TAMG CSV generieren |
| **Inventar** | ✅ Produktionsreif | `/inventory` → Medikamente verwalten |

### Teils implementiert (Braucht fehlende Tabellen)

| Feature | Status | Problem | Lösung |
|---------|--------|---------|--------|
| **Terminplanung** | ⚠️ UI da, DB fehlt | `appointments` Tabelle fehlt | ✅ Migration erstellt |
| **Besitzer-App** | ⚠️ UI da, DB fehlt | `besitzer` Tabelle fehlt | ✅ Migration erstellt |
| **Mitarbeiter** | ⚠️ UI da, Daten inkomplett | Nutzt `profiles` statt eigene Tabelle | ⚠️ Teils funktional |
| **Rechnungen (Backend)** | ⚠️ UI da, DB fehlt | `billing_invoices` Tabelle fehlt | ✅ Migration erstellt |
| **Telemedizin** | ⚠️ UI da, DB fehlt | `telemedicin_*` Tabellen fehlen | ✅ Migration erstellt |
| **Besitzer-Benachrichtigungen** | ❌ Noch nicht | `owner_notifications` fehlt | ✅ Migration erstellt |

---

## 📋 HEADLESS vs WEBAPP — Was wo läuft

### Headless API (Direkte Supabase-API)

| Endpunkt | Methode | Zweck |
|----------|---------|-------|
| `supabase.from('patient')` | CRUD | Patientenverwaltung |
| `supabase.from('behandlungen')` | CRUD | Behandlungen |
| `supabase.from('medikamente')` | CRUD | Inventar |
| `supabase.from('antibiotic_prescriptions')` | CRUD | TAMG |
| `supabase.from('profiles')` | SELECT/UPDATE | Benutzer/Praxis |

### WebApp-Seiten (React Frontend)

```
/                    → Dashboard (auth-geschützt)
/auth                → Login/Register
/patients            → Patientenliste
/patients/:id        → Patientendetails + Historie
/transcription       → KI-Spracherkennung
/tamg                → TAMG-Verordnungen
/tamg/export         → TAMG CSV Export
/drugs               → Arzneimittel-Suche
/drug-interactions   → Wechselwirkungscheck
/drug-pricing        → Preisinformationen
/dosage-calculator   → Dosierung berechnen
/inventory           → Inventarverwaltung
/billing/goae-v      → GOÄ-V Abrechnung
/csv-export          → CSV Export
/appointments        → Terminplanung ⚠️
/owners              → Besitzerverzeichnis ⚠️
/employees           → Mitarbeiter ⚠️
/telemedicine        → Telemedizin ⚠️
/reports             → Berichte
/profile             → Mein Profil
/settings            → Einstellungen
```

---

## 🔧 FEHLENDE API-ENDPUNKTE (Nach Migration)

Die folgenden Tabellen wurden in `20260427_comprehensive_tables.sql` erstellt:

### 1. Appointments (`appointments`)
```sql
-- Verwendung in der App:
supabase.from('appointments')
  .select('*, patient(name), besitzer(name)')
  .eq('praxis_id', praxisId)
  .gte('start_time', today)
  .order('start_time')
```

### 2. Besitzer (`besitzer`)
```sql
-- Verwendung in der App:
supabase.from('besitzer')
  .select('*')
  .eq('praxis_id', praxisId)
  .is('deleted_at', null)
  .order('name')
```

### 3. Rechnungen (`billing_invoices` + `billing_items`)
```sql
-- Rechnung erstellen:
supabase.from('billing_invoices').insert({...})
-- Positionen hinzufügen:
supabase.from('billing_items').insert([...])
```

### 4. Telemedizin (`telemedicin_consultations`, `telemedicin_messages`, `telemedicin_files`)
```sql
-- Konsultation starten:
supabase.from('telemedicin_consultations').insert({...})
-- Nachricht senden:
supabase.from('telemedicin_messages').insert({...})
```

### 5. Inventar-Transaktionen (`inventory_transactions`)
```sql
-- Bestandsbuchung:
supabase.from('inventory_transactions').insert({
  medikament_id: '...',
  transaction_type: 'out',
  quantity: -5,
  reference_type: 'prescription',
  reference_id: '...'
})
```

---

## 🧪 WIE DU ALLES TESTEN KANNST

### Phase 1: Basistest (Sofort)

```bash
# 1. App starten
cd vet-app-repo
npm run dev

# 2. Test-User login
curl -X POST https://szwtfzhxmlczavkuvfjw.supabase.co/auth/v1/token?grant_type=password \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"email":"test@tierarzt.de","password":"test12345"}'
```

**Manuelle Tests:**
1. ✅ `/auth` → Registrieren → Einloggen
2. ✅ `/patients` → Neuen Patienten anlegen (Name: "Test Hund", Spezies: "Hund")
3. ✅ Patient öffnen → Behandlung hinzufügen
4. ✅ `/transcription` → "Der Hund hat Fieber" aufzeichnen → SOAP-Notiz generieren
5. ✅ `/tamg` → Antibiotika verschreiben → CSV exportieren
6. ✅ `/drugs` → "Amoxicillin" suchen
7. ✅ `/inventory` → Medikamentenbestand prüfen
8. ✅ `/csv-export` → Export erstellen

### Phase 2: Erweiterte Features (Nach Migration)

9. ⚠️ `/appointments` → Termin erstellen
10. ⚠️ `/owners` → Besitzer anlegen → Patient zuweisen
11. ⚠️ `/billing/goae-v` → Rechnung erstellen → Positionen hinzufügen
12. ⚠️ `/telemedicine` → Konsultation starten (nur UI, Video-API extra)

### Phase 3: End-to-End Test-Szenarien

**Szenario A: Kompletter Patientenbesuch**
1. Besitzer anlegen → Patient anlegen
2. Termin buchen → Behandlung durchführen
3. KI-Transkription während Sprechstunde
4. Antibiotika verschreiben (TAMG automatisch)
5. GOÄ-V abrechnen → Rechnung erstellen
6. CSV Export für TAMG

**Szenario B: Inventar-Management**
1. Medikament anlegen
2. Bestellung erstellen
3. Wareneingang buchen
4. Bei Behandlung abbuchen
5. Mindestbestand prüfen

---

## 🔄 VETIDATA-ERSATZ STRATEGIE

### Was VetiData kann vs. TierarztOS

| VetiData Feature | TierarztOS Status | Quelle |
|------------------|-------------------|--------|
| **Arzneimittel-DB** | ✅ EU UPD (500K+ Medikamente) | Kostenlos (EU) |
| **Wechselwirkungen** | ⚠️ Regel-basiert (kein ML) | Eigenentwicklung |
| **Dosierungen** | ⚠️ Statische Daten | Eigenentwicklung |
| **TAMG-Export** | ✅ Vollautomatisch | Eigenentwicklung |
| **GOÄ-V** | ✅ Integriert | Eigenentwicklung |
| **Praxisverwaltung** | ✅ Modernere UI | Eigenentwicklung |
| **Kosten** | €49-199/Monat | vs. €300-500/Monat |

### Was noch fehlt für VetiData-Parität

1. **Deutsche Preisdaten** (Lauer-Taxe, Apotheken-Preise)
   - Status: ❌ Noch nicht implementiert
   - Plan: API zu Lauer-Taxe oder DIMDI

2. **Erweiterte Wechselwirkungen**
   - Status: ⚠️ Einfache Regeln vorhanden
   - Plan: VetGeni API integration (kostenpflichtig)

3. **Dosierungs-Empfehlungen**
   - Status: ⚠️ Statische Daten
   - Plan: VetGeni oder Plumb's Veterinary Drug Handbook

4. **Lebensmittelsicherheit (Rückstände)**
   - Status: ⚠️ EU UPD hat Wartezeiten
   - Plan: GFSV Daten integrieren

### Migration von VetiData → TierarztOS

**Daten-Export aus VetiData:**
1. Patientenliste als CSV exportieren
2. Medikamentenliste als CSV exportieren
3. Behandlungshistorie als CSV exportieren

**Import in TierarztOS:**
```sql
-- Beispiel: Patienten importieren
COPY patient(name, species, breed, owner_name, owner_email)
FROM '/path/to/export.csv' DELIMITER ',' CSV HEADER;
```

---

## 🚀 NÄCHSTE SCHRITTE

### Sofort (Heute)
1. ✅ Migration in Supabase ausführen: `20260427_comprehensive_tables.sql`
2. Testen ob Terminplanung, Besitzer, Rechnungen funktionieren

### Kurzfristig (Diese Woche)
3. Landing Pages finalisieren (Konstantin wählt Design)
4. APK Build konfigurieren (Capacitor/Cordova)
5. German Drug Pricing API recherchieren

### Mittelfristig (Nächste Wochen)
6. VetGeni API für Wechselwirkungen
7. Video-API für Telemedizin (Twilio/100ms)
8. Offline-Sync (Service Worker + IndexedDB)

---

## 📞 SUPPORT

Bei Problemen:
1. Supabase Dashboard: https://supabase.com/dashboard/project/szwtfzhxmlczavkuvfjw
2. App lokal testen: `npm run dev` → http://localhost:8080
3. API direkt testen: Supabase SQL Editor

---

*Letzte Aktualisierung: 27. April 2026*
