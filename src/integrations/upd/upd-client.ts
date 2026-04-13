/**
 * EU Union Product Database (UPD) API Client
 * https://www.ema.europa.eu/en/veterinary-regulatory-overview/veterinary-medicinal-products-regulation/union-product-database
 *
 * Provides access to all authorised veterinary medicines in EU/EEA
 */

import type { components } from './upd-types';

// API Configuration
const UPD_API_BASE = 'https://api.pms.ema.europa.eu/pms/api/v3';
const UPD_AUTH_URL = 'https://api.ema.europa.eu/oauth2/token';

interface UPDConfig {
  clientId: string;
  clientSecret: string;
  scope?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export class UPDClient {
  private config: UPDConfig;
  private accessToken: string | null = null;
  private tokenExpires: number = 0;

  constructor(config: UPDConfig) {
    this.config = config;
  }

  /**
   * Get OAuth2 access token
   */
  private async getToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpires - 60000) {
      return this.accessToken;
    }

    const response = await fetch(UPD_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: this.config.scope || 'upd:read'
      })
    });

    if (!response.ok) {
      throw new Error(`UPD auth failed: ${response.status} ${await response.text()}`);
    }

    const data: TokenResponse = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpires = Date.now() + data.expires_in * 1000;

    return this.accessToken;
  }

  /**
   * Make authenticated request to UPD API
   */
  private async request<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const token = await this.getToken();

    const url = new URL(`${UPD_API_BASE}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`UPD API error: ${response.status} ${await response.text()}`);
    }

    return response.json();
  }

  /**
   * Search medicinal products
   */
  async searchProducts(params: {
    code?: string;           // ATC Vet code (e.g., QJ for antibiotics)
    name?: string;           // Product name
    substance?: string;      // Active substance
    country?: string;        // Member state code (DE for Germany)
    status?: string;         // Authorization status
    _count?: number;         // Max results
    _page?: number;          // Page number
  } = {}): Promise<components['schemas']['MedicinalProductDefinition'][]> {
    const queryParams: Record<string, string> = {};

    if (params.code) queryParams.code = params.code;
    if (params.name) queryParams.name = params.name;
    if (params.substance) queryParams.substance = params.substance;
    if (params.country) queryParams.country = params.country;
    if (params.status) queryParams.status = params.status;
    if (params._count) queryParams._count = String(params._count);
    if (params._page) queryParams._page = String(params._page);

    const response = await this.request<{ entry: { resource: components['schemas']['MedicinalProductDefinition'] }[] }>(
      '/MedicinalProductDefinition',
      queryParams
    );

    return response.entry?.map(e => e.resource) || [];
  }

  /**
   * Get antibiotic products (ATC Vet QJ codes)
   * QJ01 = Antibacterials for systemic use
   */
  async getAntibiotics(params: {
    country?: string;
    _count?: number;
    _page?: number;
  } = {}): Promise<components['schemas']['MedicinalProductDefinition'][]> {
    return this.searchProducts({
      code: 'QJ01', // Antibacterials for systemic use
      country: params.country || 'DE', // Germany by default
      _count: params._count || 100,
      _page: params._page || 1
    });
  }

  /**
   * Get substance definitions
   */
  async getSubstance(substanceId: string): Promise<components['schemas']['SubstanceDefinition']> {
    return this.request(`/SubstanceDefinition/${substanceId}`);
  }

  /**
   * Get manufactured item details
   */
  async getManufacturedItem(itemId: string): Promise<components['schemas']['ManufacturedItemDefinition']> {
    return this.request(`/ManufacturedItemDefinition/${itemId}`);
  }
}

/**
 * Map UPD product to our Medikamente schema
 */
export function mapUPDToMedikamente(
  product: components['schemas']['MedicinalProductDefinition']
): {
  name: string;
  product_name_de?: string;
  active_substance?: string;
  atc_vet_code?: string;
  pharmaceutical_form?: string;
  authorization_number?: string;
  mah?: string; // Marketing authorisation holder
} {
  return {
    name: product.name?.[0]?.family || '',
    product_name_de: product.name?.find(n => n.language === 'de')?.family,
    active_substance: product.ingredient?.[0]?.substance?.code?.coding?.[0]?.code,
    atc_vet_code: product.classification?.find(c => c.type?.coding?.[0]?.code === 'ATCVet')?.type?.coding?.[0]?.code,
    pharmaceutical_form: product.manufacturedProduct?.[0]?.manufacturedDoseForm?.coding?.[0]?.display,
    authorization_number: product.identifier?.[0]?.value,
    mah: product.masterFile?.[0]?.holder?.display
  };
}

/**
 * Create UPD client instance
 */
export function createUPDClient(): UPDClient | null {
  const clientId = import.meta.env.VITE_UPD_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_UPD_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn('UPD API credentials not configured. Set VITE_UPD_CLIENT_ID and VITE_UPD_CLIENT_SECRET');
    return null;
  }

  return new UPDClient({
    clientId,
    clientSecret,
    scope: 'upd:read'
  });
}

export default UPDClient;