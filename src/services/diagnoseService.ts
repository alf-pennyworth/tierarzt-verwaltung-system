
import { supabase } from "@/integrations/supabase/client";

export const getAllDiagnoses = async () => {
  const { data, error } = await supabase
    .from("diagnose")
    .select("*")
    .order('diagnose');

  if (error) {
    console.error("Error fetching diagnoses:", error);
    throw error;
  }

  return data;
};

export const findDiagnoseByName = async (diagnoseName: string) => {
  const queries = [
    // Exact match
    supabase
      .from("diagnose")
      .select("*")
      .eq("diagnose", diagnoseName)
      .maybeSingle(),
    // Case-insensitive match
    supabase
      .from("diagnose")
      .select("*")
      .ilike("diagnose", diagnoseName)
      .maybeSingle(),
    // Exact match with trim
    supabase
      .from("diagnose")
      .select("*")
      .eq("diagnose", diagnoseName.trim())
      .maybeSingle()
  ];

  for (const query of queries) {
    const { data, error } = await query;
    if (error) throw error;
    if (data) return data;
  }

  return null;
};
