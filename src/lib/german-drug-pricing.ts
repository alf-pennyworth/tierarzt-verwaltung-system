// German Veterinary Drug Pricing Calculator
// Implements Arzneimittelpreisverordnung (AMPreisV) pricing logic
// Source: https://de.wikipedia.org/wiki/Arzneimittelpreisverordnung

export interface DrugPricing {
  drugName: string;
  herstellerAbgabePreis: number; // Manufacturer price (excl. VAT)
  arzneimittelpreis?: number; // Drug price (same as HAP for single-source)
  mwstSatz: number; // VAT rate (usually 19% for human, varies for vet)
  packungsGroesse: string;
  darreichungsform: string;
}

// AMPreisV calculation parameters (as of 2024)
const APOTHEKEN_MARGE_PROZENT = 0.03; // 3%
const APOTHEKEN_FESTZUSCHLAG = 8.35; // €8.35
const NOTDIENST_FONDS = 0.21; // €0.21
const PHARMA_DIENSTLEISTUNG = 0.20; // €0.20
const GKV_RABATT = 1.68; // €1.68 (netto)

/**
 * Calculate Apothekenverkaufspreis (AVP) - pharmacy retail price
 * Formula: (HAP * 1.03 + 8.35 + 0.21 + 0.20) * 1.19
 * For veterinary: simplified as (HAP * 1.03 + 8.76) * 1.19
 */
export function calculateAVP(herstellerAbgabePreis: number): {
  nettoPreis: number;
  bruttoPreis: number;
  mwst: number;
  apothekenMarge: number;
  festzuschlag: number;
  breakdown: {
    herstellerPreis: number;
    margeProzent: number;
    festzuschlagGesamt: number;
    notdienstFonds: number;
    pharmaDienstleistung: number;
    netto: number;
    mwst: number;
    brutto: number;
  };
} {
  const margeProzent = herstellerAbgabePreis * APOTHEKEN_MARGE_PROZENT;
  const festzuschlagGesamt = APOTHEKEN_FESTZUSCHLAG + NOTDIENST_FONDS + PHARMA_DIENSTLEISTUNG;
  const nettoPreis = herstellerAbgabePreis + margeProzent + festzuschlagGesamt;
  const mwst = nettoPreis * 0.19; // 19% VAT for veterinary products
  const bruttoPreis = nettoPreis + mwst;

  return {
    nettoPreis: Math.round(nettoPreis * 100) / 100,
    bruttoPreis: Math.round(bruttoPreis * 100) / 100,
    mwst: Math.round(mwst * 100) / 100,
    apothekenMarge: Math.round(margeProzent * 100) / 100,
    festzuschlag: festzuschlagGesamt,
    breakdown: {
      herstellerPreis: herstellerAbgabePreis,
      margeProzent,
      festzuschlagGesamt,
      notdienstFonds: NOTDIENST_FONDS,
      pharmaDienstleistung: PHARMA_DIENSTLEISTUNG,
      netto: nettoPreis,
      mwst,
      brutto: bruttoPreis,
    },
  };
}

/**
 * Calculate practice cost (what vet pays to pharmacy)
 * Usually AVP minus some discount
 */
export function calculatePracticeCost(
  avp: number,
  rabattProzent: number = 5 // Typical 5% vet discount
): {
  rabattBetrag: number;
  endPreis: number;
} {
  const rabattBetrag = avp * (rabattProzent / 100);
  const endPreis = avp - rabattBetrag;
  return {
    rabattBetrag: Math.round(rabattBetrag * 100) / 100,
    endPreis: Math.round(endPreis * 100) / 100,
  };
}

// Sample veterinary drug prices (Herstellerabgabepreis in €)
// These would normally come from pharmacy data feeds
export const veterinaryDrugPrices: DrugPricing[] = [
  { drugName: "Amoxicillin 500mg (100 Tab)", herstellerAbgabePreis: 12.50, packungsGroesse: "100", darreichungsform: "Tabletten" },
  { drugName: "Metacam 1.5mg/ml (32ml)", herstellerAbgabePreis: 18.90, packungsGroesse: "32ml", darreichungsform: "Suspension" },
  { drugName: "Baytril 25mg/ml (10ml)", herstellerAbgabePreis: 15.20, packungsGroesse: "10ml", darreichungsform: "Suspension" },
  { drugName: "Synulox 62.5mg (100 Tab)", herstellerAbgabePreis: 22.40, packungsGroesse: "100", darreichungsform: "Tabletten" },
  { drugName: "Drontal Plus (1 Tab)", herstellerAbgabePreis: 4.80, packungsGroesse: "1", darreichungsform: "Tablette" },
  { drugName: "Stronghold 60mg (3 Pip)", herstellerAbgabePreis: 24.90, packungsGroesse: "3", darreichungsform: "Spot-on" },
  { drugName: "Caninsulin 40U/ml (10ml)", herstellerAbgabePreis: 35.60, packungsGroesse: "10ml", darreichungsform: "Injektion" },
  { drugName: "Fortekor 5mg (100 Tab)", herstellerAbgabePreis: 28.50, packungsGroesse: "100", darreichungsform: "Tabletten" },
  { drugName: "Vetmedin 1.25mg (100 Kaps)", herstellerAbgabePreis: 42.80, packungsGroesse: "100", darreichungsform: "Kapseln" },
  { drugName: "Prednisolon 5mg (100 Tab)", herstellerAbgabePreis: 8.90, packungsGroesse: "100", darreichungsform: "Tabletten" },
  { drugName: "Rimadyl 50mg (100 Tab)", herstellerAbgabePreis: 45.20, packungsGroesse: "100", darreichungsform: "Tabletten" },
  { drugName: "Carprofen 50mg (100 Tab)", herstellerAbgabePreis: 38.90, packungsGroesse: "100", darreichungsform: "Tabletten" },
  { drugName: "Marbocyl 20mg (100 Tab)", herstellerAbgabePreis: 32.50, packungsGroesse: "100", darreichungsform: "Tabletten" },
  { drugName: "Doxycyclin 100mg (100 Tab)", herstellerAbgabePreis: 16.80, packungsGroesse: "100", darreichungsform: "Tabletten" },
  { drugName: "Clavaseptin 50mg (100 Tab)", herstellerAbgabePreis: 19.50, packungsGroesse: "100", darreichungsform: "Tabletten" },
];

export function findDrugPrice(drugName: string): DrugPricing | undefined {
  return veterinaryDrugPrices.find(
    (d) => d.drugName.toLowerCase().includes(drugName.toLowerCase())
  );
}

export function calculateTotalCost(
  drugName: string,
  quantity: number = 1
): {
  einzelpreis: number;
  gesamtpreis: number;
  rabatt: number;
  nachRabatt: number;
  mwst: number;
  brutto: number;
} | null {
  const drug = findDrugPrice(drugName);
  if (!drug) return null;

  const avp = calculateAVP(drug.herstellerAbgabePreis);
  const practice = calculatePracticeCost(avp.bruttoPreis);

  return {
    einzelpreis: avp.bruttoPreis,
    gesamtpreis: avp.bruttoPreis * quantity,
    rabatt: practice.rabattBetrag * quantity,
    nachRabatt: practice.endPreis * quantity,
    mwst: avp.mwst * quantity,
    brutto: avp.bruttoPreis * quantity,
  };
}

// Format price for display
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

// Calculate price per unit (e.g., per tablet, per ml)
export function calculatePricePerUnit(
  drugName: string,
  unitsInPack: number
): { unitPrice: number; unitType: string } | null {
  const drug = findDrugPrice(drugName);
  if (!drug) return null;

  const avp = calculateAVP(drug.herstellerAbgabePreis);
  const unitPrice = avp.bruttoPreis / unitsInPack;

  let unitType = "Stück";
  if (drug.darreichungsform === "Suspension" || drug.darreichungsform === "Injektion") {
    unitType = "ml";
  }

  return {
    unitPrice: Math.round(unitPrice * 100) / 100,
    unitType,
  };
}
