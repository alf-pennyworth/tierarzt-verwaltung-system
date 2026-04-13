/**
 * UPD Integration Index
 * Export all UPD integration modules
 */

export { UPDClient, createUPDClient, mapUPDToMedikamente } from './upd-client';
export type { UPDConfig, TokenResponse } from './upd-client';
export {
  ATC_VET_ANTIBIOTICS,
  MEMBER_STATE_GERMANY,
  type ATCVetAntibioticCode,
} from './upd-types';
export type {
  MedicinalProductDefinition,
  SubstanceDefinition,
  ManufacturedItemDefinition,
  components,
} from './upd-types';
export {
  syncAntibioticsFromUPD,
  syncATCVetCodeFromUPD,
} from './upd-sync';