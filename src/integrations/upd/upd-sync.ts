/**
 * UPD Antibiotic Sync Job
 * Synchronizes antibiotics from EU Union Product Database to local database
 */

import { createUPDClient, mapUPDToMedikamente, ATC_VET_ANTIBIOTICS } from './index';
import type { MedicinalProductDefinition } from './upd-types';

interface SyncResult {
  total: number;
  imported: number;
  updated: number;
  errors: string[];
}

/**
 * Sync antibiotics from UPD to local database
 *
 * @param praxisId - The praxis ID to associate imported drugs with
 * @param options - Sync options
 */
export async function syncAntibioticsFromUPD(
  praxisId: string,
  options: {
    country?: string;
    dryRun?: boolean;
    onProgress?: (progress: { current: number; total: number; currentProduct: string }) => void;
  } = {}
): Promise<SyncResult> {
  const client = createUPDClient();

  if (!client) {
    return {
      total: 0,
      imported: 0,
      updated: 0,
      errors: ['UPD client not configured. Set VITE_UPD_CLIENT_ID and VITE_UPD_CLIENT_SECRET']
    };
  }

  const result: SyncResult = {
    total: 0,
    imported: 0,
    updated: 0,
    errors: []
  };

  try {
    // Fetch antibiotics from UPD (ATC Vet QJ01 codes)
    console.log('Fetching antibiotics from UPD...');
    const products = await client.getAntibiotics({
      country: options.country || 'DE',
      _count: 500 // Max per request
    });

    result.total = products.length;
    console.log(`Found ${products.length} antibiotic products`);

    // Process each product
    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      if (options.onProgress) {
        options.onProgress({
          current: i + 1,
          total: products.length,
          currentProduct: product.name?.[0]?.family || 'Unknown'
        });
      }

      try {
        // Map UPD product to our schema
        const mappedData = mapUPDToMedikamente(product);

        if (!mappedData.name) {
          result.errors.push(`Product ${i + 1}: Missing name`);
          continue;
        }

        // Check if product already exists (by authorization number)
        const existingDrug = await findDrugByAuthNumber(mappedData.authorization_number);

        if (existingDrug) {
          // Update existing drug
          if (!options.dryRun) {
            await updateDrug(existingDrug.id, {
              ...mappedData,
              praxis_id: praxisId
            });
          }
          result.updated++;
        } else {
          // Create new drug
          if (!options.dryRun) {
            await createDrug({
              ...mappedData,
              praxis_id: praxisId,
              category: ['antibiotic'],
              is_antibiotic: true
            });
          }
          result.imported++;
        }
      } catch (error) {
        result.errors.push(`Product ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log(`Sync complete: ${result.imported} imported, ${result.updated} updated, ${result.errors.length} errors`);
  } catch (error) {
    result.errors.push(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/**
 * Sync specific ATC Vet codes
 */
export async function syncATCVetCodeFromUPD(
  praxisId: string,
  atcCode: keyof typeof ATC_VET_ANTIBIOTICS,
  options: {
    country?: string;
    dryRun?: boolean;
  } = {}
): Promise<SyncResult> {
  const client = createUPDClient();

  if (!client) {
    return {
      total: 0,
      imported: 0,
      updated: 0,
      errors: ['UPD client not configured']
    };
  }

  const result: SyncResult = {
    total: 0,
    imported: 0,
    updated: 0,
    errors: []
  };

  try {
    const products = await client.searchProducts({
      code: atcCode,
      country: options.country || 'DE',
      _count: 100
    });

    result.total = products.length;

    for (const product of products) {
      try {
        const mappedData = mapUPDToMedikamente(product);
        if (!mappedData.name) continue;

        const existing = await findDrugByAuthNumber(mappedData.authorization_number);

        if (existing) {
          if (!options.dryRun) {
            await updateDrug(existing.id, { ...mappedData, praxis_id: praxisId });
          }
          result.updated++;
        } else {
          if (!options.dryRun) {
            await createDrug({
              ...mappedData,
              praxis_id: praxisId,
              category: ['antibiotic'],
              atc_vet_code: atcCode
            });
          }
          result.imported++;
        }
      } catch (error) {
        result.errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
  }

  return result;
}

// Placeholder functions - these would connect to your database
async function findDrugByAuthNumber(authNumber?: string): Promise<{ id: string } | null> {
  // TODO: Implement database lookup
  // const { data } = await supabase
  //   .from('medikamente')
  //   .select('id')
  //   .eq('authorization_number', authNumber)
  //   .single();
  // return data;
  return null;
}

async function createDrug(data: Record<string, unknown>): Promise<void> {
  // TODO: Implement database insert
  // await supabase.from('medikamente').insert(data);
  console.log('Creating drug:', data.name);
}

async function updateDrug(id: string, data: Record<string, unknown>): Promise<void> {
  // TODO: Implement database update
  // await supabase.from('medikamente').update(data).eq('id', id);
  console.log('Updating drug:', id, data.name);
}

export default syncAntibioticsFromUPD;