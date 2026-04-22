// EU UPD (Union Product Database) API Client
// Official EU veterinary medicine database
// Source: https://medicines.health.europa.eu/veterinary/en

export interface UPDDrug {
  productName: string;
  productNumber: string;
  activeSubstances: string[];
  targetSpecies: string[];
  pharmaceuticalForm: string;
  atcvetCode: string;
  marketingAuthorisationHolder: string;
  memberState: string;
  authorisationStatus: string;
  dateOfAuthorisation?: string;
  withdrawalPeriods?: {
    species: string;
    meat: string;
    milk: string;
    eggs?: string;
    honey?: string;
  }[];
  dosage?: string;
  contraindications?: string[];
  sideEffects?: string[];
  specialPrecautions?: string[];
  packageSizes?: string[];
  prescriptionStatus: "OTV" | "VetRx" | "OTC";
}

export interface UPDSearchResult {
  drugs: UPDDrug[];
  total: number;
  page: number;
  pageSize: number;
}

const UPD_BASE_URL = "https://medicines.health.europa.eu/veterinary/api";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();

function getCacheKey(url: string): string {
  return `upd_${url}`;
}

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return cached.data as T;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

async function fetchUPD<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${UPD_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });
  }

  const cacheKey = getCacheKey(url.toString());
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
        "User-Agent": "TierarztVerwaltung/1.0 (Veterinary Practice Management)",
      },
    });

    if (!response.ok) {
      throw new Error(`UPD API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error("UPD API fetch error:", error);
    throw error;
  }
}

// Search drugs by name
export async function searchUPDDrugs(query: string, page: number = 1, pageSize: number = 20): Promise<UPDSearchResult> {
  return fetchUPD<UPDSearchResult>("/search", {
    q: query,
    page: String(page),
    pageSize: String(pageSize),
    type: "veterinary",
  });
}

// Get drug by product number
export async function getUPDDrug(productNumber: string): Promise<UPDDrug | null> {
  try {
    const result = await fetchUPD<UPDSearchResult>("/product", {
      productNumber,
    });
    return result.drugs[0] || null;
  } catch (error) {
    console.error("Error fetching UPD drug:", error);
    return null;
  }
}

// Search by active substance
export async function searchByActiveSubstance(substance: string): Promise<UPDSearchResult> {
  return fetchUPD<UPDSearchResult>("/search", {
    activeSubstance: substance,
    type: "veterinary",
  });
}

// Search by target species
export async function searchBySpecies(species: string): Promise<UPDSearchResult> {
  return fetchUPD<UPDSearchResult>("/search", {
    targetSpecies: species,
    type: "veterinary",
  });
}

// Get all authorized drugs for Germany
export async function getGermanAuthorizedDrugs(page: number = 1): Promise<UPDSearchResult> {
  return fetchUPD<UPDSearchResult>("/search", {
    memberState: "DE",
    authorisationStatus: "Authorised",
    type: "veterinary",
    page: String(page),
  });
}

// Get drugs by ATCvet code
export async function searchByATCvetCode(code: string): Promise<UPDSearchResult> {
  return fetchUPD<UPDSearchResult>("/search", {
    atcvetCode: code,
    type: "veterinary",
  });
}

// Format drug for display
export function formatUPDDrug(drug: UPDDrug): {
  displayName: string;
  strength: string;
  form: string;
  prescription: string;
  species: string[];
} {
  return {
    displayName: drug.productName,
    strength: drug.activeSubstances.join(", "),
    form: drug.pharmaceuticalForm,
    prescription: drug.prescriptionStatus === "VetRx" 
      ? "Verschreibungspflichtig" 
      : drug.prescriptionStatus === "OTV" 
      ? "Tierarzneimittel" 
      : "Freiverkäuflich",
    species: drug.targetSpecies,
  };
}

// Check if drug requires prescription
export function requiresPrescription(drug: UPDDrug): boolean {
  return drug.prescriptionStatus === "VetRx";
}

// Get withdrawal period for species
export function getWithdrawalPeriod(drug: UPDDrug, species: string): {
  meat: string;
  milk: string;
  eggs?: string;
  honey?: string;
} | null {
  const period = drug.withdrawalPeriods?.find(
    (wp) => wp.species.toLowerCase() === species.toLowerCase()
  );
  if (!period) return null;
  return {
    meat: period.meat,
    milk: period.milk,
    eggs: period.eggs,
    honey: period.honey,
  };
}

// Export for offline storage
export function serializeDrug(drug: UPDDrug): string {
  return JSON.stringify(drug);
}

export function deserializeDrug(json: string): UPDDrug {
  return JSON.parse(json);
}

// Offline storage helpers
const OFFLINE_STORAGE_KEY = "upd_offline_cache";

export function saveToOfflineCache(drugs: UPDDrug[]): void {
  try {
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(drugs));
  } catch (error) {
    console.error("Error saving to offline cache:", error);
  }
}

export function loadFromOfflineCache(): UPDDrug[] {
  try {
    const cached = localStorage.getItem(OFFLINE_STORAGE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error("Error loading from offline cache:", error);
    return [];
  }
}

export function clearOfflineCache(): void {
  localStorage.removeItem(OFFLINE_STORAGE_KEY);
}

// Top 200 most common veterinary drugs for offline cache
export const COMMON_VET_DRUGS = [
  "Amoxicillin",
  "Enrofloxacin",
  "Doxycyclin",
  "Metacam",
  "Rimadyl",
  "Prednisolon",
  "Furosemid",
  "Pimobendan",
  "Carprofen",
  "Meloxicam",
  "Clavaseptin",
  "Baytril",
  "Synulox",
  "Fortekor",
  "Vetmedin",
  "Propalin",
  "Uromaxx",
  "Ivermectin",
  "Stronghold",
  "Milbemycin",
  "Advocate",
  "Frontline",
  "NexGard",
  "Bravecto",
  "Drontal",
  "Milbemax",
  "Panacur",
  "Metronidazol",
  "Marbofloxacin",
  "Cefalexin",
  "Clindamycin",
  "Gentamicin",
  "Dexamethason",
  "Prednisolon",
  "Methylprednisolon",
  "Triamcinolon",
  "Ketoconazol",
  "Fluconazol",
  "Itraconazol",
  "Terbinafin",
  "Insulin",
  "Caninsulin",
  "Lantus",
  "ProZinc",
  "Glipizid",
  "Levothyroxin",
  "L-Thyroxin",
  "Methimazol",
  "Carbimazol",
  "Phenobarbital",
  "Levetiracetam",
  "Gabapentin",
  "Pregabalin",
  "Diazepam",
  "Midazolam",
  "Acepromazin",
  "Xylazin",
  "Ketamin",
  "Propofol",
  "Isofluran",
  "Sevofluran",
  "Amitriptylin",
  "Fluoxetin",
  "Paroxetin",
  "Sertralin",
  "Trazodon",
  "Mirtazapin",
  "Lactulose",
  "Miralax",
  "Metoclopramid",
  "Ondansetron",
  "Maropitant",
  "Famotidin",
  "Ranitidin",
  "Omeprazol",
  "Esomeprazol",
  "Sucralfat",
  "Misoprostol",
  "Cisaprid",
  "Erythromycin",
  "Tylosin",
  "Tiamulin",
  "Tilmicosin",
  "Tulathromycin",
  "Gamithromycin",
  "Cefquinom",
  "Cefoperazon",
  "Cefiofur",
  "Penicillin",
  "Procainpenicillin",
  "Benzathinpenicillin",
  "Ampicillin",
  "Cloxacillin",
  "Dicloxacillin",
  "Oxytetracyclin",
  "Chlortetracyclin",
  "Tetracyclin",
  "Sulfadiazin",
  "Sulfadoxin",
  "Trimethoprim",
  "Sulfamethoxazol",
  "Neomycin",
  "Spectinomycin",
  "Apramycin",
  "Polymyxin",
  "Colistin",
  "Fosfomycin",
  "Nitrofurantoin",
  "Methenamin",
  "Chloramphenicol",
  "Florfenicol",
  "Thiamphenicol",
  "Rifampicin",
  "Azithromycin",
  "Clarithromycin",
  "Spiramycin",
  "Tylvalosin",
  "Valnemulin",
  "Pleuromutilin",
  "Danofloxacin",
  "Difloxacin",
  "Orbifloxacin",
  "Pradofloxacin",
  "Sarafloxacin",
  "Ibafloxacin",
  "Moxidectin",
  "Selamectin",
  "Eprinomectin",
  "Doramectin",
  "Abamectin",
  "Emodepsid",
  "Praziquantel",
  "Pyrantel",
  "Fenbendazol",
  "Albendazol",
  "Mebendazol",
  "Oxibendazol",
  "Febantel",
  "Niclosamid",
  "Levamisol",
  "Morantel",
  "Closantel",
  "Rafoxanid",
  "Nitroxinil",
  "Triclabendazol",
  "Oxyclozanid",
  "Bithionol",
  "Dichlorophen",
  "Coumaphos",
  "Diazinon",
  "Fenthion",
  "Malathion",
  "Permethrin",
  "Pyrethrin",
  "Fipronil",
  "Imidacloprid",
  "Methopren",
  "Lufenuron",
  "Nitenpyram",
  "Spinosad",
  "Afoxolaner",
  "Fluralaner",
  "Lotilaner",
  "Indoxacarb",
  "Metaflumizon",
  "Amitraz",
  "Cypermethrin",
  "Deltamethrin",
  "Flumethrin",
];
