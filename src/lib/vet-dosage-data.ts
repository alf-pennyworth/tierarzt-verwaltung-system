// German Veterinary Dosage Database
// Species/weight-based dosing for common veterinary medications
// Sources: Dosing guidelines from UPD, EMA, standard veterinary references

export interface DosageEntry {
  drugName: string;
  activeIngredient: string;
  targetSpecies: string[];
  indications: string[];
  contraindications: string[];
  dosages: {
    species: string;
    route: string; // oral, iv, im, sc, topical
    doseRange: { min: number; max: number; unit: string }; // mg/kg or ml/kg
    frequency: string; // BID, TID, q24h, etc.
    duration: string;
    maxDailyDose?: number;
    notes?: string;
  }[];
  formulations: {
    strength: string;
    form: string; // tablet, suspension, injectable
    sizes: string[];
  }[];
  safetyMargins: {
    ld50?: string;
    toxicDose?: string;
    overdoseSymptoms?: string[];
  };
  specialPopulations: {
    puppiesKittens?: string;
    pregnant?: string;
    renal?: string;
    hepatic?: string;
  };
}

export const dosageDatabase: DosageEntry[] = [
  {
    drugName: "Amoxicillin",
    activeIngredient: "Amoxicillin",
    targetSpecies: ["dog", "cat", "rabbit"],
    indications: ["Bacterial infections", "UTI", "Skin infections", "Respiratory infections"],
    contraindications: ["Penicillin allergy"],
    dosages: [
      {
        species: "dog",
        route: "oral",
        doseRange: { min: 10, max: 20, unit: "mg/kg" },
        frequency: "BID",
        duration: "7-14 days",
        notes: "Give with food to reduce GI upset",
      },
      {
        species: "cat",
        route: "oral",
        doseRange: { min: 10, max: 15, unit: "mg/kg" },
        frequency: "BID",
        duration: "7-14 days",
      },
      {
        species: "rabbit",
        route: "oral",
        doseRange: { min: 15, max: 30, unit: "mg/kg" },
        frequency: "BID",
        duration: "7-10 days",
        notes: "Essential for rabbit GI stasis",
      },
    ],
    formulations: [
      { strength: "50 mg", form: "tablet", sizes: ["50mg", "100mg", "250mg", "500mg"] },
      { strength: "50 mg/ml", form: "suspension", sizes: ["15ml", "30ml"] },
    ],
    safetyMargins: {
      overdoseSymptoms: ["Vomiting", "Diarrhea", "Neurological signs"],
    },
    specialPopulations: {
      renal: "Reduce dose in severe renal impairment",
    },
  },
  {
    drugName: "Metacam",
    activeIngredient: "Meloxicam",
    targetSpecies: ["dog", "cat", "rabbit", "guinea pig"],
    indications: ["Pain", "Inflammation", "Osteoarthritis", "Post-operative"],
    contraindications: ["GI ulceration", "Renal impairment", "Dehydration"],
    dosages: [
      {
        species: "dog",
        route: "oral",
        doseRange: { min: 0.1, max: 0.2, unit: "mg/kg" },
        frequency: "SID",
        duration: "As needed",
        notes: "Start with loading dose of 0.2 mg/kg",
      },
      {
        species: "cat",
        route: "oral",
        doseRange: { min: 0.025, max: 0.05, unit: "mg/kg" },
        frequency: "SID-BID",
        duration: "Max 5 days (chronic use risk)",
        notes: "Cats are sensitive - use lowest effective dose",
      },
      {
        species: "rabbit",
        route: "oral",
        doseRange: { min: 0.3, max: 0.6, unit: "mg/kg" },
        frequency: "SID-BID",
        duration: "3-5 days",
        notes: "Essential for post-op pain management",
      },
      {
        species: "guinea pig",
        route: "oral",
        doseRange: { min: 0.2, max: 0.5, unit: "mg/kg" },
        frequency: "BID",
        duration: "3-5 days",
      },
    ],
    formulations: [
      { strength: "1.5 mg/ml", form: "suspension", sizes: ["10ml", "32ml", "100ml"] },
      { strength: "0.5 mg/ml", form: "suspension", sizes: ["10ml"] },
      { strength: "5 mg/ml", form: "injectable", sizes: ["5ml vial"] },
    ],
    safetyMargins: {
      toxicDose: ">0.5 mg/kg in cats",
      overdoseSymptoms: ["Vomiting", "GI ulceration", "Renal failure"],
    },
    specialPopulations: {
      renal: "Avoid or reduce dose",
      hepatic: "Use with caution",
    },
  },
  {
    drugName: "Baytril",
    activeIngredient: "Enrofloxacin",
    targetSpecies: ["dog", "cat", "rabbit", "guinea pig"],
    indications: ["Bacterial infections", "UTI", "Respiratory infections", "Wounds"],
    contraindications: ["Young growing animals (cartilage damage)", "Seizure disorders"],
    dosages: [
      {
        species: "dog",
        route: "oral",
        doseRange: { min: 5, max: 20, unit: "mg/kg" },
        frequency: "SID",
        duration: "7-14 days",
        notes: "Use lower dose for UTI, higher for deep infections",
      },
      {
        species: "cat",
        route: "oral",
        doseRange: { min: 5, max: 10, unit: "mg/kg" },
        frequency: "SID",
        duration: "7-14 days",
        maxDailyDose: 5,
        notes: "Retinal toxicity risk at higher doses",
      },
      {
        species: "rabbit",
        route: "oral",
        doseRange: { min: 10, max: 20, unit: "mg/kg" },
        frequency: "BID",
        duration: "7-14 days",
        notes: "Safe for rabbits unlike some other fluoroquinolones",
      },
      {
        species: "guinea pig",
        route: "oral",
        doseRange: { min: 5, max: 10, unit: "mg/kg" },
        frequency: "BID",
        duration: "7-10 days",
      },
    ],
    formulations: [
      { strength: "25 mg/ml", form: "suspension", sizes: ["10ml", "30ml"] },
      { strength: "50 mg/ml", form: "injectable", sizes: ["20ml vial"] },
      { strength: "150 mg", form: "tablet", sizes: ["tablet"] },
    ],
    safetyMargins: {
      toxicDose: ">20 mg/kg in cats (retinal damage)",
      overdoseSymptoms: ["Vomiting", "Seizures", "Blindness (cats)"],
    },
    specialPopulations: {
      puppiesKittens: "Avoid in animals <12 months (cartilage)",
      pregnant: "Use with caution",
    },
  },
  {
    drugName: "Synulox",
    activeIngredient: "Amoxicillin + Clavulanic acid",
    targetSpecies: ["dog", "cat", "rabbit"],
    indications: ["Bacterial infections", "Abscesses", "Wounds", "Respiratory infections"],
    contraindications: ["Penicillin allergy"],
    dosages: [
      {
        species: "dog",
        route: "oral",
        doseRange: { min: 12.5, max: 25, unit: "mg/kg" },
        frequency: "BID",
        duration: "7-14 days",
      },
      {
        species: "cat",
        route: "oral",
        doseRange: { min: 12.5, max: 25, unit: "mg/kg" },
        frequency: "BID",
        duration: "7-14 days",
      },
      {
        species: "rabbit",
        route: "oral",
        doseRange: { min: 12.5, max: 25, unit: "mg/kg" },
        frequency: "BID",
        duration: "7-10 days",
      },
    ],
    formulations: [
      { strength: "62.5 mg", form: "tablet", sizes: ["62.5mg", "125mg", "250mg", "375mg", "500mg"] },
      { strength: "62.5 mg/ml", form: "suspension", sizes: ["10ml", "30ml"] },
      { strength: "140 mg/ml", form: "injectable", sizes: ["vial"] },
    ],
    safetyMargins: {
      overdoseSymptoms: ["Vomiting", "Diarrhea"],
    },
    specialPopulations: {
      renal: "Reduce dose in severe renal impairment",
    },
  },
  {
    drugName: "Drontal",
    activeIngredient: "Praziquantel + Pyrantel embonate",
    targetSpecies: ["dog", "cat"],
    indications: ["Roundworms", "Tapeworms", "Hookworms"],
    contraindications: ["Severe liver disease"],
    dosages: [
      {
        species: "dog",
        route: "oral",
        doseRange: { min: 1, max: 1, unit: "tablet/10kg" },
        frequency: "Single dose",
        duration: "Repeat in 2-4 weeks",
        notes: "Can be given with or without food",
      },
      {
        species: "cat",
        route: "oral",
        doseRange: { min: 1, max: 1, unit: "tablet/4kg" },
        frequency: "Single dose",
        duration: "Repeat in 2-4 weeks",
      },
    ],
    formulations: [
      { strength: "Drontal Plus (dog)", form: "tablet", sizes: ["Single", "Pack of 6", "Pack of 24"] },
      { strength: "Drontal Cat", form: "tablet", sizes: ["Single", "Pack of 4", "Pack of 24"] },
    ],
    safetyMargins: {
      overdoseSymptoms: ["Vomiting", "Diarrhea", "Lethargy"],
    },
    specialPopulations: {
      pregnant: "Safe in pregnancy",
      puppiesKittens: "Safe from 2 weeks (dogs), 6 weeks (cats)",
    },
  },
  {
    drugName: "Stronghold",
    activeIngredient: "Selamectin",
    targetSpecies: ["dog", "cat", "rabbit"],
    indications: ["Fleas", "Heartworm prevention", "Ear mites", "Sarcoptic mange"],
    contraindications: ["<6 weeks old", "Sick/debilitated animals"],
    dosages: [
      {
        species: "dog",
        route: "topical",
        doseRange: { min: 6, max: 12, unit: "mg/kg" },
        frequency: "Monthly",
        duration: "Year-round",
        notes: "Apply to dry skin between shoulder blades",
      },
      {
        species: "cat",
        route: "topical",
        doseRange: { min: 6, max: 12, unit: "mg/kg" },
        frequency: "Monthly",
        duration: "Year-round",
      },
      {
        species: "rabbit",
        route: "topical",
        doseRange: { min: 6, max: 12, unit: "mg/kg" },
        frequency: "Monthly",
        duration: "As needed",
        notes: "Off-label use - limited safety data",
      },
    ],
    formulations: [
      { strength: "60 mg", form: "spot-on", sizes: ["Puppy/Kitten", "Small", "Medium", "Large"] },
    ],
    safetyMargins: {
      overdoseSymptoms: ["Salivation", "Vomiting", "Diarrhea"],
    },
    specialPopulations: {
      puppiesKittens: "Safe from 6 weeks",
    },
  },
  {
    drugName: "Caninsulin",
    activeIngredient: "Porcine insulin zinc suspension",
    targetSpecies: ["dog", "cat"],
    indications: ["Diabetes mellitus"],
    contraindications: ["Hypoglycemia", "Insulinoma"],
    dosages: [
      {
        species: "dog",
        route: "sc",
        doseRange: { min: 0.25, max: 1, unit: "U/kg" },
        frequency: "BID",
        duration: "Lifelong",
        notes: "Start low, titrate based on glucose curves",
      },
      {
        species: "cat",
        route: "sc",
        doseRange: { min: 0.25, max: 0.5, unit: "U/kg" },
        frequency: "BID-SID",
        duration: "Lifelong",
        notes: "Some cats achieve remission with diet change",
      },
    ],
    formulations: [
      { strength: "40 U/ml", form: "injectable", sizes: ["2.5ml", "10ml"] },
    ],
    safetyMargins: {
      toxicDose: "Overdose causes hypoglycemia",
      overdoseSymptoms: ["Weakness", "Seizures", "Coma"],
    },
    specialPopulations: {
      renal: "Monitor closely",
    },
  },
  {
    drugName: "Fortekor",
    activeIngredient: "Benazepril",
    targetSpecies: ["dog", "cat"],
    indications: ["Heart failure", "Proteinuria", "Chronic kidney disease"],
    contraindications: ["Hypotension", "Acute renal failure"],
    dosages: [
      {
        species: "dog",
        route: "oral",
        doseRange: { min: 0.25, max: 0.5, unit: "mg/kg" },
        frequency: "SID",
        duration: "Lifelong",
        notes: "Give 1 hour before meal",
      },
      {
        species: "cat",
        route: "oral",
        doseRange: { min: 0.5, max: 1, unit: "mg/kg" },
        frequency: "SID",
        duration: "Lifelong",
        notes: "Monitor kidney values regularly",
      },
    ],
    formulations: [
      { strength: "5 mg", form: "tablet", sizes: ["5mg", "10mg", "20mg"] },
      { strength: "5 mg", form: "flavoured tablet", sizes: ["5mg", "10mg", "20mg"] },
    ],
    safetyMargins: {
      overdoseSymptoms: ["Hypotension", "Lethargy", "Weakness"],
    },
    specialPopulations: {
      renal: "Monitor kidney values closely",
      hepatic: "Metabolized by liver - use with caution",
    },
  },
  {
    drugName: "Vetmedin",
    activeIngredient: "Pimobendan",
    targetSpecies: ["dog"],
    indications: ["Dilated cardiomyopathy", "Mitral valve disease", "Heart failure"],
    contraindications: ["Hypertrophic cardiomyopathy", "Aortic stenosis"],
    dosages: [
      {
        species: "dog",
        route: "oral",
        doseRange: { min: 0.2, max: 0.6, unit: "mg/kg" },
        frequency: "BID",
        duration: "Lifelong",
        notes: "Give 1 hour before meal for best absorption",
      },
    ],
    formulations: [
      { strength: "1.25 mg", form: "capsule", sizes: ["1.25mg", "5mg"] },
      { strength: "5 mg/ml", form: "suspension", sizes: ["100ml"] },
    ],
    safetyMargins: {
      overdoseSymptoms: ["Tachycardia", "Hypotension", "Arrhythmias"],
    },
    specialPopulations: {
      renal: "No dose adjustment needed",
    },
  },
  {
    drugName: "Prednisolon",
    activeIngredient: "Prednisolone",
    targetSpecies: ["dog", "cat", "rabbit"],
    indications: ["Inflammation", "Allergies", "Immune-mediated disease", "Cancer"],
    contraindications: ["Systemic fungal infections", "GI ulceration", "Diabetes"],
    dosages: [
      {
        species: "dog",
        route: "oral",
        doseRange: { min: 0.5, max: 2, unit: "mg/kg" },
        frequency: "SID-BID",
        duration: "Depends on condition",
        notes: "Taper off gradually after long-term use",
      },
      {
        species: "cat",
        route: "oral",
        doseRange: { min: 0.5, max: 2, unit: "mg/kg" },
        frequency: "SID-BID",
        duration: "Depends on condition",
        notes: "Cats metabolize differently - monitor closely",
      },
      {
        species: "rabbit",
        route: "oral",
        doseRange: { min: 0.25, max: 0.5, unit: "mg/kg" },
        frequency: "SID-BID",
        duration: "Short term only",
        notes: "High risk of GI stasis - use with caution",
      },
    ],
    formulations: [
      { strength: "5 mg", form: "tablet", sizes: ["1mg", "2.5mg", "5mg", "10mg", "20mg"] },
      { strength: "5 mg/ml", form: "suspension", sizes: ["30ml"] },
      { strength: "10 mg/ml", form: "injectable", sizes: ["vial"] },
    ],
    safetyMargins: {
      overdoseSymptoms: ["Polyuria/polydipsia", "Increased appetite", "Immunosuppression"],
    },
    specialPopulations: {
      renal: "Monitor fluid balance",
      hepatic: "Converted in liver - may need adjustment",
    },
  },
];

// Helper functions
export function findDosageByDrug(drugName: string): DosageEntry | undefined {
  return dosageDatabase.find(
    (d) =>
      d.drugName.toLowerCase() === drugName.toLowerCase() ||
      d.activeIngredient.toLowerCase() === drugName.toLowerCase()
  );
}

export function findDosagesBySpecies(species: string): DosageEntry[] {
  return dosageDatabase.filter((d) =>
    d.targetSpecies.includes(species.toLowerCase())
  );
}

export function calculateDose(
  drugName: string,
  species: string,
  weight: number
): {
  minDose: number;
  maxDose: number;
  unit: string;
  frequency: string;
  duration: string;
  notes?: string;
} | null {
  const drug = findDosageByDrug(drugName);
  if (!drug) return null;

  const speciesDosage = drug.dosages.find(
    (d) => d.species === species.toLowerCase()
  );
  if (!speciesDosage) return null;

  const { min, max, unit } = speciesDosage.doseRange;
  const isPerKg = unit.includes("kg");
  const baseUnit = unit.replace("/kg", "").trim();

  if (isPerKg) {
    return {
      minDose: +(min * weight).toFixed(2),
      maxDose: +(max * weight).toFixed(2),
      unit: baseUnit,
      frequency: speciesDosage.frequency,
      duration: speciesDosage.duration,
      notes: speciesDosage.notes,
    };
  }

  // For non-weight-based dosing (e.g., tablets per weight range)
  return {
    minDose: min,
    maxDose: max,
    unit: unit,
    frequency: speciesDosage.frequency,
    duration: speciesDosage.duration,
    notes: speciesDosage.notes,
  };
}

export function getFormulationOptions(drugName: string): string[] {
  const drug = findDosageByDrug(drugName);
  if (!drug) return [];
  return drug.formulations.map((f) => `${f.strength} ${f.form}`);
}

export function getIndications(drugName: string): string[] {
  const drug = findDosageByDrug(drugName);
  return drug?.indications || [];
}

export function getContraindications(drugName: string): string[] {
  const drug = findDosageByDrug(drugName);
  return drug?.contraindications || [];
}

export function searchDrugs(query: string): DosageEntry[] {
  const lower = query.toLowerCase();
  return dosageDatabase.filter(
    (d) =>
      d.drugName.toLowerCase().includes(lower) ||
      d.activeIngredient.toLowerCase().includes(lower) ||
      d.indications.some((i) => i.toLowerCase().includes(lower))
  );
}
