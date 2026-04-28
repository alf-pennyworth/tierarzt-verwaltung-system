import { supabase } from '@/integrations/supabase/client';

export interface Owner {
  id: string;
  praxis_id: string;
  name: string;
  email: string | null;
  telefonnummer: string | null;
  mobilnummer: string | null;
  strasse: string | null;
  hausnummer: string | null;
  plz: string | null;
  stadt: string | null;
  land: string;
  auth_id: string | null;
  portal_aktiviert: boolean;
  notizen: string | null;
  preferred_contact_method: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOwnerInput {
  name: string;
  email?: string;
  telefonnummer?: string;
  mobilnummer?: string;
  strasse?: string;
  hausnummer?: string;
  plz?: string;
  stadt?: string;
  land?: string;
  notizen?: string;
  preferred_contact_method?: string;
}

/**
 * Get all owners for a practice
 */
export async function getOwners(praxisId: string) {
  const { data, error } = await supabase
    .from('besitzer')
    .select(`
      *,
      patienten:patient(id, name, species)
    `)
    .eq('praxis_id', praxisId)
    .is('deleted_at', null)
    .order('name');

  if (error) throw error;
  return data as Owner[];
}

/**
 * Get owner by ID
 */
export async function getOwnerById(ownerId: string) {
  const { data, error } = await supabase
    .from('besitzer')
    .select(`
      *,
      patienten:patient(id, name, species, birth_date)
    `)
    .eq('id', ownerId)
    .single();

  if (error) throw error;
  return data as Owner;
}

/**
 * Search owners
 */
export async function searchOwners(praxisId: string, query: string) {
  const { data, error } = await supabase
    .from('besitzer')
    .select('*')
    .eq('praxis_id', praxisId)
    .is('deleted_at', null)
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,telefonnummer.ilike.%${query}%`)
    .order('name');

  if (error) throw error;
  return data as Owner[];
}

/**
 * Create a new owner
 */
export async function createOwner(
  praxisId: string,
  userId: string,
  input: CreateOwnerInput
): Promise<Owner> {
  const { data, error } = await supabase
    .from('besitzer')
    .insert({
      praxis_id: praxisId,
      created_by: userId,
      ...input,
      land: input.land || 'Deutschland',
      preferred_contact_method: input.preferred_contact_method || 'email',
      portal_aktiviert: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update owner
 */
export async function updateOwner(
  ownerId: string,
  updates: Partial<CreateOwnerInput>
) {
  const { data, error } = await supabase
    .from('besitzer')
    .update(updates)
    .eq('id', ownerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Soft delete owner
 */
export async function deleteOwner(ownerId: string) {
  const { error } = await supabase
    .from('besitzer')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', ownerId);

  if (error) throw error;
}

/**
 * Activate owner portal
 */
export async function activateOwnerPortal(ownerId: string) {
  const { data, error } = await supabase
    .from('besitzer')
    .update({
      portal_aktiviert: true,
      portal_einladung_gesendet_am: new Date().toISOString()
    })
    .eq('id', ownerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get owner statistics
 */
export async function getOwnerStats(praxisId: string) {
  const { data: totalOwners, error: error1 } = await supabase
    .from('besitzer')
    .select('id', { count: 'exact' })
    .eq('praxis_id', praxisId)
    .is('deleted_at', null);

  const { data: portalActive, error: error2 } = await supabase
    .from('besitzer')
    .select('id', { count: 'exact' })
    .eq('praxis_id', praxisId)
    .eq('portal_aktiviert', true)
    .is('deleted_at', null);

  if (error1) throw error1;
  if (error2) throw error2;

  return {
    total: totalOwners?.length || 0,
    withPortal: portalActive?.length || 0
  };
}
