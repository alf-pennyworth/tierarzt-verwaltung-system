// Drug interaction database for veterinary medications
// Based on common DACH market veterinary drugs

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: "contraindicated" | "major" | "moderate" | "minor";
  mechanism: string;
  effect: string;
  recommendation: string;
  source: string;
}

export interface DrugInfo {
  name: string;
  category: string;
  commonTradeNames: string[];
  species: string[];
  contraindications: string[];
  commonSideEffects: string[];
  maxDosage?: string;
  notes?: string;
}

export const DRUG_INTERACTIONS: DrugInteraction[] = [
  // NSAIDs interactions
  {
    drug1: "Metacam (Meloxicam)",
    drug2: "Prednisolon",
    severity: "major",
    mechanism: "Additive GI toxicity",
    effect: "Erhöhtes Risiko für Magen-Darm-Ulzerationen und Blutungen",
    recommendation: "Kombination vermeiden; falls erforderlich, Magenschutz geben",
    source: "Plumb's Veterinary Drug Handbook",
  },
  {
    drug1: "Metacam (Meloxicam)",
    drug2: "Furosemid",
    severity: "moderate",
    mechanism: "Verminderte Natriurese",
    effect: "Reduzierte Wirksamkeit von Furosemid",
    recommendation: "Überwachung der Nierenfunktion erforderlich",
    source: "Plumb's Veterinary Drug Handbook",
  },
  {
    drug1: "Metacam (Meloxicam)",
    drug2: "Enalapril",
    severity: "moderate",
    mechanism: "Additive Nierentoxizität",
    effect: "Erhöhtes Risiko für Niereninsuffizienz",
    recommendation: "Nierenfunktion überwachen, ausreichend hydrieren",
    source: "Plumb's Veterinary Drug Handbook",
  },
  {
    drug1: "Carprofen",
    drug2: "Prednisolon",
    severity: "major",
    mechanism: "Additive GI toxicity",
    effect: "Erhöhtes Risiko für Magen-Darm-Ulzerationen",
    recommendation: "Kombination vermeiden",
    source: "Plumb's Veterinary Drug Handbook",
  },

  // Corticosteroids
  {
    drug1: "Prednisolon",
    drug2: "Furosemid",
    severity: "moderate",
    mechanism: "Hypokaliämie",
    effect: "Erhöhtes Risiko für Kalium-Mangel",
    recommendation: "Kaliumspiegel überwachen",
    source: "Plumb's Veterinary Drug Handbook",
  },
  {
    drug1: "Prednisolon",
    drug2: "Insulin",
    severity: "major",
    mechanism: "Insulinresistenz",
    effect: "Erhöhte Blutzuckerwerte, reduzierte Insulinwirkung",
    recommendation: "Insulindosis anpassen, Blutzucker überwachen",
    source: "Plumb's Veterinary Drug Handbook",
  },

  // Antibiotics
  {
    drug1: "Amoxicillin/Clavulansäure",
    drug2: "Probenecid",
    severity: "moderate",
    mechanism: "Verminderte renale Ausscheidung",
    effect: "Erhöhte Amoxicillin-Spiegel",
    recommendation: "Dosisreduktion erwägen",
    source: "Plumb's Veterinary Drug Handbook",
  },
  {
    drug1: "Enrofloxacin",
    drug2: "Sucralfat",
    severity: "moderate",
    mechanism: "Chelation",
    effect: "Verminderte Enrofloxacin-Absorption",
    recommendation: "Zeitlichen Abstand von 2 Stunden einhalten",
    source: "Plumb's Veterinary Drug Handbook",
  },
  {
    drug1: "Enrofloxacin",
    drug2: "Eisenpräparate",
    severity: "moderate",
    mechanism: "Chelation",
    effect: "Verminderte Enrofloxacin-Absorption",
    recommendation: "Zeitlichen Abstand von 2 Stunden einhalten",
    source: "Plumb's Veterinary Drug Handbook",
  },
  {
    drug1: "Enrofloxacin",
    drug2: "Theophyllin",
    severity: "major",
    mechanism: "Hepatische Metabolismushemmung",
    effect: "Erhöhte Theophyllin-Spiegel, Toxizitätsrisiko",
    recommendation: "Theophyllin-Dosis reduzieren, Spiegel messen",
    source: "Plumb's Veterinary Drug Handbook",
  },
  {
    drug1: "Doxycyclin",
    drug2: "Calcium",
    severity: "moderate",
    mechanism: "Chelation",
    effect: "Verminderte Doxycyclin-Absorption",
    recommendation: "Zeitlichen Abstand von 2 Stunden einhalten",
    source: "Plumb's Veterinary Drug Handbook",
  },
  {
    drug1: "Doxycyclin",
    drug2: "Eisen",
    severity: "moderate",
    mechanism: "Chelation",
    effect: "Verminderte Doxycyclin-Absorption",
    recommendation: "Zeitlichen Abstand von 2 Stunden einhalten",
    source: "Plumb's Veterinary Drug Handbook",
  },

  // Heart medications
  {
    drug1: "Digoxin",
    drug2: "Furosemid",
    severity: "major",
    mechanism: "Hypokaliämie verstärkt Digoxin-Toxizität",
    effect: "Erhöhtes Risiko für Digoxin-Intoxikation",
    recommendation: "Kaliumspiegel engmaschig überwachen",
    source: "Plumb's Veterinary Drug Handbook",
  },
  {
    drug1: "Digoxin",
    drug2: "Enalapril",
    severity: "moderate",
    mechanism: "Additiver Effekt auf AV-Knoten",
    effect: "Bradykardie, AV-Block",
    recommendation: "Herzfrequenz überwachen",
    source: "Plumb's Veterinary Drug Handbook",
  },
  {
    drug1: "Pimobendan",
    drug2: "Verapamil",
    severity: "contraindicated",
    mechanism: "Negative Inotropie",
    effect: "Herzversagen kann sich verschlechtern",
    recommendation: "Kombination kontraindiziert",
    source: "Plumb's Veterinary Drug Handbook",
  },

  // Anticonvulsants
  {
    drug1: "Phenobarbital",
    drug2: "Prednisolon",
    severity: "moderate",
    mechanism: "Hepatische Enzyminduktion",
    effect: "Beschleunigter Prednisolon-Abbau",
    recommendation: "Prednisolon-Dosis erhöhen",
    source: "Plumb's Veterinary Drug Handbook",
  },
  {
    drug1: "Phenobarbital",
    drug2: "Chloramphenicol",
    severity: "major",
    mechanism: "Hepatische Enzymhemmung",
    effect: "Erhöhte Phenobarbital-Spiegel",
    recommendation: "Phenobarbital-Dosis reduzieren",
    source: "Plumb's Veterinary Drug Handbook",
  },

  // Anesthesia
  {
    drug1: "Acepromazin",
    drug2: "Propofol",
    severity: "moderate",
    mechanism: "Additive hypotensive Wirkung",
    effect: "Hypotonie",
    recommendation: "Vorsicht bei kardiovaskulär kompromittierten Patienten",
    source: "Plumb's Veterinary Drug Handbook",
  },
  {
    drug1: "Ketamin",
    drug2: "Xylazin",
    severity: "moderate",
    mechanism: "Additiver kardiovaskulärer Effekt",
    effect: "Herz-Kreislauf-Depression",
    recommendation: "Monitoring erforderlich",
    source: "Plumb's Veterinary Drug Handbook",
  },

  // Thyroid
  {
    drug1: "L-Thyroxin",
    drug2: "Phenobarbital",
    severity: "moderate",
    mechanism: "Beschleunigter Abbau",
    effect: "Erhöhter Thyroxinbedarf",
    recommendation: "Thyroxindosis anpassen",
    source: "Plumb's Veterinary Drug Handbook",
  },

  // Antiparasitics
  {
    drug1: "Ivermectin",
    drug2: "P-Glykoprotein-Inhibitoren",
    severity: "contraindicated",
    mechanism: "Verminderter Auswurf",
    effect: "Neurotoxizität ( besonders bei Collies, Shelties)",
    recommendation: "Strikt kontraindiziert bei MDR1-Mutation",
    source: "Plumb's Veterinary Drug Handbook",
  },
  {
    drug1: "Milbemycin",
    drug2: "P-Glykoprotein-Inhibitoren",
    severity: "contraindicated",
    mechanism: "Verminderter Auswurf",
    effect: "Neurotoxizität",
    recommendation: "Strikt kontraindiziert bei MDR1-Mutation",
    source: "Plumb's Veterinary Drug Handbook",
  },

  // Diuretics
  {
    drug1: "Furosemid",
    drug2: "Gentamicin",
    severity: "major",
    mechanism: "Additive Nephrotoxizität",
    effect: "Erhöhtes Risiko für Nierenschäden",
    recommendation: "Nierenfunktion überwachen, ausreichend hydrieren",
    source: "Plumb's Veterinary Drug Handbook",
  },
  {
    drug1: "Furosemid",
    drug2: "Aminoglykoside",
    severity: "major",
    mechanism: "Additive Nephrotoxizität",
    effect: "Erhöhtes Risiko für Nierenschäden",
    recommendation: "Nierenfunktion überwachen",
    source: "Plumb's Veterinary Drug Handbook",
  },

  // Anticoagulants
  {
    drug1: "Warfarin",
    drug2: "Metacam (Meloxicam)",
    severity: "major",
    mechanism: "Additive Blutungsneigung",
    effect: "Erhöhtes Blutungsrisiko",
    recommendation: "Kombination vermeiden",
    source: "Plumb's Veterinary Drug Handbook",
  },
  {
    drug1: "Clopidogrel",
    drug2: "NSAIDs",
    severity: "major",
    mechanism: "Additive Blutungsneigung",
    effect: "Erhöhtes Blutungsrisiko",
    recommendation: "Kombination vermeiden",
    source: "Plumb's Veterinary Drug Handbook",
  },
];

// Common veterinary drugs database
export const DRUG_DATABASE: DrugInfo[] = [
  {
    name: "Meloxicam (Metacam)",
    category: "NSAID",
    commonTradeNames: ["Metacam", "Loxicom", "Meloxidyl"],
    species: ["Hund", "Katze", "Pferd"],
    contraindications: [
      "Schwangerschaft",
      "Stillzeit",
      "Niereninsuffizienz",
      "Magen-Darm-Geschwüre",
    ],
    commonSideEffects: [
      "Erbrechen",
      "Durchfall",
      "Appetitlosigkeit",
      "Nierenfunktionsstörung",
    ],
    notes: "Nie mit anderen NSAIDs oder Steroiden kombinieren",
  },
  {
    name: "Carprofen",
    category: "NSAID",
    commonTradeNames: ["Rimadyl", "Carprodyl", "Norocarp"],
    species: ["Hund"],
    contraindications: [
      "Lebererkrankung",
      "Niereninsuffizienz",
      "Blutungsstörungen",
    ],
    commonSideEffects: [
      "Leberenzymanstieg",
      "Erbrechen",
      "Durchfall",
      "Nierenfunktionsstörung",
    ],
    notes: "Leberfunktion überwachen",
  },
  {
    name: "Prednisolon",
    category: "Kortikosteroid",
    commonTradeNames: ["Prednisolon", "Precortalon"],
    species: ["Hund", "Katze", "Pferd", "Klein tiere"],
    contraindications: [
      "Diabetes mellitus",
      "Schwangerschaft",
      "Systemische Pilzinfektionen",
    ],
    commonSideEffects: [
      "Polyurie",
      "Polydipsie",
      "Appetitsteigerung",
      "Immunsuppression",
    ],
    notes: "Nie abrupt absetzen",
  },
  {
    name: "Amoxicillin/Clavulansäure",
    category: "Antibiotikum",
    commonTradeNames: ["Clavaseptin", "Synulox", "Augmentin"],
    species: ["Hund", "Katze", "Kleinti ere"],
    contraindications: ["Penicillin-Allergie", "Kaninchen"],
    commonSideEffects: [
      "Erbrechen",
      "Durchfall",
      "Appetitlosigkeit",
      "Hautausschlag",
    ],
    notes: "Nie bei Kaninchen verwenden (tödliche Dysbiose)",
  },
  {
    name: "Enrofloxacin",
    category: "Fluorochinolon",
    commonTradeNames: ["Baytril", "Enrotron"],
    species: ["Hund", "Katze", "Vögel", "Reptilien"],
    contraindications: [
      "Wachstumsphase (Gelenkschäden)",
      "Schwangerschaft",
      "Epilepsie",
    ],
    commonSideEffects: [
      "Erbrechen",
      "Durchfall",
      "Gelenkschmerzen (bei Jungtieren)",
      "Sehstörungen (Katzen)",
    ],
    notes: "Bei Katzen: Retinopathie-Risiko, nie überdosieren",
  },
  {
    name: "Doxycyclin",
    category: "Tetrazyklin",
    commonTradeNames: ["Doxycyclin", "Ronaxan", "Doxyferm"],
    species: ["Hund", "Katze", "Vögel"],
    contraindications: [
      "Schwangerschaft",
      "Leberinsuffizienz",
      "Wachstumsphase",
    ],
    commonSideEffects: [
      "Ösophagitis (bei Katzen)",
      "Durchfall",
      "Photosensibilisierung",
    ],
    notes: "Immer mit Wasser oder Futter geben (Ösophagitis vermeiden)",
  },
  {
    name: "Pimobendan",
    category: "Inodilator",
    commonTradeNames: ["Vetmedin"],
    species: ["Hund"],
    contraindications: [
      "Hypertrophe Kardiomyopathie",
      "Aortenstenose",
      "Schwangerschaft",
    ],
    commonSideEffects: [
      "Erbrechen",
      "Durchfall",
      "Appetitlosigkeit",
      "Tachykardie",
    ],
    notes: "Lebenswichtig bei DCM und MVD",
  },
  {
    name: "Furosemid",
    category: "Diuretikum",
    commonTradeNames: ["Furosemid", "Lasix"],
    species: ["Hund", "Katze", "Pferd"],
    contraindications: [
      "Anurie",
      "Dehydration",
      "Elektrolytungleichgewicht",
    ],
    commonSideEffects: [
      "Polyurie",
      "Dehydration",
      "Hypokaliämie",
      "Hyponatriämie",
    ],
    notes: "Kalium überwachen",
  },
  {
    name: "Insulin",
    category: "Antidiabetikum",
    commonTradeNames: ["Caninsulin", "Lantus", "ProZinc"],
    species: ["Hund", "Katze"],
    contraindications: ["Hypoglykämie", "Ketoazidose (ohne Flüssigkeit)"],
    commonSideEffects: [
      "Hypoglykämie",
      "Lipodystrophie",
      "Insulinresistenz",
    ],
    notes: "Blutzucker engmaschig überwachen",
  },
  {
    name: "Phenobarbital",
    category: "Antikonvulsivum",
    commonTradeNames: ["Phenobarbital", "Epiphen"],
    species: ["Hund", "Katze"],
    contraindications: ["Leberinsuffizienz", "Anämie", "Atemdepression"],
    commonSideEffects: [
      "Sedierung",
      "Polyurie",
      "Polydipsie",
      "Lebertoxizität",
      "Appetitsteigerung",
    ],
    notes: "Leberfunktion regelmäßig überwachen",
  },
  {
    name: "Ivermectin",
    category: "Antiparasitikum",
    commonTradeNames: ["Ivomec", "Stronghold"],
    species: ["Hund", "Katze", "Pferd", "Rinder"],
    contraindications: [
      "MDR1-Mutation (Collies, Shelties)",
      "Jungtiere",
      "Schwangerschaft",
    ],
    commonSideEffects: [
      "Neurotoxizität (bei MDR1)",
      "Erbrechen",
      "Diarrhö",
    ],
    notes: "MDR1-Test empfohlen bei sensiblen Rassen",
  },
];

// Check interactions between a list of drugs
export function checkDrugInteractions(drugs: string[]): DrugInteraction[] {
  const interactions: DrugInteraction[] = [];

  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const found = DRUG_INTERACTIONS.filter(
        (interaction) =>
          (interaction.drug1.toLowerCase().includes(drugs[i].toLowerCase()) &&
            interaction.drug2.toLowerCase().includes(drugs[j].toLowerCase())) ||
          (interaction.drug1.toLowerCase().includes(drugs[j].toLowerCase()) &&
            interaction.drug2.toLowerCase().includes(drugs[i].toLowerCase()))
      );
      interactions.push(...found);
    }
  }

  return interactions;
}

// Get drug info
export function getDrugInfo(drugName: string): DrugInfo | undefined {
  return DRUG_DATABASE.find(
    (drug) =>
      drug.name.toLowerCase().includes(drugName.toLowerCase()) ||
      drug.commonTradeNames.some((tn) =>
        tn.toLowerCase().includes(drugName.toLowerCase())
      )
  );
}

// Search drugs
export function searchDrugs(query: string): DrugInfo[] {
  const lowerQuery = query.toLowerCase();
  return DRUG_DATABASE.filter(
    (drug) =>
      drug.name.toLowerCase().includes(lowerQuery) ||
      drug.commonTradeNames.some((tn) =>
        tn.toLowerCase().includes(lowerQuery)
      ) ||
      drug.category.toLowerCase().includes(lowerQuery)
  );
}

// Severity color mapping
export const SEVERITY_COLORS = {
  contraindicated: "bg-red-600",
  major: "bg-red-500",
  moderate: "bg-amber-500",
  minor: "bg-yellow-400",
};

export const SEVERITY_LABELS = {
  contraindicated: "Kontraindiziert",
  major: "Schwerwiegend",
  moderate: "Moderat",
  minor: "Gering",
};
