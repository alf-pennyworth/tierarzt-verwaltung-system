/**
 * UPD API Type Definitions
 * Based on FHIR MedicinalProductDefinition schema
 */

export interface components {
  schemas: {
    /**
     * Medicinal Product Definition (FHIR resource)
     * https://build.fhir.org/medicinalproductdefinition.html
     */
    MedicinalProductDefinition: {
      id?: string;
      identifier?: Array<{
        system?: string;
        value?: string;
      }>;
      type?: Array<{
        coding?: Array<{
          system?: string;
          code?: string;
          display?: string;
        }>;
      }>;
      domain?: {
        coding?: Array<{
          code?: string; // e.g., "Human" or "Veterinary"
        }>;
      };
      version?: string;
      status?: {
        coding?: Array<{
          code?: string; // e.g., "active", "suspended"
        }>;
      };
      statusDate?: string;
      description?: string;
      combinedPharmaceuticalDoseForm?: {
        coding?: Array<{
          code?: string;
          display?: string;
        }>;
      };
      route?: Array<{
        coding?: Array<{
          code?: string;
          display?: string;
        }>;
      }>;
      name?: Array<{
        productName?: string;
        namePart?: Array<{
          part?: string;
          type?: {
            coding?: Array<{
              code?: string;
            }>;
          };
        }>;
        countryLanguage?: Array<{
          country?: {
            coding?: Array<{
              code?: string; // e.g., "DE" for Germany
            }>;
          };
          jurisdiction?: {
            coding?: Array<{
              code?: string;
            }>;
          };
          language?: {
            coding?: Array<{
              code?: string; // e.g., "de" for German
            }>;
          };
        }>;
      }>;
      crossReference?: Array<{
        product?: {
          reference?: string;
        }>;
      }>;
      operation?: Array<{
        organization?: {
          reference?: string;
          display?: string; // Marketing authorisation holder
        };
        effectiveDate?: string;
      }>;
      classification?: Array<{
        type?: {
          coding?: Array<{
            system?: string;
            code?: string; // ATC Vet code
            display?: string;
          }>;
        };
      }>;
      ingredient?: Array<{
        id?: string;
        substance?: {
          reference?: string;
          display?: string;
          code?: {
            coding?: Array<{
              code?: string;
              display?: string;
            }>;
          };
        };
        strength?: Array<{
          presentationRatio?: {
            numerator?: {
              value?: number;
              unit?: string;
            };
            denominator?: {
              value?: number;
              unit?: string;
            };
          };
        }>;
      }>;
      manufacturedProduct?: Array<{
        manufacturedDoseForm?: {
          coding?: Array<{
            code?: string;
            display?: string;
          }>;
        };
        unitPresentation?: {
          value?: number;
          unit?: string;
        };
      }>;
      masterFile?: Array<{
        reference?: string;
        holder?: {
          reference?: string;
          display?: string;
        };
      }>;
    };

    /**
     * Substance Definition (FHIR resource)
     */
    SubstanceDefinition: {
      id?: string;
      identifier?: Array<{
        system?: string;
        value?: string;
      }>;
      status?: {
        coding?: Array<{
          code?: string;
        }>;
      };
      classification?: Array<{
        domain?: {
          coding?: Array<{
            code?: string;
          }>;
        };
        classification?: {
          coding?: Array<{
            system?: string;
            code?: string; // ATC code
            display?: string;
          }>;
        };
      }>;
      name?: Array<{
        name?: string;
        type?: {
          coding?: Array<{
            code?: string;
          }>;
        };
        status?: {
          coding?: Array<{
            code?: string;
          }>;
        };
      }>;
    };

    /**
     * Manufactured Item Definition (FHIR resource)
     */
    ManufacturedItemDefinition: {
      id?: string;
      identifier?: Array<{
        system?: string;
        value?: string;
      }>;
      status?: {
        coding?: Array<{
          code?: string;
        }>;
      };
      manufacturedDoseForm?: {
        coding?: Array<{
          code?: string;
          display?: string;
        }>;
      };
      unitPresentation?: {
        value?: number;
        unit?: string;
      };
      ingredient?: Array<{
        reference?: string;
      }>;
    };

    /**
     * Bundle (search results)
     */
    Bundle: {
      resourceType: 'Bundle';
      type: 'searchset';
      total?: number;
      entry?: Array<{
        fullUrl?: string;
        resource: MedicinalProductDefinition | SubstanceDefinition | ManufacturedItemDefinition;
      }>;
    };
  };
}

export type MedicinalProductDefinition = components['schemas']['MedicinalProductDefinition'];
export type SubstanceDefinition = components['schemas']['SubstanceDefinition'];
export type ManufacturedItemDefinition = components['schemas']['ManufacturedItemDefinition'];

/**
 * ATC Vet Classification for Antibiotics
 */
export const ATC_VET_ANTIBIOTICS = {
  'QJ01A': 'Penicillins',
  'QJ01AA': 'Penicillins with extended spectrum',
  'QJ01AB': 'Penicillins resistant to beta-lactamases',
  'QJ01AC': 'Penicillins with beta-lactamase inhibitors',
  'QJ01AD': 'Penicillins for oral use',
  'QJ01B': 'Cephalosporins',
  'QJ01BA': 'First-generation cephalosporins',
  'QJ01BB': 'Second-generation cephalosporins',
  'QJ01BC': 'Third-generation cephalosporins',
  'QJ01BD': 'Fourth-generation cephalosporins',
  'QJ01C': 'Tetracyclines',
  'QJ01CA': 'Tetracyclines',
  'QJ01D': 'Aminoglycosides',
  'QJ01DA': 'Aminoglycosides',
  'QJ01E': 'Macrolides',
  'QJ01EA': 'Macrolides',
  'QJ01F': 'Lincosamides',
  'QJ01FA': 'Lincosamides',
  'QJ01G': 'Fluoroquinolones',
  'QJ01GA': 'Fluoroquinolones',
  'QJ01M': 'Sulfonamides',
  'QJ01MA': 'Sulfonamides and trimethoprim',
  'QJ01R': 'Combinations of antibacterials',
  'QJ01X': 'Other antibacterials',
  'QJ01XA': 'Other antibacterials',
} as const;

export type ATCVetAntibioticCode = keyof typeof ATC_VET_ANTIBIOTICS;

/**
 * German Member State Code
 */
export const MEMBER_STATE_GERMANY = 'DE';

export default components;