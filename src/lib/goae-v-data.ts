// GOÄ-V (Gebührenordnung für Tierärzte) - Veterinary Fee Schedule
// Source: Bundesministerium für Ernährung und Landwirtschaft
// Valid from: 2024

export interface GOAEVPosition {
  number: string;
  description: string;
  baseFee: number; // in Euro
  category: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";
  minFactor: number;
  maxFactor: number;
  typicalFactor: number;
  isTimeBased: boolean;
  timeMinutes?: number;
  requiresDocumentation: boolean;
  notes?: string;
}

export interface GOAEVCalculation {
  position: GOAEVPosition;
  factor: number;
  calculatedFee: number;
  duration?: number;
  notes: string;
}

export interface GOAEVInvoice {
  id: string;
  patientId: string;
  patientName: string;
  ownerName: string;
  date: string;
  items: GOAEVCalculation[];
  subtotal: number;
  vatAmount: number;
  vatRate: number;
  total: number;
  status: "draft" | "sent" | "paid" | "overdue";
}

// GOÄ-V Position categories and their typical factor ranges
export const GOAEV_CATEGORIES = {
  A: { name: "Untersuchungen", minFactor: 1.0, maxFactor: 3.5, typical: 1.8 },
  B: { name: "Beratung und Anleitung", minFactor: 1.0, maxFactor: 3.0, typical: 1.5 },
  C: { name: "Behandlung", minFactor: 1.0, maxFactor: 5.0, typical: 2.5 },
  D: { name: "Operationen", minFactor: 1.0, maxFactor: 5.0, typical: 3.0 },
  E: { name: "Geburtshilfe", minFactor: 1.0, maxFactor: 4.0, typical: 2.0 },
  F: { name: "Impfungen", minFactor: 1.0, maxFactor: 2.0, typical: 1.5 },
  G: { name: "Röntgen und Bildgebung", minFactor: 1.0, maxFactor: 3.5, typical: 2.0 },
  H: { name: "Laboruntersuchungen", minFactor: 1.0, maxFactor: 3.0, typical: 1.8 },
  I: { name: "Sonstige Leistungen", minFactor: 1.0, maxFactor: 3.0, typical: 1.5 },
};

// Standard GOÄ-V positions (most common for veterinary practices)
export const GOAEV_POSITIONS: GOAEVPosition[] = [
  // Category A - Untersuchungen (Examinations)
  {
    number: "A1",
    description: "Allgemeine körperliche Untersuchung (Anamnese, Inspektion, Palpation, Auskultation)",
    baseFee: 15.00,
    category: "A",
    minFactor: 1.0,
    maxFactor: 3.5,
    typicalFactor: 1.8,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "A2",
    description: "Erweiterte körperliche Untersuchung (einschließlich Organuntersuchungen, Reflexprüfung)",
    baseFee: 25.00,
    category: "A",
    minFactor: 1.0,
    maxFactor: 3.5,
    typicalFactor: 2.0,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "A3",
    description: "Spezielle Untersuchung (z.B. Augenspiegelung, Ohrenuntersuchung, Hautuntersuchung)",
    baseFee: 20.00,
    category: "A",
    minFactor: 1.0,
    maxFactor: 3.0,
    typicalFactor: 1.5,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "A4",
    description: "Intensive Überwachung und Kontrolle (z.B. postoperativ, bei schweren Erkrankungen)",
    baseFee: 18.00,
    category: "A",
    minFactor: 1.0,
    maxFactor: 3.5,
    typicalFactor: 2.0,
    isTimeBased: true,
    timeMinutes: 15,
    requiresDocumentation: true,
  },

  // Category B - Beratung und Anleitung (Consultation)
  {
    number: "B1",
    description: "Einfache Beratung (Fütterung, Haltung, Impfplan)",
    baseFee: 12.00,
    category: "B",
    minFactor: 1.0,
    maxFactor: 2.5,
    typicalFactor: 1.2,
    isTimeBased: false,
    requiresDocumentation: false,
  },
  {
    number: "B2",
    description: "Ausführliche Beratung (Erkrankungen, Behandlungsoptionen, Prognose)",
    baseFee: 20.00,
    category: "B",
    minFactor: 1.0,
    maxFactor: 3.0,
    typicalFactor: 1.8,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "B3",
    description: "Anleitung zur Medikamentengabe oder Behandlung durch den Tierhalter",
    baseFee: 10.00,
    category: "B",
    minFactor: 1.0,
    maxFactor: 2.0,
    typicalFactor: 1.3,
    isTimeBased: false,
    requiresDocumentation: false,
  },

  // Category C - Behandlung (Treatment)
  {
    number: "C1",
    description: "Einfache Behandlung (z.B. Wundversorgung, Injektion, Entfernung von Zecken)",
    baseFee: 15.00,
    category: "C",
    minFactor: 1.0,
    maxFactor: 3.0,
    typicalFactor: 1.5,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "C2",
    description: "Mittelschwere Behandlung (z.B. Verbände, Katherisierung, Infusionstherapie)",
    baseFee: 25.00,
    category: "C",
    minFactor: 1.0,
    maxFactor: 4.0,
    typicalFactor: 2.0,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "C3",
    description: "Schwere oder langwierige Behandlung (z.B. Intensivtherapie, komplexe Verbandwechsel)",
    baseFee: 40.00,
    category: "C",
    minFactor: 1.0,
    maxFactor: 5.0,
    typicalFactor: 3.0,
    isTimeBased: true,
    timeMinutes: 30,
    requiresDocumentation: true,
  },
  {
    number: "C4",
    description: "Notfallbehandlung außerhalb der Praxisöffnungszeiten",
    baseFee: 50.00,
    category: "C",
    minFactor: 2.0,
    maxFactor: 5.0,
    typicalFactor: 3.5,
    isTimeBased: false,
    requiresDocumentation: true,
    notes: "Zuschlag für Notfalldienst gemäß GOÄ-V",
  },

  // Category D - Operationen (Surgery)
  {
    number: "D1",
    description: "Einfache Operation (z.B. Kastration kleiner Tiere, Entfernung oberflächlicher Tumoren)",
    baseFee: 60.00,
    category: "D",
    minFactor: 1.0,
    maxFactor: 3.5,
    typicalFactor: 2.0,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "D2",
    description: "Mittelschwere Operation (z.B. Kastration großer Tiere, Entfernung subkutaner Tumoren)",
    baseFee: 100.00,
    category: "D",
    minFactor: 1.0,
    maxFactor: 4.0,
    typicalFactor: 2.5,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "D3",
    description: "Schwere Operation (z.B. Orthopädische Eingriffe, Bauchhöhlenoperationen)",
    baseFee: 150.00,
    category: "D",
    minFactor: 1.0,
    maxFactor: 5.0,
    typicalFactor: 3.0,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "D4",
    description: "Sehr schwere Operation (z.B. Wirbelsäulenchirurgie, komplexe Rekonstruktionen)",
    baseFee: 200.00,
    category: "D",
    minFactor: 1.0,
    maxFactor: 5.0,
    typicalFactor: 3.5,
    isTimeBased: false,
    requiresDocumentation: true,
  },

  // Category E - Geburtshilfe (Obstetrics)
  {
    number: "E1",
    description: "Geburtshilfe - einfach (unauffällige Geburt, Nachsorge)",
    baseFee: 40.00,
    category: "E",
    minFactor: 1.0,
    maxFactor: 3.0,
    typicalFactor: 1.5,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "E2",
    description: "Geburtshilfe - kompliziert (Geburtsstillstand, Kaiserschnitt)",
    baseFee: 100.00,
    category: "E",
    minFactor: 1.0,
    maxFactor: 4.0,
    typicalFactor: 2.5,
    isTimeBased: false,
    requiresDocumentation: true,
  },

  // Category F - Impfungen (Vaccinations)
  {
    number: "F1",
    description: "Einfache Impfung (einfacher Impfstoff, keine Untersuchung)",
    baseFee: 8.00,
    category: "F",
    minFactor: 1.0,
    maxFactor: 2.0,
    typicalFactor: 1.5,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "F2",
    description: "Impfung mit Untersuchung (einschließlich Allgemeinuntersuchung)",
    baseFee: 20.00,
    category: "F",
    minFactor: 1.0,
    maxFactor: 2.5,
    typicalFactor: 1.8,
    isTimeBased: false,
    requiresDocumentation: true,
  },

  // Category G - Röntgen und Bildgebung (Imaging)
  {
    number: "G1",
    description: "Einfache Röntgenaufnahme (eine Aufnahme, ein Röntgenbild)",
    baseFee: 20.00,
    category: "G",
    minFactor: 1.0,
    maxFactor: 3.0,
    typicalFactor: 2.0,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "G2",
    description: "Mehrere Röntgenaufnahmen oder spezielle Aufnahmetechnik",
    baseFee: 35.00,
    category: "G",
    minFactor: 1.0,
    maxFactor: 3.5,
    typicalFactor: 2.2,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "G3",
    description: "Ultraschalluntersuchung (Abdomen, Herz, Schwangerschaft)",
    baseFee: 40.00,
    category: "G",
    minFactor: 1.0,
    maxFactor: 3.5,
    typicalFactor: 2.0,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "G4",
    description: "Endoskopie (Gastroskopie, Bronchoskopie, Rektoskopie)",
    baseFee: 60.00,
    category: "G",
    minFactor: 1.0,
    maxFactor: 3.5,
    typicalFactor: 2.5,
    isTimeBased: false,
    requiresDocumentation: true,
  },

  // Category H - Laboruntersuchungen (Laboratory)
  {
    number: "H1",
    description: "Einfache Laboruntersuchung (z.B. Blutzucker, Harnuntersuchung Streifen)",
    baseFee: 12.00,
    category: "H",
    minFactor: 1.0,
    maxFactor: 2.5,
    typicalFactor: 1.5,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "H2",
    description: "Mittelschwere Laboruntersuchung (z.B. Blutbild, Gerinnung)",
    baseFee: 20.00,
    category: "H",
    minFactor: 1.0,
    maxFactor: 3.0,
    typicalFactor: 1.8,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "H3",
    description: "Schwere Laboruntersuchung (z.B. Biochemie-Panel, Hormonanalytik)",
    baseFee: 35.00,
    category: "H",
    minFactor: 1.0,
    maxFactor: 3.0,
    typicalFactor: 2.0,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "H4",
    description: "Laboruntersuchung mit Materialentnahme (Blutabnahme, Punktion)",
    baseFee: 15.00,
    category: "H",
    minFactor: 1.0,
    maxFactor: 2.5,
    typicalFactor: 1.5,
    isTimeBased: false,
    requiresDocumentation: true,
  },

  // Category I - Sonstige Leistungen (Other)
  {
    number: "I1",
    description: "Tierärztliches Zeugnis, Gesundheitszeugnis, Impfzeugnis",
    baseFee: 15.00,
    category: "I",
    minFactor: 1.0,
    maxFactor: 2.0,
    typicalFactor: 1.5,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "I2",
    description: "Betäubung/Narkose (einfach, ohne Operation)",
    baseFee: 25.00,
    category: "I",
    minFactor: 1.0,
    maxFactor: 3.0,
    typicalFactor: 2.0,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "I3",
    description: "Euthanasie mit Körperübergabe",
    baseFee: 40.00,
    category: "I",
    minFactor: 1.0,
    maxFactor: 3.0,
    typicalFactor: 2.0,
    isTimeBased: false,
    requiresDocumentation: true,
  },
  {
    number: "I4",
    description: "Hausbesuch (Fahrzeit und Aufwand, pro Kilometer)",
    baseFee: 1.50,
    category: "I",
    minFactor: 1.0,
    maxFactor: 2.0,
    typicalFactor: 1.5,
    isTimeBased: false,
    requiresDocumentation: true,
    notes: "Pro Kilometer Entfernung",
  },
  {
    number: "I5",
    description: "Telefonische oder schriftliche Beratung (ohne Vorstellung des Tieres)",
    baseFee: 10.00,
    category: "I",
    minFactor: 1.0,
    maxFactor: 2.0,
    typicalFactor: 1.2,
    isTimeBased: false,
    requiresDocumentation: true,
  },
];

// Helper function to calculate fee
export function calculateGOAEVFee(
  position: GOAEVPosition,
  factor: number,
  duration?: number
): number {
  let fee = position.baseFee * factor;

  if (position.isTimeBased && duration && position.timeMinutes) {
    const timeMultiplier = duration / position.timeMinutes;
    fee *= Math.max(1, timeMultiplier);
  }

  return Math.round(fee * 100) / 100;
}

// Get positions by category
export function getPositionsByCategory(category: string): GOAEVPosition[] {
  return GOAEV_POSITIONS.filter((p) => p.category === category);
}

// Search positions
export function searchPositions(query: string): GOAEVPosition[] {
  const lowerQuery = query.toLowerCase();
  return GOAEV_POSITIONS.filter(
    (p) =>
      p.number.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery)
  );
}

// VAT rates for veterinary services in Germany
export const VAT_RATES = {
  standard: 19, // Standard rate for medications, products
  reduced: 7,   // Reduced rate for some agricultural services
  exempt: 0,    // Medical services are typically VAT-exempt for veterinary
};

// Calculate invoice total
export function calculateInvoiceTotal(
  items: GOAEVCalculation[],
  vatRate: number = 0
): { subtotal: number; vatAmount: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.calculatedFee, 0);
  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
  const total = subtotal + vatAmount;

  return { subtotal, vatAmount, total };
}

// Get category name in German
export function getCategoryName(category: string): string {
  return GOAEV_CATEGORIES[category as keyof typeof GOAEV_CATEGORIES]?.name || category;
}

// Default factor explanation
export function getFactorExplanation(factor: number): string {
  if (factor <= 1.0) return "Einfacher Fall";
  if (factor <= 1.5) return "Leichte Erhöhung";
  if (factor <= 2.0) return "Mittlere Erhöhung";
  if (factor <= 2.5) return "Erhebliche Erhöhung";
  if (factor <= 3.0) return "Schwieriger Fall";
  if (factor <= 4.0) return "Sehr schwieriger Fall";
  return "Außergewöhnlich schwieriger Fall";
}

// Common billing scenarios with pre-calculated typical fees
export const COMMON_BILLING_SCENARIOS = [
  {
    name: "Erstuntersuchung Hund/Katze",
    items: [
      { position: "A1", factor: 1.8, notes: "Allgemeine Untersuchung" },
      { position: "B2", factor: 1.5, notes: "Beratung" },
    ],
  },
  {
    name: "Jährliche Impfung",
    items: [
      { position: "A1", factor: 1.5, notes: "Kurze Untersuchung" },
      { position: "F2", factor: 1.8, notes: "Impfung mit Untersuchung" },
    ],
  },
  {
    name: "Kastration Hund/Katze",
    items: [
      { position: "A2", factor: 2.0, notes: "Voruntersuchung" },
      { position: "D1", factor: 2.0, notes: "Einfache Operation" },
      { position: "I2", factor: 2.0, notes: "Narkose" },
    ],
  },
  {
    name: "Zahnreinigung mit Narkose",
    items: [
      { position: "A2", factor: 1.8, notes: "Voruntersuchung" },
      { position: "D1", factor: 2.0, notes: "Zahnreinigung" },
      { position: "I2", factor: 2.0, notes: "Narkose" },
    ],
  },
  {
    name: "Röntgen-Untersuchung",
    items: [
      { position: "A1", factor: 1.5, notes: "Kurze Untersuchung" },
      { position: "G1", factor: 2.0, notes: "Einfache Aufnahme" },
    ],
  },
  {
    name: "Blutuntersuchung",
    items: [
      { position: "A1", factor: 1.5, notes: "Kurze Untersuchung" },
      { position: "H4", factor: 1.5, notes: "Blutabnahme" },
      { position: "H2", factor: 1.8, notes: "Blutbild" },
    ],
  },
  {
    name: "Notfallbehandlung",
    items: [
      { position: "C4", factor: 3.5, notes: "Notfallbehandlung" },
      { position: "A2", factor: 2.0, notes: "Erweiterte Untersuchung" },
    ],
  },
  {
    name: "Ultraschall-Untersuchung",
    items: [
      { position: "A1", factor: 1.5, notes: "Kurze Untersuchung" },
      { position: "G3", factor: 2.0, notes: "Ultraschall" },
    ],
  },
];
