
import { supabase } from "@/integrations/supabase/client";

export const searchMedications = async (searchTerm: string) => {
  const { data, error } = await supabase
    .from("medikamente")
    .select("*")
    .ilike("name", `%${searchTerm}%`)
    .order('name');

  if (error) {
    console.error("Error searching medications:", error);
    throw error;
  }

  return data;
};

export const getPackagingDescriptions = async (medicationId: string) => {
  const { data, error } = await supabase
    .from("medikamente")
    .select("packungsbeschreibung")
    .eq("id", medicationId)
    .single();

  if (error) {
    console.error("Error fetching packaging descriptions:", error);
    throw error;
  }

  // If the packungsbeschreibung is a string containing multiple options separated by commas or semicolons
  // we split them into an array
  if (data.packungsbeschreibung) {
    return data.packungsbeschreibung.split(/[,;]/).map(desc => desc.trim());
  }
  
  return [];
};
