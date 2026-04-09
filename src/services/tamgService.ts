import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type AntibioticPrescription = Database["public"]["Tables"]["antibiotic_prescriptions"]["Row"];
type InsertAntibioticPrescription = Database["public"]["Tables"]["antibiotic_prescriptions"]["Insert"];

// Get all antibiotic prescriptions for a practice
export const getAntibioticPrescriptions = async (practiceId: string) => {
  const { data, error } = await supabase
    .from("antibiotic_prescriptions")
    .select("*")
    .eq("practice_id", practiceId)
    .order("prescribed_at", { ascending: false });

  if (error) throw error;
  return data;
};

// Get antibiotic prescriptions for a specific period
export const getAntibioticPrescriptionsByPeriod = async (
  practiceId: string,
  startDate: string,
  endDate: string
) => {
  const { data, error } = await supabase
    .from("antibiotic_prescriptions")
    .select("*")
    .eq("practice_id", practiceId)
    .gte("prescribed_at", startDate)
    .lte("prescribed_at", endDate)
    .order("prescribed_at", { ascending: false });

  if (error) throw error;
  return data;
};

// Get antibiotic prescriptions that haven't been reported to BVL yet
export const getUnreportedAntibioticPrescriptions = async (practiceId: string) => {
  const { data, error } = await supabase
    .from("antibiotic_prescriptions")
    .select("*")
    .eq("practice_id", practiceId)
    .eq("bvl_reported", false)
    .order("prescribed_at", { ascending: false });

  if (error) throw error;
  return data;
};

// Create a new antibiotic prescription
export const createAntibioticPrescription = async (
  prescription: InsertAntibioticPrescription
) => {
  const { data, error } = await supabase
    .from("antibiotic_prescriptions")
    .insert(prescription)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Update an antibiotic prescription
export const updateAntibioticPrescription = async (
  id: string,
  updates: Partial<AntibioticPrescription>
) => {
  const { data, error } = await supabase
    .from("antibiotic_prescriptions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Mark prescriptions as reported to BVL
export const markPrescriptionsAsReported = async (ids: string[]) => {
  const { data, error } = await supabase
    .from("antibiotic_prescriptions")
    .update({ bvl_reported: true })
    .in("id", ids)
    .select();

  if (error) throw error;
  return data;
};

// Get antibiotic usage statistics
export const getAntibioticUsageStats = async (practiceId: string) => {
  const { data, error } = await supabase
    .rpc("get_antibiotic_usage_stats", {
      practice_id_param: practiceId
    });

  if (error) throw error;
  return data;
};

// Get antibiotic usage by animal species
export const getAntibioticUsageBySpecies = async (practiceId: string) => {
  const { data, error } = await supabase
    .rpc("get_antibiotic_usage_by_species", {
      practice_id_param: practiceId
    });

  if (error) throw error;
  return data;
};

// Get commonly used antibiotics
export const getCommonAntibiotics = async (practiceId: string) => {
  const { data, error } = await supabase
    .rpc("get_common_antibiotics", {
      practice_id_param: practiceId
    });

  if (error) throw error;
  return data;
};