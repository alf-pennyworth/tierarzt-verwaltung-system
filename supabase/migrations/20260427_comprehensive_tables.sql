-- =====================================================
-- Comprehensive Migration: Missing Tables for TierarztOS
-- Created: 2026-04-27
-- Tables: appointments, besitzer (owners), inventory_orders, inventory_transactions, medication_types, telemedicine
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. APPOINTMENTS (Terminplanung)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    praxis_id UUID NOT NULL REFERENCES public.praxis(id),
    patient_id UUID REFERENCES public.patient(id),
    besitzer_id UUID REFERENCES public.besitzer(id),
    vet_id UUID REFERENCES auth.users(id),
    
    -- Termin Details
    title TEXT NOT NULL,
    description TEXT,
    appointment_type TEXT DEFAULT 'consultation', -- consultation, surgery, vaccination, follow_up, emergency
    status TEXT DEFAULT 'scheduled', -- scheduled, confirmed, completed, cancelled, no_show
    
    -- Zeit
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    
    -- Erinnerungen
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Notizen
    notes TEXT,
    cancellation_reason TEXT,
    
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index für schnelle Kalender-Abfragen
CREATE INDEX IF NOT EXISTS idx_appointments_praxis_time ON public.appointments(praxis_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_vet ON public.appointments(vet_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their practice appointments" ON public.appointments
    FOR SELECT USING (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create appointments for their practice" ON public.appointments
    FOR INSERT WITH CHECK (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their practice appointments" ON public.appointments
    FOR UPDATE USING (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

-- Trigger
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2. BESITZER (Owners/Tierbesitzer)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.besitzer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    praxis_id UUID NOT NULL REFERENCES public.praxis(id),
    
    -- Persönliche Daten
    name TEXT NOT NULL,
    email TEXT,
    telefonnummer TEXT,
    mobilnummer TEXT,
    
    -- Adresse
    strasse TEXT,
    hausnummer TEXT,
    plz TEXT,
    stadt TEXT,
    land TEXT DEFAULT 'Deutschland',
    
    -- Auth / Portal
    auth_id UUID REFERENCES auth.users(id),
    portal_aktiviert BOOLEAN DEFAULT FALSE,
    portal_einladung_gesendet_am TIMESTAMP WITH TIME ZONE,
    
    -- Kommunikation
    notizen TEXT,
    preferred_contact_method TEXT DEFAULT 'email', -- email, phone, sms
    
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_besitzer_praxis ON public.besitzer(praxis_id);
CREATE INDEX IF NOT EXISTS idx_besitzer_name ON public.besitzer(name);
CREATE INDEX IF NOT EXISTS idx_besitzer_email ON public.besitzer(email);
CREATE INDEX IF NOT EXISTS idx_besitzer_auth ON public.besitzer(auth_id);

-- RLS
ALTER TABLE public.besitzer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their practice owners" ON public.besitzer
    FOR SELECT USING (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create owners for their practice" ON public.besitzer
    FOR INSERT WITH CHECK (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their practice owners" ON public.besitzer
    FOR UPDATE USING (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

-- Trigger
CREATE TRIGGER update_besitzer_updated_at BEFORE UPDATE ON public.besitzer
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 3. MEDICATION_TYPES (Arzneimittel-Kategorien)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.medication_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Kategorisierung
    name TEXT NOT NULL, -- z.B. "Antibiotika", "Schmerzmittel", "Impfstoff"
    category TEXT NOT NULL, -- antibiotic, analgesic, vaccine, dewormer, supplement, other
    description TEXT,
    
    -- DACH-spezifisch
    atcvet_code_prefix TEXT, -- z.B. "QJ01" für Antibiotika
    requires_prescription BOOLEAN DEFAULT FALSE,
    controlled_substance BOOLEAN DEFAULT FALSE, -- BTM
    
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed-Daten für Standard-Kategorien
INSERT INTO public.medication_types (name, category, description, atcvet_code_prefix, requires_prescription) VALUES
    ('Antibiotika', 'antibiotic', 'Antibakterielle Mittel für Tiere', 'QJ01', TRUE),
    ('Schmerzmittel', 'analgesic', 'Analgetika und NSAIDs', 'QM01', TRUE),
    ('Impfstoffe', 'vaccine', 'Vakzine für Tierarten', 'QI', FALSE),
    ('Entwurmungsmittel', 'dewormer', 'Antiparasitika', 'QP51', FALSE),
    ('Nahrungsergänzung', 'supplement', 'Vitamine, Mineralien, Ergänzungen', NULL, FALSE),
    ('Hormone', 'hormone', 'Hormonelle Präparate', 'QH', TRUE),
    ('Sedativa', 'sedative', 'Beruhigungsmittel und Anästhetika', 'QN05', TRUE),
    ('Sonstige', 'other', 'Andere Arzneimittel', NULL, FALSE)
ON CONFLICT DO NOTHING;

-- RLS (public read, admin write)
ALTER TABLE public.medication_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read medication types" ON public.medication_types
    FOR SELECT USING (TRUE);

-- Trigger
CREATE TRIGGER update_medication_types_updated_at BEFORE UPDATE ON public.medication_types
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4. INVENTORY_ORDERS (Bestellungen)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inventory_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    praxis_id UUID NOT NULL REFERENCES public.praxis(id),
    
    -- Bestell-Details
    order_number TEXT, -- z.B. "BEST-2026-0001"
    supplier_name TEXT,
    supplier_id UUID, -- Falls wir später eine suppliers-Tabelle haben
    
    -- Status
    status TEXT DEFAULT 'pending', -- pending, ordered, partial, received, cancelled
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery DATE,
    received_at TIMESTAMP WITH TIME ZONE,
    
    -- Finanzen
    total_amount NUMERIC(10,2),
    currency TEXT DEFAULT 'EUR',
    
    -- Notizen
    notes TEXT,
    
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Trigger
CREATE TRIGGER update_inventory_orders_updated_at BEFORE UPDATE ON public.inventory_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. INVENTORY_TRANSACTIONS (Bestandsbewegungen)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    praxis_id UUID NOT NULL REFERENCES public.praxis(id),
    medikament_id UUID NOT NULL REFERENCES public.medikamente(id),
    
    -- Transaktions-Details
    transaction_type TEXT NOT NULL, -- in, out, adjustment, expiry, return
    quantity INTEGER NOT NULL,
    
    -- Kontext
    reference_type TEXT, -- prescription, order, adjustment, expiry
    reference_id UUID, -- z.B. antibiotic_prescriptions.id oder inventory_orders.id
    
    -- Vorher/Nachher
    stock_before INTEGER,
    stock_after INTEGER,
    
    -- Notizen
    notes TEXT,
    
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_inv_tx_praxis ON public.inventory_transactions(praxis_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_medikament ON public.inventory_transactions(medikament_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_type ON public.inventory_transactions(transaction_type);

-- RLS
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their practice transactions" ON public.inventory_transactions
    FOR SELECT USING (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create transactions for their practice" ON public.inventory_transactions
    FOR INSERT WITH CHECK (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

-- =====================================================
-- 6. TELEMEDIZIN (Telemedizin)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.telemedicin_consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    praxis_id UUID NOT NULL REFERENCES public.praxis(id),
    
    -- Teilnehmer
    vet_id UUID NOT NULL REFERENCES auth.users(id),
    patient_id UUID REFERENCES public.patient(id),
    besitzer_id UUID REFERENCES public.besitzer(id),
    
    -- Konsultation
    consultation_type TEXT DEFAULT 'video', -- video, chat, phone
    status TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    
    -- Zeiten
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    
    -- Inhalt
    notes TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    
    -- Technisch
    video_room_id TEXT,
    recording_url TEXT,
    
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.telemedicin_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES public.telemedicin_consultations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Nachricht
    message_type TEXT DEFAULT 'text', -- text, image, file, system
    content TEXT NOT NULL,
    attachment_url TEXT,
    
    -- Meta
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.telemedicin_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES public.telemedicin_consultations(id) ON DELETE CASCADE,
    
    -- Datei
    file_name TEXT NOT NULL,
    file_type TEXT, -- image, pdf, document
    file_url TEXT NOT NULL,
    file_size INTEGER,
    
    -- Meta
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_telemedicin_praxis ON public.telemedicin_consultations(praxis_id);
CREATE INDEX IF NOT EXISTS idx_telemedicin_vet ON public.telemedicin_consultations(vet_id);
CREATE INDEX IF NOT EXISTS idx_telemedicin_patient ON public.telemedicin_consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_telemedicin_status ON public.telemedicin_consultations(status);
CREATE INDEX IF NOT EXISTS idx_telemedicin_messages_consultation ON public.telemedicin_messages(consultation_id);

-- RLS
ALTER TABLE public.telemedicin_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemedicin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemedicin_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their practice consultations" ON public.telemedicin_consultations
    FOR SELECT USING (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create consultations for their practice" ON public.telemedicin_consultations
    FOR INSERT WITH CHECK (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view consultation messages" ON public.telemedicin_messages
    FOR SELECT USING (
        consultation_id IN (
            SELECT id FROM public.telemedicin_consultations 
            WHERE praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can view consultation files" ON public.telemedicin_files
    FOR SELECT USING (
        consultation_id IN (
            SELECT id FROM public.telemedicin_consultations 
            WHERE praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid())
        )
    );

-- Trigger
CREATE TRIGGER update_telemedicin_updated_at BEFORE UPDATE ON public.telemedicin_consultations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. GOÄ-V BILLING (Abrechnung)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.billing_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    praxis_id UUID NOT NULL REFERENCES public.praxis(id),
    
    -- Rechnungs-Details
    invoice_number TEXT NOT NULL, -- z.B. "RE-2026-0001"
    patient_id UUID REFERENCES public.patient(id),
    besitzer_id UUID REFERENCES public.besitzer(id),
    
    -- Status
    status TEXT DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Beträge
    subtotal NUMERIC(10,2),
    vat_rate NUMERIC(5,2) DEFAULT 0, -- Tierärztliche Leistungen = 0% MwSt
    vat_amount NUMERIC(10,2) DEFAULT 0,
    total_amount NUMERIC(10,2),
    
    -- Zahlung
    payment_method TEXT, -- transfer, cash, card, insurance
    payment_reference TEXT,
    
    -- Notizen
    notes TEXT,
    
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.billing_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.billing_invoices(id) ON DELETE CASCADE,
    
    -- Position
    position_code TEXT, -- GOÄ-V Code z.B. "1", "2", "A1"
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(10,2),
    factor NUMERIC(5,2) DEFAULT 1.0, -- GOÄ-V Faktor
    
    -- Berechnet
    total_price NUMERIC(10,2),
    
    -- Verknüpfung
    treatment_id UUID REFERENCES public.behandlungen(id),
    
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_billing_praxis ON public.billing_invoices(praxis_id);
CREATE INDEX IF NOT EXISTS idx_billing_status ON public.billing_invoices(status);
CREATE INDEX IF NOT EXISTS idx_billing_patient ON public.billing_invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_items_invoice ON public.billing_items(invoice_id);

-- RLS
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their practice invoices" ON public.billing_invoices
    FOR SELECT USING (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create invoices for their practice" ON public.billing_invoices
    FOR INSERT WITH CHECK (praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view invoice items" ON public.billing_items
    FOR SELECT USING (
        invoice_id IN (
            SELECT id FROM public.billing_invoices 
            WHERE praxis_id IN (SELECT praxis_id FROM public.profiles WHERE id = auth.uid())
        )
    );

-- Trigger
CREATE TRIGGER update_billing_invoices_updated_at BEFORE UPDATE ON public.billing_invoices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 8. OWNER PORTAL NOTIFICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.owner_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    besitzer_id UUID NOT NULL REFERENCES public.besitzer(id) ON DELETE CASCADE,
    
    -- Nachricht
    type TEXT NOT NULL, -- appointment_reminder, treatment_update, lab_results, prescription_ready, invoice
    title TEXT NOT NULL,
    content TEXT,
    
    -- Status
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Verknüpfung
    reference_type TEXT, -- appointment, treatment, invoice
    reference_id UUID,
    
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_owner_notif_besitzer ON public.owner_notifications(besitzer_id);
CREATE INDEX IF NOT EXISTS idx_owner_notif_read ON public.owner_notifications(read);

-- RLS
ALTER TABLE public.owner_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their own notifications" ON public.owner_notifications
    FOR SELECT USING (
        besitzer_id IN (
            SELECT id FROM public.besitzer WHERE auth_id = auth.uid()
        )
    );

-- =====================================================
-- VIEWS FÜR DASHBOARD/REPORTS
-- =====================================================

-- View: Aktive Patienten pro Praxis
CREATE OR REPLACE VIEW public.v_patient_counts AS
SELECT 
    praxis_id,
    COUNT(*) as total_patients,
    COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '30 days') as new_patients_30d
FROM public.patient
WHERE deleted_at IS NULL
GROUP BY praxis_id;

-- View: Termine heute
CREATE OR REPLACE VIEW public.v_today_appointments AS
SELECT 
    a.*,
    p.name as patient_name,
    p.species,
    b.name as besitzer_name
FROM public.appointments a
LEFT JOIN public.patient p ON a.patient_id = p.id
LEFT JOIN public.besitzer b ON a.besitzer_id = b.id
WHERE a.start_time::DATE = CURRENT_DATE
AND a.status NOT IN ('cancelled', 'no_show');

-- View: TAMG Zusammenfassung
CREATE OR REPLACE VIEW public.v_tamg_monthly_summary AS
SELECT 
    praxis_id,
    DATE_TRUNC('month', prescription_date) as month,
    COUNT(*) as total_prescriptions,
    SUM(amount_prescribed) as total_amount,
    COUNT(DISTINCT active_substance) as unique_substances
FROM public.antibiotic_prescriptions
GROUP BY praxis_id, DATE_TRUNC('month', prescription_date);

-- View: Offene Rechnungen
CREATE OR REPLACE VIEW public.v_outstanding_invoices AS
SELECT 
    i.*,
    p.name as patient_name,
    b.name as besitzer_name,
    b.email as besitzer_email
FROM public.billing_invoices i
LEFT JOIN public.patient p ON i.patient_id = p.id
LEFT JOIN public.besitzer b ON i.besitzer_id = b.id
WHERE i.status IN ('sent', 'overdue');

-- =====================================================
-- DEMONSTRATION/TEST DATA
-- =====================================================

-- Beispiel-Besitzer
INSERT INTO public.besitzer (id, praxis_id, name, email, telefonnummer, stadt, portal_aktiviert)
VALUES 
    ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Hans Müller', 'hans@example.de', '+49 30 1234567', 'Berlin', FALSE),
    ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'Maria Schmidt', 'maria@example.de', '+49 30 7654321', 'Berlin', TRUE)
ON CONFLICT DO NOTHING;

-- Beispiel-Termine
INSERT INTO public.appointments (praxis_id, title, appointment_type, status, start_time, end_time, duration_minutes)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Routine-Untersuchung Bella', 'consultation', 'scheduled', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 30 minutes', 30),
    ('00000000-0000-0000-0000-000000000001', 'Impfung Felix', 'vaccination', 'scheduled', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 15 minutes', 15)
ON CONFLICT DO NOTHING;

-- Beispiel-Rechnung
INSERT INTO public.billing_invoices (praxis_id, invoice_number, status, invoice_date, due_date, subtotal, total_amount)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'RE-2026-0001', 'draft', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 150.00, 150.00)
ON CONFLICT DO NOTHING;

-- Beispiel-Rechnungspositionen
INSERT INTO public.billing_items (invoice_id, position_code, description, quantity, unit_price, factor, total_price)
VALUES 
    ((SELECT id FROM public.billing_invoices WHERE invoice_number = 'RE-2026-0001'), '1', 'Grundbehandlung', 1, 50.00, 2.5, 125.00),
    ((SELECT id FROM public.billing_invoices WHERE invoice_number = 'RE-2026-0001'), 'A1', 'Impfung', 1, 25.00, 1.0, 25.00)
ON CONFLICT DO NOTHING;

-- =====================================================
-- FERTIG
-- =====================================================
