import { supabase } from "@/integrations/supabase/client";

export const searchMedications = async (searchTerm: string) => {
  // Get distinct medication names that match the search term
  const { data, error } = await supabase
    .from("medikamente")
    .select("id, name, eingangs_nr, masseinheit, medication_type_id")
    .ilike("name", `%${searchTerm}%`)
    .order('name');

  if (error) {
    console.error("Error searching medications:", error);
    throw error;
  }

  // Create a map to store unique medications by name
  const uniqueMedicationMap = new Map();
  
  // Keep only the first occurrence of each medication name
  data.forEach(med => {
    if (!uniqueMedicationMap.has(med.name)) {
      uniqueMedicationMap.set(med.name, med);
    }
  });
  
  // Convert map values back to array
  return Array.from(uniqueMedicationMap.values());
};

export const getPackagingDescriptions = async (medicationName: string) => {
  const { data, error } = await supabase
    .from("medikamente")
    .select("id, packungsbeschreibung")
    .eq("name", medicationName);

  if (error) {
    console.error("Error fetching packaging descriptions:", error);
    throw error;
  }

  // Return an array of objects with id and packungsbeschreibung
  return data.map(item => ({
    id: item.id,
    description: item.packungsbeschreibung || 'Keine Beschreibung'
  }));
};
